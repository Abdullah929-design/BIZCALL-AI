// frontend/src/features/cold-email/components/MassCampaignModal.tsx
import React, { useState } from 'react';
import { sendBatch } from '../api/coldEmailApi';

interface MassCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchStarted?: () => void;
  pendingCount?: number;
}

export const MassCampaignModal: React.FC<MassCampaignModalProps> = ({
  isOpen,
  onClose,
  onBatchStarted,
  pendingCount
}) => {
  const [useCustomContent, setUseCustomContent] = useState(true);
  const [subject, setSubject] = useState('Quick question regarding {{company}}');
  const [message, setMessage] = useState(
    'Hi {{first_name}},\n\nI came across {{company}} and was really impressed by what your team is building. We help companies like yours scale with automated voice and email outreach.\n\nWould you be open to a quick 5-minute chat this week?\n\nBest regards,'
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useCustomContent && (!subject.trim() || !message.trim())) {
      setError('Please provide both a subject line and email body.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const payload = useCustomContent
        ? { subject: subject.trim(), message: message.trim() }
        : undefined;

      await sendBatch(payload);
      setSuccess(true);
      if (onBatchStarted) onBatchStarted();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to start mass campaign');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        padding: '26px 30px', maxWidth: 640, width: '100%', color: '#edeae2', fontFamily: "'Inter', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 8 }}>
            🚀 Launch Mass Campaign
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
          {pendingCount !== undefined
            ? `This will dispatch outbound emails to your ${pendingCount} pending lead(s) via n8n & Brevo.`
            : 'This will dispatch outbound emails to all pending leads in your queue via n8n & Brevo.'}
        </p>

        {/* Custom Content Toggle */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', display: 'block' }}>
              Customize Subject & Message Content
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {useCustomContent ? 'Custom content will be applied to all pending leads' : 'Using default AI template configured in n8n'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={useCustomContent}
            onChange={e => setUseCustomContent(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', marginBottom: 14, fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.12)', color: '#4ade80', marginBottom: 14, fontSize: '0.82rem' }}>
            🎉 Mass campaign successfully triggered! Outbound dispatch in progress...
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {useCustomContent && (
            <>
              {/* Subject */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6 }}>
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Quick question regarding {{company}}"
                  required
                  style={{
                    width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Message Body */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Email Body / Message</label>
                  <span style={{ fontSize: '0.72rem', color: '#818cf8' }}>
                    Tags: <code style={{ color: '#4ade80' }}>{'{{first_name}}'}</code>, <code style={{ color: '#4ade80' }}>{'{{company}}'}</code>, <code style={{ color: '#4ade80' }}>{'{{title}}'}</code>
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your cold email copy here..."
                  required
                  style={{
                    width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff',
                    fontSize: '0.85rem', lineHeight: '1.5', fontFamily: 'inherit'
                  }}
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              style={{
                padding: '10px 24px',
                background: sending ? 'rgba(99, 102, 241, 0.4)' : '#6366f1',
                color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer', fontSize: '0.88rem'
              }}
            >
              {sending ? '⏳ Triggering Campaign...' : '🚀 Launch Mass Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
