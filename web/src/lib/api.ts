// REST calls to the brain api for things GraphQL doesn't do: uploads and
// small file endpoints. Same-origin through Caddy; the admin secret doubles as
// the api secret (single user on a private tailnet).
const SECRET = import.meta.env.VITE_HASURA_ADMIN_SECRET ?? ''
const headers = { 'x-api-secret': SECRET }

async function check(r: Response) {
  if (r.ok) return r
  let msg = `${r.status} ${r.statusText}`
  try {
    const j = await r.json()
    msg = j.detail ?? j.message ?? msg
  } catch { /* not json */ }
  throw new Error(msg)
}

export function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('x-api-secret', SECRET)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
      else {
        let msg = `${xhr.status}`
        try { msg = JSON.parse(xhr.responseText).detail ?? msg } catch { /* */ }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(file)
  })
}

export const uploadVideo = (file: File, note: string, pipeline: string, onProgress: (p: number) => void) =>
  uploadWithProgress(
    `/api/upload?filename=${encodeURIComponent(file.name)}&note=${encodeURIComponent(note)}&pipeline=${pipeline}`,
    file, onProgress,
  ) as Promise<{ video_id: string; title: string }>

export const listMusic = () => fetch('/api/music').then(check).then((r) => r.json() as Promise<string[]>)

export const uploadMusic = (file: File) =>
  fetch(`/api/music?filename=${encodeURIComponent(file.name)}`, { method: 'POST', headers, body: file })
    .then(check).then((r) => r.json() as Promise<{ name: string }>)

export const fileUrl = (rel: string) => `/api/files/get?path=${encodeURIComponent(rel)}`

export const fetchJson = <T,>(rel: string) => fetch(fileUrl(rel)).then(check).then((r) => r.json() as Promise<T>)

export const saveCaptions = (videoId: string, data: { speed: number; items: { text: string; start: number; duration: number }[] }) =>
  fetch(`/api/files/${videoId}/assets/captions`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(data),
  }).then(check).then((r) => r.json())

export interface Transcript {
  segments: { start: number; end: number; text: string; words: { w: string; s: number; e: number }[] }[]
}
export interface Scenes { scenes: number[]; duration: number | null }
export interface ManualCaptions { speed: number; items: { text: string; start: number; duration: number }[] }
