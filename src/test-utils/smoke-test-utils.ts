import {
    GetAppMonitorDataCommand,
    GetAppMonitorDataCommandInput
} from '@aws-sdk/client-rum';

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
    'pageTags'
];

/** Returns filtered events by type */
export const getEventsByType = (
    requestBody: { RumEvents: any[] },
    eventType: string
) => {
    return requestBody.RumEvents.filter((e) => e.type === eventType);
};

/** Returns an array of eventIds */
export const getEventIds = (events) => {
    return events.map((e) => e.id);
};

/** Returns the smoke test URL with the right version */
export const getUrl = (testUrl, version) => {
    if (!testUrl) {
        return 'http://localhost:9000/smoke_local.html';
    }
    const url = new URL(testUrl);
    if (url.pathname === '/') {
        return url + `smoke-${version}.html`;
    } else {
        return url.toString();
    }
};

/**
 * Returns true if the request is a successful PutRumEvents request
 */
export const isDataPlaneRequest = (response, targetUrl) => {
    const request = response.request();
    return (
        request.method() === 'POST' &&
        response.status() === 200 &&
        response.url().includes(targetUrl)
    );
};

/** Returns true when all events were ingested */
export const verifyIngestionWithRetry = async (
    rumClient,
    eventIds,
    timestamp,
    monitorName,
    retryCount,
    metadataAttributes: string[] | undefined = undefined
) => {
    while (true) {
        if (retryCount === 0) {
            console.log('Retry attempt exhausted.');
            return false;
        }
        try {
            await isEachEventIngested(
                rumClient,
                eventIds,
                timestamp,
                monitorName,
                metadataAttributes
            );
            return true;
        } catch (error) {
            retryCount -= 1;
            console.log(`${error.message} Waiting for next retry.`);
            await new Promise((r) => setTimeout(r, 60000));
        }
    }
};

/** Returns true when every event is ingested */
export const isEachEventIngested = async (
    rumClient,
    eventIds,
    timestamp,
    monitorName,
    metadataAttributes: string[] | undefined = undefined
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
        data.Events.forEach((event) => {
            const eventId: string = JSON.parse(event).event_id;
            const flattenedMetadata = JSON.parse(event).metadata_values;
            ingestedEvents.set(eventId, flattenedMetadata);

            // ingestedEvents.push()
            // ingestedEvents.add();
            // ingestedEventsMetadata.add()
        });
        if (data.NextToken) {
            input.NextToken = data.NextToken;
            command = new GetAppMonitorDataCommand(input);
        } else {
            // If there are no more pages, we can finish the loop
            break;
        }
    }

    eventIds.forEach((eventId) => {
        if (!ingestedEvents.has(eventId)) {
            throw new Error(`Event ${eventId} not ingested.`);
        }

        // check for valid custom attributes
        if (metadataAttributes) {
            if (
                !metadataAttributes?.every((flattenedAttribute) =>
                    ingestedEvents.get(eventId)?.includes(flattenedAttribute)
                )
            ) {
                console.log(
                    `Expected attributes: ${JSON.stringify(metadataAttributes)}`
                );
                console.log(
                    `Actual metadata: ${JSON.stringify(
                        ingestedEvents.get(eventId)
                    )}`
                );
                throw new Error(`Did not find expected metadata attribute(s).`);
            }

            // check for invalid custom attributes
            const invalidAttributes = ingestedEvents
                .get(eventId)
                ?.filter(function (attribute) {
                    const attributeKey = attribute.split('=', 2)[0];
                    return (
                        !builtInAttributes.includes(attributeKey) &&
                        !metadataAttributes?.includes(attribute)
                    );
                });

            if (invalidAttributes && invalidAttributes.length > 0) {
                console.log(
                    `Invalid custom attributes ingested: ${JSON.stringify(
                        invalidAttributes
                    )}`
                );
                throw new Error(`Invalid custom attributes ingested`);
            }
        }
    });
};
