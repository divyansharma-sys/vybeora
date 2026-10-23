import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import MovieCard from '../components/movie/MovieCard';
import roomService from '../services/roomService';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('settings'); // 'saved', 'history', 'memories', 'settings'
  const [displayName, setDisplayName] = useState(user?.profile?.display_name || user?.full_name || user?.username || 'Movie Enthusiast');
  const [bio, setBio] = useState(user?.profile?.bio || 'Sci-Fi buff, late night movie watcher, film score enthusiast.');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Movie Night Memories / History state
  const [memories, setMemories] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [ratingInput, setRatingInput] = useState({}); // { [sessionId]: rating }
  const [reviewInput, setReviewInput] = useState({});

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'memories') {
      fetchMemories();
    }
  }, [activeTab]);

  const fetchMemories = async () => {
    setMemoriesLoading(true);
    try {
      const data = await roomService.getMovieSessions(user?.username);
      setMemories(data?.results || data || []);
    } catch (e) {
      console.warn('Could not load movie memories:', e);
    } finally {
      setMemoriesLoading(false);
    }
  };

  const handleRateSession = async (sessionId) => {
    const r = ratingInput[sessionId] || 5;
    const rev = reviewInput[sessionId] || '';
    try {
      await roomService.submitSessionRating(sessionId, {
        username: user?.username || displayName,
        rating: r,
        review: rev,
      });
      alert('Thank you! Your rating and review have been saved.');
      fetchMemories();
    } catch (e) {
      alert(e.message || 'Failed to submit rating');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        display_name: displayName,
        bio: bio,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0 var(--space-20) 0' }}>
      {/* Top Navigation Bar with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-full)',
            padding: '0.45rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </button>
      </div>

      {/* Profile Header Banner */}
      <div
        className="card-cinema"
        style={{
          padding: 'var(--space-8)',
          marginBottom: 'var(--space-8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <Avatar name={displayName} size="xl" status="online" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0 }}>{displayName}</h1>
              <span className="badge badge-aurora" style={{ fontSize: '0.65rem' }}>
                Verified Cinephile
              </span>
            </div>
            <p style={{ margin: 'var(--space-2) 0', color: 'var(--text-secondary)', maxWidth: '520px' }}>
              {bio}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>✉️ {user?.email || 'Authenticated User'}</span>
              <span>⭐ Username: @{user?.username}</span>
              <span>🎬 Active Member</span>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--status-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="card-glass"
        style={{
          display: 'flex',
          padding: 'var(--space-2)',
          marginBottom: 'var(--space-8)',
          maxWidth: '480px',
        }}
      >
        <button
          onClick={() => setActiveTab('settings')}
          className={activeTab === 'settings' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          style={{ flex: 1, borderRadius: 'var(--radius-lg)' }}
        >
          Edit Profile
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={activeTab === 'saved' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          style={{ flex: 1, borderRadius: 'var(--radius-lg)' }}
        >
          Saved Movies
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          style={{ flex: 1, borderRadius: 'var(--radius-lg)' }}
        >
          Watch History
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'settings' && (
        <div className="card-cinema" style={{ maxWidth: '580px', padding: 'var(--space-8)' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Account Preferences</h3>

          {saveSuccess && (
            <div className="badge badge-healthy" style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              ✓ Profile preferences successfully updated!
            </div>
          )}

          {error && (
            <div className="badge badge-error" style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bio & Interests</label>
              <textarea
                className="form-input"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
                disabled={saving}
              >
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'saved' && (
        <div>
          <div className="section-header">
            <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Watchlist & Saved Titles</h3>
            <p>Movies you plan to watch during future room hangouts.</p>
          </div>
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No saved movies yet. Explore <a href="/free-movies" style={{ color: 'var(--accent-aurora)' }}>Free Movies</a> to add titles to your watchlist.
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="section-header">
            <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>🎞️ Movie Night Memories & Reviews</h3>
            <p>Every watch party you host or attend is preserved here with group ratings and thoughts.</p>
          </div>

          {memoriesLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading your movie night memories...
            </div>
          ) : memories.length === 0 ? (
            <div className="card-cinema" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🍿</div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Movie Memories Yet
              </div>
              <p style={{ fontSize: 'var(--text-xs)', maxWidth: '380px', margin: 'var(--space-2) auto' }}>
                When you host a watch party and click <strong>End Party & Save</strong>, the memory will be recorded here forever.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {memories.map((sess) => (
                <div
                  key={sess.id}
                  className="card-cinema"
                  style={{
                    padding: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div className="flex-between">
                    <div>
                      <div className="badge badge-accent" style={{ fontSize: '0.65rem', marginBottom: 'var(--space-1)' }}>
                        {sess.vibe_tag || 'Movie Night'}
                      </div>
                      <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
                        {sess.movie_title}
                      </h4>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Party: {sess.title} • Hosted by @{sess.host_username} • {new Date(sess.watched_at).toLocaleDateString()}
                      </div>
                    </div>
                    {sess.average_rating ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#fbbf24' }}>
                          ★ {sess.average_rating} / 5
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {sess.ratings?.length} ratings
                        </div>
                      </div>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                        No ratings yet
                      </span>
                    )}
                  </div>

                  {sess.participants && sess.participants.length > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      👥 <strong>Crew:</strong> {sess.participants.join(', ')}
                    </div>
                  )}

                  {/* Rating / Review Submission Form */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      marginTop: 'var(--space-2)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--accent-aurora)' }}>
                      ⭐ Rate this Movie Night
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        className="form-input"
                        value={ratingInput[sess.id] || 5}
                        onChange={(e) => setRatingInput({ ...ratingInput, [sess.id]: parseInt(e.target.value) })}
                        style={{ width: '110px', padding: '0.4rem 0.6rem', fontSize: 'var(--text-xs)' }}
                      >
                        <option value="5">★★★★★ (5)</option>
                        <option value="4">★★★★☆ (4)</option>
                        <option value="3">★★★☆☆ (3)</option>
                        <option value="2">★★☆☆☆ (2)</option>
                        <option value="1">★☆☆☆☆ (1)</option>
                      </select>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Write a quick thought or review..."
                        value={reviewInput[sess.id] || ''}
                        onChange={(e) => setReviewInput({ ...reviewInput, [sess.id]: e.target.value })}
                        style={{ flex: 1, minWidth: '180px', padding: '0.4rem 0.6rem', fontSize: 'var(--text-xs)' }}
                      />
                      <button
                        onClick={() => handleRateSession(sess.id)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 'var(--text-xs)' }}
                      >
                        Save Rating
                      </button>
                    </div>

                    {/* Existing reviews */}
                    {sess.ratings && sess.ratings.length > 0 && (
                      <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sess.ratings.map((r) => (
                          <div key={r.id} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>@{r.username}</strong> ({r.rating}★): {r.review || 'No review text'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
