"""psycopg connection pool for the brain API (Actions, files, watchdog)."""

from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from . import settings

pool = ConnectionPool(settings.DATABASE_URL, min_size=1, max_size=8, open=False,
                      kwargs={"row_factory": dict_row, "autocommit": True})


@contextmanager
def cursor():
    with pool.connection() as conn:
        with conn.cursor() as cur:
            yield cur
