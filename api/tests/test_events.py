"""Recipe → render payload mapping (pure)."""

from app.events import DEFAULT_SHORTS, _recipe_payload

CLIP = {"id": "c1", "start_s": 10.0, "end_s": 25.0}


def test_default_shorts_uses_borders_and_speech_gate():
    have = {"borders": {"data": {"trim_x": 3.0, "trim_y": 5.5}}, "transcript": {"data": {"words": 8}}}
    p = _recipe_payload({"id": None, "settings": DEFAULT_SHORTS}, CLIP, have)
    assert p["trim_x"] == 3.0 and p["trim_y"] == 5.5
    assert p["captions"] is False  # only 8 words → hallucination guard
    assert p["start"] == 10.0 and p["end"] == 25.0 and "recipe_id" not in p
    assert "auto_trim" not in p and "captions_if_speech" not in p


def test_recipe_keeps_explicit_trim_and_records_recipe_id():
    have = {"borders": {"data": {"trim_x": 3.0, "trim_y": 5.5}}, "transcript": {"data": {"words": 500}}}
    recipe = {"id": "r1", "settings": {"style": "crop", "trim_x": 1.0, "auto_trim": True, "captions": True}}
    p = _recipe_payload(recipe, CLIP, have)
    assert p["trim_x"] == 1.0 and "trim_y" not in p
    assert p["captions"] is True and p["recipe_id"] == "r1" and p["style"] == "crop"


def test_captions_dropped_without_transcript():
    p = _recipe_payload({"id": None, "settings": {"captions": True}}, CLIP, {})
    assert p["captions"] is False
