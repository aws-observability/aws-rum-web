export interface SessionMetadata {
    sessionId: string;
    eventCount: number;
    recordingIds: string[];
    firstSeen: number;
    lastSeen: number;
}

export interface RumEvent {
    sessionId?: string;
    requestTimestamp: string;
    event: {
        id: string;
        type: string;
        timestamp: number;
        details: unknown;
    };
}

export interface RawRequest {
    timestamp: string;
    method: string;
    appmonitorId: string;
    sessionId?: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
}
