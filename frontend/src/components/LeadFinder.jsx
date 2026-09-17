import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../services/supabaseClient';

export default function LeadFinder({ user }) {
    const [keyword, setKeyword] = useState('Dental Clinic');
    const [city, setCity] = useState('Miami');
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]);
    const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
    const [filterPhoneOnly, setFilterPhoneOnly] = useState(false);
    const [filterEmailOnly, setFilterEmailOnly] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const [employeeRange, setEmployeeRange] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // --- 1. Search Leads via Live Backend Scraper ---
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!keyword.trim() || !city.trim()) {
            setStatusMsg({ text: 'Please provide both a business keyword and a city.', type: 'error' });
            return;
        }

        setLoading(true);
        setStatusMsg({ text: '🔍 Scraping real-time business directories and crawling websites for contacts...', type: 'info' });

        try {
            const res = await axios.post('/api/scraper/search', {
                keyword: keyword.trim(),
                city: city.trim(),
                employee_range: employeeRange || null,
                crawl_emails: true
            });

            if (res.data?.success) {
                setLeads(res.data.leads || []);
                setSelectedLeadIds(new Set());
                setStatusMsg({
                    text: `✅ Found ${res.data.count} live business leads in ${city}!`,
                    type: 'success'
                });
            }
        } catch (err) {
            console.error('Scraper Error:', err);
            setStatusMsg({
                text: `❌ Scraping error: ${err.response?.data?.detail || err.message}`,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Filter Leads on the fly ---
    const displayedLeads = leads.filter(l => {
        if (filterPhoneOnly && !l.phone) return false;
        if (filterEmailOnly && !l.email) return false;
        return true;
    });

    // --- 3. Selection Handlers ---
    const toggleSelect = (id) => {
        setSelectedLeadIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedLeadIds.size === displayedLeads.length) {
            setSelectedLeadIds(new Set());
        } else {
            setSelectedLeadIds(new Set(displayedLeads.map(l => l.id)));
        }
    };

    // --- 4. Import to Google Sheets (Cold Email CRM) ---
    const handleImportToSheets = async (targetLeads) => {
        if (!targetLeads || targetLeads.length === 0) return;
        setStatusMsg({ text: 'Syncing leads into your Google Sheets CRM...', type: 'info' });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await axios.post(
                '/api/scraper/import-to-sheets',
                { leads: targetLeads },
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );

            if (res.data?.success) {
                setStatusMsg({
                    text: `🎉 Successfully imported ${res.data.count} lead(s) into your Cold Email CRM as 'pending'!`,
                    type: 'success'
                });
            }
        } catch (err) {
            console.error('Import Error:', err);
            setStatusMsg({
                text: `❌ Import failed: ${err.response?.data?.detail || err.message}`,
                type: 'error'
            });
        }
    };

    // --- 5. One-Click Voice Call (Retell AI) ---
    const handleDirectCall = async (lead) => {
        if (!lead.phone) {
            setStatusMsg({ text: 'This lead has no phone number available.', type: 'error' });
            return;
        }

        setActionLoadingId(lead.id);
        setStatusMsg({ text: `📞 Initiating AI voice call to ${lead.company} (${lead.phone})...`, type: 'info' });

        try {
            const cfg = await axios.get('/api/health/config');
            const fromNumber = cfg.data?.TWILIO_PHONE_NUMBER;

            const res = await axios.post('/api/retell/create-phone-call', {
                from_number: fromNumber || '+1234567890',
                to_number: lead.phone,
            });

            if (res.data?.success || res.data?.call_id) {
                setStatusMsg({
                    text: `🎙️ Call dispatched successfully! Retell Call ID: ${res.data.call_id || 'Active'}`,
                    type: 'success'
                });
            }
        } catch (err) {
            console.error('Call Error:', err);
            setStatusMsg({
                text: `❌ Call failed: ${err.response?.data?.detail || err.message}`,
                type: 'error'
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div style={{ padding: '24px', color: '#f8fafc', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🔍</span> Real-Time B2B Lead Finder & Scraper
                </h1>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
                    Discover real registered businesses on demand, extract direct phone numbers & emails, and instantly dispatch calls or email campaigns.
                </p>
            </div>

            {/* Search Bar & Filters Card */}
            <div style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 240px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Business Niche / Category
                        </label>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="e.g. Real Estate, Dental Clinic, SaaS"
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: '#0f172a',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            Target City / Location
                        </label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Miami, Austin, Chicago"
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: '#0f172a',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ flex: '0 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                            🏢 Company Size
                        </label>
                        <select
                            value={employeeRange}
                            onChange={(e) => setEmployeeRange(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: '#0f172a',
                                border: '1px solid #475569',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">All Sizes (Any)</option>
                            <option value="1,10">1 – 10 (Small / Local)</option>
                            <option value="11,50">11 – 50 (Growing SMB)</option>
                            <option value="51,200">51 – 200 (Mid-Market)</option>
                            <option value="201,500">201 – 500 (Enterprise)</option>
                            <option value="501,10000">500+ (Corporation)</option>
                        </select>
                    </div>


                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '11px 24px',
                            background: loading ? '#64748b' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {loading ? 'Crawling...' : '🔎 Find Leads'}
                    </button>
                </form>

                {/* Quick Filters */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={filterPhoneOnly}
                            onChange={(e) => setFilterPhoneOnly(e.target.checked)}
                            style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                        />
                        📞 Has Phone Number (Ready for Calling)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={filterEmailOnly}
                            onChange={(e) => setFilterEmailOnly(e.target.checked)}
                            style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                        />
                        📧 Has Email Address (Ready for Cold Email)
                    </label>
                </div>
            </div>

            {/* Status Alert */}
            {statusMsg.text && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    background: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: `1px solid ${statusMsg.type === 'error' ? '#ef4444' : statusMsg.type === 'success' ? '#22c55e' : '#3b82f6'}`,
                    color: statusMsg.type === 'error' ? '#fca5a5' : statusMsg.type === 'success' ? '#86efac' : '#93c5fd'
                }}>
                    {statusMsg.text}
                </div>
            )}

            {/* Action Bar for Bulk Selection */}
            {displayedLeads.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        Showing <strong>{displayedLeads.length}</strong> leads {selectedLeadIds.size > 0 && `(${selectedLeadIds.size} selected)`}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => {
                                const selected = displayedLeads.filter(l => selectedLeadIds.has(l.id));
                                handleImportToSheets(selected);
                            }}
                            disabled={selectedLeadIds.size === 0}
                            style={{
                                padding: '8px 16px',
                                background: selectedLeadIds.size === 0 ? '#334155' : '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: selectedLeadIds.size === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            📧 Add Selected to Cold Email CRM
                        </button>
                    </div>
                </div>
            )}

            {/* Leads Table */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '14px 16px', width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={displayedLeads.length > 0 && selectedLeadIds.size === displayedLeads.length}
                                    onChange={toggleSelectAll}
                                    style={{ accentColor: '#3b82f6' }}
                                />
                            </th>
                            <th style={{ padding: '14px 16px' }}>Company / Business</th>
                            <th style={{ padding: '14px 16px' }}>Contact Phone (E.164)</th>
                            <th style={{ padding: '14px 16px' }}>Discovered Email</th>
                            <th style={{ padding: '14px 16px' }}>Location</th>
                            <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedLeads.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    {loading ? 'Searching live web directories...' : 'No leads discovered yet. Enter a niche and city above to start scraping!'}
                                </td>
                            </tr>
                        ) : (
                            displayedLeads.map((lead) => (
                                <tr key={lead.id} style={{ borderBottom: '1px solid #334155', transition: 'background 0.15s' }}>
                                    {/* 1. Checkbox */}
                                    <td style={{ padding: '14px 16px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedLeadIds.has(lead.id)}
                                            onChange={() => toggleSelect(lead.id)}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                    </td>

                                    {/* 2. Company with Logo, LinkedIn, Employee Count & Revenue */}
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {lead.logo_url ? (
                                                <img
                                                    src={lead.logo_url}
                                                    alt={lead.company}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                    style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain', background: '#1e293b', border: '1px solid #334155' }}
                                                />
                                            ) : (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                                                    {lead.company.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 600, color: '#fff' }}>{lead.company}</span>
                                                    {lead.linkedin_url && (
                                                        <a
                                                            href={lead.linkedin_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title="View LinkedIn Profile"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                background: '#0a66c2',
                                                                color: '#fff',
                                                                padding: '1px 5px',
                                                                borderRadius: '3px',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            in
                                                        </a>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                    {lead.website && (
                                                        <a
                                                            href={lead.website}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}
                                                        >
                                                            {lead.website.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    )}
                                                    {lead.employees && (
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>
                                                            👥 {lead.employees} team
                                                        </span>
                                                    )}
                                                    {lead.revenue && (
                                                        <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                                            💰 {lead.revenue}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 3. Phone */}
                                    <td style={{ padding: '14px 16px' }}>
                                        {lead.phone ? (
                                            <span style={{
                                                padding: '3px 8px',
                                                background: 'rgba(59, 130, 246, 0.2)',
                                                color: '#60a5fa',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontFamily: 'monospace'
                                            }}>
                                                {lead.phone}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>No phone</span>
                                        )}
                                    </td>

                                    {/* 4. Email */}
                                    <td style={{ padding: '14px 16px' }}>
                                        {lead.email ? (
                                            <span style={{
                                                padding: '3px 8px',
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                color: '#34d399',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem'
                                            }}>
                                                {lead.email}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>No email</span>
                                        )}
                                    </td>

                                    {/* 5. Location */}
                                    <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                                        {lead.city || city}
                                    </td>

                                    {/* 6. Actions */}
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {lead.phone && (
                                                <button
                                                    onClick={() => handleDirectCall(lead)}
                                                    disabled={actionLoadingId === lead.id}
                                                    title="Call with Retell AI Voice"
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#2563eb',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {actionLoadingId === lead.id ? 'Calling...' : '📞 Call'}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleImportToSheets([lead])}
                                                title="Add to Cold Email CRM"
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#059669',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📧 Add
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))

                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
