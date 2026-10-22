import apiClient from './apiClient';

export const movieService = {
  getMovies: (params = {}) => {
    const query = new URLSearchParams();
    if (params.genre && params.genre !== 'All') query.append('genre', params.genre);
    if (params.search) query.append('search', params.search);
    if (params.featured) query.append('featured', 'true');
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get(`/movies/${queryString}`);
  },

  getMovieById: (id) => apiClient.get(`/movies/${id}/`),

  suggestMovie: (movieId, notes = '') =>
    apiClient.post('/movies/suggest/', {
      movie: movieId,
      notes,
      suggested_by: 'Community Member',
    }),
};

export default movieService;
