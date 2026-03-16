import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function saveTableDataPlugin() {
  const targetPath = resolve(process.cwd(), 'src/data/variable-table-data.json')

  const saveTableDataMiddleware = async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }

    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body)
        await writeFile(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: String(error) }))
      }
    })
  }

  return {
    name: 'save-table-data-plugin',
    configureServer(server) {
      server.middlewares.use('/__save-table-data', saveTableDataMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/__save-table-data', saveTableDataMiddleware)
    },
  }
}

// https://vite.dev/config/
// Force rebuild
export default defineConfig({
  base: '/green-table-onepager',
  plugins: [react(), saveTableDataPlugin()],
})
