// frontend/src/features/cold-email/components/NeutralQueuePanel.tsx
import React from 'react';
import type { ColdEmailLead } from '../types';

interface NeutralQueuePanelProps {
    leads: ColdEmailLead[];
    onReply: (lead: ColdEmailLead) => void;
}

export const NeutralQueuePanel: React.FC<NeutralQueuePanelProps> = ({ leads, onReply }) => {
    if (leads.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(237,234,226,0.4)', fontSize: '0.85rem' }}>
                No neutral replies in queue. Ambiguous or general inquiries requiring review will appear here.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16 }}>
            {leads.map((lead, idx) => {
                const isReplied = Boolean(lead.replied_at || lead.actioned_at || lead.human_action?.toLowerCase().includes('replied') || lead.status?.toLowerCase() === 'replied');

                return (
                <div
                    key={idx}
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: isReplied ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(129, 140, 248, 0.25)',
                        borderRadius: 12,
                        padding: 20
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                                    {lead.name || 'Prospect'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({lead.email})</span>
                                {lead.company && (
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                                        🏢 {lead.company}
                                    </span>
                                )}

                                {/* Replied / Pending Status Flag */}
                                {isReplied ? (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem',
                                        fontWeight: 600, color: '#4ade80', background: 'rgba(74, 222, 128, 0.12)',
                                        border: '1px solid rgba(74, 222, 128, 0.25)', padding: '2px 8px', borderRadius: 6
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }}></span>
                                        Replied
                                    </span>
                                ) : (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem',
                                        fontWeight: 600, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)',
                                        border: '1px solid rgba(245, 158, 11, 0.25)', padding: '2px 8px', borderRadius: 6
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }}></span>
                                        Pending
                                    </span>
                                )}
                            </div>
                            {lead.reply_summary && (
                                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#818cf8' }}>
                                    💬 {lead.reply_summary}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {isReplied ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        {lead.actioned_at || lead.replied_at ? `Sent ${lead.actioned_at || lead.replied_at}` : 'Reply sent'}
                                    </span>
                                    <button
                                        onClick={() => onReply(lead)}
                                        style={{
                                            padding: '6px 12px', background: 'rgba(255,255,255,0.06)', color: '#edeae2',
                                            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer'
                                        }}
                                    >
                                        Reply Again
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onReply(lead)}
                                    style={{
                                        padding: '8px 18px', background: '#6366f1', color: '#fff',
                                        border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                >
                                    ✉️ Review & Reply
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Incoming reply snippet or AI draft preview if available */}
                    {(lead.reply_content || lead.draft_reply) && (
                        <div style={{
                            marginTop: 12, background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#cbd5e1'
                        }}>
                            {lead.reply_content && (
                                <p style={{ margin: '0 0 6px', fontStyle: 'italic' }}>
                                    <strong>Incoming:</strong> "{lead.reply_content}"
                                </p>
                            )}
                            {lead.draft_reply && (
                                <p style={{ margin: 0, color: '#818cf8' }}>
                                    <strong>AI Draft:</strong> "{lead.draft_reply}"
                                </p>
                            )}
                        </div>
                    )}
                </div>
                );
            })}
        </div>
    );
};
