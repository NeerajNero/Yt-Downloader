// Live data without websockets: every screen polls its endpoint once a second
// (slower when the tab is hidden), and any mutation calls invalidate() so all
// pollers refetch straight away.
import { useEffect, useRef, useState } from 'react'

const listeners = new Set<() => void>()

export function invalidate() {
  listeners.forEach((l) => l())
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`
    try { msg = (await r.json()).detail ?? msg } catch { /* not json */ }
    throw new Error(msg)
  }
  return r.json() as Promise<T>
}

export interface Polled<T> { data: T | null; loading: boolean; error: string | null; refresh: () => void }

export function usePoll<T>(url: string | null, intervalMs = 1000): Polled<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(url))
  const timer = useRef<number | null>(null)
  const inflight = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    setData(null); setError(null); setLoading(Boolean(url))
    if (!url) return
    const tick = async () => {
      if (inflight.current) return
      inflight.current = true
      try {
        const next = await getJson<T>(url)
        if (!alive.current) return
        setData((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
        setError(null)
      } catch (e) {
        if (alive.current) setError((e as Error).message)
      } finally {
        inflight.current = false
        if (alive.current) setLoading(false)
      }
    }
    const schedule = () => {
      if (timer.current) window.clearTimeout(timer.current)
      const delay = document.hidden ? Math.max(intervalMs, 5000) : intervalMs
      timer.current = window.setTimeout(async () => { await tick(); if (alive.current) schedule() }, delay)
    }
    const now = () => { void tick().then(() => alive.current && schedule()) }
    void tick().then(() => alive.current && schedule())
    listeners.add(now)
    document.addEventListener('visibilitychange', now)
    return () => {
      alive.current = false
      listeners.delete(now)
      document.removeEventListener('visibilitychange', now)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [url, intervalMs])

  return { data, loading, error, refresh: () => invalidate() }
}
