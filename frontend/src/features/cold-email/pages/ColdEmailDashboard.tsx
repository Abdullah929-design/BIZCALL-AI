// frontend/src/features/cold-email/pages/ColdEmailDashboard.tsx
import React, { useState, useEffect } from 'react';
import type { ColdEmailLead } from '../types';
import { fetchLeads, fetchHotLeads, fetchNeutralQueue, fetchFailedLeads, fetchDashboardBundle, deleteLead } from '../api/coldEmailApi';
import { SendBatchButton } from '../components/SendBatchButton';
import { LeadsTable } from '../components/LeadsTable';
import { ReplyModal } from '../components/ReplyModal';
import { HotLeadsPanel } from '../components/HotLeadsPanel';
import { NeutralQueuePanel } from '../components/NeutralQueuePanel';
import { FailedLeadsPanel } from '../components/FailedLeadsPanel';
import { LeadModal } from '../components/LeadModal';
import { CsvImportModal } from '../components/CsvImportModal';
import '../ColdEmail.css';

export const ColdEmailDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'hot' | 'all' | 'neutral' | 'failed'>('hot');
    const [hotLeads, setHotLeads] = useState<ColdEmailLead[]>([]);
    const [allLeads, setAllLeads] = useState<ColdEmailLead[]>([]);
    const [neutralLeads, setNeutralLeads] = useState<ColdEmailLead[]>([]);
    const [failedLeads, setFailedLeads] = useState<ColdEmailLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyLead, setReplyLead] = useState<ColdEmailLead | null>(null);

    // Add / Edit Lead modal state
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<ColdEmailLead | null>(null);

    // CSV Bulk Import modal state
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

    const loadAllData = async (force: boolean = false) => {
        setLoading(true);
        try {
            const bundle = await fetchDashboardBundle(force);
            setHotLeads(bundle.hot_leads || []);
            setAllLeads(bundle.leads || []);
            setNeutralLeads(bundle.neutral_leads || []);
            setFailedLeads(bundle.failed_leads || []);
        } catch (err) {
            console.warn('Dashboard bundle fetch failed, falling back to parallel fetch:', err);
            try {
                const [hot, all, neutral, failed] = await Promise.all([
                    fetchHotLeads().catch(() => []),
                    fetchLeads().catch(() => []),
                    fetchNeutralQueue().catch(() => []),
                    fetchFailedLeads().catch(() => [])
                ]);
                setHotLeads(hot);
                setAllLeads(all);
                setNeutralLeads(neutral);
                setFailedLeads(failed);
            } catch (fallbackErr) {
                console.error('Error fetching cold email data:', fallbackErr);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBatchTriggered = () => {
        loadAllData(true);
        setTimeout(() => loadAllData(true), 3500);
        setTimeout(() => loadAllData(true), 7500);
    };

    const handleReplySuccess = (lead?: ColdEmailLead | null) => {
        if (lead) {
            const targetId = lead.lead_id || String(lead._row_number);
            const targetEmail = lead.email?.toLowerCase();
            const markReplied = (l: ColdEmailLead) => {
                if (
                    (targetId && (l.lead_id === targetId || String(l._row_number) === targetId)) ||
                    (targetEmail && l.email?.toLowerCase() === targetEmail)
                ) {
                    return { ...l, status: 'replied', actioned_at: 'Just now' };
                }
                return l;
            };
            setHotLeads(prev => prev.map(markReplied));
            setNeutralLeads(prev => prev.map(markReplied));
        }
        loadAllData();
        setTimeout(() => loadAllData(), 2500);
    };

    useEffect(() => {
        loadAllData();
    }, []);

    const handleDeleteLead = async (lead: ColdEmailLead) => {
        if (!lead._row_number) return;
        const confirmMsg = `Are you sure you want to delete "${lead.name || lead.email}" from Google Sheets?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await deleteLead(lead._row_number);
            loadAllData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete lead');
        }
    };

    return (
        <div className="cold-email-page">
            {/* Top Banner Header */}
            <div className="cold-email-header">
                <div className="cold-email-title-group">
                    <h1 className="cold-email-title">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Cold Email Automation
                    </h1>
                    <p className="cold-email-subtitle">
                        n8n Outbound Pipeline · Brevo Telemetry · AI Sentiment Classification
                    </p>
                </div>

                {/* Actions */}
                <div className="cold-email-actions">
                    <button
                        type="button"
                        onClick={() => { setEditingLead(null); setIsLeadModalOpen(true); }}
                        className="btn-ce-emerald"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Lead
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsCsvModalOpen(true)}
                        className="btn-ce-primary"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Import CSV
                    </button>

                    <button
                        type="button"
                        onClick={() => loadAllData(true)}
                        className="btn-ce-ghost"
                        title="Force sync data from Google Sheets"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"></path>
                        </svg>
                        Refresh Sheets
                    </button>

                    <SendBatchButton
                        onBatchStarted={handleBatchTriggered}
                        pendingCount={allLeads.filter(l => (l.status || '').toLowerCase() === 'pending').length}
                    />
                </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="cold-email-tabs-bar">
                <button
                    type="button"
                    onClick={() => setActiveTab('hot')}
                    className={`tab-nav-btn ${activeTab === 'hot' ? 'active tab-hot' : ''}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    Hot Leads
                    <span className="tab-count-pill">{hotLeads.length}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('neutral')}
                    className={`tab-nav-btn ${activeTab === 'neutral' ? 'active tab-neutral' : ''}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Neutral Queue
                    <span className="tab-count-pill">{neutralLeads.length}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`tab-nav-btn ${activeTab === 'all' ? 'active tab-all' : ''}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    All Leads
                    <span className="tab-count-pill">{allLeads.length}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('failed')}
                    className={`tab-nav-btn ${activeTab === 'failed' ? 'active tab-failed' : ''}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Failed / Bounced
                    <span className="tab-count-pill">{failedLeads.length}</span>
                </button>
            </div>

            {/* Content Panels Card */}
            <div className="cold-email-panel-card">
                {loading ? (
                    <div className="panel-loading-state">
                        Synchronizing cold email pipeline from Google Sheets...
                    </div>
                ) : (
                    <>
                        {activeTab === 'hot' && (
                            <HotLeadsPanel leads={hotLeads} onReply={lead => setReplyLead(lead)} />
                        )}

                        {activeTab === 'neutral' && (
                            <NeutralQueuePanel leads={neutralLeads} onReply={lead => setReplyLead(lead)} />
                        )}
                        {activeTab === 'all' && (
                            <LeadsTable
                                leads={allLeads}
                                showControls
                                onEdit={lead => { setEditingLead(lead); setIsLeadModalOpen(true); }}
                                onDelete={handleDeleteLead}
                            />
                        )}
                        {activeTab === 'failed' && (
                            <FailedLeadsPanel leads={failedLeads} />
                        )}
                    </>
                )}
            </div>

            {/* Add / Edit Lead Modal */}
            <LeadModal
                lead={editingLead}
                isOpen={isLeadModalOpen}
                onClose={() => { setIsLeadModalOpen(false); setEditingLead(null); }}
                onSuccess={loadAllData}
            />

            {/* Bulk CSV Import Modal */}
            <CsvImportModal
                isOpen={isCsvModalOpen}
                onClose={() => setIsCsvModalOpen(false)}
                onSuccess={loadAllData}
            />

            {/* Manual Reply Modal */}
            {replyLead && (
                <ReplyModal
                    lead={replyLead}
                    onClose={() => setReplyLead(null)}
                    onReplySuccess={handleReplySuccess}
                />
            )}
        </div>
    );
};
