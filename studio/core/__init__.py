"""Pure media functions. Each takes `report(percent, note)` and `should_cancel()`
callbacks and never touches app state — see CLAUDE.md conventions."""

from .errors import Cancelled

__all__ = ["Cancelled"]
