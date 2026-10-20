# Phase 1: beat-locked structure

Implements `docs/PLAYBOOK.md`: a peak on every clip, the music drop aligned to it, hook and payoff
captions on frame 1 and on the peak, a safe area every caption respects, and beat snapping in the
montage. One branch, eight commits, no schema migration (JSON sidecars gain optional fields).

## Summary

- **Beat grid per track** (`studio/core/beats.py`, `studio/jobs/beats.py`): ffmpeg decodes to mono
  22.05 kHz wav, librosa finds bpm and beats, a 4/4 phase guess gives downbeats, an RMS step finds the
  drop. Written to `.music/<name>.beats.json`; `drop_s_manual` overrides and survives re-analysis and
  version bumps. Queued on upload, by Library Rescan, and by `POST /api/music/beats/rescan`.
- **`peak_s` on clips** with the playbook default range (`core/beats.default_range`, mirrored in
  `web/src/lib/beats.ts`), "Peak at playhead" and a peak mark per clip in Clips.
- **Drop aligned to the peak** (`render.music_plan`, `_music_inputs`): input-side seek or `adelay`,
  `apad`, 80 ms fade-out; `_drop` in the file name; `music_seek_s`, `music_delay_ms`,
  `drop_at_output_s` in the job result and on the clip. Montage peaks map through the shot layout.
- **Hook / payoff** (`core/captions.py`): typed per clip, never filled from Gemini, burned even with
  captions off, sized by `fit_font_size` between a ceiling and a floor, regular captions suppressed
  while they show, `captions_warning` when a block needs three lines.
- **Safe area**: every preset clamps to 5 / 15 / 10 / 20 % margins; the player shades the bands and
  draws the centre-60 % subject zone; Review can show the bands over renders.
- **Montage snapping** (`web/src/lib/snap.ts`): beats placed in output time around the peak, ticks on
  the timeline, dragged cuts snap (Shift bypasses), "Snap all to beats", downbeat dots on shots.
- Proxy encoder profile (720p, lowest quality) for the style-clone copy sent to Gemini.

## Verification on the gaming PC

Render alignment (step 4):

1. `git checkout feat/phase1-beats`, then `run.bat`. librosa installs on first start; the first
   beats job is slow (numba warm-up).
2. Edit → Sound → Add track with a bed that has an obvious drop. Wait for "current" and a drop on the
   bar under the track player; if the detected drop is wrong, scrub the track player and press
   "Set drop at playhead" (the "manual" badge appears).
3. Clips → scrub the video to the moment, press "Peak at playhead". The row shows the peak and the
   amber mark; the range becomes peak−2 .. peak+3 snapped to beats.
4. Render that clip with the track still selected in Sound.
5. Jobs → the render result shows `music_drop_aligned: true` and `drop_at_output_s`; the file name
   contains `_music_drop`.
6. By ear: the build runs under the setup and the drop hits exactly on the moment, no click at the end.
7. By scrubbing: at `drop_at_output_s` the drop starts within a frame and the picture is the peak frame.
8. Clear the peak and render again: no `_drop` in the name, `music_drop_aligned: false`, reason
   "the clip has no peak", looping bed back.

Captions and overlay (steps 5 to 7):

9. Captions step → type a hook and a payoff (the grey Gemini text is only a placeholder). Press
   "Frame 1": the hook sits top-centre inside the safe area on the actual first frame. Press "Peak":
   the payoff sits centred. Render: both are burned at those times, regular captions vanish while
   they show, even with captions off in the recipe.
10. Safe area on the player: the shaded bands match the ASS margins (portrait 54 / 162 / 192 /
    384 px, landscape 96 / 288 / 108 / 216) — a bottom karaoke line never enters the bottom band.
11. Type a very long hook: the editor says "needs 3 lines at the smallest size", the preview shows the
    third line with a badge, the render result carries `captions_warning`.
12. Montage: load shots, select the track and a clip with a peak, press "Snap all to beats". Every cut
    lands on a tick; render the montage and check the cuts land on beats in the output. Move the peak
    outside every shot: the header warns and the render result says the bed looped.

## Known heuristics

- **Downbeats** are the 4/4 phase with the most onset energy (`downbeats_method: onset_phase_4_4`),
  a suggestion, not a guarantee. 3/4 or shuffled tracks will mislabel them.
- **Drop detection** looks for the first beat whose next 2 s are 1.5× louder (RMS) than the
  previous 8 s, best ratio inside that window; fallback is the biggest energy step on a downbeat
  (at least 1.2×). Tracks without a clear step report no drop.
- **Glyph width** for hook / payoff sizing is estimated at 0.55 em per character (Arial bold,
  mixed case); all-caps or wide fonts can wrap later than predicted. The preview uses the same
  estimate, so what the player shows is what the ASS gets.
- **Escape hatch**: "Set drop at playhead" in Sound writes `drop_s_manual`, which wins over the
  detected drop everywhere and is never cleared by analysis.

## Not covered by the tests

The suite (54 tests) mocks ffmpeg, librosa and Gemini. Only a real render confirms: libass placement
of the Hook / Payoff styles, the `adelay`/`apad`/`afade` chain on a real track, AMF/NVENC behaviour of
the proxy profile, and how librosa's beat tracker behaves on real game-trailer music.
