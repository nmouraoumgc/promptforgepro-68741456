// Plain-text output: generated prompts are meant to be copy-pasted into other tools,
// so markdown markers (#, **, ---, ```) are useless noise there.
// Keep in sync with src/lib/plainText.ts (frontend copy button uses the same logic).

export const PLAIN_TEXT_RULES_EN = `

OUTPUT FORMAT (plain text only, mandatory):
- Do NOT use Markdown. Never use #, ##, ###, **, __, *, backticks, tables or --- separators.
- Write section titles as plain lines in CAPITALS (e.g. CONTEXT) or ending with a colon (e.g. Context:).
- For lists use only "- " or "1. ", "2. ", one item per line.
- Separate sections with a single blank line.
- If the text you write tells another AI how to format its answer, ask for plain text too (no Markdown headings or bold), unless the user explicitly asked for Markdown.`;

export const PLAIN_TEXT_RULES_PT = `

FORMATO DE SAÍDA (obrigatório, apenas texto simples):
- NÃO uses Markdown. Nunca uses #, ##, ###, **, __, *, acentos graves (\`), tabelas nem separadores ---.
- Escreve os títulos das secções como linhas simples em MAIÚSCULAS (ex.: CONTEXTO) ou terminadas com dois pontos (ex.: Contexto:).
- Nas listas usa apenas "- " ou "1. ", "2. ", um item por linha.
- Separa as secções com uma única linha em branco.
- Se o texto que escreves indicar a outra IA como formatar a resposta, pede também texto simples (sem títulos Markdown nem negrito), salvo se o utilizador pedir Markdown explicitamente.`;

export const plainTextRules = (language?: unknown): string =>
  String(language ?? '').toLowerCase().startsWith('en') ? PLAIN_TEXT_RULES_EN : PLAIN_TEXT_RULES_PT;

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
