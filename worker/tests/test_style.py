"""Style clone: report -> recipe mapping and Resolve notes (pure)."""

from worker.agent.jobs.schemas import validate_payload, validate_recipe
from worker.core import style

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
