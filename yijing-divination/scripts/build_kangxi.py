#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build an offline 康熙筆畫 (Kangxi stroke) dictionary.

Kangxi total strokes = (canonical strokes of the character's Kangxi radical)
                     + (additional strokes), taken from Unihan's kRSUnicode
field which uses the 214 Kangxi radical system. This reproduces the stroke
counts used in 梅花易數 / 卜卦 (where radicals are counted in their full form,
e.g. 氵=水=4, 艹=艸=6), as opposed to modern simplified stroke counts.

Falls back to kTotalStrokes when kRSUnicode is unavailable.
Output: data/kangxi_strokes.json  ->  { "青": 8, "海": 11, ... }
"""
import json, os, re

SRC = "/tmp/unihan/Unihan_IRGSources.txt"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "kangxi_strokes.json")

# Canonical stroke count of each of the 214 Kangxi radicals, by radical number.
# Built from the standard stroke-group partition of the radical sequence.
GROUPS = [
    (1, 6, 1), (7, 29, 2), (30, 60, 3), (61, 94, 4), (95, 117, 5),
    (118, 146, 6), (147, 166, 7), (167, 175, 8), (176, 186, 9),
    (187, 194, 10), (195, 200, 11), (201, 204, 12), (205, 208, 13),
    (209, 210, 14), (211, 211, 15), (212, 213, 16), (214, 214, 17),
]
RAD_STROKES = {}
for lo, hi, st in GROUPS:
    for r in range(lo, hi + 1):
        RAD_STROKES[r] = st
assert len(RAD_STROKES) == 214, len(RAD_STROKES)

def main():
    krs = {}     # codepoint -> "rad.add"
    ktot = {}    # codepoint -> int
    with open(SRC, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or "\t" not in line:
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            cp, field, val = parts[0], parts[1], parts[2]
            if field == "kRSUnicode":
                krs[cp] = val.split()[0]   # first radical decomposition
            elif field == "kTotalStrokes":
                ktot[cp] = int(val.split()[0])

    out = {}
    # Cover the main CJK Unified Ideographs block (U+4E00..U+9FFF) — virtually all
    # characters a user would mentally pick — plus CJK Ext-A common range.
    ranges = [(0x4E00, 0x9FFF), (0x3400, 0x4DBF)]
    for lo, hi in ranges:
        for cp in range(lo, hi + 1):
            key = "U+%04X" % cp
            strokes = None
            if key in krs:
                m = re.match(r"(\d+)['\"]?\.(-?\d+)", krs[key])
                if m:
                    rad = int(m.group(1))
                    add = int(m.group(2))
                    if rad in RAD_STROKES:
                        strokes = RAD_STROKES[rad] + add
            if strokes is None and key in ktot:
                strokes = ktot[key]
            if strokes is not None and strokes > 0:
                out[chr(cp)] = strokes

    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT)
    print("OK wrote", OUT, "chars:", len(out), "size: %.0f KB" % (size / 1024))
    # verify known values used in 卜卦 examples / radical-form cases
    for ch, expect in [("青", 8), ("海", 11), ("龍", 16), ("水", 4), ("草", 12),
                       ("花", 10), ("謝", 17), ("德", 15), ("一", 1), ("乾", 11)]:
        got = out.get(ch)
        flag = "" if got == expect else "  <-- DIFF"
        print(f"  {ch}: got={got} expect={expect}{flag}")

if __name__ == "__main__":
    main()
