import React from 'react';

/**
 * Reusable Avatar Component with presence status and fallback initials
 */
export function Avatar({ name = 'User', src = null, size = 'md', status = null, className = '' }) {
  const sizeMap = {
    xs: { width: 24, height: 24, fontSize: '0.65rem', dot: 6 },
    sm: { width: 32, height: 32, fontSize: '0.75rem', dot: 8 },
    md: { width: 40, height: 40, fontSize: '0.9rem', dot: 10 },
    lg: { width: 52, height: 52, fontSize: '1.15rem', dot: 12 },
    xl: { width: 68, height: 68, fontSize: '1.4rem', dot: 14 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  // Generate deterministic subtle gradient based on name
  const getGradient = (str) => {
    const gradients = [
      'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #38bdf8 0%, #2dd4bf 100%)',
      'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div
      className={`avatar-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: currentSize.width,
        height: currentSize.height,
        flexShrink: 0,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-full)',
            objectFit: 'cover',
            border: '2px solid var(--border-medium)',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-full)',
            background: getGradient(name),
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: currentSize.fontSize,
            letterSpacing: '0.02em',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {getInitials(name)}
        </div>
      )}

      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: currentSize.dot,
            height: currentSize.dot,
            borderRadius: 'var(--radius-full)',
            backgroundColor:
              status === 'online'
                ? 'var(--status-healthy)'
                : status === 'busy'
                ? 'var(--status-live)'
                : 'var(--text-muted)',
            border: '2px solid var(--bg-primary)',
            boxShadow: status === 'online' ? '0 0 6px var(--status-healthy)' : 'none',
          }}
        />
      )}
    </div>
  );
}

export default Avatar;
