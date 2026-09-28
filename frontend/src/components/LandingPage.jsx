import React, { useRef } from 'react';
import './LandingPage.css';
import brainLogo from '../assets/brain-logo.svg';

// Minimalist arrow icon matching the reference style
const ArrowUpRight = () => (
    <svg className="landing-arrow-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
    </svg>
);

const LandingPage = ({ onLoginClick }) => {
    const videoRef = useRef(null);

    const handleVideoEnded = () => {
        if (videoRef.current) {
            // Keep video paused on the last frame as the static background
            videoRef.current.pause();
        }
    };

    return (
        <div className="landing-container">
            {/* Full-Screen Edge-to-Edge Background Video (Loop Enabled) */}
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

            {/* Subtle atmospheric vignette */}
            <div className="landing-overlay" />

            {/* Top Navbar Sitting Directly on Top of the Video */}
            <header className="landing-navbar">
                {/* Left section of navbar */}
                <div className="landing-nav-left">
                    <img src={brainLogo} alt="BizCall AI Logo" className="landing-brand-logo" />
                    <span className="landing-brand-text">BIZCALL AI</span>
                </div>

                {/* Right section with Login button sitting directly on the video */}
                <div className="landing-nav-right">
                    <button
                        type="button"
                        className="landing-login-btn"
                        onClick={onLoginClick}
                    >
                        <span>LOG IN</span>
                        <ArrowUpRight />
                    </button>
                </div>
            </header>

            {/* Middle-Left Animated Headline */}
            <div className="landing-hero-headline">
                <h1>Voice Calling Automation <br></br> Platform</h1>
            </div>
            {/* Middle-Right Animated Headline */}
            <div className="landing-hero-headline-right">
                <h1>Social Media Marketing <br></br> Automation</h1>
            </div>
            {/* Bottom-Left Feature Note */}
            <div className="landing-bottom-left">
                <span>With customized LLM services</span>
            </div>
            {/* Bottom-Right Feature Note */}
            <div className="landing-bottom-right">
                <span>Customized Automated lead scraping</span>
            </div>
        </div>
    );
};


export default LandingPage;
