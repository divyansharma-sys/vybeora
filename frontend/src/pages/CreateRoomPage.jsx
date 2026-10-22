import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import movieService from '../services/movieService';
import roomService from '../services/roomService';
import { useAuth } from '../context/AuthContext';

export function CreateRoomPage({ initialTab = 'create' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [availableMovies, setAvailableMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const initialName = user?.profile?.display_name || user?.username || 'Host';

  // Form states
  const [roomTitle, setRoomTitle] = useState('Friday Movie Lounge');
  const [hostName, setHostName] = useState(initialName);
  const [videoSourceType, setVideoSourceType] = useState('catalog'); // 'catalog' | 'device'
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [localFile, setLocalFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [maxWatchers, setMaxWatchers] = useState(8);

  // Join Room state
  const [joinCode, setJoinCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [viewerName, setViewerName] = useState(user?.profile?.display_name || user?.username || 'Viewer');

  useEffect(() => {
    if (user) {
      const name = user.profile?.display_name || user.username;
      if (name) {
        setHostName(name);
        setViewerName(name);
      }
    }
  }, [user]);

  useEffect(() => {
    // Fetch authorized movies from backend for the selector
    movieService.getMovies().then((res) => {
      const list = res?.results || [];
      setAvailableMovies(list);
      const firstPlayable = list.find((m) => m.is_embeddable && m.source_type !== 'unavailable') || list[0];
      if (firstPlayable) {
        setSelectedMovieId(firstPlayable.id);
      }
    }).catch(console.error);
  }, []);

  const handleDeviceFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const validExtensions = ['.mp4', '.webm', '.mkv', '.mov'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt && !file.type.startsWith('video/')) {
      setFileError('Unsupported file type. Please select an MP4, WebM, MKV, or MOV video.');
      setLocalFile(null);
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setFileError('File size exceeds 500MB maximum upload limit.');
      setLocalFile(null);
      return;
    }

    setLocalFile(file);
    // Autofill room title from filename if default
    if (roomTitle === 'Friday Movie Lounge') {
      const titleFromFile = file.name.replace(/\.[^/.]+$/, '');
      setRoomTitle(`${titleFromFile} Watch Party`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFileError(null);

    if (videoSourceType === 'device' && !localFile) {
      setFileError('Please select a video file from your device, or choose from Vybeora Movies.');
      setLoading(false);
      return;
    }

    try {
      const selectedMovie = availableMovies.find((m) => m.id === selectedMovieId);
      const payload = {
        title: roomTitle,
        host_name: hostName,
        movie: videoSourceType === 'catalog' ? (selectedMovie?.id || null) : null,
        movie_title: videoSourceType === 'catalog'
          ? (selectedMovie?.title || 'Feature Film')
          : (localFile?.name?.replace(/\.[^/.]+$/, '') || 'Custom Video'),
        genre: videoSourceType === 'catalog' ? (selectedMovie?.genre || 'General') : 'Custom Video',
        is_private: isPrivate,
        passcode: isPrivate ? passcode : '',
        max_participants: maxWatchers,
      };

      const response = await roomService.createRoom(payload);
      const code = response?.code;

      // If video source is local device, upload file and link to room
      if (videoSourceType === 'device' && localFile) {
        setUploadStatus('Uploading your video to the watch room...');
        const formData = new FormData();
        formData.append('video_file', localFile);
        formData.append('title', localFile.name.replace(/\.[^/.]+$/, ''));
        formData.append('uploaded_by', hostName);

        const uploadRes = await roomService.uploadVideo(code, formData, (percent) => {
          setUploadProgress(percent);
          setUploadStatus(`Uploading video to room: ${percent}%...`);
        });

        // Set as active video for the room
        if (uploadRes?.video?.id) {
          await roomService.selectVideo(code, {
            source_type: 'uploaded_video',
            video_id: uploadRes.video.id,
            user: hostName,
          });
        }
      }

      navigate(`/rooms/${code}`);
    } catch (err) {
      const details = err.details || err.response?.data?.details || err.response?.data?.error;
      let detailMsg = '';
      if (details && typeof details === 'object') {
        detailMsg = Object.entries(details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      }
      setError(detailMsg || err.message || 'Failed to create room on backend.');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const cleanCode = joinCode.trim().toLowerCase();
    try {
      await roomService.joinRoom(cleanCode, {
        username: viewerName,
        passcode: joinPasscode,
      });
      navigate(`/rooms/${cleanCode}`);
    } catch (err) {
      setError(err.message || 'Room not found or passcode incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-12) 0 var(--space-20) 0', maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div className="section-tag">Virtual Cinema Lounge</div>
        <h1 className="section-title">Movie Hangout Portal</h1>
        <p>Set up a private watch party or enter your friend's invite code to join.</p>
      </div>

      {/* Tabs */}
      <div
        className="card-glass"
        style={{
          display: 'flex',
          padding: 'var(--space-2)',
          marginBottom: 'var(--space-8)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <button
          onClick={() => { setActiveTab('create'); setError(null); }}
          className={activeTab === 'create' ? 'btn btn-primary' : 'btn btn-ghost'}
          style={{ flex: 1, borderRadius: 'var(--radius-lg)' }}
        >
          Create New Room
        </button>
        <button
          onClick={() => { setActiveTab('join'); setError(null); }}
          className={activeTab === 'join' ? 'btn btn-primary' : 'btn btn-ghost'}
          style={{ flex: 1, borderRadius: 'var(--radius-lg)' }}
        >
          Join with Code
        </button>
      </div>

      {error && (
        <div className="badge badge-error" style={{ width: '100%', padding: 'var(--space-3)', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
          {error}
        </div>
      )}

      {/* Form Container */}
      <div className="card-cinema" style={{ padding: 'var(--space-8)' }}>
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name (Host)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Alex"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Room Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Saturday Sci-Fi Marathon"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                required
              />
            </div>

            {/* Movie Source Selection: Library Movie vs From Device */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Watch Party Movie / Video</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {videoSourceType === 'catalog' ? 'Vybeora Free Movies' : 'From Your Device'}
                </span>
              </label>

              {/* Source Toggle Buttons */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <button
                  type="button"
                  onClick={() => { setVideoSourceType('catalog'); setFileError(null); }}
                  className={videoSourceType === 'catalog' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  🎞️ Vybeora Movies
                </button>
                <button
                  type="button"
                  onClick={() => { setVideoSourceType('device'); setFileError(null); }}
                  className={videoSourceType === 'device' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  💻 Add Video from Device
                </button>
              </div>

              {/* Option 1: Catalog Movie Dropdown */}
              {videoSourceType === 'catalog' ? (
                <select
                  className="form-input"
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  required={videoSourceType === 'catalog'}
                >
                  {availableMovies.map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.is_embeddable || m.source_type === 'unavailable'}>
                      {m.is_embeddable && m.source_type !== 'unavailable' ? '✓ ' : '🔒 [Restricted] '}
                      {m.title} ({m.genre}, {m.duration})
                    </option>
                  ))}
                </select>
              ) : (
                /* Option 2: Add Video From Device */
                <div
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-5)',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <input
                    type="file"
                    id="create-room-video-input"
                    accept="video/mp4,video/webm,video/x-matroska,video/quicktime,.mp4,.webm,.mkv,.mov"
                    onChange={handleDeviceFileSelect}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="create-room-video-input"
                    className="btn btn-outline btn-sm"
                    style={{ cursor: 'pointer', marginBottom: 'var(--space-2)' }}
                  >
                    📁 Select Video from My Computer...
                  </label>

                  {localFile ? (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent-aurora)', fontSize: 'var(--text-sm)' }}>
                        Selected: {localFile.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                        Size: {(localFile.size / (1024 * 1024)).toFixed(1)} MB • Will be uploaded & synced across all room viewers!
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                      Supports MP4, WebM, MKV, MOV (up to 500MB)
                    </div>
                  )}

                  {fileError && (
                    <div style={{ color: 'var(--status-error)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                      ⚠️ {fileError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Max Attendees</label>
                <select
                  className="form-input"
                  value={maxWatchers}
                  onChange={(e) => setMaxWatchers(Number(e.target.value))}
                >
                  <option value={4}>4 People (Intimate)</option>
                  <option value={8}>8 People (Standard)</option>
                  <option value={16}>16 People (Party)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Privacy</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 'var(--space-3)' }}>
                  <input
                    type="checkbox"
                    id="privacyCheck"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-violet)', cursor: 'pointer' }}
                  />
                  <label htmlFor="privacyCheck" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Require Passcode
                  </label>
                </div>
              </div>
            </div>

            {isPrivate && (
              <div className="form-group animate-fade-in">
                <label className="form-label">Room Passcode</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter 4-6 digit passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required={isPrivate}
                />
              </div>
            )}

            {/* Upload progress when creating with device video */}
            {loading && uploadStatus && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(56, 189, 248, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div className="flex-between" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--accent-aurora)' }}>{uploadStatus}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{uploadProgress}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-aurora))', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem' }}
              >
                {loading
                  ? (uploadStatus || 'Creating in Database...')
                  : (videoSourceType === 'device' ? '🚀 Upload Video & Launch Room' : 'Launch Watch Party & Get Link')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Sarah"
                value={viewerName}
                onChange={(e) => setViewerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Room Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., vybe-aura"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Passcode (if private)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Optional passcode"
                value={joinPasscode}
                onChange={(e) => setJoinPasscode(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem' }}
              >
                {loading ? 'Joining Room...' : 'Enter Watch Room'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreateRoomPage;
