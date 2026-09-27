"""Tiny host-network sidecar: POST /wake with the MAC as the body sends the
magic packet on the host's LAN. Run as `python -m app.wol_server`."""

from __future__ import annotations

import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from . import wol

SECRET = os.environ.get("HASURA_ADMIN_SECRET", "")
PORT = int(os.environ.get("WOL_PORT", "9910"))


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802
        if self.path != "/wake" or (SECRET and self.headers.get("x-api-secret") != SECRET):
            self.send_response(403); self.end_headers(); return
        mac = self.rfile.read(int(self.headers.get("content-length") or 0)).decode().strip()
        try:
            wol.send_direct(mac)
            body = f"magic packet sent to {mac} via {wol.BROADCAST}".encode()
            self.send_response(200)
        except Exception as e:  # noqa: BLE001
            body = str(e).encode()
            self.send_response(400)
        self.send_header("content-type", "text/plain")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # quieter
        print("wol:", fmt % args)


if __name__ == "__main__":
    print(f"wol sidecar listening on :{PORT}, broadcast {wol.BROADCAST}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
