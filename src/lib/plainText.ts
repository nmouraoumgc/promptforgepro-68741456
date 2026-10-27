// Plain-text sanitiser for copied prompts. Keep in sync with supabase/functions/_shared/plaintext.ts.

/** Converts Markdown-ish model output into clean, copy-pasteable plain text. */
export function toPlainText(input: unknown): string {
  if (typeof input !== 'string') return input == null ? '' : String(input);
  let text = input.replace(/\r\n?/g, '\n');

  const out: string[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.replace(/\s+$/, '');

    // Code fences: drop the fence line, keep the content.
    if (/^\s*(```|~~~)/.test(line)) continue;
    // Horizontal rules (---, ***, ___, - - -, ===).
    if (/^\s*([-*_=])(\s*\1){2,}\s*$/.test(line)) { out.push(''); continue; }
    // Table separator rows |---|:---:|
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) continue;

    // Headings: "### Title" -> "TITLE" (or keep "Title:" if it already ends with a colon).
    const h = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/);
    if (h) {
      const title = stripInline(h[1]).trim();
      line = title.endsWith(':') ? title : title.toLocaleUpperCase();
      out.push(line);
      continue;
    }

    // Blockquotes.
    line = line.replace(/^\s*>\s?/, '');
    // Bullets (*, +, •, –) -> "- ", keep indentation.
    line = line.replace(/^(\s*)[*+•–]\s+/, '$1- ');
    // Numbered "1)" kept; "**1.**" handled by stripInline.
    // Table rows "| a | b |" -> "a | b".
    if (/^\s*\|.*\|\s*$/.test(line)) line = line.trim().replace(/^\|\s*/, '').replace(/\s*\|$/, '');

    line = stripInline(line);
    // A whole line that was bold (e.g. "**Context**") becomes a CAPITALS title.
    if (/^\s*(\*\*|__)[^*_]+(\*\*|__)\s*:?\s*$/.test(raw.trim())) {
      const t = line.trim();
      line = t.endsWith(':') ? t : t.toLocaleUpperCase();
    }
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripInline(s: string): string {
  return s
    // Images/links: ![alt](url) / [text](url) -> text (url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)')
    // Bold / italic / strike
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^\w])__([^_]+)__(?=[^\w]|$)/g, '$1$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?=[^\w*]|$)/g, '$1$2')
    .replace(/~~([^~]+)~~/g, '$1')
    // Inline code
    .replace(/`([^`]+)`/g, '$1')
    // Leftover asterisks (keep multiplication like 2*3) and stray backticks
    .replace(/(?<!\d\s?)\*+(?!\s?\d)/g, '')
    .replace(/`+/g, '')
    // Leading heading hashes that slipped inline (hashtags like #tiktok are kept)
    .replace(/^(\s*)#{1,6}\s+/, '$1');
}
