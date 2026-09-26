import { useSubscription } from '@apollo/client'
import { MachinesDocument } from '../gql/generated'

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never seen'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return `${Math.round(s)}s ago`
  if (s < 5400) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

export default function Machines() {
  const { data, loading, error } = useSubscription(MachinesDocument)

  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>

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
              {(m.capabilities ?? []).map((c) => (
                <span key={c} className="chip">{c}</span>
              ))}
            </div>
            <div className="mono muted small">
              {m.status === 'online' ? 'online' : timeAgo(m.last_seen_at)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
