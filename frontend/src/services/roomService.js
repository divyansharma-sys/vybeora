import apiClient from './apiClient';

export const roomService = {
  getRooms: () => apiClient.get('/rooms/'),

  getRoomByCode: (code) => apiClient.get(`/rooms/${code}/`),

  createRoom: (roomData) => apiClient.post('/rooms/', roomData),

  joinRoom: (code, payload = {}) => apiClient.post(`/rooms/${code}/join/`, payload),

  uploadVideo: (code, formData) =>
    apiClient.post(`/rooms/${code}/upload-video/`, formData),

  selectVideo: (code, payload) => apiClient.post(`/rooms/${code}/select-video/`, payload),

  deleteRoom: (code) => apiClient.delete(`/rooms/${code}/`),
  
  getWatchlist: (code) => apiClient.get(`/rooms/${code}/watchlist/`),
  
  addToWatchlist: (code, payload) => apiClient.post(`/rooms/${code}/watchlist/`, payload),
  
  removeFromWatchlist: (code, itemId) =>
    apiClient.delete(`/rooms/${code}/watchlist/?item_id=${itemId}`),
  
  voteWatchlist: (code, payload) => apiClient.post(`/rooms/${code}/watchlist/vote/`, payload),
  
  selectWinnerWatchlist: (code, payload) =>
    apiClient.post(`/rooms/${code}/watchlist/select-winner/`, payload),

  getMovieSessions: (username) =>
    apiClient.get(`/rooms/sessions/${username ? `?username=${username}` : ''}`),

  saveMovieSession: (sessionData) =>
    apiClient.post('/rooms/sessions/', sessionData),

  submitSessionRating: (sessionId, ratingData) =>
    apiClient.post(`/rooms/sessions/${sessionId}/rating/`, ratingData),
};

export default roomService;
