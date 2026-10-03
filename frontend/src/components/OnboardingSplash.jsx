import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './OnboardingSplash.css';

// Modern SVG Icons (No raw emojis)
const BuildingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <line x1="9" y1="22" x2="9" y2="22.01"/>
        <line x1="15" y1="22" x2="15" y2="22.01"/>
        <line x1="9" y1="6" x2="9" y2="6.01"/>
        <line x1="15" y1="6" x2="15" y2="6.01"/>
        <line x1="9" y1="10" x2="9" y2="10.01"/>
        <line x1="15" y1="10" x2="15" y2="10.01"/>
        <line x1="9" y1="14" x2="9" y2="14.01"/>
        <line x1="15" y1="14" x2="15" y2="14.01"/>
        <line x1="9" y1="18" x2="9" y2="18.01"/>
        <line x1="15" y1="18" x2="15" y2="18.01"/>
    </svg>
);

const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
);

const BrainIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/>
    </svg>
);

const RocketIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
);

const SparkleIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
);

const GlobeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
);

const MailIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
    </svg>
);

const ShieldCheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
    </svg>
);

const AlertCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
    </svg>
);

const OnboardingSplash = ({ user, onComplete }) => {
    const userId = user?.id || user?.email || 'default_user';
    const bgVideoRef = useRef(null);

    useEffect(() => {
        if (bgVideoRef.current) {
            bgVideoRef.current.play().catch(() => {});
        }
    }, []);

    const [profile, setProfile] = useState({
        user_id: userId,
        company_name: 'Acme Corp',
        industry: 'Retail Banking & Services',
        primary_goal: 'Automate Inbound Support & Outbound Sales',
        support_email: user?.email || '',
        phone: '+1 (800) 555-0199',
        website: 'https://acme.com',
        business_hours: '9:00 AM - 6:00 PM EST',
        knowledge_base_notes: 'We provide 24/7 AI call center support and automated lead follow-ups.',
        custom_instructions: 'Be professional, polite, and helpful at all times.'
    });

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [assignedSubdomain, setAssignedSubdomain] = useState(null);
    const [showSubdomainModal, setShowSubdomainModal] = useState(false);

    // Validation checks
    const isEmailValid = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const isWebsiteValid = (url) => {
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(url);
    };

    const isFormComplete = () => {
        return (
            profile.company_name.trim() !== '' &&
            profile.industry.trim() !== '' &&
            profile.primary_goal.trim() !== '' &&
            isEmailValid(profile.support_email) &&
            profile.phone.trim() !== '' &&
            isWebsiteValid(profile.website) &&
            profile.business_hours.trim() !== '' &&
            profile.knowledge_base_notes.trim() !== '' &&
            profile.custom_instructions.trim() !== ''
        );
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormComplete()) return;

        setSubmitting(true);
        setErrorMsg('');

        try {
            const res = await axios.post('/api/company/profile', {
                ...profile,
                user_id: userId
            });

            if (res.data?.success) {
                const cleanSlug = profile.company_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client';
                const sub = res.data?.subdomain || `${cleanSlug}.bizcallai.online`;
                const inbox = res.data?.inbox_email || `inbox@${sub}`;
                setAssignedSubdomain({
                    subdomain: sub,
                    inbox_email: inbox,
                    company_name: profile.company_name,
                    root_domain: res.data?.root_domain || 'bizcallai.online'
                });
                setShowSubdomainModal(true);
            }
        } catch (err) {
            setErrorMsg(`Onboarding failed: ${err.response?.data?.detail || err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="agent-builder-page-wrapper onboarding-page-wrapper">
            {/* Levitating Crystal Video Background */}
            <video
                ref={bgVideoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="builder-bg-video"
                src="https://res.cloudinary.com/dv7fu8gwf/video/upload/Crystal_levitating_up_and_down_20260928230831_dyw0df.mp4"
            >
                <iframe
                    src="https://player.cloudinary.com/embed/?cloud_name=dv7fu8gwf&public_id=Crystal_levitating_up_and_down_20260928230831_dyw0df"
                    className="builder-bg-video builder-bg-iframe"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    frameBorder={0}
                    title="Background Video"
                />
            </video>
            <div className="builder-bg-overlay" />

            <div className="onboarding-container">
                <div className="onboarding-card">
                    {/* Header */}
                    <div className="onboarding-header">
                        <div className="onboarding-badge">
                            <RocketIcon />
                            <span>Initial Workspace Setup</span>
                        </div>
                        <h1 className="onboarding-title">
                            Complete Your Company Onboarding
                        </h1>
                        <p className="onboarding-subtitle">
                            Provide your company profile and AI assistant knowledge base to configure your autonomous workspace.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="onboarding-error-box">
                            <AlertCircleIcon />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="onboarding-form">
                        {/* Section 1: General Info */}
                        <div className="onboarding-section">
                            <h3 className="onboarding-section-title">
                                <BuildingIcon /> General Information
                            </h3>
                            <div className="onboarding-input-grid">
                                <div className="onboarding-field">
                                    <label className="onboarding-label">Company Name *</label>
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={profile.company_name}
                                        onChange={handleChange}
                                        placeholder="Acme Corp"
                                        required
                                        className="onboarding-input"
                                    />
                                </div>
                                <div className="onboarding-field">
                                    <label className="onboarding-label">Industry / Niche *</label>
                                    <input
                                        type="text"
                                        name="industry"
                                        value={profile.industry}
                                        onChange={handleChange}
                                        placeholder="Retail Banking & Services"
                                        required
                                        className="onboarding-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Contact Info */}
                        <div className="onboarding-section">
                            <h3 className="onboarding-section-title">
                                <PhoneIcon /> Contact Details
                            </h3>
                            <div className="onboarding-input-grid">
                                <div className="onboarding-field">
                                    <label className="onboarding-label">Support Email *</label>
                                    <input
                                        type="email"
                                        name="support_email"
                                        value={profile.support_email}
                                        onChange={handleChange}
                                        placeholder="support@acme.com"
                                        required
                                        className="onboarding-input"
                                        style={{
                                            borderColor: profile.support_email && !isEmailValid(profile.support_email) ? '#ef4444' : undefined
                                        }}
                                    />
                                </div>
                                <div className="onboarding-field">
                                    <label className="onboarding-label">Support Phone *</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={profile.phone}
                                        onChange={handleChange}
                                        placeholder="+1 (800) 555-0199"
                                        required
                                        className="onboarding-input"
                                    />
                                </div>
                            </div>
                            <div className="onboarding-input-grid">
                                <div className="onboarding-field">
                                    <label className="onboarding-label">Website URL *</label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={profile.website}
                                        onChange={handleChange}
                                        placeholder="https://acme.com"
                                        required
                                        className="onboarding-input"
                                        style={{
                                            borderColor: profile.website && !isWebsiteValid(profile.website) ? '#ef4444' : undefined
                                        }}
                                    />
                                </div>
                                <div className="onboarding-field">
                                    <label className="onboarding-label">Business Hours *</label>
                                    <input
                                        type="text"
                                        name="business_hours"
                                        value={profile.business_hours}
                                        onChange={handleChange}
                                        placeholder="9:00 AM - 6:00 PM EST"
                                        required
                                        className="onboarding-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Voice Assistant Configuration */}
                        <div className="onboarding-section">
                            <h3 className="onboarding-section-title">
                                <BrainIcon /> Voice Knowledge Base Configuration
                            </h3>
                            <div className="onboarding-field">
                                <label className="onboarding-label">Primary Call Goal *</label>
                                <input
                                    type="text"
                                    name="primary_goal"
                                    value={profile.primary_goal}
                                    onChange={handleChange}
                                    placeholder="Automate Inbound Support & Outbound Sales"
                                    required
                                    className="onboarding-input"
                                />
                            </div>
                            <div className="onboarding-field">
                                <label className="onboarding-label">Knowledge Base & FAQs (Used by AI Voice & Reply Engines) *</label>
                                <textarea
                                    name="knowledge_base_notes"
                                    rows={2}
                                    value={profile.knowledge_base_notes}
                                    onChange={handleChange}
                                    placeholder="List key product prices, packages, support SLAs, and business rules..."
                                    required
                                    className="onboarding-textarea"
                                />
                            </div>
                            <div className="onboarding-field">
                                <label className="onboarding-label">Custom Persona & Call Directives *</label>
                                <textarea
                                    name="custom_instructions"
                                    rows={2}
                                    value={profile.custom_instructions}
                                    onChange={handleChange}
                                    placeholder="Be professional, verify billing PIN, escalate disputes to human agents..."
                                    required
                                    className="onboarding-textarea"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!isFormComplete() || submitting}
                            className={`btn-onboarding-submit ${isFormComplete() && !submitting ? 'active' : ''}`}
                        >
                            {submitting ? (
                                <>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '14px',
                                        height: '14px',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    <span>Saving Configuration...</span>
                                </>
                            ) : (
                                <>
                                    <RocketIcon />
                                    <span>Complete Onboarding & Enter</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Subdomain & Private Inbox Success Modal */}
            {showSubdomainModal && assignedSubdomain && (
                <div className="domain-success-overlay">
                    <div className="domain-success-card">
                        {/* Header Badge */}
                        <div className="domain-success-badge">
                            <SparkleIcon />
                            <span>FREE DEDICATED SUBDOMAIN ASSIGNED</span>
                        </div>

                        <h2 className="domain-success-title">
                            Welcome aboard, {assignedSubdomain.company_name}!
                        </h2>

                        <p className="domain-success-desc">
                            Your isolated tenant environment and private inbox have been provisioned. The primary domain (<strong style={{ color: '#c9a84c' }}>{assignedSubdomain.root_domain}</strong>) remains reserved for platform governance.
                        </p>

                        {/* Subdomain & Inbox Details Card */}
                        <div className="domain-success-details">
                            <div className="domain-detail-item">
                                <div className="domain-detail-label">
                                    <GlobeIcon />
                                    <span>Your Dedicated Subdomain</span>
                                </div>
                                <div className="domain-detail-value-box">
                                    <span style={{ color: '#67e8f9' }}>https://{assignedSubdomain.subdomain}</span>
                                    <span className="domain-detail-pill" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>
                                        LIVE DNS
                                    </span>
                                </div>
                            </div>

                            <div className="domain-detail-item">
                                <div className="domain-detail-label">
                                    <MailIcon />
                                    <span>Private Inbox Address</span>
                                </div>
                                <div className="domain-detail-value-box">
                                    <span style={{ color: '#a78bfa' }}>{assignedSubdomain.inbox_email}</span>
                                    <span className="domain-detail-pill" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
                                        ISOLATED
                                    </span>
                                </div>
                            </div>

                            <div className="domain-security-note">
                                <ShieldCheckIcon />
                                <span>All outbound campaigns and prospect replies operate strictly through this private inbox.</span>
                            </div>
                        </div>

                        {/* Launch Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowSubdomainModal(false);
                                onComplete();
                            }}
                            className="btn-domain-launch"
                        >
                            <span>Launch Dashboard & Start Campaigns</span>
                            <ArrowRightIcon />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingSplash;
