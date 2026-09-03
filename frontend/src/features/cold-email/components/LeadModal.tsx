// frontend/src/features/cold-email/components/LeadModal.tsx
import React, { useState, useEffect } from 'react';
import type { ColdEmailLead } from '../types';
import { createLead, updateLead } from '../api/coldEmailApi';

interface LeadModalProps {
  lead: ColdEmailLead | null; // null means adding a new lead
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ lead, isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lead) {
      setName(lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim());
      setEmail(lead.email || '');
      setCompany(lead.company || '');
      setTitle(lead.title || '');
      setIndustry(lead.industry || '');
      setStatus(lead.status || 'pending');
      setNotes(lead.notes || '');
    } else {
      setName('');
      setEmail('');
      setCompany('');
      setTitle('');
      setIndustry('');
      setStatus('pending');
      setNotes('');
    }
    setError('');
  }, [lead, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const payload: Partial<ColdEmailLead> & { row_number?: number } = {
        row_number: lead?._row_number,
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        title: title.trim(),
        industry: industry.trim(),
        status: status.trim() || 'pending',
        notes: notes.trim()
      };

      if (lead && lead._row_number) {
        // Update existing lead row
        await updateLead(lead._row_number, payload);
      } else {
        // Add new lead row
        await createLead(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead to Google Sheets');
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!lead;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '24px 28px', maxWidth: 540, width: '100%', color: '#edeae2', fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: isEdit ? '#818cf8' : '#4ade80' }}>
            {isEdit ? '✏️ Edit Lead' : '➕ Add New Lead'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#94a3b8' }}>
          {isEdit ? `Updating lead on row #${lead?._row_number} in Google Sheets` : 'Appends directly to your Google Sheet Leads tab with your account user ID.'}
        </p>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', marginBottom: 14, fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Full Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Email Address *</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="lead@company.com"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Company</label>
              <input
                type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company Ltd"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Title / Role</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. VP of Sales"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Industry</label>
              <input
                type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS / E-commerce"
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Status</label>
              <select
                value={status} onChange={e => setStatus(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
              >
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="hot">Hot</option>
                <option value="neutral">Neutral</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>Notes</label>
            <textarea
              rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional research or prospect notes..."
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 6, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                padding: '8px 20px',
                background: isEdit ? '#6366f1' : '#4ade80',
                color: isEdit ? '#fff' : '#09090b',
                border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {saving ? 'Saving to Sheets...' : isEdit ? '💾 Update Lead' : '➕ Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
