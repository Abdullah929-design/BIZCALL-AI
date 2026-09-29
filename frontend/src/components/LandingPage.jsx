import React, { useRef } from 'react';
import './LandingPage.css';
import brainLogo from '../assets/brain-logo.svg';

// Minimalist arrow icon
const ArrowUpRight = () => (
    <svg className="landing-arrow-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
    </svg>
);

const FEATURES = [
    'Voice calling automation',
    'Lead scraping',
    'Email outbound and inbox manager',
    'Social media automation',
    'Customized LLM services',
];

// "mark" is a placeholder monogram; swap for real logo SVGs when you have them
const TECH = [
    { label: 'Calling', name: 'Twilio', mark: 'Tw' },
    { label: 'AI models', name: 'NVIDIA', mark: 'Nv' },
    { label: 'Models', name: 'Hugging Face', mark: 'Hf' },
    { label: 'Voice agents', name: 'Retell AI', mark: 'Re' },
    { label: 'Local LLMs', name: 'Ollama', mark: 'Ol' },
    { label: 'Language models', name: 'Gemma', mark: 'Ge' },
    { label: 'Email', name: 'Gmail API', mark: 'Gm' },
    { label: 'Social media', name: 'Meta API', mark: 'Me' },
    { label: 'Email campaigns', name: 'Brevo', mark: 'Br' },
    { label: 'Database', name: 'Supabase', mark: 'Su' },
    { label: 'Fast inference', name: 'GroqCloud', mark: 'Gq' },
    { label: 'Datasets', name: 'Kaggle', mark: 'Ka' },
    { label: 'Cloud', name: 'Oracle', mark: 'Or' },
];

const LLM_DETAILS = [
    { label: 'Trained on', value: 'Your offers' },
    { label: 'Tone', value: 'Your brand voice' },
    { label: 'Used in', value: 'Calls, email, posts' },
    { label: 'Setup', value: 'Custom-built' },
];

const LandingPage = ({ onLoginClick }) => {
    const videoRef = useRef(null);

    return (
        <div className="landing-container">
            {/* Full-screen background video */}
            <video
                ref={videoRef}
                className="landing-bg-video"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                src="https://res.cloudinary.com/dv7fu8gwf/video/upload/Crystal_levitating_up_and_down_20260928230831_dyw0df.mp4"
            >
                <iframe
                    src="https://player.cloudinary.com/embed/?cloud_name=dv7fu8gwf&public_id=Crystal_levitating_up_and_down_20260928230831_dyw0df"
                    className="landing-bg-video"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                    title="Background Video"
                />
            </video>

            <div className="landing-overlay" />

            {/* Narrow "powered by" ticker, scrolls left to right */}
            <div className="landing-ticker" role="region" aria-label="Technologies powering Bizcall AI">
                <div className="landing-ticker-track">
                    {[...TECH, ...TECH].map((tech, i) => (
                        <span
                            className="landing-ticker-item"
                            key={`${tech.name}-${i}`}
                            aria-hidden={i >= TECH.length ? 'true' : undefined}
                        >
                            <span className="landing-ticker-label">{tech.label} powered by</span>
                            <span className="landing-ticker-name">{tech.name}</span>
                            <span className="landing-ticker-mark" aria-hidden="true">{tech.mark}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Navbar */}
            <header className="landing-navbar">
                <div className="landing-nav-left">
                    <img src={brainLogo} alt="BizCall AI Logo" className="landing-brand-logo" />
                    <span className="landing-brand-text">BIZCALL AI</span>
                </div>
                <div className="landing-nav-right">
                    <button type="button" className="landing-login-btn" onClick={onLoginClick}>
                        <span>LOG IN</span>
                        <ArrowUpRight />
                    </button>
                </div>
            </header>

            {/* Left block: eyebrow, headline, intro, feature list */}
            <section className="landing-left">

                <h1 className="landing-headline">
                    Automate every call, lead and campaign.
                </h1>
                <p className="landing-intro">
                    Voice calling, lead scraping, email outreach and social media, run from
                    one platform with LLMs customized for your business.
                </p>

                <div className="landing-features">
                    <p className="landing-features-title">Features</p>
                    <ol className="landing-features-list">
                        {FEATURES.map((item, i) => (
                            <li key={item}>
                                <span className="landing-features-num">{String(i + 1).padStart(2, '0')}</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Right block: rule, label row, subheading, detail grid */}
            <aside className="landing-right">
                <div className="landing-right-label">
                    <span>Bizcall AI</span>
                    <span>Custom LLM</span>
                </div>
                <h2 className="landing-right-heading">Language models built for your business.</h2>
                <p className="landing-right-body">
                    We tune models to your offers, scripts and brand voice so every call,
                    email and post sounds like you.
                </p>
                <dl className="landing-grid">
                    {LLM_DETAILS.map(({ label, value }) => (
                        <div className="landing-grid-cell" key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            </aside>
        </div>
    );
};

export default LandingPage;