// frontend/src/features/cold-email/pages/ColdEmailDashboard.tsx
import React, { useState, useEffect } from 'react';
import type { ColdEmailLead } from '../types';
import { fetchLeads, fetchHotLeads, fetchNeutralQueue, fetchFailedLeads, deleteLead } from '../api/coldEmailApi';
import { SendBatchButton } from '../components/SendBatchButton';
import { LeadsTable } from '../components/LeadsTable';
import { ReplyModal } from '../components/ReplyModal';
import { HotLeadsPanel } from '../components/HotLeadsPanel';
import { NeutralQueuePanel } from '../components/NeutralQueuePanel';
import { FailedLeadsPanel } from '../components/FailedLeadsPanel';
import { LeadModal } from '../components/LeadModal';
import { CsvImportModal } from '../components/CsvImportModal';

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

    const loadAllData = async () => {
        setLoading(true);
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
        } catch (err) {
            console.error('Error fetching cold email data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchTriggered = () => {
        // Immediate refresh
        loadAllData();
        // Second refresh after n8n executes the workflow
        setTimeout(() => {
            loadAllData();
        }, 4000);
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
        <div style={{ padding: '24px 28px', color: '#edeae2', fontFamily: "'Inter', sans-serif" }}>
            {/* Top Banner Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
                        📧 Cold Email Automation
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(237,234,226,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        n8n Automation · Brevo Outbound · AI Sentiment Classification
                    </p>
                </div>

                {/* Action button */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        onClick={() => { setEditingLead(null); setIsLeadModalOpen(true); }}
                        style={{
                            padding: '10px 16px', background: '#4ade80', color: '#09090b', border: 'none',
                            borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        ➕ Add Lead
                    </button>
                    <button
                        onClick={() => setIsCsvModalOpen(true)}
                        style={{
                            padding: '10px 16px', background: '#6366f1', color: '#fff', border: 'none',
                            borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        📥 Import CSV
                    </button>
                    <button
                        onClick={loadAllData}
                        style={{
                            padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        🔄 Refresh Sheets
                    </button>
                    <SendBatchButton
                        onBatchStarted={handleBatchTriggered}
                        pendingCount={allLeads.filter(l => (l.status || '').toLowerCase() === 'pending').length}
                    />
                </div>
            </div>

            {/* Sub-tab Navigation */}
            <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <button
                    onClick={() => setActiveTab('hot')}
                    style={{
                        padding: '10px 16px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'hot' ? '2px solid #4ade80' : '2px solid transparent',
                        color: activeTab === 'hot' ? '#4ade80' : '#94a3b8', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    🔥 Hot Leads ({hotLeads.length})
                </button>
                <button
                    onClick={() => setActiveTab('neutral')}
                    style={{
                        padding: '10px 16px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'neutral' ? '2px solid #818cf8' : '2px solid transparent',
                        color: activeTab === 'neutral' ? '#818cf8' : '#94a3b8', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    💬 Neutral Queue ({neutralLeads.length})
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    style={{
                        padding: '10px 16px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'all' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'all' ? '#6366f1' : '#94a3b8', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    📋 All Leads ({allLeads.length})
                </button>
                <button
                    onClick={() => setActiveTab('failed')}
                    style={{
                        padding: '10px 16px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'failed' ? '2px solid #ef4444' : '2px solid transparent',
                        color: activeTab === 'failed' ? '#ef4444' : '#94a3b8', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    ⚠️ Failed / Bounced ({failedLeads.length})
                </button>
            </div>

            {/* Content Panels */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading leads from Google Sheet...</div>
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
