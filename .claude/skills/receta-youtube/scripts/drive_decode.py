#!/usr/bin/env python3
"""Decodes Google Drive downloads that were too big for the conversation.

The Drive connector's download_file_content returns base64 JSON; when the file is large, the
harness saves that JSON to a tool-results file and reports its path instead. Pass those paths
(or a glob) and an output folder; each file is written under its Drive title, byte-exact.
    python3 drive_decode.py <out_dir> <saved_result.txt> [...more]
Identical files (same bytes) are written once, so re-downloads and duplicates are harmless.
"""
import base64
import glob
import hashlib
import json
import os
import sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
seen = {}
for pattern in sys.argv[2:]:
    for f in sorted(glob.glob(pattern)):
        d = json.load(open(f))
        data = base64.b64decode(d['content'])
        h = hashlib.md5(data).hexdigest()
        if h in seen:
            print(f'skip duplicate {d["title"]} (same as {seen[h]})')
            continue
        name = os.path.basename(d['title'])
        seen[h] = name
        open(os.path.join(out, name), 'wb').write(data)
        print(f'{name}  {len(data)} bytes  {d.get("mimeType", "")}')
