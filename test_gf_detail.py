import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

for sym in ['ZOMATO', 'LTIM', 'TATAMOTORS', 'HDFCBANK']:
    url = f"https://www.google.com/finance/quote/{sym}:NSE"
    r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    print(f"\n=== {sym} ===")
    m_title = re.search(r'<title>(.*?)</title>', r.text)
    print("Title:", m_title.group(1) if m_title else "None")
    
    # Check all numbers with ₹
    inr_vals = re.findall(r'>₹([0-9,.]+)<', r.text)
    print("Values with ₹:", inr_vals[:10])
    
    # Check key stats
    stats = {}
    for m in re.finditer(r'<div class="SwQK7">(.*?)</div><div class="dO6ijd">₹?([0-9,.]+)<', r.text):
        stats[m.group(1).strip()] = m.group(2).strip()
    print("Stats table:", stats)
