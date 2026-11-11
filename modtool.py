#!/usr/bin/env python3
"""modtool - đọc/sửa từng @MODULE trong 1 file userscript duy nhất (không cần chia file).
  python3 modtool.py FILE list                 # tag, dòng bắt đầu-kết thúc, KB
  python3 modtool.py FILE outline [TAG]        # chỉ tên hàm (rất ít token); bỏ TAG = tất cả module
  python3 modtool.py FILE get TAG              # in nguyên module
  python3 modtool.py FILE find TEXT            # module nào chứa TEXT (kèm số dòng)
  python3 modtool.py FILE put TAG NEWFILE      # thay module TAG bằng nội dung NEWFILE (tự tạo FILE.bak)
Module = từ banner  /* ====  * @MODULE[tag] ...  đến banner kế tiếp (module cuối đến trước '})();')."""
import re, sys
BAN = re.compile(r"/\* =+\n \* @MODULE\[([^\]]+)\]")
FN = re.compile(r"^\s*(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|^\s*(?:var|let|const)\s+(\w+)\s*=\s*function\b|^\s*window\.(__\w+)\s*=")

def load(p): return open(p, encoding='utf-8', newline='').read()
def spans(s):
    b = [(m.start(), m.group(1)) for m in BAN.finditer(s)]
    end = s.rfind("\n})();") + 1 or len(s)
    return [(t, st, (b[i+1][0] if i+1 < len(b) else end)) for i, (st, t) in enumerate(b)]
def ln(s, pos): return s.count("\n", 0, pos) + 1
def pick(sp, tag):
    r = [x for x in sp if x[0] == tag]
    if not r: sys.exit("Không có module '%s'. Dùng: list" % tag)
    return r[0]

def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    path, cmd, a = sys.argv[1], sys.argv[2], sys.argv[3:]
    s = load(path); sp = spans(s)
    if cmd == 'list':
        for t, st, en in sp: print("%-16s dòng %5d-%-5d %6.1f KB" % (t, ln(s, st), ln(s, en) - 1, (en - st) / 1024))
    elif cmd == 'get':
        t, st, en = pick(sp, a[0]); sys.stdout.write(s[st:en])
    elif cmd == 'outline':
        for t, st, en in ([pick(sp, a[0])] if a else sp):
            base = ln(s, st); print("== %s (dòng %d)" % (t, base))
            for i, l in enumerate(s[st:en].split("\n")):
                m = FN.match(l)
                if m: print("  %5d  %s" % (base + i, (m.group(1) and "function %s(%s)" % (m.group(1), m.group(2).strip())) or m.group(3) or m.group(4)))
    elif cmd == 'find':
        for t, st, en in sp:
            for i, l in enumerate(s[st:en].split("\n")):
                if a[0] in l: print("%-16s %5d  %s" % (t, ln(s, st) + i, l.strip()[:110]))
    elif cmd == 'put':
        t, st, en = pick(sp, a[0]); new = load(a[1])
        if not new.endswith("\n"): new += "\n"
        open(path + ".bak", "w", encoding='utf-8', newline='').write(s)
        open(path, "w", encoding='utf-8', newline='').write(s[:st] + new + s[en:])
        print("OK: thay module %s (%d -> %d ký tự), bản cũ: %s.bak" % (t, en - st, len(new), path))
    else: sys.exit(__doc__)
main()
