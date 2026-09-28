"""Pure-function tests for studio.core: caption writers, filter builders,
encoder table, payload schemas, and the Gemini adapters with the API mocked."""

import json
from pathlib import Path
from unittest import mock

import pytest

from studio.schemas import validate_payload, validate_recipe
from studio.core import captions, encoders, gemini, render
from studio.core.ffmpeg import Tools

TRANSCRIPT = {
    "language": "en", "duration": 10.0, "model": "small",
    "segments": [{"start": 1.0, "end": 3.0, "text": "hello there world",
                  "words": [{"w": "hello", "s": 1.0, "e": 1.4}, {"w": "there", "s": 1.5, "e": 1.9},
                            {"w": "world", "s": 2.2, "e": 3.0}]},
                 {"start": 6.0, "end": 8.0, "text": "second line",
                  "words": [{"w": "second", "s": 6.0, "e": 6.5}, {"w": "line", "s": 6.6, "e": 8.0}]}],
}


def test_captions_karaoke_shifts_to_clip_start(tmp_path):
    out = tmp_path / "c.ass"
    n = captions.write_captions_ass(TRANSCRIPT, 0.5, 5.0, out)
    text = out.read_text()
    assert n == 1  # second line is outside the clip
    assert "PlayResX: 1080" in text and "PlayResY: 1920" in text
    assert "Dialogue: 0,0:00:00.50,0:00:02.50,Cap" in text
    assert "{\\k39}hello {\\k39}there {\\k79}world" in text  # int() truncation, as v1


def test_captions_pop_uppercase_and_two_layers(tmp_path):
    out = tmp_path / "c.ass"
    n = captions.write_captions_ass(TRANSCRIPT, 0, 10, out, style="pop", orientation="landscape")
    text = out.read_text()
    assert n == 4  # 2 lines x (glow + text)
    assert "HELLO THERE WORLD" in text and "PlayResX: 1920" in text
    assert text.count("Dialogue: 1,") == 2


def test_manual_captions(tmp_path):
    out = tmp_path / "m.ass"
    manual = {"speed": 2.0, "items": [{"text": "first youtube video", "start": 1.0, "duration": 4.0},
                                      {"text": "outside", "start": 30, "duration": 2}]}
    n = captions.write_manual_captions_ass(manual, 0, 10, out, style="minimal", position="top")
    text = out.read_text()
    assert n == 1 and "first youtube video" in text and ",8,60,60,220,1" in text


def test_export_filter_blur_and_crop():
    blur = render.export_filter("blur", 60, trim_x=2, fg_crop=10, width=1080, height=1920, look="hdr", grade="warm")
    assert blur.startswith("[0:v]crop=") and "split=2[bgin][fgin]" in blur
    assert "gblur=sigma=24.0" in blur and "vibrance=intensity=0.6" in blur
    assert "unsharp=7:7:" in blur and "colorbalance=rs=0.07" in blur
    crop = render.export_filter("crop", 0, width=1920, height=1080, rotate="right")
    assert crop.startswith("transpose=1,crop=min(iw\\,ih*1.77778)")
    assert "scale=1920:1080" in crop


def test_crop_window_position_and_zoom():
    """The Frame step's draggable box: crop window placed by crop_x/crop_y, divided by crop_zoom."""
    moved = render.export_filter("crop", 0, width=1080, height=1920, crop_x=0.2, crop_y=0.5)
    assert moved.startswith("crop=w=min(iw\\,ih*0.56250):h=min(ih\\,iw/0.56250):x=(iw-out_w)*0.200:y=(ih-out_h)*0.500,scale=1080:1920")
    zoomed = render.export_filter("crop", 0, width=1080, height=1920, crop_x=1.0, crop_y=0.0, crop_zoom=1.5)
    assert "crop=w=(min(iw\\,ih*0.56250))/1.5000:h=(min(ih\\,iw/0.56250))/1.5000:x=(iw-out_w)*1.000:y=(ih-out_h)*0.000" in zoomed
    pad = render.export_filter("blur", 0, fg_crop=10, width=1080, height=1920, crop_x=0.3, crop_y=0.7, crop_zoom=2)
    assert "[fgin]crop=w=(iw)/2.0000:h=(ih)/2.0000:x=(iw-out_w)*0.300:y=(ih-out_h)*0.700,crop=trunc(iw*0.8000/2)*2:ih,scale=" in pad
    assert render.export_filter("blur", 0, width=1080, height=1920, crop_x=0.1) == render.export_filter("blur", 0, width=1080, height=1920)  # no zoom on the pad = whole picture, position irrelevant
    s = render.RenderSettings(start=0, end=3, style="crop", crop_x=0.25, crop_zoom=1.5)
    s.validate()
    assert render.output_name("X", s, False) == "X_9x16_0s-3s_crop_win25-50x150.mp4"
    with pytest.raises(ValueError, match="zoom"):
        render.RenderSettings(start=0, end=3, crop_zoom=5).validate()
    pl = validate_payload("render", {"start": 0, "end": 3, "crop_x": 0.1, "crop_zoom": 2})
    assert pl["crop_x"] == 0.1 and pl["crop_y"] == 0.5 and pl["crop_zoom"] == 2.0
    rec = validate_recipe({"style": "crop", "crop_zoom": 1.2})
    assert rec["crop_zoom"] == 1.2


def test_output_name_matches_v1_pattern():
    s = render.RenderSettings(start=157, end=183, style="blur", vivid_amount=60, fg_crop=20,
                              captions=True, caption_style="typewriter")
    assert render.output_name("Batman", s, False) == "Batman_9x16_157s-183s_blur_vivid60_z20_cap-type.mp4"


def test_render_settings_validation():
    with pytest.raises(ValueError):
        render.RenderSettings(start=5, end=2).validate()
    with pytest.raises(ValueError):
        render.RenderSettings(start=0, end=2, grade="nope").validate()
    render.RenderSettings(start=0, end=2, rotate="left", resolution="4k").validate()


def test_encoders_table():
    assert encoders.video_args("libx264", "final")[:4] == ["-c:v", "libx264", "-crf", "18"]
    assert "h264_amf" in encoders.video_args("h264_amf", "fast")
    assert encoders.video_args("h264_videotoolbox", "edit")[-2:] == ["-pix_fmt", "yuv420p"]
    with pytest.raises(ValueError):
        encoders.video_args("libx265", "final")


def test_payload_schemas():
    p = validate_payload("render", {"start": 1, "end": 5, "caption_style": "pop"})
    assert p["style"] == "blur" and p["caption_style"] == "pop"
    with pytest.raises(ValueError):
        validate_payload("render", {"start": 1, "end": 5, "grade": "vhs"})
    with pytest.raises(ValueError):
        validate_payload("clippack", {"max_len": 9})
    with pytest.raises(ValueError, match="after start"):
        validate_payload("render", {"start": 5, "end": 2})
    with pytest.raises(ValueError):
        validate_payload("teleport", {})
    assert validate_payload("download", {"url": "https://x"})["quality"] == "best"


def test_suggest_clips_with_mocked_gemini(tmp_path):
    fake = {"clips": [{"start": 1, "end": 12, "title": "T", "hook": "H", "reason": "R"},
                      {"start": 8, "end": 9, "title": "too short", "hook": "", "reason": ""},
                      {"start": 5, "end": 500, "title": "clamped", "hook": "", "reason": ""}]}
    tools = Tools("ffmpeg")
    with mock.patch.object(gemini, "generate", return_value=fake) as gen, \
         mock.patch.object(gemini, "_extract_keyframes", return_value=[(2.0, "AAAA")]), \
         mock.patch.dict("os.environ", {"GEMINI_API_KEY": "k"}):
        out = gemini.suggest_clips(Path("x.mkv"), "Title", 20.0, TRANSCRIPT, {"scenes": [4.0], "duration": 20.0},
                                   tools, lambda: False, count=2)
    prompt = gen.call_args.args[0][0]["text"]
    assert "Pick the 2 best segments" in prompt and "[1-3s] hello there world" in prompt
    assert [c["end"] for c in out["clips"]] == [12.0, 20.0]


def test_post_kit_with_mocked_gemini():
    with mock.patch.object(gemini, "generate", return_value={"title": "T", "description": "D",
                                                              "hashtags": ["#a", "b", " "]}):
        out = gemini.post_kit("Title", TRANSCRIPT)
    assert out["hashtags"] == ["a", "b"] and out["title"] == "T"


def test_transcribe_has_speech_threshold():
    from studio.core.transcribe import has_speech, word_count
    assert word_count(TRANSCRIPT) == 5 and not has_speech(TRANSCRIPT) and has_speech(TRANSCRIPT, min_words=5)


def test_punch_filter_and_watermark_chain():
    f = render._punch_filter(1080, 1920, 30, 8.0, [{"at": 2, "duration": 0.5, "zoom": 1.2}], base_target=None)
    assert f.startswith("zoompan=z='1+(0.2000*between(in_time,2.000,2.500)")
    frag, label = render._watermark_chain(1080, 1920, {"position": "top_left", "scale": 0.1, "opacity": 0.5}, "vbase", 3)
    assert label == "vwm" and "[3:v]format=rgba,scale=108:-1,colorchannelmixer=aa=0.500[wm]" in frag
    assert "overlay=32:32" in frag


def test_output_name_recipe_extras():
    s = render.RenderSettings(start=0, end=5, watermark={"file": "l.png"}, sfx=[{"file": "a.mp3"}],
                              zoom_markers=[{"at": 1}, {"at": 2}])
    assert render.output_name("X", s, True).endswith("_music_wm_sfx_punch2.mp4")


def test_recipe_validation():
    from studio.schemas import validate_recipe
    r = validate_recipe({"style": "crop", "auto_trim": True, "watermark": {"file": "l.png", "scale": 0.2}})
    assert r["auto_trim"] is True and r["watermark"]["position"] == "top_right" and "start" not in r
    with pytest.raises(ValueError):
        validate_recipe({"zoom_markers": [{"at": -1}]})


def test_sequence_layout_and_graph():
    s = render.RenderSettings(segments=[{"start": 1, "end": 4}, {"start": 8, "end": 12, "speed": 2},
                                        {"start": 14, "end": 18, "speed": 0.5, "zoom_markers": [{"at": 1}]}],
                              transition={"type": "fade", "duration": 0.4}, style="crop")
    s.validate()
    layout, total, bounds = render.sequence_layout(s.segments, s.transition)
    assert [round(L["len"], 2) for L in layout] == [3.0, 2.0, 8.0]
    assert [round(L["offset"], 2) for L in layout] == [0.0, 2.6, 4.2] and round(total, 2) == 12.2
    assert [b["d"] for b in bounds] == [0.4, 0.4] and bounds[0]["kind"] == "fade"
    inputs, graph, v, a = render.sequence_graph(s, layout, bounds, 30.0, 1080, 1920, "none")
    assert inputs.count("{SRC}") == 3 and inputs[:4] == ["-ss", "1.000", "-to", "4.000"]
    assert "[1:v]setpts=(PTS-STARTPTS)/2.0000,fps=30.0000,crop=" in graph
    assert "[1:a]asetpts=PTS-STARTPTS,atempo=2.0000" in graph and "atempo=0.5000" in graph
    assert "zoompan=z='1+(0.1500*between(in_time,1.000,1.500)" in graph
    assert "xfade=transition=fade:duration=0.400:offset=2.600[vx1]" in graph
    assert "[vx1][v2]xfade=transition=fade:duration=0.400:offset=4.200[vseq]" in graph
    assert "acrossfade=d=0.400" in graph and (v, a) == ("vseq", "aseq")


def test_sequence_cut_uses_concat_and_short_shots_clamp_transition():
    s = render.RenderSettings(segments=[{"start": 0, "end": 1}, {"start": 5, "end": 9}], transition={"type": "cut"})
    layout, total, bounds = render.sequence_layout(s.segments, s.transition)
    assert bounds == [{"type": "cut", "kind": None, "d": 0.0}] and total == 5.0
    _, graph, _, _ = render.sequence_graph(s, layout, bounds, 30.0, 1080, 1920, "none")
    assert "[v0][a0][v1][a1]concat=n=2:v=1:a=1[vseq][aseq]" in graph
    _, _, b2 = render.sequence_layout(s.segments, {"type": "fade", "duration": 2.0})
    assert b2[0]["d"] == 0.5  # half of the 1 s shot


def test_sequence_per_shot_transitions_and_shake():
    """Each shot can carry the transition INTO the next shot (+ its length);
    unset shots use the montage default. Cuts and xfades mix in one chain."""
    segs = [{"start": 0, "end": 3},                                   # → default fade 0.4
            {"start": 5, "end": 8, "transition": {"type": "cut"}},    # → hard cut
            {"start": 10, "end": 12, "transition": {"type": "wipeleft", "duration": 1.5},  # clamped to 1.0 (half of 2 s)
             "shake_markers": [{"at": 0.2, "duration": 0.4, "intensity": 50}]},
            {"start": 14, "end": 18}]
    s = render.RenderSettings(segments=segs, transition={"type": "fade", "duration": 0.4}, style="crop",
                              shake_markers=[{"at": 1, "duration": 0.3, "intensity": 100}])
    s.validate()
    layout, total, bounds = render.sequence_layout(s.segments, s.transition)
    assert [(b["type"], b["d"]) for b in bounds] == [("fade", 0.4), ("cut", 0.0), ("wipeleft", 1.0)]
    assert [round(L["offset"], 2) for L in layout] == [0.0, 2.6, 5.6, 6.6] and round(total, 2) == 10.6
    _, graph, _, _ = render.sequence_graph(s, layout, bounds, 30.0, 1080, 1920, "none")
    assert "[v0][v1]xfade=transition=fade:duration=0.400:offset=2.600[vx1]" in graph
    assert "[vx1][ax1][v2][a2]concat=n=2:v=1:a=1[vx2][ax2]" in graph
    assert "[vx2][v3]xfade=transition=wipeleft:duration=1.000:offset=6.600[vseq]" in graph
    assert "setsar=1,settb=AVTB[v2]" in graph and "crop=w=1080:h=1920:x='" in graph and "between(t,0.200,0.600)" in graph
    assert render.output_name("X", s, False) == "X_9x16_seq4_0s-18s_mix_crop_shake1.mp4"
    # shake filter: amplitude scales with the strongest marker, weaker ones are relative to it
    f = render._shake_filter(1080, 1920, 30.0, [{"at": 0, "duration": 0.5, "intensity": 100}, {"at": 2, "duration": 0.5, "intensity": 25}])
    assert f.startswith("scale=1208:2152,crop=w=1080:h=1920:x='64+64*(") and "*0.250*(0.6*sin" in f and f.endswith(",setsar=1")
    with pytest.raises(ValueError, match="Segment 1: unknown transition"):
        render.RenderSettings(segments=[{"start": 0, "end": 2, "transition": {"type": "morph"}}, {"start": 3, "end": 5}]).validate()
    with pytest.raises(ValueError, match="transition length"):
        render.RenderSettings(segments=[{"start": 0, "end": 2, "transition": {"type": "fade", "duration": 5}}, {"start": 3, "end": 5}]).validate()
    p = validate_payload("render", {"segments": [{"start": 0, "end": 3, "transition": {"type": "fadewhite"}, "shake_markers": [{"at": 0}]}, {"start": 4, "end": 6}],
                                    "shake_markers": [{"at": 1, "intensity": 70}]})
    assert p["segments"][0]["transition"] == {"type": "fadewhite", "duration": 0.35} and p["segments"][1]["transition"] is None
    assert p["segments"][0]["shake_markers"][0] == {"at": 0.0, "duration": 0.4, "intensity": 50} and p["shake_markers"][0]["intensity"] == 70
    with pytest.raises(ValueError):
        validate_payload("render", {"start": 0, "end": 3, "shake_markers": [{"at": 0, "intensity": 0}]})


def test_playback_reverse_and_bounce():
    """bounce = forward then a rewind leg at reverse_speed; reverse = rewind only."""
    assert render.playback_len(4, 1, "forward", 2) == 4 and render.playback_len(4, 1, "bounce", 2) == 6 and render.playback_len(4, 2, "reverse", 2) == 1
    segs = [{"start": 0, "end": 4, "playback": "bounce", "reverse_speed": 2}, {"start": 10, "end": 12, "playback": "reverse"}, {"start": 14, "end": 16}]
    s = render.RenderSettings(segments=segs, transition={"type": "cut"}, style="crop")
    s.validate()
    layout, total, bounds = render.sequence_layout(s.segments, s.transition)
    assert [L["len"] for L in layout] == [6.0, 2.0, 2.0] and total == 10.0
    _, graph, _, _ = render.sequence_graph(s, layout, bounds, 30.0, 1080, 1920, "none")
    assert "[p0f];[p0f]split[p0a][p0b];[p0b]reverse,setpts=(PTS-STARTPTS)/2.0000,fps=30.0000[p0r];[p0a][p0r]concat=n=2:v=1:a=0,format=yuv420p" in graph
    assert "[q0]asplit[q0a][q0b];[q0b]areverse,atempo=2.0000[q0r];[q0a][q0r]concat=n=2:v=0:a=1[r0]" in graph
    assert ",reverse,setpts=(PTS-STARTPTS)/1.0000,fps=30.0000,format=yuv420p" in graph and "[1:a]asetpts=PTS-STARTPTS[q1];[q1]areverse[r1]" in graph
    assert render.output_name("X", s, False) == "X_9x16_seq3_0s-16s_cut_crop_bounce.mp4"
    with pytest.raises(ValueError, match="10 seconds or less"):
        render.RenderSettings(segments=[{"start": 0, "end": 12, "playback": "bounce"}]).validate()
    with pytest.raises(ValueError, match="Captions can't"):
        render.RenderSettings(start=0, end=3, playback="reverse", captions=True).validate()
    one = render.RenderSettings(start=0, end=3, playback="bounce", reverse_speed=3)
    one.validate()
    assert render.output_name("X", one, False) == "X_9x16_0s-3s_blur_bounce.mp4"
    p = validate_payload("render", {"start": 0, "end": 3, "playback": "bounce"})
    assert p["playback"] == "bounce" and p["reverse_speed"] == 1.0
    with pytest.raises(ValueError):
        validate_payload("render", {"segments": [{"start": 0, "end": 3, "playback": "loop"}]})


def test_dialogue_lines_and_tag_shots(tmp_path):
    from studio.core import dialogue
    tr = {"duration": 30.0, "segments": [
        {"start": 1, "end": 3, "text": "", "words": [{"w": "hi", "s": 1.0, "e": 1.3}, {"w": "there", "s": 1.5, "e": 1.9}]},
        {"start": 4, "end": 6, "text": "", "words": [{"w": "go", "s": 4.0, "e": 4.2}, {"w": "now", "s": 4.3, "e": 4.9}]},
        {"start": 10, "end": 11, "text": "", "words": [{"w": "x", "s": 10.0, "e": 10.1}]}]}
    d = dialogue.from_transcript(tr, gap=0.8, min_len=0.6)
    assert [(l["start"], l["end"], l["text"]) for l in d["lines"]] == [(1.0, 1.9, "hi there"), (4.0, 4.9, "go now")]
    assert dialogue.from_transcript(tr, gap=3.0)["lines"][0]["text"] == "hi there go now"
    sil = dialogue.from_silences([(2.0, 4.0), (9.0, 10.0)], 12.0)
    assert [(l["start"], l["end"]) for l in sil["lines"]] == [(0.0, 2.0), (4.0, 9.0), (10.0, 12.0)] and sil["source"] == "silence"
    assert dialogue.overlap(0, 5, d["lines"]) == pytest.approx(1.8)
    # scene intervals: slivers dropped, shortest neighbours merged down to the cap
    assert gemini.scene_intervals([1, 1.2, 5, 9], 12, cap=3) == [(0.0, 5.0), (5.0, 9.0), (9.0, 12.0)]
    assert gemini.scene_intervals([], 8) == [(0.0, 8.0)]
    # tag_shots: one Gemini call per batch of frames; labels mapped back by index, dialogue overlap measured locally
    fake = {"shots": [{"index": 0, "kind": "closeup", "closeup": True, "subject": "hero face", "energy": 2},
                      {"index": 1, "kind": "GAMEPLAY", "closeup": False, "subject": "fight", "energy": 5},
                      {"index": 7, "kind": "menu", "closeup": False, "subject": "stray", "energy": 1}]}
    with mock.patch.object(gemini, "generate", return_value=fake) as gen, \
         mock.patch.object(gemini, "_extract_keyframes", side_effect=lambda src, times, d, t: [(x, "AAAA") for x in times]), \
         mock.patch.dict("os.environ", {"GEMINI_API_KEY": "k"}):
        out = gemini.tag_shots(Path("x.mkv"), "T", 12.0, {"scenes": [4.0, 8.0]}, d["lines"], Tools("ffmpeg"), lambda: False)
    assert gen.call_count == 1
    assert [(s["kind"], s["closeup"], s["dialogue"]) for s in out["shots"]] == [("closeup", True, True), ("gameplay", False, True), ("other", False, False)]
    assert out["shots"][0]["speech"] == pytest.approx(0.9) and out["shots"][1]["energy"] == 5
    assert validate_payload("dialogue", {}) == {"gap": 0.8, "min_len": 0.6} and validate_payload("tags", None) == {}


def test_sequence_validation_and_naming():
    with pytest.raises(ValueError, match="Segment 2"):
        render.RenderSettings(segments=[{"start": 0, "end": 2}, {"start": 5, "end": 4}]).validate()
    with pytest.raises(ValueError, match="transition"):
        render.RenderSettings(segments=[{"start": 0, "end": 2}], transition={"type": "morph"}).validate()
    with pytest.raises(ValueError):
        render.RenderSettings().validate()
    s = render.RenderSettings(segments=[{"start": 3, "end": 5}, {"start": 9, "end": 12}], transition={"type": "wipeleft"})
    assert render.output_name("X", s, False) == "X_9x16_seq2_3s-12s_wipeleft_blur.mp4"
    assert s.range_start == 3 and s.range_end == 12
    p = validate_payload("render", {"segments": [{"start": 0, "end": 3}], "transition": {"type": "zoomin"}})
    assert p["start"] is None and p["segments"][0]["speed"] == 1.0
    with pytest.raises(ValueError, match="start and end"):
        validate_payload("render", {"style": "crop"})


def test_remap_transcript_and_manual_captions():
    layout, _, _ = render.sequence_layout([{"start": 0, "end": 5}, {"start": 10, "end": 14, "speed": 2}], {"type": "cut"})
    tr = {"segments": [{"start": 0, "end": 20, "text": "", "words": [
        {"w": "a", "s": 1.0, "e": 1.5}, {"w": "gap", "s": 7.0, "e": 7.5}, {"w": "b", "s": 12.0, "e": 13.0}]}]}
    out = render.remap_transcript(tr, layout)
    assert [w["w"] for w in out["segments"][0]["words"]] == ["a", "b"]
    assert out["segments"][0]["words"][1] == {"w": "b", "s": 6.0, "e": 6.5}
    man = render.remap_manual({"speed": 2, "items": [{"text": "x", "start": 11, "duration": 2}, {"text": "y", "start": 8, "duration": 1}]}, layout)
    assert man["items"] == [{"text": "x", "start": 5.5, "duration": 1.0}]


def test_gemini_retries_then_falls_through_models(monkeypatch):
    import io
    import urllib.error
    calls: list[str] = []
    notes: list[str] = []

    def fake_urlopen(req, timeout=0):
        model = req.full_url.split("/models/")[1].split(":")[0]
        calls.append(model)
        if model == "gemini-2.5-flash":
            raise urllib.error.HTTPError(req.full_url, 503, "busy", {}, io.BytesIO(b'{"error":{"message":"high demand"}}'))
        if model == "gemini-2.5-flash-lite":
            raise urllib.error.HTTPError(req.full_url, 404, "nope", {}, io.BytesIO(b'{"error":{"message":"not found"}}'))
        body = json.dumps({"candidates": [{"content": {"parts": [{"text": json.dumps({"ok": 1})}]}}]}).encode()
        class R(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False
        return R(body)

    monkeypatch.setattr(gemini.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(gemini.time, "sleep", lambda s: None)
    monkeypatch.setattr(gemini, "RETRY_DELAYS", (0, 0))
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.delenv("GEMINI_MODELS", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    out = gemini.generate([{"text": "hi"}], schema={"type": "OBJECT"}, on_retry=notes.append)
    assert out == {"ok": 1} and gemini.last_used_model == "gemini-2.0-flash"
    assert calls == ["gemini-2.5-flash"] * 3 + ["gemini-2.5-flash-lite", "gemini-2.0-flash"]
    assert any("busy (503)" in n for n in notes) and any("trying the next model" in n for n in notes)


def test_gemini_model_chain_env(monkeypatch):
    monkeypatch.setenv("GEMINI_MODELS", "gemini-2.5-pro, gemini-2.5-flash")
    assert gemini.model_chain() == ["gemini-2.5-pro", "gemini-2.5-flash"]
    monkeypatch.delenv("GEMINI_MODELS")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.0-flash")
    assert gemini.model_chain()[0] == "gemini-2.0-flash" and "gemini-2.5-flash" in gemini.model_chain()
