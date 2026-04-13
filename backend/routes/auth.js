const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

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

module.exports = router;