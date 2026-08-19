async function handle(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch { /* non-JSON error body */ }
    throw new Error(detail)
  }
  return res.json()
}

export const getConfig = () => fetch('/api/config').then(handle)

export const probe = (url) =>
  fetch(`/api/probe?url=${encodeURIComponent(url)}`).then(handle)

export const startDownload = (url, quality, title) =>
  fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality, title }),
  }).then(handle)

export const getJobs = () => fetch('/api/jobs').then(handle)

export const cancelJob = (id) =>
  fetch(`/api/jobs/${id}/cancel`, { method: 'POST' }).then(handle)

export const clearJobs = () =>
  fetch('/api/jobs/clear', { method: 'POST' }).then(handle)

export const getLibrary = () => fetch('/api/library').then(handle)

export const startConvert = (path) =>
  fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).then(handle)

export const reveal = (path) =>
  fetch('/api/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).then(handle)
