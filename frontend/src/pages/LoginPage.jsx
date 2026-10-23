import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forgot Password modal/view state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setError(null);

    try {
      const res = await authService.forgotPassword(forgotEmail);
      setForgotMsg(res.message || 'If an account exists, a recovery link has been prepared.');
    } catch (err) {
      setError(err.message || 'Failed to submit password recovery request.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: 'calc(100vh - var(--navbar-height) - 150px)', padding: 'var(--space-12) var(--space-4)' }}>
      <div className="card-cinema" style={{ width: '100%', maxWidth: '440px', padding: 'var(--space-8)' }}>
        {/* Back to Home Button */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Link
            to="/"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: 'var(--radius-full)',
              padding: '0.35rem 0.8rem',
              fontSize: 'var(--text-xs)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            ← Back to Home
          </Link>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div className="badge badge-accent" style={{ marginBottom: 'var(--space-3)' }}>
            Welcome Back
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-1)' }}>
            Sign In to <span className="text-gradient">Vybeora</span>
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Your people. Your vibe. Your movie night.
          </p>
        </div>

        {error && (
          <div className="badge badge-error" style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-5)', whiteSpace: 'normal', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!showForgot ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="name@domain.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setError(null); }}
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-blue)', background: 'none' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem' }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Don't have an account yet?{' '}
              <Link to="/register" style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>
                Create one now
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="animate-fade-in">
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>Reset Your Password</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Enter your registered email address to receive password reset instructions.
            </p>

            {forgotMsg ? (
              <div className="badge badge-healthy" style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-4)', whiteSpace: 'normal', textAlign: 'center' }}>
                ✓ {forgotMsg}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Account Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@domain.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setForgotMsg(null);
                  setError(null);
                }}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Back to Sign In
              </button>
              {!forgotMsg && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Sending...' : 'Send Link'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
