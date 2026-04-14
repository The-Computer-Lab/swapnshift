import { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin, onGoRegister, onGoBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.token);
      const user = data.user;
      if (!user.shift && user.crew) user.shift = user.crew;
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="card">
        {onGoBack && (
          <button className="back-btn" onClick={onGoBack}>← Back</button>
        )}
        <h1>SwapNShift</h1>
        <h2>Sign in</h2>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="switch">
          No account?{' '}
          <button className="link-btn" onClick={onGoRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
