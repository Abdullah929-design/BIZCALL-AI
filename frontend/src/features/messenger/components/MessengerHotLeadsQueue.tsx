// frontend/src/features/messenger/components/MessengerHotLeadsQueue.tsx
import React, { useState } from 'react';
import type { HotLeadDraftItem } from '../types';
import { sendReplyWF4, pollDraftConfirmation } from '../api/messengerApi';
import { WindowTimerBadge } from './WindowTimerBadge';

interface Props {
    drafts: HotLeadDraftItem[];
    userId: string;
    onRefresh: () => void;
}

export const MessengerHotLeadsQueue: React.FC<Props> = ({ drafts, userId, onRefresh }) => {
    const [editedBodies, setEditedBodies] = useState<{ [draftId: string]: string }>({});
    const [statusMap, setStatusMap] = useState<{ [draftId: string]: 'sending' | 'confirmed' | 'failed' | undefined }>({});
    const [errorMap, setErrorMap] = useState<{ [draftId: string]: string }>({});

    const handleSend = async (item: HotLeadDraftItem) => {
        const textToSend = editedBodies[item.draft_message_id] !== undefined
            ? editedBodies[item.draft_message_id]
            : item.draft_body;

        if (!textToSend.trim()) {
            alert('Reply message cannot be empty.');
            return;
        }

        setErrorMap(prev => ({ ...prev, [item.draft_message_id]: '' }));
        setStatusMap(prev => ({ ...prev, [item.draft_message_id]: 'sending' }));

        try {
            // 1. Dispatch to WF4
            await sendReplyWF4({
                userId,
                leadId: item.lead_id,
                psid: item.psid,
                message: textToSend,
                draftMessageId: item.draft_message_id
            });

            // 2. Poll Supabase to verify sent_draft
            const confirmed = await pollDraftConfirmation(item.draft_message_id);

            if (confirmed) {
                setStatusMap(prev => ({ ...prev, [item.draft_message_id]: 'confirmed' }));
                setTimeout(() => onRefresh(), 2000);
            } else {
                setStatusMap(prev => ({ ...prev, [item.draft_message_id]: 'failed' }));
                setErrorMap(prev => ({
                    ...prev,
                    [item.draft_message_id]: `Message queued, but Meta did not confirm delivery for PSID: ${item.psid}. Make sure the PSID is genuine and within the 24h messaging window.`
                }));
            }
        } catch (err: any) {
            console.error('Error sending reply via WF4:', err);
            setStatusMap(prev => ({ ...prev, [item.draft_message_id]: 'failed' }));
            setErrorMap(prev => ({
                ...prev,
                [item.draft_message_id]: err.message || 'Failed to trigger WF4 reply webhook.'
            }));
        }
    };

    if (drafts.length === 0) {
        return (
            <div className="messenger-empty-card">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <div className="messenger-empty-title">Hot Leads Queue is Clear</div>
                <p style={{ color: '#85899d', maxWidth: '450px', margin: '0 auto', fontSize: '12px' }}>
                    When a lead replies with positive intent, Gemini AI classifies it as <code style={{ color: '#a5b4fc' }}>hot</code> and generates an editable draft here for human approval.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {drafts.map(draft => {
                const currentStatus = statusMap[draft.draft_message_id];
                const currentBody = editedBodies[draft.draft_message_id] !== undefined
                    ? editedBodies[draft.draft_message_id]
                    : draft.draft_body;
                const draftError = errorMap[draft.draft_message_id];

                return (
                    <div
                        key={draft.draft_message_id}
                        className="hot-draft-card"
                    >
                        {draftError && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.28)',
                                borderRadius: '8px',
                                color: '#fca5a5',
                                fontSize: '12px',
                                marginBottom: '14px'
                            }}>
                                {draftError}
                            </div>
                        )}

                        {/* Header */}
                        <div className="hot-draft-header">
                            <div>
                                <div className="hot-draft-lead-row">
                                    <span className="hot-draft-name">{draft.lead_name}</span>
                                    <span className="hot-draft-psid">
                                        PSID: {draft.psid}
                                    </span>
                                    <WindowTimerBadge lastMessagedAt={draft.lead_last_messaged_at} followUpSentAt={draft.follow_up_sent_at} compact />
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>
                                    Draft created: {new Date(draft.created_at).toLocaleString()}
                                </div>
                            </div>

                            {/* Status Badge */}
                            {currentStatus === 'sending' && (
                                <span style={{ padding: '3px 9px', background: 'rgba(88, 85, 214, 0.15)', color: '#a5b4fc', border: '1px solid rgba(88, 85, 214, 0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                    Sending to Meta API...
                                </span>
                            )}
                            {currentStatus === 'confirmed' && (
                                <span style={{ padding: '3px 9px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                    Delivered & Sent
                                </span>
                            )}
                            {currentStatus === 'failed' && (
                                <span style={{ padding: '3px 9px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                    Delivery Failed
                                </span>
                            )}
                        </div>

                        {/* Inbound Customer Message */}
                        <div className="hot-inbound-box">
                            <div className="hot-inbound-label">
                                Inbound Message from Lead
                            </div>
                            <p className="hot-inbound-text">
                                "{draft.inbound_body}"
                            </p>
                        </div>

                        {/* Editable AI Response Draft */}
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#85899d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    AI Proposed Draft (Edit Before Approval)
                                </label>
                                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'DM Mono, monospace' }}>WF4_HUMAN_REPLY</span>
                            </div>
                            <textarea
                                rows={3}
                                value={currentBody}
                                onChange={(e) => setEditedBodies(prev => ({ ...prev, [draft.draft_message_id]: e.target.value }))}
                                className="hot-draft-textarea"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => handleSend(draft)}
                                disabled={currentStatus === 'sending' || currentStatus === 'confirmed'}
                                className="btn-send-draft"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                                {currentStatus === 'sending' ? 'Sending...' : currentStatus === 'confirmed' ? 'Sent' : 'Approve & Send to Messenger'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
