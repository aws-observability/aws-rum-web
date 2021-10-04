// These are the type definitions for the CloudWatch RUM data plane API, and are
// equivalent to those in the CloudWatch RUM SDK.
//
// We have not used the CloudWatch RUM SDK due to its size. While we could still
// use the type definitions from the CloudWatch RUM SDK, we have made a copy of
// them here to completely remove the dependency on the CloudWatch RUM SDK, at
// least until it is publicly available.

export interface LogEventsRequest {
    applicationId: string | undefined;
    batch: EventBatch | undefined;
}

export interface EventBatch {
    batchId: string | undefined;
    application?: ApplicationDetails;
    user: UserDetails | undefined;
    events: Event[] | undefined;
}

export interface ApplicationDetails {
    name?: string;
    id?: string;
    version?: string;
}

export interface UserDetails {
    userId?: string;
    sessionId?: string;
}

export interface Event {
    id: string | undefined;
    timestamp: Date | undefined;
    type: string | undefined;
    metadata?: string;
    details: string | undefined;
}
