import { useMutation, useSubscription } from '@apollo/client'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AnalyzeStyleDocument, DeleteStyleDocument, InsertRecipeDocument, StylesDocument, type StylesSubscription,
} from '../gql/generated'
import { fileUrl } from '../lib/api'
import { duration, timeAgo } from '../lib/format'
import { summarize, type RecipeSettings } from '../lib/settings'

type Style = StylesSubscription['styles'][number]
interface Report {
  summary?: string; hook?: string; chips?: string[]
  captions?: { present: boolean; style: string; position: string; notes: string }
  framing?: { style: string; notes: string }
  cuts?: { pace: string; on_beat: boolean; notes: string }
  zooms?: { punch_ins: boolean; per_10s: number; slow_zoom: boolean; notes: string }
  color?: { grade: string; vivid: number; hdr_look: boolean; notes: string }
  audio?: { voice: boolean; music: boolean; ducking: boolean; sfx: boolean; notes: string }
  overlays?: { watermark: boolean; watermark_position: string; other_text: string }
  motion?: { speed_ramps: boolean; transitions: string; notes: string }
  resolve_steps?: { panel: string; step: string; detail: string }[]
}

function Notes({ md }: { md: string }) {
  // Tiny markdown: headings, bold, numbered lines. Enough for the generated notes.
  return (
    <div className="notes">
      {md.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i}>{line.slice(4)}</h4>
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>)
        return line.trim() ? <p key={i} className={/^\s/.test(line) ? 'muted small indent' : 'small'}>{parts}</p> : null
      })}
    </div>
  )
}

function StyleCard({ s }: { s: Style }) {
  const [insertRecipe] = useMutation(InsertRecipeDocument)
  const [del] = useMutation(DeleteStyleDocument)
  const [open, setOpen] = useState<'report' | 'resolve' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const r = (s.report ?? {}) as Report
  const recipe = (s.recipe ?? null) as RecipeSettings | null

  const save = async () => {
    const name = window.prompt('Recipe name:', `like: ${(s.title ?? 'short').slice(0, 40)}`)?.trim()
    if (!name || !recipe) return
    try {
      await insertRecipe({ variables: { name, description: `From ${s.url}`, settings: recipe, auto_apply: false } })
      setMsg(`Saved recipe "${name}" — pick it on any video's Export panel.`)
    } catch (e) { setMsg((e as Error).message) }
  }

  return (
    <article className="job-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {s.thumb_path && <img className="style-thumb" src={fileUrl(s.thumb_path)} alt="" />}
        <div className="stack grow" style={{ gap: 4 }}>
          <strong>{s.title ?? s.url}</strong>
          <span className="mono muted small">{[s.channel, s.duration ? duration(s.duration) : null, timeAgo(s.created_at)].filter(Boolean).join(' · ')}</span>
          {s.status !== 'ready' && (
            <span className={`pill ${s.status === 'failed' ? 'error' : 'running'}`}>
              {s.status}{s.job && s.status === 'analyzing' ? ` · ${s.job.progress_note ?? ''}` : ''}
            </span>
          )}
          {s.error && <span className="job-error small">{s.error}</span>}
        </div>
      </div>
      {s.status === 'ready' && (
        <>
          <div className="caps">{(r.chips ?? []).map((c) => <span key={c} className="chip ok">{c}</span>)}</div>
          {r.summary && <p className="small">{r.summary}</p>}
          {recipe && <div className="mono muted small">Recipe: {summarize(recipe)}</div>}
          <div className="job-actions">
            {recipe && <button className="btn small accent" onClick={() => void save()}>Save as recipe</button>}
            <button className="btn small" onClick={() => setOpen(open === 'report' ? null : 'report')}>Breakdown</button>
            <button className="btn small" onClick={() => setOpen(open === 'resolve' ? null : 'resolve')}>Resolve steps</button>
            {s.ref_path && <a className="btn small" href={fileUrl(s.ref_path)} target="_blank" rel="noreferrer">Watch</a>}
            <a className="btn small" href={s.url} target="_blank" rel="noreferrer">YouTube</a>
            <button className="btn small" onClick={() => window.confirm('Delete this style?') && void del({ variables: { id: s.id } })}>Delete</button>
          </div>
          {open === 'report' && (
            <div className="stack small" style={{ gap: 4 }}>
              {r.hook && <p><strong>Hook.</strong> {r.hook}</p>}
              {r.captions && <p><strong>Captions.</strong> {r.captions.present ? `${r.captions.style}, ${r.captions.position}. ${r.captions.notes}` : 'none'}</p>}
              {r.framing && <p><strong>Framing.</strong> {r.framing.style}. {r.framing.notes}</p>}
              {r.cuts && <p><strong>Cuts.</strong> {r.cuts.pace}{r.cuts.on_beat ? ', on the beat' : ''}. {r.cuts.notes}</p>}
              {r.zooms && <p><strong>Zooms.</strong> {r.zooms.punch_ins ? `punch-ins ~${r.zooms.per_10s}/10s` : 'no punch-ins'}{r.zooms.slow_zoom ? ', slow zoom' : ''}. {r.zooms.notes}</p>}
              {r.color && <p><strong>Colour.</strong> {r.color.grade}, vivid {r.color.vivid}{r.color.hdr_look ? ', HDR look' : ''}. {r.color.notes}</p>}
              {r.audio && <p><strong>Audio.</strong> {[r.audio.voice && 'voice', r.audio.music && 'music', r.audio.ducking && 'ducked', r.audio.sfx && 'sfx'].filter(Boolean).join(', ')}. {r.audio.notes}</p>}
              {r.overlays && <p><strong>Overlays.</strong> {r.overlays.watermark ? `watermark ${r.overlays.watermark_position}` : 'no watermark'}. {r.overlays.other_text}</p>}
              {r.motion && <p><strong>Motion.</strong> {r.motion.speed_ramps ? 'speed ramps' : 'no speed ramps'}; {r.motion.transitions}. {r.motion.notes}</p>}
            </div>
          )}
          {open === 'resolve' && s.resolve_notes && <Notes md={s.resolve_notes} />}
          {msg && <p className="muted small">{msg}</p>}
        </>
      )}
    </article>
  )
}

export default function Styles() {
  const { data, loading, error } = useSubscription(StylesDocument)
  const [analyze, { loading: starting }] = useMutation(AnalyzeStyleDocument)
  const [url, setUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const go = async () => {
    const u = url.trim()
    if (!u) return
    setErr(null)
    try {
      await analyze({ variables: { url: u } })
      setUrl('')
    } catch (e) { setErr((e as Error).message) }
  }

  if (error) return <p className="error">Can't reach the brain: {error.message}</p>
  return (
    <section className="panel stack">
      <div className="panel-head"><h2>Styles</h2><Link to="/recipes" className="muted small">Recipes</Link></div>
      <p className="muted small">
        Paste a Short you like. The brain downloads it, measures the cuts and loudness, has Gemini watch it and break
        the edit down, then maps what it can onto a recipe and writes DaVinci Resolve steps for the rest.
      </p>
      <div className="row">
        <input type="text" className="grow" value={url} placeholder="https://youtube.com/shorts/…" inputMode="url"
               onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void go()} aria-label="Short link" />
        <button className="btn accent" onClick={() => void go()} disabled={starting || !url.trim()}>Analyze</button>
      </div>
      {err && <p className="job-error">{err}</p>}
      {loading && !data && <p className="muted">Connecting…</p>}
      <div className="stack">
        {(data?.styles ?? []).map((s) => <StyleCard key={s.id} s={s} />)}
      </div>
    </section>
  )
}
