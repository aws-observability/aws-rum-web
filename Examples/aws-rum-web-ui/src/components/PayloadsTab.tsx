import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Box from '@cloudscape-design/components/box';
import type { RawRequest } from '../types/session';
import './PayloadsTab.css';

interface PayloadsTabProps {
    requests: RawRequest[];
    onRequestClick: (request: RawRequest) => void;
}

export function PayloadsTab({ requests, onRequestClick }: PayloadsTabProps) {
    return (
        <div className="payloads-layout">
            <Container header={<Header variant="h2">Request Payloads</Header>}>
                {requests.length === 0 ? (
                    <Box padding={{ vertical: 'xxl' }} textAlign="center">
                        <Box
                            variant="strong"
                            fontSize="heading-m"
                            color="text-body-secondary"
                        >
                            No payloads
                        </Box>
                        <Box
                            variant="p"
                            color="text-body-secondary"
                            padding={{ top: 's' }}
                        >
                            HTTP request payloads will appear here once captured
                        </Box>
                    </Box>
                ) : (
                    <div className="events-list">
                        {requests.map((request, idx) => {
                            const requestSize =
                                new Blob([JSON.stringify(request)]).size / 1024;

                            return (
                                <div
                                    key={idx}
                                    className="event-item"
                                    onClick={() => onRequestClick(request)}
                                >
                                    <div
                                        className="event-marker"
                                        style={{ backgroundColor: '#0972d3' }}
                                    />
                                    <div className="event-content">
                                        <Box variant="strong" fontSize="body-s">
                                            {request.method}{' '}
                                            {request.appmonitorId}
                                        </Box>
                                        <Box
                                            variant="small"
                                            color="text-body-secondary"
                                        >
                                            {new Date(
                                                request.timestamp
                                            ).toLocaleString()}{' '}
                                            • {requestSize.toFixed(2)} KB
                                        </Box>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Container>
        </div>
    );
}
