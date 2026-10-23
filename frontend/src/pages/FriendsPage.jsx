import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';

export function FriendsPage() {
  const navigate = useNavigate();
  const [friendsData, setFriendsData] = useState({
    friends: [],
    incoming_requests: [],
    outgoing_requests: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [friendToDelete, setFriendToDelete] = useState(null);
  const [deletingFriend, setDeletingFriend] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchFriends();

    const handleSync = () => {
      fetchFriends();
    };

    window.addEventListener('vybeora_notifications_update', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('vybeora_notifications_update', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await authService.getFriends();
      setFriendsData(data);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const results = await authService.searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('User search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (username) => {
    try {
      const res = await authService.sendFriendRequest(username);
      setActionMsg(res.message || `Friend request sent to ${username}!`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchFriends();
      // Update the user's status directly in the search results
      setSearchResults((prev) =>
        prev.map((u) =>
          u.username === username
            ? { ...u, friendship_status: 'pending_outgoing' }
            : u
        )
      );
    } catch (err) {
      alert(err.message || 'Failed to send request');
    }
  };

  const handleRespond = async (friendshipId, action) => {
    try {
      setErrorMessage(null);
      await authService.respondFriendRequest(friendshipId, action);
      fetchFriends();
    } catch (err) {
      setErrorMessage(err.message || 'Action failed');
    }
  };

  const confirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    setDeletingFriend(true);
    setErrorMessage(null);
    try {
      await authService.removeFriend(friendToDelete.friendship_id);
      setFriendToDelete(null);
      setActionMsg(`Removed friend.`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchFriends();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove friend');
    } finally {
      setDeletingFriend(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4) var(--space-20) var(--space-4)', maxWidth: '860px' }}>
      {/* Top Navigation Bar with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-full)',
            padding: '0.45rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div className="badge badge-accent" style={{ marginBottom: 'var(--space-2)' }}>
          👥 Social Circle
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Buddies & Movie Crew</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          Connect with friends to sync watch parties, invite crew members, and maintain shared movie nights.
        </p>
      </div>

      {actionMsg && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', color: 'var(--status-healthy)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
          ✓ {actionMsg}
        </div>
      )}

      {/* Search Bar */}
      <div className="card-cinema" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>Find Movie Friends</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by username or display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={searching || !searchQuery.trim()}>
            {searching ? 'Searching...' : '🔍 Search'}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex-between"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={user.profile?.display_name || user.username} size="sm" />
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {user.profile?.display_name || user.username}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      @{user.username}
                    </div>
                  </div>
                </div>
                {(() => {
                  const isFriend =
                    user.friendship_status === 'friends' ||
                    friendsData.friends?.some((f) => f.username === user.username);
                  const isPendingOutgoing =
                    user.friendship_status === 'pending_outgoing' ||
                    friendsData.outgoing_requests?.some(
                      (r) => r.receiver?.username === user.username
                    );
                  const incomingReq =
                    user.friendship_status === 'pending_incoming' ||
                    friendsData.incoming_requests?.find(
                      (r) => r.requester?.username === user.username
                    );

                  if (isFriend) {
                    return (
                      <span
                        className="badge badge-healthy"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.65rem',
                          fontWeight: 600,
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: 'var(--status-healthy)',
                        }}
                      >
                        ✓ Already Friends
                      </span>
                    );
                  }

                  if (isPendingOutgoing) {
                    return (
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.65rem',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          color: '#facc15',
                        }}
                      >
                        ⏳ Request Pending
                      </span>
                    );
                  }

                  if (incomingReq) {
                    const reqId = typeof incomingReq === 'object' ? incomingReq.id : user.friendship_id;
                    return (
                      <button
                        onClick={() => handleRespond(reqId, 'accept')}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Accept Request
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => handleSendRequest(user.username)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      + Add Friend
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Incoming Requests */}
      {friendsData.incoming_requests && friendsData.incoming_requests.length > 0 && (
        <div className="card-glass" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--status-warning)', marginBottom: 'var(--space-3)' }}>
            📬 Incoming Friend Requests ({friendsData.incoming_requests.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {friendsData.incoming_requests.map((req) => (
              <div key={req.id} className="flex-between" style={{ padding: 'var(--space-2) 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={req.requester?.profile?.display_name || req.requester?.username} size="sm" />
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      {req.requester?.profile?.display_name || req.requester?.username}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      @{req.requester?.username}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'decline')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Friends List */}
      <div className="card-cinema" style={{ padding: 'var(--space-6)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-5)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
            My Friends ({friendsData.friends?.length || 0})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
            Loading your movie crew...
          </div>
        ) : friendsData.friends?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>👥</div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Friends Added Yet
            </div>
            <p style={{ fontSize: 'var(--text-xs)', maxWidth: '380px', margin: 'var(--space-2) auto' }}>
              Search for friends above using their username to build your movie circle and invite them to private watch parties.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            {friendsData.friends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={friend.profile?.display_name || friend.username} size="md" status="online" />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {friend.profile?.display_name || friend.username}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      @{friend.username}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-subtle)' }}>
                  <Link
                    to="/create-room"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, fontSize: '0.7rem', textAlign: 'center', padding: '0.3rem 0' }}
                  >
                    🎬 Host Party
                  </Link>
                  <button
                    onClick={() => setFriendToDelete(friend)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.3rem 0.5rem' }}
                    title="Remove friend"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-Screen Remove Friend Confirmation Modal */}
      <Modal
        isOpen={Boolean(friendToDelete)}
        onClose={() => !deletingFriend && setFriendToDelete(null)}
        title="Remove Friend"
      >
        <div style={{ padding: 'var(--space-2) 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            Are you sure you want to remove <strong>@{friendToDelete?.username}</strong> from your friends list?
          </p>
          {errorMessage && (
            <div style={{ color: 'var(--status-error)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
              ⚠️ {errorMessage}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setFriendToDelete(null)}
              className="btn btn-ghost btn-sm"
              disabled={deletingFriend}
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteFriend}
              className="btn btn-sm"
              style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600 }}
              disabled={deletingFriend}
            >
              {deletingFriend ? 'Removing...' : 'Remove Friend'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FriendsPage;
