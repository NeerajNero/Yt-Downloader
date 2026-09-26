"""Thin psycopg wrapper: one autocommit connection per thread, reconnects once
on a dropped link (laptops sleep, tailnet blips)."""

from __future__ import annotations

import logging
import threading
import time

import psycopg
from psycopg.rows import dict_row

log = logging.getLogger("worker.db")


class Db:
    def __init__(self, url: str):
        self.url = url
        self._local = threading.local()

    def _conn(self) -> psycopg.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None or conn.closed:
            conn = psycopg.connect(self.url, autocommit=True, row_factory=dict_row,
                                   connect_timeout=10)
            self._local.conn = conn
        return conn

    def close(self) -> None:
        conn = getattr(self._local, "conn", None)
        if conn is not None and not conn.closed:
            conn.close()

    def _run(self, sql: str, params=None, fetch: str = "none"):
        last_err: Exception | None = None
        for attempt in range(2):
            try:
                with self._conn().cursor() as cur:
                    cur.execute(sql, params)
                    if fetch == "one":
                        return cur.fetchone()
                    if fetch == "all":
                        return cur.fetchall()
                    return cur.rowcount
            except psycopg.OperationalError as e:  # connection dropped
                last_err = e
                log.warning("db connection lost (%s); reconnecting", e)
                self._local.conn = None
                time.sleep(1.0 * (attempt + 1))
        raise last_err  # type: ignore[misc]

    def execute(self, sql: str, params=None) -> int:
        return self._run(sql, params, "none")

    def fetch_one(self, sql: str, params=None):
        return self._run(sql, params, "one")

    def fetch_all(self, sql: str, params=None):
        return self._run(sql, params, "all")
