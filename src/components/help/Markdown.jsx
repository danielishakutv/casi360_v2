import { createElement } from 'react'
import { Link } from 'react-router-dom'

/**
 * Tiny markdown renderer for Help Center articles.
 *
 * Supported syntax (a deliberate subset, no third-party deps):
 *   # / ## / ###       headings
 *   **bold**           bold
 *   *italic*           italic
 *   `inline code`      monospace
 *   ```block```        fenced code block
 *   - item / 1. item   lists
 *   > quote            blockquote
 *   [text](url)        links — internal (/foo) use react-router Link,
 *                              external (http…) open in a new tab
 */
export default function Markdown({ source }) {
  if (!source) return null
  const blocks = parseBlocks(String(source))
  return <div className="md-body">{blocks.map((b, i) => renderBlock(b, i))}</div>
}

/* ─── block parser ─── */
function parseBlocks(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (/^```/.test(line)) {
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ type: 'code', content: buf.join('\n') })
      continue
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, content: h[2].trim() })
      i++
      continue
    }

    // Blockquote — group consecutive `> ` lines
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', content: buf.join(' ').trim() })
      continue
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Blank line — paragraph break
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph — gather contiguous non-block lines
    const buf = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6}\s|>\s?|\s*[-*]\s|\s*\d+\.\s|```)/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', content: buf.join(' ').trim() })
  }

  return blocks
}

/* ─── block renderers ─── */
function renderBlock(b, key) {
  switch (b.type) {
    case 'heading': {
      // # → h3, ## → h4, ### → h5 (we keep page <h2/> for the article title)
      const tag = `h${Math.min(b.level + 2, 6)}`
      return createElement(tag, { key, className: `md-h md-h${b.level}` }, renderInline(b.content))
    }
    case 'code':
      return <pre key={key} className="md-pre"><code>{b.content}</code></pre>
    case 'quote':
      return <blockquote key={key} className="md-quote">{renderInline(b.content)}</blockquote>
    case 'ul':
      return (
        <ul key={key} className="md-ul">
          {b.items.map((it, k) => <li key={k}>{renderInline(it)}</li>)}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} className="md-ol">
          {b.items.map((it, k) => <li key={k}>{renderInline(it)}</li>)}
        </ol>
      )
    case 'p':
    default:
      return <p key={key} className="md-p">{renderInline(b.content)}</p>
  }
}

/* ─── inline tokenizer (code → link → bold → italic) ─── */
function renderInline(text) {
  const out = []
  let buffer = ''
  let i = 0
  let key = 0

  const flush = () => { if (buffer) { out.push(buffer); buffer = '' } }

  while (i < text.length) {
    const rest = text.slice(i)

    // `inline code`
    let m = /^`([^`]+)`/.exec(rest)
    if (m) {
      flush()
      out.push(<code key={`c${key++}`} className="md-code-inline">{m[1]}</code>)
      i += m[0].length
      continue
    }

    // [text](url)
    m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest)
    if (m) {
      flush()
      const [, label, url] = m
      out.push(renderLink(label, url, `l${key++}`))
      i += m[0].length
      continue
    }

    // **bold**
    m = /^\*\*([^*]+?)\*\*/.exec(rest)
    if (m) {
      flush()
      out.push(<strong key={`b${key++}`}>{renderInline(m[1])}</strong>)
      i += m[0].length
      continue
    }

    // *italic*
    m = /^\*([^*]+?)\*/.exec(rest)
    if (m) {
      flush()
      out.push(<em key={`i${key++}`}>{renderInline(m[1])}</em>)
      i += m[0].length
      continue
    }

    buffer += text[i]
    i++
  }
  flush()
  return <>{out}</>
}

function renderLink(label, url, key) {
  // Hash-only anchors stay on the page
  if (url.startsWith('#')) {
    return <a key={key} href={url} className="md-link">{label}</a>
  }
  // Internal app links — use Link so we don't full-reload
  if (url.startsWith('/')) {
    return <Link key={key} to={url} className="md-link">{label}</Link>
  }
  // Mailto / tel — direct link, no new tab
  if (/^(mailto:|tel:)/i.test(url)) {
    return <a key={key} href={url} className="md-link">{label}</a>
  }
  // External — new tab
  return (
    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="md-link md-link-external">
      {label}
    </a>
  )
}

