import { useState } from 'react';
import { api } from '../api';

const SHIFTS = ['J', 'K', 'L', 'M', 'N'];

export default function Register({ onGoLogin, onGoBack }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', shift: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register(form.name, form.email, form.password, form.shift);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="screen">
        <div className="card">
          <h1>SwapNShift</h1>
          <h2>Registration submitted</h2>
          <p>Your account is awaiting admin approval. You'll receive an email when it's approved.</p>
          <button onClick={onGoLogin}>Back to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        {onGoBack && <button className="back-btn" onClick={onGoBack}>← Back</button>}
        <h1>SwapNShift</h1>
        <h2>Create account</h2>
        <form onSubmit={handleSubmit}>
          <label>Full name</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            autoFocus
          />
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={6}
          />
          <label>Shift</label>
          <select value={form.shift} onChange={set('shift')} required>
            <option value="">Select shift…</option>
            {SHIFTS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Register'}
          </button>
        </form>
        <p className="switch">
          Already have an account?{' '}
          <button className="link-btn" onClick={onGoLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
