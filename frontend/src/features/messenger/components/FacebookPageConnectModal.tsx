// frontend/src/features/messenger/components/FacebookPageConnectModal.tsx
import React, { useState, useEffect } from 'react';
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

            setSuccessMsg(`🎉 Successfully connected "${page.name}"! AI automations and inbound routing are now live.`);
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

            setSuccessMsg('🎉 Facebook Page connected successfully!');
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                padding: '28px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                color: '#fff'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>💬</span>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                            {connectedPage ? 'Connected Facebook Page' : 'Connect Facebook Page'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
                    >
                        ✕
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
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🔵</div>
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
                        <form onSubmit={handleManualSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                    Page Name
                                </label>
                                <input
                                    type="text"
                                    value={manualPageName}
                                    onChange={(e) => setManualPageName(e.target.value)}
                                    placeholder="e.g. BizCall AI Page"
                                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
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
                                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
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
                                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '0.75rem' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '9px 16px',
                                    background: '#334155',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    marginTop: '4px'
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
