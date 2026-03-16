// MSW server - with fallback when msw/node cannot be loaded (e.g. Jest resolution)
let server: { listen: (opts?: any) => void; close: () => void; resetHandlers: () => void }
try {
  const { setupServer } = require('msw/node')
  const { handlers } = require('./handlers')
  server = setupServer(...handlers)
} catch {
  server = {
    listen: () => {},
    close: () => {},
    resetHandlers: () => {},
    use: () => {},
  }
}
export { server }
