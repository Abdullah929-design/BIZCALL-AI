import React, { useState } from 'react';
import axios from 'axios';

const OnboardingSplash = ({ user, onComplete }) => {
    const userId = user?.id || user?.email || 'default_user';

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

    // 1. Validation checks
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
            setErrorMsg(`❌ Onboarding failed: ${err.response?.data?.detail || err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'radial-gradient(circle at top right, #11111d, #09090b)',
            padding: '40px 20px',
            overflowY: 'auto',
            color: '#edeae2',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 24,
                padding: '30px 32px',
                maxWidth: 680,
                width: '100%',
                margin: '20px 0',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: '#fff' }}>
                        🚀 Complete Your Company Onboarding
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(237,234,226,0.6)' }}>
                        Please fill in your business and voice agent details to activate your account.
                    </p>
                </div>

                {errorMsg && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: 16, fontSize: '0.85rem'
                    }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Section 1: General Info */}
                    <div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🏢 General Information
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Company Name *</label>
                                <input
                                    type="text" name="company_name" value={profile.company_name} onChange={handleChange} placeholder="Acme Corp" required
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Industry / Niche *</label>
                                <input
                                    type="text" name="industry" value={profile.industry} onChange={handleChange} placeholder="Retail Banking" required
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Contact Info */}
                    <div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📞 Contact Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Support Email *</label>
                                <input
                                    type="email" name="support_email" value={profile.support_email} onChange={handleChange} placeholder="support@acme.com" required
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', color: '#fff',
                                        border: profile.support_email && !isEmailValid(profile.support_email) ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Support Phone *</label>
                                <input
                                    type="text" name="phone" value={profile.phone} onChange={handleChange} placeholder="+1 (800) 555-0199" required
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Website URL *</label>
                                <input
                                    type="text" name="website" value={profile.website} onChange={handleChange} placeholder="https://acme.com" required
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', color: '#fff',
                                        border: profile.website && !isWebsiteValid(profile.website) ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Business Hours *</label>
                                <input
                                    type="text" name="business_hours" value={profile.business_hours} onChange={handleChange} placeholder="9:00 AM - 5:00 PM EST" required
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Voice Assistant Configuration */}
                    <div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🧠 Voice KB Configuration
                        </h3>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Primary Call Goal *</label>
                            <input
                                type="text" name="primary_goal" value={profile.primary_goal} onChange={handleChange} placeholder="Automate Inbound Support & Outbound Sales" required
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Knowledge Base & FAQs (Used by AI Agents) *</label>
                            <textarea
                                name="knowledge_base_notes" rows={2} value={profile.knowledge_base_notes} onChange={handleChange}
                                placeholder="List key product prices, packages, support SLAs, and business rules..." required
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Custom Persona & Call Directives *</label>
                            <textarea
                                name="custom_instructions" rows={2} value={profile.custom_instructions} onChange={handleChange}
                                placeholder="Be professional, verify billing PIN, escalate disputes to human agents..." required
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit" disabled={!isFormComplete() || submitting}
                        style={{
                            padding: '14px', borderRadius: 10, border: 'none', cursor: isFormComplete() ? 'pointer' : 'not-allowed',
                            background: isFormComplete() ? '#6366f1' : 'rgba(255,255,255,0.06)',
                            color: isFormComplete() ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontWeight: 600, fontSize: '1rem', marginTop: 10, transition: 'all 0.2s ease'
                        }}
                    >
                        {submitting ? 'Saving Configuration...' : '🚀 Complete Onboarding & Enter'}
                    </button>
                </form>
            </div>

            {/* Subdomain & Private Inbox Notification Modal */}
            {showSubdomainModal && assignedSubdomain && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: 20
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #181828, #0e0e17)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: 24,
                        padding: '36px 32px',
                        maxWidth: 580,
                        width: '100%',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.2)',
                        textAlign: 'center',
                        color: '#edeae2',
                        position: 'relative'
                    }}>
                        {/* Header Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            padding: '6px 16px',
                            borderRadius: 999,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginBottom: 18,
                            letterSpacing: '0.04em'
                        }}>
                            ✨ FREE DEDICATED SUBDOMAIN ASSIGNED
                        </div>

                        <h2 style={{
                            margin: '0 0 10px',
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: '#fff',
                            fontFamily: "'Cormorant Garamond', serif"
                        }}>
                            Welcome aboard, {assignedSubdomain.company_name}!
                        </h2>

                        <p style={{
                            margin: '0 0 24px',
                            fontSize: '0.88rem',
                            color: 'rgba(237, 234, 226, 0.75)',
                            lineHeight: 1.5
                        }}>
                            Your isolated tenant environment and private inbox have been provisioned. The primary domain (<strong style={{ color: '#c9a84c' }}>{assignedSubdomain.root_domain}</strong>) remains reserved for platform governance.
                        </p>

                        {/* Subdomain & Inbox Details Card */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.45)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 16,
                            padding: '20px',
                            textAlign: 'left',
                            marginBottom: 26,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14
                        }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#818cf8', fontWeight: 600, marginBottom: 5 }}>
                                    🌐 Your Dedicated Subdomain
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.95rem',
                                    color: '#67e8f9'
                                }}>
                                    <span>https://{assignedSubdomain.subdomain}</span>
                                    <span style={{ fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: 6 }}>
                                        LIVE DNS
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#818cf8', fontWeight: 600, marginBottom: 5 }}>
                                    📫 Private Inbox Address
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.95rem',
                                    color: '#a78bfa'
                                }}>
                                    <span>{assignedSubdomain.inbox_email}</span>
                                    <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 6 }}>
                                        ISOLATED
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                fontSize: '0.78rem',
                                color: 'rgba(237, 234, 226, 0.65)',
                                background: 'rgba(255, 255, 255, 0.02)',
                                padding: '10px 12px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <span>🛡️</span>
                                <span>All outbound campaigns and prospect replies operate strictly through this private inbox.</span>
                            </div>
                        </div>

                        {/* Launch Button */}
                        <button
                            onClick={() => {
                                setShowSubdomainModal(false);
                                onComplete();
                            }}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🚀 Launch Dashboard & Start Campaigns →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingSplash;
