import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute:
 * 1. Checks if auth state is loading; shows a sleek spinner.
 * 2. If user is NOT authenticated, redirects to /login.
 * 3. If authenticated but has not completed onboarding, redirects to /onboarding.
 */
export function ProtectedRoute({ children, allowUnboarded = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          Authenticating Vybeora session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasOnboarded =
    localStorage.getItem('vybeora_onboarded') === 'true' ||
    Boolean(user?.profile?.display_name && user?.profile?.bio);

  if (!hasOnboarded && !allowUnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export default ProtectedRoute;
