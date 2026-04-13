const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.use(authenticateToken, requireAdmin);

// GET /api/admin/users/pending — list all pending users
router.get('/users/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, shift, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ users: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/approve — approve a pending user
router.put('/users/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ status: 'approved' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, name, email, shift, status');

    if (error) return res.status(400).json({ error: error.message });
    if (!data.length) return res.status(404).json({ error: 'Pending user not found' });

    const user = data[0];
    sendWelcomeEmail({ name: user.name, email: user.email }).catch(err =>
      console.error('Welcome email failed:', err.message)
    );

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/reject — reject a pending user
router.put('/users/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ status: 'rejected' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, name, email, shift, status');

    if (error) return res.status(400).json({ error: error.message });
    if (!data.length) return res.status(404).json({ error: 'Pending user not found' });

    res.json({ user: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, shift, role, status, created_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ users: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select('id, name, email');

    if (error) return res.status(400).json({ error: error.message });
    if (!data.length) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted', user: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
