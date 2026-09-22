import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
        "How should I follow up with a lead who asked for pricing but went silent?",
        "Write an opening hook offering a 14-day free pilot of BizCall AI.",
        "How do I handle the objection: 'We already have an in-house receptionist team'?"
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
        <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '24px 20px 60px',
            fontFamily: "'Inter', sans-serif",
            color: '#e2e8f0'
        }}>
            {/* Header / Hero */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '28px',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '240px',
                    height: '240px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '2rem' }}>🧠</span>
                            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                                Models on Demand
                            </h1>
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                                ZeroGPU & Cloud Engine Active
                            </span>
                        </div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '780px', lineHeight: 1.6 }}>
                            Deploy proprietary, domain-specialized Small Language Models (SLMs) fine-tuned on enterprise vertical data. 
                            Features real-time multi-intent segmentation, semantic FAISS vector retrieval, and on-demand cloud inference.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '10px 18px',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa' }}>2 Billion</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parameters</div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '10px 18px',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>2 Models</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Production SLMs</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Selector Cards */}
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📦</span> Available Industry Models Catalog
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                    {/* Model 1: Banking */}
                    <div 
                        onClick={() => setSelectedModel('banking-gemma-2b')}
                        style={{
                            background: selectedModel === 'banking-gemma-2b' 
                                ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)' 
                                : 'rgba(30, 41, 59, 0.5)',
                            border: selectedModel === 'banking-gemma-2b' ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '16px',
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem', background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px' }}>🏦</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>BizCall Banking SLM</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 500 }}>Gemma-2B LoRA • Safetensors</span>
                                </div>
                            </div>
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '3px 10px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                                Ready to Test
                            </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
                            Trained on verified banking datasets for account opening, card fraud freeze, loan compliance, and transactions.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>Multi-Intent (DistilBERT)</span>
                            <span style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>FAISS RAG</span>
                            <span style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>Nvidia A100</span>
                        </div>
                    </div>

                    {/* Model 2: Marketing */}
                    <div 
                        onClick={() => setSelectedModel('sales-gemma-2b')}
                        style={{
                            background: selectedModel === 'sales-gemma-2b' 
                                ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)' 
                                : 'rgba(30, 41, 59, 0.5)',
                            border: selectedModel === 'sales-gemma-2b' ? '1.5px solid #ea580c' : '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '16px',
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem', background: 'rgba(234, 88, 12, 0.15)', padding: '8px', borderRadius: '10px' }}>📈</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>BizCall Sales & Pitch Agent</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#fb923c', fontWeight: 500 }}>Gemma-2B Quantized • Q4_K_M</span>
                                </div>
                            </div>
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '3px 10px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                                Ready to Test
                            </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5 }}>
                            Fine-tuned for outbound B2B cold pitching, handling pricing objections, and generating high-converting campaign copy.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>Cold Outreach</span>
                            <span style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>Pitch Generator</span>
                            <span style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#cbd5e1' }}>GGUF 4-Bit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Testing Sandbox */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '28px',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.2)',
                marginBottom: '28px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <label style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚡</span> Test Inference Sandbox
                    </label>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Try sample inquiries or type custom customer text</span>
                </div>

                {/* Sample Prompt Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {activePrompts.map((p, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                setQuery(p);
                                handleRunInference(p);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                textAlign: 'left'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = selectedModel === 'sales-gemma-2b' ? '#ea580c' : '#3b82f6';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.color = '#94a3b8';
                            }}
                        >
                            "{p}"
                        </button>
                    ))}
                </div>

                {/* Textarea & Submit */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <textarea
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={
                            selectedModel === 'sales-gemma-2b'
                                ? "Type sales or outreach goal (e.g. Create a 3-sentence high-converting pitch for our AI voice call center to a dental clinic)..."
                                : "Type customer inquiry here (e.g. How do I open a fixed deposit account and freeze my card)..."
                        }
                        rows={3}
                        style={{
                            flex: '1 1 500px',
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            resize: 'none',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                        onFocus={e => e.target.style.borderColor = selectedModel === 'sales-gemma-2b' ? '#ea580c' : '#3b82f6'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />

                    <button
                        type="button"
                        onClick={() => handleRunInference(query)}
                        disabled={loading || !query.trim()}
                        style={{
                            background: loading 
                                ? (selectedModel === 'sales-gemma-2b' ? 'rgba(234, 88, 12, 0.4)' : 'rgba(59, 130, 246, 0.4)') 
                                : (selectedModel === 'sales-gemma-2b' ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)'),
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0 28px',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: selectedModel === 'sales-gemma-2b' 
                                ? '0 8px 20px rgba(234, 88, 12, 0.3)' 
                                : '0 8px 20px rgba(37, 99, 235, 0.3)',
                            minHeight: '52px'
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    display: 'inline-block',
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    borderTopColor: '#fff',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                {selectedModel === 'sales-gemma-2b' ? 'Generating Pitch...' : 'Generating on A100...'}
                            </>
                        ) : (
                            <>
                                <span>{selectedModel === 'sales-gemma-2b' ? '📈' : '🚀'}</span>
                                {selectedModel === 'sales-gemma-2b' ? 'Generate Sales Pitch' : 'Run Model on Demand'}
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        color: '#f87171',
                        fontSize: '0.85rem'
                    }}>
                        ❌ {error}
                    </div>
                )}
            </div>

            {/* Inference Results 3-Tier Dashboard */}
            {result && (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '20px',
                    padding: '28px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.4rem' }}>📊</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#fff' }}>
                                    Proprietary Pipeline Analysis Result
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Model: <strong style={{ color: '#60a5fa' }}>{result.model_name}</strong> • Hardware: <strong style={{ color: '#34d399' }}>{result.hardware}</strong>
                                </span>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            color: '#34d399',
                            fontWeight: 600
                        }}>
                            ⚡ Total Latency: {result.latency_ms}ms
                        </div>
                    </div>

                    {/* Pipeline Route Indicator */}
                    <div style={{
                        background: result.complexity === 'complex' 
                            ? 'rgba(234, 88, 12, 0.12)' 
                            : 'rgba(16, 185, 129, 0.12)',
                        border: result.complexity === 'complex' 
                            ? '1px solid rgba(234, 88, 12, 0.3)' 
                            : '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <span>🔄</span>
                            <span style={{ color: '#cbd5e1' }}>Pipeline Flow:</span>
                            <strong style={{ color: result.model_id === 'sales-gemma-2b' ? '#fb923c' : (result.complexity === 'complex' ? '#fb923c' : '#34d399') }}>
                                {result.model_id === 'sales-gemma-2b'
                                    ? 'Outbound Campaign Hook ➔ Routed to Fine-Tuned Sales SLM (Gemma-2B Q4_K_M Engine)'
                                    : (result.complexity === 'complex' 
                                        ? 'Complex Multi-Intent Query ➔ Routed to Fine-Tuned Gemma-2B SLM with RAG Context' 
                                        : 'Single Direct Intent Query ➔ High-Confidence FAISS Knowledge Base RAG Match')}
                            </strong>
                        </div>
                        <span style={{
                            fontSize: '0.72rem',
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: '#e2e8f0',
                            fontWeight: 600
                        }}>
                            Mode: {result.model_id === 'sales-gemma-2b' ? 'SALES / PITCH' : `Complexity: ${result.complexity?.toUpperCase()}`}
                        </span>
                    </div>

                    {/* 3-Column Diagnostic Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        {/* Panel 1: Intent / Strategy */}
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '14px',
                            padding: '18px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🎯</span> {result.model_id === 'sales-gemma-2b' ? '1. Outbound Intent Classifier' : '1. Multi-Intent Classifier'}
                                </span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#34d399',
                                    fontWeight: 600
                                }}>
                                    {result.model_id === 'sales-gemma-2b' ? 'B2B LEAD OUTREACH' : result.complexity?.toUpperCase()}
                                </span>
                            </div>

                            {result.intents && result.intents.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {result.intents.map((seg, sIdx) => (
                                        <div key={sIdx} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontStyle: 'italic' }}>
                                                "{seg.segment}"
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {seg.intents.map((item, iIdx) => (
                                                    <span key={iIdx} style={{
                                                        background: 'rgba(37, 99, 235, 0.25)',
                                                        color: '#93c5fd',
                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600
                                                    }}>
                                                        {item.intent.replace(/_/g, ' ')} ({Math.round(item.confidence * 100)}%)
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Customer inquiry intent recognized</div>
                            )}
                        </div>

                        {/* Panel 2: FAISS Vector RAG or Sales Pillars */}
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '14px',
                            padding: '18px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{result.model_id === 'sales-gemma-2b' ? '💡' : '📚'}</span> 
                                    {result.model_id === 'sales-gemma-2b' ? '2. Pitch Strategy & Conversion Engine' : '2. FAISS Semantic Vector RAG'}
                                </span>
                                {result.faq_rag && (
                                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>
                                        Sim: {result.faq_rag.confidence}
                                    </span>
                                )}
                            </div>

                            {result.model_id === 'sales-gemma-2b' ? (
                                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#34d399' }}>✓</span> <strong>Clear Value Proposition:</strong> Quantifiable ROI and time-saved pitch
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#34d399' }}>✓</span> <strong>Frictionless CTA:</strong> Low-commitment 5-minute invite or free trial
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#34d399' }}>✓</span> <strong>Channel Format:</strong> Optimized for cold email & messenger CRM
                                        </div>
                                    </div>
                                </div>
                            ) : result.faq_rag ? (
                                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                                            Policy Intent: {result.faq_rag.intent}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                                            Priority: {result.faq_rag.priority}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0, lineHeight: 1.45 }}>
                                        {result.faq_rag.answer}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0' }}>
                                    No exact FAQ policy threshold triggered. Routed directly to Model Reasoning layer.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel 3: Fine-Tuned Model Generated Output */}
                    <div style={{
                        background: result.model_id === 'sales-gemma-2b'
                            ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)'
                            : 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)',
                        border: result.model_id === 'sales-gemma-2b' ? '1.5px solid rgba(234, 88, 12, 0.4)' : '1.5px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '16px',
                        padding: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{result.model_id === 'sales-gemma-2b' ? '📈' : '🤖'}</span> 
                                {result.model_id === 'sales-gemma-2b' ? '3. BizCall Sales Agent Generated Pitch' : '3. Fine-Tuned Model on Demand Response'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: result.model_id === 'sales-gemma-2b' ? '#fb923c' : '#60a5fa', fontWeight: 500 }}>
                                {result.model_id === 'sales-gemma-2b' ? 'Gemma-2B Q4_K_M GGUF' : 'Gemma-2B LoRA Adapter'}
                            </span>
                        </div>
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '10px',
                            padding: '16px',
                            color: '#f8fafc',
                            fontSize: '0.92rem',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-line',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            {result.model_response}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelsOnDemand;
