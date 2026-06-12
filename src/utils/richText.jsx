/**
 * WhatsApp-style inline text formatting — safe (no dangerouslySetInnerHTML).
 *
 * Supported (non-nested, single-line spans, exactly like WhatsApp):
 *   *bold*      -> <strong>
 *   _italic_    -> <em>
 *   ~strike~    -> <s>
 *   `mono`      -> <code class="comm-mono">
 *
 * Returns an array of plain strings + React elements. Because the input is
 * only ever placed into text nodes (never HTML), this is XSS-safe. Newlines
 * are preserved by the surrounding element's `white-space: pre-wrap`.
 */
const TOKEN_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g

export function renderRichText(text) {
  if (text == null || text === '') return text
  const str = String(text)
  const out = []
  let last = 0
  let key = 0

  for (const m of str.matchAll(TOKEN_RE)) {
    const idx = m.index
    if (idx > last) out.push(str.slice(last, idx))

    const tok = m[0]
    const content = tok.slice(1, -1)
    const ch = tok[0]

    if (ch === '*') out.push(<strong key={key++}>{content}</strong>)
    else if (ch === '_') out.push(<em key={key++}>{content}</em>)
    else if (ch === '~') out.push(<s key={key++}>{content}</s>)
    else out.push(<code key={key++} className="comm-mono">{content}</code>)

    last = idx + tok.length
  }

  if (last < str.length) out.push(str.slice(last))
  return out
}
