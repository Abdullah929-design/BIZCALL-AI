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
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(237,234,226,0.4)', fontSize: '0.85rem' }}>
                No leads found in this queue.
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
                        <th style={{ padding: '14px 16px' }}>Status</th>
                        <th style={{ padding: '14px 16px' }}>Sent At</th>
                        <th style={{ padding: '14px 16px' }}>Replied At</th>
                        {leads.some(l => l.reply_content) && <th style={{ padding: '14px 16px' }}>Latest Reply</th>}
                        {(showReplyButton || showControls) && <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>}
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
                                    background: lead.status?.toLowerCase().includes('hot') ? 'rgba(74,222,128,0.15)' :
                                        lead.status?.toLowerCase().includes('failed') ? 'rgba(239,68,68,0.15)' :
                                            lead.status?.toLowerCase().includes('sent') ? 'rgba(99,102,241,0.15)' :
                                                'rgba(255,255,255,0.05)',
                                    color: lead.status?.toLowerCase().includes('hot') ? '#4ade80' :
                                        lead.status?.toLowerCase().includes('failed') ? '#ef4444' :
                                            lead.status?.toLowerCase().includes('sent') ? '#818cf8' :
                                                '#cbd5e1'
                                }}>
                                    {lead.status || 'Pending'}
                                </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                {lead.sent_at || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                {lead.replied_at || '—'}
                            </td>
                            {leads.some(l => l.reply_content) && (
                                <td style={{ padding: '12px 16px', color: '#e2e8f0', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {lead.reply_content || '—'}
                                </td>
                            )}
                            {(showReplyButton || showControls) && (
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                                        {showControls && onEdit && (
                                            <button
                                                onClick={() => onEdit(lead)}
                                                title="Edit Lead"
                                                style={{
                                                    padding: '5px 10px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
                                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer'
                                                }}
                                            >
                                                ✏️ Edit
                                            </button>
                                        )}
                                        {showControls && onDelete && (
                                            <button
                                                onClick={() => onDelete(lead)}
                                                title="Delete Lead"
                                                style={{
                                                    padding: '5px 10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                        {showReplyButton && onReply && (
                                            <button
                                                onClick={() => onReply(lead)}
                                                style={{
                                                    padding: '6px 14px', background: '#6366f1', color: '#fff',
                                                    border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                Reply
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
