import { useState } from 'react';
import { api } from '../api';

export default function Profile({ user, onBack, onProfileUpdated }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const fields = {};
    if (name !== user.name) fields.name = name;
    if (email !== user.email) fields.email = email;
    if (newPassword) {
      fields.currentPassword = currentPassword;
      fields.newPassword = newPassword;
    }

    if (Object.keys(fields).length === 0) {
      setError('No changes to save.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.updateProfile(fields);
      localStorage.setItem('token', data.token);
      onProfileUpdated(data.token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="card">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Your profile</h1>
        <h2>Shift group: {user.shift}</h2>

        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => { setSuccess(''); setError(''); setName(e.target.value); }}
            required
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => { setSuccess(''); setError(''); setEmail(e.target.value); }}
            required
          />

          <label style={{ marginTop: '1.25rem' }}>Current password <span className="label-optional">(required to change password)</span></label>
          <input
            type="password"
            placeholder="Enter current password…"
            value={currentPassword}
            onChange={e => { setSuccess(''); setError(''); setCurrentPassword(e.target.value); }}
          />

          <label>New password <span className="label-optional">(leave blank to keep current)</span></label>
          <input
            type="password"
            placeholder="New password…"
            value={newPassword}
            onChange={e => { setSuccess(''); setError(''); setNewPassword(e.target.value); }}
          />

          <label>Confirm new password</label>
          <input
            type="password"
            placeholder="Confirm new password…"
            value={confirmPassword}
            onChange={e => { setSuccess(''); setError(''); setConfirmPassword(e.target.value); }}
          />

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
