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

    // Progressive pagination for Campaign History: max 5 first, +5 each click
    const [visibleCampaignsCount, setVisibleCampaignsCount] = useState(5);

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
                text: `Campaign launched successfully! WF1 is dispatching messages to ${parsedLeads.length} lead(s).${enable23hFollowUp ? ' 23-hour automated follow-up (WF3) is armed.' : ''}`,
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

    const visibleCampaigns = campaigns.slice(0, visibleCampaignsCount);
    const hasMoreCampaigns = campaigns.length > visibleCampaignsCount;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.25fr) minmax(320px, 1fr)', gap: '20px' }}>
            {/* Launch Form Card */}
            <div style={{ background: '#111218', border: '1px solid #1f212d', borderRadius: '12px', padding: '22px 24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Launch Messenger Campaign (WF1)
                    </h3>
                    <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(88, 85, 214, 0.15)', color: '#a5b4fc', border: '1px solid rgba(88, 85, 214, 0.3)', fontFamily: 'DM Mono, monospace' }}>
                        META_24H_GUARD
                    </span>
                </div>

                {statusAlert && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        background: statusAlert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${statusAlert.type === 'success' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'}`,
                        color: statusAlert.type === 'success' ? '#6ee7b7' : '#fca5a5',
                        fontSize: '12px'
                    }}>
                        {statusAlert.text}
                    </div>
                )}

                <form onSubmit={handleLaunch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#85899d', marginBottom: '6px' }}>
                            Campaign Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Active Leads Outreach"
                            style={{ width: '100%', padding: '9px 12px', background: '#151620', border: '1px solid #242738', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#85899d', marginBottom: '6px' }}>
                            Message Body
                        </label>
                        <textarea
                            rows={3}
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Hi! We noticed you reached out to our page. Are you still interested in our services?"
                            style={{ width: '100%', padding: '9px 12px', background: '#151620', border: '1px solid #242738', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                    </div>

                    {/* Recipients Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#85899d' }}>
                                Target Recipients
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setRecipientMode('picker')}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        borderRadius: '6px',
                                        border: '1px solid #242738',
                                        background: recipientMode === 'picker' ? '#5855d6' : '#151620',
                                        color: recipientMode === 'picker' ? '#fff' : '#94a3b8',
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
                                        fontSize: '11px',
                                        borderRadius: '6px',
                                        border: '1px solid #242738',
                                        background: recipientMode === 'manual' ? '#5855d6' : '#151620',
                                        color: recipientMode === 'manual' ? '#fff' : '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Manual PSID
                                </button>
                            </div>
                        </div>

                        {recipientMode === 'picker' ? (
                            <div style={{ background: '#0f1017', border: '1px solid #1f212d', borderRadius: '8px', padding: '12px', maxHeight: '220px', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #191a24' }}>
                                    <span style={{ fontSize: '11px', color: '#85899d', fontFamily: 'DM Mono, monospace' }}>
                                        {uniqueEligiblePsids.size === 0 ? 'No leads currently in active 24h window' : `${selectedPsids.size} of ${uniqueEligiblePsids.size} active lead(s) selected`}
                                    </span>
                                    {uniqueEligiblePsids.size > 0 && (
                                        <button
                                            type="button"
                                            onClick={selectAllEligible}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#818cf8',
                                                fontSize: '11px',
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
                                    <div style={{ padding: '16px 8px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                        No leads have messaged your page in the last 24 hours.<br />
                                        <span style={{ fontSize: '11px', color: '#52566c' }}>
                                            Meta restricts outbound messages once the 24-hour window expires until the user messages back.
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {eligibleLeads.map(l => (
                                            <label
                                                key={l.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 10px',
                                                    borderRadius: '6px',
                                                    background: selectedPsids.has(l.psid) ? 'rgba(88, 85, 214, 0.12)' : '#151620',
                                                    border: `1px solid ${selectedPsids.has(l.psid) ? '#5855d6' : '#242738'}`,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPsids.has(l.psid)}
                                                        onChange={() => toggleLead(l.psid)}
                                                        style={{ accentColor: '#5855d6' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f8fafc' }}>{l.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#85899d', fontFamily: 'DM Mono, monospace' }}>PSID: {l.psid}</div>
                                                    </div>
                                                </div>
                                                <WindowTimerBadge lastMessagedAt={l.lead_last_messaged_at} followUpSentAt={l.follow_up_sent_at} compact />
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {expiredLeads.length > 0 && (
                                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #242738' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                                            {expiredLeads.length} lead(s) locked (24-hour window expired):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {expiredLeads.map(l => (
                                                <span
                                                    key={l.id}
                                                    style={{
                                                        padding: '2px 7px',
                                                        borderRadius: '4px',
                                                        background: '#151620',
                                                        fontSize: '10.5px',
                                                        color: '#64748b',
                                                        border: '1px solid #242738'
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
                                <span style={{ fontSize: '11px', color: '#85899d', display: 'block', marginBottom: '6px' }}>
                                    Format: One per line as <code>PSID, Full Name</code>. Lead must have messaged your page previously.
                                </span>
                                <textarea
                                    rows={4}
                                    value={leadsText}
                                    onChange={(e) => setLeadsText(e.target.value)}
                                    placeholder={"789123456789, John Doe\n987654321012, Sarah Connor"}
                                    style={{ width: '100%', padding: '9px 12px', background: '#151620', border: '1px solid #242738', borderRadius: '8px', color: '#f1f5f9', outline: 'none', fontFamily: 'DM Mono, monospace', fontSize: '12px', boxSizing: 'border-box' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Option A: 23-Hour Automated Follow-Up Toggle */}
                    <div style={{
                        background: '#0f1017',
                        border: '1px solid #1f212d',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <input
                            type="checkbox"
                            id="enable-followup-toggle"
                            checked={enable23hFollowUp}
                            onChange={(e) => setEnable23hFollowUp(e.target.checked)}
                            style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#5855d6', cursor: 'pointer' }}
                        />
                        <label htmlFor="enable-followup-toggle" style={{ cursor: 'pointer', flex: 1 }}>
                            <div style={{ color: '#f8fafc', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Automated 23-Hour Window Reminder (WF3)
                            </div>
                            <div style={{ color: '#85899d', fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>
                                If the lead has not replied, WF3 will automatically generate & send 1 gentle reminder at the 23rd hour — right before Meta's 24-hour limit permanently closes the conversation.
                            </div>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={launching || (recipientMode === 'picker' && selectedPsids.size === 0)}
                        style={{
                            height: '40px',
                            background: launching || (recipientMode === 'picker' && selectedPsids.size === 0) ? '#1f212d' : '#5855d6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: launching || (recipientMode === 'picker' && selectedPsids.size === 0) ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        {launching ? 'Launching via WF1...' : `Launch Campaign (${recipientMode === 'picker' ? selectedPsids.size : 'Manual'} Leads)`}
                    </button>
                </form>
            </div>

            {/* Campaign History List Card */}
            <div style={{ background: '#111218', border: '1px solid #1f212d', borderRadius: '12px', padding: '22px 24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        Campaign History
                    </h3>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#1c1d27', border: '1px solid #2d3040', color: '#94a3b8', fontFamily: 'DM Mono, monospace' }}>
                        SHOWING {visibleCampaigns.length} OF {campaigns.length}
                    </span>
                </div>

                {campaigns.length === 0 ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0', fontSize: '12.5px' }}>
                        No campaigns launched yet.
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {visibleCampaigns.map(c => (
                                <div key={c.id} style={{ background: '#151620', padding: '12px 14px', borderRadius: '8px', border: '1px solid #242738', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>{c.name || 'Messenger Campaign'}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'DM Mono, monospace' }}>
                                            ID: {c.id.slice(0, 8)}… · {new Date(c.created_at).toLocaleDateString()}
                                        </div>
                                        {c.follow_up_delay_mins && c.follow_up_delay_mins > 0 && (
                                            <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                23h Follow-up Armed
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', background: c.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(88, 85, 214, 0.15)', color: c.status === 'active' ? '#34d399' : '#a5b4fc', border: `1px solid ${c.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(88, 85, 214, 0.3)'}` }}>
                                        {c.status.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls: 5 first, +5 each click */}
                        {campaigns.length > 5 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1f212d' }}>
                                {hasMoreCampaigns ? (
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCampaignsCount(prev => prev + 5)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '7px 16px',
                                            background: '#151620',
                                            border: '1px solid #242738',
                                            borderRadius: '8px',
                                            color: '#f1f5f9',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                        Show More Campaigns (+5) · {campaigns.length - visibleCampaignsCount} remaining
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCampaignsCount(5)}
                                        style={{
                                            padding: '6px 14px',
                                            background: 'transparent',
                                            border: '1px solid #242738',
                                            borderRadius: '8px',
                                            color: '#85899d',
                                            fontSize: '11.5px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Show Less (Reset to 5)
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
