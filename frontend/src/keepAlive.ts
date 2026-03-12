/** Keep-alive polling to prevent Render server from sleeping */
export function startKeepAlive(intervalMs = 5000) {
  return setInterval(() => {
    fetch('/api/health').catch(() => {})
  }, intervalMs)
}
