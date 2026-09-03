// frontend/src/features/cold-email/components/SendBatchButton.tsx
import React, { useState } from 'react';
import { sendBatch } from '../api/coldEmailApi';

interface SendBatchButtonProps {
    onBatchStarted?: () => void;
}

export const SendBatchButton: React.FC<SendBatchButtonProps> = ({ onBatchStarted }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleSendBatch = async () => {
        setLoading(true);
        setMessage(null);
        try {
            await sendBatch();
            setMessage({ text: '🚀 Batch send started successfully in n8n!', type: 'success' });
            if (onBatchStarted) onBatchStarted();
        } catch (err: any) {
            setMessage({ text: `❌ ${err.message || 'Error starting batch'}`, type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <button
                onClick={handleSendBatch}
                disabled={loading}
                style={{
                    padding: '10px 20px',
                    background: loading ? 'rgba(99, 102, 241, 0.5)' : '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                }}
            >
                {loading ? '⏳ Triggering Batch...' : '📤 Send Pending Batch'}
            </button>

            {message && (
                <span style={{
                    fontSize: '0.85rem',
                    color: message.type === 'success' ? '#4ade80' : '#ef4444',
                    background: message.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: message.type === 'success' ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(239,68,68,0.2)'
                }}>
                    {message.text}
                </span>
            )}
        </div>
    );
};
