import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import './Navbar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '✦' },
  { path: '/free-movies', label: 'Free Movies', icon: '★', badge: 'HD' },
  { path: '/friends', label: 'Friends', icon: '👥' },
  { path: '/create-room', label: 'Create Room', icon: '⚡' },
  { path: '/join-room', label: 'Join Room', icon: '🔑' },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Real-time polling & reactive event listener for pending room invitations & friend requests
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchNotifications = async () => {
      try {
        const [invites, friendsData] = await Promise.all([
          authService.getRoomInvites().catch(() => []),
          authService.getFriends().catch(() => ({ incoming_requests: [] })),
        ]);
        setPendingInvites(invites || []);
        setIncomingFriendRequests(friendsData?.incoming_requests || []);
      } catch (e) {
        // quiet ignore
      }
    };

    fetchNotifications();

    // Fast 2.5s poll so incoming notifications appear immediately without reload
    const interval = setInterval(fetchNotifications, 2500);

    // Also fetch immediately on window focus, visibilitychange, local storage events, and custom notification sync
    const handleImmediateUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('focus', handleImmediateUpdate);
    document.addEventListener('visibilitychange', handleImmediateUpdate);
    window.addEventListener('vybeora_notifications_update', handleImmediateUpdate);
    window.addEventListener('storage', handleImmediateUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleImmediateUpdate);
      document.removeEventListener('visibilitychange', handleImmediateUpdate);
      window.removeEventListener('vybeora_notifications_update', handleImmediateUpdate);
      window.removeEventListener('storage', handleImmediateUpdate);
    };
  }, [isAuthenticated]);

  const handleRespondFriendRequest = async (requestId, action) => {
    try {
      await authService.respondFriendRequest(requestId, action);
      // Immediately remove from state
      setIncomingFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      alert(e.message || 'Action failed');
    }
  };

  const totalNotificationCount = pendingInvites.length + incomingFriendRequests.length;

  // Magnetic sliding pill tracking
  const navContainerRef = useRef(null);
  const itemRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [hoverPillStyle, setHoverPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Update active pill position whenever route changes
  useEffect(() => {
    const currentPath = location.pathname;
    let activeKey = NAV_ITEMS.find((item) => item.path === currentPath)?.path;
    if (!activeKey) {
      if (currentPath.startsWith('/movies')) activeKey = '/free-movies';
      else if (currentPath.startsWith('/rooms') || currentPath.startsWith('/watch')) activeKey = null;
    }

    if (activeKey && itemRefs.current[activeKey] && navContainerRef.current) {
      const el = itemRefs.current[activeKey];
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPillStyle({
        left: elRect.left - containerRect.left,
        width: elRect.width,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname]);

  const handleMouseEnter = (path) => {
    const el = itemRefs.current[path];
    if (el && navContainerRef.current) {
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setHoverPillStyle({
        left: elRect.left - containerRect.left,
        width: elRect.width,
        opacity: 1,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverPillStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Brand Logo & Play-Wave Icon */}
        <Link to="/" className="brand-link" aria-label="Vybeora Home">
          <div className="brand-logo-icon">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 6L16 26L26 6"
                stroke="url(#brandGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="11" r="2.5" fill="#38BDF8" />
              <defs>
                <linearGradient id="brandGrad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8B5CF6" />
                  <stop offset="0.5" stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#2DD4BF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-title">
            Vybe<span className="brand-highlight">ora</span>
          </span>
        </Link>

        {/* Futuristic Floating Capsule Nav with Sliding Pill Indicator */}
        <nav className="desktop-nav">
          <div
            className="capsule-nav-container"
            ref={navContainerRef}
            onMouseLeave={handleMouseLeave}
          >
            {/* Magnetic Hover Indicator */}
            <div
              className="capsule-hover-pill"
              style={{
                transform: `translateX(${hoverPillStyle.left}px)`,
                width: `${hoverPillStyle.width}px`,
                opacity: hoverPillStyle.opacity,
              }}
            />

            {/* Active Route Gliding Glow Pill */}
            <div
              className="capsule-active-pill"
              style={{
                transform: `translateX(${pillStyle.left}px)`,
                width: `${pillStyle.width}px`,
                opacity: pillStyle.opacity,
              }}
            />

            <ul className="nav-capsule-links">
              {NAV_ITEMS.map((item) => {
                const badgeText = item.path === '/friends' && incomingFriendRequests.length > 0
                  ? String(incomingFriendRequests.length)
                  : item.badge;

                return (
                  <li
                    key={item.path}
                    ref={(el) => (itemRefs.current[item.path] = el)}
                    onMouseEnter={() => handleMouseEnter(item.path)}
                  >
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) => `nav-capsule-item ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-label">{item.label}</span>
                      {badgeText && (
                        <span
                          className="nav-item-badge"
                          style={
                            item.path === '/friends' && incomingFriendRequests.length > 0
                              ? { background: 'var(--accent-pink)', color: '#fff', fontWeight: 800 }
                              : undefined
                          }
                        >
                          {badgeText}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Action Controls & Mobile Toggle */}
        <div className="nav-actions">
          {isAuthenticated && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="btn btn-ghost btn-sm"
                style={{ position: 'relative', padding: '0.4rem 0.6rem', fontSize: '1.1rem' }}
                title="Notifications"
                aria-label="Notifications"
              >
                🔔
                {totalNotificationCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: 'var(--accent-pink)',
                      color: '#fff',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px rgba(244, 63, 94, 0.7)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  >
                    {totalNotificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className="card-cinema animate-fade-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '120%',
                    width: '320px',
                    padding: 'var(--space-4)',
                    zIndex: 100,
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-glow)',
                    maxHeight: '420px',
                    overflowY: 'auto',
                  }}
                >
                  <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Notifications
                    </div>
                    {totalNotificationCount > 0 && (
                      <span className="badge badge-accent" style={{ fontSize: '0.62rem' }}>
                        {totalNotificationCount} new
                      </span>
                    )}
                  </div>

                  {/* 1. Friend Requests Section */}
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-aurora)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      👥 Friend Requests ({incomingFriendRequests.length})
                    </div>
                    {incomingFriendRequests.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: 'var(--space-1) 0' }}>
                        No pending friend requests.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {incomingFriendRequests.map((req) => (
                          <div
                            key={req.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              padding: 'var(--space-2) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {req.requester?.profile?.display_name || req.requester?.username}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                              @{req.requester?.username} sent you a friend request
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                              <button
                                onClick={() => handleRespondFriendRequest(req.id, 'accept')}
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0' }}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRespondFriendRequest(req.id, 'decline')}
                                className="btn btn-outline btn-sm"
                                style={{ flex: 1, fontSize: '0.68rem', padding: '0.25rem 0' }}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-3) 0' }} />

                  {/* 2. Watch Party Room Invitations */}
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🎬 Room Invitations ({pendingInvites.length})
                    </div>
                    {pendingInvites.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: 'var(--space-1) 0' }}>
                        No pending room invitations.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {pendingInvites.map((inv) => (
                          <div
                            key={inv.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              padding: 'var(--space-2) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                              {inv.sender?.profile?.display_name || inv.sender?.username} invited you!
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Room #{inv.room_code} • {inv.movie_title || inv.room_title || 'Watch Party'}
                            </div>
                            <Link
                              to={`/rooms/${inv.room_code}`}
                              onClick={() => setNotificationsOpen(false)}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.68rem', padding: '0.25rem 0', textAlign: 'center', marginTop: '4px' }}
                            >
                              🍿 Join Watch Party
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="btn btn-ghost btn-sm hide-mobile"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0.4rem 0.75rem' }}
              >
                <div className="nav-avatar" style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>
                  {(user?.profile?.display_name || user?.full_name || user?.username || 'U')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 'var(--text-xs)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.profile?.display_name || user?.full_name || user?.username}
                </span>
                <span style={{ fontSize: '0.65rem' }}>▼</span>
              </button>

              {userMenuOpen && (
                <div
                  className="card-cinema animate-fade-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    width: '180px',
                    padding: 'var(--space-2)',
                    zIndex: 100,
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    👤 My Profile
                  </Link>
                  <Link
                    to="/friends"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    👥 Friends & Crew
                  </Link>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-1) 0' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--status-error)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm hide-mobile">
              Sign In
            </Link>
          )}

          {/* Direct Android APK Download Button */}
          <a
            href="/Vybeora.apk"
            download="Vybeora.apk"
            className="btn btn-outline btn-sm hide-mobile"
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: 'rgba(56, 189, 248, 0.06)',
            }}
            title="Download Vybeora Android APK"
          >
            <span>🤖</span>
            <span>Get APK</span>
          </a>

          <Link to="/create-room" className="btn btn-primary btn-sm">
            <span>+</span> Create Room
          </Link>

          {/* Mobile hamburger button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer animate-fade-in">
          <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Link to="/" onClick={() => setMobileOpen(false)} className="mobile-drawer-link">
              Home
            </Link>
            <Link to="/free-movies" onClick={() => setMobileOpen(false)} className="mobile-drawer-link" style={{ color: 'var(--accent-aurora)' }}>
              ★ Free Movies
            </Link>
            <Link to="/friends" onClick={() => setMobileOpen(false)} className="mobile-drawer-link" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👥 Friends</span>
              {incomingFriendRequests.length > 0 && (
                <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                  {incomingFriendRequests.length} new
                </span>
              )}
            </Link>
            <Link to="/create-room" onClick={() => setMobileOpen(false)} className="mobile-drawer-link">
              Create Room
            </Link>
            <Link to="/join-room" onClick={() => setMobileOpen(false)} className="mobile-drawer-link">
              Join Room
            </Link>
            <Link to="/profile" onClick={() => setMobileOpen(false)} className="mobile-drawer-link">
              My Profile
            </Link>
            <a
              href="/Vybeora.apk"
              download="Vybeora.apk"
              onClick={() => setMobileOpen(false)}
              className="btn btn-outline btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: 'var(--accent-cyan)',
                background: 'rgba(56, 189, 248, 0.08)',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                marginTop: 'var(--space-2)',
              }}
            >
              <span>🤖</span>
              <span>Download Android App (.apk)</span>
            </a>
            <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-3)' }}>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                Register
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
