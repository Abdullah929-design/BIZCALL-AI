// frontend/src/features/cold-email/components/HotLeadsPanel.tsx
import React from 'react';
import type { ColdEmailLead } from '../types';

interface HotLeadsPanelProps {
    leads: ColdEmailLead[];
    onReply: (lead: ColdEmailLead) => void;
}

export const HotLeadsPanel: React.FC<HotLeadsPanelProps> = ({ leads, onReply }) => {
    if (leads.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(237,234,226,0.4)', fontSize: '0.85rem' }}>
                No hot leads yet. When prospects reply positively, they will appear here with AI-generated drafts.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
            {leads.map((lead, idx) => {
                const isReplied = Boolean(lead.replied_at || lead.actioned_at || lead.human_action?.toLowerCase().includes('replied') || lead.status?.toLowerCase() === 'replied');

                return (
                <div
                    key={idx}
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: isReplied ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 12,
                        padding: 20
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                                    {lead.name || 'Interested Prospect'}
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
                                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#4ade80' }}>
                                    💡 {lead.reply_summary}
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
                                        padding: '8px 18px', background: '#4ade80', color: '#09090b',
                                        border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                >
                                    ✉️ Review & Send Reply
                                </button>
                            )}
                        </div>
                    </div>

                    {/* AI Draft preview box */}
                    {lead.draft_reply && (
                        <div style={{
                            marginTop: 14, background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8, padding: '12px 14px', fontSize: '0.8rem', color: '#e2e8f0'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                AI Suggested Draft
                            </div>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                "{lead.draft_reply}"
                            </p>
                        </div>
                    )}
                </div>
                );
            })}
        </div>
    );
};
