"""
NetAppModeler Local Update Helper
====================================
A small local HTTP server that the app's "Check for Updates" button talks
to. This exists ONLY because a browser page (running from file:// or even
a plain http server) cannot fetch docs.netapp.com directly — that domain
sends no Access-Control-Allow-Origin header, so the browser blocks the
response (confirmed: a plain request returns 200 with no CORS headers at
all). This local server has a normal network stack (no CORS restrictions
apply to it) and re-uses harvest_reference_data.py's proven fetch technique,
then serves the result back to the browser over localhost with CORS headers
this server controls.

This is NOT the shipped standalone_netapp_modeler.html reaching out on its
own — it's an explicit, separate helper the user starts themselves, and the
in-app button only ever talks to 127.0.0.1. Close this terminal and the app
goes back to being 100% offline. Nothing here writes to js/compatibility.js
automatically; it only reports what it finds. Applying a fix stays a
deliberate `tools/apply_reference_data.py` + manual edit, same as today.

Usage:
  python tools/update_server.py
Then in the app: Settings -> "Check for Updates".
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import harvest_reference_data as harvester  # noqa: E402
import apply_reference_data as checker  # noqa: E402
import harvest_ontap_lifecycle as ontap_harvester  # noqa: E402
import apply_ontap_lifecycle as ontap_checker  # noqa: E402

PORT = 8765


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            # The app is opened via file:// (Origin: null) or a local http server —
            # this server's own CORS policy, not NetApp's, so we can be permissive
            # for a purely local, user-initiated tool.
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # Confirmed 2026-10-13: the browser's own 60s AbortSignal.timeout (or
            # the user navigating away / closing the tab) can tear down the
            # connection while a slow harvest (/check-updates or
            # /check-ontap-updates can legitimately take 30-60s+ combined — several
            # sequential docs.netapp.com fetches, each with its own socket timeout)
            # is still running. Writing the finished response to that now-dead
            # socket raised an unhandled exception here, which — because it
            # happened *inside* the except block that was already trying to send
            # an error response for a different failure — produced a second,
            # confusing double-traceback in the console and (since this ran on
            # the old single-threaded HTTPServer) could leave the server's one
            # request-handling slot stuck, making every subsequent request
            # (including from a fresh browser tab) hang indefinitely. The client
            # already gave up; nothing to do here but note it and move on.
            print("[update-server] client disconnected before the response could be sent (it likely gave up waiting)")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json(200, {"status": "ok"})
            return

        if path == "/check-updates":
            try:
                print("Harvesting latest data from docs.netapp.com...")
                harvester.harvest()

                with open(checker.RACK_LAYOUTS_PATH, "r", encoding="utf-8") as f:
                    rack_src = f.read()
                with open(checker.COMPATIBILITY_PATH, "r", encoding="utf-8") as f:
                    compat_src = f.read()

                sourced = checker.extract_sourced_ports_by_platform(rack_src)
                catalog = checker.extract_catalog_ports_by_platform(compat_src)

                drift = []
                for model, sourced_ports in sourced.items():
                    catalog_ports = catalog.get(model)
                    if catalog_ports is None:
                        continue
                    missing = sorted(p for p in sourced_ports if p not in catalog_ports)
                    if missing:
                        drift.append({"model": model, "missingPorts": missing})

                self._send_json(200, {
                    "checkedAt": harvester.__name__ and __import__("datetime").datetime.now().isoformat(),
                    "platformsChecked": len(sourced),
                    "drift": drift,
                    "clean": len(drift) == 0,
                    "note": ("Nothing was auto-applied — this only reports what changed. "
                             "Run tools/apply_reference_data.py for the full report, then "
                             "hand-edit js/compatibility.js and rebuild if anything needs fixing.")
                })
            except Exception as e:
                self._send_json(500, {"error": str(e)})
            return

        if path == "/check-ontap-updates":
            try:
                print("Harvesting ONTAP lifecycle data (NetApp release-support-reference.html, "
                      "endoflife.date, platform EOA index)...")
                raw = ontap_harvester.harvest()

                with open(ontap_checker.COMPATIBILITY_PATH, "r", encoding="utf-8") as f:
                    compat_src = f.read()
                with open(ontap_checker.DATA_SOURCES_PATH, "r", encoding="utf-8") as f:
                    data_sources_src = f.read()

                findings = ontap_checker.compute_findings(raw, compat_src, data_sources_src)

                self._send_json(200, {
                    "checkedAt": __import__("datetime").datetime.now().isoformat(),
                    "versionLinesChecked": len((raw.get("releaseSupportReference") or {}).get("data") or {}),
                    "eoaPlatformsFound": len((raw.get("eoaPlatforms") or {}).get("data") or []),
                    "findings": findings,
                    "clean": len(findings) == 0,
                    "notAutomated": raw.get("notAutomated", {}),
                    "note": ("Nothing was auto-applied — this only reports what changed. "
                             "Run tools/apply_ontap_lifecycle.py for the full report, then "
                             "hand-edit js/compatibility.js / DATA_SOURCES.md and rebuild if "
                             "anything needs fixing.")
                })
            except Exception as e:
                self._send_json(500, {"error": str(e)})
            return

        self._send_json(404, {"error": "not found", "routes": ["/health", "/check-updates", "/check-ontap-updates"]})

    def log_message(self, fmt, *args):
        print(f"[update-server] {self.address_string()} - {fmt % args}")


def main():
    # ThreadingHTTPServer, not plain HTTPServer: confirmed 2026-10-13 — the app
    # fires /check-updates and /check-ontap-updates from the same button click,
    # and a single-threaded server processes them one at a time, so the second
    # request waits for the first's ~15-20s harvest to fully finish before even
    # starting its own (also ~15-20s+) — the combined wait can exceed a minute
    # and, if the client gives up first, can leave the server's one handling
    # slot stuck on a half-finished request. Threading lets both run genuinely
    # concurrently, so the user waits for whichever one is slower, not both
    # back-to-back.
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"NetAppModeler update helper running at http://127.0.0.1:{PORT}")
    print("In the app: Settings -> Check for Updates. Ctrl+C to stop (app goes back to fully offline).")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
