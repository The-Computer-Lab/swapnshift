import { useState, useEffect } from 'react';
import { api } from '../api';

// ── Shift rota helpers ────────────────────────────────────────────────────────

const SHIFT_ANCHORS = {
  K: '2025-05-28',
  J: '2025-05-30',
  L: '2025-06-01',
  M: '2025-06-03',
  N: '2025-06-05',
};

const CYCLE = ['Day', 'Day', 'Night', 'Night', 'Off', 'Off', 'Off', 'Off', 'Off', 'Off'];

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getShift(shiftGroup, date) {
  const anchorStr = SHIFT_ANCHORS[shiftGroup];
  if (!anchorStr) return null;
  const anchor = parseLocalDate(anchorStr);
  const diffDays = Math.round((date - anchor) / 86_400_000);
  const pos = ((diffDays % 10) + 10) % 10;
  return CYCLE[pos];
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
    const startDow = first.getDay(); // 0=Sun
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

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS       = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_SHORT = ['S','M','T','W','T','F','S'];

function formatDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatRotaDate(date) {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// ── 6-month calendar component ────────────────────────────────────────────────

function SixMonthCalendar({ shiftGroup }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calendar = get6MonthCalendar(shiftGroup);

  return (
    <div className="cal-months">
      {calendar.map(({ year, month, startDow, days }) => (
        <div key={`${year}-${month}`} className="cal-month">
          <div className="cal-month-header">
            {MONTHS_FULL[month]} {year}
          </div>
          <div className="cal-grid">
            {DAYS_SHORT.map((d, i) => (
              <div key={i} className="cal-dow">{d}</div>
            ))}
            {/* empty cells before first day */}
            {Array.from({ length: startDow }, (_, i) => (
              <div key={`empty-${i}`} className="cal-empty" />
            ))}
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

export default function Home({ user, onLogout, onGoAdmin, onGoLanding, onGoProfile }) {
  const [swaps, setSwaps] = useState([]);
  const [loadingSwaps, setLoadingSwaps] = useState(true);
  const [swapError, setSwapError] = useState('');
  const [actionMsg, setActionMsg] = useState(null);

  const [form, setForm] = useState({ shift_date: '', shift_date_end: '', shift_type: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  const rotaDays = getNext14Days(user.shift);

  useEffect(() => { fetchSwaps(); }, []);

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
      if (end < start) {
        setFormError('End date must be on or after the start date.');
        setFormLoading(false);
        return;
      }
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

  async function handleAccept(id) {
    setActionMsg(null);
    try {
      await api.acceptSwap(id);
      setActionMsg({ text: 'Swap accepted.', type: 'success' });
      fetchSwaps();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    }
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

  function handleLogout() {
    localStorage.removeItem('token');
    onLogout();
  }

  return (
    <div className="home">
      <header>
        <button className="logo-btn" onClick={onGoLanding}>SwapNShift</button>
        <div className="header-right">
          <button className="link-btn" onClick={onGoProfile}>{user.name} · Shift {user.shift}</button>
          {onGoAdmin && <button className="link-btn" onClick={onGoAdmin}>Admin panel</button>}
          <button className="link-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="home-body">
        {/* Left column */}
        <main className="home-main">

          {/* 14-day rota strip */}
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

          {/* Post a swap */}
          <section className="panel">
            <h2>Post the shifts you want a colleague to cover for you!</h2>
            <form onSubmit={handleCreateSwap} className="inline-form">
              <div className="form-row">
                <div className="field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={form.shift_date}
                    onChange={setField('shift_date')}
                    required
                  />
                </div>
                <div className="field">
                  <label>End date <span className="label-optional">(optional)</span></label>
                  <input
                    type="date"
                    value={form.shift_date_end}
                    onChange={setField('shift_date_end')}
                    min={form.shift_date || undefined}
                  />
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
                  <input
                    type="text"
                    placeholder="Any details…"
                    value={form.notes}
                    onChange={setField('notes')}
                  />
                </div>
                <button type="submit" className="post-btn" disabled={formLoading}>
                  {formLoading ? 'Posting…' : 'Post'}
                </button>
              </div>
              {formError && <p className="error">{formError}</p>}
              {formSuccess && <p className="success">{formSuccess}</p>}
            </form>
          </section>

          {/* Open swaps */}
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
            {swaps.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Posted by</th>
                    <th>Shift</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {swaps.map(swap => (
                    <tr key={swap.id}>
                      <td>{formatDate(swap.shift_date)}</td>
                      <td>{swap.shift_time}</td>
                      <td>{swap.requester?.name ?? '—'}</td>
                      <td>{swap.requester?.shift ?? '—'}</td>
                      <td>{swap.notes ?? '—'}</td>
                      <td>
                        {swap.requester_id === user.id ? (
                          <button className="decline-btn" onClick={() => handleDecline(swap.id)}>Remove</button>
                        ) : (
                          <button className="accept-btn" onClick={() => handleAccept(swap.id)}>Accept</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        </main>

        {/* Right column — 6-month calendar */}
        <aside className="home-sidebar">
          <div className="panel">
            <h2>6-month rota — Shift {user.shift}</h2>
            <SixMonthCalendar shiftGroup={user.shift} />
          </div>
        </aside>
      </div>
    </div>
  );
}
