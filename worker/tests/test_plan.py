"""AI edit plan: Gemini result -> montage-ready plan (mocked API)."""

from pathlib import Path
from unittest import mock

from worker.agent.jobs.schemas import validate_payload
from worker.core import gemini, plan
from worker.core.ffmpeg import Tools

TRANSCRIPT = {"duration": 60.0, "segments": [{"start": 1, "end": 5, "text": "x", "words": [{"w": "w", "s": 1, "e": 1.2}] * 25}]}
SCENES = {"duration": 60.0, "scenes": [10.0, 20.0, 30.0]}
FAKE = {"title": "T", "hook": "H", "summary": "S", "transition": "zoomin", "transition_duration": 0.4,
        "caption_style": "pop", "caption_pos": "middle", "grade": "teal_orange", "vivid": 40,
        "music_vibe": "phonk", "sfx_ideas": ["hit on shot 2"], "resolve_notes": ["speed ramp shot 3"],
        "shots": [{"start": 40, "end": 46, "speed": 1, "punch": True, "why": "hook"},
                  {"start": 2, "end": 2.3, "speed": 1, "punch": False, "why": "too short"},
                  {"start": 10, "end": 90, "speed": 9, "punch": False, "why": "clamped"}]}


def test_make_plan_cleans_and_maps():
    with mock.patch.object(gemini, "generate", return_value=FAKE), \
         mock.patch.object(plan, "_extract_keyframes", return_value=[(5.0, "AAAA")]), \
         mock.patch.dict("os.environ", {"GEMINI_API_KEY": "k"}):
        out = plan.make_plan(Path("x.mkv"), "Title", 60.0, TRANSCRIPT, SCENES, Tools("ffmpeg"), lambda: False,
                             target_len=30, max_shots=8, note="make it hype")
    assert [s["start"] for s in out["shots"]] == [40.0, 10.0]
    assert out["shots"][1]["end"] == 60.0 and out["shots"][1]["speed"] == 4.0
    assert out["transition"] == {"type": "zoomin", "duration": 0.4}
    assert out["captions"] is True and out["caption_style"] == "pop" and out["grade"] == "teal_orange"
    assert out["out_length"] == round(6 + 50 / 4, 1)


def test_make_plan_no_speech_disables_captions_and_unknowns_fall_back():
    fake = {**FAKE, "transition": "morph", "caption_style": "neon", "grade": "vhs", "vivid": 999}
    with mock.patch.object(gemini, "generate", return_value=fake), \
         mock.patch.object(plan, "_extract_keyframes", return_value=[]), \
         mock.patch.dict("os.environ", {"GEMINI_API_KEY": "k"}):
        out = plan.make_plan(Path("x.mkv"), "Title", 60.0, None, SCENES, Tools("ffmpeg"), lambda: False)
    assert out["captions"] is False and out["transition"]["type"] == "cut" and out["grade"] == "none" and out["vivid"] == 100


def test_plan_payload():
    assert validate_payload("plan", {})["target_length"] == 30.0
