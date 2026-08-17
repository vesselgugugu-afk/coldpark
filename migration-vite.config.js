import { defineConfig } from 'C:/work/ai-phone/node_modules/vite/dist/node/index.js'
import vue from 'C:/work/ai-phone/node_modules/@vitejs/plugin-vue/dist/index.mjs'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function inlineSingleFile() {
  return {
    name: 'inline-single-file',
    apply: 'build',
    closeBundle() {
      const builtDir = join(projectRoot, 'app-coldpark-built')
      const appDir = join(projectRoot, 'app-coldpark')
      const sourceHtml = join(builtDir, 'migration-index.html')
      const targetHtml = join(appDir, 'index.html')

      let html = readFileSync(sourceHtml, 'utf8')

      // Vite emits local CSS and JS assets. Inline them so the uploaded APP
      // does not depend on a same-origin HTTP server or module/CORS loading.
      html = html.replace(
        /<link[^>]+rel=["']stylesheet["'][^>]*href=["']\.\/assets\/([^"']+)\.css["'][^>]*>/g,
        (_, name) => {
          const css = readFileSync(join(builtDir, 'assets', `${name}.css`), 'utf8')
          return `<style>${css}</style>`
        }
      )

      html = html.replace(
        /<script[^>]*type=["']module["'][^>]*crossorigin[^>]*src=["']\.\/assets\/([^"']+)\.js["'][^>]*><\/script>/g,
        (_, name) => {
          const js = readFileSync(join(builtDir, 'assets', `${name}.js`), 'utf8')
          return `<script defer>${js}</script>`
        }
      )

      html = html.replace(
        /<script[^>]*type=["']module["'][^>]*src=["']\.\/assets\/([^"']+)\.js["'][^>]*><\/script>/g,
        (_, name) => {
          const js = readFileSync(join(builtDir, 'assets', `${name}.js`), 'utf8')
          return `<script defer>${js}</script>`
        }
      )

      mkdirSync(appDir, { recursive: true })
      rmSync(join(appDir, 'assets'), { recursive: true, force: true })
      writeFileSync(targetHtml, html, 'utf8')
    }
  }
}

export default defineConfig({
  base: './',
  root: '.',
  plugins: [vue(), inlineSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./migration-src', import.meta.url)),
      vue: 'C:/work/ai-phone/node_modules/vue',
      dexie: 'C:/work/ai-phone/node_modules/dexie'
    }
  },
  build: {
    outDir: 'app-coldpark-built',
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./migration-index.html', import.meta.url))
    }
  }
})
