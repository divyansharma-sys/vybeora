import React, { useState, useEffect } from 'react';
import movieService from '../services/movieService';
import MovieCard from '../components/movie/MovieCard';
import Modal from '../components/common/Modal';

const GENRES = ['All', 'Sci-Fi', 'Mystery', 'Adventure', 'Drama'];

export function DiscoverPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [suggestSuccess, setSuggestSuccess] = useState(false);
  const [submittingSuggest, setSubmittingSuggest] = useState(false);

  useEffect(() => {
    fetchMovies();
  }, [selectedGenre]);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await movieService.getMovies({
        genre: selectedGenre,
        search: searchQuery,
      });
      setMovies(response?.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load movie catalog from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMovies();
  };

  const handleSuggest = (movie) => {
    setSelectedMovie(movie);
    setSuggestSuccess(false);
  };

  const submitSuggestion = async () => {
    if (!selectedMovie) return;
    setSubmittingSuggest(true);
    try {
      await movieService.suggestMovie(selectedMovie.id, 'Suggested via catalog view');
      setSuggestSuccess(true);
    } catch (err) {
      console.error('Error suggesting movie:', err);
    } finally {
      setSubmittingSuggest(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-12) 0 var(--space-20) 0' }}>
      {/* Page Header */}
      <div className="section-header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-10) auto' }}>
        <div className="section-tag">Authorized Cinema Library</div>
        <h1 className="section-title">Discover Movies</h1>
        <p>
          Search titles, filter by genre, or suggest an authorized film for an upcoming Vybeora room screening.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card-glass"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          marginBottom: 'var(--space-10)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: '1 1 280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search movies, titles, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </form>

        {/* Genre Pill Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={selectedGenre === genre ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
          Loading real-time catalog from server...
        </div>
      ) : error ? (
        <div className="card-cinema" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ color: 'var(--status-error)', marginBottom: 'var(--space-2)' }}>Failed to load movies</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>{error}</p>
          <button onClick={fetchMovies} className="btn btn-outline btn-sm">
            Try Again
          </button>
        </div>
      ) : movies.length === 0 ? (
        <div className="card-cinema" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🎬</div>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No movies found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            No authorized films found matching your search.
          </p>
        </div>
      ) : (
        <div className="cards-grid">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onSelect={(m) => setSelectedMovie(m)}
              onSuggest={handleSuggest}
            />
          ))}
        </div>
      )}

      {/* Movie Details & Suggestion Modal */}
      <Modal
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        title={selectedMovie?.title || 'Movie Details'}
      >
        {selectedMovie && (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span className="badge badge-accent">{selectedMovie.genre}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>{selectedMovie.year}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>{selectedMovie.duration}</span>
              <span style={{ color: '#facc15', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                ★ {selectedMovie.rating} / 10
              </span>
            </div>

            <p style={{ lineHeight: 1.6, marginBottom: 'var(--space-6)', color: 'var(--text-secondary)' }}>
              {selectedMovie.description}
            </p>

            {suggestSuccess ? (
              <div
                className="badge badge-healthy"
                style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-4)' }}
              >
                ✓ Movie suggestion recorded in the backend database!
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedMovie(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={submitSuggestion}
                disabled={submittingSuggest || suggestSuccess}
              >
                {submittingSuggest ? 'Submitting...' : 'Suggest for Room Night'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DiscoverPage;
