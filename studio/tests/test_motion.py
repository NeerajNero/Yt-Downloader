"""Per-shot slow motion and reverse: the retime chain, minterpolate on final
renders only, the reversed-shot cap, reverse-aware time mapping and the
peak / music alignment through slowed and reversed shots."""

from __future__ import annotations

from pathlib import Path
from unittest import mock

import pytest

from studio.core import render
from studio.core.ffmpeg import Tools
from studio.schemas import validate_payload


def _graph(tmp_path, s: render.RenderSettings, preview=False) -> str:
    src = tmp_path / "src.mkv"; src.write_bytes(b"x")
    seen = {}

    def fake_run(self, cmd, duration, report, should_cancel, note=None, stderr_sink=None):
        seen["cmd"] = cmd

    with mock.patch.object(Tools, "run_progress", fake_run), mock.patch.object(Tools, "probe_fps", return_value=30.0):
        render.run_export(src, tmp_path / "o.mp4", s, Tools("ffmpeg"), "libx264", lambda *_: None, lambda: False, preview=preview)
    cmd = seen["cmd"]
    return cmd[cmd.index("-filter_complex") + 1]


def test_reverse_sits_before_setpts_and_keeps_the_forward_length():
    seg = {"start": 2, "end": 5, "speed": 0.5, "reverse": True}
    assert render.shot_retime(seg, 30.0) == "reverse,setpts=(PTS-STARTPTS)/0.5000,fps=30.0000"
    assert render.shot_retime({"start": 2, "end": 5, "speed": 2}, 30.0) == "setpts=(PTS-STARTPTS)/2.0000,fps=30.0000"
    fwd = render.sequence_layout([{"start": 2, "end": 5, "speed": 0.5}], {"type": "cut"})
    rev = render.sequence_layout([seg], {"type": "cut"})
    assert fwd[1] == rev[1] == 6.0 and rev[0][0]["reverse"] is True


def test_smooth_uses_minterpolate_on_final_only(tmp_path):
    s = render.RenderSettings(segments=[{"start": 0, "end": 3, "speed": 0.5, "smooth": True}, {"start": 5, "end": 8, "speed": 2, "smooth": True},
                                        {"start": 10, "end": 13, "speed": 0.5}], transition={"type": "cut"}, style="crop")
    final = _graph(tmp_path, s)
    assert "[0:v]setpts=(PTS-STARTPTS)/0.5000,minterpolate=fps=30.0000:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,crop=" in final
    assert "[1:v]setpts=(PTS-STARTPTS)/2.0000,fps=30.0000" in final        # smooth ignored at >= 1x
    assert "[2:v]setpts=(PTS-STARTPTS)/0.5000,fps=30.0000" in final        # not smooth: frame duplication
    assert final.count("minterpolate") == 1
    draft = _graph(tmp_path, s, preview=True)
    assert "minterpolate" not in draft and "[0:v]setpts=(PTS-STARTPTS)/0.5000,fps=30.0000" in draft
    assert render.motion_notes(s) == ["smooth slow-mo applied on final render only"]
    assert render.motion_notes(render.RenderSettings(segments=[{"start": 0, "end": 3, "speed": 2, "smooth": True}], style="crop")) == []
    assert render.motion_notes(render.RenderSettings(start=0, end=3)) == []


def test_reverse_cap_names_the_shot_and_speed_range_widened():
    s = render.RenderSettings(segments=[{"start": 0, "end": 3}, {"start": 10, "end": 16.5, "reverse": True}], style="crop")
    with pytest.raises(ValueError, match=r"Shot 2: a reversed shot can be at most 6 s of source \(6\.5 s\)"):
        s.validate()
    with pytest.raises(ValueError, match="at most 6 s"):
        validate_payload("render", {"segments": [{"start": 0, "end": 7, "reverse": True}]})
    ok = validate_payload("render", {"segments": [{"start": 0, "end": 6, "reverse": True, "speed": 0.1, "smooth": True}]})["segments"][0]
    assert (ok["reverse"], ok["smooth"], ok["speed"]) == (True, True, 0.1)
    with pytest.raises(ValueError):
        validate_payload("render", {"segments": [{"start": 0, "end": 2, "speed": 0.05}]})
    render.RenderSettings(segments=[{"start": 0, "end": 2, "speed": 0.1}], style="crop").validate()
    with pytest.raises(ValueError, match="between 0.1 and 4"):
        render.RenderSettings(segments=[{"start": 0, "end": 2, "speed": 5}], style="crop").validate()


def test_time_mapping_inside_a_reversed_shot():
    layout, total, _ = render.sequence_layout([{"start": 0, "end": 4, "speed": 0.5, "reverse": True}, {"start": 8, "end": 12}], {"type": "cut"})
    assert [L["offset"] for L in layout] == [0.0, 8.0] and total == 12.0
    # inside the reversed shot time runs backwards: source 4.0 is output 0, source 0.0 is output 8
    assert render.source_to_output(4.0, layout) == 0.0 and render.source_to_output(0.0, layout) == 8.0
    assert render.source_to_output(1.0, layout) == 6.0
    # the peak in the shot after it lands after the full 8 s of slowed, reversed footage
    assert render.source_to_output(10.0, layout) == 10.0
    s = render.RenderSettings(segments=[{"start": 0, "end": 4, "speed": 0.5, "reverse": True}, {"start": 8, "end": 12}], transition={"type": "cut"},
                              style="crop", music="bed.mp3", peak_s=10)
    p = render.music_plan(s, 3.0)
    assert p["aligned"] and (p["seek_s"], p["delay_ms"], p["drop_at_output_s"]) == (0.0, 7000, 10.0)
    s.peak_s = 1.0   # a peak inside the reversed shot is placed where that frame actually plays
    assert render.music_plan(s, 3.0)["drop_at_output_s"] == 6.0
    # captions never come from a reversed shot
    tr = {"segments": [{"start": 0, "end": 3, "text": "a b", "words": [{"w": "a", "s": 1.0, "e": 1.4}, {"w": "b", "s": 9.0, "e": 9.4}]}]}
    out = render.remap_transcript(tr, layout)
    assert [w["w"] for seg in out["segments"] for w in seg["words"]] == ["b"] and out["segments"][0]["words"][0]["s"] == 9.0


def test_reversed_and_very_slow_shots_mute_their_audio(tmp_path):
    s = render.RenderSettings(segments=[{"start": 0, "end": 2, "speed": 0.1}, {"start": 3, "end": 5, "reverse": True}, {"start": 6, "end": 8, "speed": 0.5}],
                              transition={"type": "cut"}, style="crop")
    assert render.audio_notes(s) == ["shot 1: audio muted (speed 0.1x is outside 0.25–4x)", "shot 2: audio muted (reversed)"]
    g = _graph(tmp_path, s)
    assert "volume=0:enable='between(t,0.000,20.000)',volume=0:enable='between(t,20.000,22.000)'[aseq]" in g
    assert "[2:a]asetpts=PTS-STARTPTS,atempo=0.5000" in g and "[1:v]reverse,setpts=" in g
