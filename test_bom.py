import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

test_syms = [
    'TATAMOTORS:BOM', '500570:BOM',
    'LTIM:BOM', '540005:BOM',
    'ZOMATO:BOM', '543320:BOM',
    'ICICIPRULI:NSE', 'ICICIPRULI:BOM',
    'TMCV:NSE', 'TMPV:NSE'
]

for sym in test_syms:
    url = f"https://www.google.com/finance/quote/{sym}"
    r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    m_title = re.search(r'<title>(.*?)</title>', r.text)
    vals = re.findall(r'>₹([0-9,.]+)<', r.text)
    t = m_title.group(1)[:45] if m_title else "None"
    p = vals[0] if vals else "None"
    print(f"{sym:15} -> Title: {t} | Price: {p}")
