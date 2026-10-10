#!/usr/bin/env python3
"""Regenerate data.js from pumpX2's notification enums, checked against TandemKit's.

    scripts/sync_pumpx2.py ../pumpX2 ../TandemKit

Both are read at origin/dev unless --ref says otherwise. Exits without writing
if TandemKit disagrees with pumpX2.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

PUMPX2_DIR = "messages/src/main/java/com/jwoglom/pumpx2/pump/messages/response/currentStatus"
TANDEMKIT_DIR = "Sources/TandemCore/Messages/CurrentStatus"

# (key, pumpX2 class, enum, pumpX2's isKnown rule, TandemKit file)
CATEGORIES = [
    ("MALFUNCTION", "MalfunctionBitmaskStatusResponse", "MalfunctionType", "all", "MalfunctionStatus"),
    ("ALARM", "AlarmStatusResponse", "AlarmResponseType", "description", "AlarmStatus"),
    ("ALERT", "AlertStatusResponse", "AlertResponseType", "description", "AlertStatus"),
    ("CGM_ALERT", "CGMAlertStatusResponse", "CGMAlert", "not_default", "CGMAlertStatus"),
    ("REMINDER", "ReminderStatusResponse", "ReminderType", "not_default", "ReminderStatus"),
]

JAVA_ENTRY = re.compile(
    r'(?:/\*\*\s*Tandem firmware name:\s*(\S+)\s*\*/\s*)?'
    r'\b([A-Z][A-Z0-9_]*)\((\d+)((?:\s*,\s*(?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)?)\)'
)
SWIFT_ENTRY = re.compile(r'(?:///\s*Tandem firmware name:\s*(\S+)\s*\n\s*)?case (\w+) = (\d+)')
STRING = re.compile(r'"((?:[^"\\]|\\.)*)"')


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True).stdout


def read(repo, ref, path):
    return git(repo, "show", f"{ref}:{path}") if ref else (Path(repo) / path).read_text()


def firmware_name(name):
    return None if not name or name.startswith("NUM_") else name  # NUM_*: the enum's count


def pumpx2_entries(source, enum, rule):
    start = source.index(f"enum {enum} ")
    body = source[source.index("{", start) + 1:]
    body = body[:re.search(r"^\s*;\s*$", body, re.M).start()]
    out = []
    for firmware, name, ident, rest in JAVA_ENTRY.findall(body):
        desc = "".join(STRING.findall(rest)) or None
        known = {"all": True, "description": bool(desc and desc.strip()),
                 "not_default": not name.startswith("DEFAULT_")}[rule]
        out.append({"id": int(ident), "name": name, "firmware": firmware_name(firmware),
                    "desc": desc, "known": known})
    return out


def swift_descriptions(source):
    block = source[source.index("var notificationDescription"):]
    block = block[:block.index("default:")]
    descs, pending = {}, []
    for m in re.finditer(r'\.([A-Z][A-Z0-9_]+)|return "((?:[^"\\]|\\.)*)"', block):
        if m.group(1):
            pending.append(m.group(1))
        else:
            descs.update((name, m.group(2)) for name in pending)
            pending = []
    return descs


def tandemkit_mismatches(key, source, rows):
    # TandemKit's MalfunctionType cases are camelCase (hwCryptoFail); the rest match pumpX2.
    if key == "MALFUNCTION":
        name = lambda n: re.sub(r"(?<!^)(?=[A-Z])", "_", n).upper()
    else:
        name = lambda n: n
    theirs = [(int(i), name(n), firmware_name(f)) for f, n, i in SWIFT_ENTRY.findall(source)]
    ours = [(r["id"], r["name"], r["firmware"]) for r in rows]
    problems = [f"{key}: pumpX2 {o} vs TandemKit {t}" for o, t in zip(ours, theirs) if o != t]
    if len(ours) != len(theirs):
        problems.append(f"{key}: pumpX2 has {len(ours)} entries, TandemKit {len(theirs)}")
    if key in ("ALARM", "ALERT"):
        descs = swift_descriptions(source)
        problems += [f"{key} {r['name']}: description differs"
                     for r in rows if r["desc"] != descs.get(r["name"])]
    return problems


def ignorable_codes(source):
    block = re.search(r"IGNORABLE_CODES(.*?)\n\s*[\]}];?\s*\n", source, re.S).group(1)
    return [[int(a), int(b)] for a, b in re.findall(r"[{(]\s*(\d+)\s*,\s*(\d+)\s*[})]", block)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pumpx2")
    ap.add_argument("tandemkit")
    ap.add_argument("--ref", default="origin/dev", help="git ref to read in both repos; '' for the working trees")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data.js"))
    args = ap.parse_args()

    tables, problems = {}, []
    for key, cls, enum, rule, swift in CATEGORIES:
        rows = pumpx2_entries(read(args.pumpx2, args.ref, f"{PUMPX2_DIR}/{cls}.java"), enum, rule)
        problems += tandemkit_mismatches(key, read(args.tandemkit, args.ref, f"{TANDEMKIT_DIR}/{swift}.swift"), rows)
        tables[key] = rows

    ignorable = ignorable_codes(read(args.pumpx2, args.ref, f"{PUMPX2_DIR}/HighestAamResponse.java"))
    if ignorable != ignorable_codes(read(args.tandemkit, args.ref, f"{TANDEMKIT_DIR}/HighestAam.swift")):
        problems.append("IGNORABLE_CODES differ")

    if problems:
        sys.exit("TandemKit disagrees with pumpX2:\n  " + "\n  ".join(problems))

    def version(repo):
        commit = git(repo, "rev-parse", "--short", args.ref or "HEAD").strip()
        return f"{args.ref.removeprefix('origin/') if args.ref else 'working tree'} @ {commit}"

    lines = [
        "// Generated by scripts/sync_pumpx2.py; do not edit by hand.",
        "var PUMPX2 = {",
        f"  pumpx2: {json.dumps(version(args.pumpx2))},",
        f"  tandemkit: {json.dumps(version(args.tandemkit))},",
        f"  ignorableCodes: {json.dumps(ignorable)},",
    ]
    for key, rows in tables.items():
        lines.append(f"  {key}: [")
        lines += [f"    {json.dumps(row, ensure_ascii=False)}," for row in rows]
        lines.append("  ],")
    lines += ["};", "", 'if (typeof module !== "undefined") module.exports = PUMPX2;', ""]
    Path(args.out).write_text("\n".join(lines))


if __name__ == "__main__":
    main()
