// frontend/src/features/cold-email/components/SendBatchButton.tsx
import React, { useState } from 'react';
import { MassCampaignModal } from './MassCampaignModal';

interface SendBatchButtonProps {
    onBatchStarted?: () => void;
    pendingCount?: number;
}

export const SendBatchButton: React.FC<SendBatchButtonProps> = ({ onBatchStarted, pendingCount }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                style={{
                    padding: '10px 18px',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
                }}
            >
                🚀 Launch Campaign
            </button>

            <MassCampaignModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onBatchStarted={onBatchStarted}
                pendingCount={pendingCount}
            />
        </>
    );
};
