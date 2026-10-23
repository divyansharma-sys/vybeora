import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <h3 className="brand-title" style={{ fontSize: '1.5rem' }}>
              Vybe<span>ora</span>
            </h3>
            <p className="footer-tagline">
              Your people. Your vibe. Your movie night. Watch together with friends anywhere.
            </p>
          </div>

          <div className="footer-columns">
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><Link to="/discover">Discover Movies</Link></li>
                <li><Link to="/create-room">Create Room</Link></li>
                <li><a href="https://github.com/divyansharma-sys/vybeora/releases/download/v1.0.0-apk/app-debug.apk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>🤖 Download Android APK</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><Link to="/free-movies">Free Movie Library</Link></li>
                <li><Link to="/friends">Friends & Crew</Link></li>
                <li><Link to="/profile">My Profile & Memories</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Watch Party</h4>
              <ul>
                <li><Link to="/create-room">Create Private Party</Link></li>
                <li><Link to="/join-room">Join by Code</Link></li>
                <li><span>Strictly Private Screening</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {currentYear} Vybeora. Your people. Your vibe. Your movie night.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
