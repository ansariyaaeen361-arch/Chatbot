// A modest blocklist of common disposable/temp-mail domains, used to cut
// down on trial abuse (spinning up unlimited throwaway trial accounts).
// Not exhaustive — new disposable providers appear constantly — but it
// stops the most common, well-known ones with zero external dependency.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'yopmail.fr', 'trashmail.com', 'throwawaymail.com',
  'sharklasers.com', 'dispostable.com', 'getnada.com', 'moakt.com',
  'mailnesia.com', 'mintemail.com', 'fakeinbox.com', 'maildrop.cc',
  'tempmailo.com', 'emailondeck.com', 'discard.email', 'mytemp.email',
  'spamgourmet.com', 'mailcatch.com', 'tempinbox.com', 'crazymailing.com'
]);

function isDisposableEmail(email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
  return !!domain && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

module.exports = { isDisposableEmail };
