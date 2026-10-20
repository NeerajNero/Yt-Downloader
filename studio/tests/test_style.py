"""Style clone: report -> recipe mapping and Resolve notes (pure)."""

from unittest import mock

from studio.schemas import validate_payload, validate_recipe
from studio.core import style
from studio.core.ffmpeg import Tools

REPORT = {
    "summary": "Fast, caption-heavy gameplay edit.", "hook": "Kill in the first second.",
    "captions": {"present": True, "style": "pop", "position": "middle", "all_caps": True, "notes": "bold white"},
    "framing": {"style": "crop", "notes": ""},
    "cuts": {"pace": "fast", "on_beat": True, "notes": ""},
    "zooms": {"punch_ins": True, "per_10s": 3, "slow_zoom": False, "notes": ""},
    "color": {"grade": "teal_orange", "vivid": 55, "hdr_look": True, "notes": ""},
    "audio": {"voice": True, "music": True, "ducking": True, "sfx": True, "notes": "phonk"},
    "overlays": {"watermark": True, "watermark_position": "top_right", "other_text": "none"},
    "motion": {"speed_ramps": True, "transitions": "whip pans", "notes": ""},
    "resolve_steps": [{"panel": "Edit", "step": "Add speed ramps", "detail": "Retime curves 100→400%"}],
}
MEASURED = {"width": 1080, "height": 1920, "orientation": "portrait", "duration": 30.0, "cuts": 12,
            "cuts_per_10s": 4.0, "median_shot_s": 2.1, "lufs": -13.5, "lra": 6.0, "bars_trim_x": 0.0, "bars_trim_y": 0.0}


def test_to_recipe_maps_and_validates():
    r = style.to_recipe(REPORT, MEASURED)
    assert r["captions"] is True and r["caption_style"] == "pop" and r["caption_pos"] == "middle"
    assert r["grade"] == "teal_orange" and r["vivid_amount"] == 55 and r["look"] == "hdr"
    assert r["style"] == "crop" and r["zoom"] == "none" and r["watermark"]["position"] == "top_right"
    validate_recipe(r)  # must be a valid RecipeSettings


def test_to_recipe_unknown_values_fall_back():
    rep = {**REPORT, "captions": {"present": True, "style": "other", "position": "left", "all_caps": False, "notes": ""},
           "color": {"grade": "vhs", "vivid": 500, "hdr_look": False, "notes": ""},
           "framing": {"style": "blur", "notes": ""}, "zooms": {"punch_ins": False, "per_10s": 0, "slow_zoom": True, "notes": ""},
           "overlays": {"watermark": False, "watermark_position": "none", "other_text": ""}}
    r = style.to_recipe(rep, {**MEASURED, "bars_trim_y": 6.0})
    assert r["caption_style"] == "karaoke" and r["caption_pos"] == "bottom" and r["grade"] == "none"
    assert r["vivid_amount"] == 100 and r["style"] == "blur" and r["zoom"] == "in" and r["auto_trim"] is True
    assert "watermark" not in r
    validate_recipe(r)


def test_resolve_notes_and_chips():
    md = style.resolve_markdown(REPORT, MEASURED)
    assert "### DaVinci Resolve steps" in md and "1. **Edit** — Add speed ramps" in md and "Punch-ins" in md
    c = style.chips(REPORT, MEASURED)
    assert "captions pop" in c and "punch-ins" in c and "speed ramps" in c and "music (ducked)" in c


def test_style_payload():
    assert validate_payload("style", {"style_id": "abc"})["url"] is None


def test_video_part_uses_configured_encoder(tmp_path, monkeypatch):
    """The Gemini proxy copy goes through the encoder table's `proxy` profile
    (720p max), never a hardcoded libx264."""
    ref = tmp_path / "ref.mp4"
    ref.write_bytes(b"\x00" * 64)
    monkeypatch.setattr(style, "MAX_INLINE_BYTES", 10)
    seen = []

    def fake_run(cmd, **kw):
        seen.append(cmd)
        (tmp_path / "ref_small.mp4").write_bytes(b"tiny")
        return mock.Mock(returncode=0)

    with mock.patch.object(style.subprocess, "run", fake_run):
        part = style._video_part(ref, Tools("/opt/ffmpeg/ffmpeg"), tmp_path, "h264_amf")
    assert len(seen) == 1 and seen[0][0] == "/opt/ffmpeg/ffmpeg"
    assert "libx264" not in seen[0] and seen[0][seen[0].index("-c:v") + 1] == "h264_amf"
    assert seen[0][seen[0].index("-vf") + 1] == style.PROXY_SCALE and "720" in style.PROXY_SCALE
    assert part["inline_data"]["mime_type"] == "video/mp4" and part["inline_data"]["data"]  # the small copy was sent
    # under the limit: no encode at all
    seen.clear()
    monkeypatch.setattr(style, "MAX_INLINE_BYTES", 10_000)
    with mock.patch.object(style.subprocess, "run", fake_run):
        style._video_part(ref, Tools("ffmpeg"), tmp_path, "libx264")
    assert seen == []
