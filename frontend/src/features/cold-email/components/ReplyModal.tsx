// frontend/src/features/cold-email/components/ReplyModal.tsx
import React, { useState, useEffect } from 'react';
import type { ColdEmailLead } from '../types';
import { sendReply } from '../api/coldEmailApi';

interface ReplyModalProps {
    lead: ColdEmailLead | null;
    onClose: () => void;
    onReplySuccess: (lead?: ColdEmailLead | null) => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({ lead, onClose, onReplySuccess }) => {
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('Re: Quick Follow-up');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (lead) {
            // Prefill with AI-drafted reply if available
            setMessage(lead.draft_reply || lead.reply_content || '');
            setSubject(`Re: ${lead.company || 'Quick Follow-up'}`);
        }
    }, [lead]);

    if (!lead) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        setError('');

        try {
            await sendReply({
                lead_id: lead.lead_id || String(lead._row_number),
                lead_email: lead.email || '',
                subject,
                message: message.trim()
            });
            onReplySuccess(lead);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
            <div style={{
                background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
                padding: '24px 28px', maxWidth: 580, width: '100%', color: '#edeae2', fontFamily: "'Inter', sans-serif"
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#4ade80' }}>🔥 Reply to Hot Lead</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    Replying to: <strong style={{ color: '#fff' }}>{lead.name || lead.email}</strong> ({lead.email})
                </p>

                {lead.reply_summary && (
                    <div style={{
                        background: 'rgba(74,222,128,0.06)', padding: '10px 12px', borderRadius: 8,
                        marginBottom: 14, borderLeft: '3px solid #4ade80', fontSize: '0.8rem', color: '#cbd5e1'
                    }}>
                        <strong style={{ color: '#4ade80' }}>AI Reply Summary:</strong> {lead.reply_summary}
                    </div>
                )}

                {error && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', marginBottom: 12, fontSize: '0.8rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Subject</label>
                        <input
                            type="text" value={subject} onChange={e => setSubject(e.target.value)} required
                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Your Message (AI Draft prefilled — editable)</label>
                            {lead.confidence && (
                                <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>
                                    Confidence: {lead.confidence}
                                </span>
                            )}
                        </div>
                        <textarea
                            rows={6} value={message} onChange={e => setMessage(e.target.value)} required
                            placeholder="Type your reply here..."
                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                        <button
                            type="button" onClick={onClose}
                            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit" disabled={sending}
                            style={{ padding: '8px 22px', background: '#4ade80', border: 'none', color: '#09090b', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                        >
                            {sending ? 'Sending...' : '🚀 Send Reply'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
