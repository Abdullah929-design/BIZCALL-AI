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
                    [item.draft_message_id]: `⚠️ Message queued, but Meta did not confirm delivery for PSID: ${item.psid}. Make sure the PSID is genuine and within the 24h messaging window.`
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
            <div style={{ background: '#1e293b', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔥</div>
                <h3 style={{ color: '#fff', marginBottom: '8px' }}>Hot Leads Queue is Clean</h3>
                <p style={{ color: '#94a3b8', maxWidth: '450px', margin: '0 auto' }}>
                    When a lead replies with positive intent, Gemini AI classifies it as <code style={{ color: '#38bdf8' }}>hot</code> and generates an editable draft here for human approval.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {drafts.map(draft => {
                const currentStatus = statusMap[draft.draft_message_id];
                const currentBody = editedBodies[draft.draft_message_id] !== undefined
                    ? editedBodies[draft.draft_message_id]
                    : draft.draft_body;
                const draftError = errorMap[draft.draft_message_id];

                return (
                    <div
                        key={draft.draft_message_id}
                        style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            padding: '20px 24px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    >
                        {draftError && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid #ef4444',
                                borderRadius: '8px',
                                color: '#fca5a5',
                                fontSize: '0.85rem',
                                marginBottom: '14px'
                            }}>
                                {draftError}
                            </div>
                        )}

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{draft.lead_name}</span>
                                    <span style={{ fontSize: '0.75rem', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                        PSID: {draft.psid}
                                    </span>
                                    <WindowTimerBadge lastMessagedAt={draft.lead_last_messaged_at} followUpSentAt={draft.follow_up_sent_at} compact />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    Draft generated: {new Date(draft.created_at).toLocaleString()}
                                </div>
                            </div>

                            {/* Status Badge */}
                            {currentStatus === 'sending' && (
                                <span style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                    ⏳ Sending to Meta API...
                                </span>
                            )}
                            {currentStatus === 'confirmed' && (
                                <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                    ✅ Delivered & Sent
                                </span>
                            )}
                            {currentStatus === 'failed' && (
                                <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                    ❌ Delivery Failed
                                </span>
                            )}
                        </div>

                        {/* Inbound Customer Message */}
                        <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #38bdf8', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
                                💬 INBOUND MESSAGE FROM LEAD:
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>
                                "{draft.inbound_body}"
                            </div>
                        </div>

                        {/* Editable AI Response Draft */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                                    🤖 AI PROPOSED DRAFT (EDIT BEFORE APPROVAL):
                                </label>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>WF4 Human Reply</span>
                            </div>
                            <textarea
                                rows={3}
                                value={currentBody}
                                onChange={(e) => setEditedBodies(prev => ({ ...prev, [draft.draft_message_id]: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#0f172a',
                                    border: '1px solid #475569',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => handleSend(draft)}
                                disabled={currentStatus === 'sending' || currentStatus === 'confirmed'}
                                style={{
                                    padding: '9px 20px',
                                    background: currentStatus === 'confirmed' ? '#059669' : '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: currentStatus === 'sending' ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {currentStatus === 'sending' ? 'Sending...' : currentStatus === 'confirmed' ? 'Sent' : '🚀 Approve & Send to Messenger'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
