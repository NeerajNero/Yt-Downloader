import { useState } from 'react'
import { Link } from 'react-router-dom'

/** Visual guide to the editing features: every section pairs a short
 *  explanation with a live CSS/SVG demo of what the setting does. */

const DEMO_TRANSITIONS: { value: string; label: string; note: string }[] = [
  { value: 'cut', label: 'Hard cut', note: 'Instant. Best for gameplay pace.' },
  { value: 'fade', label: 'Crossfade', note: 'The shots overlap and blend.' },
  { value: 'fadeblack', label: 'Dip to black', note: 'Fade out, then in. Feels like a chapter break.' },
  { value: 'fadewhite', label: 'Flash white', note: 'A flash between shots. Hype / impact.' },
  { value: 'slideleft', label: 'Slide left', note: 'The next shot pushes in from the right.' },
  { value: 'wipeleft', label: 'Wipe left', note: 'A moving edge reveals the next shot.' },
  { value: 'zoomin', label: 'Zoom through', note: 'Punch through the first shot into the next.' },
  { value: 'circleopen', label: 'Circle open', note: 'The next shot opens from the centre.' },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel stack help-section" id={id}>
      <div className="panel-head"><h2>{title}</h2><a href="#top" className="muted small">top ↑</a></div>
      {children}
    </section>
  )
}

/** Two "shots" with the chosen transition animating between them in a loop.
 *  The transition takes exactly `len` seconds of the loop. */
function TransitionDemo() {
  const [type, setType] = useState('fade')
  const [len, setLen] = useState(0.5)
  const [tick, setTick] = useState(0)
  const info = DEMO_TRANSITIONS.find((t) => t.value === type)!
  // The keyframes spend 30 % on shot 1, 40 % transitioning, 30 % on shot 2 → total = len / 0.4.
  const style = { '--len': `${(len / 0.4).toFixed(2)}s` } as React.CSSProperties
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap">
        <select value={type} onChange={(e) => { setType(e.target.value); setTick((t) => t + 1) }} aria-label="Transition">
          {DEMO_TRANSITIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="slider"><span className="muted small">length</span>
          <input type="range" min={10} max={150} step={5} value={Math.round(len * 100)} onChange={(e) => { setLen(Number(e.target.value) / 100); setTick((t) => t + 1) }} />
          <span className="mono small">{len.toFixed(2)}s</span></label>
        <button className="btn small" onClick={() => setTick((t) => t + 1)}>Replay</button>
      </div>
      <div key={`${type}-${tick}`} className={`help-stage help-t-${type}`} style={style}>
        <div className="help-shot a"><span>Shot 1</span></div>
        <div className="help-shot b"><span>Shot 2</span></div>
        <div className="help-veil" />
        <div className="help-bar"><div className="help-bar-fill" /></div>
      </div>
      <p className="muted small">{info.note} The amber bar is the output timeline; the transition is the overlap where both shots are on screen. Longer = softer, shorter = snappier. Transitions can't be longer than half of the shorter shot: the app clamps them.</p>
    </div>
  )
}

function CaptionDemo() {
  const words = ['this', 'clutch', 'was', 'insane']
  return (
    <div className="help-grid">
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-karaoke">{words.map((w, i) => <span key={w} style={{ animationDelay: `${i * 0.45}s` }}>{w}</span>)}</div></div>
        <span className="small"><strong>Karaoke</strong> — the spoken word fills amber as it's said.</span>
      </div>
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-pop">{words.map((w, i) => <span key={w} style={{ animationDelay: `${i * 0.45}s` }}>{w.toUpperCase()}</span>)}</div></div>
        <span className="small"><strong>Pop</strong> — bold uppercase words bounce in one by one.</span>
      </div>
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-typewriter">{words.join(' ')}</div></div>
        <span className="small"><strong>Typewriter</strong> — the line types itself out.</span>
      </div>
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-minimal">{words.join(' ')}</div></div>
        <span className="small"><strong>Minimal</strong> — small, quiet, no animation.</span>
      </div>
    </div>
  )
}

function MotionDemo() {
  return (
    <div className="help-grid">
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-motion help-punch"><div className="help-scene" /></div></div>
        <span className="small"><strong>Punch-in</strong> — a quick 1.15× zoom that snaps in and eases back. Mark them at impacts, reactions, punchlines.</span>
      </div>
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-motion help-shake"><div className="help-scene" /></div></div>
        <span className="small"><strong>Shake</strong> — the frame jolts and settles over the shake's length. Strength sets how far it moves (100 ≈ 6 % of the frame). Use it on hits and explosions, not on talking.</span>
      </div>
      <div className="help-cap">
        <div className="help-cap-frame"><div className="help-motion help-zoom"><div className="help-scene" /></div></div>
        <span className="small"><strong>Slow zoom in</strong> — a gentle Ken Burns push across the whole clip. Keeps static footage alive.</span>
      </div>
      <div className="help-cap">
        <div className="help-cap-frame help-speed">
          <div className="help-speed-row"><span className="mono small">0.5×</span><div className="help-speed-track"><div className="help-speed-dot" style={{ animationDuration: '4s' }} /></div></div>
          <div className="help-speed-row"><span className="mono small">1×</span><div className="help-speed-track"><div className="help-speed-dot" style={{ animationDuration: '2s' }} /></div></div>
          <div className="help-speed-row"><span className="mono small">2×</span><div className="help-speed-track"><div className="help-speed-dot" style={{ animationDuration: '1s' }} /></div></div>
        </div>
        <span className="small"><strong>Speed</strong> — per shot. 0.5× for a hero moment (slow-mo), 2–3× to rush setup. Audio is pitch-corrected; captions follow the new timing.</span>
      </div>
    </div>
  )
}

export default function Help() {
  return (
    <div className="stack" id="top">
      <section className="panel stack">
        <div className="panel-head"><h2>Help — how editing works</h2><Link to="/library" className="btn small">Library</Link></div>
        <p className="small">Everything the app can do to a video, shown rather than told. Jump to a part:</p>
        <div className="row wrap">
          {[['workflow', 'Workflow'], ['timeline', 'Timeline'], ['detect', 'Detection'], ['montage', 'Montage'], ['transitions', 'Transitions'], ['motion', 'Motion'],
            ['framing', 'Framing'], ['captions', 'Captions'], ['sound', 'Sound'], ['ai', 'AI & recipes'], ['review', 'Review']].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="btn small">{label}</a>
          ))}
        </div>
      </section>

      <Section id="workflow" title="The workflow">
        <div className="help-flow">
          {[['1', 'Prepare', 'transcript, scene cuts, dialogue lines, shot tags, bars, preview copy'], ['2', 'Clips', 'AI picks the moments, or you set ranges'],
            ['3', 'Edit', 'one range or a montage · format · look · captions · sound · brand → Render'], ['4', 'Review', 'approve, tweak, mark posted, copy the post kit']].map(([n, t, d], i) => (
            <div key={t} className="help-flow-step">
              <div className="help-flow-n">{n}</div>
              <strong>{t}</strong>
              <span className="muted small">{d}</span>
              {i < 3 && <span className="help-flow-arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
        <p className="small">Nothing runs while the app is closed. Each step is a job on the Jobs tab; heavy ones (ffmpeg, whisper) run one at a time so the PC stays usable.</p>
      </Section>

      <Section id="timeline" title="Reading the timeline">
        <svg viewBox="0 0 600 70" className="help-svg" role="img" aria-label="Timeline anatomy">
          <rect x="0" y="20" width="600" height="26" rx="6" fill="#2a323c" />
          {[60, 130, 210, 300, 350, 470, 540].map((x) => <rect key={x} x={x} y="20" width="1" height="26" fill="rgba(255,255,255,0.35)" />)}
          <rect x="130" y="20" width="80" height="4" fill="#f2a33c" /><rect x="350" y="20" width="120" height="4" fill="#f2a33c" />
          <rect x="70" y="42" width="50" height="4" fill="#4f9de6" /><rect x="220" y="42" width="70" height="4" fill="#4f9de6" /><rect x="360" y="42" width="100" height="4" fill="#4f9de6" />
          <rect x="300" y="20" width="170" height="26" fill="rgba(242,163,60,0.35)" /><rect x="300" y="20" width="2" height="26" fill="#f2a33c" /><rect x="468" y="20" width="2" height="26" fill="#f2a33c" />
          <rect x="385" y="20" width="2" height="26" fill="#fff" />
          <text x="60" y="14" className="help-svg-label" textAnchor="middle">scene cut</text>
          <text x="170" y="14" className="help-svg-label" textAnchor="middle">closeup</text>
          <text x="385" y="14" className="help-svg-label" textAnchor="middle">playhead</text>
          <text x="95" y="62" className="help-svg-label" textAnchor="middle">dialogue</text>
          <text x="385" y="62" className="help-svg-label" textAnchor="middle">selected range (drag the ends)</text>
        </svg>
        <ul className="small help-list">
          <li><strong>White ticks</strong> are scene cuts: where the picture changes.</li>
          <li><strong>Amber marks on top</strong> are closeups from the shot tags. Hover one for the subject.</li>
          <li><strong>Blue bars underneath</strong> are dialogue lines: where someone is talking.</li>
          <li><strong>The amber band</strong> is the range you're rendering. In Montage mode the shots show as green bars instead.</li>
        </ul>
      </Section>

      <Section id="detect" title="What Prepare detects">
        <div className="help-grid">
          <div className="help-card"><strong>Transcript</strong><span className="small">Whisper turns speech into words with timing. Feeds captions, dialogue lines, AI picks and the plan. Music-only footage gets a few hallucinated words: recipes with "captions only with speech" need at least 20.</span></div>
          <div className="help-card"><strong>Scene cuts</strong><span className="small">ffmpeg compares frames and marks where the picture changes a lot. Every other detection works in these intervals.</span></div>
          <div className="help-card"><strong>Dialogue lines</strong><span className="small">Words are grouped into lines; a pause longer than 0.8 s ends a line. No transcript? It uses the gaps between silences instead. Gives you "Shots from → Dialogue lines" in the montage builder.</span></div>
          <div className="help-card"><strong>Shot tags</strong><span className="small">Gemini looks at one frame per scene and labels it: closeup, medium, wide, gameplay, cutscene, menu. Dialogue overlap is added locally. The builder's "Tagged shots" row filters on these.</span></div>
          <div className="help-card"><strong>Black bars</strong><span className="small">Measures letterbox bars so renders can trim them (recipes with auto trim).</span></div>
          <div className="help-card"><strong>Preview copy</strong><span className="small">A browser-friendly MP4 for mkv / AV1 sources so the player works. Also fine for Resolve.</span></div>
        </div>
        <div className="row wrap"><span className="muted small">Tagged shots</span>{['Closeups (12)', 'With dialogue (8)', 'Gameplay (31)', 'Cutscenes (4)', 'Wide shots (6)', 'Menus (3)'].map((t) => <span key={t} className="btn small" aria-hidden="true">{t}</span>)}</div>
        <p className="muted small">Tap one to load only those scenes as montage shots. Tags come from a vision model, so check a few: it's a good filter, not a verdict.</p>
      </Section>

      <Section id="montage" title="One range vs a montage">
        <svg viewBox="0 0 600 120" className="help-svg" role="img" aria-label="Range versus montage">
          <text x="0" y="14" className="help-svg-label">One range: a continuous piece of the source</text>
          <rect x="0" y="20" width="600" height="14" rx="4" fill="#2a323c" /><rect x="180" y="20" width="160" height="14" rx="4" fill="rgba(242,163,60,0.6)" />
          <text x="0" y="62" className="help-svg-label">Montage: shots from anywhere, in any order, joined with transitions</text>
          <rect x="0" y="68" width="600" height="14" rx="4" fill="#2a323c" />
          <rect x="420" y="68" width="60" height="14" rx="4" fill="rgba(63,178,127,0.7)" /><rect x="60" y="68" width="90" height="14" rx="4" fill="rgba(63,178,127,0.7)" /><rect x="250" y="68" width="50" height="14" rx="4" fill="rgba(63,178,127,0.7)" />
          <text x="450" y="79" className="help-svg-tiny" textAnchor="middle">1 hook</text><text x="105" y="79" className="help-svg-tiny" textAnchor="middle">2 setup</text><text x="275" y="79" className="help-svg-tiny" textAnchor="middle">3 payoff</text>
          <rect x="0" y="98" width="70" height="14" rx="3" fill="rgba(63,178,127,0.9)" /><rect x="60" y="98" width="100" height="14" rx="3" fill="rgba(63,178,127,0.7)" /><rect x="150" y="98" width="55" height="14" rx="3" fill="rgba(63,178,127,0.9)" />
          <rect x="60" y="98" width="10" height="14" fill="rgba(242,163,60,0.9)" /><rect x="150" y="98" width="10" height="14" fill="rgba(242,163,60,0.9)" />
          <text x="215" y="109" className="help-svg-label">← the output: shots overlap by the transition length</text>
        </svg>
        <ul className="small help-list">
          <li><strong>Shots from</strong> — scene cuts, dialogue lines, the clip pack, the AI plan, suggested clips, or "Add current range". Tagged shots filter by closeup / dialogue / gameplay / cutscene.</li>
          <li><strong>Per shot</strong> — include on/off, speed, punch, shake, order, and the transition <em>into the next shot</em> with its own length. "Default" uses the montage transition below the list.</li>
          <li><strong>Output length</strong> is shown live: retimed shot lengths minus every overlap.</li>
          <li>Format, look, captions, sound and brand apply to the whole montage. Captions are re-timed to the new order automatically.</li>
        </ul>
      </Section>

      <Section id="transitions" title="Transitions and their length">
        <TransitionDemo />
        <svg viewBox="0 0 600 60" className="help-svg" role="img" aria-label="Per-shot transitions">
          {[[0, 'Shot 1'], [150, 'Shot 2'], [300, 'Shot 3'], [450, 'Shot 4']].map(([x, t]) => (
            <g key={t}><rect x={Number(x)} y="18" width="140" height="24" rx="4" fill="rgba(63,178,127,0.5)" /><text x={Number(x) + 70} y="34" className="help-svg-label" textAnchor="middle">{t}</text></g>
          ))}
          {[[145, 'default · crossfade 0.35 s'], [295, 'own · hard cut'], [445, 'own · flash white 0.2 s']].map(([x, t]) => (
            <g key={t}><rect x={Number(x) - 4} y="14" width="8" height="32" rx="2" fill="#f2a33c" /><text x={Number(x)} y="58" className="help-svg-tiny" textAnchor="middle">{t}</text></g>
          ))}
        </svg>
        <p className="small">Each boundary between two shots gets exactly one transition: the earlier shot's "→ next" setting if you set one, otherwise the montage default. Length is per boundary too, so a flash can be 0.2 s while crossfades stay at 0.35 s. "Reset own" puts every shot back on the default. The AI plan fills these in where it thinks they help.</p>
      </Section>

      <Section id="motion" title="Motion: speed, punch-ins, shakes">
        <MotionDemo />
        <p className="small">In a single range, punch-ins and shakes are markers you add at the playhead (Look group). In a montage, tick "punch" or "shake" on a shot and it fires at that shot's start. Both happen before captions, so text stays still.</p>
      </Section>

      <Section id="framing" title="Framing: crop, blur pad, trim">
        <svg viewBox="0 0 600 130" className="help-svg" role="img" aria-label="Framing options">
          <g><rect x="20" y="10" width="160" height="90" fill="#2a323c" rx="4" /><rect x="60" y="10" width="80" height="90" fill="#4f9de6" opacity="0.8" /><rect x="60" y="10" width="80" height="90" fill="none" stroke="#f2a33c" strokeWidth="2" /><text x="100" y="120" className="help-svg-label" textAnchor="middle">Fill (centre crop)</text></g>
          <g><rect x="220" y="10" width="160" height="90" fill="#2a323c" rx="4" /><rect x="260" y="10" width="80" height="90" fill="#4f9de6" opacity="0.25" /><rect x="260" y="33" width="80" height="45" fill="#4f9de6" opacity="0.9" /><rect x="260" y="10" width="80" height="90" fill="none" stroke="#f2a33c" strokeWidth="2" /><text x="300" y="120" className="help-svg-label" textAnchor="middle">Fit on blurred pad</text></g>
          <g><rect x="420" y="10" width="160" height="90" fill="#000" rx="4" /><rect x="420" y="22" width="160" height="66" fill="#4f9de6" opacity="0.8" /><rect x="420" y="10" width="160" height="12" fill="none" stroke="#e5534b" strokeDasharray="3 2" /><rect x="420" y="88" width="160" height="12" fill="none" stroke="#e5534b" strokeDasharray="3 2" /><text x="500" y="120" className="help-svg-label" textAnchor="middle">Trim bars (measured or by %)</text></g>
        </svg>
        <p className="small">Portrait 9:16 for Shorts, landscape 16:9 otherwise. Fill crops the middle of the picture to the frame; fit keeps the whole picture over a blurred copy of itself (and "crop sides" tightens it a little). Rotate turns the picture, and "rotate with video" turns the captions with it.</p>
      </Section>

      <Section id="captions" title="Captions">
        <CaptionDemo />
        <p className="small">Captions come from the transcript's word timing or from hand-typed lines in the caption editor. Position: bottom, middle or top. "Preview on player" shows them live before you render. Whisper can invent words on music-only footage: check the transcript, or use "captions only with speech" in a recipe.</p>
      </Section>

      <Section id="sound" title="Sound">
        <svg viewBox="0 0 600 90" className="help-svg" role="img" aria-label="Music ducking">
          <text x="0" y="12" className="help-svg-label">speech</text>
          {[[70, 90], [230, 140], [430, 100]].map(([x, w]) => <rect key={x} x={x} y="4" width={w} height="10" rx="3" fill="#4f9de6" />)}
          <text x="0" y="50" className="help-svg-label">music</text>
          <path d="M 60 40 L 70 40 C 80 40 80 60 90 60 L 150 60 C 160 60 160 40 170 40 L 230 40 C 240 40 240 60 250 60 L 360 60 C 370 60 370 40 380 40 L 430 40 C 440 40 440 60 450 60 L 520 60 C 530 60 530 40 540 40 L 600 40" fill="none" stroke="#f2a33c" strokeWidth="3" />
          <text x="60" y="82" className="help-svg-tiny">the bed dips under speech (ducking) and comes back in the gaps · loudness normalised to -14 LUFS</text>
        </svg>
        <p className="small">Music loops under the original audio at the volume you set. Sound effects are one-shots placed at the playhead. Loudness normalisation lands the whole clip where the platforms expect it, so quiet recordings don't get buried.</p>
      </Section>

      <Section id="ai" title="AI, recipes and styles">
        <div className="help-grid">
          <div className="help-card"><strong>Pick the best moments</strong><span className="small">Gemini reads the transcript, scene cuts and sampled frames and proposes clip-worthy ranges with a title and hook. They appear as proposed clips.</span></div>
          <div className="help-card"><strong>Plan a full edit</strong><span className="small">Lays out a whole Short: hook first, shot order, speeds, punch-ins, shakes, per-shot transitions, captions and grade. Load it in Montage and change what you like.</span></div>
          <div className="help-card"><strong>Styles</strong><span className="small">Paste a Short you admire; the app measures its cuts, zooms, captions and colour and can plan "in that style".</span></div>
          <div className="help-card"><strong>Recipes</strong><span className="small">A saved look (every Edit setting). Auto-apply recipes render every AI pick automatically in Auto Shorts.</span></div>
        </div>
        <p className="small">Everything AI does is a proposal; nothing is posted or deleted by it. The Gemini key and model chain live in .env (More → AI models shows which ones answer).</p>
      </Section>

      <Section id="review" title="Review and hand-off">
        <p className="small">Rendered clips land in Review with the post kit (title, description, hashtags). Approve, reject, or Tweak: that reopens the clip's exact range and settings in Edit, and Render replaces the file. "Posted" keeps the record. For real editing, Tools → FCPXML gives Resolve a timeline of the clips.</p>
        <p className="muted small">Removing a video hides it from rescans; files stay on disk until you delete the folder.</p>
      </Section>
    </div>
  )
}
