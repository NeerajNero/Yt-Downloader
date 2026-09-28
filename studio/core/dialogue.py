"""Dialogue lines: where someone is talking. Built from the transcript's word
timing (a pause longer than `gap` ends a line), or — with no transcript — from
the gaps between detected silences. Pure: dicts in, dict out."""

from __future__ import annotations


def from_transcript(transcript: dict, gap: float = 0.8, min_len: float = 0.6) -> dict:
    words = []
    for seg in transcript.get("segments", []):
        for w in seg.get("words") or []:
            try:
                words.append((float(w["s"]), float(w["e"]), str(w.get("w", "")).strip()))
            except (KeyError, TypeError, ValueError):
                continue
    words.sort()
    lines: list[dict] = []
    cur: list[tuple[float, float, str]] = []
    for w in words:
        if cur and w[0] - cur[-1][1] > gap:
            lines.append(_line(cur))
            cur = []
        cur.append(w)
    if cur:
        lines.append(_line(cur))
    lines = [l for l in lines if l["end"] - l["start"] >= min_len]
    return {"src": None, "source": "transcript", "gap": gap, "lines": lines,
            "duration": transcript.get("duration")}


def _line(ws: list[tuple[float, float, str]]) -> dict:
    return {"start": round(ws[0][0], 2), "end": round(max(ws[-1][1], ws[0][0] + 0.05), 2),
            "text": " ".join(w for _, _, w in ws if w), "words": len(ws)}


def from_silences(silences: list[tuple[float, float]], duration: float, min_len: float = 0.6) -> dict:
    """The complement of the silences: sound runs, no text."""
    lines = []
    cursor = 0.0
    for s, e in sorted(silences):
        if s - cursor >= min_len:
            lines.append({"start": round(cursor, 2), "end": round(s, 2), "text": "", "words": 0})
        cursor = max(cursor, e)
    if duration and duration - cursor >= min_len:
        lines.append({"start": round(cursor, 2), "end": round(duration, 2), "text": "", "words": 0})
    return {"src": None, "source": "silence", "lines": lines, "duration": duration}


def overlap(a0: float, a1: float, lines: list[dict]) -> float:
    """Seconds of [a0, a1] covered by dialogue lines."""
    total = 0.0
    for l in lines:
        s, e = float(l["start"]), float(l["end"])
        total += max(0.0, min(a1, e) - max(a0, s))
    return total
