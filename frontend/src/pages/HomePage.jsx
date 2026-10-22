import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import movieService from '../services/movieService';
import roomService from '../services/roomService';
import MovieCard from '../components/movie/MovieCard';
import RoomCard from '../components/room/RoomCard';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

export function HomePage() {
  const { user } = useAuth();
  // Live Backend Data states
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomFilter, setRoomFilter] = useState('mine'); // Default to 'mine' so user only sees their own rooms

  const currentUserName = user?.profile?.display_name || user?.username || localStorage.getItem('vybeora_user') || '';

  useEffect(() => {
    fetchBackendData();
  }, []);

  const fetchBackendData = async () => {
    try {
      const movieRes = await movieService.getMovies();
      const movieList = movieRes?.results || [];
      setFeaturedMovies(movieList);
    } catch (err) {
      console.error('Failed to fetch movies from Django backend:', err);
    } finally {
      setLoadingMovies(false);
    }

    try {
      const roomRes = await roomService.getRooms();
      const roomList = roomRes?.results || [];
      setActiveRooms(roomList);
    } catch (err) {
      console.error('Failed to fetch rooms from Django backend:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleDeleteRoom = async (code, title) => {
    const confirmed = window.confirm(`Are you sure you want to delete room "${title || code}"?`);
    if (!confirmed) return;

    try {
      await roomService.deleteRoom(code);
      setActiveRooms((prev) => prev.filter((r) => r.code !== code));
    } catch (err) {
      alert('Failed to delete room: ' + (err.message || 'Server error'));
    }
  };

  const featuredSpotlight = featuredMovies.find((m) => m.is_featured) || featuredMovies[0];

  return (
    <div className="home-page">
      {/* 1. Immersive Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-badge-container">
            <div className="badge badge-aurora">
              <span className="pulse-dot"></span>
              Private Watch Parties with Friends
            </div>
          </div>

          <h1 className="hero-title">
            Your people. Your vibe.{' '}
            <span className="text-gradient">Your movie night.</span>
          </h1>

          <p className="hero-description">
            Bring your friends together no matter where they are. Host intimate private rooms,
            watch movies together in real-time harmony, and react live with floating emojis and chat.
          </p>

          <div className="hero-actions">
            <Link to="/create-room" className="btn btn-primary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Host a Watch Party
            </Link>
            <Link to="/free-movies" className="btn btn-secondary btn-lg">
              Explore Free Movies
            </Link>
          </div>

          {/* Cinematic Spotlight Banner with Actual Movie Poster */}
          {featuredSpotlight && (
            <div className="cinema-spotlight-card">
              <div
                className="spotlight-banner"
                style={{
                  backgroundImage: featuredSpotlight.poster_url
                    ? `url(${featuredSpotlight.poster_url})`
                    : 'none',
                }}
              >
                <div className="spotlight-overlay" />
                <div className="spotlight-layout">
                  {/* High Quality Movie Poster */}
                  {featuredSpotlight.poster_url && (
                    <div className="spotlight-poster-frame">
                      <img
                        src={featuredSpotlight.poster_url}
                        alt={`${featuredSpotlight.title} Poster`}
                        className="spotlight-poster-img"
                      />
                    </div>
                  )}

                  {/* Movie Information & Actions */}
                  <div className="spotlight-content">
                    <div className="spotlight-meta-strip">
                      <span className="badge badge-live">★ TONIGHT'S FEATURED SCREENING</span>
                      <span className="badge badge-healthy">✓ Free to Watch</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {featuredSpotlight.genre}
                      </span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {featuredSpotlight.duration}
                      </span>
                      <span style={{ color: '#facc15', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                        ★ {featuredSpotlight.rating}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 'var(--text-4xl)', color: '#fff', marginBottom: 'var(--space-3)', fontWeight: 800 }}>
                      {featuredSpotlight.title} <span style={{ fontSize: 'var(--text-xl)', color: 'var(--text-muted)', fontWeight: 400 }}>({featuredSpotlight.year})</span>
                    </h2>

                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: 1.6, marginBottom: 'var(--space-6)', maxWidth: '640px' }}>
                      {featuredSpotlight.description}
                    </p>

                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                      <Link to="/rooms/charade-party" className="btn btn-aurora" style={{ padding: '0.75rem 1.6rem' }}>
                        ▶ Join Live Screening
                      </Link>
                      <Link to="/create-room" className="btn btn-primary" style={{ padding: '0.75rem 1.6rem' }}>
                        + Host New Party
                      </Link>
                      <Link to="/free-movies" className="btn btn-outline" style={{ padding: '0.75rem 1.4rem' }}>
                        All Free Movies
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Private Friends Watch Parties & My Rooms Section */}
      <section className="home-section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div className="flex-between section-header" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <div className="section-tag">Private Friends Watch Parties</div>
              <h2 className="section-title">My Watch Parties</h2>
              <p>Rooms you've created. Friends can only join when you share your secret invite link or code.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Link to="/join-room" className="btn btn-outline btn-sm">
                🔑 Enter with Code
              </Link>
              <Link to="/create-room" className="btn btn-primary btn-sm">
                + Host Private Party
              </Link>
            </div>
          </div>

          {loadingRooms ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              Loading your private rooms...
            </div>
          ) : activeRooms.length === 0 ? (
            <div
              className="card-cinema"
              style={{
                textAlign: 'center',
                padding: 'var(--space-10) var(--space-6)',
                maxWidth: '620px',
                margin: '0 auto',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🍿</div>
              <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                No Active Watch Parties Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
                Vybeora watch parties are completely private. Create a room for movie night, then share your code or link with friends.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/create-room" className="btn btn-primary btn-sm">
                  + Create a Private Room
                </Link>
                <Link to="/join-room" className="btn btn-outline btn-sm">
                  🔑 Join with Code
                </Link>
              </div>
            </div>
          ) : (
            <div className="cards-grid">
              {activeRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={{
                    code: room.code,
                    title: room.title,
                    hostName: room.host_name,
                    movieTitle: room.movie_title || 'Feature Movie',
                    genre: room.genre,
                    participantCount: room.participant_count || 1,
                    maxParticipants: room.max_participants,
                    isLive: room.status === 'active',
                    isPrivate: true,
                  }}
                  canDelete={true}
                  onDelete={handleDeleteRoom}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Real Movie Catalog from Backend */}
      <section className="home-section">
        <div className="container">
          <div className="flex-between section-header">
            <div>
              <div className="section-tag">Authorized Titles</div>
              <h2 className="section-title">Trending for Movie Night</h2>
              <p>Explore authorized films hosted on the platform.</p>
            </div>
            <Link to="/free-movies" className="btn btn-ghost btn-sm">
              View All Free Movies →
            </Link>
          </div>

          {loadingMovies ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              Loading movie catalog...
            </div>
          ) : featuredMovies.length === 0 ? (
            <div className="card-cinema" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No movies available in the catalog yet.</p>
            </div>
          ) : (
            <div className="cards-grid">
              {featuredMovies.slice(0, 4).map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Feature Storytelling Grid */}
      <section className="home-section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto var(--space-12) auto' }}>
            <div className="section-tag">The Vybeora Experience</div>
            <h2 className="section-title">Why Movie Night Feels Better Here</h2>
            <p>Built specifically to solve lag, awkward countdowns, and impersonal group calls.</p>
          </div>

          <div className="features-grid">
            <div className="card-cinema">
              <div className="feature-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Sub-Second Playback Sync</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Host play, pause, and seek commands broadcast via Django Channels. Micro-jitter is automatically smoothed without audio tearing.
              </p>
            </div>

            <div className="card-cinema">
              <div className="feature-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Live Chat & Floating Reactions</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Share hot takes, timestamps, and bursting emoji reactions that float across the player without cluttering the film.
              </p>
            </div>

            <div className="card-cinema">
              <div className="feature-icon-wrapper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Authorized & Private Hangouts</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Share one-click invite links or lock with passwords. Authorized host video upload safeguards private screenings.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
