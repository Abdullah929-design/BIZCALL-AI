// frontend/src/features/messenger/components/FacebookPageConnectModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { ConnectedFacebookPage } from '../types';
import { saveConnectedFacebookPage, disconnectFacebookPage } from '../api/messengerApi';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    connectedPage: ConnectedFacebookPage | null;
    onPageUpdated: () => void;
}

interface MetaDiscoveredPage {
    id: string;
    name: string;
    access_token: string;
    category?: string;
}

const META_APP_ID = '1493250259277699'; // Bizcallai Meta App ID

export const FacebookPageConnectModal: React.FC<Props> = ({
    isOpen,
    onClose,
    userId,
    connectedPage,
    onPageUpdated
}) => {
    const [discoveredPages, setDiscoveredPages] = useState<MetaDiscoveredPage[]>([]);
    const [connectingSdk, setConnectingSdk] = useState(false);
    
    // Manual fallback state
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualPageId, setManualPageId] = useState('');
    const [manualPageName, setManualPageName] = useState('');
    const [manualPageAccessToken, setManualPageAccessToken] = useState('');
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (showManualForm && modalRef.current) {
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 60);
        }
    }, [showManualForm]);

    // Initialize Facebook JS SDK
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if FB SDK script is already injected
        if (!(window as any).FB) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                (window as any).fbAsyncInit = function () {
                    (window as any).FB.init({
                        appId: META_APP_ID,
                        cookie: true,
                        xfbml: true,
                        version: 'v19.0'
                    });
                };
                if ((window as any).FB) {
                    (window as any).FB.init({
                        appId: META_APP_ID,
                        cookie: true,
                        xfbml: true,
                        version: 'v19.0'
                    });
                }
            };
            document.body.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (connectedPage) {
            setManualPageId(connectedPage.page_id);
            setManualPageName(connectedPage.page_name || '');
            setManualPageAccessToken(connectedPage.page_access_token || '');
        } else {
            setManualPageId('');
            setManualPageName('');
            setManualPageAccessToken('');
        }
        setDiscoveredPages([]);
        setError(null);
        setSuccessMsg(null);
    }, [connectedPage, isOpen]);

    if (!isOpen) return null;

    // 1-Click Facebook Login Popup Flow
    const handleFacebookLogin = () => {
        setError(null);
        setSuccessMsg(null);

        if (!(window as any).FB) {
            setError('Facebook SDK is still loading. Please try again in 2 seconds.');
            return;
        }

        setConnectingSdk(true);

        (window as any).FB.login((response: any) => {
            if (response.authResponse) {
                // Fetch all Facebook Pages the user manages along with their Page Access Tokens!
                (window as any).FB.api(
                    '/me/accounts',
                    { fields: 'id,name,access_token,category' },
                    async (accountsResp: any) => {
                        setConnectingSdk(false);
                        if (accountsResp && !accountsResp.error && accountsResp.data && accountsResp.data.length > 0) {
                            const pages: MetaDiscoveredPage[] = accountsResp.data;
                            setDiscoveredPages(pages);

                            // If user has only 1 page, connect it directly for supreme UX!
                            if (pages.length === 1) {
                                await selectAndConnectPage(pages[0]);
                            }
                        } else if (accountsResp?.error) {
                            setError(`Facebook API Error: ${accountsResp.error.message}`);
                        } else {
                            setError('No Facebook Pages found under this account. Ensure you are an Admin of at least one Facebook Page.');
                        }
                    }
                );
            } else {
                setConnectingSdk(false);
                setError('Facebook login cancelled or permissions not granted.');
            }
        }, {
            scope: 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement',
            return_scopes: true
        });
    };

    const selectAndConnectPage = async (page: MetaDiscoveredPage) => {
        setSaving(true);
        setError(null);
        try {
            await saveConnectedFacebookPage({
                userId,
                pageId: page.id,
                pageName: page.name,
                pageAccessToken: page.access_token
            });

            setSuccessMsg(`Successfully connected "${page.name}"! AI automations and inbound routing are now live.`);
            setTimeout(() => {
                onPageUpdated();
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error('Error saving connected page:', err);
            setError(err.message || 'Failed to save page connection.');
        } finally {
            setSaving(false);
        }
    };

    // Manual Save fallback
    const handleManualSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualPageId.trim() || !manualPageAccessToken.trim()) {
            setError('Please provide both Page ID and Page Access Token.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await saveConnectedFacebookPage({
                userId,
                pageId: manualPageId.trim(),
                pageName: manualPageName.trim() || 'My Facebook Page',
                pageAccessToken: manualPageAccessToken.trim()
            });

            setSuccessMsg('Facebook Page connected successfully!');
            setTimeout(() => {
                onPageUpdated();
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to save credentials.');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!connectedPage) return;
        if (!window.confirm(`Are you sure you want to disconnect "${connectedPage.page_name}"? Automated Messenger workflows will stop for this page.`)) {
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await disconnectFacebookPage(connectedPage.id);
            setSuccessMsg('Facebook Page disconnected.');
            setTimeout(() => {
                onPageUpdated();
                onClose();
            }, 800);
        } catch (err: any) {
            setError(err.message || 'Failed to disconnect page.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div 
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '24px 16px',
                overflowY: 'auto',
                boxSizing: 'border-box'
            }}
        >
            <div 
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                className="messenger-modal-dialog"
                style={{
                    background: 'rgba(12, 16, 32, 0.96)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: 'min(90vh, 740px)',
                    overflowY: 'auto',
                    padding: '26px 28px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 0 40px rgba(99, 102, 241, 0.25)',
                    backdropFilter: 'blur(20px) saturate(1.4)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                    color: '#fff',
                    boxSizing: 'border-box',
                    margin: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                            {connectedPage ? 'Connected Facebook Page' : 'Connect Facebook Page'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', cursor: 'pointer', borderRadius: '6px', transition: 'color 0.15s' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                        {successMsg}
                    </div>
                )}

                {/* Active Connection Status Card */}
                {connectedPage && (
                    <div style={{ background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                LIVE INTEGRATION
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                                {connectedPage.page_name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                Page ID: <code>{connectedPage.page_id}</code>
                            </div>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            disabled={saving}
                            style={{
                                padding: '8px 14px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Disconnect
                        </button>
                    </div>
                )}

                {/* Primary Method: 1-Click Facebook Login Button */}
                <div style={{
                    background: 'rgba(20, 24, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                    </div>
                    <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px' }}>
                        1-Click Facebook Connection
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.4 }}>
                        Log in with your Facebook account to automatically discover and connect your business Page with zero manual configuration.
                    </p>

                    <button
                        onClick={handleFacebookLogin}
                        disabled={connectingSdk || saving}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            background: connectingSdk ? '#475569' : 'linear-gradient(135deg, #1877f2, #166fe5)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: (connectingSdk || saving) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 14px 0 rgba(24, 119, 242, 0.39)'
                        }}
                    >
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        {connectingSdk ? 'Opening Facebook Login...' : (connectedPage ? 'Reconnect / Switch Page via Facebook' : 'Continue with Facebook')}
                    </button>
                </div>

                {/* Multiple Discovered Pages Selection List */}
                {discoveredPages.length > 1 && (
                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                        <h5 style={{ color: '#38bdf8', margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700 }}>
                            Select the Page you want to connect to BizCall:
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {discoveredPages.map(page => (
                                <div key={page.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{page.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {page.id} {page.category ? `• ${page.category}` : ''}</div>
                                    </div>
                                    <button
                                        onClick={() => selectAndConnectPage(page)}
                                        disabled={saving}
                                        style={{
                                            padding: '6px 14px',
                                            background: '#0284c7',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            cursor: saving ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {saving ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Advanced / Developer Manual Setup Accordion */}
                <div>
                    <button
                        type="button"
                        onClick={() => setShowManualForm(!showManualForm)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: '0 auto',
                            padding: '4px 8px'
                        }}
                    >
                        <span>{showManualForm ? '▲ Hide Advanced Setup' : '▼ Developer / Manual Token Setup'}</span>
                    </button>

                    {showManualForm && (
                        <form 
                            ref={formRef}
                            onSubmit={handleManualSave} 
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '12px', 
                                marginTop: '12px', 
                                background: 'rgba(15, 20, 36, 0.65)', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxSizing: 'border-box'
                            }}
                        >
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                    Page Name
                                </label>
                                <input
                                    type="text"
                                    value={manualPageName}
                                    onChange={(e) => setManualPageName(e.target.value)}
                                    placeholder="e.g. BizCall AI Page"
                                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(25, 30, 52, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                    Facebook Page ID *
                                </label>
                                <input
                                    type="text"
                                    value={manualPageId}
                                    onChange={(e) => setManualPageId(e.target.value)}
                                    placeholder="e.g. 61594175137308"
                                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(25, 30, 52, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                    Page Access Token *
                                </label>
                                <textarea
                                    rows={2}
                                    value={manualPageAccessToken}
                                    onChange={(e) => setManualPageAccessToken(e.target.value)}
                                    placeholder="EAAG..."
                                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(25, 30, 52, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '6px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '0.75rem', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '10px 16px',
                                    background: '#5855d6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '7px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    marginTop: '4px',
                                    transition: 'background 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Credentials Manually'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
