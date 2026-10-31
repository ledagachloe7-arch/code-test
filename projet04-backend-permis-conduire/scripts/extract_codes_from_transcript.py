"""Extrait les cashier_short_code (hex par ligne) depuis une ligne JSONL du transcript Cursor."""
import json
import re
import sys
from pathlib import Path


def main() -> int:
    transcript = Path(sys.argv[1])
    raw = transcript.read_text(encoding="utf-8", errors="replace")
    needle = "regarde sa je veux entourer"
    idx = raw.find(needle)
    if idx < 0:
        print("needle not found", file=sys.stderr)
        return 1

    # La ligne JSONL commence par { et contient "text":"...<user_query>...\n...\n</user_query>..."
    line_start = raw.rfind("\n", 0, idx) + 1
    line_end = raw.find("\n", idx)
    if line_end < 0:
        line_end = len(raw)
    json_line = raw[line_start:line_end]

    obj = json.loads(json_line)
    text = obj["message"]["content"][0]["text"]
    if "</user_query>" in text:
        text = text.split("</user_query>", 1)[0]
    if "<user_query>" in text:
        text = text.split("<user_query>", 1)[-1]

    lines_out = []
    seen = set()
    for line in text.splitlines():
        s = line.strip()
        if not s or s.lower() == "cashier_short_code":
            continue
        if "," in s and re.search(r"[eE][+-]?\d+", s):
            continue
        if not re.fullmatch(r"[0-9a-fA-F]+", s):
            continue
        if len(s) < 6 or len(s) > 64:
            continue
        if s not in seen:
            seen.add(s)
            lines_out.append(s)

    out_in = Path(sys.argv[2])
    out_in.parent.mkdir(parents=True, exist_ok=True)
    out_in.write_text("\n".join(lines_out) + ("\n" if lines_out else ""), encoding="utf-8")
    print(f"wrote {len(lines_out)} unique codes -> {out_in}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
