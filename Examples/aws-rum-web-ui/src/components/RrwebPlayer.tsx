import { useEffect, useRef } from 'react';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

interface RrwebPlayerProps {
    events: any[];
}

export function RrwebPlayer({ events }: RrwebPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || events.length === 0) return;

        const sortedEvents = [...events]
            .filter((e) => e && typeof e.type === 'number' && e.timestamp)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (sortedEvents.length === 0) return;

        // Clear container
        containerRef.current.innerHTML = '';

        // Create player
        playerRef.current = new rrwebPlayer({
            target: containerRef.current,
            props: {
                events: sortedEvents
            }
        });

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            playerRef.current = null;
        };
    }, [events]);

    return <div ref={containerRef} />;
}
