import { useState, useEffect } from 'react';
import { api } from '../api';
import HowToUse from '../components/HowToUse';
import { getShift } from '../utils/rota';

// ── Shift rota helpers ────────────────────────────────────────────────────────

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getNext14Days(shiftGroup) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { date, shift: getShift(shiftGroup, date) };
  });
}

function get6MonthCalendar(shiftGroup) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const months = [];
  for (let m = 0; m < 6; m++) {
    const first = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = first.getDay();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ date, shift: getShift(shiftGroup, date) });
    }
    months.push({ year, month, startDow, days });
  }
  return months;
}

// ── Date formatting ───────────────────────────────────────────────────────────

const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS        = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_SHORT  = ['S','M','T','W','T','F','S'];

function formatDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatDateLong(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]} ${d} ${MONTHS_FULL[m - 1]} ${y}`;
}

function formatRotaDate(date) {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// ── 6-month calendar ──────────────────────────────────────────────────────────

function SixMonthCalendar({ shiftGroup }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calendar = get6MonthCalendar(shiftGroup);

  return (
    <div className="cal-months">
      {calendar.map(({ year, month, startDow, days }) => (
        <div key={`${year}-${month}`} className="cal-month">
          <div className="cal-month-header">{MONTHS_FULL[month]} {year}</div>
          <div className="cal-grid">
            {DAYS_SHORT.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
            {Array.from({ length: startDow }, (_, i) => <div key={`empty-${i}`} className="cal-empty" />)}
            {days.map(({ date, shift }) => {
              const isToday = date.getTime() === today.getTime();
              return (
                <div
                  key={date.getDate()}
                  className={`cal-day cal-day--${shift ? shift.toLowerCase() : 'off'}${isToday ? ' cal-day--today' : ''}`}
                  title={shift}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="cal-legend">
        <span className="cal-legend-item cal-legend--day">Day</span>
        <span className="cal-legend-item cal-legend--night">Night</span>
        <span className="cal-legend-item cal-legend--off">Off</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home({ user, onLogout, onGoAdmin, onGoLanding, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('rota');
  const [showGuide, setShowGuide] = useState(false);

  // ── Swaps state ──
  const [swaps, setSwaps] = useState([]);
  const [loadingSwaps, setLoadingSwaps] = useState(true);
  const [swapError, setSwapError] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [form, setForm] = useState({ shift_date: '', shift_date_end: '', shift_type: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  // ── Pending swaps (awaiting confirmation) state ──
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // ── Counter-offer form state ──
  const [acceptingId, setAcceptingId] = useState(null); // which swap is being accepted
  const [counterDate, setCounterDate] = useState('');
  const [counterShiftTime, setCounterShiftTime] = useState('');
  const [counterError, setCounterError] = useState('');
  const [counterLoading, setCounterLoading] = useState(false);

  // ── History state ──
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);

  // ── Profile state ──
  const [profileFirstName, setProfileFirstName] = useState(user.name.split(' ')[0] || '');
  const [profileLastName, setProfileLastName] = useState(user.name.split(' ').slice(1).join(' ') || '');
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileShift, setProfileShift] = useState(user.shift);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const rotaDays = getNext14Days(user.shift);

  useEffect(() => { fetchSwaps(); fetchPendingSwaps(); }, []);

  useEffect(() => {
    setProfileFirstName(user.name.split(' ')[0] || '');
    setProfileLastName(user.name.split(' ').slice(1).join(' ') || '');
    setProfileEmail(user.email);
    setProfileShift(user.shift);
  }, [user.name, user.email, user.shift]);

  useEffect(() => {
    if (activeTab === 'history' && !historyFetched) fetchHistory();
  }, [activeTab]);

  async function fetchSwaps() {
    setLoadingSwaps(true);
    setSwapError('');
    try {
      const data = await api.getSwaps();
      setSwaps(data.swaps);
    } catch (err) {
      setSwapError(err.message);
    } finally {
      setLoadingSwaps(false);
    }
  }

  async function fetchPendingSwaps() {
    setLoadingPending(true);
    try {
      const data = await api.getPendingSwaps();
      setPendingSwaps(data.swaps);
    } catch (err) {
      // silently fail — not critical
    } finally {
      setLoadingPending(false);
    }
  }

  async function handleOfferCounter(swapId) {
    setCounterError('');
    if (!counterDate || !counterShiftTime) {
      setCounterError('Please enter a date and shift type.');
      return;
    }
    setCounterLoading(true);
    try {
      await api.acceptSwap(swapId, counterDate, counterShiftTime);
      setAcceptingId(null);
      setCounterDate('');
      setCounterShiftTime('');
      setActionMsg({ text: 'Offer sent — waiting for their confirmation.', type: 'success' });
      fetchSwaps();
      fetchPendingSwaps();
    } catch (err) {
      setCounterError(err.message);
    } finally {
      setCounterLoading(false);
    }
  }

  async function handleConfirm(id) {
    setActionMsg(null);
    try {
      await api.confirmSwap(id);
      setActionMsg({ text: 'Swap confirmed! Both parties have been notified.', type: 'success' });
      fetchPendingSwaps();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  }

  async function handleRejectCounter(id) {
    setActionMsg(null);
    try {
      await api.rejectCounter(id);
      setActionMsg({ text: 'Counter-offer declined. Swap is back on the board.', type: 'success' });
      fetchSwaps();
      fetchPendingSwaps();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await api.getSwapHistory();
      setHistory(data.swaps);
      setHistoryFetched(true);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  function setField(field) {
    return e => {
      setFormSuccess('');
      setFormError('');
      setForm(f => ({ ...f, [field]: e.target.value }));
    };
  }

  async function handleCreateSwap(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);
    try {
      const start = parseLocalDate(form.shift_date);
      const end = form.shift_date_end ? parseLocalDate(form.shift_date_end) : start;
      if (end < start) { setFormError('End date must be on or after the start date.'); setFormLoading(false); return; }
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
      }
      await Promise.all(dates.map(date => api.createSwap(date, form.shift_type, form.notes)));
      setForm({ shift_date: '', shift_date_end: '', shift_type: '', notes: '' });
      setFormSuccess(dates.length > 1 ? `${dates.length} swap requests posted.` : 'Swap request posted.');
      fetchSwaps();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  }

  function handleAccept(id) {
    setCounterError('');
    setCounterDate('');
    setCounterShiftTime('');
    setAcceptingId(id);
  }

  async function handleDecline(id) {
    setActionMsg(null);
    try {
      await api.declineSwap(id);
      setActionMsg({ text: 'Swap request removed.', type: 'success' });
      fetchSwaps();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    if (newPassword && newPassword !== confirmPassword) { setProfileError('New passwords do not match.'); return; }
    const fullName = `${profileFirstName.trim()} ${profileLastName.trim()}`;
    const fields = {};
    if (fullName !== user.name) fields.name = fullName;
    if (profileEmail !== user.email) fields.email = profileEmail;
    if (profileShift !== user.shift) fields.shift = profileShift;
    if (newPassword) { fields.currentPassword = currentPassword; fields.newPassword = newPassword; }
    if (Object.keys(fields).length === 0) { setProfileError('No changes to save.'); return; }
    setProfileLoading(true);
    try {
      const data = await api.updateProfile(fields);
      localStorage.setItem('token', data.token);
      if (onProfileUpdated) onProfileUpdated(data.token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileSuccess('Profile updated.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    onLogout();
  }

  const visibleHistory = showAllHistory ? history : history.slice(0, 10);

  return (
    <div className="home">
      {showGuide && <HowToUse onClose={() => setShowGuide(false)} />}
      <header>
        <button className="logo-btn" onClick={onGoLanding}>SwapNShift</button>
        <button className="link-btn" onClick={handleLogout}>Sign out</button>
      </header>

      <div className="tab-content">

        {/* ── Rota tab ── */}
        {activeTab === 'rota' && (
          <div className="tab-page">
            <section className="panel">
              <h2>Your rota — next 14 days</h2>
              {rotaDays[0].shift === null ? (
                <p className="muted">No rota data for shift {user.shift}.</p>
              ) : (
                <div className="rota-grid">
                  {rotaDays.map(({ date, shift }, i) => (
                    <div key={i} className={`rota-cell rota-${shift.toLowerCase()}`}>
                      <span className="rota-date">{formatRotaDate(date)}</span>
                      <span className="rota-shift">{shift}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <h2>6-month rota — Shift {user.shift}</h2>
              <SixMonthCalendar shiftGroup={user.shift} />
            </section>
          </div>
        )}

        {/* ── Swaps tab ── */}
        {activeTab === 'swaps' && (
          <div className="tab-page">
            <section className="panel">
              <h2>Post the shifts you want a colleague to cover for you!</h2>
              <form onSubmit={handleCreateSwap} className="inline-form">
                <div className="form-row">
                  <div className="field">
                    <label>Start date</label>
                    <input type="date" value={form.shift_date} onChange={setField('shift_date')} required />
                  </div>
                  <div className="field">
                    <label>End date <span className="label-optional">(optional)</span></label>
                    <input type="date" value={form.shift_date_end} onChange={setField('shift_date_end')} min={form.shift_date || undefined} />
                  </div>
                  <div className="field">
                    <label>Shift type</label>
                    <select value={form.shift_type} onChange={setField('shift_type')} required>
                      <option value="">Select…</option>
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                  <div className="field field--grow">
                    <label>Notes (optional)</label>
                    <input type="text" placeholder="Any details…" value={form.notes} onChange={setField('notes')} />
                  </div>
                  <button type="submit" className="post-btn" disabled={formLoading}>
                    {formLoading ? 'Posting…' : 'Post'}
                  </button>
                </div>
                {formError && <p className="error">{formError}</p>}
                {formSuccess && <p className="success">{formSuccess}</p>}
              </form>
            </section>

            <section className="panel">
              <h2>Open swap requests</h2>
              {actionMsg && (
                <p className={actionMsg.type === 'success' ? 'success' : 'error'} style={{ marginBottom: '0.75rem' }}>
                  {actionMsg.text}
                </p>
              )}
              {loadingSwaps && <p className="muted">Loading…</p>}
              {swapError && <p className="error">{swapError}</p>}
              {!loadingSwaps && !swapError && swaps.length === 0 && (
                <p className="muted">No open swaps right now.</p>
              )}
              {swaps.map(swap => (
                <div key={swap.id} className="swap-card">
                  <div className="swap-card-header">
                    <span className="swap-card-date">{formatDateLong(swap.shift_date)}</span>
                    <span className={`swap-card-type swap-card-type--${swap.shift_time.toLowerCase()}`}>{swap.shift_time}</span>
                  </div>
                  <div className="swap-card-meta">
                    <span><strong>{swap.requester?.name ?? '—'}</strong> · Shift {swap.requester?.shift ?? '—'}</span>
                    {swap.notes && <span className="swap-card-notes">{swap.notes}</span>}
                  </div>
                  {swap.requester_id === user.id ? (
                    <button className="decline-btn" onClick={() => handleDecline(swap.id)}>Remove my request</button>
                  ) : acceptingId === swap.id ? (
                    <div className="counter-form">
                      <p className="counter-form-title">Which shift do you want <strong>{swap.requester?.name}</strong> to cover in return?</p>
                      <div className="counter-form-fields">
                        <div className="field">
                          <label>Date</label>
                          <input type="date" value={counterDate} onChange={e => { setCounterError(''); setCounterDate(e.target.value); }} />
                        </div>
                        <div className="field">
                          <label>Shift type</label>
                          <select value={counterShiftTime} onChange={e => { setCounterError(''); setCounterShiftTime(e.target.value); }}>
                            <option value="">Select…</option>
                            <option value="Day">Day</option>
                            <option value="Night">Night</option>
                          </select>
                        </div>
                      </div>
                      {counterError && <p className="error" style={{ marginTop: '0.5rem' }}>{counterError}</p>}
                      <div className="action-btns" style={{ marginTop: '0.75rem' }}>
                        <button className="accept-btn" onClick={() => handleOfferCounter(swap.id)} disabled={counterLoading}>
                          {counterLoading ? 'Sending…' : 'Send offer'}
                        </button>
                        <button className="decline-btn" onClick={() => setAcceptingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="accept-btn" onClick={() => handleAccept(swap.id)}>Accept & propose swap</button>
                  )}
                </div>
              ))}

            {/* Pending your confirmation */}
            {pendingSwaps.filter(s => s.requester_id === user.id).length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h2>Awaiting your response</h2>
                {pendingSwaps.filter(s => s.requester_id === user.id).map(swap => (
                  <div key={swap.id} className="pending-card">
                    <p><strong>{swap.acceptor?.name}</strong> has offered to cover your <strong>{swap.shift_time}</strong> shift on <strong>{formatDateLong(swap.shift_date)}</strong>.</p>
                    <p className="pending-counter">In return they want you to cover their <strong>{swap.counter_shift_time}</strong> shift on <strong>{formatDateLong(swap.counter_date)}</strong>.</p>
                    <div className="action-btns" style={{ marginTop: '0.75rem' }}>
                      <button className="accept-btn" onClick={() => handleConfirm(swap.id)}>Accept swap</button>
                      <button className="decline-btn" onClick={() => handleRejectCounter(swap.id)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Offers you've made, waiting on them */}
            {pendingSwaps.filter(s => s.acceptor_id === user.id).length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h2>Offers you've made</h2>
                {pendingSwaps.filter(s => s.acceptor_id === user.id).map(swap => (
                  <div key={swap.id} className="pending-card pending-card--waiting">
                    <p>You offered to cover <strong>{swap.requester?.name}</strong>'s <strong>{swap.shift_time}</strong> shift on <strong>{formatDateLong(swap.shift_date)}</strong>.</p>
                    <p className="pending-counter">Waiting for them to confirm they'll cover your <strong>{swap.counter_shift_time}</strong> shift on <strong>{formatDateLong(swap.counter_date)}</strong>.</p>
                  </div>
                ))}
              </div>
            )}
            </section>
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <div className="tab-page">
            <section className="panel">
              <h2>Swap history</h2>
              {historyLoading && <p className="muted">Loading…</p>}
              {historyError && <p className="error">{historyError}</p>}
              {!historyLoading && !historyError && history.length === 0 && (
                <p className="muted">No completed swaps in the last 12 months.</p>
              )}
              {visibleHistory.map(swap => (
                <div key={swap.id} className="history-item">
                  <div className="history-names">
                    <strong>{swap.acceptor?.name ?? '—'}</strong> covered <strong>{swap.requester?.name ?? '—'}</strong>
                  </div>
                  <div className="history-detail">
                    {swap.shift_time} shift · {formatDateLong(swap.shift_date)}
                  </div>
                </div>
              ))}
              {!historyLoading && history.length > 10 && (
                <button className="link-btn" style={{ marginTop: '1rem' }} onClick={() => setShowAllHistory(v => !v)}>
                  {showAllHistory ? 'Show less' : `View all ${history.length} swaps`}
                </button>
              )}
            </section>
          </div>
        )}

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <div className="tab-page">
            <section className="panel">
              <h2>Your profile</h2>
              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>First name</label>
                <input type="text" value={profileFirstName} onChange={e => { setProfileSuccess(''); setProfileError(''); setProfileFirstName(e.target.value); }} required />
                <label>Last name</label>
                <input type="text" value={profileLastName} onChange={e => { setProfileSuccess(''); setProfileError(''); setProfileLastName(e.target.value); }} required />

                <label>Email</label>
                <input type="email" value={profileEmail} onChange={e => { setProfileSuccess(''); setProfileError(''); setProfileEmail(e.target.value); }} required />

                <label>Shift group</label>
                <select value={profileShift} onChange={e => { setProfileSuccess(''); setProfileError(''); setProfileShift(e.target.value); }} required>
                  <option value="J">J</option>
                  <option value="K">K</option>
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="N">N</option>
                </select>

                <label style={{ marginTop: '1rem' }}>Current password <span className="label-optional">(required to change password)</span></label>
                <input type="password" placeholder="Enter current password…" value={currentPassword} onChange={e => { setProfileSuccess(''); setProfileError(''); setCurrentPassword(e.target.value); }} />

                <label>New password <span className="label-optional">(leave blank to keep current)</span></label>
                <input type="password" placeholder="New password…" value={newPassword} onChange={e => { setProfileSuccess(''); setProfileError(''); setNewPassword(e.target.value); }} />

                <label>Confirm new password</label>
                <input type="password" placeholder="Confirm new password…" value={confirmPassword} onChange={e => { setProfileSuccess(''); setProfileError(''); setConfirmPassword(e.target.value); }} />

                {profileError && <p className="error">{profileError}</p>}
                {profileSuccess && <p className="success">{profileSuccess}</p>}

                <button type="submit" disabled={profileLoading}>
                  {profileLoading ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </section>

            <section className="panel">
              <button className="how-to-link how-to-link--block" onClick={() => setShowGuide(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                How to use SwapNShift
              </button>
            </section>
          </div>
        )}

      </div>

      {/* ── Bottom nav ── */}
      <nav className="bottom-nav">
        <button className={`bottom-nav-btn${activeTab === 'rota' ? ' bottom-nav-btn--active' : ''}`} onClick={() => setActiveTab('rota')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Rota
        </button>
        <button className={`bottom-nav-btn${activeTab === 'swaps' ? ' bottom-nav-btn--active' : ''}`} onClick={() => setActiveTab('swaps')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          Swaps
        </button>
        <button className={`bottom-nav-btn${activeTab === 'history' ? ' bottom-nav-btn--active' : ''}`} onClick={() => setActiveTab('history')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          History
        </button>
        <button className={`bottom-nav-btn${activeTab === 'profile' ? ' bottom-nav-btn--active' : ''}`} onClick={() => setActiveTab('profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Profile
        </button>
        {onGoAdmin && (
          <button className="bottom-nav-btn" onClick={onGoAdmin}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            Admin
          </button>
        )}
      </nav>
    </div>
  );
}
