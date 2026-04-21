const SHIFT_ANCHORS = {
  K: '2025-05-28',
  J: '2025-05-30',
  L: '2025-06-01',
  M: '2025-06-03',
  N: '2025-06-05',
};

const CYCLE = ['Day', 'Day', 'Night', 'Night', 'Off', 'Off', 'Off', 'Off', 'Off', 'Off'];

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getShift(shiftGroup, date) {
  const anchorStr = SHIFT_ANCHORS[shiftGroup];
  if (!anchorStr) return null;
  const anchor = parseLocalDate(anchorStr);
  const diffDays = Math.round((date - anchor) / 86_400_000);
  const pos = ((diffDays % 10) + 10) % 10;
  return CYCLE[pos];
}

// Returns the next Day or Night shift within 14 days, starting from today.
export function getNextShift(shiftGroup) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const shift = getShift(shiftGroup, date);
    if (shift === 'Day' || shift === 'Night') {
      return { date, shift };
    }
  }
  return null;
}
