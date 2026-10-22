import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(
    user?.profile?.display_name || user?.full_name || user?.username || ''
  );
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [favoriteVibe, setFavoriteVibe] = useState('chill'); // 'chill' | 'thriller' | 'party' | 'nostalgic'
  const [saving, setSaving] = useState(false);

  const GENRES = [
    { id: 'horror', label: 'Horror', icon: '👻' },
    { id: 'sci-fi', label: 'Sci-Fi', icon: '🚀' },
    { id: 'comedy', label: 'Comedy', icon: '🍿' },
    { id: 'mystery', label: 'Mystery', icon: '🕵️' },
    { id: 'classics', label: 'Vintage Classics', icon: '📽️' },
    { id: 'action', label: 'Adventure', icon: '⚡' },
  ];

  const VIBES = [
    { id: 'chill', title: 'Late Night Chill', desc: 'Relaxing ambient movie night with close friends' },
    { id: 'party', title: 'Rowdy Watch Party', desc: 'Active chats, emoji reactions, and popcorn throwing' },
    { id: 'cinema', title: 'Deep Cinema Lounge', desc: 'Focus on film classics, indie discoveries, and discussion' },
  ];

  const toggleGenre = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (updateProfile && displayName.trim()) {
        await updateProfile({
          display_name: displayName.trim(),
          bio: `Loves ${selectedGenres.join(', ') || 'movies'}. Favorite vibe: ${favoriteVibe}.`,
        });
      }
    } catch (e) {
      console.warn('Could not update profile during onboarding:', e);
    } finally {
      localStorage.setItem('vybeora_onboarded', 'true');
      setSaving(false);
      navigate('/', { replace: true });
    }
  };

  return (
    <div
      className="container flex-center"
      style={{
        minHeight: 'calc(100vh - var(--navbar-height) - 100px)',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <div
        className="card-cinema"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: 'var(--space-8)',
          boxShadow: 'var(--glow-primary)',
        }}
      >
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: s === step ? '28px' : '10px',
                  height: '6px',
                  borderRadius: 'var(--radius-full)',
                  background: s <= step ? 'var(--gradient-violet-blue)' : 'rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Step {step} of 3
          </span>
        </div>

        {/* STEP 1: Profile Display Name & Avatar */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>👋</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Welcome to Vybeora!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                Set up your public persona so friends know who is in the party.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label">Display Name / Nickname</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CinemaWizard, Alex_99"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                required
              />
              <span className="form-hint">This name appears in watch parties, live chat, and votes.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!displayName.trim()}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Movie Tastes & Genres */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🍿</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>What do you like to watch?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                Pick genres you enjoy to help your friends pick the best watch party films.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-6)',
              }}
            >
              {GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGenre(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--accent-violet)' : '1px solid var(--border-subtle)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{g.icon}</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: isSelected ? 600 : 500 }}>
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                Next: Choose Vibe →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Vibe Selection & Complete */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>✨</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Choose Your Vibe</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                How do you normally like to spend your movie nights?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {VIBES.map((v) => {
                const isSelected = favoriteVibe === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setFavoriteVibe(v.id)}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-aurora)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                      {v.title}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {v.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? 'Setting up...' : '🚀 Enter Vybeora'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingPage;
