import React, { useEffect } from 'react';

/**
 * Reusable Accessible Modal Dialog
 */
export function Modal({ isOpen, onClose, title, children, maxWidth = '540px' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card-glass animate-fade-in"
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          boxShadow: 'var(--shadow-xl), var(--glow-primary)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between" style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              lineHeight: 1,
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
