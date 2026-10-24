#!/usr/bin/env python3
"""Servidor de pré-visualização da agenda, com auto-reload.

Serve apenas `index.html` (com um script de recarga automática injetado em
memória) e as imagens de `docs/`. Não expõe o resto do repositório (`.git`,
README, etc.).

Uso:
    python tools/preview.py            # http://127.0.0.1:8080
    python tools/preview.py --port 9000
"""

import argparse
import http.server
import mimetypes
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")

RELOAD_SNIPPET = """
<script>
/* injetado por tools/preview.py — recarrega a página quando index.html muda */
(function () {
  var stamp = null;
  function poll() {
    fetch('/__mtime', { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (value) {
        if (stamp === null) { stamp = value; }
        else if (value !== stamp) { location.reload(); return; }
        setTimeout(poll, 1000);
      })
      .catch(function () { setTimeout(poll, 2000); });
  }
  poll();
})();
</script>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "AgendaPreview/1.0"

    def log_message(self, fmt, *args):  # silêncio: só mostramos avisos
        pass

    def _send(self, body, content_type, status=200):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = self.path.split("?", 1)[0]

        if path == "/__mtime":
            try:
                stamp = str(os.path.getmtime(INDEX))
            except OSError:
                stamp = "0"
            self._send(stamp.encode("utf-8"), "text/plain; charset=utf-8")
            return

        if path in ("/", "/index.html"):
            try:
                with open(INDEX, "r", encoding="utf-8") as fh:
                    html = fh.read()
            except OSError:
                self._send(b"index.html nao encontrado", "text/plain; charset=utf-8", 500)
                return
            if "</body>" in html:
                html = html.replace("</body>", RELOAD_SNIPPET + "</body>", 1)
            else:
                html += RELOAD_SNIPPET
            self._send(html.encode("utf-8"), "text/html; charset=utf-8")
            return

        if path.startswith("/docs/"):
            target = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
            if target.startswith(os.path.join(ROOT, "docs")) and os.path.isfile(target):
                ctype = mimetypes.guess_type(target)[0] or "application/octet-stream"
                with open(target, "rb") as fh:
                    self._send(fh.read(), ctype)
                return

        self._send(b"404", "text/plain; charset=utf-8", 404)


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    parser = argparse.ArgumentParser(description="Pre-visualizacao da agenda com auto-reload")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    if not os.path.isfile(INDEX):
        sys.exit("index.html nao encontrado em %s" % ROOT)

    with Server((args.host, args.port), Handler) as httpd:
        print("Pre-visualizacao: http://%s:%d/  (Ctrl+C para parar)" % (args.host, args.port), flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nA terminar.")


if __name__ == "__main__":
    main()
