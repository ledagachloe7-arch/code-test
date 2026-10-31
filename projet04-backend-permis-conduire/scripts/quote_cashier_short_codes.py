#!/usr/bin/env python3
"""
Lit un fichier (une valeur par ligne), écrit des littéraux SQL entre quotes.
Ignore : lignes vides, en-tête cashier_short_code, notation scientifique type 9,51E+70.
"""
import re
import sys


def is_valid_code(line: str) -> bool:
    s = line.strip()
    if not s or s.lower() == "cashier_short_code":
        return False
    if "," in s and re.search(r"[eE][+-]?\d+", s):
        return False
    # codes CNEDDT : hex (souvent 8 caractères), pas d'autres caractères
    if not re.fullmatch(r"[0-9a-fA-F]+", s):
        return False
    if len(s) < 6 or len(s) > 64:
        return False
    return True


def sql_quote(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        print("Usage: quote_cashier_short_codes.py <fichier_entree.txt> [fichier_sortie.txt]", file=sys.stderr)
        return 1

    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    quoted = [sql_quote(line.strip()) for line in lines if is_valid_code(line)]

    text = ",\n".join(quoted)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as out:
            out.write(text)
            if text:
                out.write("\n")
        print(f"{len(quoted)} codes -> {out_path}", file=sys.stderr)
    else:
        sys.stdout.write(text)
        if text:
            sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
