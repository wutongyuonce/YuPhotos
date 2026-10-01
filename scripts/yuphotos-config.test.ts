import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
// eslint-disable-next-line test/no-import-node-test -- Runs with tsx and Node's built-in runner, without another test framework.
import test from 'node:test'

import { MANIFEST_PATH, MONOREPO_ROOT_PATH } from '../apps/web/plugins/vite/__internal__/constants'
import { workdir } from '../packages/builder/src/path'

const runConfig = (values: Record<string, string> = {}) => {
  const childEnv: Record<string, string | undefined> = {
    ...process.env,
    DOTENV_CONFIG_PATH: '/tmp/yuphotos-test-no-dotenv',
  }
  for (const key of ['S3_BUCKET_NAME', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    delete childEnv[key]
  }
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      'const {default:c}=await import(\'./builder.config.default.ts\'); console.log(JSON.stringify({provider:c.storage.provider,region:c.storage.region,domain:c.storage.customDomain,plugins:c.plugins??[]}))',
    ],
    { encoding: 'utf8', env: { ...childEnv, ...values } },
  )
}

const credentials = {
  S3_BUCKET_NAME: 'test-gallery',
  S3_ENDPOINT: 'https://00000000000000000000000000000000.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'test-key',
  S3_SECRET_ACCESS_KEY: 'test-secret',
}

test('missing R2 configuration fails instead of publishing an empty gallery', () => {
  const result = runConfig()
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /S3_BUCKET_NAME/)
})

test('static injection and feeds read the builder output even inside a Chinese directory', () => {
  assert.equal(MANIFEST_PATH, path.join(workdir, 'src/data/photos-manifest.json'))
  assert.equal(MONOREPO_ROOT_PATH, process.cwd())
  assert.equal(readFileSync(path.join(MONOREPO_ROOT_PATH, 'config.example.json'), 'utf8').length > 0, true)
})

test('R2 credentials cannot accidentally target the upstream AWS default', () => {
  const result = runConfig({ ...credentials, S3_ENDPOINT: 'https://s3.us-east-1.amazonaws.com' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Cloudflare R2/)
})

test('gallery reads R2 originals without enabling storage write plugins', () => {
  const result = runConfig(credentials)
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), {
    provider: 's3',
    region: 'auto',
    domain: 'https://images.wutongyu.site',
    plugins: [],
  })
  const cors = JSON.parse(readFileSync('r2-cors.json', 'utf8'))
  assert.ok(cors[0].AllowedOrigins.includes('https://photos.wutongyu.site'))
  assert.deepEqual(cors[0].AllowedMethods, ['GET', 'HEAD'])
})
