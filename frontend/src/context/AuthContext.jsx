import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check current user session on mount/refresh
  const checkAuth = useCallback(async () => {
    const accessToken = localStorage.getItem('vybeora_access_token');
    const refreshToken = localStorage.getItem('vybeora_refresh_token');

    if (!accessToken && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      localStorage.setItem('vybeora_user', userData.full_name || userData.username);
    } catch (err) {
      // If access token expired, attempt token refresh
      if (refreshToken) {
        try {
          const res = await authService.refreshToken(refreshToken);
          if (res?.access) {
            localStorage.setItem('vybeora_access_token', res.access);
            const userData = await authService.getCurrentUser();
            setUser(userData);
            localStorage.setItem('vybeora_user', userData.full_name || userData.username);
            return;
          }
        } catch (refreshErr) {
          // Both tokens invalid or revoked
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const clearAuthData = () => {
    localStorage.removeItem('vybeora_access_token');
    localStorage.removeItem('vybeora_refresh_token');
    setUser(null);
  };

  const login = async (identifier, password) => {
    setError(null);
    try {
      const response = await authService.login({ identifier, password });
      if (!response || !response.user || !response.tokens) {
        throw new Error(response?.error?.message || response?.message || 'Login failed. Please check your credentials.');
      }
      const { user: userData, tokens } = response;

      localStorage.setItem('vybeora_access_token', tokens.access);
      localStorage.setItem('vybeora_refresh_token', tokens.refresh);
      localStorage.setItem('vybeora_user', userData.full_name || userData.username);
      setUser(userData);

      return userData;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    }
  };

  const signup = async (formData) => {
    setError(null);
    try {
      const response = await authService.signup(formData);
      if (!response || !response.user || !response.tokens) {
        throw new Error(response?.error?.message || response?.message || 'Registration failed. Please try again.');
      }
      const { user: userData, tokens } = response;

      localStorage.setItem('vybeora_access_token', tokens.access);
      localStorage.setItem('vybeora_refresh_token', tokens.refresh);
      localStorage.setItem('vybeora_user', userData.full_name || userData.username);
      setUser(userData);

      return userData;
    } catch (err) {
      setError(err.message || 'Signup failed.');
      throw err;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('vybeora_refresh_token');
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (e) {
      console.warn('Logout revocation warning:', e);
    } finally {
      clearAuthData();
    }
  };

  const updateProfile = async (profileData) => {
    const updated = await authService.updateProfile(profileData);
    setUser(updated);
    localStorage.setItem('vybeora_user', updated.full_name || updated.username);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        updateProfile,
        checkAuth,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
