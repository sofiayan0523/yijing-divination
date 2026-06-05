#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse the flattened 易經.txt CSV blob into clean per-hexagram JSON.

The source file is a single CSV where the 64 data rows have been flattened:
a header row, then records "N,卦名,...,應用提示" separated by a space before the
next record's leading number. We slice on the *exact next expected integer*
(" 2,", " 3,", ... " 64,") which is robust against stray digits inside fields.
"""
import csv, io, json, re, os

SRC = os.path.join(os.path.dirname(__file__), "..", "..", ".omni", "uploads", "易經.txt")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "hexagrams_text.json")

COLUMNS = [
    "tuan",        # 彖傳（原文）
    "meaning",     # 基本卦義
    "xiang",       # 象傳（原文）
    "wenyan",      # 文言傳（原文）
    "xici",        # 繫辭傳（原文）
    "shuogua",     # 說卦傳（原文）
    "xugua",       # 序卦傳（原文）
    "zagua",       # 雜卦傳（原文）
    "wang",        # 王思迅詮釋
    "example",     # 範例應用
    "ni",          # 倪海廈要旨
    "image",       # 卦圖關鍵象（取象要點）
    "hint",        # 應用提示（占事取向）
]

def clean(s: str) -> str:
    if s is None:
        return ""
    s = s.strip()
    # strip trailing citation noise like "eee-learning.com", "zh.wikisource.org"
    s = re.sub(r'(eee-learning\.com|zh\.wikisource\.org|eslite\.com|podcasts\.apple\.com)+', '', s)
    return s.strip()

def main():
    raw = open(SRC, encoding="utf-8").read()
    # Drop everything up to and including the header row. The header ends right
    # before the first record marker " 1,". Find the header column list start.
    hstart = raw.index("卦名,")
    # The first record begins at the first " 1," after the header.
    m = re.search(r'\s1,', raw[hstart:])
    body_start = hstart + m.start()
    body = raw[body_start:]  # begins with " 1,乾卦,..."

    # Find record boundaries: marker = whitespace + N + comma, followed (within a
    # few chars) by a 卦-name ending in 卦,. Require sequential N to be safe.
    boundaries = []  # (num, index_in_body_of_number)
    search_from = 0
    for n in range(1, 65):
        pat = re.compile(r'\s(' + str(n) + r'),(?=[^,，]{1,4}卦,)')
        mm = pat.search(body, search_from)
        if not mm:
            raise SystemExit(f"Could not locate record {n} (searched from {search_from})")
        boundaries.append((n, mm.start(1)))  # position of the digit
        search_from = mm.end()

    records = []
    for i, (n, pos) in enumerate(boundaries):
        end = boundaries[i + 1][1] if i + 1 < len(boundaries) else len(body)
        # slice from the digit; back up to drop the leading whitespace already excluded
        chunk = body[pos:end]
        # chunk = "N,卦名,f2,...,f14 " possibly trailing space
        chunk = chunk.rstrip().rstrip(',')
        # Use csv to respect quoted fields containing commas/newlines
        row = next(csv.reader(io.StringIO(chunk)))
        # row[0]=N, row[1]=卦名, row[2..14]=the 13 remaining columns (14 total incl 卦名)
        num = int(row[0])
        name = clean(row[1])
        fields = row[2:]
        rec = {"number": num, "name": name}
        for ci, col in enumerate(COLUMNS):
            rec[col] = clean(fields[ci]) if ci < len(fields) else ""
        records.append(rec)

    # sanity
    assert len(records) == 64, f"got {len(records)} records"
    nums = [r["number"] for r in records]
    assert nums == list(range(1, 65)), nums
    json.dump(records, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("OK wrote", OUT, "records:", len(records))
    print("names:", " ".join(r["name"] for r in records))
    # quick field-fill report
    for col in ["meaning", "wang", "ni", "image", "hint"]:
        filled = sum(1 for r in records if r[col])
        print(f"  {col}: {filled}/64 filled")

if __name__ == "__main__":
    main()
