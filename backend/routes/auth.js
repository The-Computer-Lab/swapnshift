const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const { sendAdminRegistrationEmail } = require('../utils/email');
const supabase = require('../utils/supabase');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts — please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const VALID_SHIFTS = ['J', 'K', 'L', 'M', 'N'];

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password, shift } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!VALID_SHIFTS.includes(shift)) return res.status(400).json({ error: 'Shift must be J, K, L, M, or N' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword, shift, status: 'pending' }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    if (process.env.ADMIN_EMAIL) {
      sendAdminRegistrationEmail({ name, email, shift })
        .catch(err => console.error('Admin registration email failed:', err.message));
    }

    res.json({ message: 'Registration successful — awaiting admin approval', user: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return res.status(400).json({ error: 'Invalid email or password' });
    if (data.status === 'pending') return res.status(403).json({ error: 'Account awaiting admin approval' });
    if (data.status === 'rejected') return res.status(403).json({ error: 'Account application was not approved' });

    const validPassword = await bcrypt.compare(password, data.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: data.id, name: data.name, email: data.email, role: data.role, shift: data.shift },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: data.id, name: data.name, email: data.email, shift: data.shift, role: data.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email, shift, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // If changing email, check it isn't already taken
    if (email && email !== user.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      if (existing) return res.status(400).json({ error: 'Email already in use' });
    }

    const updates = {};
    if (name && name !== user.name) updates.name = name;
    if (email && email !== user.email) updates.email = email;
    if (shift && shift !== user.shift) updates.shift = shift;
    if (newPassword) updates.password = await bcrypt.hash(newPassword, 10);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes to save' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    const token = jwt.sign(
      { id: updated.id, name: updated.name, email: updated.email, role: updated.role, shift: updated.shift },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: updated.id, name: updated.name, email: updated.email, shift: updated.shift, role: updated.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;