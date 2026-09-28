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
            <div className="msg-kpi-grid">
                <div className="msg-kpi-box">
                    <div className="msg-kpi-label">Total Leads</div>
                    <div className="msg-kpi-value">{stats.total_leads}</div>
                </div>
                <div className="msg-kpi-box">
                    <div className="msg-kpi-label">Hot Inbound</div>
                    <div className="msg-kpi-value" style={{ color: '#38bdf8' }}>{stats.hot_leads}</div>
                </div>
                <div className="msg-kpi-box">
                    <div className="msg-kpi-label">Awaiting Reply (WF3)</div>
                    <div className="msg-kpi-value" style={{ color: '#f59e0b' }}>{stats.no_reply_leads}</div>
                </div>
                <div className="msg-kpi-box">
                    <div className="msg-kpi-label">Uninterested (Locked)</div>
                    <div className="msg-kpi-value" style={{ color: '#ef4444' }}>{stats.uninterested_leads}</div>
                </div>
                <div className="msg-kpi-box">
                    <div className="msg-kpi-label">Sensitive Escalations</div>
                    <div className="msg-kpi-value" style={{ color: '#f87171' }}>{stats.sensitive_leads}</div>
                </div>
                <div className="msg-kpi-box">
                    <div className="msg-kpi-label">Archived</div>
                    <div className="msg-kpi-value" style={{ color: '#85899d' }}>{stats.archived_leads}</div>
                </div>
            </div>

            {/* Leads Table */}
            <div style={{ background: '#111218', border: '1px solid #1f212d', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1f212d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc' }}>
                        All Discovered Messenger Leads (PSID Registry)
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Meta policy: 24h window active upon customer's last inbound message
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#13141d', color: '#64748b', borderBottom: '1px solid #1f212d', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.06em' }}>
                                <th style={{ padding: '10px 14px' }}>NAME</th>
                                <th style={{ padding: '10px 14px' }}>FACEBOOK PSID</th>
                                <th style={{ padding: '10px 14px' }}>STATUS</th>
                                <th style={{ padding: '10px 14px' }}>24H MESSAGING WINDOW</th>
                                <th style={{ padding: '10px 14px' }}>FOLLOW-UP</th>
                                <th style={{ padding: '10px 14px' }}>LAST INBOUND / CONTACT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                                        No leads populated yet. Have a Facebook account message your Page to populate real PSIDs via WF2!
                                    </td>
                                </tr>
                            ) : (
                                leads.map(l => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #191a24' }}>
                                        <td style={{ padding: '11px 14px', color: '#f8fafc', fontWeight: 600 }}>{l.name}</td>
                                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', color: '#818cf8', fontSize: '11.5px' }}>{l.psid}</td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <span style={{
                                                padding: '2px 7px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                letterSpacing: '0.04em',
                                                background: l.lead_status === 'hot' ? 'rgba(56, 189, 248, 0.15)' 
                                                    : l.lead_status === 'uninterested' ? 'rgba(239, 68, 68, 0.15)' 
                                                    : l.lead_status === 'sensitive' ? 'rgba(220, 38, 38, 0.2)' 
                                                    : l.lead_status === 'no_reply' ? 'rgba(245, 158, 11, 0.15)' 
                                                    : '#1c1d27',
                                                color: l.lead_status === 'hot' ? '#38bdf8' 
                                                    : l.lead_status === 'uninterested' ? '#f87171' 
                                                    : l.lead_status === 'sensitive' ? '#fca5a5' 
                                                    : l.lead_status === 'no_reply' ? '#fbbf24' 
                                                    : '#94a3b8'
                                            }}>
                                                {l.lead_status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 14px' }}>
                                            <WindowTimerBadge lastMessagedAt={l.lead_last_messaged_at} followUpSentAt={l.follow_up_sent_at} />
                                        </td>
                                        <td style={{ padding: '11px 14px', color: '#cbd5e1' }}>
                                            {l.follow_up_sent_at ? (
                                                <span style={{ color: '#fbbf24', fontSize: '11px' }}>Sent (1/1)</span>
                                            ) : (
                                                <span style={{ color: '#64748b', fontSize: '11px' }}>None</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '11px 14px', color: '#85899d', fontSize: '11px', fontFamily: 'DM Mono, monospace' }}>
                                            {l.lead_last_messaged_at ? new Date(l.lead_last_messaged_at).toLocaleString() : '—'}
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
