# Shorts playbook

A short holds when frame 1 makes a promise and the payoff lands on the music drop within 3 to 6 s.

## Structure
- Peak frame: the single frame where the moment happens; stored on the clip as peak_s.
- Default range around the peak: start = peak_s - 2.0 s, end = peak_s + 3.0 s, each snapped to the nearest beat when a track with beats is selected. Total length 8 to 20 s.
- Frame 1 must have motion and the hook caption. No fade-in, no logo, no title card.
- Music: the track's drop (drop_s) is aligned to peak_s. The track is trimmed at the head, never looped before the drop. Build section plays under the setup.
- Every cut and effect sits on a beat. The biggest effect is on the drop. Punch/zoom on downbeats only. No effect during the pre-drop build.
- Speed ramp into the drop: 4 to 8 frames slow before drop_s, snap to full speed on it.
- Ending: hard cut on the last beat, or a loop where the last frame flows into frame 1. No end card.

## Captions
- hook: from 0 s for min(3.0 s, peak_s - 0.5 s), large, upper third. Two lines max.
- payoff: from peak_s for 1.8 s, centred.
- Thick stroke or shadow. No karaoke word fill on hook or payoff.
- Safe area for all captions: top 10 %, bottom 20 %, left 5 %, right 15 % of the frame are off limits.

## Framing
- Subject stays inside the centre 60 % of the frame.
- Watermark: small, bottom-left inside the safe area, on every frame, in every recipe by default.
