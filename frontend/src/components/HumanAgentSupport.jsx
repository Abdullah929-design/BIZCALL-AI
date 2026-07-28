import React, { useState } from 'react';

/* ── Mock Data ─────────────────────────────────────────────── */
const AGENTS = [
  { id:'AGT-001', name:'Sarah Mitchell',  role:'Senior Banking Specialist', dept:'Banking',   status:'online', calls:14, sat:96, avatar:'SM', color:'#c9a84c' },
  { id:'AGT-002', name:'James Okafor',    role:'Marketing Consultant',      dept:'Marketing', status:'busy',   calls:9,  sat:88, avatar:'JO', color:'#a78bfa' },
  { id:'AGT-003', name:'Priya Sharma',    role:'Banking Support Agent',     dept:'Banking',   status:'online', calls:11, sat:92, avatar:'PS', color:'#4ade80' },
  { id:'AGT-004', name:'Carlos Rivera',   role:'Customer Success Lead',     dept:'Marketing', status:'away',   calls:0,  sat:90, avatar:'CR', color:'#fb923c' },
  { id:'AGT-005', name:'Emily Chen',      role:'Fraud & Disputes Analyst',  dept:'Banking',   status:'online', calls:7,  sat:98, avatar:'EC', color:'#38bdf8' },
  { id:'AGT-006', name:'Hassan Al-Farid', role:'Outbound Sales Agent',      dept:'Marketing', status:'busy',   calls:12, sat:84, avatar:'HA', color:'#f472b6' },
];

const MOCK_CHATS = {
  'AGT-001': [
    { role:'system', text:'Call escalated from Banking AI — intent: loan_dispute', time:'09:22 AM' },
    { role:'customer', text:'Hi, I was told the AI couldn\'t help me with a disputed transaction.', time:'09:22 AM' },
    { role:'agent', text:'Hi! I\'m Sarah, I\'ll be happy to assist. Could you share the transaction date and amount?', time:'09:23 AM' },
    { role:'customer', text:'It was on May 2nd, £320 from a store I never visited.', time:'09:23 AM' },
    { role:'agent', text:'Thank you. I can see that transaction. I\'ve flagged it for review and you\'ll get a refund within 3–5 business days.', time:'09:25 AM' },
    { role:'customer', text:'That\'s great, thank you so much!', time:'09:25 AM' },
  ],
  'AGT-002': [
    { role:'system', text:'Call escalated from Marketing AI — intent: objection_handling', time:'09:38 AM' },
    { role:'customer', text:'I\'m not sure I need another credit card right now.', time:'09:38 AM' },
    { role:'agent', text:'I completely understand. Let me explain the zero-fee benefit for the first year — it might change things.', time:'09:39 AM' },
    { role:'customer', text:'Okay, tell me more.', time:'09:40 AM' },
  ],
  'AGT-003': [
    { role:'system', text:'Call escalated from Banking AI — intent: account_freeze', time:'09:51 AM' },
    { role:'customer', text:'My account got frozen and I can\'t access my funds.', time:'09:51 AM' },
    { role:'agent', text:'I\'m sorry to hear that. I\'ll check your account right now. Can you verify your date of birth?', time:'09:52 AM' },
  ],
};

const STATUS_META = {
  online: { color:'#4ade80', label:'Online' },
  busy:   { color:'#fbbf24', label:'Busy' },
  away:   { color:'rgba(237,234,226,0.25)', label:'Away' },
};

/* ── Satisfaction Ring (SVG) ──────────────────────────────── */
function SatRing({ pct, size = 70, stroke = 7, color = '#c9a84c' }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill="#edeae2" fontSize={13} fontWeight={600}>{pct}%</text>
    </svg>
  );
}

/* ── Main Component ──────────────────────────────────────── */
const HumanAgentSupport = () => {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [deptFilter, setDeptFilter]       = useState('all');
  const [chatInput, setChatInput]         = useState('');

  const filtered = AGENTS.filter(a => deptFilter === 'all' || a.dept.toLowerCase() === deptFilter);
  const chat     = MOCK_CHATS[selectedAgent.id] || [];

  const onlineCount = AGENTS.filter(a => a.status === 'online').length;
  const busyCount   = AGENTS.filter(a => a.status === 'busy').length;
  const avgSat      = Math.round(AGENTS.reduce((s,a) => s + a.sat, 0) / AGENTS.length);
  const totalCalls  = AGENTS.reduce((s,a) => s + a.calls, 0);

  const S = { /* shared inline style helpers */
    card: {
      background:'rgba(255,255,255,0.025)',
      border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:14, overflow:'hidden',
    },
    label: {
      fontSize:'0.63rem', fontWeight:600, letterSpacing:'0.14em',
      textTransform:'uppercase', color:'rgba(237,234,226,0.35)',
    },
  };

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px', fontFamily:"'Inter',sans-serif", fontWeight:300, color:'#edeae2' }}>

      {/* Header */}
      <div style={{ marginBottom:22 }}>
        <h1 style={{ margin:0, fontSize:'1.3rem', fontWeight:600, fontFamily:"'Cormorant Garamond',serif", letterSpacing:'0.02em' }}>
          Human Agent Support
        </h1>
        <p style={{ margin:'4px 0 0', ...S.label }}>Live Agent Desk · Escalation Management · Satisfaction Tracking</p>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Online Now',    value:onlineCount, color:'#4ade80',  icon:'🟢' },
          { label:'Busy',          value:busyCount,   color:'#fbbf24',  icon:'🟡' },
          { label:'Active Calls',  value:totalCalls,  color:'#c9a84c',  icon:'📞' },
          { label:'Avg Satisfaction', value:`${avgSat}%`, color:'#a78bfa', icon:'⭐' },
        ].map((k,i) => (
          <div key={i} style={{ ...S.card, padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:'1rem' }}>{k.icon}</span>
            </div>
            <div style={{ fontSize:'1.6rem', fontWeight:600, fontFamily:"'Cormorant Garamond',serif", color:k.color }}>{k.value}</div>
            <div style={{ ...S.label, marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Main 3-col layout */}
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr 280px', gap:14, minHeight:520 }}>

        {/* ── Agent List ── */}
        <div style={{ ...S.card, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ ...S.label, marginBottom:10 }}>Live Agents</div>
            <div style={{ display:'flex', gap:5 }}>
              {['all','banking','marketing'].map(f => (
                <button key={f} onClick={() => setDeptFilter(f)} style={{
                  flex:1, padding:'4px 0', borderRadius:8, fontSize:'0.62rem', fontWeight:500,
                  letterSpacing:'0.04em', textTransform:'capitalize', cursor:'pointer', fontFamily:'inherit',
                  background: deptFilter===f ? 'rgba(201,168,76,0.1)' : 'transparent',
                  border: deptFilter===f ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.07)',
                  color: deptFilter===f ? '#c9a84c' : 'rgba(237,234,226,0.35)',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'8px 8px' }}>
            {filtered.map(agent => {
              const sm = STATUS_META[agent.status];
              const active = selectedAgent.id === agent.id;
              return (
                <button key={agent.id} onClick={() => setSelectedAgent(agent)} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 10px',
                  borderRadius:10, marginBottom:4, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                  border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                  transition:'all 0.15s',
                }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{
                      width:36, height:36, borderRadius:10,
                      background:`linear-gradient(135deg,${agent.color}33,${agent.color}11)`,
                      border:`1px solid ${agent.color}44`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'0.7rem', fontWeight:600, color:agent.color,
                    }}>{agent.avatar}</div>
                    <span style={{
                      position:'absolute', bottom:-2, right:-2,
                      width:9, height:9, borderRadius:'50%',
                      background:sm.color, border:'2px solid #0d1117',
                    }}/>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:500, color: active ? '#e0c068' : '#edeae2', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize:'0.63rem', color:'rgba(237,234,226,0.35)', marginTop:1 }}>
                      {sm.label} · {agent.calls} calls
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat Section ── */}
        <div style={{ ...S.card, display:'flex', flexDirection:'column' }}>
          {/* Chat header */}
          <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:`linear-gradient(135deg,${selectedAgent.color}33,${selectedAgent.color}11)`,
              border:`1px solid ${selectedAgent.color}44`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.72rem', fontWeight:600, color:selectedAgent.color,
            }}>{selectedAgent.avatar}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.85rem', fontWeight:500 }}>{selectedAgent.name}</div>
              <div style={{ fontSize:'0.65rem', color:'rgba(237,234,226,0.4)' }}>{selectedAgent.role} · {selectedAgent.id}</div>
            </div>
            <div style={{
              padding:'4px 12px', borderRadius:20, fontSize:'0.65rem', fontWeight:500,
              background: STATUS_META[selectedAgent.status].color === '#4ade80' ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.08)',
              border:`1px solid ${Status_META_border(selectedAgent.status)}`,
              color: STATUS_META[selectedAgent.status].color,
            }}>{STATUS_META[selectedAgent.status].label}</div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
            {chat.map((msg, i) => {
              if (msg.role === 'system') return (
                <div key={i} style={{ textAlign:'center', fontSize:'0.67rem', color:'rgba(237,234,226,0.3)', padding:'4px 12px', background:'rgba(255,255,255,0.03)', borderRadius:20, border:'1px solid rgba(255,255,255,0.06)', alignSelf:'center' }}>
                  ⚡ {msg.text} · {msg.time}
                </div>
              );
              const isAgent = msg.role === 'agent';
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: isAgent ? 'flex-start' : 'flex-end', gap:3 }}>
                  <div style={{ fontSize:'0.6rem', color:'rgba(237,234,226,0.28)', paddingLeft:4 }}>
                    {isAgent ? selectedAgent.name.split(' ')[0] : 'Customer'} · {msg.time}
                  </div>
                  <div style={{
                    maxWidth:'78%', padding:'10px 14px', borderRadius:12, fontSize:'0.82rem', lineHeight:1.65, fontWeight:300,
                    background: isAgent ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.05)',
                    border: isAgent ? '1px solid rgba(201,168,76,0.18)' : '1px solid rgba(255,255,255,0.08)',
                    borderBottomLeftRadius: isAgent ? 4 : 12,
                    borderBottomRightRadius: isAgent ? 12 : 4,
                    color: isAgent ? '#e0c068' : '#ccc9c1',
                  }}>{msg.text}</div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Type a message (UI demo only)…"
              style={{
                flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
                borderRadius:10, padding:'10px 14px', color:'#edeae2', fontFamily:'inherit',
                fontSize:'0.83rem', fontWeight:300, outline:'none',
              }}/>
            <button style={{
              padding:'10px 20px', borderRadius:10, background:'linear-gradient(135deg,#c9a84c,#a8882e)',
              border:'none', color:'#080c12', fontFamily:'inherit', fontSize:'0.75rem',
              fontWeight:600, cursor:'pointer', letterSpacing:'0.06em',
            }}>Send</button>
          </div>
        </div>

        {/* ── Agent Profile Panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Profile card */}
          <div style={{ ...S.card, padding:'20px 18px' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center' }}>
              <div style={{
                width:64, height:64, borderRadius:16,
                background:`linear-gradient(135deg,${selectedAgent.color},${selectedAgent.color}88)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1.4rem', fontWeight:700, color:'#080c12',
                boxShadow:`0 4px 20px ${selectedAgent.color}33`,
              }}>{selectedAgent.avatar}</div>
              <div>
                <div style={{ fontSize:'1rem', fontWeight:600 }}>{selectedAgent.name}</div>
                <div style={{ fontSize:'0.71rem', color:'rgba(237,234,226,0.45)', marginTop:3 }}>{selectedAgent.role}</div>
                <div style={{ fontSize:'0.65rem', color:'rgba(237,234,226,0.3)', marginTop:2 }}>{selectedAgent.id}</div>
              </div>
              <span style={{
                padding:'4px 14px', borderRadius:20, fontSize:'0.68rem',
                background:`${selectedAgent.dept === 'Banking' ? 'rgba(99,179,237' : 'rgba(167,139,250'},0.08)`,
                border:`1px solid ${selectedAgent.dept === 'Banking' ? 'rgba(99,179,237' : 'rgba(167,139,250'},0.2)`,
                color: selectedAgent.dept === 'Banking' ? '#7ec8e3' : '#c4b5fd',
              }}>{selectedAgent.dept}</span>
            </div>

            {/* Stats */}
            <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { label:'Active Calls',      value: selectedAgent.calls },
                { label:'Queue Position',    value: selectedAgent.status === 'busy' ? '2nd' : '—' },
                { label:'Avg Handle Time',   value:'4m 38s' },
                { label:'Escalations Today', value: Math.floor(selectedAgent.calls * 0.3) },
              ].map((s,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color:'rgba(237,234,226,0.45)' }}>{s.label}</span>
                  <span style={{ fontWeight:500 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Satisfaction */}
          <div style={{ ...S.card, padding:'18px 18px' }}>
            <div style={{ ...S.label, marginBottom:14 }}>Satisfaction Score</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <SatRing pct={selectedAgent.sat} color={selectedAgent.sat >= 90 ? '#4ade80' : selectedAgent.sat >= 75 ? '#fbbf24' : '#f87171'} />
              <div style={{ flex:1 }}>
                {[
                  { label:'😊 Positive', pct: selectedAgent.sat },
                  { label:'😐 Neutral',  pct: Math.round((100-selectedAgent.sat)*0.6) },
                  { label:'😞 Negative', pct: Math.round((100-selectedAgent.sat)*0.4) },
                ].map((s,i) => (
                  <div key={i} style={{ marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.67rem', color:'rgba(237,234,226,0.45)', marginBottom:2 }}>
                      <span>{s.label}</span><span>{s.pct}%</span>
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${s.pct}%`, borderRadius:2, background: i===0?'#4ade80':i===1?'#fbbf24':'#f87171' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ ...S.card, padding:'16px 16px' }}>
            <div style={{ ...S.label, marginBottom:12 }}>Quick Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                { label:'📋 View Full History', color:'rgba(201,168,76,0.1)', border:'rgba(201,168,76,0.2)', text:'#c9a84c' },
                { label:'🔄 Transfer Call',     color:'rgba(99,179,237,0.08)',  border:'rgba(99,179,237,0.2)',  text:'#7ec8e3' },
                { label:'⏸ Set Away',           color:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.08)',text:'rgba(237,234,226,0.5)' },
              ].map((a,i) => (
                <button key={i} style={{
                  width:'100%', padding:'9px 14px', borderRadius:9, fontSize:'0.74rem',
                  background:a.color, border:`1px solid ${a.border}`, color:a.text,
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s',
                }}>{a.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height:24 }} />
    </div>
  );
};

/* helper — avoids undefined reference in JSX expression */
function Status_META_border(status) {
  return status === 'online' ? 'rgba(74,222,128,0.25)' : status === 'busy' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)';
}

export default HumanAgentSupport;
