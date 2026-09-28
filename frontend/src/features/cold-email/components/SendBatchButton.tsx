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
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-ce-primary"
                title="Launch n8n automated cold email batch"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Launch Campaign
                {typeof pendingCount === 'number' && pendingCount > 0 && (
                    <span style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        fontSize: '11px',
                        fontFamily: 'DM Mono, monospace',
                        fontWeight: 700
                    }}>
                        {pendingCount}
                    </span>
                )}
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
