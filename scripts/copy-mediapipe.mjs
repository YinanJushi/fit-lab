// Copies the MediaPipe WebAssembly files next to the app so pose detection works offline and
// never loads code from a third-party server. Runs automatically before dev and build.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const to = join(root, 'public/mediapipe')
if (!existsSync(from)) {
  console.warn('MediaPipe is not installed; skipping copy.')
} else {
  mkdirSync(to, { recursive: true })
  // the ES-module variant is not used by this app, so skip it to keep the site smaller
  cpSync(from, to, { recursive: true, filter: (src) => !src.includes('_module_') })
  console.log('Copied MediaPipe WASM to public/mediapipe')
}
