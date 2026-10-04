// Test-only static host: serves built assets and changes real worker script bytes.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

const clientRoot = resolve('dist/client')
const worker = await readFile(resolve(clientRoot, 'service-worker.js'), 'utf8')
let version = 1
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4175')
  if (request.method === 'POST' && url.pathname === '/__test/worker-version') {
    version++
    response.writeHead(200)
    response.end()
    return
  }
  response.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/service-worker.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(
      worker.replace(
        'mono-finance-shell-v2',
        `mono-finance-shell-test-${version}`,
      ),
    )
    return
  }
  const pathname =
    url.pathname.startsWith('/assets/') || extname(url.pathname)
      ? url.pathname
      : '/index.html'
  const filename = resolve(clientRoot, `.${pathname}`)
  if (!filename.startsWith(clientRoot + sep)) {
    response.writeHead(403)
    response.end()
    return
  }
  try {
    const body = await readFile(filename)
    response.setHeader(
      'Content-Type',
      mimeTypes[extname(filename)] ?? 'application/octet-stream',
    )
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
}).listen(4175, '127.0.0.1')
