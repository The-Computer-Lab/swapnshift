const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sendSwapNotificationEmail, sendSwapAcceptedEmails, sendCounterOfferEmail, sendCounterRejectedEmail } = require('../utils/email');
const supabase = require('../utils/supabase');

const VALID_SHIFT_TIMES = ['Day', 'Night'];

function isValidFutureDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

// POST /api/swaps — create a swap request
router.post('/', authenticateToken, async (req, res) => {
  const { shift_date, shift_time, notes } = req.body;

  if (!shift_date || !shift_time) {
    return res.status(400).json({ error: 'shift_date and shift_time are required' });
  }
  if (!isValidFutureDate(shift_date)) {
    return res.status(400).json({ error: 'shift_date must be a valid date (YYYY-MM-DD) and not in the past' });
  }
  if (!VALID_SHIFT_TIMES.includes(shift_time)) {
    return res.status(400).json({ error: 'shift_time must be Day or Night' });
  }

  try {
    const { data, error } = await supabase
      .from('swaps')
      .insert([{ requester_id: req.user.id, shift_date, shift_time, notes: notes || null, status: 'open' }])
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
          sendSwapNotificationEmail({ users, swap, requesterName: req.user.name || req.user.email })
            .catch(err => console.error('Swap notification email failed:', err.message));
        }
      });

    res.status(201).json({ swap });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/swaps/history — accepted swaps from last 12 months
router.get('/history', authenticateToken, async (req, res) => {
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const fromDate = from.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('swaps')
      .select('*, requester:users!requester_id(id, name, shift), acceptor:users!acceptor_id(id, name, shift)')
      .eq('status', 'accepted')
      .gte('shift_date', fromDate)
      .order('shift_date', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ swaps: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/swaps/pending — pending_confirmation swaps involving the current user
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('swaps')
      .select('*, requester:users!requester_id(id, name, shift), acceptor:users!acceptor_id(id, name, shift)')
      .eq('status', 'pending_confirmation')
      .or(`requester_id.eq.${req.user.id},acceptor_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ swaps: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/swaps — all open swaps
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

// PUT /api/swaps/:id/accept — offer to cover, with counter-shift
router.put('/:id/accept', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { counter_date, counter_shift_time } = req.body;

  if (!counter_date || !counter_shift_time) {
    return res.status(400).json({ error: 'counter_date and counter_shift_time are required' });
  }
  if (!isValidFutureDate(counter_date)) {
    return res.status(400).json({ error: 'counter_date must be a valid date (YYYY-MM-DD) and not in the past' });
  }
  if (!VALID_SHIFT_TIMES.includes(counter_shift_time)) {
    return res.status(400).json({ error: 'counter_shift_time must be Day or Night' });
  }

  try {
    const { data: swap, error: fetchError } = await supabase
      .from('swaps').select('*').eq('id', id).single();

    if (fetchError || !swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'open') return res.status(400).json({ error: 'Swap is no longer open' });
    if (swap.requester_id === req.user.id) return res.status(400).json({ error: 'Cannot accept your own swap request' });

    const { data, error } = await supabase
      .from('swaps')
      .update({ status: 'pending_confirmation', acceptor_id: req.user.id, counter_date, counter_shift_time })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    // Email the requester with the counter-offer
    supabase.from('users').select('name, email').eq('id', swap.requester_id).single()
      .then(({ data: requester }) => {
        if (requester) {
          sendCounterOfferEmail({
            requester,
            acceptor: { name: req.user.name, email: req.user.email },
            swap,
            counter_date,
            counter_shift_time,
          }).catch(err => console.error('Counter offer email failed:', err.message));
        }
      });

    res.json({ swap: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/swaps/:id/confirm — requester agrees to the counter-offer
router.put('/:id/confirm', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: swap, error: fetchError } = await supabase
      .from('swaps')
      .select('*, requester:users!requester_id(id, name, email), acceptor:users!acceptor_id(id, name, email)')
      .eq('id', id)
      .single();

    if (fetchError || !swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'pending_confirmation') return res.status(400).json({ error: 'Swap is not awaiting confirmation' });
    if (swap.requester_id !== req.user.id) return res.status(403).json({ error: 'Only the requester can confirm this swap' });

    const { data, error } = await supabase
      .from('swaps').update({ status: 'accepted' }).eq('id', id).select();

    if (error) return res.status(400).json({ error: error.message });

    // Email both parties
    sendSwapAcceptedEmails({
      requester: swap.requester,
      acceptor: swap.acceptor,
      swap,
    }).catch(err => console.error('Swap confirmed email failed:', err.message));

    res.json({ swap: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/swaps/:id/reject-counter — requester rejects the counter-offer, swap goes back to open
router.put('/:id/reject-counter', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: swap, error: fetchError } = await supabase
      .from('swaps')
      .select('*, acceptor:users!acceptor_id(id, name, email)')
      .eq('id', id)
      .single();

    if (fetchError || !swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'pending_confirmation') return res.status(400).json({ error: 'Swap is not awaiting confirmation' });
    if (swap.requester_id !== req.user.id) return res.status(403).json({ error: 'Only the requester can reject this counter-offer' });

    const { data, error } = await supabase
      .from('swaps')
      .update({ status: 'open', acceptor_id: null, counter_date: null, counter_shift_time: null })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    // Email the acceptor to let them know
    if (swap.acceptor) {
      sendCounterRejectedEmail({
        acceptor: swap.acceptor,
        requesterName: req.user.name,
        swap,
      }).catch(err => console.error('Counter rejected email failed:', err.message));
    }

    res.json({ swap: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/swaps/:id/decline — requester removes their own open swap
router.put('/:id/decline', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: swap, error: fetchError } = await supabase
      .from('swaps').select('*').eq('id', id).single();

    if (fetchError || !swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'open') return res.status(400).json({ error: 'Swap is no longer open' });
    if (swap.requester_id !== req.user.id) return res.status(403).json({ error: 'Only the requester can remove their own swap' });

    const { data, error } = await supabase
      .from('swaps').update({ status: 'declined' }).eq('id', id).select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ swap: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
