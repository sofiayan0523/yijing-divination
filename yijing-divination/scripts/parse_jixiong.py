#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse 易經六十四卦吉凶總覽.md into a 64-entry JSON keyed by hexagram number."""
import json, re, os

SRC = os.path.join(os.path.dirname(__file__), "..", "..", ".omni", "uploads", "易經六十四卦吉凶總覽.md")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "hexagrams_jixiong.json")

def main():
    raw = open(SRC, encoding="utf-8").read()
    # Each entry block starts with "### 第N卦"
    blocks = re.split(r'^### 第(\d+)卦\s*$', raw, flags=re.M)
    # blocks: [preamble, '1', body1, '2', body2, ...]
    entries = {}
    for i in range(1, len(blocks), 2):
        num = int(blocks[i])
        body = blocks[i + 1]
        # title line: **N.卦名-成語 描述**
        tm = re.search(r'\*\*\s*\d+\.(.+?)\*\*', body)
        title = tm.group(1).strip() if tm else ""
        # split "卦名-成語 描述": 卦名 before '-', rest after
        full_name, idiom, desc = title, "", ""
        mt = re.match(r'^(.+?)-(.+?)\s+(.+)$', title)
        if mt:
            full_name, idiom, desc = mt.group(1).strip(), mt.group(2).strip(), mt.group(3).strip()
        else:
            mt2 = re.match(r'^(.+?)-(.+)$', title)
            if mt2:
                full_name, idiom = mt2.group(1).strip(), mt2.group(2).strip()
        def cell(label):
            m = re.search(r'\|\s*' + label + r'\s*\|\s*(.+?)\s*\|', body)
            return m.group(1).strip() if m else ""
        jixiong = cell("吉凶")
        verdict = cell("斷語")
        explain = cell("卦象說明")
        entries[str(num)] = {
            "number": num,
            "fullName": full_name,   # e.g. 乾為天
            "idiom": idiom,          # e.g. 旱象逢河
            "desc": desc,            # e.g. 純陽至尊，為君之道
            "jixiong": jixiong,      # ✅ 吉 / ❌ 凶 / 🟠 中凶 ...
            "verdict": verdict,      # 斷語
            "explain": explain,      # 卦象說明
        }
    assert len(entries) == 64, f"got {len(entries)}"
    json.dump(entries, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("OK wrote", OUT, "entries:", len(entries))
    for n in [1, 2, 7]:
        print(n, entries[str(n)])

if __name__ == "__main__":
    main()
