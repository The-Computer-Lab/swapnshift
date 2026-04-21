import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Admin({ user, onLogout, onGoHome, onGoLanding }) {
  const [tab, setTab] = useState('pending');

  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState('');

  const [allUsers, setAllUsers] = useState([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [allUsersError, setAllUsersError] = useState('');
  const [allUsersFetched, setAllUsersFetched] = useState(false);

  const [actionMsg, setActionMsg] = useState(null); // { text, type }

  useEffect(() => {
    fetchPending();
  }, []);

  useEffect(() => {
    if (tab === 'users' && !allUsersFetched) {
      fetchAllUsers();
    }
  }, [tab]);

  async function fetchPending() {
    setPendingLoading(true);
    setPendingError('');
    try {
      const data = await api.getPendingUsers();
      setPending(data.users);
    } catch (err) {
      setPendingError(err.message);
    } finally {
      setPendingLoading(false);
    }
  }

  async function fetchAllUsers() {
    setAllUsersLoading(true);
    setAllUsersError('');
    try {
      const data = await api.getAllUsers();
      setAllUsers(data.users);
      setAllUsersFetched(true);
    } catch (err) {
      setAllUsersError(err.message);
    } finally {
      setAllUsersLoading(false);
    }
  }

  async function handleApprove(id) {
    setActionMsg(null);
    try {
      await api.approveUser(id);
      setActionMsg({ text: 'User approved.', type: 'success' });
      setPending(p => p.filter(u => u.id !== id));
      setAllUsersFetched(false);
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  }

  async function handleReject(id) {
    setActionMsg(null);
    try {
      await api.rejectUser(id);
      setActionMsg({ text: 'User rejected.', type: 'success' });
      setPending(p => p.filter(u => u.id !== id));
      setAllUsersFetched(false);
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  }

  async function handleDelete(id) {
    setActionMsg(null);
    try {
      await api.deleteUser(id);
      setActionMsg({ text: 'User deleted.', type: 'success' });
      setAllUsers(u => u.filter(x => x.id !== id));
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    onLogout();
  }

  return (
    <div className="home">
      <header>
        <button className="logo-btn" onClick={onGoLanding}>SwapNShift</button>
        <div className="header-right">
          <span>{user.name} · Admin</span>
          <button className="link-btn" onClick={onGoHome}>Staff view</button>
          <button className="link-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main>
        <div className="panel">
          <div className="admin-tabs">
            <button
              className={`tab-btn${tab === 'pending' ? ' tab-btn--active' : ''}`}
              onClick={() => setTab('pending')}
            >
              Pending approvals
              {pending.length > 0 && <span className="badge">{pending.length}</span>}
            </button>
            <button
              className={`tab-btn${tab === 'users' ? ' tab-btn--active' : ''}`}
              onClick={() => setTab('users')}
            >
              All users
            </button>
          </div>

          {actionMsg && (
            <p className={actionMsg.type === 'success' ? 'success' : 'error'} style={{ margin: '1rem 0 0' }}>
              {actionMsg.text}
            </p>
          )}

          {/* Pending approvals tab */}
          {tab === 'pending' && (
            <>
              {pendingLoading && <p className="muted" style={{ marginTop: '1rem' }}>Loading…</p>}
              {pendingError && <p className="error" style={{ marginTop: '1rem' }}>{pendingError}</p>}
              {!pendingLoading && !pendingError && pending.length === 0 && (
                <p className="muted" style={{ marginTop: '1rem' }}>No pending registrations.</p>
              )}
              {pending.length > 0 && (
              <div className="table-scroll" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Shift</th>
                      <th>Registered</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.shift ?? '—'}</td>
                        <td>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                        <td>
                          <div className="action-btns">
                            <button className="accept-btn" onClick={() => handleApprove(u.id)}>
                              Approve
                            </button>
                            <button className="decline-btn" onClick={() => handleReject(u.id)}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </>
          )}

          {/* All users tab */}
          {tab === 'users' && (
            <>
              {allUsersLoading && <p className="muted" style={{ marginTop: '1rem' }}>Loading…</p>}
              {allUsersError && <p className="error" style={{ marginTop: '1rem' }}>{allUsersError}</p>}
              {!allUsersLoading && !allUsersError && allUsers.length === 0 && (
                <p className="muted" style={{ marginTop: '1rem' }}>No users found.</p>
              )}
              {allUsers.length > 0 && (
              <div className="table-scroll" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Shift</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.shift ?? '—'}</td>
                        <td>{u.role}</td>
                        <td>
                          <span className={`status-badge status-${u.status}`}>{u.status}</span>
                        </td>
                        <td>
                          {u.id !== user.id && (
                            <button className="decline-btn" onClick={() => handleDelete(u.id)}>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
