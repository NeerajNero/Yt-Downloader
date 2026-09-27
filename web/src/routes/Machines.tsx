import { useMutation, useSubscription } from '@apollo/client'
import { useState } from 'react'
import { MachinesDocument, UpdateMachineDocument, WakeMachineDocument, type MachinesSubscription } from '../gql/generated'
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
  { key: 'render', label: 'Render', needs: 'ffmpeg (GPU encoder preferred)' },
  { key: 'convert', label: 'Edit copy', needs: 'ffmpeg (heavy)' },
  { key: 'clippack', label: 'Clip pack', needs: 'ffmpeg (heavy)' },
  { key: 'tighten', label: 'Silences', needs: 'ffmpeg (heavy)' },
]

const pgArray = (xs: string[]) => xs

function MachineCard({ m, all }: { m: Machine; all: Machine[] }) {
  const [update, { loading }] = useMutation(UpdateMachineDocument)
  const [wake, { loading: waking }] = useMutation(WakeMachineDocument)
  const [msg, setMsg] = useState<string | null>(null)
  const assigned = new Set(m.capabilities ?? [])
  const supported = new Set(m.supported ?? [])
  const known = supported.size > 0

  const toggle = (key: string) => {
    const next = new Set(assigned)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    void update({ variables: { id: m.id, capabilities: pgArray(JOB_TYPES.filter((j) => next.has(j.key)).map((j) => j.key)), paused: m.paused } })
  }
  const setPaused = (paused: boolean) =>
    void update({ variables: { id: m.id, capabilities: pgArray([...assigned]), paused } })
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
          const on = assigned.has(j.key)
          const others = alsoOn(j.key)
          return (
            <label key={j.key} className={`cap-row ${on ? 'on' : ''} ${known && !can ? 'off' : ''}`}
                   title={known && !can ? `Not available here: needs ${j.needs}` : j.needs}>
              <input type="checkbox" checked={on} disabled={loading || (known && !can && !on)} onChange={() => toggle(j.key)} />
              <span>{j.label}</span>
              <span className="muted small">
                {known && !can ? 'not installed' : others.length ? `also ${others.join(', ')}` : on ? 'only here' : ''}
              </span>
            </label>
          )
        })}
      </div>
      <div className="row">
        {m.mac_address && m.status !== 'online' && (
          <button className="btn small" onClick={() => void doWake()} disabled={waking}>Wake</button>
        )}
        {msg && <span className="muted small">{msg}</span>}
      </div>
    </article>
  )
}

export default function Machines() {
  const { data, loading, error } = useSubscription(MachinesDocument)
  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const machines = data?.machines ?? []
  const unassigned = JOB_TYPES.filter((j) => !machines.some((m) => !m.paused && (m.capabilities ?? []).includes(j.key)))
  return (
    <section className="panel stack">
      <div className="panel-head"><h2>Machines</h2></div>
      <p className="muted small">
        Tick what each machine should do. Changes reach a running worker within 15 seconds. Greyed-out jobs need
        software that machine doesn't have. When two machines share a job, whichever is free takes it.
      </p>
      {unassigned.length > 0 && (
        <p className="job-error small">Nobody is assigned to: {unassigned.map((j) => j.label).join(', ')}. Those jobs will wait forever.</p>
      )}
      <div className="stack">
        {machines.map((m) => <MachineCard key={m.id} m={m} all={machines} />)}
      </div>
    </section>
  )
}
