import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      setFieldErrors({ confirm_password: 'Passwords do not match.' });
      return;
    }

    if (!agreeTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setLoading(true);

    try {
      await signup({
        full_name: fullName,
        username: username.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        agree_terms: agreeTerms,
      });

      navigate('/onboarding');
    } catch (err) {
      const details = err.details?.error?.details || err.details;
      if (details && typeof details === 'object') {
        setFieldErrors(details);
        const firstErrorKey = Object.keys(details)[0];
        const val = details[firstErrorKey];
        const msg = Array.isArray(val) ? val.join(' ') : val;
        setError(`${firstErrorKey}: ${msg}`);
      } else {
        setError(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: 'calc(100vh - var(--navbar-height) - 150px)', padding: 'var(--space-12) var(--space-4)' }}>
      <div className="card-cinema" style={{ width: '100%', maxWidth: '480px', padding: 'var(--space-8)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div className="badge badge-aurora" style={{ marginBottom: 'var(--space-3)' }}>
            Join the Community
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-1)' }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Host watch parties and invite friends to synchronized movie nights.
          </p>
        </div>

        {error && (
          <div className="badge badge-error" style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-5)', whiteSpace: 'normal', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Maya Lin"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="maya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {fieldErrors.email && (
                <span style={{ fontSize: '0.72rem', color: 'var(--status-error)' }}>
                  {Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : fieldErrors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Username (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="mayalin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              {fieldErrors.username && (
                <span style={{ fontSize: '0.72rem', color: 'var(--status-error)' }}>
                  {Array.isArray(fieldErrors.username) ? fieldErrors.username[0] : fieldErrors.username}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '0.72rem', color: 'var(--status-error)' }}>
                {Array.isArray(fieldErrors.password) ? fieldErrors.password[0] : fieldErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ marginTop: '2px', accentColor: 'var(--accent-violet)' }}
                required
              />
              <span>
                I agree to the <Link to="/terms" style={{ color: 'var(--accent-aurora)' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: 'var(--accent-aurora)' }}>Privacy Policy</Link>.
              </span>
            </label>
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Vybeora Account'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
