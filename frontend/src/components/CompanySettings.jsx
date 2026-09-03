import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    custom_instructions: ''
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Fetch initial profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/company/profile/${encodeURIComponent(userId)}`);
        if (res.data?.success && res.data?.profile) {
          setProfile(prev => ({ ...prev, ...res.data.profile }));
        }
      } catch (err) {
        console.log('Error fetching company profile:', err);
      }
    };
    fetchProfile();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await axios.post('/api/company/profile', {
        ...profile,
        user_id: userId
      });
      if (res.data?.success) {
        setMsg('✅ Company Settings updated successfully!');
      }
    } catch (err) {
      setMsg(`❌ Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', color: '#edeae2', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
            ⚙️ Company Profile & Settings
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(237,234,226,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Store Company Profile · Business Knowledge Base
          </p>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.includes('✅') ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', border: msg.includes('✅') ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(239,68,68,0.3)', color: msg.includes('✅') ? '#4ade80' : '#ef4444', marginBottom: 20, fontSize: '0.85rem' }}>
          {msg}
        </div>
      )}

      {/* Manual Settings Form */}
      <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* General Information */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#c9a84c' }}>📋 Company Information</h3>
          
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Company Name</label>
            <input
              type="text" name="company_name" value={profile.company_name} onChange={handleChange} placeholder="e.g. Acme Financial Services"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Industry / Niche</label>
            <input
              type="text" name="industry" value={profile.industry} onChange={handleChange} placeholder="e.g. Retail Banking, Healthcare, Real Estate"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Primary Call Goal</label>
            <input
              type="text" name="primary_goal" value={profile.primary_goal} onChange={handleChange} placeholder="e.g. Inbound Customer Support & Lead Generation"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Support Email</label>
              <input
                type="email" name="support_email" value={profile.support_email} onChange={handleChange} placeholder="support@acme.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Support Phone</label>
              <input
                type="text" name="phone" value={profile.phone} onChange={handleChange} placeholder="+1 (800) 555-0199"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* AI Knowledge Base & Instructions */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#c9a84c' }}>🧠 AI Voice Knowledge Base</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Knowledge Base & FAQs (Used by Agents)</label>
            <textarea
              name="knowledge_base_notes" rows={4} value={profile.knowledge_base_notes} onChange={handleChange}
              placeholder="Enter business FAQs, policies, pricing, or refund terms..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(237,234,226,0.6)', marginBottom: 6 }}>Custom Persona & Call Directives</label>
            <textarea
              name="custom_instructions" rows={3} value={profile.custom_instructions} onChange={handleChange}
              placeholder="e.g. Always speak politely, verify caller identity, and escalate complex disputes."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <button
            type="submit" disabled={saving}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: '0.9rem'
            }}
          >
            {saving ? 'Saving Settings…' : '💾 Save Company Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;
