const { createStaticServer } = require('./scripts/helpers/static-server')

const server1 = createStaticServer({
  rootPath: './examples/',
  port: 8080,
  name: 'octez.connect'
})
const server2 = createStaticServer({
  rootPath: './examples/',
  port: 8081,
  name: 'octez.connect'
})

server1.start(function () {
  console.log('Server1 listening to', server1.port)
  server2.start(function () {
    console.log('Server2 listening to', server2.port)
  })
})
