/**
 * Centralized API Client for Vybeora
 * Wraps native Fetch API with authentication token handling,
 * standardized headers, base URL management, and structured error reporting.
 */

const isNativeAndroid = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' ||
  window.location.hostname === 'localhost' && window.navigator?.userAgent?.includes('Android')
);

// In native Android WebView, relative '/api' points to localhost inside device instead of host machine.
const DEFAULT_HOST = isNativeAndroid ? 'http://192.168.1.16:8000' : '';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (DEFAULT_HOST ? `${DEFAULT_HOST}/api` : '/api');

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Core HTTP request handler
 */
async function request(endpoint, options = {}) {
  // Normalize URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  } else {
    // Let browser set multipart/form-data boundary automatically
    delete headers['Content-Type'];
  }

  // Attach JWT token if available
  const token = localStorage.getItem('vybeora_access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If 401 Unauthorized occurs due to an expired/invalid token, attempt token refresh
    if (response.status === 401 && token) {
      const refreshToken = localStorage.getItem('vybeora_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData?.access) {
              localStorage.setItem('vybeora_access_token', refreshData.access);
              headers['Authorization'] = `Bearer ${refreshData.access}`;
              // Retry original request with refreshed access token
              response = await fetch(url, { ...config, headers });
            }
          } else {
            // Refresh token also invalid/expired: clear stale tokens
            localStorage.removeItem('vybeora_access_token');
            localStorage.removeItem('vybeora_refresh_token');
            delete headers['Authorization'];
            // Retry request unauthenticated (works for AllowAny endpoints like room deletion/joining)
            response = await fetch(url, { ...config, headers });
          }
        } catch {
          localStorage.removeItem('vybeora_access_token');
          delete headers['Authorization'];
          response = await fetch(url, { ...config, headers });
        }
      } else {
        localStorage.removeItem('vybeora_access_token');
        delete headers['Authorization'];
        response = await fetch(url, { ...config, headers });
      }
    }

    // Handle No-Content responses (204)
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Extract structured error details returned by backend custom_exception_handler
      const errorMessage =
        data?.error?.message ||
        data?.detail ||
        `Request failed with status ${response.status}`;
      const errorDetails = data?.error?.details || data;

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors, timeouts, or DNS failures
    throw new ApiError(
      error.message || 'Unable to connect to the Vybeora server. Please verify your connection.',
      0,
      null
    );
  }
}

export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },
  put: (endpoint, body, options = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },
  patch: (endpoint, body, options = {}) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body),
    });
  },
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Diagnostic health check against the Django backend
   */
  checkHealth: () => request('/health/'),
};

export default apiClient;
