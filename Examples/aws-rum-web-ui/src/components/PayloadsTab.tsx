import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Box from '@cloudscape-design/components/box';
import type { RawRequest } from '../types/session';
import { PayloadItem } from './PayloadItem';
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
                        {requests.map((request, idx) => (
                            <PayloadItem
                                key={idx}
                                request={request}
                                onClick={() => onRequestClick(request)}
                            />
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
}
