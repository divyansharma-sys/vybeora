import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import roomService from '../services/roomService';
import movieService from '../services/movieService';
import authService from '../services/authService';
import VideoPlayer from '../components/player/VideoPlayer';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import './WatchRoomPage.css';

export function WatchRoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback sync state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5400); // 1h 30m default
  const [activeTab, setActiveTab] = useState('chat');

  // Active movie / video state
  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const localVideoObjectUrlRef = useRef(null);

  // Video Switcher Modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalTab, setVideoModalTab] = useState('device'); // 'device' | 'catalog'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [catalogMovies, setCatalogMovies] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // WebSocket reference & connection status
  const socketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Watchlist & Voting state
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [watchlistModalOpen, setWatchlistModalOpen] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);

  // User identity in this room
  const [currentUsername] = useState(() => {
    return localStorage.getItem('vybeora_user') || 'Movie Viewer';
  });
  const isHost = room?.host_name === currentUsername || room?.host_name === 'Host' || true; // host authority default for creator

  // Floating reactions state
  const [reactions, setReactions] = useState([]);

  // Invite Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [invitingFriends, setInvitingFriends] = useState({});
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Ready Check state
  const [readyMap, setReadyMap] = useState({}); // { [username]: boolean }
  const [countdown, setCountdown] = useState(null); // number | null

  // Voice Chat state
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [voiceParticipants, setVoiceParticipants] = useState({}); // { [username]: { muted: boolean, speaking: boolean } }

  // WebRTC refs
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { [peerUsername]: RTCPeerConnection }
  const audioElementsRef = useRef({}); // { [peerUsername]: HTMLAudioElement }
  const audioAnalyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const speakingDetectionIntervalRef = useRef(null);

  // Chat message state & spoiler filter
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSpoilerInput, setIsSpoilerInput] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const chatScrollRef = useRef(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (localVideoObjectUrlRef.current) {
        URL.revokeObjectURL(localVideoObjectUrlRef.current);
        localVideoObjectUrlRef.current = null;
      }
    };
  }, []);

  // 1. Fetch Room Details from API
  useEffect(() => {
    fetchRoomDetails();
  }, [roomCode]);

  const fetchRoomDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomService.getRoomByCode(roomCode);
      let roomData = data;
      if (!data?.movie_details && (data?.movie_title || data?.title)) {
        try {
          const movieSearch = await movieService.getMovies({ search: data.movie_title || data.title });
          const matchedMovie = movieSearch?.results?.find(
            (m) => m.title.toLowerCase() === (data.movie_title || data.title).toLowerCase()
          ) || movieSearch?.results?.[0];
          if (matchedMovie) {
            roomData = { ...data, movie_details: matchedMovie };
          }
        } catch (mErr) {
          console.warn('Could not enrich room movie details:', mErr);
        }
      }
      setRoom(roomData);

      // Check if user launched this room instantly with a local movie file
      const pendingLocal = window.__vybeora_pending_local_movie;
      if (pendingLocal && pendingLocal.roomCode === roomCode) {
        localVideoObjectUrlRef.current = pendingLocal.objectUrl;
        setActiveVideoSource({
          title: `${pendingLocal.name.replace(/\.[^/.]+$/, '')} (Instant Play)`,
          source_type: 'direct_video',
          source_url: pendingLocal.objectUrl,
          source_video_id: 'local_instant',
          license_info: 'Local Device Playback',
          is_local_device: true,
        });
        window.__vybeora_pending_local_movie = null;
      } else if (!data?.movie_details && data?.uploaded_videos && data.uploaded_videos.length > 0) {
        // If room has uploaded video(s) and no catalog movie, activate the latest uploaded video
        const latestUpload = data.uploaded_videos[data.uploaded_videos.length - 1];
        if (latestUpload?.playback_url) {
          setActiveVideoSource({
            title: latestUpload.title || data.movie_title || data.title,
            source_type: 'direct_video',
            source_url: latestUpload.playback_url,
            license_info: 'Room Uploaded Video',
          });
        }
      }

      if (roomData?.watchlist_items) {
        setWatchlistItems(roomData.watchlist_items);
      }

      if (roomData?.current_time_seconds) {
        setCurrentTime(roomData.current_time_seconds);
      }
      setIsPlaying(roomData?.is_playing ?? true);

      // Initialize welcome chat
      setMessages([
        {
          id: 'welcome',
          user: data?.host_name ? `${data.host_name} (Host)` : 'System',
          text: `Welcome to the watch party for ${data?.movie_title || data?.title}! Playback is synchronized.`,
          time: '00:00',
          isHost: true,
        },
      ]);
    } catch (err) {
      setError(err.message || 'Room not found or has been closed.');
    } finally {
      setLoading(false);
    }
  };

  // Track latest applied sequence number to reject stale/out-of-order frames
  const lastSequenceRef = useRef(0);
  const lastServerSyncRef = useRef({ time: 0, serverTimestamp: 0 });

  // 2. Real-Time Django Channels WebSocket Connection
  useEffect(() => {
    if (!roomCode) return;

    // Use environment variable or current host origin with ws:// protocol
    const isNativeAndroid = window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && window.navigator?.userAgent?.includes('Android'));
    const envWs = import.meta.env.VITE_WS_BASE_URL;
    let wsUrl;
    if (envWs) {
      const cleanBase = envWs.endsWith('/') ? envWs.slice(0, -1) : envWs;
      wsUrl = `${cleanBase}/rooms/${roomCode}/`;
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = isNativeAndroid ? '192.168.1.16:8000' : window.location.host;
      wsUrl = `${wsProtocol}//${wsHost}/ws/rooms/${roomCode}/`;
    }

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    socket.onerror = (err) => {
      console.warn('WebSocket error, running in local fallback mode:', err);
      setWsConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        // Sequence number check to reject stale or out-of-order playback updates
        if (payload?.sequence !== undefined) {
          if (payload.sequence < lastSequenceRef.current) {
            // Stale event arrived out of order; discard
            return;
          }
          lastSequenceRef.current = payload.sequence;
        }

        if (type === 'playback.play') {
          setIsPlaying(true);
          if (payload?.current_time !== undefined) {
            let targetTime = payload.current_time;
            // Extrapolate time based on server elapsed duration if server_time provided
            if (payload?.server_time) {
              const elapsed = (Date.now() / 1000) - payload.server_time;
              if (elapsed > 0 && elapsed < 5) {
                targetTime += elapsed;
              }
            }
            setCurrentTime(targetTime);
          }
        } else if (type === 'playback.pause') {
          setIsPlaying(false);
          if (payload?.current_time !== undefined) {
            setCurrentTime(payload.current_time);
          }
        } else if (type === 'playback.seek') {
          if (payload?.current_time !== undefined) {
            setCurrentTime(payload.current_time);
          }
          if (payload?.is_playing !== undefined) {
            setIsPlaying(payload.is_playing);
          }
        } else if (type === 'playback.sync') {
          if (payload?.is_playing !== undefined) {
            setIsPlaying(payload.is_playing);
          }
          if (payload?.current_time !== undefined) {
            let targetTime = payload.current_time;
            if (payload?.server_time && payload.is_playing) {
              const elapsed = (Date.now() / 1000) - payload.server_time;
              if (elapsed > 0 && elapsed < 10) {
                targetTime += elapsed;
              }
            }
            setCurrentTime(targetTime);
          }
        } else if (type === 'chat.message') {
          setMessages((prev) => [
            ...prev,
            {
              id: payload.id || Date.now(),
              user: payload.user,
              text: payload.text,
              time: payload.time || formatTime(currentTime),
              isHost: payload.is_host,
              is_spoiler: payload.is_spoiler || false,
            },
          ]);
        } else if (type === 'ready.toggle') {
          if (payload?.user) {
            setReadyMap((prev) => ({
              ...prev,
              [payload.user]: payload.ready,
            }));
          }
        } else if (type === 'ready.countdown') {
          const count = payload?.countdown;
          setCountdown(count);
          if (count === 0) {
            // Countdown ended: start playback
            setIsPlaying(true);
            setTimeout(() => setCountdown(null), 1000);
          }
        } else if (type === 'reaction.emoji') {
          if (payload?.emoji) {
            addFloatingReaction(payload.emoji, payload.x);
          }
        } else if (type === 'webrtc.signal') {
          handleIncomingWebRTCSignal(payload);
        } else if (type === 'video.change') {
          const videoData = payload?.playback_payload;
          if (videoData) {
            if (videoData.source_type !== 'local_device') {
              setActiveVideoSource({
                title: videoData.title,
                source_type: videoData.source_type,
                source_url: videoData.source_url,
                source_video_id: videoData.source_video_id || '',
                license_info: 'Shared Watch Room Video',
              });
              setRoom((prev) => (prev ? { ...prev, movie_title: videoData.title } : prev));
              setCurrentTime(0);
              setIsPlaying(true);
            }
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                user: 'System',
                text: videoData.is_local_device
                  ? (videoData.message || `${payload.user} loaded a local video.`)
                  : `🎬 ${payload.user || 'Host'} switched the room video to "${videoData.title}". Playback is synchronized!`,
                time: formatTime(0),
                isHost: true,
              },
            ]);
          }
        } else if (type === 'watchlist.updated') {
          if (payload?.items) {
            setWatchlistItems(payload.items);
          } else if (payload?.action === 'item_added' && payload?.item) {
            setWatchlistItems((prev) => {
              if (prev.some((it) => it.id === payload.item.id)) return prev;
              return [payload.item, ...prev];
            });
          } else if (payload?.action === 'item_removed' && payload?.item_id) {
            setWatchlistItems((prev) => prev.filter((it) => it.id !== payload.item_id));
          }
          if (payload?.voted_movie) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                user: 'System',
                text: `🗳️ ${payload.username} voted for "${payload.voted_movie}" in the shared watchlist!`,
                time: formatTime(currentTime),
                isHost: false,
              },
            ]);
          }
        } else if (type === 'room.closed') {
          alert(payload?.message || 'This watch room has been closed by the host.');
          navigate('/');
        }
      } catch (e) {
        console.error('Failed to parse incoming WebSocket frame:', e);
      }
    };

    return () => {
      socket.close();
    };
  }, [roomCode]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (secs) => {
    const sInt = Math.floor(secs || 0);
    const h = Math.floor(sInt / 3600);
    const m = Math.floor((sInt % 3600) / 60);
    const s = Math.floor(sInt % 60);
    const mm = m < 10 ? `0${m}` : m;
    const ss = s < 10 ? `0${s}` : s;
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // Playback Control Handlers (Accessible to EVERY room participant)
  const handleRoomPlay = (time) => {
    const targetTime = time !== undefined ? time : currentTime;
    setIsPlaying(true);
    setCurrentTime(targetTime);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'playback.play',
          payload: { current_time: targetTime, is_playing: true, user: currentUsername },
        })
      );
    }
  };

  const handleRoomPause = (time) => {
    const targetTime = time !== undefined ? time : currentTime;
    setIsPlaying(false);
    setCurrentTime(targetTime);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'playback.pause',
          payload: { current_time: targetTime, is_playing: false, user: currentUsername },
        })
      );
    }
  };

  const handleRoomSeek = (time) => {
    setCurrentTime(time);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'playback.seek',
          payload: { current_time: time, is_playing: isPlaying, user: currentUsername },
        })
      );
    }
  };

  // Reaction Handling
  const addFloatingReaction = (emoji, posX = null) => {
    const id = Date.now() + Math.random();
    const x = posX !== null ? posX : Math.floor(Math.random() * 70) + 15;
    setReactions((prev) => [...prev, { id, emoji, x }]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2800);
  };

  const triggerReaction = (emoji) => {
    const x = Math.floor(Math.random() * 70) + 15;
    addFloatingReaction(emoji, x);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'reaction.emoji',
          payload: { emoji, x },
        })
      );
    }
  };

  // Chat Message Submission
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const payload = {
      user: currentUsername,
      text: inputMessage.trim(),
      is_host: isHost,
      timestamp_tag: formatTime(currentTime),
      is_spoiler: isSpoilerInput,
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat.message',
          payload,
        })
      );
    } else {
      // Local fallback if offline
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          user: currentUsername,
          text: inputMessage.trim(),
          time: formatTime(currentTime),
          isHost,
          is_spoiler: isSpoilerInput,
        },
      ]);
    }
    setInputMessage('');
    setIsSpoilerInput(false);
  };

  const handleToggleReady = () => {
    const nextStatus = !readyMap[currentUsername];
    setReadyMap((prev) => ({ ...prev, [currentUsername]: nextStatus }));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'ready.toggle',
          payload: { user: currentUsername, ready: nextStatus },
        })
      );
    }
  };

  const handleStartCountdown = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // 5-second synchronized countdown
      let c = 5;
      socketRef.current.send(
        JSON.stringify({
          type: 'ready.countdown',
          payload: { countdown: c },
        })
      );
      const timer = setInterval(() => {
        c -= 1;
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'ready.countdown',
              payload: { countdown: c },
            })
          );
        }
        if (c <= 0) {
          clearInterval(timer);
          handleRoomPlay(currentTime);
        }
      }, 1000);
    } else {
      handleRoomPlay(currentTime);
    }
  };

  // ==========================================
  // WebRTC Mesh Voice Chat Implementation
  // ==========================================
  const sendVoiceSignal = (signalData) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'webrtc.signal',
          payload: {
            from: currentUsername,
            ...signalData,
          },
        })
      );
    }
  };

  const getOrCreatePeerConnection = (peerUser) => {
    if (peerConnectionsRef.current[peerUser]) {
      return peerConnectionsRef.current[peerUser];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local tracks if we are in voice
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendVoiceSignal({
          target: peerUser,
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let audioEl = audioElementsRef.current[peerUser];
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioElementsRef.current[peerUser] = audioEl;
        }
        audioEl.srcObject = remoteStream;
        audioEl.play().catch((e) => console.warn(`Could not autoplay audio for ${peerUser}:`, e));
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        closePeer(peerUser);
      }
    };

    peerConnectionsRef.current[peerUser] = pc;
    return pc;
  };

  const closePeer = (peerUser) => {
    if (peerConnectionsRef.current[peerUser]) {
      try {
        peerConnectionsRef.current[peerUser].close();
      } catch (e) {
        // ignore
      }
      delete peerConnectionsRef.current[peerUser];
    }
    if (audioElementsRef.current[peerUser]) {
      audioElementsRef.current[peerUser].srcObject = null;
      delete audioElementsRef.current[peerUser];
    }
    setVoiceParticipants((prev) => {
      const next = { ...prev };
      delete next[peerUser];
      return next;
    });
  };

  const handleIncomingWebRTCSignal = async (signal) => {
    const { from, target, type, offer, answer, candidate, muted, speaking } = signal;

    // Signal directed to someone else? Ignore
    if (target && target !== currentUsername) return;
    if (from === currentUsername) return;

    if (type === 'voice-joined') {
      // Another user joined voice. If we are currently in voice, initiate offer
      setVoiceParticipants((prev) => ({
        ...prev,
        [from]: { muted: Boolean(muted), speaking: false },
      }));

      if (localStreamRef.current) {
        try {
          const pc = getOrCreatePeerConnection(from);
          const localOffer = await pc.createOffer();
          await pc.setLocalDescription(localOffer);
          sendVoiceSignal({
            target: from,
            type: 'offer',
            offer: localOffer,
          });
        } catch (e) {
          console.warn(`Error creating offer to ${from}:`, e);
        }
      }
    } else if (type === 'voice-left') {
      closePeer(from);
    } else if (type === 'voice-state') {
      setVoiceParticipants((prev) => ({
        ...prev,
        [from]: {
          ...prev[from],
          muted: muted !== undefined ? muted : prev[from]?.muted,
          speaking: speaking !== undefined ? speaking : prev[from]?.speaking,
        },
      }));
    } else if (type === 'offer') {
      if (!localStreamRef.current) return;
      try {
        const pc = getOrCreatePeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const localAnswer = await pc.createAnswer();
        await pc.setLocalDescription(localAnswer);
        sendVoiceSignal({
          target: from,
          type: 'answer',
          answer: localAnswer,
        });
      } catch (e) {
        console.warn(`Error handling offer from ${from}:`, e);
      }
    } else if (type === 'answer') {
      try {
        const pc = peerConnectionsRef.current[from];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (e) {
        console.warn(`Error handling answer from ${from}:`, e);
      }
    } else if (type === 'candidate') {
      try {
        const pc = peerConnectionsRef.current[from];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.warn(`Error adding ICE candidate from ${from}:`, e);
      }
    }
  };

  const handleJoinVoice = async () => {
    setVoiceConnecting(true);
    setVoiceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setInVoice(true);
      setIsMuted(false);

      // Speaking volume detection
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          audioAnalyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let wasSpeaking = false;

          speakingDetectionIntervalRef.current = setInterval(() => {
            if (!localStreamRef.current || isMuted) {
              if (wasSpeaking) {
                wasSpeaking = false;
                sendVoiceSignal({ type: 'voice-state', speaking: false });
                setVoiceParticipants((prev) => ({
                  ...prev,
                  [currentUsername]: { ...prev[currentUsername], speaking: false },
                }));
              }
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const isSpeakingNow = avg > 15; // Threshold for speaking
            if (isSpeakingNow !== wasSpeaking) {
              wasSpeaking = isSpeakingNow;
              sendVoiceSignal({ type: 'voice-state', speaking: isSpeakingNow });
              setVoiceParticipants((prev) => ({
                ...prev,
                [currentUsername]: { ...prev[currentUsername], speaking: isSpeakingNow },
              }));
            }
          }, 250);
        }
      } catch (audioCtxErr) {
        console.warn('Could not initialize audio analyzer:', audioCtxErr);
      }

      // Add local user to voice list
      setVoiceParticipants((prev) => ({
        ...prev,
        [currentUsername]: { muted: false, speaking: false },
      }));

      // Broadcast join voice signal to peers
      sendVoiceSignal({
        type: 'voice-joined',
        muted: false,
      });
    } catch (err) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission was denied. Please allow microphone access to talk.');
      } else {
        setVoiceError(err.message || 'Could not access microphone.');
      }
      setInVoice(false);
    } finally {
      setVoiceConnecting(false);
    }
  };

  const handleLeaveVoice = () => {
    // 1. Stop local audio stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // 2. Clear speaking detection
    if (speakingDetectionIntervalRef.current) {
      clearInterval(speakingDetectionIntervalRef.current);
      speakingDetectionIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // 3. Close all peer connections
    Object.keys(peerConnectionsRef.current).forEach((peer) => {
      try {
        peerConnectionsRef.current[peer].close();
      } catch (e) {}
    });
    peerConnectionsRef.current = {};

    // 4. Clean up audio elements
    Object.keys(audioElementsRef.current).forEach((peer) => {
      audioElementsRef.current[peer].srcObject = null;
    });
    audioElementsRef.current = {};

    // 5. Broadcast voice-left signal
    sendVoiceSignal({ type: 'voice-left' });

    setInVoice(false);
    setIsMuted(false);
    setVoiceParticipants((prev) => {
      const next = { ...prev };
      delete next[currentUsername];
      return next;
    });
  };

  const handleToggleMute = () => {
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);

    // Broadcast updated mute state
    sendVoiceSignal({
      type: 'voice-state',
      muted: newMuted,
    });
    setVoiceParticipants((prev) => ({
      ...prev,
      [currentUsername]: { ...prev[currentUsername], muted: newMuted },
    }));
  };

  // Leave voice on component unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (speakingDetectionIntervalRef.current) {
        clearInterval(speakingDetectionIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      Object.keys(peerConnectionsRef.current).forEach((peer) => {
        try {
          peerConnectionsRef.current[peer].close();
        } catch (e) {}
      });
    };
  }, []);

  const copyInviteLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const loadFriendsForInvite = async () => {
    setFriendsLoading(true);
    try {
      const data = await authService.getFriends();
      setFriendsList(data?.friends || []);
    } catch (e) {
      console.warn('Could not load friends list for invite:', e);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleSendDirectInvite = async (friendUsername) => {
    setInvitingFriends((prev) => ({ ...prev, [friendUsername]: 'sending' }));
    try {
      await authService.sendRoomInvite(friendUsername, roomCode);
      setInvitingFriends((prev) => ({ ...prev, [friendUsername]: 'sent' }));
    } catch (e) {
      alert(e.message || 'Failed to send invite');
      setInvitingFriends((prev) => ({ ...prev, [friendUsername]: 'error' }));
    }
  };

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading watch room #{roomCode}...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
        <div className="card-cinema" style={{ maxWidth: '520px', margin: '0 auto', padding: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>Room Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            {error || `The room #${roomCode} does not exist or has been closed.`}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/join-room" className="btn btn-outline btn-sm">🔑 Join Another Room</Link>
            <Link to="/create-room" className="btn btn-primary btn-sm">Create a Room</Link>
          </div>
        </div>
      </div>
    );
  }

  const participantsList = room.participants || [];
  const latestUploadVideo = room?.uploaded_videos && room.uploaded_videos.length > 0
    ? room.uploaded_videos[room.uploaded_videos.length - 1]
    : null;

  const activeMovie = activeVideoSource || room.movie_details || (latestUploadVideo ? {
    title: latestUploadVideo.title || room.movie_title || room.title,
    source_type: 'direct_video',
    source_url: latestUploadVideo.playback_url,
    license_info: 'Room Uploaded Video',
  } : {
    title: room.movie_title || room.title,
    source_type: 'direct_video',
    source_url: 'https://archive.org/download/BigBuckBunny_124/Content%2Fbig_buck_bunny_720p_surround.mp4',
    source_video_id: 'BigBuckBunny_124',
    license_info: 'Creative Commons Attribution 3.0',
  });

  const handleOpenVideoModal = async () => {
    setVideoModalOpen(true);
    setFileError(null);
    setUploadStatusMsg('');
    if (catalogMovies.length === 0) {
      setLoadingCatalog(true);
      try {
        const res = await movieService.getMovies();
        setCatalogMovies(res?.results || []);
      } catch (e) {
        console.error('Failed to load catalog movies:', e);
      } finally {
        setLoadingCatalog(false);
      }
    }
  };

  // 1. Handle local file selection from device
  const handleDeviceFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setUploadStatusMsg('');

    // Supported formats check: MP4, WebM, MKV, MOV
    const validExtensions = ['.mp4', '.webm', '.mkv', '.mov'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt && !file.type.startsWith('video/')) {
      setFileError('Unsupported file type. Please select an MP4, WebM, MKV, or MOV video.');
      setSelectedFile(null);
      return;
    }

    // Size limit check (4GB / 4096MB for full HD feature films)
    if (file.size > 4096 * 1024 * 1024) {
      setFileError('File size exceeds the 4GB maximum limit. Please choose a video under 4GB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // 2. Play local video on this device only (via object URL)
  const handlePlayLocallyOnDevice = () => {
    if (!selectedFile) return;

    if (localVideoObjectUrlRef.current) {
      URL.revokeObjectURL(localVideoObjectUrlRef.current);
    }

    const objUrl = URL.createObjectURL(selectedFile);
    localVideoObjectUrlRef.current = objUrl;

    const localSource = {
      title: `${selectedFile.name} (Local Preview)`,
      source_type: 'direct_video',
      source_url: objUrl,
      source_video_id: 'local_file',
      license_info: 'Local Device Playback',
      is_local_device: true,
    };

    setActiveVideoSource(localSource);
    setCurrentTime(0);
    setIsPlaying(true);
    setVideoModalOpen(false);

    // Notify room via chat/backend
    roomService.selectVideo(roomCode, {
      source_type: 'local_device',
      title: selectedFile.name,
      user: currentUsername,
    }).catch(console.warn);
  };

  // 3. Upload video to room storage so ALL participants can watch in sync
  const handleUploadAndShareWithRoom = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusMsg('Preparing upload to room storage...');
    setFileError(null);

    try {
      const formData = new FormData();
      formData.append('video_file', selectedFile);
      formData.append('title', selectedFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('uploaded_by', currentUsername);

      const uploadRes = await roomService.uploadVideo(roomCode, formData, (percent) => {
        setUploadProgress(percent);
        setUploadStatusMsg(`Uploading: ${percent}%...`);
      });

      const uploadedVideo = uploadRes?.video;
      setUploadStatusMsg('Processing complete! Broadcasting video to room...');

      // Broadcast video switch to room
      await roomService.selectVideo(roomCode, {
        source_type: 'uploaded_video',
        video_id: uploadedVideo.id,
        user: currentUsername,
      });

      // Update local view immediately
      setActiveVideoSource({
        title: uploadedVideo.title,
        source_type: 'direct_video',
        source_url: uploadedVideo.playback_url,
        license_info: 'Room Uploaded Video',
      });
      setCurrentTime(0);
      setIsPlaying(true);
      setVideoModalOpen(false);
      setSelectedFile(null);
    } catch (err) {
      console.error('Video upload failed:', err);
      setFileError(err?.response?.data?.error || err.message || 'Upload failed. Please check network/storage.');
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Select existing catalog movie
  const handleSelectCatalogMovie = async (movie) => {
    try {
      await roomService.selectVideo(roomCode, {
        source_type: 'catalog_movie',
        movie_id: movie.id,
        user: currentUsername,
      });

      setActiveVideoSource({
        title: movie.title,
        source_type: movie.source_type,
        source_url: movie.source_url,
        source_video_id: movie.source_video_id,
        license_info: movie.license_info,
      });
      setCurrentTime(0);
      setIsPlaying(true);
      setVideoModalOpen(false);
    } catch (err) {
      console.error('Select catalog movie failed:', err);
      alert('Failed to switch room movie: ' + (err.message || 'Server error'));
    }
  };

  return (
    <div className="watch-room-dashboard">
      {/* Upper Context Bar */}
      <div
        className="card-cinema"
        style={{
          padding: 'var(--space-3) var(--space-5)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link
            to="/"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: 'var(--radius-full)',
              padding: '0.35rem 0.85rem',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title="Leave room and return to Home"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Home
          </Link>
          <span className="badge badge-accent">
            🎬 Private Watch Lounge
          </span>
          <h2 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
            {activeMovie?.title || room.movie_title || room.title}
          </h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Room: <code style={{ color: 'var(--accent-violet-light)' }}>#{room.code}</code>
          </span>
          {wsConnected ? (
            <span className="badge badge-synced">
              <span className="pulse-dot"></span>
              Live Sync
            </span>
          ) : (
            <span className="badge" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>
              Syncing...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={handleOpenVideoModal}
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-blue) 100%)',
              boxShadow: 'var(--glow-primary)',
            }}
          >
            🎬 Choose Video
          </button>
          <button
            onClick={() => {
              setInviteModalOpen(true);
              loadFriendsForInvite();
            }}
            className="btn btn-outline btn-sm"
          >
            🔗 Invite Friends
          </button>
          {/* Delete / Close Room button for Host */}
          {room?.host_name && (
            (user?.profile?.display_name && room.host_name.toLowerCase() === user.profile.display_name.toLowerCase()) ||
            (user?.username && room.host_name.toLowerCase() === user.username.toLowerCase()) ||
            (currentUsername && room.host_name.toLowerCase() === currentUsername.toLowerCase())
          ) && (
            <button
              onClick={async () => {
                const confirmed = window.confirm(`Are you sure you want to close room "${room.title || room.code}"? This will save your movie night memory and close the party.`);
                if (!confirmed) return;
                try {
                  // 1. Archive movie night memory
                  try {
                    await roomService.saveMovieSession({
                      room_code: roomCode,
                      title: room.title || 'Movie Night',
                      movie_title: activeMovie?.title || room.movie_title || room.title,
                      movie_poster: activeMovie?.poster_url || '',
                      host_username: user?.username || currentUsername,
                      participants: participantsList.map((p) => p.username),
                      total_messages_count: messages.length,
                      vibe_tag: 'Private Movie Night',
                    });
                  } catch (archiveErr) {
                    console.warn('Could not archive session memory:', archiveErr);
                  }

                  // 2. Delete room
                  await roomService.deleteRoom(roomCode);
                  navigate('/profile');
                } catch (e) {
                  alert('Failed to delete room: ' + (e.message || 'Server error'));
                }
              }}
              className="btn btn-outline btn-sm"
              style={{
                color: 'var(--status-error)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
              title="Close and save this movie night to your memories"
            >
              🏁 End Party & Save
            </button>
          )}

          <Link to="/" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
            Leave Room
          </Link>
        </div>
      </div>

      {/* Main Grid: Left Navigation Rail, Player Stage & Interactive Right Rail */}
      <div className="watch-room-layout">
        {/* 1. Left Sidebar Rail */}
        <aside className="cinema-left-rail">
          <div className="left-nav-card">
            <Link to="/" className="left-nav-item active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              Home
            </Link>
            <button onClick={() => { setActiveTab('watchlist'); setWatchlistModalOpen(true); }} className="left-nav-item" style={{ width: '100%', textAlign: 'left' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2z" />
              </svg>
              My Watchlist
            </button>
            <Link to="/free-movies" className="left-nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              Explore
            </Link>
            <Link to="/friends" className="left-nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Friends
            </Link>
            <Link to="/create-room" className="left-nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Private Rooms
            </Link>
          </div>

          {/* Quick Rooms Section */}
          <div className="left-nav-card">
            <div className="left-section-title">
              <span>My Rooms</span>
              <Link to="/create-room" className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', borderRadius: 'var(--radius-full)' }}>
                + New
              </Link>
            </div>
            <div className="room-mini-card active">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>{room.title || 'Movie Night'}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)' }}>● {participantsList.length || 1} watching</span>
              </div>
              <span style={{ fontSize: '0.75rem' }}>›</span>
            </div>
          </div>
        </aside>

        {/* 2. Center: Video Player Stage */}
        <div className="video-stage-container">
          <div className="cinema-screen-wrapper">
            {/* Top Film Bar Overlay */}
            <div className="film-info-tag">
              <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div>
                <div className="film-info-title">{activeMovie?.title || room.movie_title || room.title}</div>
                <div className="film-info-meta">{activeMovie?.genre || room.genre || 'Sci-Fi · Cinema'} · In Sync</div>
              </div>
            </div>

            <div className="film-synced-indicator">
              <span className="pulse-dot"></span>
              Synced 📶
            </div>
            {/* Actual Playable Video Player */}
            <VideoPlayer
              movie={activeMovie}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isHost={true}
              onPlay={handleRoomPlay}
              onPause={handleRoomPause}
              onSeek={handleRoomSeek}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onDurationChange={(d) => setDuration(d)}
            />

            {/* Floating Reactions Layer */}
            <div className="floating-reactions-container">
              {reactions.map((r) => (
                <div key={r.id} className="floating-emoji" style={{ left: `${r.x}%` }}>
                  {r.emoji}
                </div>
              ))}
            </div>

            {/* Ready Check Synchronized Countdown Overlay */}
            {countdown !== null && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(6, 9, 19, 0.85)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 40,
                }}
              >
                <div style={{ fontSize: 'var(--text-base)', color: 'var(--accent-aurora)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                  🎬 Movie Night Starting In
                </div>
                <div
                  style={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: '#fff',
                    textShadow: '0 0 30px rgba(56, 189, 248, 0.8)',
                    animation: 'pulse 1s infinite',
                  }}
                >
                  {countdown > 0 ? countdown : 'GO!'}
                </div>
              </div>
            )}
          </div>

          {/* Shared Playback Controller Strip (Every participant can control) */}
          <div className="card-glass" style={{ padding: 'var(--space-3) var(--space-5)' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <button
                  onClick={() => (isPlaying ? handleRoomPause() : handleRoomPlay())}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '0.4rem 0.9rem' }}
                  title="Toggle playback for everyone"
                >
                  {isPlaying ? '❚❚ Pause Party' : '▶ Play Party'}
                </button>

                {/* Ready Check Button */}
                <button
                  onClick={handleToggleReady}
                  className="btn btn-sm"
                  style={{
                    background: readyMap[currentUsername] ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: readyMap[currentUsername] ? 'var(--status-healthy)' : 'var(--text-secondary)',
                    border: readyMap[currentUsername] ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.75rem',
                  }}
                  title="Mark yourself ready to start watching"
                >
                  {readyMap[currentUsername] ? '✓ You Are Ready' : '🍿 Mark Ready'}
                </button>

                {/* Countdown trigger for everyone */}
                <button
                  onClick={handleStartCountdown}
                  className="btn btn-outline btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.4rem 0.75rem',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    color: 'var(--accent-aurora)',
                  }}
                  title="Trigger synchronized 5-second countdown for everyone"
                >
                  ⏱ 5s Countdown
                </button>
                <button
                  onClick={() => handleRoomSeek(Math.max(0, currentTime - 10))}
                  className="btn btn-outline btn-sm"
                  title="Rewind 10 seconds for all participants"
                >
                  ↺ 10s
                </button>
                <button
                  onClick={() => handleRoomSeek(currentTime + 10)}
                  className="btn btn-outline btn-sm"
                  title="Forward 10 seconds for all participants"
                >
                  10s ↻
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    type="range"
                    min="0"
                    max={duration || 600}
                    step="1"
                    value={currentTime}
                    onChange={(e) => handleRoomSeek(parseFloat(e.target.value))}
                    style={{
                      width: '120px',
                      accentColor: 'var(--accent-aurora)',
                      cursor: 'pointer',
                    }}
                    title="Seek playback position for everyone"
                  />
                  <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Emoji Burst Triggers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }} className="hide-mobile">
                  React:
                </span>
                {['🔥', '😂', '😱', '❤️', '👏', '🍿'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => triggerReaction(emoji)}
                    className="reaction-btn"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lower Cinema Stage: Presence Bar & Voice Hub */}
          <div className="cinema-lower-stage">
            <div className="room-stage-header">
              <div className="room-stage-title-wrap">
                <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: '#ffffff' }}>
                    {room.title || 'Movie Night'} 🔒
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Private Room · {participantsList.length || 1}/8 watching
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Link to="/" className="btn btn-secondary btn-sm">
                  Leave Room
                </Link>
                <button
                  onClick={() => {
                    setInviteModalOpen(true);
                    loadFriendsForInvite();
                  }}
                  className="btn btn-primary btn-sm"
                >
                  👥 Invite Friends
                </button>
              </div>
            </div>

            {/* Presence Avatars Row & Live Voice Waves */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 'var(--space-6)', alignItems: 'center' }}>
              {/* Left: Participant Presence Nodes */}
              <div className="presence-avatars-row">
                {/* Current User */}
                <div className="participant-presence-node">
                  <div className={`avatar-presence-ring ${voiceParticipants[currentUsername]?.speaking ? 'speaking' : ''}`}>
                    <Avatar name={currentUsername} size="lg" />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff' }}>You</span>
                  <span style={{ fontSize: '0.68rem', color: voiceParticipants[currentUsername]?.speaking ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {voiceParticipants[currentUsername]?.speaking ? 'Speaking' : 'Watching'}
                  </span>
                </div>

                {/* Other Participants */}
                {participantsList.filter((p) => p.username !== currentUsername).map((p) => {
                  const isSpeaking = voiceParticipants[p.username]?.speaking;
                  return (
                    <div key={p.id || p.username} className="participant-presence-node">
                      <div className={`avatar-presence-ring ${isSpeaking ? 'speaking' : ''}`}>
                        <Avatar name={p.username} size="lg" />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff' }}>{p.username}</span>
                      <span style={{ fontSize: '0.68rem', color: isSpeaking ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                        {isSpeaking ? 'Speaking' : 'Watching'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right: Dedicated Voice Chat Control Hub */}
              <div className="voice-chat-hub">
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: inVoice ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: inVoice ? '0 0 16px rgba(168, 85, 247, 0.4)' : 'none' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎙️</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#ffffff' }}>Voice Chat</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {Object.keys(voiceParticipants).length} in room
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {!inVoice ? (
                    <button
                      onClick={handleJoinVoice}
                      disabled={voiceConnecting}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem' }}
                    >
                      {voiceConnecting ? 'Joining...' : 'Join Voice'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleToggleMute}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
                      >
                        {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                      </button>
                      <button
                        onClick={handleLeaveVoice}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', color: 'var(--status-error)' }}
                      >
                        Leave
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Waveform Tagline Banner */}
            <div className="cinema-waveform-banner">
              <svg width="120" height="24" viewBox="0 0 120 24" fill="none">
                <path d="M10 12C20 6 30 18 40 12C50 6 60 18 70 12C80 4 90 20 100 12C110 6 115 14 120 12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="waveform-tagline">Same movie. Different places. One vibe.</span>
            </div>
          </div>
        </div>

        {/* Right: Live Chat & Attendee Panel */}
        <div className="cinema-right-rail">
          <div className="rail-tabs-bar">
            <button
              onClick={() => setActiveTab('chat')}
              className={`rail-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('attendees')}
              className={`rail-tab-btn ${activeTab === 'attendees' ? 'active' : ''}`}
            >
              🎙️ Voice ({Object.keys(voiceParticipants).length})
            </button>
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`rail-tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
            >
              👥 Members ({participantsList.length || 1})
            </button>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="chat-messages-scroll" ref={chatScrollRef}>
                {messages.map((msg) => {
                  const isSpoiler = Boolean(msg.is_spoiler);
                  const isRevealed = Boolean(revealedSpoilers[msg.id]);

                  return (
                    <div key={msg.id} className="chat-message-item">
                      <Avatar name={msg.user} size="sm" />
                      <div className="chat-bubble">
                        <div className="chat-meta">
                          <span className="chat-author" style={{ color: msg.isHost ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                            {msg.user}
                          </span>
                          {isSpoiler && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              ⚠️ SPOILER
                            </span>
                          )}
                          <span className="chat-time">{msg.time}</span>
                        </div>
                        {isSpoiler && !isRevealed ? (
                          <div
                            onClick={() => setRevealedSpoilers((prev) => ({ ...prev, [msg.id]: true }))}
                            style={{
                              filter: 'blur(5px)',
                              userSelect: 'none',
                              cursor: 'pointer',
                              background: 'rgba(255, 255, 255, 0.05)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              color: 'var(--text-muted)',
                            }}
                            title="Click to reveal spoiler"
                          >
                            {msg.text}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-secondary)' }}>
                            {msg.text}
                            {isSpoiler && isRevealed && (
                              <span
                                onClick={() => setRevealedSpoilers((prev) => ({ ...prev, [msg.id]: false }))}
                                style={{
                                  fontSize: '0.65rem',
                                  color: 'var(--accent-aurora)',
                                  marginLeft: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                (hide)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.7rem', color: isSpoilerInput ? '#f87171' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isSpoilerInput}
                      onChange={(e) => setIsSpoilerInput(e.target.checked)}
                      style={{ accentColor: '#ef4444' }}
                    />
                    ⚠️ Mark as Spoiler
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={isSpoilerInput ? 'Type spoiler message (will be blurred)...' : 'Type in live room chat...'}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    style={{
                      padding: '0.65rem 0.95rem',
                      fontSize: 'var(--text-xs)',
                      borderColor: isSpoilerInput ? 'rgba(239, 68, 68, 0.5)' : undefined,
                    }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.65rem 1rem' }}>
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : activeTab === 'attendees' ? (
            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {participantsList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  Host: {room.host_name} (Active)
                </div>
              ) : (
                participantsList.map((attendee) => (
                  <div key={attendee.id} className="flex-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <Avatar name={attendee.username} size="sm" status={attendee.is_active ? 'online' : 'offline'} />
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{attendee.username}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{attendee.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {voiceParticipants[attendee.username] ? (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.62rem',
                            background: voiceParticipants[attendee.username].speaking ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.1)',
                            color: 'var(--accent-aurora)',
                            border: voiceParticipants[attendee.username].speaking ? '1px solid var(--accent-aurora)' : '1px solid rgba(56, 189, 248, 0.3)',
                          }}
                        >
                          {voiceParticipants[attendee.username].muted ? '🔇 Muted' : voiceParticipants[attendee.username].speaking ? '🗣️ Speaking' : '🎙️ In Voice'}
                        </span>
                      ) : null}
                      {readyMap[attendee.username] ? (
                        <span className="badge badge-healthy" style={{ fontSize: '0.65rem' }}>✓ Ready</span>
                      ) : (
                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>Waiting</span>
                      )}
                      <span className="badge badge-healthy" style={{ fontSize: '0.65rem' }}>Synced</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Watchlist & Voting Panel */
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Shared Watchlist
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Suggest movies & vote on what to watch next
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleOpenVideoModal();
                    setVideoModalTab('catalog');
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                >
                  + Suggest Movie
                </button>
              </div>

              {/* Leading movie banner if votes exist */}
              {(() => {
                const maxVotes = Math.max(0, ...watchlistItems.map((i) => i.vote_count));
                const leaders = watchlistItems.filter((i) => i.vote_count === maxVotes && maxVotes > 0);
                if (leaders.length === 1) {
                  return (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-2) var(--space-3)',
                        marginBottom: 'var(--space-3)',
                        fontSize: 'var(--text-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--accent-aurora)', fontWeight: 700 }}>👑 Leading: </span>
                        <strong>{leaders[0].movie_details?.title}</strong> ({leaders[0].vote_count} votes)
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await roomService.selectWinnerWatchlist(roomCode, {
                              item_id: leaders[0].id,
                              user: currentUsername,
                            });
                          } catch (err) {
                            alert(err.message || 'Failed to start movie');
                          }
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                      >
                        ▶ Watch Winner
                      </button>
                    </div>
                  );
                } else if (leaders.length > 1) {
                  return (
                    <div
                      style={{
                        background: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-2) var(--space-3)',
                        marginBottom: 'var(--space-3)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--status-warning)',
                      }}
                    >
                      ⚖️ <strong>Vote Tie!</strong> {leaders.map((l) => l.movie_details?.title).join(' & ')} ({maxVotes} votes each). Keep voting to break tie!
                    </div>
                  );
                }
                return null;
              })()}

              {/* Watchlist list */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {watchlistItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>🎬</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>The Watchlist is Empty</div>
                    <div style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                      Browse free movies and add ideas for the room to vote on!
                    </div>
                  </div>
                ) : (
                  watchlistItems.map((item) => {
                    const hasVotedThis = item.voters?.includes(currentUsername);
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: hasVotedThis ? '1px solid var(--accent-violet)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-2) var(--space-3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div style={{ width: '40px', height: '54px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                          {item.movie_details?.poster_url ? (
                            <img
                              src={item.movie_details.poster_url}
                              alt={item.movie_details.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="flex-center" style={{ width: '100%', height: '100%', fontSize: '0.8rem' }}>🎬</div>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.movie_details?.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {item.movie_details?.year} • By {item.suggested_by}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px' }}>
                            <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-aurora)' }}>
                              🗳️ {item.vote_count} {item.vote_count === 1 ? 'vote' : 'votes'}
                            </span>
                            {hasVotedThis && (
                              <span style={{ fontSize: '0.62rem', color: 'var(--status-healthy)' }}>✓ You voted</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={async () => {
                              try {
                                await roomService.voteWatchlist(roomCode, {
                                  item_id: item.id,
                                  username: currentUsername,
                                });
                              } catch (err) {
                                alert(err.message || 'Voting failed');
                              }
                            }}
                            className={hasVotedThis ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                            style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                            title="Vote for this movie"
                          >
                            {hasVotedThis ? 'Voted ★' : 'Vote'}
                          </button>

                          {(item.suggested_by === currentUsername || isHost) && (
                            <button
                              onClick={async () => {
                                try {
                                  await roomService.removeFromWatchlist(roomCode, item.id);
                                } catch (err) {
                                  alert(err.message || 'Failed to remove');
                                }
                              }}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', color: 'var(--text-muted)' }}
                              title="Remove suggestion"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Friends to Watch Party"
      >
        <div>
          <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Share this link with your friends. If they are on the same Wi-Fi network, they can use the <strong>Network / LAN Link</strong> to join your room.
          </p>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Room Code</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="text"
                readOnly
                className="form-input"
                value={room?.code || roomCode}
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--accent-aurora)' }}
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(room?.code || roomCode);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn btn-outline btn-sm"
              >
                Copy Code
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Direct Invite URL</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                readOnly
                className="form-input"
                value={window.location.href}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
              />
              <button onClick={copyInviteLink} className="btn btn-primary btn-sm">
                {copiedLink ? 'Copied! ✓' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* 1-Click Direct Invite Friends Section */}
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
              <label className="form-label" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                👥 Send 1-Click Invite to Friends
              </label>
              <Link to="/friends" target="_blank" style={{ fontSize: '0.7rem', color: 'var(--accent-aurora)' }}>
                Manage Friends ↗
              </Link>
            </div>

            {friendsLoading ? (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>
                Loading friends list...
              </div>
            ) : friendsList.length === 0 ? (
              <div style={{ padding: 'var(--space-3)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                No friends added yet. Connect with movie friends on your <Link to="/friends" style={{ color: 'var(--accent-blue)' }}>Friends Page</Link> to invite them directly!
              </div>
            ) : (
              <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {friendsList.map((friend) => {
                  const status = invitingFriends[friend.username];
                  return (
                    <div
                      key={friend.id}
                      className="flex-between"
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Avatar name={friend.profile?.display_name || friend.username} size="sm" />
                        <div>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            {friend.profile?.display_name || friend.username}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            @{friend.username}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendDirectInvite(friend.username)}
                        disabled={status === 'sending' || status === 'sent'}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.25rem 0.6rem',
                          background: status === 'sent' ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-blue) 100%)',
                          color: status === 'sent' ? 'var(--status-healthy)' : '#fff',
                          border: status === 'sent' ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                        }}
                      >
                        {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Invited ✓' : '✉ Invite'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {window.location.hostname === 'localhost' && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ color: 'var(--accent-aurora)', fontWeight: 600, marginBottom: '0.25rem' }}>
                💡 Friend on the same Wi-Fi?
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                They can join by opening your local IP address in their browser:
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={`http://192.168.1.16:5173/rooms/${roomCode}`}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`http://192.168.1.16:5173/rooms/${roomCode}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                >
                  Copy LAN Link
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: 'var(--space-5)' }}>
            <button onClick={() => setInviteModalOpen(false)} className="btn btn-outline btn-sm">
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Choose Video Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => {
          if (!isUploading) setVideoModalOpen(false);
        }}
        title="🎬 Choose Watch Party Video"
        maxWidth="620px"
      >
        <div>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 'var(--space-3)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <button
              onClick={() => setVideoModalTab('device')}
              className={videoModalTab === 'device' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            >
              💻 Choose from My Device
            </button>
            <button
              onClick={() => setVideoModalTab('catalog')}
              className={videoModalTab === 'catalog' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            >
              🎞️ Vybeora Free Movies
            </button>
          </div>

          {/* Tab 1: Local Device Video */}
          {videoModalTab === 'device' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                Select an MP4, WebM, MKV, or MOV video file directly from your computer.
              </p>

              {/* File Input Box */}
              <div
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <input
                  type="file"
                  id="local-video-file-input"
                  accept="video/mp4,video/webm,video/x-matroska,video/quicktime,.mp4,.webm,.mkv,.mov"
                  onChange={handleDeviceFileSelect}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                <label
                  htmlFor="local-video-file-input"
                  className="btn btn-outline btn-sm"
                  style={{ cursor: isUploading ? 'not-allowed' : 'pointer', marginBottom: 'var(--space-2)' }}
                >
                  📁 Browse Device Video...
                </label>

                {selectedFile ? (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-aurora)', fontSize: 'var(--text-sm)' }}>
                      Selected: {selectedFile.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Type: {selectedFile.type || 'Video'}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                    Supported formats: MP4, WebM, MKV, MOV (Max: 4GB)
                  </div>
                )}
              </div>

              {fileError && (
                <div
                  style={{
                    color: 'var(--status-error)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  ⚠️ {fileError}
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploading && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="flex-between" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>
                    <span style={{ color: 'var(--accent-aurora)' }}>{uploadStatusMsg}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{uploadProgress}%</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-aurora))',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Local Preview vs Shared Upload */}
              {selectedFile && !isUploading && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        Option A: Upload & Share with Room
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Uploads video to room backend so ALL friends watch in live sync.
                      </div>
                    </div>
                    <button
                      onClick={handleUploadAndShareWithRoom}
                      className="btn btn-primary btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      ☁️ Upload & Sync All
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        Option B: Preview on My Device Only
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Plays instantly from local disk without upload (other viewers cannot see file).
                      </div>
                    </div>
                    <button
                      onClick={handlePlayLocallyOnDevice}
                      className="btn btn-outline btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      💻 Play Locally
                    </button>
                  </div>
                </div>
              )}

              {/* Uploaded Videos List */}
              {room?.uploaded_videos && room.uploaded_videos.length > 0 && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                    Previously Uploaded to this Room ({room.uploaded_videos.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '140px', overflowY: 'auto' }}>
                    {room.uploaded_videos.map((vid) => (
                      <div
                        key={vid.id}
                        className="flex-between"
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{vid.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            Uploaded by {vid.uploaded_by} • {(vid.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await roomService.selectVideo(roomCode, {
                              source_type: 'uploaded_video',
                              video_id: vid.id,
                              user: currentUsername,
                            });
                            setActiveVideoSource({
                              title: vid.title,
                              source_type: 'direct_video',
                              source_url: vid.playback_url,
                              license_info: 'Room Uploaded Video',
                            });
                            setCurrentTime(0);
                            setIsPlaying(true);
                            setVideoModalOpen(false);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        >
                          ▶ Switch to This
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Vybeora Available Movies */}
          {videoModalTab === 'catalog' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                Switch to any movie from Vybeora's openly authorized library.
              </p>
              {loadingCatalog ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                  Loading library movies...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 'var(--space-3)',
                    maxHeight: '360px',
                    overflowY: 'auto',
                    padding: 'var(--space-1)',
                  }}
                >
                  {catalogMovies.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleSelectCatalogMovie(m)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                        transition: 'transform 0.15s ease, border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-aurora)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ height: '90px', background: '#090d1a', position: 'relative' }}>
                        {m.poster_url ? (
                          <img
                            src={m.poster_url}
                            alt={m.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="flex-center" style={{ width: '100%', height: '100%', color: 'var(--text-muted)' }}>
                            🎬
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 'var(--space-2)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.title}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                          {m.year} • {m.genre}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await roomService.addToWatchlist(roomCode, {
                                  movie_id: m.id,
                                  username: currentUsername,
                                });
                                setActiveTab('watchlist');
                                setVideoModalOpen(false);
                              } catch (err) {
                                alert(err.message || 'Already in watchlist');
                              }
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, fontSize: '0.62rem', padding: '0.2rem 0.3rem', whiteSpace: 'nowrap' }}
                            title="Add to shared watchlist for voting"
                          >
                            + Watchlist
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCatalogMovie(m);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.62rem', padding: '0.2rem 0.3rem', whiteSpace: 'nowrap' }}
                            title="Play this movie immediately"
                          >
                            ▶ Play
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: 'var(--space-5)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
            <button
              onClick={() => setVideoModalOpen(false)}
              className="btn btn-ghost btn-sm"
              disabled={isUploading}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default WatchRoomPage;

