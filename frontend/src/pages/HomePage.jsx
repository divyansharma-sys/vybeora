import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import movieService from '../services/movieService';
import roomService from '../services/roomService';
import authService from '../services/authService';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const GENRES = ['All', 'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance'];

const CURATED_FALLBACK_MOVIES = [
  {
    id: 1,
    title: 'Night of the Living Dead',
    genre: 'Horror • Classic',
    year: 1968,
    duration: '1h 36m',
    rating: 7.9,
    description: "George A. Romero's groundbreaking independent horror masterpiece. A disparate group of individuals seeks refuge in an abandoned farmhouse when the dead reanimate.",
    poster_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Night_of_the_Living_Dead-1.jpg',
    is_featured: true,
  },
  {
    id: 2,
    title: 'Charade',
    genre: 'Mystery • Romance • Thriller',
    year: 1963,
    duration: '1h 53m',
    rating: 7.9,
    description: "Stanley Donen's iconic mystery starring Cary Grant and Audrey Hepburn. A young widow in Paris is pursued by conspirators seeking her late husband's hidden fortune.",
    poster_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Charade_%281963_poster%29.jpg',
    is_featured: true,
  },
  {
    id: 3,
    title: 'The General',
    genre: 'Action • Comedy • Classic',
    year: 1926,
    duration: '1h 15m',
    rating: 8.1,
    description: "Buster Keaton's comedy and action masterpiece, celebrated for authentic locomotive stunts, physical genius, and visual storytelling.",
    poster_url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/The_general_movie_poster.jpg',
    is_featured: false,
  },
  {
    id: 4,
    title: 'Big Buck Bunny',
    genre: 'Animation • Comedy • Family',
    year: 2008,
    duration: '10m',
    rating: 8.0,
    description: "The acclaimed open-source animated short film by the Blender Institute. A gentle giant rabbit seeks justice against forest bullies.",
    poster_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg',
    is_featured: false,
  },
  {
    id: 5,
    title: 'Tears of Steel',
    genre: 'Sci-Fi • Action',
    year: 2012,
    duration: '12m',
    rating: 7.2,
    description: "Blender Foundation's open-source live-action VFX project set in dystopian Amsterdam exploring cybernetic technology.",
    poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Tos-poster.png/960px-Tos-poster.png.jpg',
    is_featured: false,
  },
  {
    id: 6,
    title: 'Carnival of Souls',
    genre: 'Horror • Mystery • Cult',
    year: 1962,
    duration: '1h 18m',
    rating: 7.1,
    description: "Herk Harvey's eerie, atmospheric cult horror film following an organist drawn to an abandoned pavilion.",
    poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Carnival_of_Souls_poster.jpg/800px-Carnival_of_Souls_poster.jpg',
    is_featured: false,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [movies, setMovies] = useState(CURATED_FALLBACK_MOVIES);
  const [activeRooms, setActiveRooms] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');

  const currentUserName = user?.profile?.display_name || user?.full_name || user?.username || 'Movie Enthusiast';

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const promises = [
        movieService.getMovies().catch(() => ({ results: [] })),
        roomService.getRooms().catch(() => ({ results: [] })),
      ];

      if (isAuthenticated) {
        promises.push(authService.getFriends().catch(() => ({ friends: [] })));
        if (user?.username) {
          promises.push(roomService.getMovieSessions(user.username).catch(() => ({ results: [] })));
        }
      }

      const results = await Promise.all(promises);
      const movieRes = results[0];
      const roomRes = results[1];
      const friendsRes = isAuthenticated ? results[2] : null;
      const sessionRes = isAuthenticated && user?.username ? results[3] : null;

      if (movieRes?.results && movieRes.results.length > 0) {
        setMovies(movieRes.results);
      } else {
        setMovies(CURATED_FALLBACK_MOVIES);
      }
      setActiveRooms(roomRes?.results || []);
      if (friendsRes) setFriendsList(friendsRes?.friends || []);
      if (sessionRes) setRecentSessions(sessionRes?.results || []);
    } catch (e) {
      console.warn('Dashboard load err:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovies = movies.filter((m) => {
    if (selectedGenre === 'All') return true;
    return m.genre?.toLowerCase().includes(selectedGenre.toLowerCase());
  });

  // Pick first featured movie or first available movie from real backend DB
  const featuredMovie = movies.find((m) => m.is_featured) || movies[0] || null;

  return (
    <div className="midnight-dashboard-container">
      {/* 3-Column Cinema Layout */}
      <div className="midnight-dashboard-grid">
        {/* =========================================================
            COLUMN 1: Left Navigation & Real Rooms Sidebar
            ========================================================= */}
        <aside className="midnight-sidebar">
          {/* Main App Navigation */}
          <nav className="sidebar-nav-card">
            <Link to="/" className="sidebar-nav-item active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              Home
            </Link>
            <Link to="/discover" className="sidebar-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              Discover
            </Link>
            <Link to="/free-movies" className="sidebar-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
              </svg>
              Free Movies
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/friends" className="sidebar-nav-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Buddies
                </Link>
                <Link to="/profile" className="sidebar-nav-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2z" />
                  </svg>
                  My Profile
                </Link>
              </>
            )}
            <Link to="/create-room" className="sidebar-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Create Room
            </Link>
          </nav>

          {/* Real Active Rooms Drawer */}
          <div className="sidebar-block">
            <div className="sidebar-section-header">
              <span className="section-label">Active Rooms</span>
              <span className="live-pill">● {activeRooms.length} live</span>
            </div>

            <div className="sidebar-rooms-list">
              {activeRooms.length > 0 ? (
                activeRooms.slice(0, 4).map((room) => (
                  <Link key={room.code || room.id} to={`/rooms/${room.code}`} className="active-room-item">
                    <div className="active-room-thumb" style={{ background: 'linear-gradient(135deg, #2a1f10, #131926)' }}>
                      🎬
                    </div>
                    <div className="active-room-details">
                      <div className="room-title">{room.title || `Room #${room.code}`}</div>
                      <div className="room-sub">
                        Host: {room.host_name || 'Community'} · <span style={{ color: 'var(--accent-teal)' }}>Active</span>
                      </div>
                    </div>
                    <span className="chevron">›</span>
                  </Link>
                ))
              ) : (
                <div style={{ padding: 'var(--space-3) 0', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  No public rooms live right now.
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <Link to="/create-room" className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>
                      + Start One
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Status / App Info Banner */}
          <div className="sidebar-block">
            <div className="sidebar-section-header">
              <span className="section-label">Logged In As</span>
            </div>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
                <Avatar name={currentUserName} size="sm" />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {currentUserName}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-teal)' }}>
                    ● Online & Ready
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>
                Sign in to sync watchlists and invite friends.
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Link to="/login" className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.75rem' }}>
                    Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Tagline footer banner */}
          <div className="sidebar-footer-banner">
            <span className="quote">"Same movie. Different places. One vibe."</span>
          </div>
        </aside>

        {/* =========================================================
            COLUMN 2: Center Main Content Stage
            ========================================================= */}
        <main className="midnight-center-stage">
          {/* 1. Real Database Featured Movie Billboard */}
          <section className="featured-hero-billboard">
            <div
              className="featured-hero-media"
              style={{
                backgroundImage: featuredMovie?.poster_url
                  ? `url(${featuredMovie.poster_url})`
                  : `url('https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80')`,
              }}
            >
              <div className="featured-hero-gradient" />
              <div className="featured-hero-content">
                <span className="featured-eyebrow">
                  {featuredMovie ? `${featuredMovie.genre || 'AUTHORIZED CINEMA'}` : 'FEATURED CINEMA'}
                </span>
                <h1 className="featured-headline">
                  {featuredMovie?.title || 'Good Movies'}
                  <br />
                  <span className="gold-text">
                    {featuredMovie ? `${featuredMovie.year || 'Screening Live'}` : 'Bigger Moments'}
                  </span>
                </h1>
                <p className="featured-copy">
                  {featuredMovie?.description
                    ? featuredMovie.description.slice(0, 130) + '...'
                    : 'Create private rooms, invite your buddies, watch together in sync, and talk live.'}
                </p>

                <div className="featured-cta-row">
                  <Link to="/create-room" className="btn btn-primary btn-lg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Create Watch Party →
                  </Link>
                  <Link to="/free-movies" className="btn btn-secondary btn-lg">
                    Browse All Films
                  </Link>
                </div>
              </div>

              {/* In-Screen Tagline Watermark */}
              <div className="hero-screen-watermark">
                Same movie.<br />
                Different places.<br />
                One vibe.
              </div>
            </div>
          </section>

          {/* 2. Middle Row: Real Movie Catalog Spotlight */}
          <div className="middle-dashboard-split">
            {/* Real Library Spotlight */}
            <div className="card-cinema continue-card">
              <div className="split-header">
                <h3>Cinema Spotlight</h3>
              </div>

              {movies.length > 0 ? (
                <div className="continue-content">
                  <div
                    className="continue-poster"
                    style={{
                      backgroundImage: movies[0]?.poster_url
                        ? `url(${movies[0].poster_url})`
                        : `url('https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=500&q=80')`,
                    }}
                  />
                  <div className="continue-meta">
                    <div className="continue-title">{movies[0]?.title}</div>
                    <div className="continue-genre">{movies[0]?.genre} · {movies[0]?.year}</div>
                    <div className="continue-remaining">{movies[0]?.duration || 'Full length film'}</div>
                  </div>

                  <Link to="/create-room" className="continue-play-circle" title="Screen this film">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#0b0f17">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  Loading authorized titles from database...
                </div>
              )}
            </div>

            {/* Real Catalog Highlights */}
            <div className="card-cinema watchlist-card">
              <div className="split-header">
                <h3>Authorized Titles</h3>
                <Link to="/free-movies" className="view-all-link">View All →</Link>
              </div>

              <div className="watchlist-mini-grid">
                {movies.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="watchlist-mini-poster"
                    title={m.title}
                    style={{
                      backgroundImage: m.poster_url ? `url(${m.poster_url})` : 'none',
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    <div className="mini-tag">
                      {m.title}
                      <br />
                      <span>{m.year}</span>
                    </div>
                  </div>
                ))}
                <Link to="/free-movies" className="watchlist-add-pill" title="Explore All Movies">
                  +
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Explore Movies Grid with Genre Pills from Real Database */}
          <section className="explore-section">
            <div className="split-header" style={{ marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-xl)', color: '#fff' }}>Explore Real Movie Catalog</h3>
              </div>
              <Link to="/free-movies" className="view-all-link">View All ({movies.length}) →</Link>
            </div>

            {/* Genre Filter Pills */}
            <div className="genre-pills-row">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`genre-pill ${selectedGenre === g ? 'active' : ''}`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Cinematic Posters Grid from Real Database */}
            {filteredMovies.length > 0 ? (
              <div className="explore-posters-grid">
                {filteredMovies.slice(0, 8).map((m) => (
                  <div
                    key={m.id}
                    className="explore-movie-card"
                    onClick={() => navigate('/free-movies')}
                  >
                    <div
                      className="explore-poster-frame"
                      style={{
                        backgroundImage: m.poster_url
                          ? `url(${m.poster_url})`
                          : `url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80')`,
                      }}
                    />
                    <div className="explore-card-meta">
                      <div className="explore-card-title">{m.title}</div>
                      <div className="explore-card-sub">{m.year || 'Authorized'} · {m.genre || 'Cinema'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No movies found in this genre.
              </div>
            )}
          </section>
        </main>

        {/* =========================================================
            COLUMN 3: Right Buddies & Social Schedule Rail
            ========================================================= */}
        <aside className="midnight-right-rail">
          {/* Real Friends Online Status Block */}
          <div className="right-rail-card">
            <div className="rail-header">
              <span className="rail-title">My Buddies</span>
              <span className="teal-badge">● {friendsList.length} total</span>
            </div>

            <div className="friends-online-list">
              {isAuthenticated ? (
                friendsList.length > 0 ? (
                  friendsList.slice(0, 5).map((f) => {
                    const friendUser = f.friend || f;
                    const name = friendUser.profile?.display_name || friendUser.username || 'Friend';
                    return (
                      <div key={f.id || friendUser.username} className="friend-online-row">
                        <Avatar name={name} size="md" />
                        <div className="friend-info">
                          <div className="friend-name">{name}</div>
                          <div className="friend-status">
                            <span style={{ color: 'var(--accent-teal)' }}>● Added Buddy</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-2) 0', textAlign: 'center' }}>
                    You haven't added any buddies yet.
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <Link to="/friends" className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem' }}>
                        Find Buddies
                      </Link>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-2) 0', textAlign: 'center' }}>
                  Sign in to view your friends and send watch party invites.
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <Link to="/login" className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem' }}>
                      Sign In
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {isAuthenticated && friendsList.length > 0 && (
              <Link to="/friends" className="rail-link-footer">
                Manage Friends ({friendsList.length}) →
              </Link>
            )}
          </div>

          {/* Quick Start Watch Party Card */}
          <div className="right-rail-card schedule-card">
            <div className="schedule-meta-badge">
              <span>🍿 Private Cinema Room</span>
              <div className="schedule-time">Instant Live Sync</div>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Launch an encrypted watch room with real-time video playback synchronization and WebRTC audio chat.
            </p>

            <Link
              to="/create-room"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: 'var(--text-xs)', padding: '0.55rem', textAlign: 'center' }}
            >
              + Create New Room
            </Link>
          </div>

          {/* Great Movies are Better Together Box */}
          <div className="watch-together-promo-box">
            <div className="promo-copy">
              <h4>Great movies are better together 💛</h4>
              <p>Host an intimate private screening with one click.</p>
            </div>
            <Link to="/create-room" className="btn btn-primary" style={{ width: '100%', fontSize: 'var(--text-xs)' }}>
              Invite Friends
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HomePage;
