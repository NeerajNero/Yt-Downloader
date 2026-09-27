import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { aiModels, type AiModels } from '../lib/api'

export default function More() {
  const [models, setModels] = useState<AiModels | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    aiModels().then(setModels).catch((e) => setErr((e as Error).message))
  }, [])
  const avail = new Set(models?.available.map((m) => m.name) ?? [])
  return (
    <section className="panel stack">
      <div className="panel-head"><h2>More</h2></div>
      <Link to="/machines" className="btn">Machines</Link>
      <Link to="/recipes" className="btn">Recipes</Link>
      <Link to="/styles" className="btn">Styles — clone a Short's edit</Link>

      <div className="panel-head" style={{ marginTop: 12 }}><h2>AI models</h2></div>
      {err && <p className="job-error small">{err}</p>}
      {models && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="small">
            Fallback chain (tried in order when one is busy):{' '}
            {models.configured.map((m, i) => (
              <span key={m} className={`chip ${!models.key ? '' : avail.has(m) ? 'ok' : 'bad'}`} style={{ marginRight: 4 }}>
                {i + 1}. {m}
              </span>
            ))}
          </div>
          {models.error && <p className="muted small">{models.error}</p>}
          {models.missing && models.missing.length > 0 && (
            <p className="job-error small">Not available to this key: {models.missing.join(', ')}. Set GEMINI_MODELS in the brain's .env to models from the list below.</p>
          )}
          {models.available.length > 0 && (
            <details>
              <summary className="muted small">{models.available.length} models this key can call</summary>
              <div className="stack" style={{ gap: 2, marginTop: 6 }}>
                {models.available.map((m) => (
                  <div key={m.name} className="mono small">
                    {m.name}<span className="muted"> · {m.display}{m.input_tokens ? ` · ${Math.round(m.input_tokens / 1000)}k in` : ''}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
