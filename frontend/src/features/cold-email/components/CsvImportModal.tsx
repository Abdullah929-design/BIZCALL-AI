// frontend/src/features/cold-email/components/CsvImportModal.tsx
import React, { useState } from 'react';
import { uploadBulkCsv } from '../api/coldEmailApi';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a valid .csv file.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
      setSuccessMsg('');
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "first_name,last_name,email,company,title,industry,notes,status\n" +
      "Alex,Morgan,alex.morgan@growthcorp.com,GrowthCorp,Head of Growth,SaaS,Series B company,pending\n" +
      "Elena,Rostova,elena@retailpulse.io,RetailPulse,Founder,E-commerce,Interested in AI outbound,pending\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leads_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await uploadBulkCsv(file);
      setSuccessMsg(`🎉 ${res.message || `Successfully imported ${res.count} leads!`}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '26px 30px', maxWidth: 580, width: '100%', color: '#edeae2', fontFamily: "'Inter', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 8 }}>
            📥 Bulk Import Leads via CSV
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Format Requirement Notice */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 18, fontSize: '0.82rem', lineHeight: '1.5'
        }}>
          <strong style={{ color: '#818cf8', display: 'block', marginBottom: 4 }}>
            ⚠️ Strict CSV Format Requirement:
          </strong>
          Your CSV columns must exactly match the Leads sheet fields:
          <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6, margin: '8px 0', color: '#4ade80', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            first_name, last_name, email, company, title, industry, notes, status
          </code>
          The system will strictly attach your tenant <code style={{ color: '#818cf8' }}>user_id</code> to every imported row.
        </div>

        {/* Download Template Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Need the exact template format?</span>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, color: '#edeae2', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500
            }}
          >
            📄 Download Sample CSV
          </button>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', marginBottom: 14, fontSize: '0.82rem' }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.12)', color: '#4ade80', marginBottom: 14, fontSize: '0.82rem' }}>
            {successMsg}
          </div>
        )}

        {/* File Drop / Select Area */}
        <form onSubmit={handleUpload}>
          <div style={{
            border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: '24px 20px',
            textAlign: 'center', background: 'rgba(0,0,0,0.2)', marginBottom: 18
          }}>
            <input
              type="file"
              id="csvFileInput"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="csvFileInput" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>📊</div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem', marginBottom: 4 }}>
                {file ? file.name : 'Click to select or drop your .csv file here'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard UTF-8 encoded .csv files'}
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              style={{
                padding: '9px 24px',
                background: !file || uploading ? 'rgba(99, 102, 241, 0.4)' : '#6366f1',
                color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: !file || uploading ? 'not-allowed' : 'pointer'
              }}
            >
              {uploading ? '⏳ Importing to Sheets...' : '🚀 Import Leads'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
