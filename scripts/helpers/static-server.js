'use strict'

const http = require('node:http')
const path = require('node:path')
const { stat, readFile } = require('node:fs/promises')

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
}

function isSubpath(rootPath, targetPath) {
  const relativePath = path.relative(rootPath, targetPath)

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

async function resolveFilePath(rootPath, requestUrl) {
  let requestPath
  try {
    requestPath = decodeURIComponent(requestUrl.split('?')[0].split('#')[0])
  } catch (error) {
    const malformedUrlError = new Error('Malformed request URL')
    malformedUrlError.code = 'ERR_MALFORMED_URL'
    throw malformedUrlError
  }
  const relativePath = requestPath === '/' ? './index.html' : `.${requestPath}`
  let targetPath = path.resolve(rootPath, relativePath)

  if (!isSubpath(rootPath, targetPath)) {
    return null
  }

  let targetStats
  try {
    targetStats = await stat(targetPath)
  } catch {
    return undefined
  }

  if (targetStats.isDirectory()) {
    targetPath = path.join(targetPath, 'index.html')

    if (!isSubpath(rootPath, targetPath)) {
      return null
    }

    try {
      await stat(targetPath)
    } catch {
      return undefined
    }
  }

  return targetPath
}

function createStaticServer({ rootPath, port, name = 'octez.connect' }) {
  const absoluteRootPath = path.resolve(rootPath)
  const server = http.createServer(async (request, response) => {
    try {
      if (!request.url) {
        response.writeHead(400, { 'X-Powered-By': name })
        response.end('Bad Request')

        return
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' })
        response.end()

        return
      }

      const filePath = await resolveFilePath(absoluteRootPath, request.url)

      if (filePath === null) {
        response.writeHead(403, { 'X-Powered-By': name })
        response.end('Forbidden')

        return
      }

      if (!filePath) {
        response.writeHead(404, { 'X-Powered-By': name })
        response.end('Not Found')

        return
      }

      const headers = {
        'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
        'X-Powered-By': name
      }

      response.writeHead(200, headers)

      if (request.method === 'HEAD') {
        response.end()
        return
      }

      try {
        const fileContents = await readFile(filePath)
        response.end(fileContents)
      } catch (readError) {
        if (readError && (readError.code === 'ENOENT' || readError.code === 'ENOTDIR')) {
          response.writeHead(404, { 'X-Powered-By': name })
          response.end('Not Found')
        } else {
          response.writeHead(500, { 'X-Powered-By': name })
          response.end('Internal Server Error')
        }
      }
    } catch (error) {
      if (error && error.code === 'ERR_MALFORMED_URL') {
        response.writeHead(400, { 'X-Powered-By': name })
        response.end('Bad Request')
      } else {
        response.writeHead(500, { 'X-Powered-By': name })
        response.end('Internal Server Error')
      }
    }
  })

  return {
    port,
    server,
    start(callback) {
      server.listen(port, callback)
    },
    stop(callback) {
      server.close(callback)
    }
  }
}

module.exports = {
  createStaticServer,
  resolveFilePath
}
