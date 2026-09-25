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
            <div style={{ background: '#1e293b', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛡️</div>
                <h3 style={{ color: '#fff', marginBottom: '8px' }}>No Sensitive Escalations</h3>
                <p style={{ color: '#94a3b8', maxWidth: '450px', margin: '0 auto' }}>
                    When a lead discusses sensitive topics (legal disputes, fraud, severe complaints), WF2 stops all AI automations and flags them here.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {calls.map(call => (
                <div
                    key={call.id}
                    style={{
                        background: '#1e293b',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '12px',
                        padding: '20px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}
                >
                    <div style={{ maxWidth: '75%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{call.lead_name}</span>
                            <span style={{ fontSize: '0.75rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                SENSITIVE ESCALATION
                            </span>
                            {(call.scheduled_at || call.created_at) && (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Flagged: {new Date(call.scheduled_at || call.created_at || '').toLocaleString()}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#fca5a5', fontWeight: 600, marginBottom: '6px' }}>
                            Reason: {call.reason}
                        </div>
                        <div style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            "{call.lead_message}"
                        </div>
                    </div>

                    <button
                        onClick={() => handleComplete(call.id)}
                        disabled={actioningId === call.id}
                        style={{
                            padding: '9px 18px',
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: actioningId === call.id ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {actioningId === call.id ? 'Updating...' : '✅ Mark as Handled'}
                    </button>
                </div>
            ))}
        </div>
    );
};
