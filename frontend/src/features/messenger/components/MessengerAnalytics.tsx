// frontend/src/features/messenger/components/MessengerAnalytics.tsx
import React from 'react';
import type { MessengerLead, MessengerStats } from '../types';
import { WindowTimerBadge } from './WindowTimerBadge';

interface Props {
    leads: MessengerLead[];
    stats: MessengerStats;
}

export const MessengerAnalytics: React.FC<Props> = ({ leads, stats }) => {
    return (
        <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Messenger Leads</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{stats.total_leads}</div>
                </div>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hot Inbound</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{stats.hot_leads}</div>
                </div>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Awaiting Reply (WF3 Watch)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{stats.no_reply_leads}</div>
                </div>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Uninterested (Locked)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{stats.uninterested_leads}</div>
                </div>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sensitive Escalations</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>{stats.sensitive_leads}</div>
                </div>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Archived (Post Follow-up)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>{stats.archived_leads}</div>
                </div>
            </div>

            {/* Leads Table */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>All Discovered Messenger Leads (Real PSID Registry)</span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>
                        Meta policy: 24h window starts on customer's last inbound message
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                                <th style={{ padding: '12px 16px' }}>Name</th>
                                <th style={{ padding: '12px 16px' }}>Facebook PSID</th>
                                <th style={{ padding: '12px 16px' }}>Status</th>
                                <th style={{ padding: '12px 16px' }}>24h Messaging Window</th>
                                <th style={{ padding: '12px 16px' }}>Follow-up</th>
                                <th style={{ padding: '12px 16px' }}>Last Inbound / Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                        No leads populated yet. Have a Facebook account message your Page to populate real PSIDs via WF2!
                                    </td>
                                </tr>
                            ) : (
                                leads.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #334155' }}>
                                        <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 600 }}>{l.name}</td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8' }}>{l.psid}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background: l.lead_status === 'hot' ? 'rgba(56, 189, 248, 0.2)' 
                                                    : l.lead_status === 'uninterested' ? 'rgba(239, 68, 68, 0.2)' 
                                                    : l.lead_status === 'sensitive' ? 'rgba(220, 38, 38, 0.3)' 
                                                    : l.lead_status === 'no_reply' ? 'rgba(245, 158, 11, 0.2)' 
                                                    : 'rgba(100, 116, 139, 0.2)',
                                                color: l.lead_status === 'hot' ? '#38bdf8' 
                                                    : l.lead_status === 'uninterested' ? '#f87171' 
                                                    : l.lead_status === 'sensitive' ? '#fca5a5' 
                                                    : l.lead_status === 'no_reply' ? '#fbbf24' 
                                                    : '#94a3b8'
                                            }}>
                                                {l.lead_status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <WindowTimerBadge lastMessagedAt={l.lead_last_messaged_at} followUpSentAt={l.follow_up_sent_at} />
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                                            {l.follow_up_sent_at ? (
                                                <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>Sent (1/1)</span>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Pending (0/1)</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                                            {l.lead_last_messaged_at
                                                ? new Date(l.lead_last_messaged_at).toLocaleString()
                                                : (l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleString() : 'Never')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
