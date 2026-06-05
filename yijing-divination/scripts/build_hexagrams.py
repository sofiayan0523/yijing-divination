#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Merge text + 吉凶 data and derive upper/lower trigrams + line patterns.

The (upper, lower) -> King Wen number lookup is derived directly from each
hexagram's fullName (e.g. 地水師 -> upper 地=坤, lower 水=坎), so it cannot be
mistyped. Produces:
  data/hexagrams.json  (array, index = number-1)
  data/trigrams.json   (8 trigrams: name, symbol, nature, xiantian number, lines)
  data/lookup.json     ( "<upperKey><lowerKey>" -> number )
"""
import json, os

D = os.path.join(os.path.dirname(__file__), "..", "data")

# 八卦: key, 卦名, 卦象符號, 自然, 先天數, lines [bottom, mid, top] (1=陽,0=陰)
TRIGRAMS = [
    {"key": "qian", "name": "乾", "symbol": "☰", "nature": "天", "num": 1, "lines": [1, 1, 1]},
    {"key": "dui",  "name": "兌", "symbol": "☱", "nature": "澤", "num": 2, "lines": [1, 1, 0]},
    {"key": "li",   "name": "離", "symbol": "☲", "nature": "火", "num": 3, "lines": [1, 0, 1]},
    {"key": "zhen", "name": "震", "symbol": "☳", "nature": "雷", "num": 4, "lines": [1, 0, 0]},
    {"key": "xun",  "name": "巽", "symbol": "☴", "nature": "風", "num": 5, "lines": [0, 1, 1]},
    {"key": "kan",  "name": "坎", "symbol": "☵", "nature": "水", "num": 6, "lines": [0, 1, 0]},
    {"key": "gen",  "name": "艮", "symbol": "☶", "nature": "山", "num": 7, "lines": [0, 0, 1]},
    {"key": "kun",  "name": "坤", "symbol": "☷", "nature": "地", "num": 8, "lines": [0, 0, 0]},
]
BY_NAME = {t["name"]: t for t in TRIGRAMS}      # 乾 -> trigram
BY_NATURE = {t["nature"]: t for t in TRIGRAMS}  # 天 -> trigram

def trigram_from_fullname(full):
    """Return (upper, lower) trigram dicts from a fullName like 地水師 / 乾為天."""
    if "為" in full:
        t = BY_NAME[full[0]]      # 乾為天 -> 乾 doubled
        return t, t
    upper = BY_NATURE[full[0]]
    lower = BY_NATURE[full[1]]
    return upper, lower

def main():
    text = json.load(open(os.path.join(D, "hexagrams_text.json"), encoding="utf-8"))
    jx = json.load(open(os.path.join(D, "hexagrams_jixiong.json"), encoding="utf-8"))
    text_by_num = {r["number"]: r for r in text}

    hexagrams = []
    lookup = {}
    for n in range(1, 65):
        t = text_by_num[n]
        j = jx[str(n)]
        upper, lower = trigram_from_fullname(j["fullName"])
        # full line pattern bottom->top: lower trigram lines 1-3, upper lines 4-6
        lines = lower["lines"] + upper["lines"]
        rec = {
            "number": n,
            "name": t["name"],
            "fullName": j["fullName"],
            "idiom": j["idiom"],
            "desc": j["desc"],
            "jixiong": j["jixiong"],
            "verdict": j["verdict"],
            "explain": j["explain"],
            "meaning": t["meaning"],
            "upper": upper["key"],
            "lower": lower["key"],
            "upperName": upper["name"],
            "lowerName": lower["name"],
            "lines": lines,
            # classical texts + master interpretations
            "tuan": t["tuan"], "xiang": t["xiang"], "wenyan": t["wenyan"],
            "xici": t["xici"], "shuogua": t["shuogua"], "xugua": t["xugua"],
            "zagua": t["zagua"], "wang": t["wang"], "example": t["example"],
            "ni": t["ni"], "image": t["image"], "hint": t["hint"],
        }
        hexagrams.append(rec)
        lookup[upper["key"] + lower["key"]] = n

    assert len(lookup) == 64, f"lookup has {len(lookup)} unique pairs (expected 64)"
    json.dump(hexagrams, open(os.path.join(D, "hexagrams.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    json.dump(TRIGRAMS, open(os.path.join(D, "trigrams.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump(lookup, open(os.path.join(D, "lookup.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("OK: hexagrams=%d, unique (upper,lower) pairs=%d" % (len(hexagrams), len(lookup)))
    # verify the prompt's worked example: upper 坤(kun) + lower 坎(kan) -> 7 (地水師)
    n = lookup["kun" + "kan"]
    print("verify 上坤下坎 ->", n, hexagrams[n - 1]["fullName"], "(expect 7 地水師)")
    n2 = lookup["kan" + "kun"]
    print("verify 上坎下坤 ->", n2, hexagrams[n2 - 1]["fullName"], "(expect 8 水地比)")

if __name__ == "__main__":
    main()
