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
            <div className="panel-empty-state">
                No neutral replies in queue. Ambiguous responses, general inquiries, and requests for details requiring human review will appear here.
            </div>
        );
    }

    return (
        <div className="prospect-card-list">
            {leads.map((lead, idx) => {
                const isReplied = Boolean(lead.replied_at || lead.actioned_at || lead.human_action?.toLowerCase().includes('replied') || lead.status?.toLowerCase() === 'replied');

                return (
                    <div
                        key={idx}
                        className={`prospect-card ${isReplied ? 'is-replied' : 'is-pending'}`}
                    >
                        <div className="prospect-card-top">
                            <div className="prospect-info-left">
                                <div className="prospect-name-row">
                                    <span className="prospect-name">
                                        {lead.name || 'Prospect'}
                                    </span>
                                    <span className="prospect-email">({lead.email})</span>
                                    {lead.company && (
                                        <span className="prospect-company-tag">
                                            {lead.company}
                                        </span>
                                    )}

                                    {/* Replied / Pending Status Flag */}
                                    {isReplied ? (
                                        <span className="status-badge-replied">
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                                            Replied
                                        </span>
                                    ) : (
                                        <span className="status-badge-pending">
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                                            Needs Review
                                        </span>
                                    )}
                                </div>

                                {lead.reply_summary && (
                                    <div className="prospect-summary-box neutral">
                                        {lead.reply_summary}
                                    </div>
                                )}
                            </div>

                            <div className="prospect-actions-right">
                                {isReplied ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '11px', color: '#85899d' }}>
                                            {lead.actioned_at || lead.replied_at ? `Sent ${lead.actioned_at || lead.replied_at}` : 'Reply sent'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onReply(lead)}
                                            className="btn-prospect-again"
                                        >
                                            Reply Again
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onReply(lead)}
                                        className="btn-prospect-reply"
                                        style={{ background: '#5855d6' }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                        Review & Reply
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* AI Draft preview box */}
                        {lead.draft_reply && (
                            <div style={{
                                marginTop: 12,
                                background: '#111218',
                                border: '1px solid #1f212d',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: '12px',
                                color: '#cbd5e1'
                            }}>
                                <div style={{ fontSize: '10px', color: '#85899d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: 'DM Mono, monospace' }}>
                                    AI SUGGESTED DRAFT
                                </div>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic', fontFamily: 'DM Mono, monospace', fontSize: '11.5px' }}>
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
