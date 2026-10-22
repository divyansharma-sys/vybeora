import React, { useEffect, useRef, useState } from 'react';

/**
 * Universal Video Player Component
 * Handles legitimate, verified playback sources:
 * 1. Direct HTML5 video streams (MP4/WebM)
 * 2. Official YouTube Embed Player (IFrame Player API)
 * 3. Graceful fallback for unavailable or restricted media
 */
export function VideoPlayer({
  movie,
  currentTime = 0,
  isPlaying = true,
  isHost = false,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
  onDurationChange,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const [ytReady, setYtReady] = useState(false);
  const isSyncingRef = useRef(false);

  const sourceType = movie?.source_type || 'unavailable';
  const videoUrl = movie?.source_url || '';
  const videoId = movie?.source_video_id || '';

  // 1. YouTube IFrame API initialization
  useEffect(() => {
    if (sourceType !== 'youtube' || !videoId) return;

    const loadYTApi = () => {
      if (window.YT && window.YT.Player) {
        initYTPlayer();
        return;
      }
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => {
        initYTPlayer();
      };
    };

    const initYTPlayer = () => {
      if (ytPlayerRef.current) return;
      try {
        ytPlayerRef.current = new window.YT.Player('yt-player-target', {
          videoId,
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: isHost ? 1 : 0, // Host has full player controls; viewer is synchronized
            disablekb: isHost ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              setYtReady(true);
              if (currentTime > 0) {
                event.target.seekTo(currentTime, true);
              }
              if (isPlaying) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            },
            onStateChange: (event) => {
              if (isSyncingRef.current) return;

              // YT.PlayerState.PLAYING = 1, PAUSED = 2
              if (event.data === 1 && onPlay && isHost) {
                onPlay(event.target.getCurrentTime());
              } else if (event.data === 2 && onPause && isHost) {
                onPause(event.target.getCurrentTime());
              }
            },
          },
        });
      } catch (err) {
        console.error('Error initializing YouTube Player API:', err);
      }
    };

    loadYTApi();

    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        setYtReady(false);
      }
    };
  }, [sourceType, videoId]);

  // Synchronize incoming playback state for YouTube
  useEffect(() => {
    if (sourceType === 'youtube' && ytPlayerRef.current && ytReady) {
      try {
        isSyncingRef.current = true;
        const currentYTTime = ytPlayerRef.current.getCurrentTime();
        if (Math.abs(currentYTTime - currentTime) > 1.5) {
          ytPlayerRef.current.seekTo(currentTime, true);
        }
        if (isPlaying) {
          ytPlayerRef.current.playVideo();
        } else {
          ytPlayerRef.current.pauseVideo();
        }
      } catch (e) {
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 500);
      }
    }
  }, [currentTime, isPlaying, sourceType, ytReady]);

  // 2. Direct HTML5 Video Sync
  useEffect(() => {
    const video = videoRef.current;
    if (sourceType !== 'direct_video' || !video) return;

    const diff = Math.abs(video.currentTime - currentTime);

    // Minor drift (< 0.5s): gently adjust playbackRate to align seamlessly without stutter
    if (diff > 0.15 && diff <= 0.8 && isPlaying) {
      if (video.currentTime < currentTime) {
        video.playbackRate = 1.05; // speed up slightly to catch up
      } else {
        video.playbackRate = 0.95; // slow down slightly to let others catch up
      }
    } else {
      video.playbackRate = 1.0;
    }

    // Significant drift (> 0.8s): perform direct seek
    if (diff > 0.8) {
      isSyncingRef.current = true;
      video.currentTime = currentTime;
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 300);
    }

    if (isPlaying && video.paused) {
      isSyncingRef.current = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .catch((err) => {
            // Browser autoplay policy might block unmuted audio without initial user gesture
            if (err.name === 'NotAllowedError') {
              console.warn('Autoplay blocked by browser policy. Attempting muted playback...');
              video.muted = true;
              video.play().catch((e) => console.warn('Muted autoplay also blocked:', e));
            }
          })
          .finally(() => {
            setTimeout(() => { isSyncingRef.current = false; }, 300);
          });
      }
    } else if (!isPlaying && !video.paused) {
      isSyncingRef.current = true;
      video.pause();
      setTimeout(() => { isSyncingRef.current = false; }, 300);
    }
  }, [currentTime, isPlaying, sourceType]);

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(null);

  const handleHTML5Play = () => {
    if (isSyncingRef.current) return;
    if (onPlay && videoRef.current) {
      onPlay(videoRef.current.currentTime);
    }
  };

  const handleHTML5Pause = () => {
    if (isSyncingRef.current) return;
    if (onPause && videoRef.current) {
      onPause(videoRef.current.currentTime);
    }
  };

  const handleHTML5Seeked = () => {
    if (isSyncingRef.current) return;
    if (onSeek && videoRef.current) {
      onSeek(videoRef.current.currentTime);
    }
  };

  const handleHTML5TimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleHTML5LoadedMetadata = () => {
    setVideoLoading(false);
    setVideoError(null);
    if (videoRef.current) {
      if (onDurationChange && videoRef.current.duration) {
        onDurationChange(videoRef.current.duration);
      }
      if (onSeek && currentTime > 0) {
        videoRef.current.currentTime = currentTime;
      }
    }
  };

  const handleHTML5Error = (e) => {
    setVideoLoading(false);
    console.error('HTML5 Video Error:', e);
    const mediaErr = videoRef.current?.error;
    let msg = 'Failed to load video stream from source.';
    if (mediaErr) {
      if (mediaErr.code === 1) msg = 'Video loading aborted by client.';
      else if (mediaErr.code === 2) msg = 'Network error while downloading video stream.';
      else if (mediaErr.code === 3) msg = 'Video decoding failed or format unsupported.';
      else if (mediaErr.code === 4) msg = 'Video source not found, CORS restricted, or access forbidden.';
    }
    setVideoError(msg);
  };

  // 3. Fallback for Unavailable Media Sources
  if (sourceType === 'unavailable' || (!videoUrl && !videoId)) {
    return (
      <div
        className="flex-center"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          color: 'var(--text-secondary)',
          flexDirection: 'column',
          padding: 'var(--space-6)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>⚠️</div>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Playback Source Currently Unavailable
        </h4>
        <p style={{ maxWidth: '440px', fontSize: 'var(--text-sm)' }}>
          This movie does not have a verified, openly licensed or authorized streaming link configured.
          Vybeora strictly respects intellectual property rights.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Loading Overlay */}
      {videoLoading && sourceType === 'direct_video' && !videoError && (
        <div
          className="flex-center"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 15, 0.75)',
            zIndex: 4,
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: 'var(--accent-aurora)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Loading verified stream...
          </span>
        </div>
      )}

      {/* Playback Error Overlay */}
      {videoError && (
        <div
          className="flex-center"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#05070f',
            zIndex: 5,
            flexDirection: 'column',
            padding: 'var(--space-6)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>❌</div>
          <h4 style={{ color: 'var(--status-error)', marginBottom: 'var(--space-2)' }}>
            Stream Playback Error
          </h4>
          <p style={{ maxWidth: '420px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            {videoError}
          </p>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setVideoError(null);
              setVideoLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
          >
            ↺ Retry Playback
          </button>
        </div>
      )}

      {sourceType === 'youtube' ? (
        <div style={{ width: '100%', height: '100%', pointerEvents: isHost ? 'auto' : 'none' }}>
          <div id="yt-player-target" style={{ width: '100%', height: '100%' }} />
        </div>
      ) : sourceType === 'archive_org' ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <iframe
            src={`https://archive.org/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            title={movie?.title || 'Internet Archive Stream'}
          />
        </div>
      ) : sourceType === 'direct_video' ? (
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          controls={true}
          onPlay={handleHTML5Play}
          onPause={handleHTML5Pause}
          onSeeked={handleHTML5Seeked}
          onTimeUpdate={handleHTML5TimeUpdate}
          onLoadedMetadata={handleHTML5LoadedMetadata}
          onCanPlay={() => setVideoLoading(false)}
          onWaiting={() => setVideoLoading(true)}
          onPlaying={() => setVideoLoading(false)}
          onError={handleHTML5Error}
          playsInline
        />
      ) : null}
    </div>
  );
}

export default VideoPlayer;
