import { defineBuilderConfig } from '@afilmory/builder'

import { env } from './env.js'

export default defineBuilderConfig(() => {
  for (const key of ['S3_BUCKET_NAME', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
    if (!env[key]) {
      throw new Error(`YuPhotos: 请在 .env 或 GitHub Actions 中配置 ${key}`)
    }
  }
  const endpoint = new URL(env.S3_ENDPOINT!)
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('YuPhotos: S3_ENDPOINT 必须是 Cloudflare R2 的 HTTPS S3 API 地址')
  }

  return {
    storage: {
      provider: 's3',
      bucket: env.S3_BUCKET_NAME,
      region: 'auto',
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      prefix: env.S3_PREFIX,
      customDomain: 'https://images.wutongyu.site',
      downloadConcurrency: 4,
    },
    system: {
      processing: {
        defaultConcurrency: 4,
        enableLivePhotoDetection: true,
        digestSuffixLength: 8,
      },
      observability: {
        performance: { worker: { useClusterMode: false } },
      },
    },
  }
})
