// frontend/src/features/messenger/components/MessengerCampaigns.tsx
import React, { useState, useMemo } from 'react';
import type { MessengerCampaign, MessengerLead } from '../types';
import { launchCampaignWF1 } from '../api/messengerApi';
import { WindowTimerBadge, isLeadWindowActive } from './WindowTimerBadge';

interface Props {
    userId: string;
    campaigns: MessengerCampaign[];
    leads?: MessengerLead[];
    onRefresh: () => void;
}

export const MessengerCampaigns: React.FC<Props> = ({ userId, campaigns, leads = [], onRefresh }) => {
    const [name, setName] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [recipientMode, setRecipientMode] = useState<'picker' | 'manual'>('picker');
    const [selectedPsids, setSelectedPsids] = useState<Set<string>>(new Set());
    const [leadsText, setLeadsText] = useState('');
    const [enable23hFollowUp, setEnable23hFollowUp] = useState(true);
    const [launching, setLaunching] = useState(false);
    const [statusAlert, setStatusAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Split discovered leads by active 24h window and deduplicate by PSID
    const { eligibleLeads, expiredLeads, uniqueEligiblePsids } = useMemo(() => {
        const eligible: MessengerLead[] = [];
        const expired: MessengerLead[] = [];
        const seenPsids = new Set<string>();

        leads.forEach(l => {
            if (isLeadWindowActive(l.lead_last_messaged_at)) {
                if (!seenPsids.has(l.psid)) {
                    seenPsids.add(l.psid);
                    eligible.push(l);
                }
            } else {
                expired.push(l);
            }
        });

        return {
            eligibleLeads: eligible,
            expiredLeads: expired,
            uniqueEligiblePsids: seenPsids
        };
    }, [leads]);

    // Check if all unique eligible PSIDs are selected
    const isAllEligibleSelected = useMemo(() => {
        if (uniqueEligiblePsids.size === 0) return false;
        return Array.from(uniqueEligiblePsids).every(p => selectedPsids.has(p));
    }, [uniqueEligiblePsids, selectedPsids]);

    // Helper to toggle a lead selection
    const toggleLead = (psid: string) => {
        setSelectedPsids(prev => {
            const next = new Set(prev);
            if (next.has(psid)) {
                next.delete(psid);
            } else {
                next.add(psid);
            }
            return next;
        });
    };

    const selectAllEligible = () => {
        if (isAllEligibleSelected) {
            setSelectedPsids(new Set());
        } else {
            setSelectedPsids(new Set(uniqueEligiblePsids));
        }
    };

    const handleLaunch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageBody.trim()) {
            alert('Please write the initial campaign message.');
            return;
        }

        let parsedLeads: Array<{ psid: string; name: string }> = [];

        if (recipientMode === 'picker') {
            if (selectedPsids.size === 0) {
                alert('Please select at least one active-window lead to receive this campaign message.');
                return;
            }
            parsedLeads = Array.from(selectedPsids).map(psid => {
                const lead = eligibleLeads.find(l => l.psid === psid);
                return { psid, name: lead?.name || 'Lead' };
            });
        } else {
            // Manual entry fallback
            parsedLeads = leadsText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => {
                    const parts = line.split(',');
                    const psid = parts[0].trim();
                    const leadName = parts[1] ? parts[1].trim() : 'Lead';
                    return { psid, name: leadName };
                });

            if (parsedLeads.length === 0) {
                alert('Please provide at least one valid Facebook PSID.');
                return;
            }

            // Validate that PSIDs are numeric (Meta PSIDs are numeric digit strings)
            const invalidPsids = parsedLeads.filter(l => !/^\d+$/.test(l.psid));
            if (invalidPsids.length > 0) {
                alert(`Invalid Facebook PSID format for: ${invalidPsids.map(l => l.psid).join(', ')}. PSIDs must contain numeric digits only.`);
                return;
            }
        }

        setLaunching(true);
        setStatusAlert(null);

        try {
            await launchCampaignWF1({
                userId,
                campaignName: name.trim() || undefined,
                messageBody: messageBody.trim(),
                enable23hFollowUp,
                leads: parsedLeads
            });

            setStatusAlert({
                text: `🎉 Campaign launched successfully! WF1 is dispatching messages to ${parsedLeads.length} lead(s).${enable23hFollowUp ? ' 23-hour automated follow-up (WF3) is armed.' : ''}`,
                type: 'success'
            });

            setName('');
            setMessageBody('');
            setLeadsText('');
            setSelectedPsids(new Set());
            onRefresh();
        } catch (err: any) {
            console.error('Launch Error:', err);
            setStatusAlert({
                text: err.response?.data?.message || err.message || 'Failed to launch campaign through WF1.',
                type: 'error'
            });
        } finally {
            setLaunching(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '24px' }}>
            {/* Launch Form */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🚀</span> Launch Messenger Campaign (WF1)
                    </h3>
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        Meta 24h Policy Guard
                    </span>
                </div>

                {statusAlert && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        background: statusAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${statusAlert.type === 'success' ? '#10b981' : '#ef4444'}`,
                        color: statusAlert.type === 'success' ? '#34d399' : '#f87171',
                        fontSize: '0.9rem'
                    }}>
                        {statusAlert.text}
                    </div>
                )}

                <form onSubmit={handleLaunch} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Campaign Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Active Leads Outreach"
                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Message Body
                        </label>
                        <textarea
                            rows={3}
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Hi! We noticed you reached out to our page. Are you still interested in our services?"
                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Recipients Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>
                                Target Recipients
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setRecipientMode('picker')}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: recipientMode === 'picker' ? '#0284c7' : '#334155',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Active Leads ({uniqueEligiblePsids.size})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecipientMode('manual')}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: recipientMode === 'manual' ? '#0284c7' : '#334155',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Manual PSID
                                </button>
                            </div>
                        </div>

                        {recipientMode === 'picker' ? (
                            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '12px', maxHeight: '220px', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #1e293b' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                        {uniqueEligiblePsids.size === 0 ? 'No leads currently in active 24h window' : `${selectedPsids.size} of ${uniqueEligiblePsids.size} active lead(s) selected`}
                                    </span>
                                    {uniqueEligiblePsids.size > 0 && (
                                        <button
                                            type="button"
                                            onClick={selectAllEligible}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#38bdf8',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        >
                                            {isAllEligibleSelected ? 'Deselect All' : 'Select All Active'}
                                        </button>
                                    )}
                                </div>

                                {eligibleLeads.length === 0 ? (
                                    <div style={{ padding: '16px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                        No leads have messaged your page in the last 24 hours.<br />
                                        <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                                            Meta restricts marketing messages once the 24-hour window expires until the user messages back.
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {eligibleLeads.map(l => (
                                            <label
                                                key={l.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 10px',
                                                    borderRadius: '6px',
                                                    background: selectedPsids.has(l.psid) ? 'rgba(2, 132, 199, 0.15)' : '#1e293b',
                                                    border: `1px solid ${selectedPsids.has(l.psid) ? '#0284c7' : '#334155'}`,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPsids.has(l.psid)}
                                                        onChange={() => toggleLead(l.psid)}
                                                        style={{ accentColor: '#0284c7' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{l.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>PSID: {l.psid}</div>
                                                    </div>
                                                </div>
                                                <WindowTimerBadge lastMessagedAt={l.lead_last_messaged_at} followUpSentAt={l.follow_up_sent_at} compact />
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {expiredLeads.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #334155' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '6px' }}>
                                            🔒 {expiredLeads.length} lead(s) locked (24-hour window expired):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {expiredLeads.map(l => (
                                                <span
                                                    key={l.id}
                                                    style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: '#1e293b',
                                                        fontSize: '0.7rem',
                                                        color: '#64748b',
                                                        border: '1px solid #334155'
                                                    }}
                                                    title="Cannot message: 24h window closed"
                                                >
                                                    {l.name} (Expired)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                                    Format: One per line as <code>PSID, Full Name</code>. Lead must have messaged your page previously.
                                </span>
                                <textarea
                                    rows={4}
                                    value={leadsText}
                                    onChange={(e) => setLeadsText(e.target.value)}
                                    placeholder={"789123456789, John Doe\n987654321012, Sarah Connor"}
                                    style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Option A: 23-Hour Automated Follow-Up Toggle */}
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                    }}>
                        <input
                            type="checkbox"
                            id="enable-followup-toggle"
                            checked={enable23hFollowUp}
                            onChange={(e) => setEnable23hFollowUp(e.target.checked)}
                            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                        <label htmlFor="enable-followup-toggle" style={{ cursor: 'pointer', flex: 1 }}>
                            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⏰</span> Automated 23-Hour Window Reminder (WF3)
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px', lineHeight: 1.4 }}>
                                If the lead has not replied, WF3 will automatically generate & send 1 gentle reminder at the 23rd hour — right before Meta's 24-hour limit permanently closes the conversation.
                            </div>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={launching || (recipientMode === 'picker' && selectedPsids.size === 0)}
                        style={{
                            padding: '12px',
                            background: launching || (recipientMode === 'picker' && selectedPsids.size === 0) ? '#475569' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: launching || (recipientMode === 'picker' && selectedPsids.size === 0) ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        {launching ? 'Launching via WF1...' : `🚀 Launch Campaign (${recipientMode === 'picker' ? selectedPsids.size : 'Manual'} Leads)`}
                    </button>
                </form>
            </div>

            {/* Campaign History List */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '16px' }}>📋 Campaign History</h3>
                {campaigns.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                        No campaigns launched yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {campaigns.map(c => (
                            <div key={c.id} style={{ background: '#0f172a', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#fff' }}>{c.name || 'Messenger Campaign'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                        ID: {c.id.slice(0, 8)}... | {new Date(c.created_at).toLocaleDateString()}
                                    </div>
                                    {c.follow_up_delay_mins && c.follow_up_delay_mins > 0 && (
                                        <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px' }}>
                                            ⏰ 23h Follow-up Armed
                                        </div>
                                    )}
                                </div>
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: c.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: c.status === 'active' ? '#34d399' : '#60a5fa' }}>
                                    {c.status.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
