import React, { useState } from 'react';

/* ─── Mock Data ─────────────────────────────────────────────── */
const KPI_CARDS = [
  { label: 'Total Calls',        value: '2,847',  delta: '+12.4%', up: true,  icon: '📞', color: '#c9a84c' },
  { label: 'Avg Sentiment',      value: '68.2%',  delta: '+3.1%',  up: true,  icon: '💬', color: '#4ade80' },
  { label: 'Banking Escalations',value: '23.1%',  delta: '-2.3%',  up: false, icon: '🏦', color: '#f87171' },
  { label: 'Marketing Escalations',value:'31.4%', delta: '+1.8%',  up: false, icon: '📢', color: '#fb923c' },
];

const SENTIMENT_DATA = { positive: 68, negative: 32 };

const ESCALATION_BREAKDOWN = [
  { label: 'Banking – Low Confidence Intent',    count: 187, pct: 38, color: '#c9a84c' },
  { label: 'Banking – Complex Multi-Intent',      count: 143, pct: 29, color: '#fb923c' },
  { label: 'Marketing – No Relevant Context',     count: 104, pct: 21, color: '#f87171' },
  { label: 'Marketing – Customer Request',        count: 61,  pct: 12, color: '#a78bfa' },
];

const CALL_LOGS = [
  { id:'#C-4821', type:'Banking',   duration:'3m 12s', sentiment:'Positive', score:82, intent:'card_blocked',         escalated:false, agent:'AI',    time:'09:41 AM' },
  { id:'#C-4820', type:'Marketing', duration:'5m 47s', sentiment:'Negative', score:24, intent:'product_inquiry',      escalated:true,  agent:'Human', time:'09:38 AM' },
  { id:'#C-4819', type:'Banking',   duration:'1m 55s', sentiment:'Positive', score:91, intent:'balance_enquiry',      escalated:false, agent:'AI',    time:'09:31 AM' },
  { id:'#C-4818', type:'Banking',   duration:'7m 03s', sentiment:'Negative', score:18, intent:'loan_dispute',         escalated:true,  agent:'Human', time:'09:22 AM' },
  { id:'#C-4817', type:'Marketing', duration:'4m 29s', sentiment:'Positive', score:76, intent:'product_upsell',       escalated:false, agent:'AI',    time:'09:17 AM' },
  { id:'#C-4816', type:'Banking',   duration:'2m 11s', sentiment:'Positive', score:88, intent:'account_opening',      escalated:false, agent:'AI',    time:'08:59 AM' },
  { id:'#C-4815', type:'Marketing', duration:'6m 44s', sentiment:'Negative', score:31, intent:'objection_handling',   escalated:true,  agent:'Human', time:'08:52 AM' },
  { id:'#C-4814', type:'Banking',   duration:'3m 38s', sentiment:'Positive', score:79, intent:'transaction_query',    escalated:false, agent:'AI',    time:'08:44 AM' },
  { id:'#C-4813', type:'Banking',   duration:'9m 17s', sentiment:'Negative', score:12, intent:'fraud_report',         escalated:true,  agent:'Human', time:'08:33 AM' },
  { id:'#C-4812', type:'Marketing', duration:'3m 02s', sentiment:'Positive', score:84, intent:'campaign_feedback',    escalated:false, agent:'AI',    time:'08:21 AM' },
];

const HOURLY_VOLUME = [
  { hour:'08:00', calls:14 },
  { hour:'09:00', calls:29 },
  { hour:'10:00', calls:41 },
  { hour:'11:00', calls:38 },
  { hour:'12:00', calls:22 },
  { hour:'13:00', calls:19 },
  { hour:'14:00', calls:33 },
  { hour:'15:00', calls:47 },
  { hour:'16:00', calls:52 },
  { hour:'17:00', calls:35 },
];

/* ─── Donut Chart (SVG) ─────────────────────────────────────── */
function DonutChart({ positive, negative }) {
  const r = 54, cx = 70, cy = 70, stroke = 14;
  const circ = 2 * Math.PI * r;
  const posLen = (positive / 100) * circ;
  const negLen = (negative / 100) * circ;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f87171" strokeWidth={stroke}
        strokeDasharray={`${negLen} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4ade80" strokeWidth={stroke}
        strokeDasharray={`${posLen} ${circ}`}
        strokeDashoffset={-negLen}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 6}  textAnchor="middle" fill="#edeae2" fontSize={18} fontWeight={600}>{positive}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(237,234,226,0.4)" fontSize={9} letterSpacing={1}>POSITIVE</text>
    </svg>
  );
}

/* ─── Bar Chart ─────────────────────────────────────────────── */
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.calls));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80, padding:'0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{
            flex:1, display:'flex', alignItems:'flex-end', width:'100%',
          }}>
            <div style={{
              width:'100%',
              height:`${(d.calls / max) * 100}%`,
              background: d.calls === max
                ? 'linear-gradient(180deg,#c9a84c,#a8882e)'
                : 'rgba(201,168,76,0.2)',
              borderRadius:'3px 3px 0 0',
              minHeight:4,
              transition:'all 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize:9, color:'rgba(237,234,226,0.3)', whiteSpace:'nowrap' }}>
            {d.hour.split(':')[0]}h
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
const AnalyticsDashboard = () => {
  const [filter, setFilter]       = useState('all');
  const [logFilter, setLogFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  const filteredLogs = CALL_LOGS.filter(log => {
    if (logFilter === 'banking')   return log.type === 'Banking';
    if (logFilter === 'marketing') return log.type === 'Marketing';
    if (logFilter === 'escalated') return log.escalated;
    return true;
  });

  return (
    <div style={{
      height:'100%', overflowY:'auto', padding:'24px 28px',
      background:'transparent', color:'#edeae2',
      fontFamily:"'Inter', sans-serif", fontWeight:300,
    }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.35rem', fontWeight:600, fontFamily:"'Cormorant Garamond', serif", letterSpacing:'0.02em' }}>
            Analytics Dashboard
          </h1>
          <p style={{ margin:'4px 0 0', fontSize:'0.72rem', color:'rgba(237,234,226,0.4)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Call Intelligence · Sentiment Analysis · Escalation Tracking
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {['today','week','month'].map(r => (
            <button key={r} onClick={() => setDateRange(r)} style={{
              padding:'6px 14px', borderRadius:20, fontSize:'0.7rem', fontWeight:500,
              letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer',
              fontFamily:'inherit',
              background: dateRange === r ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: dateRange === r ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: dateRange === r ? '#c9a84c' : 'rgba(237,234,226,0.4)',
              transition:'all 0.18s',
            }}>{r}</button>
          ))}
          <div style={{
            padding:'6px 14px', borderRadius:20, fontSize:'0.7rem',
            background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)',
            color:'#4ade80', letterSpacing:'0.06em', textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:6,
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 6px rgba(74,222,128,0.7)' }} />
            Live
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:22 }}>
        {KPI_CARDS.map((card, i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
          }}>
            <div style={{
              position:'absolute', top:0, right:0, width:80, height:80,
              background:`radial-gradient(circle at top right, ${card.color}12, transparent 70%)`,
              borderRadius:'0 14px 0 0',
            }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:'1.1rem' }}>{card.icon}</span>
              <span style={{
                fontSize:'0.67rem', padding:'2px 8px', borderRadius:12, fontWeight:500,
                letterSpacing:'0.04em',
                background: card.up ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${card.up ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                color: card.up ? '#4ade80' : '#f87171',
              }}>
                {card.up ? '↑' : '↓'} {card.delta}
              </span>
            </div>
            <div style={{ fontSize:'1.7rem', fontWeight:600, fontFamily:"'Cormorant Garamond',serif", color:'#edeae2', lineHeight:1 }}>
              {card.value}
            </div>
            <div style={{ fontSize:'0.7rem', color:'rgba(237,234,226,0.4)', marginTop:5, letterSpacing:'0.04em' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Sentiment + Escalation Breakdown + Volume ── */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 220px', gap:14, marginBottom:22 }}>

        {/* Sentiment Donut */}
        <div style={{
          background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:14, padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:14,
        }}>
          <div style={{ fontSize:'0.67rem', fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(237,234,226,0.4)', alignSelf:'flex-start' }}>
            Sentiment Ratio
          </div>
          <DonutChart positive={SENTIMENT_DATA.positive} negative={SENTIMENT_DATA.negative} />
          <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
            {[
              { label:'Positive', pct: SENTIMENT_DATA.positive, color:'#4ade80' },
              { label:'Negative', pct: SENTIMENT_DATA.negative, color:'#f87171' },
            ].map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'0.75rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:s.color, display:'inline-block' }} />
                  <span style={{ color:'rgba(237,234,226,0.6)' }}>{s.label}</span>
                </div>
                <span style={{ fontWeight:500, color:s.color }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation Breakdown */}
        <div style={{
          background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:14, padding:'20px 20px',
        }}>
          <div style={{ fontSize:'0.67rem', fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(237,234,226,0.4)', marginBottom:18 }}>
            Human Escalation Breakdown
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {ESCALATION_BREAKDOWN.map((item, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:'0.76rem' }}>
                  <span style={{ color:'rgba(237,234,226,0.7)' }}>{item.label}</span>
                  <span style={{ color:item.color, fontWeight:500 }}>{item.count} calls · {item.pct}%</span>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', width:`${item.pct}%`, borderRadius:3,
                    background:item.color, opacity:0.75,
                    transition:'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop:18, padding:'10px 14px', borderRadius:8,
            background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.12)',
            fontSize:'0.72rem', color:'rgba(248,113,113,0.7)',
          }}>
            ⚠️ 495 total escalations this period · Avg handle time: 8m 24s
          </div>
        </div>

        {/* Hourly Volume */}
        <div style={{
          background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:14, padding:'20px 16px',
        }}>
          <div style={{ fontSize:'0.67rem', fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(237,234,226,0.4)', marginBottom:16 }}>
            Call Volume (Hourly)
          </div>
          <BarChart data={HOURLY_VOLUME} />
          <div style={{ marginTop:12, fontSize:'0.7rem', color:'rgba(237,234,226,0.35)', textAlign:'center' }}>
            Peak: 16:00 — 17:00 · 52 calls
          </div>
        </div>
      </div>

      {/* ── Call Records Log ── */}
      <div style={{
        background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:14, overflow:'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10,
        }}>
          <span style={{ fontSize:'0.67rem', fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(237,234,226,0.4)' }}>
            📋 Call Record Logs
          </span>
          <div style={{ display:'flex', gap:6 }}>
            {[
              { key:'all',       label:'All Calls' },
              { key:'banking',   label:'Banking' },
              { key:'marketing', label:'Marketing' },
              { key:'escalated', label:'Escalated' },
            ].map(f => (
              <button key={f.key} onClick={() => setLogFilter(f.key)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:'0.68rem', fontWeight:500,
                cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.04em',
                background: logFilter === f.key ? 'rgba(201,168,76,0.12)' : 'transparent',
                border: logFilter === f.key ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: logFilter === f.key ? '#c9a84c' : 'rgba(237,234,226,0.4)',
                transition:'all 0.18s',
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {['Call ID','Type','Duration','Sentiment Score','Primary Intent','Handled By','Escalated','Time'].map(h => (
                  <th key={h} style={{
                    padding:'10px 16px', textAlign:'left', fontSize:'0.65rem',
                    fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase',
                    color:'rgba(237,234,226,0.3)', whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={log.id} style={{
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition:'background 0.15s',
                  cursor:'default',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(201,168,76,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background= i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding:'11px 16px', color:'rgba(201,168,76,0.8)', fontFamily:"'DM Mono',monospace", fontSize:'0.72rem' }}>{log.id}</td>
                  <td style={{ padding:'11px 16px' }}>
                    <span style={{
                      padding:'2px 9px', borderRadius:12, fontSize:'0.68rem', fontWeight:500,
                      background: log.type === 'Banking' ? 'rgba(99,179,237,0.08)' : 'rgba(167,139,250,0.08)',
                      border: `1px solid ${log.type === 'Banking' ? 'rgba(99,179,237,0.2)' : 'rgba(167,139,250,0.2)'}`,
                      color: log.type === 'Banking' ? '#7ec8e3' : '#c4b5fd',
                    }}>{log.type}</span>
                  </td>
                  <td style={{ padding:'11px 16px', color:'rgba(237,234,226,0.6)', fontFamily:"'DM Mono',monospace", fontSize:'0.72rem' }}>{log.duration}</td>
                  <td style={{ padding:'11px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, minWidth:50 }}>
                        <div style={{
                          height:'100%', borderRadius:2,
                          width:`${log.score}%`,
                          background: log.score >= 70 ? '#4ade80' : log.score >= 40 ? '#fbbf24' : '#f87171',
                        }} />
                      </div>
                      <span style={{ fontSize:'0.7rem', color: log.score >= 70 ? '#4ade80' : log.score >= 40 ? '#fbbf24' : '#f87171', minWidth:28 }}>
                        {log.score}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding:'11px 16px', color:'rgba(237,234,226,0.55)', fontSize:'0.73rem' }}>
                    {log.intent.replace(/_/g,' ')}
                  </td>
                  <td style={{ padding:'11px 16px' }}>
                    <span style={{
                      padding:'2px 9px', borderRadius:12, fontSize:'0.68rem',
                      background: log.agent === 'AI' ? 'rgba(201,168,76,0.08)' : 'rgba(74,222,128,0.08)',
                      border: `1px solid ${log.agent === 'AI' ? 'rgba(201,168,76,0.2)' : 'rgba(74,222,128,0.2)'}`,
                      color: log.agent === 'AI' ? '#c9a84c' : '#4ade80',
                    }}>🤖 {log.agent}</span>
                  </td>
                  <td style={{ padding:'11px 16px' }}>
                    {log.escalated ? (
                      <span style={{
                        padding:'2px 9px', borderRadius:12, fontSize:'0.68rem',
                        background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)',
                        color:'#f87171',
                      }}>⚡ Yes</span>
                    ) : (
                      <span style={{
                        padding:'2px 9px', borderRadius:12, fontSize:'0.68rem',
                        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                        color:'rgba(237,234,226,0.3)',
                      }}>— No</span>
                    )}
                  </td>
                  <td style={{ padding:'11px 16px', color:'rgba(237,234,226,0.35)', fontSize:'0.7rem', fontFamily:"'DM Mono',monospace" }}>
                    {log.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div style={{
          padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.06)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontSize:'0.7rem', color:'rgba(237,234,226,0.3)',
        }}>
          <span>Showing {filteredLogs.length} of {CALL_LOGS.length} records · Static demo data</span>
          <div style={{ display:'flex', gap:8 }}>
            {['← Prev','Next →'].map(btn => (
              <button key={btn} style={{
                padding:'5px 12px', borderRadius:8, fontSize:'0.68rem',
                background:'transparent', border:'1px solid rgba(255,255,255,0.08)',
                color:'rgba(237,234,226,0.35)', cursor:'not-allowed', fontFamily:'inherit',
              }}>{btn}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div style={{ height:24 }} />
    </div>
  );
};

export default AnalyticsDashboard;
