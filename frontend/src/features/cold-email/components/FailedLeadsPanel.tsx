// frontend/src/features/cold-email/components/FailedLeadsPanel.tsx
import React from 'react';
import type { ColdEmailLead } from '../types';

interface FailedLeadsPanelProps {
    leads: ColdEmailLead[];
}

export const FailedLeadsPanel: React.FC<FailedLeadsPanelProps> = ({ leads }) => {
    if (leads.length === 0) {
        return (
            <div className="panel-empty-state">
                No failed or bounced leads found. All delivered campaigns reached recipient inboxes successfully.
            </div>
        );
    }

    return (
        <div className="ce-table-container">
            <table className="ce-table">
                <thead>
                    <tr>
                        <th>NAME</th>
                        <th>EMAIL</th>
                        <th>COMPANY</th>
                        <th>REJECTION / BOUNCE REASON</th>
                        <th>CLASSIFIED AT</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                                {lead.name || '—'}
                            </td>
                            <td>
                                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11.5px', color: '#94a3b8' }}>
                                    {lead.email}
                                </span>
                            </td>
                            <td style={{ color: '#cbd5e1' }}>
                                {lead.company || '—'}
                            </td>
                            <td>
                                <span className="ce-status-pill failed">
                                    {lead.rejection_reason || lead.status || 'Bounced / Unreachable'}
                                </span>
                            </td>
                            <td style={{ color: '#85899d', fontSize: '11px', fontFamily: 'DM Mono, monospace' }}>
                                {lead.classified_at || lead.sent_at || '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
