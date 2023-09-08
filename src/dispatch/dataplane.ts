// These are the type definitions for the CloudWatch RUM data plane API, and are
// equivalent to those in the CloudWatch RUM SDK.
//
// We have not used the CloudWatch RUM SDK due to its size. While we could still
// use the type definitions from the CloudWatch RUM SDK, we have made a copy of
// them here to completely remove the dependency on the CloudWatch RUM SDK.

export interface PutRumEventsRequest {
    BatchId: string;
    AppMonitorDetails: AppMonitorDetails;
    UserDetails: UserDetails;
    RumEvents: RumEvent[];
}

export interface AppMonitorDetails {
    id?: string;
    version?: string;
}

export interface UserDetails {
    userId?: string;
    sessionId?: string;
}

export interface RumEvent {
    id: string;
    timestamp: Date;
    type: string;
    metadata?: string;
    details: string;
}
