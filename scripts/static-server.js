'use strict'

const { createStaticServer } = require('./helpers/static-server')

const [, , rootPath = '.', portValue = '8080', name = 'octez.connect'] = process.argv

if (!/^\d+$/.test(portValue)) {
  throw new Error(`Invalid port: ${portValue}`)
}

const port = Number(portValue)

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error(`Invalid port: ${portValue}`)
}

const staticServer = createStaticServer({
  rootPath,
  port,
  name
})

staticServer.start(() => {
  console.log(`Serving ${rootPath} on port ${staticServer.server.address().port}`)
})

process.on('SIGINT', () => {
  staticServer.stop(() => process.exit(0))
})

process.on('SIGTERM', () => {
  staticServer.stop(() => process.exit(0))
})
