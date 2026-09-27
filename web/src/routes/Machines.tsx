import { useMutation, useSubscription } from '@apollo/client'
import { useState } from 'react'
import { MachinesDocument, WakeMachineDocument } from '../gql/generated'
import { timeAgo } from '../lib/format'

export default function Machines() {
  const { data, loading, error } = useSubscription(MachinesDocument)
  const [wake, { loading: waking }] = useMutation(WakeMachineDocument)
  const [msg, setMsg] = useState<string | null>(null)

  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>

  const doWake = async (name: string) => {
    setMsg(null)
    try {
      const r = await wake({ variables: { name } })
      setMsg(r.data?.wake_machine?.message ?? 'Sent.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  return (
    <section className="panel">
      <h2>Machines</h2>
      <div className="machine-grid">
        {data?.machines.map((m) => (
          <article key={m.id} className="machine-card">
            <div className="machine-head">
              <span className={`status-dot ${m.status}`} aria-label={m.status} />
              <strong>{m.name}</strong>
            </div>
            <div className="mono muted">{m.os ?? 'unknown os'}</div>
            <div className="caps">
              {(m.capabilities ?? []).map((c) => <span key={c} className="chip">{c}</span>)}
            </div>
            <div className="mono muted small">
              {m.status === 'online' ? 'online' : m.status === 'waking' ? `waking (sent ${timeAgo(m.woken_at)})` : `seen ${timeAgo(m.last_seen_at)}`}
            </div>
            {m.mac_address && m.status !== 'online' && (
              <button className="btn small" onClick={() => void doWake(m.name)} disabled={waking}>Wake</button>
            )}
          </article>
        ))}
      </div>
      {msg && <p className="muted small">{msg}</p>}
    </section>
  )
}
