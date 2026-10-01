import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export const MONOREPO_ROOT_PATH = path.resolve(dirname, '../../../../..')
export const MANIFEST_PATH = path.join(MONOREPO_ROOT_PATH, 'apps/web/src/data/photos-manifest.json')
