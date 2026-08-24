const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Whether the business is "open" right now, per its configured hours + timezone.
// Businesses that haven't turned this on are always considered open (unchanged
// behavior from before this feature existed).
function isBusinessOpen(business) {
  const bh = business.businessHours;
  if (!bh || !bh.enabled) return true;

  const tz = bh.timezone || 'UTC';
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
  }

  const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase().slice(0, 3);
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10) % 24;
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  const nowMinutes = hour * 60 + minute;

  const day = bh.schedule && bh.schedule[weekday];
  if (!day || day.closed) return false;

  const [openH, openM] = (day.open || '09:00').split(':').map(Number);
  const [closeH, closeM] = (day.close || '17:00').split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

module.exports = { isBusinessOpen, DAY_KEYS };
