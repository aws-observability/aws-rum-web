import {
    GetAppMonitorDataCommand,
    GetAppMonitorDataCommandInput
} from '@aws-sdk/client-rum';

/** Returns filtered events by type */
export const getEventsByType = (requestBody, eventType) => {
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
        response.url() === targetUrl
    );
};

/** Returns true when all events were ingested */
export const verifyIngestionWithRetry = async (
    rumClient,
    eventIds,
    timestamp,
    monitorName,
    retryCount
) => {
    while (true) {
        if (retryCount === 0) {
            // tslint:disable-next-line:no-console
            console.log('Retry attempt exhausted.');
            return false;
        }
        try {
            await isEachEventIngested(
                rumClient,
                eventIds,
                timestamp,
                monitorName
            );
            return true;
        } catch (error) {
            retryCount -= 1;
            // tslint:disable-next-line:no-console
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
    monitorName
) => {
    const ingestedEvents = new Set();
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
        for (const event of data.Events) {
            ingestedEvents.add(JSON.parse(event).event_id);
        }
        if (data.NextToken) {
            input.NextToken = data.NextToken;
            command = new GetAppMonitorDataCommand(input);
        } else {
            // If there are no more pages, we can finish the loop
            break;
        }
    }

    for (const eventId of eventIds) {
        if (!ingestedEvents.has(eventId)) {
            throw new Error(`Event ${eventId} not ingested.`);
        }
    }
};
