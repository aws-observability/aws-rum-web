import { useState } from 'react';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Box from '@cloudscape-design/components/box';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import SpaceBetween from '@cloudscape-design/components/space-between';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Link from '@cloudscape-design/components/link';
import Popover from '@cloudscape-design/components/popover';
import { RrwebPlayer } from './RrwebPlayer';
import { PayloadItem } from './PayloadItem';
import type { SessionMetadata, RumEvent, RawRequest } from '../types/session';
import {
    RRWEB_EVENT_TYPE_NAMES,
    getEventColor,
    getEventLabel
} from '../utils/eventFormatters';
import './SessionReplayTab.css';
import '../styles/skeleton.css';

interface SessionReplayTabProps {
    sessions: SessionMetadata[];
    selectedSessionId: string | null;
    selectedReplayEvents: any[];
    selectedRumEvents: RumEvent[];
    selectedRequests: RawRequest[];
    loadingSessions: boolean;
    loadingEvents: boolean;
    onSelectSession: (sessionId: string) => void;
    onEventClick: (event: any, idx: number) => void;
    onRumEventClick: (event: RumEvent) => void;
    onRequestClick: (request: RawRequest) => void;
}

export function SessionReplayTab({
    sessions,
    selectedSessionId,
    selectedReplayEvents,
    selectedRumEvents,
    selectedRequests,
    loadingSessions,
    loadingEvents,
    onSelectSession,
    onEventClick,
    onRumEventClick,
    onRequestClick
}: SessionReplayTabProps) {
    const [eventView, setEventView] = useState<'rum' | 'rrweb'>(() => {
        const saved = localStorage.getItem('eventView');
        return saved === 'rum' || saved === 'rrweb' ? saved : 'rum';
    });

    const handleEventViewChange = (view: 'rum' | 'rrweb') => {
        setEventView(view);
        localStorage.setItem('eventView', view);
    };

    return (
        <div className="timeline-layout">
            <div className="sessions-sidebar">
                <Container header={<Header variant="h2">Sessions</Header>}>
                    {loadingSessions ? (
                        <div className="session-list">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="skeleton-item">
                                    <div className="skeleton skeleton-line title" />
                                    <div className="skeleton skeleton-line short" />
                                    <div
                                        className="skeleton skeleton-line short"
                                        style={{ width: '40%' }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : sessions.length === 0 ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box
                                variant="strong"
                                fontSize="heading-m"
                                color="text-body-secondary"
                            >
                                No sessions yet
                            </Box>
                            <Box
                                variant="p"
                                color="text-body-secondary"
                                padding={{ top: 's' }}
                            >
                                Sessions will appear here once captured
                            </Box>
                        </Box>
                    ) : (
                        <div className="session-list">
                            {sessions.map((session) => {
                                const duration = Math.round(
                                    (session.lastSeen - session.firstSeen) /
                                        1000
                                );
                                const minutes = Math.floor(duration / 60);
                                const seconds = duration % 60;
                                const durationStr =
                                    minutes > 0
                                        ? `${minutes}m ${seconds}s`
                                        : `${seconds}s`;

                                return (
                                    <div
                                        key={session.sessionId}
                                        className={`session-item ${
                                            selectedSessionId ===
                                            session.sessionId
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            onSelectSession(session.sessionId)
                                        }
                                    >
                                        <Box variant="strong">
                                            {session.sessionId}
                                        </Box>
                                        <div style={{ marginTop: '4px' }}>
                                            <Box
                                                variant="small"
                                                color="text-body-secondary"
                                            >
                                                {session.eventCount} events •{' '}
                                                {durationStr}
                                            </Box>
                                            <Box
                                                variant="small"
                                                color="text-body-secondary"
                                            >
                                                {new Date(
                                                    session.lastSeen
                                                ).toLocaleString()}
                                            </Box>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Container>
            </div>

            <div className="replay-main">
                <Container
                    header={<Header variant="h2">Session Replay</Header>}
                >
                    {loadingSessions || loadingEvents ? (
                        <div className="skeleton-player">
                            <div className="skeleton-player-screen">
                                <div className="skeleton skeleton-player-screen-inner" />
                            </div>
                            <div className="skeleton-player-controls">
                                <div className="skeleton-player-timeline">
                                    <div className="skeleton skeleton-player-time" />
                                    <div className="skeleton skeleton-player-progress" />
                                    <div className="skeleton skeleton-player-time" />
                                </div>
                                <div className="skeleton-player-buttons">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="skeleton skeleton-player-button"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : sessions.length === 0 || !selectedSessionId ? (
                        <div className="skeleton-player">
                            <div className="skeleton-player-screen">
                                <Box
                                    textAlign="center"
                                    padding={{ vertical: 'xxl' }}
                                >
                                    <Box
                                        variant="strong"
                                        fontSize="heading-m"
                                        color="text-body-secondary"
                                    >
                                        No replay to display
                                    </Box>
                                    <Box
                                        variant="p"
                                        color="text-body-secondary"
                                        padding={{ top: 's' }}
                                    >
                                        Select a session to view the replay
                                    </Box>
                                </Box>
                            </div>
                            <div className="skeleton-player-controls">
                                <div className="skeleton-player-timeline">
                                    <div className="skeleton skeleton-player-time" />
                                    <div className="skeleton skeleton-player-progress" />
                                    <div className="skeleton skeleton-player-time" />
                                </div>
                                <div className="skeleton-player-buttons">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="skeleton skeleton-player-button"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <SpaceBetween size="m">
                            <ColumnLayout columns={3} variant="text-grid">
                                <div>
                                    <Box variant="awsui-key-label">
                                        Session ID
                                    </Box>
                                    <Box
                                        variant="p"
                                        fontSize="body-m"
                                        fontWeight="bold"
                                    >
                                        <span
                                            style={{
                                                fontFamily: 'monospace',
                                                userSelect: 'all'
                                            }}
                                        >
                                            {selectedSessionId}
                                        </span>
                                    </Box>
                                </div>
                                <div>
                                    <Box variant="awsui-key-label">
                                        Event Count
                                    </Box>
                                    <Box
                                        variant="p"
                                        fontSize="heading-l"
                                        fontWeight="heavy"
                                    >
                                        {selectedRumEvents.length.toLocaleString()}
                                    </Box>
                                </div>
                                <div>
                                    <Box variant="awsui-key-label">
                                        Cost{' '}
                                        <Popover
                                            header="CloudWatch RUM Pricing"
                                            content={
                                                <SpaceBetween size="xs">
                                                    <Box variant="p">
                                                        RUM web events are
                                                        billed at $1.00 per
                                                        100,000 events.
                                                    </Box>
                                                    <Link
                                                        href="https://aws.amazon.com/cloudwatch/pricing/"
                                                        external
                                                    >
                                                        View pricing
                                                    </Link>
                                                </SpaceBetween>
                                            }
                                            triggerType="custom"
                                        >
                                            <Box
                                                color="text-status-info"
                                                display="inline"
                                                fontSize="body-s"
                                            >
                                                <span
                                                    style={{
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ⓘ
                                                </span>
                                            </Box>
                                        </Popover>
                                    </Box>
                                    <Box
                                        variant="p"
                                        fontSize="heading-l"
                                        fontWeight="heavy"
                                    >
                                        $
                                        {(
                                            selectedRumEvents.length / 100000
                                        ).toFixed(4)}
                                    </Box>
                                    <Box
                                        variant="small"
                                        color="text-body-secondary"
                                    >
                                        $1.00 / 100K events
                                    </Box>
                                </div>
                            </ColumnLayout>
                            {selectedReplayEvents.length === 0 ? (
                                <div className="skeleton-player">
                                    <div className="skeleton-player-screen">
                                        <Box
                                            textAlign="center"
                                            padding={{ vertical: 'xxl' }}
                                        >
                                            <Box
                                                variant="strong"
                                                fontSize="heading-m"
                                                color="text-body-secondary"
                                            >
                                                No replay available
                                            </Box>
                                            <Box
                                                variant="p"
                                                color="text-body-secondary"
                                                padding={{ top: 's' }}
                                            >
                                                This session does not have
                                                replay data
                                            </Box>
                                        </Box>
                                    </div>
                                    <div className="skeleton-player-controls">
                                        <div className="skeleton-player-timeline">
                                            <div className="skeleton skeleton-player-time" />
                                            <div className="skeleton skeleton-player-progress" />
                                            <div className="skeleton skeleton-player-time" />
                                        </div>
                                        <div className="skeleton-player-buttons">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className="skeleton skeleton-player-button"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <RrwebPlayer
                                    key={selectedSessionId}
                                    events={selectedReplayEvents}
                                />
                            )}
                            <Container
                                header={
                                    <Header variant="h3">
                                        Payloads ({selectedRequests.length})
                                    </Header>
                                }
                            >
                                {selectedRequests.length === 0 ? (
                                    <Box
                                        padding={{ vertical: 'l' }}
                                        textAlign="center"
                                    >
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
                                            No HTTP requests found for this
                                            session
                                        </Box>
                                    </Box>
                                ) : (
                                    <div className="events-list">
                                        {selectedRequests.map(
                                            (request, idx) => (
                                                <PayloadItem
                                                    key={idx}
                                                    request={request}
                                                    onClick={() =>
                                                        onRequestClick(request)
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </Container>
                        </SpaceBetween>
                    )}
                </Container>
            </div>

            <div className="events-sidebar">
                <Container
                    header={
                        <Header
                            variant="h2"
                            description={
                                loadingSessions || loadingEvents ? (
                                    <div
                                        className="skeleton skeleton-line short"
                                        style={{
                                            width: '100px',
                                            height: '14px'
                                        }}
                                    />
                                ) : eventView === 'rum' ? (
                                    `${selectedRumEvents.length} RUM events`
                                ) : (
                                    `${selectedReplayEvents.length} RRWeb events`
                                )
                            }
                            actions={
                                <SegmentedControl
                                    selectedId={eventView}
                                    onChange={({ detail }) =>
                                        handleEventViewChange(
                                            detail.selectedId as 'rum' | 'rrweb'
                                        )
                                    }
                                    options={[
                                        { id: 'rum', text: 'RUM' },
                                        { id: 'rrweb', text: 'RRWeb' }
                                    ]}
                                />
                            }
                        >
                            Events
                        </Header>
                    }
                >
                    {loadingSessions || loadingEvents ? (
                        <div className="events-list">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                <div key={i} className="skeleton-item">
                                    <div className="skeleton skeleton-line title" />
                                    <div className="skeleton skeleton-line short" />
                                </div>
                            ))}
                        </div>
                    ) : sessions.length === 0 || !selectedSessionId ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box
                                variant="strong"
                                fontSize="heading-m"
                                color="text-body-secondary"
                            >
                                No events to display
                            </Box>
                            <Box
                                variant="p"
                                color="text-body-secondary"
                                padding={{ top: 's' }}
                            >
                                Events will appear here when a session is
                                selected
                            </Box>
                        </Box>
                    ) : eventView === 'rum' ? (
                        selectedRumEvents.length === 0 ? (
                            <Box padding={{ vertical: 'l' }}>
                                <Box
                                    variant="strong"
                                    fontSize="heading-m"
                                    color="text-body-secondary"
                                >
                                    No RUM events
                                </Box>
                            </Box>
                        ) : (
                            <div className="events-list">
                                {selectedRumEvents.map((event, idx) => {
                                    const eventSize =
                                        new Blob([JSON.stringify(event)]).size /
                                        1024;
                                    const timestamp =
                                        event.event.timestamp < 946684800000
                                            ? event.event.timestamp * 1000
                                            : event.event.timestamp;
                                    const color = getEventColor(
                                        event.event.type
                                    );

                                    return (
                                        <div
                                            key={idx}
                                            className="event-item"
                                            onClick={() =>
                                                onRumEventClick(event)
                                            }
                                        >
                                            <div
                                                className="event-marker"
                                                style={{
                                                    backgroundColor: color
                                                }}
                                            />
                                            <div className="event-content">
                                                <Box
                                                    variant="strong"
                                                    fontSize="body-s"
                                                >
                                                    {getEventLabel(
                                                        event.event.type
                                                    )}
                                                </Box>
                                                <Box
                                                    variant="small"
                                                    color="text-body-secondary"
                                                >
                                                    {new Date(
                                                        timestamp
                                                    ).toLocaleTimeString(
                                                        'en-US',
                                                        {
                                                            hour12: false,
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit'
                                                        }
                                                    )}{' '}
                                                    • {eventSize.toFixed(2)} KB
                                                </Box>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : selectedReplayEvents.length === 0 ? (
                        <Box padding={{ vertical: 'l' }}>
                            <Box
                                variant="strong"
                                fontSize="heading-m"
                                color="text-body-secondary"
                            >
                                No RRWeb events
                            </Box>
                        </Box>
                    ) : (
                        <div className="events-list">
                            {selectedReplayEvents.map((event, idx) => {
                                const eventSize =
                                    new Blob([JSON.stringify(event)]).size /
                                    1024;
                                const timestamp =
                                    event.timestamp < 946684800000
                                        ? event.timestamp * 1000
                                        : event.timestamp;

                                return (
                                    <div
                                        key={idx}
                                        className="event-item"
                                        onClick={() => onEventClick(event, idx)}
                                    >
                                        <div
                                            className="event-marker"
                                            style={{
                                                backgroundColor: '#8b6ccf'
                                            }}
                                        />
                                        <div className="event-content">
                                            <Box
                                                variant="strong"
                                                fontSize="body-s"
                                            >
                                                {RRWEB_EVENT_TYPE_NAMES[
                                                    event.type
                                                ] || `Type ${event.type}`}
                                            </Box>
                                            <Box
                                                variant="small"
                                                color="text-body-secondary"
                                            >
                                                {new Date(
                                                    timestamp
                                                ).toLocaleTimeString('en-US', {
                                                    hour12: false,
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}{' '}
                                                • {eventSize.toFixed(2)} KB
                                            </Box>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Container>
            </div>
        </div>
    );
}
