const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');
const { sendSwapNotificationEmail } = require('../utils/email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POST /api/swaps — create a swap request
router.post('/', authenticateToken, async (req, res) => {
  const { shift_date, shift_time, notes } = req.body;

  if (!shift_date || !shift_time) {
    return res.status(400).json({ error: 'shift_date and shift_time are required' });
  }

  try {
    const { data, error } = await supabase
      .from('swaps')
      .insert([{
        requester_id: req.user.id,
        shift_date,
        shift_time,
        notes: notes || null,
        status: 'open',
      }])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    const swap = data[0];

    supabase
      .from('users')
      .select('name, email')
      .eq('status', 'approved')
      .neq('id', req.user.id)
      .then(({ data: users }) => {
        if (users && users.length) {
          sendSwapNotificationEmail({
            users,
            swap,
            requesterName: req.user.name || req.user.email,
          }).catch(err => console.error('Swap notification email failed:', err.message));
        }
      });

    res.status(201).json({ swap });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/swaps — fetch all open swaps
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('swaps')
      .select('*, requester:users!requester_id(id, name, shift)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ swaps: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/swaps/:id/accept — accept a swap
router.put('/:id/accept', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: swap, error: fetchError } = await supabase
      .from('swaps')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'open') return res.status(400).json({ error: 'Swap is no longer open' });
    if (swap.requester_id === req.user.id) return res.status(400).json({ error: 'Cannot accept your own swap request' });

    const { data, error } = await supabase
      .from('swaps')
      .update({ status: 'accepted', acceptor_id: req.user.id })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ swap: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/swaps/:id/decline — decline a swap
router.put('/:id/decline', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: swap, error: fetchError } = await supabase
      .from('swaps')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'open') return res.status(400).json({ error: 'Swap is no longer open' });
    if (swap.requester_id !== req.user.id) return res.status(403).json({ error: 'Only the requester can decline their own swap' });

    const { data, error } = await supabase
      .from('swaps')
      .update({ status: 'declined' })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ swap: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
