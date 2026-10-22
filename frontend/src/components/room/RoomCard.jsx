import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';

/**
 * Cinematic Room Card Component showing active hangout state
 */
export function RoomCard({ room, onJoin, onDelete, canDelete = false }) {
  const {
    code = 'vybe-404',
    title = 'Movie Night Lounge',
    hostName = 'Host',
    movieTitle = 'Featured Screening',
    genre = 'Sci-Fi',
    participantCount = 3,
    maxParticipants = 8,
    isLive = true,
    isPrivate = false,
  } = room || {};

  return (
    <div
      className="card-cinema"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--space-6)',
        height: '100%',
        background: 'var(--bg-card)',
        position: 'relative',
      }}
    >
      <div>
        {/* Header row: Live status badge and room type */}
        <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {isLive ? (
              <span className="badge badge-live">
                <span className="pulse-dot"></span>
                LIVE
              </span>
            ) : (
              <span className="badge badge-warning">LOBBY</span>
            )}
            {isPrivate && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                🔒 Private
              </span>
            )}
            {canDelete && (
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-aurora)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.62rem' }}>
                Your Room
              </span>
            )}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            #{code}
          </span>
        </div>

        {/* Room Title & Currently Streaming Film */}
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            marginBottom: 'var(--space-2)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--accent-blue)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="2" y1="7" x2="7" y2="7"></line>
            <line x1="2" y1="17" x2="7" y2="17"></line>
            <line x1="17" y1="17" x2="22" y2="17"></line>
            <line x1="17" y1="7" x2="22" y2="7"></line>
          </svg>
          <span style={{ fontWeight: 600 }}>{movieTitle}</span>
          <span style={{ color: 'var(--text-muted)' }}>• {genre}</span>
        </div>
      </div>

      {/* Footer: Host info and Action buttons */}
      <div>
        <div
          className="flex-between"
          style={{
            padding: 'var(--space-3) 0',
            borderTop: '1px solid var(--border-subtle)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar name={hostName} size="sm" status="online" />
            <div style={{ fontSize: 'var(--text-xs)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Host</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{hostName}</div>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)' }}>
            <div style={{ color: 'var(--text-muted)' }}>Watchers</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {participantCount} / {maxParticipants}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link
            to={`/rooms/${code}`}
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.65rem 1rem', textAlign: 'center' }}
          >
            Join Room
          </Link>
          {canDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onDelete) onDelete(code, title);
              }}
              className="btn btn-ghost"
              style={{
                color: 'var(--status-error)',
                padding: '0.65rem 0.75rem',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
              title="Delete this room"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomCard;
