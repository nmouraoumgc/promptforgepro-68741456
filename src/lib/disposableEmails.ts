// Lista curta de domínios de email descartáveis mais comuns.
// Não é exaustiva, primeira linha de defesa antes do checkout.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'mailinator.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.net',
  'sharklasers.com', 'yopmail.com', 'getnada.com', 'getairmail.com', 'dispostable.com',
  'trashmail.com', 'throwawaymail.com', 'maildrop.cc', 'tempinbox.com', 'fakeinbox.com',
  'mailnesia.com', 'mintemail.com', 'mohmal.com', 'mytemp.email', 'emailondeck.com',
  'spam4.me', 'spambox.us', 'tempr.email', 'inboxbear.com', 'mailcatch.com',
  'mailtemp.info', 'tmpmail.org', 'tmpeml.com', 'mvrht.com', 'mailpoof.com',
  'tempmailo.com', 'minuteinbox.com', 'fakemailgenerator.com', 'crackone.org', 'wibucrypto.pro',
]);

export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
