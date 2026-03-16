// Polyfills MUST run first (before MSW or any other imports)
const { TextEncoder, TextDecoder } = require('util')
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder

// Web Streams (for MSW in jsdom)
try {
  const streams = require('web-streams-polyfill')
  if (typeof globalThis.ReadableStream === 'undefined' && streams.ReadableStream) globalThis.ReadableStream = streams.ReadableStream
  if (typeof globalThis.WritableStream === 'undefined' && streams.WritableStream) globalThis.WritableStream = streams.WritableStream
  if (typeof globalThis.TransformStream === 'undefined' && streams.TransformStream) globalThis.TransformStream = streams.TransformStream
} catch (_) {}

// BroadcastChannel (for MSW in jsdom)
if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = class BroadcastChannel {
    constructor() {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true }
  }
}

// Polyfill Response for MSW in jsdom (Node < 18)
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status ?? 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = init.headers ?? {}
    }
    static json(data, init) {
      return new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
    }
  }
}

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// MSW server - optional: only setup if msw loads (avoids breaking tests when deps incomplete)
;(function setupMSW() {
  try {
    const { setupServer } = require('msw/node')
    const { handlers } = require('./src/__mocks__/handlers')
    const server = setupServer(...handlers)
    beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())
  } catch (_) {
    // MSW not available - unit tests without API mocking will still run
  }
})()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props) {
    const React = require('react')
    return React.createElement('img', { ...props, alt: props.alt || '' })
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}
