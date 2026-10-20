"""Per-shot source audio and the music mix: volume windows in output time,
atempo chains and auto-mutes with notes, duck presets (and the legacy
boolean), the all-muted / no-music case, recipe scope, the dialogue helper,
and the same rules riding on a preview."""

from __future__ import annotations

from pathlib import Path
from unittest import mock

import pytest

from studio.core import dialogue, render
from studio.core.ffmpeg import Tools
from studio.schemas import validate_payload, validate_recipe


def _graph(tmp_path, s: render.RenderSettings, music: Path | None = None, preview=False) -> str:
    src = tmp_path / "src.mkv"; src.write_bytes(b"x")
    seen = {}

    def fake_run(self, cmd, duration, report, should_cancel, note=None, stderr_sink=None):
        seen["cmd"] = cmd

    with mock.patch.object(Tools, "run_progress", fake_run), mock.patch.object(Tools, "probe_fps", return_value=30.0):
        render.run_export(src, tmp_path / "o.mp4", s, Tools("ffmpeg"), "libx264", lambda *_: None, lambda: False,
                          music_path=music, music_drop_s=None, preview=preview)
    cmd = seen["cmd"]
    seen["cmd_str"] = " ".join(cmd)
    return cmd[cmd.index("-filter_complex") + 1] + " || " + seen["cmd_str"]


def test_per_shot_volume_windows_in_output_time(tmp_path):
    s = render.RenderSettings(segments=[{"start": 0, "end": 4, "source_audio": "mute"}, {"start": 8, "end": 12, "source_gain_db": -6}],
                              transition={"type": "cut"}, style="crop")
    s.validate()
    layout, total, bounds = render.sequence_layout(s.segments, s.transition)
    assert render.volume_windows(layout, s.segments) == "volume=0:enable='between(t,0.000,4.000)',volume=-6.0dB:enable='between(t,4.000,8.000)'"
    g = _graph(tmp_path, s)
    assert "[v0][a0][v1][a1]concat=n=2:v=1:a=1[vseq][aseq0]" in g and "[aseq0]volume=0:enable='between(t,0.000,4.000)',volume=-6.0dB:enable='between(t,4.000,8.000)'[aseq]" in g
    # every shot kept at 0 dB: no windows at all, and the old labels
    plain = render.RenderSettings(segments=[{"start": 0, "end": 4}, {"start": 8, "end": 12}], transition={"type": "cut"}, style="crop")
    assert render.volume_windows(render.sequence_layout(plain.segments, plain.transition)[0], plain.segments) == ""
    assert "[vseq][aseq]" in _graph(tmp_path, plain) and "volume=" not in _graph(tmp_path, plain)
    # a one-shot montage goes through the same window
    one = render.RenderSettings(segments=[{"start": 0, "end": 4, "source_gain_db": 3}], style="crop")
    assert "[a0]volume=3.0dB:enable='between(t,0.000,4.000)'[aseq]" in _graph(tmp_path, one)


def test_atempo_chains_and_auto_mutes_with_notes(tmp_path):
    assert render._atempo_chain(1.5) == "atempo=1.5000"
    assert render._atempo_chain(0.3) == "atempo=0.5,atempo=0.6000"
    assert render._atempo_chain(3.0) == "atempo=2.0,atempo=1.5000"
    assert render.shot_audio({"speed": 1.5})["atempo"] == "atempo=1.5000"
    assert render.shot_audio({"speed": 1.0}) == {"mode": "keep", "gain_db": 0.0, "atempo": None, "note": None}
    # too slow, and reversed: muted automatically, with a note naming the shot
    a = render.shot_audio({"speed": 0.1}, 2)
    assert a["mode"] == "mute" and a["note"] == "shot 3: audio muted (speed 0.1x is outside 0.25–4x)"
    a = render.shot_audio({"speed": 1.0, "playback": "reverse"}, 0)
    assert a["mode"] == "mute" and a["note"] == "shot 1: audio muted (reversed)"
    a = render.shot_audio({"speed": 1.0, "reverse": True}, 0)
    assert a["mode"] == "mute" and "reversed" in a["note"]
    # a user mute carries no note; the gain is clamped
    assert render.shot_audio({"source_audio": "mute"}, 0)["note"] is None
    assert render.shot_audio({"source_gain_db": 40})["gain_db"] == 6.0
    s = render.RenderSettings(segments=[{"start": 3, "end": 5, "speed": 3}, {"start": 6, "end": 8, "playback": "reverse"}],
                              transition={"type": "cut"}, style="crop")
    assert render.audio_notes(s) == ["shot 2: audio muted (reversed)"]
    g = _graph(tmp_path, s)
    assert "volume=0:enable='between(t,0.667,2.667)'[aseq]" in g and "between(t,0.000,0.667)" not in g   # shot 2 muted; shot 1 keeps (2 atempos)
    assert "atempo=2.0,atempo=1.5000" in g
    assert render.audio_notes(render.RenderSettings(start=0, end=5)) == []
    assert render.audio_notes(render.RenderSettings(start=0, end=5, playback="reverse")) == ["the clip: audio muted (reversed)"]


def test_duck_presets_and_legacy_boolean(tmp_path):
    assert render.duck_mode(True) == "medium" and render.duck_mode(False) == "off" and render.duck_mode(None) == "off"
    assert render.duck_mode("heavy") == "heavy" and render.duck_mode("weird") == "off"
    assert render.duck_filter("light") == "sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400"
    assert render.duck_filter("medium") == "sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350"
    assert render.duck_filter("heavy") == "sidechaincompress=threshold=0.01:ratio=16:attack=10:release=300"
    assert validate_payload("render", {"start": 0, "end": 5, "duck": True})["duck"] == "medium"
    assert validate_payload("render", {"start": 0, "end": 5, "duck": False})["duck"] == "off"
    assert validate_payload("render", {"start": 0, "end": 5})["duck"] == "medium"
    assert validate_payload("render", {"start": 0, "end": 5, "duck": "heavy"})["duck"] == "heavy"
    with pytest.raises(ValueError):
        validate_payload("render", {"start": 0, "end": 5, "duck": "max"})
    bed = tmp_path / "bed.mp3"; bed.write_bytes(b"x")
    # the sidechain keys off the post-gain source, so a -6 dB clip ducks less and a muted clip not at all
    s = render.RenderSettings(start=0, end=5, music="bed.mp3", duck="heavy", source_gain_db=-6)
    g = _graph(tmp_path, s, music=bed)
    assert "[0:a]volume=-6.0dB[asrc0];[asrc0]asplit=2[asrc][asrcB]" in g and "[mus][asrcB]sidechaincompress=threshold=0.01:ratio=16" in g
    s = render.RenderSettings(start=0, end=5, music="bed.mp3", duck=True)   # legacy boolean still renders
    assert "sidechaincompress=threshold=0.02:ratio=8" in _graph(tmp_path, s, music=bed)
    s = render.RenderSettings(start=0, end=5, music="bed.mp3", duck="off")
    g = _graph(tmp_path, s, music=bed)
    assert "sidechaincompress" not in g and "[0:a][mus]amix" in g
    # a montage ducks with the preset too
    s = render.RenderSettings(segments=[{"start": 0, "end": 4}], music="bed.mp3", duck="light", style="crop")
    assert "[mus][aseqA]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400[duckmus]" in _graph(tmp_path, s, music=bed)


def test_all_muted_without_music_still_outputs_audio(tmp_path):
    s = render.RenderSettings(segments=[{"start": 0, "end": 4, "source_audio": "mute"}, {"start": 8, "end": 12, "source_audio": "mute"}],
                              transition={"type": "cut"}, style="crop")
    g = _graph(tmp_path, s)
    assert "volume=0:enable='between(t,0.000,4.000)',volume=0:enable='between(t,4.000,8.000)'[aseq]" in g
    assert "-map [a] -c:v" in g and "-c:a aac" in g           # silent AAC, not a failure
    s = render.RenderSettings(start=0, end=5, source_audio="mute")
    g = _graph(tmp_path, s)
    assert "[0:a]volume=0[avol]" in g and "[avol]anull[a]" in g and "-map [a]" in g


def test_recipe_keeps_music_settings_but_not_per_shot_audio():
    r = validate_recipe({"style": "crop", "duck": "heavy", "music_gain": 40, "source_audio": "mute", "source_gain_db": -3})
    assert r["duck"] == "heavy" and r["music_gain"] == 40
    assert "source_audio" not in r and "source_gain_db" not in r
    assert validate_recipe({"duck": False})["duck"] == "off"
    seg = validate_payload("render", {"segments": [{"start": 0, "end": 2, "source_audio": "mute", "source_gain_db": -12}]})["segments"][0]
    assert (seg["source_audio"], seg["source_gain_db"]) == ("mute", -12.0)
    with pytest.raises(ValueError):
        validate_payload("render", {"segments": [{"start": 0, "end": 2, "source_gain_db": 9}]})
    with pytest.raises(ValueError):
        validate_payload("render", {"start": 0, "end": 2, "source_audio": "half"})


def test_dialogue_helper_keeps_shots_with_speech():
    lines = {"source": "transcript", "lines": [{"start": 1.0, "end": 2.5, "text": "hi", "words": 1},
                                               {"start": 10.0, "end": 12.0, "text": "there", "words": 1}]}["lines"]
    shots = [{"start": 0, "end": 3}, {"start": 3, "end": 6}, {"start": 6, "end": 9}, {"start": 9, "end": 11}, {"start": 12, "end": 15}]
    assert dialogue.audio_for_shots(shots, lines) == ["keep", "mute", "mute", "keep", "mute"]
    assert dialogue.audio_for_shots(shots, []) == ["mute"] * 5 and dialogue.audio_for_shots([], lines) == []
    # a line that merely touches a shot's edge does not count
    assert dialogue.audio_for_shots([{"start": 2.5, "end": 4}], lines) == ["mute"]


def test_preview_carries_the_mix(tmp_path):
    s = render.RenderSettings(segments=[{"start": 0, "end": 4, "source_audio": "mute"}, {"start": 8, "end": 12}], transition={"type": "cut"}, style="crop")
    g = _graph(tmp_path, s, preview=True)
    assert "volume=0:enable='between(t,0.000,4.000)'[aseq]" in g and "scale=540:960" in g and "-crf 30" in g
