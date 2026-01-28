import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { unpack } from '@rrweb/packer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.text());
app.use(express.raw());

app.all('/appmonitors/:appmonitorId', (req, res) => {
    const { UserDetails } = req.body || {};

    const requestEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        appmonitorId: req.params.appmonitorId,
        sessionId: UserDetails?.sessionId,
        headers: req.headers,
        body: req.body,
        query: req.query
    };

    // 1. Write full request to requests.jsonl
    fs.appendFile(
        path.join(__dirname, 'api/requests.jsonl'),
        JSON.stringify(requestEntry) + '\n',
        (err) => {
            if (err) console.error('Failed to write request:', err);
        }
    );

    // 2. Process individual RUM events if present
    if (req.body && req.body.RumEvents && Array.isArray(req.body.RumEvents)) {
        const { AppMonitorDetails, UserDetails } = req.body;

        req.body.RumEvents.forEach((event) => {
            const eventEntry = {
                appmonitorId: req.params.appmonitorId,
                requestTimestamp: requestEntry.timestamp,
                sessionId: UserDetails?.sessionId,
                userId: UserDetails?.userId,
                appMonitorId: AppMonitorDetails?.id,
                event: event
            };

            if (event.type === 'com.amazon.rum.rrweb') {
                // 3. Write session replay events to session-replay-events.jsonl
                let sessionReplayData;
                try {
                    const details =
                        typeof event.details === 'string'
                            ? JSON.parse(event.details)
                            : event.details;

                    // Decompress events if they're compressed
                    let events = details.events || [];

                    // Check if events is a string (compressed by pack())
                    if (typeof events === 'string') {
                        try {
                            const unpacked = unpack(events);
                            // unpack() returns an object with numeric keys, convert to array
                            events = Array.isArray(unpacked)
                                ? unpacked
                                : Object.values(unpacked);
                            console.log('Decompressed session replay events', {
                                sessionId: UserDetails?.sessionId,
                                compressedSize:
                                    details.metadata?.compressedSize,
                                uncompressedSize:
                                    details.metadata?.uncompressedSize,
                                eventsCount: events.length
                            });
                        } catch (unpackError) {
                            console.error(
                                'Failed to decompress events:',
                                unpackError
                            );
                            // Keep original events
                        }
                    } else {
                        console.log(
                            'Session replay events not compressed (array format)'
                        );
                    }

                    sessionReplayData = {
                        sessionId: UserDetails?.sessionId,
                        recordingId: UserDetails?.sessionId || event.id,
                        timestamp: event.timestamp,
                        events: events,
                        metadata: details.metadata || {}
                    };
                } catch (err) {
                    console.error(
                        'Failed to parse session replay details:',
                        err
                    );
                    sessionReplayData = {
                        sessionId: UserDetails?.sessionId,
                        recordingId: event.id,
                        timestamp: event.timestamp,
                        events: [],
                        metadata: {},
                        rawDetails: event.details
                    };
                }

                fs.appendFile(
                    path.join(__dirname, 'api/sessionreplay.jsonl'),
                    JSON.stringify(sessionReplayData) + '\n',
                    (err) => {
                        if (err)
                            console.error(
                                'Failed to write session replay event:',
                                err
                            );
                    }
                );

                // Update recording IDs index
                const recordingIdsPath = path.join(
                    __dirname,
                    'api/recordingids.json'
                );
                fs.readFile(recordingIdsPath, 'utf8', (err, data) => {
                    let recordingsMap = {};
                    if (!err && data) {
                        try {
                            recordingsMap = JSON.parse(data);
                        } catch (e) {
                            recordingsMap = {};
                        }
                    }

                    const recordingId = sessionReplayData.recordingId;
                    if (!recordingsMap[recordingId]) {
                        recordingsMap[recordingId] = {
                            recordingId,
                            timestamp: sessionReplayData.timestamp,
                            eventCount: sessionReplayData.events.length
                        };
                    } else {
                        recordingsMap[recordingId].eventCount +=
                            sessionReplayData.events.length;
                        if (
                            sessionReplayData.timestamp <
                            recordingsMap[recordingId].timestamp
                        ) {
                            recordingsMap[recordingId].timestamp =
                                sessionReplayData.timestamp;
                        }
                    }

                    fs.writeFile(
                        recordingIdsPath,
                        JSON.stringify(recordingsMap, null, 2),
                        (err) => {
                            if (err)
                                console.error(
                                    'Failed to update recording IDs:',
                                    err
                                );
                        }
                    );
                });
            }

            // Write individual to events.jsonl
            fs.appendFile(
                path.join(__dirname, 'api/events.jsonl'),
                JSON.stringify(eventEntry) + '\n',
                (err) => {
                    if (err) console.error('Failed to write log event:', err);
                }
            );
        });
    }

    res.status(202).json({ success: true });
});

app.get('/api/requests', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/requests.jsonl'),
            'utf8'
        );
        const requests = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line));
        res.json(requests);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/events', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/events.jsonl'),
            'utf8'
        );
        const logs = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line));
        res.json(logs);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/session-replay/ids', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/recordingids.json'),
            'utf8'
        );
        const recordingsMap = JSON.parse(data);
        const recordings = Object.values(recordingsMap).sort(
            (a, b) => b.timestamp - a.timestamp
        );
        res.json(recordings);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/session-replay/:recordingId', (req, res) => {
    try {
        const { recordingId } = req.params;
        const data = fs.readFileSync(
            path.join(__dirname, 'api/sessionreplay.jsonl'),
            'utf8'
        );
        const events = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line))
            .filter((event) => event.recordingId === recordingId);

        // Merge all rrweb events for this recording
        const allEvents = events.flatMap((e) => e.events);
        res.json(allEvents);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/session-replay', (req, res) => {
    try {
        const data = fs.readFileSync(
            path.join(__dirname, 'api/sessionreplay.jsonl'),
            'utf8'
        );
        const events = data
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line));

        // Merge events by recordingId
        const recordingsMap = new Map();
        events.forEach((event) => {
            const recordingId = event.recordingId;
            if (!recordingsMap.has(recordingId)) {
                recordingsMap.set(recordingId, {
                    sessionId: event.sessionId,
                    recordingId: event.recordingId,
                    timestamp: event.timestamp,
                    events: [],
                    metadata: event.metadata
                });
            }
            const recording = recordingsMap.get(recordingId);
            recording.events.push(...event.events);
            // Update timestamp to earliest
            if (event.timestamp < recording.timestamp) {
                recording.timestamp = event.timestamp;
            }
        });

        res.json(Array.from(recordingsMap.values()));
    } catch (err) {
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});
