// frontend/src/features/cold-email/components/LeadsTable.tsx
import React from 'react';
import type { ColdEmailLead } from '../types';

interface LeadsTableProps {
    leads: ColdEmailLead[];
    onReply?: (lead: ColdEmailLead) => void;
    onEdit?: (lead: ColdEmailLead) => void;
    onDelete?: (lead: ColdEmailLead) => void;
    showReplyButton?: boolean;
    showControls?: boolean;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
    leads,
    onReply,
    onEdit,
    onDelete,
    showReplyButton = false,
    showControls = false
}) => {
    if (leads.length === 0) {
        return (
            <div className="panel-empty-state">
                No leads found in this queue.
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
                        <th>STATUS</th>
                        <th>SENT AT</th>
                        <th>REPLIED AT</th>
                        {leads.some(l => l.reply_content) && <th>LATEST REPLY</th>}
                        {(showReplyButton || showControls) && <th style={{ textAlign: 'right' }}>ACTIONS</th>}
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead, idx) => {
                        const statusLower = (lead.status || '').toLowerCase();
                        const statusClass = statusLower.includes('hot')
                            ? 'hot'
                            : statusLower.includes('failed')
                            ? 'failed'
                            : statusLower.includes('sent')
                            ? 'sent'
                            : 'pending';

                        return (
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
                                    <span className={`ce-status-pill ${statusClass}`}>
                                        {lead.status || 'Pending'}
                                    </span>
                                </td>
                                <td style={{ color: '#85899d', fontSize: '11px', fontFamily: 'DM Mono, monospace' }}>
                                    {lead.sent_at || '—'}
                                </td>
                                <td style={{ color: '#85899d', fontSize: '11px', fontFamily: 'DM Mono, monospace' }}>
                                    {lead.replied_at || '—'}
                                </td>
                                {leads.some(l => l.reply_content) && (
                                    <td style={{ color: '#cbd5e1', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {lead.reply_content || '—'}
                                    </td>
                                )}
                                {(showReplyButton || showControls) && (
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                                            {showControls && onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(lead)}
                                                    title="Edit Lead"
                                                    className="btn-table-edit"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                    Edit
                                                </button>
                                            )}
                                            {showControls && onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(lead)}
                                                    title="Delete Lead"
                                                    className="btn-table-del"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            )}
                                            {showReplyButton && onReply && (
                                                <button
                                                    type="button"
                                                    onClick={() => onReply(lead)}
                                                    className="btn-ce-primary"
                                                    style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                                                >
                                                    Reply
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
