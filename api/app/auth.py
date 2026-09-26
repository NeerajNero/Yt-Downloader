from fastapi import Header, HTTPException

from . import settings


def require_secret(x_api_secret: str | None = Header(default=None)) -> None:
    """Guard for worker uploads + internal endpoints (header: x-api-secret)."""
    if settings.API_SECRET and x_api_secret != settings.API_SECRET:
        raise HTTPException(status_code=401, detail="bad or missing x-api-secret")
