import { useMutation, useSubscription } from '@apollo/client'
import { useEffect, useState } from 'react'
import { MachinesDocument, UpdateMachineDocument, WakeMachineDocument, type MachinesSubscription } from '../gql/generated'
import { appConfig } from '../lib/api'
import { timeAgo } from '../lib/format'

type Machine = MachinesSubscription['machines'][number]

// Job types a machine can be assigned, with what they need installed.
const JOB_TYPES: { key: string; label: string; needs: string }[] = [
  { key: 'download', label: 'Download', needs: 'yt-dlp + ffmpeg' },
  { key: 'transcribe', label: 'Transcribe', needs: 'faster-whisper (GPU preferred)' },
  { key: 'scenes', label: 'Scenes', needs: 'ffmpeg' },
  { key: 'borders', label: 'Bars', needs: 'ffmpeg' },
  { key: 'suggest', label: 'Suggest clips', needs: 'Gemini key' },
  { key: 'postkit', label: 'Post kit', needs: 'Gemini key' },
  { key: 'style', label: 'Style clone', needs: 'Gemini key + yt-dlp' },
  { key: 'plan', label: 'Edit plan', needs: 'Gemini key' },
  { key: 'render', label: 'Render', needs: 'ffmpeg (GPU encoder preferred)' },
  { key: 'convert', label: 'Edit copy', needs: 'ffmpeg (heavy)' },
  { key: 'clippack', label: 'Clip pack', needs: 'ffmpeg (heavy)' },
  { key: 'tighten', label: 'Silences', needs: 'ffmpeg (heavy)' },
]

type Role = 'off' | 'primary' | 'fallback'

function MachineCard({ m, all, wol }: { m: Machine; all: Machine[]; wol: boolean }) {
  const [update, { loading }] = useMutation(UpdateMachineDocument)
  const [wake, { loading: waking }] = useMutation(WakeMachineDocument)
  const [msg, setMsg] = useState<string | null>(null)
  const assigned = new Set(m.capabilities ?? [])
  const fallback = new Set(m.fallback ?? [])
  const supported = new Set(m.supported ?? [])
  const known = supported.size > 0
  const roleOf = (key: string): Role => (assigned.has(key) ? 'primary' : fallback.has(key) ? 'fallback' : 'off')

  const save = (nextAssigned: Set<string>, nextFallback: Set<string>, paused = m.paused) =>
    void update({ variables: {
      id: m.id,
      capabilities: JOB_TYPES.filter((j) => nextAssigned.has(j.key)).map((j) => j.key),
      fallback: JOB_TYPES.filter((j) => nextFallback.has(j.key)).map((j) => j.key),
      paused,
    } })
  const setRole = (key: string, role: Role) => {
    const a = new Set(assigned), f = new Set(fallback)
    a.delete(key); f.delete(key)
    if (role === 'primary') a.add(key)
    if (role === 'fallback') f.add(key)
    save(a, f)
  }
  const setPaused = (paused: boolean) => save(assigned, fallback, paused)
  const doWake = async () => {
    setMsg(null)
    try {
      const r = await wake({ variables: { name: m.name } })
      setMsg(r.data?.wake_machine?.message ?? 'Sent.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }
  const alsoOn = (key: string) => all.filter((o) => o.id !== m.id && (o.capabilities ?? []).includes(key) && !o.paused).map((o) => o.name)
  const fallbacks = (key: string) => all.filter((o) => o.id !== m.id && (o.fallback ?? []).includes(key) && !o.paused).map((o) => o.name)

  return (
    <article className="machine-card">
      <div className="machine-head">
        <span className={`status-dot ${m.paused ? 'paused' : m.status}`} aria-label={m.status} />
        <strong>{m.name}</strong>
        <span className="mono muted small grow">{m.os ?? ''}</span>
        <label className="check small" title="Keep the worker running but claim nothing">
          <input type="checkbox" checked={m.paused} disabled={loading} onChange={(e) => setPaused(e.target.checked)} /> pause
        </label>
      </div>
      <div className="mono muted small">
        {m.status === 'online' ? 'online' : m.status === 'waking' ? `waking (sent ${timeAgo(m.woken_at)})` : `seen ${timeAgo(m.last_seen_at)}`}
        {!known && ' · has not connected yet — install the worker to see what it can run'}
      </div>
      <div className="cap-grid">
        {JOB_TYPES.map((j) => {
          const can = supported.has(j.key)
          const role = roleOf(j.key)
          const others = alsoOn(j.key)
          const fbs = fallbacks(j.key)
          const hint = known && !can ? 'not installed'
            : role === 'primary' ? (others.length ? `also ${others.join(', ')}` : fbs.length ? `fallback: ${fbs.join(', ')}` : 'only here')
            : role === 'fallback' ? (others.length ? `covers ${others.join(', ')}` : 'nobody primary!')
            : ''
          return (
            <div key={j.key} className={`cap-row ${role !== 'off' ? 'on' : ''} ${known && !can ? 'off' : ''}`}
                 title={known && !can ? `Not available here: needs ${j.needs}` : j.needs}>
              <select value={role} disabled={loading || (known && !can && role === 'off')} aria-label={`${j.label} on ${m.name}`}
                      onChange={(e) => setRole(j.key, e.target.value as Role)}>
                <option value="off">—</option>
                <option value="primary">does it</option>
                <option value="fallback">fallback</option>
              </select>
              <span>{j.label}</span>
              <span className="muted small">{hint}</span>
            </div>
          )
        })}
      </div>
      <div className="row">
        {wol && m.mac_address && m.status !== 'online' && (
          <button className="btn small" onClick={() => void doWake()} disabled={waking}>Wake</button>
        )}
        {msg && <span className="muted small">{msg}</span>}
      </div>
    </article>
  )
}

export default function Machines() {
  const { data, loading, error } = useSubscription(MachinesDocument)
  const [wol, setWol] = useState(false)
  useEffect(() => { appConfig().then((c) => setWol(c.wol_enabled)).catch(() => setWol(false)) }, [])
  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const machines = data?.machines ?? []
  const unassigned = JOB_TYPES.filter((j) => !machines.some((m) => !m.paused && (m.capabilities ?? []).includes(j.key)))
  return (
    <section className="panel stack">
      <div className="panel-head"><h2>Machines</h2></div>
      <p className="muted small">
        Set who does what. "Does it" machines share the work; a "fallback" machine only steps in when every
        "does it" machine for that job is offline (after a minute, so a sleeping PC can be woken first).
        Changes reach running workers within 15 seconds. Greyed-out jobs need software that machine doesn't have.
        {!wol && ' Wake-on-LAN is off (WOL_ENABLED in the brain\'s .env).'}
      </p>
      {unassigned.length > 0 && (
        <p className="job-error small">Nobody is assigned to: {unassigned.map((j) => j.label).join(', ')}. Those jobs will wait forever.</p>
      )}
      <div className="stack">
        {machines.map((m) => <MachineCard key={m.id} m={m} all={machines} wol={wol} />)}
      </div>
    </section>
  )
}
