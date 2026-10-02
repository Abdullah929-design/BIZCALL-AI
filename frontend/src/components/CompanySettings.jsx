import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './CompanySettings.css';

const CrystalShard = ({ position = 'top-left' }) => (
  <div className={`stitch-corner-crystal ${position}`} aria-hidden="true">
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
      <path d="M4 4 L 42 12 L 28 38 L 8 42 Z" fill="url(#crystGrad1)" opacity="0.45" />
      <path d="M4 4 L 28 18 L 12 36 Z" fill="url(#crystGrad2)" opacity="0.65" />
      <path d="M28 18 L 42 12 L 32 34 Z" fill="url(#crystGrad3)" opacity="0.8" />
      <path d="M4 4 L 42 12 L 32 34 L 12 36 Z" stroke="rgba(186, 230, 253, 0.9)" strokeWidth="1.2" />
      <defs>
        <linearGradient id="crystGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="crystGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="crystGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const CompanySettings = ({ user }) => {
  const userId = user?.id || user?.email || 'default_user';
  const bgVideoRef = useRef(null);

  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.play().catch(() => { });
    }
  }, []);

  const [profile, setProfile] = useState({
    user_id: userId,
    company_name: '',
    industry: '',
    target_audience: '',
    primary_goal: '',
    support_email: user?.email || '',
    phone: '',
    website: '',
    business_hours: '9:00 AM - 6:00 PM EST',
    knowledge_base_notes: '',
    custom_instructions: '',
    subdomain: '',
    inbox_email: ''
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch initial profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/company/profile/${encodeURIComponent(userId)}`);
        if (res.data?.success && res.data?.profile) {
          setProfile((prev) => ({ ...prev, ...res.data.profile }));
        }
      } catch (err) {
        console.log('Error fetching company profile:', err);
      }
    };
    fetchProfile();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await axios.post('/api/company/profile', {
        ...profile,
        user_id: userId
      });
      if (res.data?.success) {
        setMsg({ text: 'Company Profile & Directives updated successfully.', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: `Failed to save settings: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agent-builder-page-wrapper company-settings-page-wrapper">
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
          className="builder-bg-video"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          frameBorder="0"
          title="Background Video"
        />
      </video>
      <div className="builder-bg-overlay" />

      <div className="company-settings-page">
        {/* ── Top Header ── */}
        <div className="settings-header">
          <div className="settings-title-group">
            <h1 className="settings-title">

              Company Profile & Settings
            </h1>
            <p className="settings-subtitle">
              Enterprise Profile · DNS Subdomain Isolation · AI Knowledge Base Store
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-header-save"
          >
            {saving ? (
              'Saving…'
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>

        {/* ── Status Alert Banner ── */}
        {msg.text && (
          <div className={`settings-status-banner ${msg.type}`}>
            {msg.type === 'success' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* ── Dedicated Multi-Tenant Subdomain & Inbox Card ── */}
        <div className="isolation-card">
          <div className="isolation-left">
            <div className="isolation-title-row">
              <span className="isolation-title">

                Dedicated Subdomain & Private Inbox
              </span>
              <span className="isolation-badge">LIVE DNS ISOLATION</span>
            </div>

          </div>

          <div className="isolation-pills-row">
            <div className="isolation-pill-box">
              <span className="isolation-pill-label">Subdomain URL</span>
              <div className="isolation-pill-value">
                <span>https://{profile.subdomain || '...bizcallai.online'}</span>
                <button
                  type="button"
                  className="btn-copy-tag"
                  title="Copy Subdomain URL"
                  onClick={() => handleCopy(`https://${profile.subdomain || 'bizcallai.online'}`, 'subdomain')}
                >
                  {copiedKey === 'subdomain' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="isolation-pill-box">
              <span className="isolation-pill-label">Private Inbox</span>
              <div className="isolation-pill-value">
                <span style={{ color: '#a78bfa' }}>{profile.inbox_email || 'inbox@...bizcallai.online'}</span>
                <button
                  type="button"
                  className="btn-copy-tag"
                  title="Copy Private Inbox"
                  onClick={() => handleCopy(profile.inbox_email || '', 'inbox')}
                >
                  {copiedKey === 'inbox' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Settings Form Grid ── */}
        <form onSubmit={handleSaveProfile} className="settings-grid">
          {/* Card 1: Company Profile Information */}
          <div className="settings-card">
            <CrystalShard position="top-left" />
            <CrystalShard position="top-right" />
            <div className="settings-card-header centered">
              <h3 className="settings-card-title centered">

                Company Information
              </h3>

            </div>

            <div className="settings-form-group">
              <div className="settings-label-row">
                <label className="settings-label">COMPANY NAME</label>
              </div>
              <input
                type="text"
                name="company_name"
                className="settings-input"
                value={profile.company_name}
                onChange={handleChange}
                placeholder="e.g. Acme Financial Services"
              />
            </div>

            <div className="settings-two-col">
              <div className="settings-form-group">
                <div className="settings-label-row">
                  <label className="settings-label">INDUSTRY / NICHE</label>
                </div>
                <input
                  type="text"
                  name="industry"
                  className="settings-input"
                  value={profile.industry}
                  onChange={handleChange}
                  placeholder="e.g. Retail Banking, Real Estate"
                />
              </div>

              <div className="settings-form-group">
                <div className="settings-label-row">
                  <label className="settings-label">WEBSITE URL</label>
                </div>
                <input
                  type="url"
                  name="website"
                  className="settings-input"
                  value={profile.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="settings-form-group">
              <div className="settings-label-row">
                <label className="settings-label">PRIMARY CALL GOAL</label>
              </div>
              <input
                type="text"
                name="primary_goal"
                className="settings-input"
                value={profile.primary_goal}
                onChange={handleChange}
                placeholder="e.g. Inbound Customer Support & Lead Qualification"
              />
            </div>

            <div className="settings-two-col">
              <div className="settings-form-group">
                <div className="settings-label-row">
                  <label className="settings-label">SUPPORT EMAIL</label>
                </div>
                <input
                  type="email"
                  name="support_email"
                  className="settings-input"
                  value={profile.support_email}
                  onChange={handleChange}
                  placeholder="support@acme.com"
                />
              </div>

              <div className="settings-form-group">
                <div className="settings-label-row">
                  <label className="settings-label">SUPPORT PHONE</label>
                </div>
                <input
                  type="text"
                  name="phone"
                  className="settings-input"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="+1 (800) 555-0199"
                />
              </div>
            </div>

            <div className="settings-form-group">
              <div className="settings-label-row">
                <label className="settings-label">BUSINESS OPERATING HOURS</label>
              </div>
              <input
                type="text"
                name="business_hours"
                className="settings-input"
                value={profile.business_hours}
                onChange={handleChange}
                placeholder="9:00 AM - 6:00 PM EST"
              />
            </div>
          </div>

          {/* Card 2: AI Voice Knowledge Base & Directives */}
          <div className="settings-card">
            <CrystalShard position="top-left" />
            <CrystalShard position="top-right" />
            <div className="settings-card-header centered">
              <h3 className="settings-card-title centered">
                AI Voice Knowledge Base & Directives
              </h3>
            </div>

            <div className="settings-form-group">
              <div className="settings-label-row">
                <label className="settings-label">KNOWLEDGE BASE & FAQS</label>

              </div>
              <textarea
                name="knowledge_base_notes"
                rows={5}
                className="settings-textarea"
                value={profile.knowledge_base_notes}
                onChange={handleChange}
                placeholder="Enter business FAQs, service offerings, return/refund policies, pricing tiers, and SLA terms for your voice agents..."
              />
            </div>

            <div className="settings-form-group">
              <div className="settings-label-row">
                <label className="settings-label">CUSTOM PERSONA & CALL DIRECTIVES</label>

              </div>
              <textarea
                name="custom_instructions"
                rows={4}
                className="settings-textarea"
                value={profile.custom_instructions}
                onChange={handleChange}
                placeholder="e.g. Always speak politely, verify caller identity, and escalate complex disputes with empathy..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-save-settings"
            >
              {saving ? (
                'Saving Settings…'
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Save Company Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySettings;
