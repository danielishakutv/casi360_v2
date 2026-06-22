/*
 * Regenerate raster favicons from public/favicon.svg.
 * One-off tooling: `npm i sharp --no-save` then `node scripts/gen-favicons.cjs`.
 * Produces PNG sizes + a multi-size favicon.ico for older Safari/Windows.
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svg = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'))
const out = path.join(__dirname, '..', 'public')

function png(size, name) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(out, name))
    .then(() => {
      console.log(`${name}  ${size}x${size}  ${fs.statSync(path.join(out, name)).size} bytes`)
    })
}

/* Minimal ICO writer that embeds PNG frames (supported by Windows Vista+
   and modern browsers). Each entry points at a full PNG payload. */
function writeIco(sizes, file) {
  const buffers = sizes.map((s) => fs.readFileSync(path.join(out, `favicon-${s}.png`)))
  const count = sizes.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)       // reserved
  header.writeUInt16LE(1, 2)       // type: icon
  header.writeUInt16LE(count, 4)   // image count

  const dir = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count
  sizes.forEach((s, i) => {
    const buf = buffers[i]
    const b = dir.subarray(i * 16, i * 16 + 16)
    b.writeUInt8(s >= 256 ? 0 : s, 0) // width  (0 == 256)
    b.writeUInt8(s >= 256 ? 0 : s, 1) // height
    b.writeUInt8(0, 2)                // palette
    b.writeUInt8(0, 3)                // reserved
    b.writeUInt16LE(1, 4)             // color planes
    b.writeUInt16LE(32, 6)            // bits per pixel
    b.writeUInt32LE(buf.length, 8)    // size of payload
    b.writeUInt32LE(offset, 12)       // offset of payload
    offset += buf.length
  })

  fs.writeFileSync(path.join(out, file), Buffer.concat([header, dir, ...buffers]))
  console.log(`${file}  (${sizes.join(', ')})  ${fs.statSync(path.join(out, file)).size} bytes`)
}

;(async () => {
  await png(512, 'favicon-512.png')
  await png(180, 'apple-touch-icon.png')
  await png(48, 'favicon-48.png')
  await png(32, 'favicon-32.png')
  await png(16, 'favicon-16.png')
  writeIco([16, 32, 48], 'favicon.ico')
})()
