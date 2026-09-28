import React from 'react';
import './LandingPage.css';

// Geometric four-petal brand emblem from reference design
const BrandEmblem = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="4.5" />
        <circle cx="16" cy="8" r="4.5" />
        <circle cx="8" cy="16" r="4.5" />
        <circle cx="16" cy="16" r="4.5" />
    </svg>
);

// Arrow icon for the login button
const ArrowUpRight = () => (
    <svg className="landing-arrow-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
    </svg>
);

const LandingPage = ({ onLoginClick }) => {
    return (
        <div className="landing-container">
            <div className="landing-frame">
                {/* Top Navigation Bar */}
                <header className="landing-navbar">
                    <div className="landing-brand">
                        <div className="landing-brand-icon">
                            <BrandEmblem />
                        </div>
                    </div>

                    <button 
                        type="button" 
                        className="landing-login-btn"
                        onClick={onLoginClick}
                    >
                        <span>Log in</span>
                        <ArrowUpRight />
                    </button>
                </header>

                {/* Hero Section with Video */}
                <main className="landing-hero">
                    <div className="landing-video-wrapper">
                        <iframe
                            src="https://player.cloudinary.com/embed/?cloud_name=dv7fu8gwf&public_id=can_you_generate_a_short_loopi_gwr_video_mvp_1_yxxiqz"
                            width="640"
                            height="360"
                            style={{ height: 'auto', width: '100%', aspectRatio: '640 / 360' }}
                            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                            className="landing-video-iframe"
                            title="BizCall AI Presentation"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LandingPage;
