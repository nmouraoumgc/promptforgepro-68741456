/** Max length of a prompt passed in a link (?prompt=), e.g. from an email CTA. */
export const URL_PROMPT_MAX = 2000;

/** Reads ?prompt= from a search string as plain text: control characters removed (newlines and tabs kept),
 *  line endings normalised, trimmed and capped at URL_PROMPT_MAX. Returns '' when absent or empty.
 *  The value only ever fills a text box (never rendered as HTML, never auto-run). */
export function readUrlPrompt(search: string): string {
  let raw: string | null = null;
  try { raw = new URLSearchParams(search).get('prompt'); } catch { return ''; }
  if (!raw) return '';
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return Array.from(clean).slice(0, URL_PROMPT_MAX).join('').trim();
}

/** The same search string without ?prompt= (other params such as mode/lang kept). */
export function searchWithoutPrompt(search: string): string {
  const p = new URLSearchParams(search);
  p.delete('prompt');
  const s = p.toString();
  return s ? `?${s}` : '';
}
