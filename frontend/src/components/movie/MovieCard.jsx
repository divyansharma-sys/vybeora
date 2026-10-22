import React from 'react';

/**
 * Cinematic Movie Card Component with support for poster_url and poster
 */
export function MovieCard({ movie, onSelect, onSuggest, className = '' }) {
  const {
    id,
    title = 'Movie Title',
    genre = 'Sci-Fi / Drama',
    year = '2025',
    duration = '2h 14m',
    rating = '8.8',
    poster = null,
    poster_url = null,
    backdrop = null,
    is_featured = false,
    isFeatured = false,
    is_free = true,
  } = movie || {};

  const actualPoster = poster_url || poster || backdrop;

  const posterBackground = actualPoster
    ? `url(${actualPoster}) center / cover no-repeat`
    : 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #0369a1 100%)';

  return (
    <div
      className={`movie-card-container card-cinema ${className}`}
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: 'pointer',
      }}
      onClick={() => onSelect && onSelect(movie)}
    >
      {/* Poster Image Area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '135%', // 3:4 cinematic aspect ratio
          background: posterBackground,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        {/* Subtle dark gradient overlay to ensure badge readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(6, 9, 19, 0.2) 0%, rgba(6, 9, 19, 0.6) 100%)',
          }}
        />

        {/* Top Badges */}
        <div
          style={{
            position: 'absolute',
            top: 'var(--space-3)',
            left: 'var(--space-3)',
            right: 'var(--space-3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          {is_featured || isFeatured ? (
            <span className="badge badge-aurora" style={{ fontSize: '0.65rem' }}>
              Featured
            </span>
          ) : is_free ? (
            <span className="badge badge-healthy" style={{ fontSize: '0.65rem' }}>
              ✓ Free
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'var(--text-secondary)' }}>
              {year}
            </span>
          )}

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              color: '#facc15',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
            }}
          >
            ★ {rating}
          </span>
        </div>

        {/* Hover Action Overlay */}
        <div
          className="movie-play-overlay flex-center"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6, 9, 19, 0.6)',
            backdropFilter: 'blur(3px)',
            opacity: 0,
            transition: 'opacity var(--transition-base)',
            zIndex: 3,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-violet-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xl), var(--glow-primary)',
              transform: 'scale(0.9)',
              transition: 'transform var(--transition-fast)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
      </div>

      {/* Movie Details Content */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between',
          background: 'var(--bg-tertiary)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--accent-blue)',
              fontWeight: 600,
            }}
          >
            {genre}
          </span>
          <h4
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 'var(--space-1) 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h4>
        </div>

        <div className="flex-between" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>{duration}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSuggest && onSuggest(movie);
            }}
            className="btn-ghost"
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              color: 'var(--accent-violet)',
            }}
          >
            + Watch Party
          </button>
        </div>
      </div>

      <style>{`
        .movie-card-container:hover .movie-play-overlay {
          opacity: 1;
        }
        .movie-card-container:hover .movie-play-overlay div {
          transform: scale(1);
        }
      `}</style>
    </div>
  );
}

export default MovieCard;
