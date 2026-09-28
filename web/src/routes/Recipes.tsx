import { useState } from 'react'
import { deleteRecipe, updateRecipe } from '../lib/api'
import { usePoll } from '../lib/poll'
import { summarize, type RecipeSettings } from '../lib/settings'
import type { Recipe } from '../lib/types'

function RecipeCard({ r }: { r: Recipe }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(r.name)
  const [desc, setDesc] = useState(r.description ?? '')
  const [json, setJson] = useState(JSON.stringify(r.settings, null, 2))
  const [err, setErr] = useState<string | null>(null)
  const s = r.settings as unknown as RecipeSettings

  const save = async () => {
    setErr(null)
    let settings: unknown
    try { settings = JSON.parse(json) } catch { return setErr('Settings must be valid JSON.') }
    try {
      await updateRecipe(r.id, { name: name.trim(), description: desc.trim() || null, settings })
      setEditing(false)
    } catch (e) { setErr((e as Error).message) }
  }

  return (
    <article className="job-card">
      <div className="job-head">
        <strong>{r.name}</strong>
        <label className="check" title="Render every suggested clip with this recipe automatically">
          <input type="checkbox" checked={r.auto_apply}
                 onChange={(e) => void updateRecipe(r.id, { auto_apply: e.target.checked }).catch((err) => setErr((err as Error).message))} />
          auto-apply
        </label>
      </div>
      {r.description && <div className="muted small">{r.description}</div>}
      <div className="mono muted small">{summarize(s)}</div>
      <div className="muted small">{r.clips_count} clips rendered with it</div>
      {editing ? (
        <div className="stack" style={{ gap: 6 }}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label="Recipe name" />
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" aria-label="Description" />
          <textarea className="mono small" rows={10} value={json} onChange={(e) => setJson(e.target.value)} aria-label="Settings JSON" />
          {err && <p className="job-error">{err}</p>}
          <div className="row">
            <button className="btn small accent" onClick={() => void save()}>Save</button>
            <button className="btn small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {err && <p className="job-error small">{err}</p>}
          <div className="job-actions">
            <button className="btn small" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn small" onClick={() => window.confirm(`Delete recipe "${r.name}"?`) && void deleteRecipe(r.id)}>Delete</button>
          </div>
        </>
      )}
    </article>
  )
}

export default function Recipes() {
  const { data, loading, error } = usePoll<Recipe[]>('/api/recipes', 3000)
  if (error && !data) return <p className="error">Can't reach the app: {error}</p>
  if (loading && !data) return <p className="muted">Connecting…</p>
  const recipes = data ?? []
  const auto = recipes.filter((r) => r.auto_apply).length
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recipes</h2>
        <span className="muted small">{auto ? `${auto} auto-apply` : 'none auto-apply'}</span>
      </div>
      <p className="muted small">
        A recipe is a saved export setup. Auto-apply recipes render every AI-suggested clip in the
        "Auto Shorts" pipeline. Save new ones from a video's Edit panel.
      </p>
      <div className="stack">
        {recipes.map((r) => <RecipeCard key={r.id} r={r} />)}
        {!recipes.length && <p className="muted small">No recipes yet.</p>}
      </div>
    </section>
  )
}
