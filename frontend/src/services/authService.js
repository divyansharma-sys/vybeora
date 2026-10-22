import apiClient from './apiClient';

export const authService = {
  signup: async (userData) => {
    return apiClient.post('/auth/signup/', userData);
  },

  login: async (credentials) => {
    return apiClient.post('/auth/login/', credentials);
  },

  logout: async (refreshToken) => {
    return apiClient.post('/auth/logout/', { refresh: refreshToken });
  },

  getCurrentUser: async () => {
    return apiClient.get('/auth/me/');
  },

  updateProfile: async (profileData) => {
    return apiClient.patch('/auth/me/', profileData);
  },

  forgotPassword: async (email) => {
    return apiClient.post('/auth/forgot-password/', { email });
  },

  resetPassword: async (resetData) => {
    return apiClient.post('/auth/reset-password/', resetData);
  },

  refreshToken: async (refresh) => {
    return apiClient.post('/auth/token/refresh/', { refresh });
  },

  // Friends & Direct Invitations
  getFriends: async () => {
    return apiClient.get('/auth/friends/');
  },

  searchUsers: async (query) => {
    return apiClient.get(`/auth/friends/search/?q=${encodeURIComponent(query)}`);
  },

  sendFriendRequest: async (username) => {
    const res = await apiClient.post('/auth/friends/request/', { username });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vybeora_notifications_update'));
      try { localStorage.setItem('vybeora_notif_sync', String(Date.now())); } catch (_) {}
    }
    return res;
  },

  respondFriendRequest: async (friendshipId, action) => {
    const res = await apiClient.patch('/auth/friends/request/', { friendship_id: friendshipId, action });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vybeora_notifications_update'));
      try { localStorage.setItem('vybeora_notif_sync', String(Date.now())); } catch (_) {}
    }
    return res;
  },

  removeFriend: async (friendshipId) => {
    const res = await apiClient.delete(`/auth/friends/request/?friendship_id=${friendshipId}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vybeora_notifications_update'));
      try { localStorage.setItem('vybeora_notif_sync', String(Date.now())); } catch (_) {}
    }
    return res;
  },

  sendRoomInvite: async (recipientUsername, roomCode) => {
    const res = await apiClient.post('/auth/invitations/', {
      recipient_username: recipientUsername,
      room_code: roomCode,
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vybeora_notifications_update'));
      try { localStorage.setItem('vybeora_notif_sync', String(Date.now())); } catch (_) {}
    }
    return res;
  },

  getRoomInvites: async () => {
    return apiClient.get('/auth/invitations/');
  },
};

export default authService;
