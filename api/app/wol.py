"""Wake-on-LAN. A magic packet must leave from the physical LAN, and the api
container sits on Docker's bridge network, so by default the packet goes to
the `wol` sidecar (same image, host networking) at WOL_URL. With WOL_URL unset
the packet is sent directly (works when the api itself has host networking or
runs outside Docker)."""

from __future__ import annotations

import os
import socket
import urllib.request

WOL_URL = os.environ.get("WOL_URL", "")
BROADCAST = os.environ.get("WOL_BROADCAST", "255.255.255.255")


def magic_packet(mac: str) -> bytes:
    clean = mac.replace(":", "").replace("-", "").replace(".", "").strip()
    if len(clean) != 12:
        raise ValueError(f"bad MAC address {mac!r}")
    return b"\xff" * 6 + bytes.fromhex(clean) * 16


def send_direct(mac: str, broadcast: str = BROADCAST, port: int = 9) -> None:
    pkt = magic_packet(mac)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.sendto(pkt, (broadcast, port))
        s.sendto(pkt, (broadcast, 7))


def send(mac: str, secret: str = "") -> str:
    """Send via the sidecar when configured, else directly. Returns a note."""
    if WOL_URL:
        req = urllib.request.Request(f"{WOL_URL.rstrip('/')}/wake", data=mac.encode(),
                                     headers={"x-api-secret": secret, "content-type": "text/plain"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.read().decode()[:200]
    send_direct(mac)
    return f"sent to {BROADCAST}"
