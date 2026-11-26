// frontend/src/features/cold-email/components/GmailConnectModal.tsx
import React, { useState, useEffect } from 'react';
import { connectGmail, disconnectGmail } from '../api/coldEmailApi';
import type { GmailConnectionStatus } from '../types';

interface GmailConnectModalProps {
    isOpen: boolean;
    status: GmailConnectionStatus;
    onClose: () => void;
    onSuccess: (nextStatus: GmailConnectionStatus) => void;
}

export const GmailConnectModal: React.FC<GmailConnectModalProps> = ({
    isOpen,
    status,
    onClose,
    onSuccess,
}) => {
    const [gmailAddress, setGmailAddress] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGmailAddress(status.gmail_address || '');
            setAppPassword('');
            setError('');
        }
    }, [isOpen, status]);

    if (!isOpen) return null;

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gmailAddress.trim() || !appPassword.trim()) {
            setError('Please enter both your Gmail address and 16-character App Password.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await connectGmail(gmailAddress.trim(), appPassword.trim());
            onSuccess({
                connected: true,
                gmail_address: res.gmail_address || gmailAddress.trim().toLowerCase(),
                last_synced_at: res.last_synced_at || null,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm(`Disconnect ${status.gmail_address}? Your existing reply history will stay saved.`)) {
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await disconnectGmail();
            onSuccess({ connected: false, gmail_address: null, last_synced_at: null });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to disconnect');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
            <div style={{
                background: 'rgba(12, 16, 32, 0.92)', backdropFilter: 'blur(20px) saturate(1.4)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16,
                boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 40px rgba(52,211,153,0.15)',
                padding: '26px 28px', maxWidth: 520, width: '100%', color: '#edeae2', fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
                        Connect Personal Gmail (SMTP · IMAP)
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Send outbound campaigns directly from your own Gmail and classify replies into a separate Personal Gmail inbox—sharing the same Leads pool without mixing with Brevo/n8n.
                </p>

                {status.connected && status.gmail_address && (
                    <div style={{
                        background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)',
                        borderRadius: 8, padding: '10px 12px', marginBottom: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem',
                    }}>
                        <span style={{ color: '#6ee7b7' }}>
                            Connected: <strong>{status.gmail_address}</strong>
                        </span>
                        <button
                            type="button"
                            onClick={handleDisconnect}
                            disabled={submitting}
                            style={{
                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                                color: '#f87171', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer',
                            }}
                        >
                            Disconnect
                        </button>
                    </div>
                )}

                <div style={{ marginBottom: 14 }}>
                    <button
                        type="button"
                        onClick={() => setShowGuide(v => !v)}
                        style={{
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                            color: '#a5b4fc', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem',
                            cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between',
                        }}
                    >
                        <span>How to get your 16-character Gmail App Password</span>
                        <span>{showGuide ? '▲' : '▼'}</span>
                    </button>
                    {showGuide && (
                        <ol style={{
                            margin: '8px 0 0', padding: '10px 14px 10px 28px',
                            background: 'rgba(0,0,0,0.35)', borderRadius: 8,
                            fontSize: '0.77rem', color: '#cbd5e1', lineHeight: 1.6,
                        }}>
                            <li>Open your Google Account → <strong>Security</strong> and ensure <strong>2-Step Verification</strong> is turned ON.</li>
                            <li>Search for <strong>App passwords</strong> in your Google Account search bar.</li>
                            <li>Create a new App Password named <em>BizCall CRM</em> and paste the 16-character code below.</li>
                        </ol>
                    )}
                </div>

                {error && (
                    <div style={{
                        padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', marginBottom: 14, fontSize: '0.8rem',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: 5 }}>
                            Gmail Address
                        </label>
                        <input
                            type="email"
                            value={gmailAddress}
                            onChange={e => setGmailAddress(e.target.value)}
                            placeholder="you@gmail.com"
                            required
                            style={{
                                width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.35)',
                                border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8,
                                fontSize: '0.88rem', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: 5 }}>
                            16-Character Google App Password (encrypted at rest)
                        </label>
                        <input
                            type="password"
                            value={appPassword}
                            onChange={e => setAppPassword(e.target.value)}
                            placeholder="xxxx xxxx xxxx xxxx"
                            required
                            style={{
                                width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.35)',
                                border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8,
                                fontSize: '0.88rem', fontFamily: 'monospace', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '9px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                                color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '9px 18px',
                                background: submitting ? '#f1f5f9' : '#ffffff',
                                border: '1px solid #dadce0',
                                color: '#1f2937',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                            </svg>
                            <span>{submitting ? 'Verifying SMTP & IMAP...' : status.connected ? 'Update & Verify' : 'Connect Personal Gmail'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
