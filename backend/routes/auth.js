const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

router.post('/register', async (req, res) => {
  const { name, email, password, shift } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword, shift, status: 'pending' }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Registration successful — awaiting admin approval', user: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return res.status(400).json({ error: 'User not found' });
    if (data.status === 'pending') return res.status(403).json({ error: 'Account awaiting admin approval' });

    const validPassword = await bcrypt.compare(password, data.password);
    if (!validPassword) return res.status(400).json({ error: 'Incorrect password' });

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
  const { name, email, currentPassword, newPassword } = req.body;
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