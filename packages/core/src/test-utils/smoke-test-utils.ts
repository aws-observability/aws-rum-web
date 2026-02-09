import {
    GetAppMonitorDataCommand,
    GetAppMonitorDataCommandInput,
    RUMClient
} from '@aws-sdk/client-rum';
import { expect, Response } from '@playwright/test';

const builtInAttributes = [
    'version',
    'browserLanguage',
    'browserName',
    'browserVersion',
    'osName',
    'osVersion',
    'deviceType',
    'platformType',
    'pageUrl',
    'url',
    'pageId',
    'parentPageId',
    'interaction',
    'referrerUrl',
    'pageTitle',
    'title',
    'countryCode',
    'subdivisionCode',
    'domain',
    'pageTags',
    'aws:client',
    'aws:clientVersion'
];

/** Returns filtered events by type */
export const getEventsByType = (
    requestBody: { RumEvents: any[] },
    eventType: string
) => {
    return requestBody.RumEvents.filter((e) => e.type === eventType);
};

/** Returns an array of eventIds */
export const getEventIds = (events: any[]) => {
    return events.map((e) => e.id);
};

/** Returns the smoke test URL with the right version */
export const getUrl = (
    testUrl: string | URL | undefined,
    version: string | undefined,
    install_method: string | undefined,
    page: string | undefined
) => {
    if (!page) {
        page = 'smoke';
    }
    if (!testUrl) {
        return 'http://localhost:9000/' + page + '.html';
    }
    const url = new URL(testUrl);
    if (url.pathname === '/') {
        if (install_method === 'CDN') {
            return url + `${page}-${version}.html`;
        } else if (install_method === 'NPM-ES') {
            return url + `npm/es/${version}/` + page + '.html';
        } else if (install_method === 'NPM-CJS') {
            return url + `npm/cjs/${version}/` + page + '.html';
        } else {
            return url.toString();
        }
    } else {
        return url.toString();
    }
};

/**
 * Returns true if the request is a successful PutRumEvents request
 */
export const isDataPlaneRequest = (response: Response, targetUrl: string) => {
    const request = response.request();
    return (
        request.method() === 'POST' &&
        response.status() === 200 &&
        response.url().includes(targetUrl)
    );
};

/** Returns true when all events were ingested */
export const verifyIngestionWithRetry = async (
    rumClient: RUMClient,
    eventIds: any[],
    timestamp: number,
    monitorName: string | undefined,
    retryCount: number,
    metadataAttributes: string[] | undefined = undefined
) => {
    while (true) {
        if (retryCount === 0) {
            console.log('Retry attempt exhausted.');
            return false;
        }
        try {
            const ingestedEvents: Map<string, string[]> =
                await getIngestedEvents(rumClient, timestamp, monitorName);

            return await expectValidEvents(
                ingestedEvents,
                eventIds,
                metadataAttributes
            );
        } catch (error) {
            retryCount -= 1;
            console.log(`${error.message} Waiting for next retry.`);
            await new Promise((r) => setTimeout(r, 60000));
        }
    }
};

/** Returns list of ingested events */
export const getIngestedEvents = async (
    rumClient: RUMClient,
    timestamp: number,
    monitorName: string | undefined
) => {
    const ingestedEvents: Map<string, string[]> = new Map();
    const input: GetAppMonitorDataCommandInput = {
        Name: monitorName,
        TimeRange: {
            After: timestamp
        }
    };
    let command = new GetAppMonitorDataCommand(input);
    // Running tests in parallel require pagination logic, as several test cases have the same timestamp
    while (true) {
        const data = await rumClient.send(command);
        data?.Events?.forEach((event) => {
            const eventId: string = JSON.parse(event).event_id;
            const flattenedMetadata = JSON.parse(event).metadata_values;
            ingestedEvents.set(eventId, flattenedMetadata);
        });
        if (data.NextToken) {
            input.NextToken = data.NextToken;
            command = new GetAppMonitorDataCommand(input);
        } else {
            // If there are no more pages, we can finish the loop
            break;
        }
    }
    return ingestedEvents;
};

export const expectValidEvents = async (
    ingestedEvents: Map<string, string[]>,
    eventIds: string[],
    metadataAttributes: string[] | undefined = undefined
) => {
    return (
        (await expectEvents(ingestedEvents, eventIds)) &&
        (await expectValidAttributes(
            ingestedEvents,
            eventIds,
            metadataAttributes
        )) &&
        (await expectInvalidAttributes(
            ingestedEvents,
            eventIds,
            metadataAttributes
        ))
    );
};

/** Returns true when expected ingested event is found */
export const expectEvents = async (
    ingestedEvents: Map<string, string[]>,
    eventIds: string[]
) => {
    eventIds.forEach((eventId) => {
        if (!ingestedEvents.has(eventId)) {
            throw new Error(`Event ${eventId} not ingested.`);
        }
    });
    return true;
};

/** Returns true when expected metadata attributes are found */
export const expectValidAttributes = async (
    ingestedEvents: Map<string, string[]>,
    eventIds: string[],
    metadataAttributes: string[] | undefined = undefined
) => {
    if (metadataAttributes && eventIds.length > 0) {
        const eventId = eventIds[0];
        expect(ingestedEvents.get(eventId)).toEqual(
            expect.arrayContaining(metadataAttributes)
        );
    }
    return true;
};

/** Returns true when no invalid metadata attributes are found */
export const expectInvalidAttributes = async (
    ingestedEvents: Map<string, string[]>,
    eventIds: string[],
    metadataAttributes: string[] | undefined = undefined
) => {
    if (metadataAttributes && eventIds.length > 0) {
        const eventId = eventIds[0];
        const eventsWithInvalidAttributes = ingestedEvents
            .get(eventId)
            ?.filter(function (attribute) {
                const attributeKey = attribute.split('=', 2)[0];
                return (
                    !builtInAttributes.includes(attributeKey) &&
                    !metadataAttributes?.includes(attribute)
                );
            });

        expect(eventsWithInvalidAttributes).toEqual([]);
    }
    return true;
};
