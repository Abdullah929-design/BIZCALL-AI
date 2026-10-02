// frontend/src/features/messenger/pages/MessengerDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
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
    calculateMessengerStats,
    fetchConnectedFacebookPage
} from '../api/messengerApi';
import { MessengerHotLeadsQueue } from '../components/MessengerHotLeadsQueue';
import { MessengerCampaigns } from '../components/MessengerCampaigns';
import { MessengerEscalations } from '../components/MessengerEscalations';
import { MessengerAnalytics } from '../components/MessengerAnalytics';
import { FacebookPageConnectModal } from '../components/FacebookPageConnectModal';
import '../Messenger.css';

interface Props {
    user: any;
}

export const MessengerDashboard: React.FC<Props> = ({ user }) => {
    const bgVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (bgVideoRef.current) {
            bgVideoRef.current.play().catch(() => { });
        }
    }, []);
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

    const loadAll = async (isBackground = false) => {
        if (!userId) {
            setLoading(false);
            return;
        }
        if (!isBackground) {
            setLoading(true);
        }
        try {
            const [d, c, l, camp, page] = await Promise.all([
                fetchHotLeadDrafts(userId),
                fetchScheduledCalls(userId),
                fetchMessengerLeads(userId),
                fetchMessengerCampaigns(userId),
                fetchConnectedFacebookPage(userId)
            ]);
            setDrafts(d);
            setCalls(c);
            setLeads(l);
            setCampaigns(camp);
            setStats(calculateMessengerStats(l, camp));
            setConnectedPage(page);
        } catch (err) {
            console.error('Error loading Messenger module data:', err);
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadAll(false);

        const intervalId = setInterval(() => {
            loadAll(true);
        }, 20000);

        return () => clearInterval(intervalId);
    }, [userId]);

    return (
        <div className="agent-builder-page-wrapper messenger-page-wrapper">
            {/* Levitating Crystal Video Background */}
            <video
                ref={bgVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="builder-bg-video"
                src="https://res.cloudinary.com/dv7fu8gwf/video/upload/Crystal_levitating_up_and_down_20260928230831_dyw0df.mp4"
            >
                <iframe
                    src="https://player.cloudinary.com/embed/?cloud_name=dv7fu8gwf&public_id=Crystal_levitating_up_and_down_20260928230831_dyw0df"
                    className="builder-bg-video"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    frameBorder={0}
                    title="Background Video"
                />
            </video>
            <div className="builder-bg-overlay" />

            <div className="messenger-page">
                {/* Header */}
                <div className="messenger-header">
                    <div className="messenger-title-group">
                        <h1 className="messenger-title">

                            Facebook Messenger CRM
                        </h1>

                    </div>

                    <div className="messenger-actions">
                        {/* Facebook Page Integration Status */}
                        {connectedPage ? (
                            <div
                                onClick={() => setIsConnectModalOpen(true)}
                                className="connected-page-pill"
                                title="Click to manage Facebook Page connection"
                            >
                                <span className="page-status-dot" />
                                <div>
                                    <div className="page-info-name">
                                        {connectedPage.page_name}
                                    </div>
                                    <div className="page-info-id">
                                        ID: {connectedPage.page_id}
                                    </div>
                                </div>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#85899d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsConnectModalOpen(true)}
                                className="btn-msg-connect"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                                </svg>
                                Connect Facebook Page
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => loadAll(false)}
                            disabled={loading}
                            className="btn-msg-refresh"
                            title="Refresh Messenger pipeline data"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"></path>
                            </svg>
                            {loading ? 'Refreshing...' : 'Refresh Data'}
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="messenger-tabs-bar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('hot')}
                        className={`msg-tab-btn ${activeTab === 'hot' ? 'active tab-hot' : ''}`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        Hot Leads Queue
                        <span className="msg-tab-count">{drafts.length}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('campaigns')}
                        className={`msg-tab-btn ${activeTab === 'campaigns' ? 'active tab-campaigns' : ''}`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Campaigns (WF1)
                        <span className="msg-tab-count">{campaigns.length}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('sensitive')}
                        className={`msg-tab-btn ${activeTab === 'sensitive' ? 'active tab-sensitive' : ''}`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Sensitive Escalations
                        <span className="msg-tab-count">{calls.length}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('analytics')}
                        className={`msg-tab-btn ${activeTab === 'analytics' ? 'active tab-analytics' : ''}`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        Leads Registry & Stats
                    </button>
                </div>

                {/* Tab Views */}
                {activeTab === 'hot' && (
                    <MessengerHotLeadsQueue drafts={drafts} userId={userId} onRefresh={loadAll} />
                )}
                {activeTab === 'campaigns' && (
                    <MessengerCampaigns userId={userId} campaigns={campaigns} leads={leads} onRefresh={loadAll} />
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
        </div>
    );
};
