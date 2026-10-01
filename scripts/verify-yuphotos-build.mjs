import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const read = file => readFileSync(`apps/web/dist/${file}`, 'utf8')
const manifest = JSON.parse(readFileSync('apps/web/src/data/photos-manifest.json', 'utf8'))
const html = read('index.html')
const embedded = html.match(/<script id="manifest">([\s\S]*?)<\/script>/)
assert.ok(embedded, 'Static gallery must embed its photo manifest')
const context = { window: {} }
runInNewContext(embedded[1], context, { timeout: 1000 })
assert.deepEqual(
  JSON.parse(JSON.stringify(context.window.__MANIFEST__)),
  manifest,
  'Published manifest must match the builder output',
)
assert.ok(Array.isArray(manifest.data) && Array.isArray(manifest.cameras) && Array.isArray(manifest.lenses))
assert.match(html, /梧桐雨の相册/)
assert.equal(read('CNAME').trim(), 'photos.wutongyu.site')
assert.equal(read('404.html'), html, 'Photo deep links must load the same SPA')
const feed = read('feed.xml')
const sitemap = read('sitemap.xml')
const ogImage = html.match(/property="og:image" content="([^"]+)"/)
assert.ok(ogImage, 'Gallery must have a generated sharing image')
const ogUrl = new URL(ogImage[1])
assert.equal(ogUrl.origin, 'https://photos.wutongyu.site')
assert.match(ogUrl.pathname, /^\/og-image-[^/]+\.png$/)
assert.ok(readFileSync(`apps/web/dist${ogUrl.pathname}`).length > 0)
assert.match(feed, /<title>梧桐雨の相册<\/title>/)
assert.equal((feed.match(/<item>/g) ?? []).length, manifest.data.length)
assert.equal((sitemap.match(/<url>/g) ?? []).length, manifest.data.length + 1)
for (const photo of manifest.data) {
  const url = `https://photos.wutongyu.site/photos/${encodeURIComponent(photo.id)}`
  assert.ok(feed.includes(`<link>${url}</link>`), `Missing feed link for ${photo.id}`)
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `Missing sitemap link for ${photo.id}`)
}
console.info(`Verified Pages artifact: ${manifest.data.length} photos, manifest, RSS, sitemap, domain and deep links`)
