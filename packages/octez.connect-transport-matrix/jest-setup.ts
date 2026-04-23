import '@testing-library/jest-dom'

if (typeof AbortSignal.timeout === 'undefined') {
  AbortSignal.timeout = (ms: number): AbortSignal => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms)
    return controller.signal
  }
}