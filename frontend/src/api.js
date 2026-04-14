const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  register: (name, email, password, shift) =>
    request('/api/auth/register', { method: 'POST', body: { name, email, password, shift }, auth: false }),

  getSwaps: () => request('/api/swaps'),

  createSwap: (shift_date, shift_time, notes) =>
    request('/api/swaps', { method: 'POST', body: { shift_date, shift_time, notes } }),

  acceptSwap: (id) => request(`/api/swaps/${id}/accept`, { method: 'PUT' }),
  declineSwap: (id) => request(`/api/swaps/${id}/decline`, { method: 'PUT' }),

  updateProfile: (fields) =>
    request('/api/auth/profile', { method: 'PUT', body: fields }),

  getSwapHistory: () => request('/api/swaps/history'),

  // Admin
  getPendingUsers: () => request('/api/admin/users/pending'),
  getAllUsers: () => request('/api/admin/users'),
  approveUser: (id) => request(`/api/admin/users/${id}/approve`, { method: 'PUT' }),
  rejectUser: (id) => request(`/api/admin/users/${id}/reject`, { method: 'PUT' }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
};
