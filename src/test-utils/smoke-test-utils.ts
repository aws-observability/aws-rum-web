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
export const getUrl = (test_url, version) => {
    if (!test_url) {
        return 'http://localhost:9000/smoke_local.html';
    }
    const url = new URL(test_url);
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
    let ingestedEvents = new Set();
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
        for (let i = 0; i < data.Events.length; i++) {
            ingestedEvents.add(JSON.parse(data.Events[i]).event_id);
        }
        if (data.NextToken) {
            input.NextToken = data.NextToken;
            command = new GetAppMonitorDataCommand(input);
        } else {
            // If there are no more pages, we can finish the loop
            break;
        }
    }

    for (let i = 0; i < eventIds.length; i++) {
        if (!ingestedEvents.has(eventIds[i])) {
            throw new Error(`Event ${eventIds[i]} not ingested.`);
        }
    }
};
