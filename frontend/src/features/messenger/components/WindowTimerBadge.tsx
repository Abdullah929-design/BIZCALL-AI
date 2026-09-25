// frontend/src/features/messenger/components/WindowTimerBadge.tsx
import React, { useState, useEffect } from 'react';

interface Props {
    lastMessagedAt?: string | null;
    followUpSentAt?: string | null;
    compact?: boolean;
}

export const getRemainingWindowMs = (lastMessagedAt?: string | null): number => {
    if (!lastMessagedAt) return 0;
    const lastTime = new Date(lastMessagedAt).getTime();
    if (isNaN(lastTime)) return 0;
    const expiryTime = lastTime + 24 * 60 * 60 * 1000;
    return expiryTime - Date.now();
};

export const isLeadWindowActive = (lastMessagedAt?: string | null): boolean => {
    return getRemainingWindowMs(lastMessagedAt) > 0;
};

export const formatRemainingTime = (diffMs: number): string => {
    if (diffMs <= 0) return 'Window Closed';
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) {
        return `${mins}m left`;
    }
    return `${hours}h ${mins}m left`;
};

export const WindowTimerBadge: React.FC<Props> = ({ lastMessagedAt, followUpSentAt, compact = false }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        // Ticks every 60 seconds for live countdown
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!lastMessagedAt) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: compact ? '2px 6px' : '3px 8px',
                    borderRadius: '12px',
                    fontSize: compact ? '0.7rem' : '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(100, 116, 139, 0.15)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    color: '#94a3b8'
                }}
                title="Lead has no recorded inbound message. Meta 24-hour window is inactive."
            >
                <span>⚪</span>
                <span>No Inbound (Locked)</span>
            </span>
        );
    }

    const diffMs = getRemainingWindowMs(lastMessagedAt);

    if (diffMs <= 0) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: compact ? '2px 6px' : '3px 8px',
                    borderRadius: '12px',
                    fontSize: compact ? '0.7rem' : '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171'
                }}
                title="24-hour window has expired. You cannot send standard messages until the user replies back."
            >
                <span>🔴</span>
                <span>Window Expired</span>
            </span>
        );
    }

    // Window is active
    const timeText = formatRemainingTime(diffMs);
    const isCritical = diffMs < 60 * 60 * 1000; // < 1 hour
    const isWarning = diffMs < 4 * 60 * 60 * 1000; // < 4 hours

    let bg = 'rgba(16, 185, 129, 0.15)';
    let border = 'rgba(16, 185, 129, 0.35)';
    let color = '#34d399';
    let icon = '🟢';

    if (isCritical) {
        bg = 'rgba(239, 68, 68, 0.2)';
        border = 'rgba(239, 68, 68, 0.4)';
        color = '#fca5a5';
        icon = '⚠️';
    } else if (isWarning) {
        bg = 'rgba(245, 158, 11, 0.15)';
        border = 'rgba(245, 158, 11, 0.35)';
        color = '#fbbf24';
        icon = '🟡';
    }

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: compact ? '2px 6px' : '3px 8px',
                borderRadius: '12px',
                fontSize: compact ? '0.7rem' : '0.75rem',
                fontWeight: 600,
                background: bg,
                border: `1px solid ${border}`,
                color: color
            }}
            title={`Active 24h Meta messaging window. Closes in ${timeText}.${followUpSentAt ? ' Final 23h follow-up was dispatched.' : ''}`}
        >
            <span>{icon}</span>
            <span>{timeText}</span>
            {followUpSentAt && (
                <span style={{ fontSize: '0.68rem', opacity: 0.85, marginLeft: '2px' }}>
                    (Follow-up sent)
                </span>
            )}
        </span>
    );
};
