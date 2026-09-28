// frontend/src/features/messenger/components/MessengerEscalations.tsx
import React, { useState } from 'react';
import type { MessengerScheduledCall } from '../types';
import { completeScheduledCall } from '../api/messengerApi';

interface Props {
    calls: MessengerScheduledCall[];
    onRefresh: () => void;
}

export const MessengerEscalations: React.FC<Props> = ({ calls, onRefresh }) => {
    const [actioningId, setActioningId] = useState<string | null>(null);

    const handleComplete = async (callId: string) => {
        setActioningId(callId);
        try {
            await completeScheduledCall(callId);
            onRefresh();
        } catch (err) {
            console.error('Error completing call:', err);
        } finally {
            setActioningId(null);
        }
    };

    if (calls.length === 0) {
        return (
            <div className="messenger-empty-card">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <div className="messenger-empty-title">No Sensitive Escalations</div>
                <p style={{ color: '#85899d', maxWidth: '450px', margin: '0 auto', fontSize: '12px' }}>
                    When a lead discusses sensitive topics (legal disputes, fraud, severe complaints), WF2 automatically pauses AI automations and flags them here for human escalation.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {calls.map(call => (
                <div
                    key={call.id}
                    className="escalation-card"
                >
                    <div style={{ maxWidth: '75%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{call.lead_name}</span>
                            <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                SENSITIVE ESCALATION
                            </span>
                            {(call.scheduled_at || call.created_at) && (
                                <span style={{ fontSize: '11px', color: '#85899d', fontFamily: 'DM Mono, monospace' }}>
                                    Flagged: {new Date(call.scheduled_at || call.created_at || '').toLocaleString()}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600, marginBottom: '6px' }}>
                            Reason: {call.reason}
                        </div>
                        <div style={{ background: '#0f1017', border: '1px solid #242738', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', color: '#cbd5e1' }}>
                            "{call.lead_message}"
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleComplete(call.id)}
                        disabled={actioningId === call.id}
                        className="btn-resolve-escalation"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {actioningId === call.id ? 'Updating...' : 'Mark as Handled'}
                    </button>
                </div>
            ))}
        </div>
    );
};
