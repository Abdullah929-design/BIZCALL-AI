import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ModelsOnDemand.css';

// Minimalist vector SVG stroke icons
const CpuIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
);

const LayersIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
    </svg>
);

const BankIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="21" x2="21" y2="21"/>
        <line x1="6" y1="10" x2="6" y2="18"/><line x1="10" y1="10" x2="10" y2="18"/>
        <line x1="14" y1="10" x2="14" y2="18"/><line x1="18" y1="10" x2="18" y2="18"/>
        <polygon points="12 3 2 9 22 9 12 3"/>
    </svg>
);

const TrendingUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
    </svg>
);

const ZapIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
);

const ActivityIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
);

const TargetIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
);

const LightbulbIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6"/><path d="M10 22h4"/>
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
    </svg>
);

const DatabaseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
);

const TerminalIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const AlertCircleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
);

const ModelsOnDemand = () => {
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('banking-gemma-2b');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const bankingPrompts = [
        "How do I open a fixed deposit account and what are the interest rates?",
        "I lost my debit card yesterday, how do I freeze it immediately?",
        "What are the eligibility criteria and documents required for a personal loan?",
        "Can I dispute an unauthorized charge appearing on my monthly statement?"
    ];

    const salesPrompts = [
        "Create a 3-sentence high-converting pitch for our AI voice call center to a dental clinic.",
        "Write a high-converting follow-up email for a B2B prospect who requested pricing but went silent.",
        "Write a compelling cold outreach hook offering a 14-day free pilot of BizCall AI.",
        "What are the technical capabilities, CRM integrations, and sub-second latency of BizCall AI?"
    ];

    const activePrompts = selectedModel === 'sales-gemma-2b' ? salesPrompts : bankingPrompts;

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const res = await axios.get('/api/models-on-demand/catalog');
                if (res.data?.success) {
                    setModels(res.data.models);
                }
            } catch (err) {
                console.error("Error fetching models catalog:", err);
            }
        };
        fetchCatalog();
    }, []);

    const handleRunInference = async (queryText) => {
        const textToRun = queryText || query;
        if (!textToRun.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await axios.post('/api/models-on-demand/inference', {
                query: textToRun,
                model_id: selectedModel
            }, {
                timeout: 120000 // 2 minutes for full CPU generation
            });

            if (res.data?.success) {
                setResult(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "Model inference failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="models-page">
            {/* Header / Hero */}
            <div className="models-hero-card">
                <div className="hero-left">
                    <div className="hero-title-row">
                        <h1 className="hero-title">
                            <CpuIcon /> Models on Demand
                        </h1>
                        <span className="hero-engine-badge">
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                            ZeroGPU & Cloud Engine Active
                        </span>
                    </div>
                    <p className="hero-desc">
                        Deploy proprietary, domain-specialized Small Language Models (SLMs) fine-tuned on enterprise vertical data. 
                        Features multi-intent segmentation, semantic FAISS vector retrieval, and on-demand cloud inference.
                    </p>
                </div>

                <div className="hero-stats-row">
                    <div className="hero-stat-pill">
                        <div className="hero-stat-val">2.0B</div>
                        <div className="hero-stat-sub">Parameters</div>
                    </div>
                    <div className="hero-stat-pill">
                        <div className="hero-stat-val">2 Models</div>
                        <div className="hero-stat-sub">Production SLMs</div>
                    </div>
                </div>
            </div>

            {/* Model Selector Cards */}
            <div>
                <h2 className="catalog-section-title">
                    <LayersIcon /> Available Industry Models Catalog
                </h2>

                <div className="catalog-grid">
                    {/* Model 1: Banking */}
                    <div 
                        onClick={() => setSelectedModel('banking-gemma-2b')}
                        className={`model-catalog-card ${selectedModel === 'banking-gemma-2b' ? 'selected' : ''}`}
                    >
                        <div>
                            <div className="model-card-top">
                                <div className="model-icon-title">
                                    <div className="model-icon-box">
                                        <BankIcon />
                                    </div>
                                    <div>
                                        <h3 className="model-card-name">BizCall Banking SLM</h3>
                                        <span className="model-card-arch">Gemma-2B LoRA • Safetensors</span>
                                    </div>
                                </div>
                                <span className="model-status-badge">
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                                    Ready to Test
                                </span>
                            </div>
                            <p className="model-card-desc">
                                Trained on verified banking datasets for account opening, card fraud freeze, loan compliance, and transactions.
                            </p>
                        </div>
                        <div className="model-tags-row">
                            <span className="model-tag">Multi-Intent (DistilBERT)</span>
                            <span className="model-tag">FAISS RAG</span>
                            <span className="model-tag">Nvidia A100</span>
                        </div>
                    </div>

                    {/* Model 2: Marketing / Sales */}
                    <div 
                        onClick={() => setSelectedModel('sales-gemma-2b')}
                        className={`model-catalog-card ${selectedModel === 'sales-gemma-2b' ? 'selected sales' : ''}`}
                    >
                        <div>
                            <div className="model-card-top">
                                <div className="model-icon-title">
                                    <div className="model-icon-box" style={{ color: selectedModel === 'sales-gemma-2b' ? '#f59e0b' : '#fb923c' }}>
                                        <TrendingUpIcon />
                                    </div>
                                    <div>
                                        <h3 className="model-card-name">BizCall Sales & Pitch Agent</h3>
                                        <span className="model-card-arch" style={{ color: '#fb923c' }}>Gemma-2B Quantized • Q4_K_M</span>
                                    </div>
                                </div>
                                <span className="model-status-badge">
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                                    Ready to Test
                                </span>
                            </div>
                            <p className="model-card-desc">
                                Fine-tuned for outbound B2B cold pitching, handling pricing objections, and generating high-converting campaign copy.
                            </p>
                        </div>
                        <div className="model-tags-row">
                            <span className="model-tag">Cold Outreach</span>
                            <span className="model-tag">Pitch Generator</span>
                            <span className="model-tag">GGUF 4-Bit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Testing Sandbox */}
            <div className="sandbox-card">
                <div className="sandbox-header">
                    <label className="sandbox-title">
                        <ZapIcon /> Test Inference Sandbox
                    </label>
                    <span className="sandbox-sub">Try sample inquiries or enter custom customer text</span>
                </div>

                {/* Sample Prompt Chips */}
                <div className="prompt-chips-row">
                    {activePrompts.map((p, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                setQuery(p);
                                handleRunInference(p);
                            }}
                            className="prompt-chip-btn"
                        >
                            "{p}"
                        </button>
                    ))}
                </div>

                {/* Textarea & Submit */}
                <div className="sandbox-input-row">
                    <textarea
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={
                            selectedModel === 'sales-gemma-2b'
                                ? "Type sales or outreach goal (e.g. Create a 3-sentence high-converting pitch for our AI voice call center to a dental clinic)..."
                                : "Type customer inquiry here (e.g. How do I open a fixed deposit account and freeze my card)..."
                        }
                        rows={2}
                        className="sandbox-textarea"
                    />

                    <button
                        type="button"
                        onClick={() => handleRunInference(query)}
                        disabled={loading || !query.trim()}
                        className="btn-run-inference"
                        style={{
                            background: selectedModel === 'sales-gemma-2b' ? '#ea580c' : '#5855d6'
                        }}
                    >
                        {loading ? (
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
                                {selectedModel === 'sales-gemma-2b' ? 'Generating Pitch...' : 'Generating on A100...'}
                            </>
                        ) : (
                            <>
                                {selectedModel === 'sales-gemma-2b' ? <TrendingUpIcon /> : <ArrowRightIcon />}
                                <span>{selectedModel === 'sales-gemma-2b' ? 'Generate Sales Pitch' : 'Run Model on Demand'}</span>
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="sandbox-error-box">
                        <AlertCircleIcon /> {error}
                    </div>
                )}
            </div>

            {/* Inference Results 3-Tier Dashboard */}
            {result && (
                <div className="results-card">
                    <div className="results-header">
                        <div className="results-title-group">
                            <ActivityIcon />
                            <div>
                                <h3 className="results-title">
                                    Proprietary Pipeline Analysis Result
                                </h3>
                                <div className="results-meta">
                                    Model: <strong style={{ color: '#818cf8' }}>{result.model_name}</strong> • Hardware: <strong style={{ color: '#34d399' }}>{result.hardware}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="latency-pill">
                            <ZapIcon /> Total Latency: {result.latency_ms}ms
                        </div>
                    </div>

                    {/* Pipeline Route Indicator */}
                    <div className={`pipeline-flow-banner ${result.model_id === 'sales-gemma-2b' ? 'sales' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshIcon />
                            <span style={{ color: '#85899d' }}>Pipeline Flow:</span>
                            <strong style={{ color: result.model_id === 'sales-gemma-2b' ? '#fb923c' : (result.complexity === 'complex' ? '#fb923c' : '#34d399') }}>
                                {result.model_id === 'sales-gemma-2b'
                                    ? 'Outbound Campaign Hook ➔ Routed to Fine-Tuned Sales SLM (Gemma-2B Q4_K_M Engine)'
                                    : (result.complexity === 'complex' 
                                        ? 'Complex Multi-Intent Query ➔ Routed to Fine-Tuned Gemma-2B SLM with RAG Context' 
                                        : 'Single Direct Intent Query ➔ High-Confidence FAISS Knowledge Base RAG Match')}
                            </strong>
                        </div>
                        <span className="pipeline-mode-badge">
                            MODE: {result.model_id === 'sales-gemma-2b' ? 'SALES / PITCH' : `COMPLEXITY: ${result.complexity?.toUpperCase()}`}
                        </span>
                    </div>

                    {/* Diagnostic Grid: Sales vs Banking */}
                    {result.model_id === 'sales-gemma-2b' ? (
                        /* Sales & Pitch Diagnostic Strategy */
                        <div className="diagnostic-grid">
                            {/* Panel 1: Campaign Target & Scenario */}
                            <div className="diagnostic-panel" style={{ borderLeft: '3px solid #ea580c' }}>
                                <div className="diagnostic-panel-title">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb923c' }}>
                                        <TargetIcon /> 1. Outreach Target & Campaign Objective
                                    </span>
                                    <span className="pipeline-mode-badge" style={{ color: '#fb923c', borderColor: 'rgba(234, 88, 12, 0.3)' }}>
                                        B2B OUTREACH
                                    </span>
                                </div>
                                <div style={{ background: '#101117', padding: '10px 12px', borderRadius: '6px', border: '1px solid #1f212d' }}>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                        Target Goal & Prompt
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.45 }}>
                                        "{result.query}"
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <span className="intent-chip" style={{ color: '#fed7aa', background: 'rgba(234, 88, 12, 0.12)', borderColor: 'rgba(234, 88, 12, 0.28)' }}>Cold Pitch</span>
                                        <span className="intent-chip" style={{ color: '#fed7aa', background: 'rgba(234, 88, 12, 0.12)', borderColor: 'rgba(234, 88, 12, 0.28)' }}>Value Proposition</span>
                                        <span className="intent-chip" style={{ color: '#fed7aa', background: 'rgba(234, 88, 12, 0.12)', borderColor: 'rgba(234, 88, 12, 0.28)' }}>Objection Preemption</span>
                                    </div>
                                </div>
                            </div>

                            {/* Panel 2: Pitch Strategy & Value Pillars */}
                            <div className="diagnostic-panel" style={{ borderLeft: '3px solid #10b981' }}>
                                <div className="diagnostic-panel-title">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6ee7b7' }}>
                                        <LightbulbIcon /> 2. Pitch Strategy & Conversion Engine
                                    </span>
                                    <span className="pipeline-mode-badge" style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                        HIGH CONVERSION
                                    </span>
                                </div>
                                <div style={{ background: '#101117', padding: '10px 12px', borderRadius: '6px', border: '1px solid #1f212d' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#cbd5e1' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CheckCircleIcon /> <span><strong style={{ color: '#fff' }}>Clear ROI Hook:</strong> Solves missed customer inquiries and eliminates hold times</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CheckCircleIcon /> <span><strong style={{ color: '#fff' }}>Frictionless CTA:</strong> Low-friction 5-minute walkthrough or free pilot invite</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CheckCircleIcon /> <span><strong style={{ color: '#fff' }}>Multi-Channel Ready:</strong> Usable in Retell Voice, Cold Email & Messenger CRM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Banking 2-Column Multi-Intent & FAISS Grid */
                        <div className="diagnostic-grid">
                            {/* Panel 1: Intent Decomposition */}
                            <div className="diagnostic-panel">
                                <div className="diagnostic-panel-title">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8' }}>
                                        <TargetIcon /> 1. Multi-Intent Classifier (DistilBERT)
                                    </span>
                                    <span className="pipeline-mode-badge" style={{
                                        color: result.complexity === 'complex' ? '#fb923c' : '#34d399',
                                        borderColor: result.complexity === 'complex' ? 'rgba(234, 88, 12, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                                    }}>
                                        {result.complexity?.toUpperCase()}
                                    </span>
                                </div>

                                {result.intents && result.intents.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {result.intents.map((seg, sIdx) => (
                                            <div key={sIdx} style={{ background: '#101117', padding: '9px 11px', borderRadius: '6px', border: '1px solid #1f212d' }}>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontStyle: 'italic' }}>
                                                    "{seg.segment}"
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {seg.intents.map((item, iIdx) => (
                                                        <span key={iIdx} className="intent-chip">
                                                            {item.intent.replace(/_/g, ' ')} ({Math.round(item.confidence * 100)}%)
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>General banking customer intent detected</div>
                                )}
                            </div>

                            {/* Panel 2: FAISS Vector RAG */}
                            <div className="diagnostic-panel">
                                <div className="diagnostic-panel-title">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6ee7b7' }}>
                                        <DatabaseIcon /> 2. FAISS Semantic Vector RAG
                                    </span>
                                    {result.faq_rag && (
                                        <span className="pipeline-mode-badge" style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                            Sim: {result.faq_rag.confidence}
                                        </span>
                                    )}
                                </div>

                                {result.faq_rag ? (
                                    <div style={{ background: '#101117', padding: '10px 12px', borderRadius: '6px', border: '1px solid #1f212d' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>
                                                Policy: {result.faq_rag.intent}
                                            </span>
                                            <span style={{ fontSize: '10px', color: '#85899d', textTransform: 'capitalize' }}>
                                                Priority: {result.faq_rag.priority}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: 1.45 }}>
                                            {result.faq_rag.answer}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>
                                        No exact FAQ policy threshold triggered. Routed directly to Model Reasoning layer.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Panel 3: Fine-Tuned Model Generated Output */}
                    <div className="final-output-card" style={{
                        borderLeftColor: result.model_id === 'sales-gemma-2b' ? '#ea580c' : '#5855d6'
                    }}>
                        <div className="final-output-header">
                            <span className="final-output-title">
                                <TerminalIcon />
                                {result.model_id === 'sales-gemma-2b' ? '3. BizCall Sales Agent Generated Pitch' : '3. Fine-Tuned Model on Demand Response'}
                            </span>
                            <span style={{
                                fontSize: '10.5px',
                                fontFamily: 'DM Mono, monospace',
                                color: result.model_id === 'sales-gemma-2b' ? '#fb923c' : '#818cf8',
                                background: '#151620',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid #242738'
                            }}>
                                {result.model_id === 'sales-gemma-2b' ? 'Gemma-2B Q4_K_M GGUF' : 'Gemma-2B LoRA Adapter'}
                            </span>
                        </div>
                        <div className="final-output-body">
                            {result.model_response}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelsOnDemand;
