import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import movieService from '../services/movieService';
import roomService from '../services/roomService';
import MovieCard from '../components/movie/MovieCard';
import Modal from '../components/common/Modal';

const GENRES = ['All', 'Sci-Fi', 'Horror', 'Mystery', 'Animation', 'Action', 'Comedy', 'Drama'];
const LANGUAGES = ['All', 'English', 'Silent / English'];

export function FreeMoviesPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    fetchFreeMovies();
  }, [selectedGenre, selectedLanguage]);

  const fetchFreeMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await movieService.getMovies({
        free: true,
        genre: selectedGenre,
        language: selectedLanguage,
        search: searchQuery,
      });
      setMovies(response?.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load free movies catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFreeMovies();
  };

  const handleStartWatchParty = async (movie) => {
    setCreatingRoom(true);
    try {
      const host = localStorage.getItem('vybeora_user') || 'Movie Night Host';
      const payload = {
        title: `${movie.title} Watch Party`,
        host_name: host,
        movie: movie.id,
        movie_title: movie.title,
        genre: movie.genre,
        is_private: true,
        max_participants: 8,
      };
      const res = await roomService.createRoom(payload);
      const roomCode = res?.code;
      navigate(`/rooms/${roomCode}`);
    } catch (err) {
      console.error('Error starting watch party:', err);
      alert('Could not start watch party: ' + (err.message || 'Server error'));
    } finally {
      setCreatingRoom(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-12) 0 var(--space-20) 0' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto var(--space-10) auto' }}>
        <div className="badge badge-aurora" style={{ marginBottom: 'var(--space-3)' }}>
          ✓ 100% Free & Legitimate Streaming
        </div>
        <h1 className="section-title" style={{ fontSize: 'var(--text-4xl)' }}>
          Free Movies & Shared Screening
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
          Watch verified public-domain and openly licensed feature films with friends.
          Stream solo or launch an instant private watch party with zero subscription fees.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card-glass"
        style={{
          padding: 'var(--space-5) var(--space-6)',
          marginBottom: 'var(--space-10)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: '1 1 260px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search free movies..."
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

        {/* Genre Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={selectedGenre === g ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem 0.8rem' }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Language:</span>
          <select
            className="form-input"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{ padding: '0.35rem 0.8rem', fontSize: 'var(--text-xs)', width: 'auto' }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Movie Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
          Fetching verified free movie catalog...
        </div>
      ) : error ? (
        <div className="card-cinema" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ color: 'var(--status-error)', marginBottom: 'var(--space-2)' }}>Failed to load movies</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>{error}</p>
          <button onClick={fetchFreeMovies} className="btn btn-outline btn-sm">Try Again</button>
        </div>
      ) : movies.length === 0 ? (
        <div className="card-cinema" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🎬</div>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No free movies found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Try adjusting your search keywords or switching filters.
          </p>
        </div>
      ) : (
        <div className="cards-grid">
          {movies.map((movie) => (
            <div key={movie.id} style={{ position: 'relative' }}>
              <MovieCard
                movie={movie}
                onSelect={(m) => setSelectedMovie(m)}
                onSuggest={() => handleStartWatchParty(movie)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 'var(--space-3)',
                  left: 'var(--space-3)',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              >
                <span className="badge badge-healthy" style={{ fontSize: '0.62rem' }}>
                  ✓ Free
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Movie Detail & Playback Preview Modal */}
      <Modal
        isOpen={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
        title={selectedMovie?.title || 'Movie Details'}
        maxWidth="680px"
      >
        {selectedMovie && (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span className="badge badge-healthy">Free to Watch</span>
              <span className="badge badge-accent">{selectedMovie.genre}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>{selectedMovie.year}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>{selectedMovie.duration}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>{selectedMovie.language}</span>
              <span style={{ color: '#facc15', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                ★ {selectedMovie.rating} / 10
              </span>
            </div>

            <p style={{ lineHeight: 1.6, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              {selectedMovie.description}
            </p>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-5)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Legal Verification & Rights</span>
                <span className={selectedMovie.movie_source?.verification_status === 'verified' ? 'badge badge-healthy' : 'badge badge-warning'}>
                  {selectedMovie.movie_source?.verification_status === 'verified' ? '✓ Rights Verified' : selectedMovie.movie_source?.verification_status || 'Under Review'}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                <strong>License:</strong> {selectedMovie.movie_source?.license_type || selectedMovie.license_info}
              </div>
              {selectedMovie.movie_source?.license_evidence && (
                <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                  <strong>Evidence:</strong> {selectedMovie.movie_source.license_evidence}
                </div>
              )}
              {selectedMovie.movie_source?.attribution_requirements && (
                <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                  <strong>Attribution:</strong> {selectedMovie.movie_source.attribution_requirements}
                </div>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>Streaming Permitted: {selectedMovie.movie_source?.streaming_permitted ? 'Yes' : 'No'}</span>
                <span>Embedding Permitted: {selectedMovie.movie_source?.embedding_permitted ? 'Yes' : 'No'}</span>
                <span>Provider: {selectedMovie.movie_source?.provider || selectedMovie.source_type}</span>
                {selectedMovie.source_url && (
                  <a
                    href={selectedMovie.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent-aurora)', textDecoration: 'underline' }}
                  >
                    View Original Source Archive
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedMovie(null)}
              >
                Close
              </button>
              {selectedMovie.is_embeddable && selectedMovie.source_type !== 'unavailable' ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStartWatchParty(selectedMovie)}
                  disabled={creatingRoom}
                >
                  {creatingRoom ? 'Creating Room...' : '▶ Host Watch Party with Friends'}
                </button>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  Streaming Restricted
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FreeMoviesPage;
