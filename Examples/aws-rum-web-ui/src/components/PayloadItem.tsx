import Box from '@cloudscape-design/components/box';
import type { RawRequest } from '../types/session';

interface PayloadItemProps {
    request: RawRequest;
    onClick: () => void;
}

export function PayloadItem({ request, onClick }: PayloadItemProps) {
    const requestSize = new Blob([JSON.stringify(request)]).size / 1024;

    return (
        <div className="event-item" onClick={onClick}>
            <div
                className="event-marker"
                style={{ backgroundColor: '#0972d3' }}
            />
            <div className="event-content">
                <Box variant="strong" fontSize="body-s">
                    {request.method} {request.appmonitorId}
                </Box>
                <Box variant="small" color="text-body-secondary">
                    {new Date(request.timestamp).toLocaleString()} •{' '}
                    {requestSize.toFixed(2)} KB
                    {request.compression && (
                        <>
                            {' '}
                            • gzip:{' '}
                            {(
                                request.compression.compressedBytes / 1024
                            ).toFixed(2)}{' '}
                            KB ({request.compression.ratio}x)
                        </>
                    )}
                </Box>
            </div>
        </div>
    );
}
