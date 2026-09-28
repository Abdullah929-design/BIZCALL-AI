import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CompanySettings.css';

const CompanySettings = ({ user }) => {
  const userId = user?.id || user?.email || 'default_user';

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
    <div className="company-settings-page">
      {/* ── Top Header ── */}
      <div className="settings-header">
        <div className="settings-title-group">
          <h1 className="settings-title">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              Dedicated Subdomain & Private Inbox
            </span>
            <span className="isolation-badge">LIVE DNS ISOLATION</span>
          </div>
          <p className="isolation-desc">
            Your company workspace is routed under <strong>{profile.subdomain || 'tenant.bizcallai.online'}</strong>. Root domain (<strong>bizcallai.online</strong>) is reserved for infrastructure administration.
          </p>
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
          <div className="settings-card-header">
            <h3 className="settings-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <line x1="9" y1="22" x2="9" y2="22.01"></line>
                <line x1="15" y1="22" x2="15" y2="22.01"></line>
                <line x1="12" y1="18" x2="12" y2="18.01"></line>
                <line x1="8" y1="6" x2="8" y2="6.01"></line>
                <line x1="16" y1="6" x2="16" y2="6.01"></line>
                <line x1="8" y1="10" x2="8" y2="10.01"></line>
                <line x1="16" y1="10" x2="16" y2="10.01"></line>
                <line x1="8" y1="14" x2="8" y2="14.01"></line>
                <line x1="16" y1="14" x2="16" y2="14.01"></line>
              </svg>
              Company Information
            </h3>
            <span className="settings-tag">PROFILE_V1</span>
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
          <div className="settings-card-header">
            <h3 className="settings-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.1 5 7.4V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.6c3-1.3 5-4.1 5-7.4a8 8 0 0 0-8-8z"></path>
                <line x1="9.5" y1="9" x2="9.51" y2="9"></line>
                <line x1="14.5" y1="9" x2="14.51" y2="9"></line>
              </svg>
              AI Voice Knowledge Base & Directives
            </h3>
            <span className="settings-tag">LLM_STORE</span>
          </div>

          <div className="settings-form-group">
            <div className="settings-label-row">
              <label className="settings-label">KNOWLEDGE BASE & FAQS</label>
              <span className="settings-tag">RAG_CONTEXT</span>
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
              <span className="settings-tag">SYSTEM_PROMPT</span>
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
  );
};

export default CompanySettings;
