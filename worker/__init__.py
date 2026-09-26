"""YT Studio v2 worker package.

worker.core  — pure media functions (no queue/DB knowledge)
worker.agent — the claim loop that turns Postgres job rows into core calls
"""
