"""Runs the app on this computer at http://localhost:8000, like `python -m http.server 8000`.

It also lets the sound recorder (recorder.html) save recordings straight into audio/words/ and
audio/sounds/ in this folder, in any browser. Run it from anywhere:

    python serve.py          (or: python serve.py 8080 for another port)

Only this computer can reach it, and it only ever writes .wav files into those two folders.
"""

import http.server
import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
SAVE_PATH = re.compile(r'^/audio/(words|sounds)/([^/\\:*?"<>|]+)\.wav$')
MAX_BYTES = 5 * 1024 * 1024  # a few seconds of audio is well under this


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # Tells recorder.html that saving is available.
    def end_headers(self):
        self.send_header('X-Recorder-Save', '1')
        super().end_headers()

    def do_PUT(self):
        # Only pages from this server can save (blocks other websites you have open).
        origin = self.headers.get('Origin')
        if origin and urllib.parse.urlsplit(origin).netloc != self.headers.get('Host'):
            return self.send_error(403, 'Saving is only allowed from this app')

        match = SAVE_PATH.match(urllib.parse.unquote(urllib.parse.urlsplit(self.path).path))
        length = int(self.headers.get('Content-Length') or 0)
        if not match or match.group(2).strip('.') == '' or not 0 < length <= MAX_BYTES:
            return self.send_error(400, 'Expected audio/words/<name>.wav or audio/sounds/<name>.wav')
        data = self.rfile.read(length)
        if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
            return self.send_error(400, 'Not a .wav file')

        target = ROOT / 'audio' / match.group(1) / f'{match.group(2)}.wav'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Sight Words: http://localhost:{PORT}  (recorder: http://localhost:{PORT}/recorder.html)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
