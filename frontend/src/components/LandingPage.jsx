import React, { useRef } from 'react';
import './LandingPage.css';

// Minimalist arrow icon matching the reference style
const ArrowUpRight = () => (
    <svg className="landing-arrow-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
            {/* Full-Screen Edge-to-Edge Background Video (Plays once, stays on last frame) */}
            <video 
                ref={videoRef}
                className="landing-bg-video"
                autoPlay 
                muted 
                playsInline
                preload="auto"
                onEnded={handleVideoEnded}
                src="https://res.cloudinary.com/dv7fu8gwf/video/upload/can_you_generate_a_short_loopi_gwr_video_mvp_1_yxxiqz.mp4"
            >
                <iframe
                    src="https://player.cloudinary.com/embed/?cloud_name=dv7fu8gwf&public_id=can_you_generate_a_short_loopi_gwr_video_mvp_1_yxxiqz"
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
                {/* Left section of navbar reserved to populate later */}
                <div className="landing-nav-left" />

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
        </div>
    );
};

export default LandingPage;
