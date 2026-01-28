import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import Modal from '@cloudscape-design/components/modal';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import Button from '@cloudscape-design/components/button';
import Tabs from '@cloudscape-design/components/tabs';
import { SessionReplayTab } from '../components/SessionReplayTab';
import { PayloadsTab } from '../components/PayloadsTab';
import { SettingsTab } from '../components/SettingsTab';
import type { SessionMetadata, RumEvent, RawRequest } from '../types/session';
import { recursiveParse } from '../utils/jsonUtils';
import './TimelinePage.css';

function TimelinePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [jsonView, setJsonView] = useState<'parsed' | 'raw'>('parsed');
    const [activeTab, setActiveTab] = useState(
        searchParams.get('tab') || 'session-replay'
    );
    const [requests, setRequests] = useState<RawRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RawRequest | null>(
        null
    );
    const [sessions, setSessions] = useState<SessionMetadata[]>([]);
    const [allEvents, setAllEvents] = useState<RumEvent[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
        null
    );
    const [selectedRecordingId, setSelectedRecordingId] = useState<
        string | null
    >(null);
    const [selectedReplayEvents, setSelectedReplayEvents] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);

    const savedTheme = localStorage.getItem('themeMode') || 'auto';
    const [themeMode, setThemeMode] = useState<{
        label: string;
        value: string;
    }>({
        label: savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1),
        value: savedTheme
    });

    useEffect(() => {
        const mode = themeMode.value as Mode;
        applyMode(mode);
        localStorage.setItem('themeMode', themeMode.value);
    }, [themeMode]);

    const fetchRequests = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/requests');
            const data: RawRequest[] = await response.json();
            setRequests(
                data.sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
            );
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        }
    };

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const startTime = Date.now();

            // Fetch events and session replay data
            const [eventsRes, replayRes] = await Promise.all([
                fetch('http://localhost:3000/api/events'),
                fetch('http://localhost:3000/api/session-replay/ids')
            ]);

            const events = await eventsRes.json();
            const recordings = await replayRes.json();

            setAllEvents(events);

            // Group events by sessionId
            const sessionMap = new Map<
                string,
                {
                    events: any[];
                    recordings: Set<string>;
                    firstSeen: number;
                    lastSeen: number;
                }
            >();

            events.forEach((event: any) => {
                const sid = event.sessionId || 'unknown';
                if (!sessionMap.has(sid)) {
                    sessionMap.set(sid, {
                        events: [],
                        recordings: new Set(),
                        firstSeen: Infinity,
                        lastSeen: 0
                    });
                }
                const session = sessionMap.get(sid)!;
                session.events.push(event);
                const ts =
                    event.event.timestamp < 946684800000
                        ? event.event.timestamp * 1000
                        : event.event.timestamp;
                session.firstSeen = Math.min(session.firstSeen, ts);
                session.lastSeen = Math.max(session.lastSeen, ts);
            });

            // Add recording IDs to sessions
            recordings.forEach((rec: any) => {
                // Recording ID is the sessionId
                if (sessionMap.has(rec.recordingId)) {
                    sessionMap
                        .get(rec.recordingId)!
                        .recordings.add(rec.recordingId);
                }
            });

            const sessionList: SessionMetadata[] = Array.from(
                sessionMap.entries()
            ).map(([sessionId, data]) => ({
                sessionId,
                eventCount: data.events.length,
                recordingIds: Array.from(data.recordings),
                firstSeen: data.firstSeen,
                lastSeen: data.lastSeen
            }));

            sessionList.sort((a, b) => b.lastSeen - a.lastSeen);

            const elapsed = Date.now() - startTime;
            const minDelay = 500;
            if (elapsed < minDelay) {
                await new Promise((resolve) =>
                    setTimeout(resolve, minDelay - elapsed)
                );
            }

            setSessions(sessionList);
            if (sessionList.length > 0 && !selectedSessionId) {
                const firstSession = sessionList[0];
                setSelectedSessionId(firstSession.sessionId);
                if (firstSession.recordingIds.length > 0) {
                    setSelectedRecordingId(firstSession.recordingIds[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoadingSessions(false);
        }
    };

    const fetchRecordingEvents = async (recordingId: string) => {
        try {
            const response = await fetch(
                `http://localhost:3000/api/session-replay/${recordingId}`
            );
            const events: any[] = await response.json();
            setSelectedReplayEvents(events);
        } catch (error) {
            console.error('Failed to fetch recording events:', error);
        }
    };

    useEffect(() => {
        if (selectedRecordingId) {
            fetchRecordingEvents(selectedRecordingId);
        }
    }, [selectedRecordingId]);

    useEffect(() => {
        fetchRequests();
        fetchSessions();
    }, []);

    return (
        <div className="page-container">
            <div className="navbar">
                <Tabs
                    activeTabId={activeTab}
                    onChange={({ detail }) => {
                        setActiveTab(detail.activeTabId);
                        setSearchParams({ tab: detail.activeTabId });
                    }}
                    tabs={[
                        { id: 'session-replay', label: 'Sessions' },
                        { id: 'payloads', label: 'Payloads' },
                        { id: 'settings', label: 'Settings' }
                    ]}
                />
            </div>

            {activeTab === 'session-replay' && (
                <SessionReplayTab
                    sessions={sessions}
                    selectedSessionId={selectedSessionId}
                    selectedReplayEvents={selectedReplayEvents}
                    selectedRumEvents={allEvents.filter(
                        (e) => e.sessionId === selectedSessionId
                    )}
                    selectedRequests={requests.filter(
                        (r) =>
                            (r.sessionId === selectedSessionId ||
                                !r.sessionId) &&
                            r.method === 'POST'
                    )}
                    loadingSessions={loadingSessions}
                    loadingEvents={false}
                    onSelectSession={(sessionId) => {
                        setSelectedSessionId(sessionId);
                        const session = sessions.find(
                            (s) => s.sessionId === sessionId
                        );
                        if (session && session.recordingIds.length > 0) {
                            setSelectedRecordingId(session.recordingIds[0]);
                        } else {
                            setSelectedRecordingId(null);
                            setSelectedReplayEvents([]);
                        }
                    }}
                    onEventClick={(event, idx) => {
                        setSelectedEvent({
                            event: {
                                id: String(idx),
                                type: 'rrweb',
                                timestamp: event.timestamp,
                                details: event
                            }
                        });
                        setSelectedRequest(null);
                        setModalVisible(true);
                    }}
                    onRumEventClick={(event) => {
                        setSelectedEvent(event);
                        setSelectedRequest(null);
                        setModalVisible(true);
                    }}
                    onRequestClick={(request) => {
                        setSelectedRequest(request);
                        setSelectedEvent(null);
                        setModalVisible(true);
                    }}
                />
            )}

            {activeTab === 'payloads' && (
                <PayloadsTab
                    requests={requests}
                    onRequestClick={(request) => {
                        setSelectedRequest(request);
                        setSelectedEvent(null);
                        setModalVisible(true);
                    }}
                />
            )}

            {activeTab === 'settings' && (
                <SettingsTab
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                />
            )}

            <Modal
                visible={modalVisible}
                onDismiss={() => setModalVisible(false)}
                size="max"
                header={
                    selectedEvent
                        ? selectedEvent.event.type
                        : selectedRequest
                        ? `${selectedRequest.method} Request`
                        : 'Details'
                }
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                variant="normal"
                                onClick={() => {
                                    const data = selectedEvent
                                        ? selectedEvent.event
                                        : selectedRequest;
                                    const json =
                                        jsonView === 'parsed'
                                            ? JSON.stringify(
                                                  recursiveParse(data),
                                                  null,
                                                  2
                                              )
                                            : JSON.stringify(data, null, 2);
                                    navigator.clipboard.writeText(json);
                                }}
                            >
                                Copy
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setModalVisible(false)}
                            >
                                Close
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
            >
                {(selectedEvent || selectedRequest) && (
                    <SpaceBetween size="m">
                        <SegmentedControl
                            selectedId={jsonView}
                            onChange={({ detail }) =>
                                setJsonView(
                                    detail.selectedId as 'parsed' | 'raw'
                                )
                            }
                            options={[
                                { id: 'parsed', text: 'Parsed' },
                                { id: 'raw', text: 'Raw' }
                            ]}
                        />
                        <pre className="json-viewer">
                            {jsonView === 'parsed'
                                ? JSON.stringify(
                                      recursiveParse(
                                          selectedEvent
                                              ? selectedEvent.event
                                              : selectedRequest
                                      ),
                                      null,
                                      2
                                  )
                                : JSON.stringify(
                                      selectedEvent
                                          ? selectedEvent.event
                                          : selectedRequest,
                                      null,
                                      2
                                  )}
                        </pre>
                    </SpaceBetween>
                )}
            </Modal>
        </div>
    );
}

export default TimelinePage;
