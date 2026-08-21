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

// XHR instead of fetch: it reports upload progress.
export const uploadFile = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/upload?filename=${encodeURIComponent(file.name)}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      let body = null
      try { body = JSON.parse(xhr.responseText) } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body)
      else reject(new Error(body?.detail || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Upload failed — connection error.'))
    xhr.send(file)
  })

export const startImport = (path) =>
  fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
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

export const startExport = (path, start, end, style, vividAmount, trimX, trimY,
  fgCrop, captions, captionSource = 'auto', captionPos = 'bottom',
  captionStyle = 'karaoke', resolution = '1080', orientation = 'portrait',
  rotate = 'none', rotateCaptions = false, loudness = false, zoom = 'none',
  look = 'none', lookSharp = 50, grade = 'none',
  music = '', musicGain = 60, duck = true) =>
  fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path, start, end, style, vivid_amount: vividAmount,
      trim_x: trimX, trim_y: trimY, fg_crop: fgCrop,
      captions, caption_source: captionSource, caption_pos: captionPos,
      caption_style: captionStyle, resolution, orientation, rotate,
      rotate_captions: rotateCaptions, loudness, zoom, look,
      look_sharp: lookSharp, grade, music, music_gain: musicGain, duck,
    }),
  }).then(handle)

export const getMusic = () => fetch('/api/music').then(handle)

export const uploadMusic = (file) =>
  fetch(`/api/music/upload?filename=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    body: file,
  }).then(handle)

export const getTranscript = (path) =>
  fetch(`/api/transcript?path=${encodeURIComponent(path)}`).then(handle)

export const getPresets = () => fetch('/api/presets').then(handle)

export const savePreset = (name, settings) =>
  fetch('/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, settings }),
  }).then(handle)

export const deletePreset = (name) =>
  fetch('/api/presets/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: name }),
  }).then(handle)

export const getCaptions = (path) =>
  fetch(`/api/captions?path=${encodeURIComponent(path)}`).then(handle)

export const saveCaptions = (path, speed, items) =>
  fetch('/api/captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, speed, items }),
  }).then(handle)

export const startTranscribe = (path) =>
  fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).then(handle)

export const startSuggest = (path, count = 5) =>
  fetch('/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, count }),
  }).then(handle)

export const getSuggestions = (path) =>
  fetch(`/api/suggestions?path=${encodeURIComponent(path)}`).then(handle)

export const startAutoShorts = (path, count = 3) =>
  fetch('/api/autoshorts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, count }),
  }).then(handle)

export const startPostkit = (path) =>
  fetch('/api/postkit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).then(handle)

export const getPostkit = (path) =>
  fetch(`/api/postkit?path=${encodeURIComponent(path)}`).then(handle)

export const startClipPack = (path, start, end, maxLen) =>
  fetch('/api/clippack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, start, end, max_len: maxLen }),
  }).then(handle)

export const startTighten = (path) =>
  fetch('/api/tighten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).then(handle)

export const detectBorders = (path) =>
  fetch(`/api/borders?path=${encodeURIComponent(path)}`).then(handle)

export const startScenes = (path) =>
  fetch('/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).then(handle)

export const getScenes = (path) =>
  fetch(`/api/scenes?path=${encodeURIComponent(path)}`).then(handle)

export const startPipeline = (path) =>
  fetch('/api/pipeline', {
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
