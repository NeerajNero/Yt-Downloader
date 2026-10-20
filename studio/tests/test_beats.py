"""Beat grid (studio/core/beats.py): pure helpers plus analyze_track with
decode and librosa mocked — no ffmpeg or librosa at test time."""

from __future__ import annotations

from pathlib import Path
from unittest import mock

import pytest

from studio.core import beats
from studio.core.errors import Cancelled
from studio.core.ffmpeg import Tools
from studio.schemas import validate_payload


def _ramp(n: int, step: float = 0.1) -> list[float]:
    return [round(i * step, 3) for i in range(n)]


def _features(duration=30.0, bpm=120.0, drop_at=None, flat=False, silent=False) -> dict:
    """Synthetic track: a beat every 0.5 s; onsets peak on every 4th beat
    starting at 0.5 s (so downbeat phase = 1); RMS steps up at `drop_at`."""
    beats_ = [round(0.5 * i, 3) for i in range(int(duration / 0.5))]
    t = _ramp(int(duration * 10))
    onset, rms = [], []
    for x in t:
        on_beat = abs(x / 0.5 - round(x / 0.5)) < 1e-6
        k = round(x / 0.5)
        v = 1.0 if flat else (3.0 if on_beat and k % 4 == 1 else 1.5 if on_beat else 0.2)
        onset.append(v)
        level = 0.0 if silent else (0.05 if drop_at is None or x < drop_at else 0.2)
        rms.append(level)
    return {"duration": duration, "sr": 22050, "bpm": bpm, "beats": beats_,
            "onset_t": t, "onset_v": onset, "rms_t": t, "rms_v": rms}


def test_downbeats_pick_the_strongest_phase():
    f = _features()
    db = beats.downbeats_from(f["beats"], f["onset_t"], f["onset_v"])
    assert db[:3] == [0.5, 2.5, 4.5]
    assert beats.downbeats_from([0.0, 0.5], f["onset_t"], f["onset_v"]) == []  # too few beats


def test_find_drop_energy_step_and_fallback():
    f = _features(drop_at=12.0)
    assert beats.find_drop(f["beats"], f["rms_t"], f["rms_v"]) == 12.0
    # no clear jump: fallback = the downbeat with the largest step, else None
    flat = _features()
    assert beats.find_drop(flat["beats"], flat["rms_t"], flat["rms_v"], [0.5, 2.5]) is None
    assert beats.find_drop([], flat["rms_t"], flat["rms_v"]) is None


def test_grid_from_features_full_and_empty_cases():
    g = beats.grid_from_features(_features(drop_at=12.0), "track.mp3")
    assert g["version"] == beats.BEATS_VERSION and g["name"] == "track.mp3"
    assert g["bpm"] == 120.0 and len(g["beats"]) == 60 and g["downbeats"][0] == 0.5
    assert g["drop_s"] == 12.0 and g["drop_s_manual"] is None
    assert g["duration_s"] == 30.0 and g["sr"] == 22050 and g["downbeats_method"] == "onset_phase_4_4"
    for f in (_features(duration=3.0), _features(silent=True), _features(flat=True), {**_features(), "bpm": 0.0}):
        e = beats.grid_from_features(f, "x.mp3")
        assert e["beats"] == [] and e["downbeats"] == [] and e["drop_s"] is None and e["bpm"] is None
        assert e["duration_s"] == f["duration"]


def test_effective_drop_and_is_current():
    assert beats.effective_drop(None) is None
    assert beats.effective_drop({"drop_s": 4.0, "drop_s_manual": None}) == 4.0
    assert beats.effective_drop({"drop_s": 4.0, "drop_s_manual": 9.5}) == 9.5
    assert beats.effective_drop({"drop_s": None, "drop_s_manual": None}) is None
    assert beats.is_current(beats.empty_grid()) and not beats.is_current({"version": 0}) and not beats.is_current(None)


def test_nearest_beat_and_default_range():
    grid = [round(0.5 * i, 3) for i in range(80)]
    assert beats.nearest_beat(10.2, grid) == 10.0 and beats.nearest_beat(10.3, grid) == 10.5
    assert beats.nearest_beat(7.0, []) == 7.0
    # peak-2 .. peak+3 is only 5 s: widened to 8, snapped to beats, inside the source
    start, end = beats.default_range(10.2, grid, duration=40.0)
    assert end - start == pytest.approx(8.0) and start % 0.5 == 0 and end % 0.5 == 0
    assert start <= 8.2 <= 10.2 <= 13.2 <= end
    # no grid, peak near the start: clamped at 0 and still 8 s long
    assert beats.default_range(1.0, None, duration=40.0) == (0.0, 8.0)
    # near the end: pulled back inside the source
    s, e = beats.default_range(39.0, None, duration=40.0)
    assert e == 40.0 and e - s == pytest.approx(8.0)
    # never longer than max_len
    s, e = beats.default_range(10.0, None, None, before=15, after=15)
    assert e - s == 20.0


def test_analyze_track_decodes_then_analyses_and_cancels(tmp_path: Path):
    tools = Tools("ffmpeg")
    track = tmp_path / "song.mp3"
    track.write_bytes(b"x")
    calls = []

    def fake_decode(src, out, tools_, sr=22050):
        calls.append(("decode", Path(src).name))
        Path(out).write_bytes(b"RIFF")
        return out

    with mock.patch.object(beats, "decode_wav", fake_decode), \
         mock.patch.object(Tools, "probe_duration", return_value=30.0):
        grid = beats.analyze_track(track, tools, lambda: False, load=lambda wav: _features(drop_at=8.0))
        assert grid["name"] == "song.mp3" and grid["drop_s"] == 8.0 and calls == [("decode", "song.mp3")]
        # under 4 s: no decode, empty grid, no exception
        with mock.patch.object(Tools, "probe_duration", return_value=2.5):
            short = beats.analyze_track(track, tools, lambda: False, load=lambda wav: _features())
        assert short["beats"] == [] and short["duration_s"] == 2.5 and len(calls) == 1
        # cancel flips between decode and analysis: librosa is never called
        loaded = []
        with pytest.raises(Cancelled):
            beats.analyze_track(track, tools, lambda: True, load=lambda wav: loaded.append(1) or _features())
        assert loaded == [] and len(calls) == 2


def test_beats_payload_is_a_plain_file_name():
    assert validate_payload("beats", {"name": " song.mp3 "}) == {"name": "song.mp3"}
    for bad in ("", "../x.mp3", "a/b.mp3", ".hidden.mp3"):
        with pytest.raises(ValueError):
            validate_payload("beats", {"name": bad})
