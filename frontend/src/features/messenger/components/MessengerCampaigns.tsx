// frontend/src/features/messenger/components/MessengerCampaigns.tsx
import React, { useState } from 'react';
import type { MessengerCampaign } from '../types';
import { launchCampaignWF1 } from '../api/messengerApi';

interface Props {
    userId: string;
    campaigns: MessengerCampaign[];
    onRefresh: () => void;
}

export const MessengerCampaigns: React.FC<Props> = ({ userId, campaigns, onRefresh }) => {
    const [name, setName] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [leadsText, setLeadsText] = useState('');
    const [followUpMins, setFollowUpMins] = useState(5);
    const [launching, setLaunching] = useState(false);
    const [statusAlert, setStatusAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleLaunch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageBody.trim()) {
            alert('Please write the initial campaign message.');
            return;
        }

        // Parse leads formatted as: PSID, Name OR one PSID per line
        const parsedLeads = leadsText
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
            alert('Please provide at least one lead with a valid Facebook PSID.');
            return;
        }

        setLaunching(true);
        setStatusAlert(null);

        try {
            await launchCampaignWF1({
                userId,
                campaignName: name.trim() || undefined,
                messageBody: messageBody.trim(),
                followUpDelayMins: followUpMins,
                leads: parsedLeads
            });

            setStatusAlert({
                text: `🎉 Campaign launched successfully! WF1 is dispatching messages to ${parsedLeads.length} lead(s).`,
                type: 'success'
            });

            setName('');
            setMessageBody('');
            setLeadsText('');
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Launch Form */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>🚀 Launch Messenger Campaign (WF1)</h3>

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

                <form onSubmit={handleLaunch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Campaign Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. VIP Client Outreach"
                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            First Human-Written Message Body
                        </label>
                        <textarea
                            rows={4}
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Hi! We noticed you reached out to our page. Are you still looking for assistance?"
                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                            Recipients (Real PSIDs & Names)
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                            Format: One per line as <code>PSID, Full Name</code>. Per Meta policy, leads must have messaged your page previously.
                        </span>
                        <textarea
                            rows={4}
                            value={leadsText}
                            onChange={(e) => setLeadsText(e.target.value)}
                            placeholder={"789123456789, John Doe\n987654321012, Sarah Connor"}
                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '0.85rem' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Follow-up Interval (Default: 5 mins)
                        </label>
                        <select
                            value={followUpMins}
                            onChange={(e) => setFollowUpMins(Number(e.target.value))}
                            style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', outline: 'none' }}
                        >
                            <option value={2}>2 Minutes</option>
                            <option value={5}>5 Minutes (Default WF3)</option>
                            <option value={15}>15 Minutes</option>
                            <option value={60}>1 Hour</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={launching}
                        style={{
                            padding: '12px',
                            background: launching ? '#64748b' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: launching ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {launching ? 'Launching via WF1...' : '🚀 Launch Campaign via n8n'}
                    </button>
                </form>
            </div>

            {/* Campaign History List */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '16px' }}>📋 Campaign History</h3>
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
