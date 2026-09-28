# Using YT Studio from your phone

The app runs only while the gaming PC is on and `run.bat` is running. To reach it from a phone:

1. In `.env` set `HOST=0.0.0.0` (and `OPEN_BROWSER=false` if you like). Restart the app.
2. Allow port 8765 through Windows Firewall the first time Windows asks (private networks).
3. On the same Wi-Fi: open `http://<the PC's LAN IP>:8765`.
   Over Tailscale from anywhere: `http://<the PC's tailscale IP>:8765`.

That works as a normal web page. To install it as an app (home-screen icon, full screen) the
browser needs HTTPS. With Tailscale on the PC:

```powershell
tailscale serve --bg http://localhost:8765
```

then open `https://<pc-name>.<tailnet>.ts.net` on the phone → Chrome menu → *Add to home screen*.

Large 4K sources will not play in the phone browser; use the preview copy (Prepare → Preview copy)
or the rendered clips, which are small H.264 mp4s.
