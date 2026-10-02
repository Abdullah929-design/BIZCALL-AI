import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../services/supabaseClient';
import './LeadFinder.css';

export default function LeadFinder({ user, onInitiateOutboundCall }) {
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
  const [visibleCount, setVisibleCount] = useState(10);

  // --- 1. Search Leads via Live Backend Scraper ---
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      setStatusMsg({ text: 'Please provide both a business keyword and a city.', type: 'error' });
      return;
    }

    setLoading(true);
    setStatusMsg({ text: 'Scraping real-time business directories and crawling websites for contacts...', type: 'info' });

    try {
      const res = await axios.post('/api/scraper/search', {
        keyword: keyword.trim(),
        city: city.trim(),
        employee_range: employeeRange || null,
        crawl_emails: true,
      });

      if (res.data?.success) {
        setLeads(res.data.leads || []);
        setSelectedLeadIds(new Set());
        setVisibleCount(10);
        setStatusMsg({
          text: `Found ${res.data.count} live business leads in ${city}.`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Scraper Error:', err);
      setStatusMsg({
        text: `Scraping error: ${err.response?.data?.detail || err.message}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Filter Leads on the fly ---
  const displayedLeads = leads.filter((l) => {
    if (filterPhoneOnly && !l.phone) return false;
    if (filterEmailOnly && !l.email) return false;
    return true;
  });

  const pagedLeads = displayedLeads.slice(0, visibleCount);
  const hasMoreLeads = displayedLeads.length > visibleCount;

  // --- 3. Selection Handlers ---
  const toggleSelect = (id) => {
    setSelectedLeadIds((prev) => {
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
      setSelectedLeadIds(new Set(displayedLeads.map((l) => l.id)));
    }
  };

  // --- 4. Import to Google Sheets (Cold Email CRM) ---
  const handleImportToSheets = async (targetLeads) => {
    if (!targetLeads || targetLeads.length === 0) return;
    setStatusMsg({ text: 'Syncing leads into your Cold Email CRM...', type: 'info' });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await axios.post(
        '/api/scraper/import-to-sheets',
        { leads: targetLeads },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setStatusMsg({
          text: `Successfully imported ${res.data.count} lead(s) into Cold Email CRM as 'pending'.`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Import Error:', err);
      setStatusMsg({
        text: `Import failed: ${err.response?.data?.detail || err.message}`,
        type: 'error',
      });
    }
  };

  // --- 5. One-Click Voice Call: Navigates to Outbound Dialer with Pre-filled Lead Info ---
  const handleInitiateCallFromScraper = (lead) => {
    if (!lead.phone) {
      setStatusMsg({ text: 'This lead has no phone number available to call.', type: 'error' });
      return;
    }

    if (onInitiateOutboundCall) {
      onInitiateOutboundCall({
        toNumber: lead.phone,
        companyName: lead.company,
        dynamicVariables: {
          customer_name: lead.company || 'Business Owner',
          company_name: lead.company || '',
          city: lead.city || city || '',
          website: lead.website || '',
          employee_count: lead.employees || '',
          niche_category: keyword || '',
        }
      });
    } else {
      setStatusMsg({ text: `Selected lead: ${lead.company} (${lead.phone}). Open Retell Live Calls to dial.`, type: 'info' });
    }
  };

  // --- 6. Export to CSV ---
  const exportToCSV = () => {
    if (displayedLeads.length === 0) return;
    const headers = ['Company', 'Website', 'Phone', 'Email', 'City', 'Employees', 'Revenue'];
    const rows = displayedLeads.map((l) => [
      `"${(l.company || '').replace(/"/g, '""')}"`,
      `"${(l.website || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.city || city || '').replace(/"/g, '""')}"`,
      `"${(l.employees || '').replace(/"/g, '""')}"`,
      `"${(l.revenue || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_${keyword.replace(/\s+/g, '_')}_${city}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="lead-finder-page">
      {/* Search Header & Filter Controls Card */}
      <div className="finder-card">
        <div className="finder-card-header">
          <div>
            <h3 className="finder-card-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Real-Time B2B Lead Finder & Scraper
            </h3>
            <p className="finder-card-desc">
              Discover verified business entities on demand, extract direct phone lines & emails, and instantly dispatch AI calls or CRM campaigns.
            </p>
          </div>
          <span className="finder-badge-count">{leads.length} LEADS DISCOVERED</span>
        </div>

        <form onSubmit={handleSearch} className="finder-search-grid">
          <div className="finder-form-group">
            <div className="finder-label-row">
              <label className="finder-label">BUSINESS NICHE / KEYWORD</label>
              <span className="finder-label-tag">TARGET_INDUSTRY</span>
            </div>
            <input
              type="text"
              className="finder-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Dental Clinic, Real Estate, Logistics"
              required
            />
          </div>

          <div className="finder-form-group">
            <div className="finder-label-row">
              <label className="finder-label">CITY / REGION</label>
              <span className="finder-label-tag">GEO_LOC</span>
            </div>
            <input
              type="text"
              className="finder-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Miami, Austin, Chicago"
              required
            />
          </div>

          <div className="finder-form-group">
            <div className="finder-label-row">
              <label className="finder-label">COMPANY SIZE</label>
              <span className="finder-label-tag">HEADCOUNT</span>
            </div>
            <select
              className="finder-select"
              value={employeeRange}
              onChange={(e) => setEmployeeRange(e.target.value)}
            >
              <option value="">All Sizes (Any)</option>
              <option value="1,10">1 – 10 (Local Boutique)</option>
              <option value="11,50">11 – 50 (Growing SMB)</option>
              <option value="51,200">51 – 200 (Mid-Market)</option>
              <option value="201,500">201 – 500 (Enterprise)</option>
              <option value="501,10000">500+ (Corporation)</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="finder-search-btn">
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Crawling Directories...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Find Leads
              </>
            )}
          </button>
        </form>

        {/* Quick Filter Chips */}
        <div className="finder-filters-row">
          <label className={`finder-filter-chip ${filterPhoneOnly ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={filterPhoneOnly}
              onChange={(e) => setFilterPhoneOnly(e.target.checked)}
            />
            <span className="finder-filter-check">
              {filterPhoneOnly && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            Has Phone Number (Telephony Ready)
          </label>

          <label className={`finder-filter-chip ${filterEmailOnly ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={filterEmailOnly}
              onChange={(e) => setFilterEmailOnly(e.target.checked)}
            />
            <span className="finder-filter-check">
              {filterEmailOnly && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Has Email Address (Cold Email Ready)
          </label>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg.text && (
        <div className={`finder-status-banner ${statusMsg.type}`}>
          {statusMsg.type === 'error' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ) : statusMsg.type === 'success' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Results Card */}
      <div className="finder-card">
        {/* Bulk Action Toolbar */}
        <div className="finder-toolbar">
          <div className="finder-toolbar-left">
            <span>
              SHOWING <strong>{displayedLeads.length}</strong> LEADS
            </span>
            {selectedLeadIds.size > 0 && (
              <span className="finder-badge-count" style={{ color: '#c7d2fe', borderColor: '#5855d6' }}>
                {selectedLeadIds.size} SELECTED
              </span>
            )}
          </div>

          <div className="finder-toolbar-right">
            <button
              type="button"
              className="btn-export-csv"
              onClick={exportToCSV}
              disabled={displayedLeads.length === 0}
              title="Export discovered leads to CSV"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export CSV
            </button>

            <button
              type="button"
              className="btn-crm-sync"
              onClick={() => {
                const selected = displayedLeads.filter((l) => selectedLeadIds.has(l.id));
                handleImportToSheets(selected);
              }}
              disabled={selectedLeadIds.size === 0}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              Add Selected ({selectedLeadIds.size}) to CRM
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="finder-table-container">
          <table className="finder-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="finder-checkbox"
                    checked={displayedLeads.length > 0 && selectedLeadIds.size === displayedLeads.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>COMPANY / BUSINESS</th>
                <th>PHONE (E.164)</th>
                <th>DISCOVERED EMAIL</th>
                <th>LOCATION</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="finder-empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"></path>
                      </svg>
                      <div className="finder-empty-title">
                        {loading ? 'Crawling live business registries...' : 'No leads discovered yet'}
                      </div>
                      <p className="finder-empty-desc">
                        {loading
                          ? 'Extracting contact profiles, verifying MX records and parsing phone numbers.'
                          : 'Enter your target business niche and city in the search bar above to crawl verified B2B leads in real time.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedLeads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  return (
                    <tr key={lead.id} className={isSelected ? 'row-selected' : ''}>
                      {/* 1. Selection Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="finder-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </td>

                      {/* 2. Company Info with Logo / LinkedIn / Team Size / Revenue */}
                      <td>
                        <div className="company-cell">
                          {lead.logo_url ? (
                            <img
                              src={lead.logo_url}
                              alt={lead.company}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                              className="company-logo"
                            />
                          ) : (
                            <div className="company-avatar-fallback">
                              {(lead.company || 'C').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="company-info">
                            <div className="company-name-row">
                              <span className="company-name" title={lead.company}>
                                {lead.company}
                              </span>
                              {lead.linkedin_url && (
                                <a
                                  href={lead.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="View LinkedIn Profile"
                                  className="badge-linkedin"
                                >
                                  in
                                </a>
                              )}
                            </div>

                            <div className="company-meta-row">
                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="company-website-link"
                                >
                                  <span>{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                  </svg>
                                </a>
                              )}
                              {lead.employees && (
                                <span className="pill-team">
                                  {lead.employees} team
                                </span>
                              )}
                              {lead.revenue && (
                                <span className="pill-rev">
                                  {lead.revenue}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Phone */}
                      <td>
                        {lead.phone ? (
                          <span className="contact-mono-pill phone">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            {lead.phone}
                          </span>
                        ) : (
                          <span className="contact-empty">No phone</span>
                        )}
                      </td>

                      {/* 4. Email */}
                      <td>
                        {lead.email ? (
                          <span className="contact-mono-pill email">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            {lead.email}
                          </span>
                        ) : (
                          <span className="contact-empty">No email</span>
                        )}
                      </td>

                      {/* 5. Location */}
                      <td>
                        <span className="location-tag">
                          {lead.city || city}
                        </span>
                      </td>

                      {/* 6. Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions-group">
                          {lead.phone && (
                            <button
                              type="button"
                              onClick={() => handleInitiateCallFromScraper(lead)}
                              title="Open in Retell Outbound Dialer to customize and call"
                              className="btn-row-action call"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                              </svg>
                              Call
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleImportToSheets([lead])}
                            title="Add lead to Cold Email CRM"
                            className="btn-row-action crm"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            CRM
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Progressive Show More Controls */}
        {displayedLeads.length > 0 && (
          <div className="finder-show-more-row">
            {hasMoreLeads ? (
              <button
                type="button"
                className="finder-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 10)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                Show More Leads ({displayedLeads.length - visibleCount} remaining)
              </button>
            ) : (
              displayedLeads.length > 10 && (
                <button
                  type="button"
                  className="finder-less-btn"
                  onClick={() => setVisibleCount(10)}
                >
                  Show Less (Reset to 10)
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
