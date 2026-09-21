// frontend/src/features/messenger/pages/MessengerDashboard.tsx
import React, { useState, useEffect } from 'react';
import type {
    HotLeadDraftItem,
    MessengerScheduledCall,
    MessengerLead,
    MessengerCampaign,
    MessengerStats,
    ConnectedFacebookPage
} from '../types';
import {
    fetchHotLeadDrafts,
    fetchScheduledCalls,
    fetchMessengerLeads,
    fetchMessengerCampaigns,
    fetchMessengerStats,
    fetchConnectedFacebookPage
} from '../api/messengerApi';
import { MessengerHotLeadsQueue } from '../components/MessengerHotLeadsQueue';
import { MessengerCampaigns } from '../components/MessengerCampaigns';
import { MessengerEscalations } from '../components/MessengerEscalations';
import { MessengerAnalytics } from '../components/MessengerAnalytics';
import { FacebookPageConnectModal } from '../components/FacebookPageConnectModal';

interface Props {
    user: any;
}

export const MessengerDashboard: React.FC<Props> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'hot' | 'campaigns' | 'sensitive' | 'analytics'>('hot');
    const [drafts, setDrafts] = useState<HotLeadDraftItem[]>([]);
    const [calls, setCalls] = useState<MessengerScheduledCall[]>([]);
    const [leads, setLeads] = useState<MessengerLead[]>([]);
    const [campaigns, setCampaigns] = useState<MessengerCampaign[]>([]);
    const [connectedPage, setConnectedPage] = useState<ConnectedFacebookPage | null>(null);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [stats, setStats] = useState<MessengerStats>({
        total_campaigns: 0,
        total_leads: 0,
        hot_leads: 0,
        no_reply_leads: 0,
        uninterested_leads: 0,
        sensitive_leads: 0,
        archived_leads: 0
    });
    const [loading, setLoading] = useState(true);

    const userId = user?.id;

    const loadAll = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [d, c, l, camp, s, page] = await Promise.all([
                fetchHotLeadDrafts(userId),
                fetchScheduledCalls(userId),
                fetchMessengerLeads(userId),
                fetchMessengerCampaigns(userId),
                fetchMessengerStats(userId),
                fetchConnectedFacebookPage(userId)
            ]);
            setDrafts(d);
            setCalls(c);
            setLeads(l);
            setCampaigns(camp);
            setStats(s);
            setConnectedPage(page);
        } catch (err) {
            console.error('Error loading Messenger module data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, [userId]);

    return (
        <div style={{ padding: '24px 28px', color: '#edeae2', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>💬</span> Facebook Messenger CRM
                    </h1>
                    <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Automated 4-tier n8n workflows with Gemini AI intent classification & Meta Graph API v19.0.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Facebook Page Integration Status */}
                    {connectedPage ? (
                        <div
                            onClick={() => setIsConnectModalOpen(true)}
                            style={{
                                background: '#1e293b',
                                border: '1px solid #3b82f6',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer'
                            }}
                            title="Click to manage Facebook Page connection"
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                                    {connectedPage.page_name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#60a5fa' }}>
                                    ID: {connectedPage.page_id}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '4px' }}>⚙️</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsConnectModalOpen(true)}
                            style={{
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <span>🔵</span> Connect Facebook Page
                        </button>
                    )}

                    <button
                        onClick={loadAll}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            background: '#334155',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        {loading ? 'Refreshing...' : '🔄 Refresh Data'}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('hot')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'hot' ? '#1e293b' : 'transparent',
                        color: activeTab === 'hot' ? '#38bdf8' : '#94a3b8',
                        border: 'none',
                        borderBottom: activeTab === 'hot' ? '2px solid #38bdf8' : '2px solid transparent',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    🔥 Hot Leads Queue ({drafts.length})
                </button>

                <button
                    onClick={() => setActiveTab('campaigns')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'campaigns' ? '#1e293b' : 'transparent',
                        color: activeTab === 'campaigns' ? '#38bdf8' : '#94a3b8',
                        border: 'none',
                        borderBottom: activeTab === 'campaigns' ? '2px solid #38bdf8' : '2px solid transparent',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    🚀 Campaigns (WF1)
                </button>

                <button
                    onClick={() => setActiveTab('sensitive')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'sensitive' ? '#1e293b' : 'transparent',
                        color: activeTab === 'sensitive' ? '#ef4444' : '#94a3b8',
                        border: 'none',
                        borderBottom: activeTab === 'sensitive' ? '2px solid #ef4444' : '2px solid transparent',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    🛡️ Sensitive Escalations ({calls.length})
                </button>

                <button
                    onClick={() => setActiveTab('analytics')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'analytics' ? '#1e293b' : 'transparent',
                        color: activeTab === 'analytics' ? '#38bdf8' : '#94a3b8',
                        border: 'none',
                        borderBottom: activeTab === 'analytics' ? '2px solid #38bdf8' : '2px solid transparent',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    📊 Leads Registry & Stats
                </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'hot' && (
                <MessengerHotLeadsQueue drafts={drafts} userId={userId} onRefresh={loadAll} />
            )}
            {activeTab === 'campaigns' && (
                <MessengerCampaigns userId={userId} campaigns={campaigns} onRefresh={loadAll} />
            )}
            {activeTab === 'sensitive' && (
                <MessengerEscalations calls={calls} onRefresh={loadAll} />
            )}
            {activeTab === 'analytics' && (
                <MessengerAnalytics leads={leads} stats={stats} />
            )}

            {/* Facebook Page Connect Modal */}
            <FacebookPageConnectModal
                isOpen={isConnectModalOpen}
                onClose={() => setIsConnectModalOpen(false)}
                userId={userId}
                connectedPage={connectedPage}
                onPageUpdated={loadAll}
            />
        </div>
    );
};
