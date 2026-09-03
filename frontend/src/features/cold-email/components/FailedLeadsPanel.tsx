// frontend/src/features/cold-email/components/FailedLeadsPanel.tsx
import React from 'react';
import type { ColdEmailLead } from '../types';

interface FailedLeadsPanelProps {
    leads: ColdEmailLead[];
}

export const FailedLeadsPanel: React.FC<FailedLeadsPanelProps> = ({ leads }) => {
    if (leads.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(237,234,226,0.4)', fontSize: '0.85rem' }}>
                No failed or bounced leads found.
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(237,234,226,0.5)' }}>
                        <th style={{ padding: '14px 16px' }}>Name</th>
                        <th style={{ padding: '14px 16px' }}>Email</th>
                        <th style={{ padding: '14px 16px' }}>Company</th>
                        <th style={{ padding: '14px 16px' }}>Rejection / Bounce Reason</th>
                        <th style={{ padding: '14px 16px' }}>Classified At</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead, idx) => (
                        <tr
                            key={idx}
                            style={{
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                            }}
                        >
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                                {lead.name || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                                {lead.email}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                                {lead.company || '—'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                    padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500,
                                    background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)'
                                }}>
                                    {lead.rejection_reason || lead.status || 'Bounced / Unreachable'}
                                </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                {lead.classified_at || lead.sent_at || '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
