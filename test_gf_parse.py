import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def parse_gf(sym):
    url = f"https://www.google.com/finance/quote/{sym}:NSE"
    r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout=10)
    
    # Primary price
    m_price = re.search(r'jsname="Pdsbrc"[^>]*><span>₹?([0-9,.]+)<', r.text)
    if not m_price:
        m_price = re.search(r'class="YMlKec fxKbKc">₹?([0-9,.]+)<', r.text)
    price = float(m_price.group(1).replace(',', '')) if m_price else None
    
    # Stats
    stats = {}
    for m in re.finditer(r'<div class="SwQK7">(.*?)</div><div class="dO6ijd">₹?([0-9,.]+)<', r.text):
        label, val = m.group(1).strip(), m.group(2).replace(',', '').strip()
        try:
            stats[label] = float(val)
        except:
            stats[label] = val
            
    print(f"{sym:12} -> Price: {price} | Prev: {stats.get('Previous close')} | 52H: {stats.get('52-wk high')} | 52L: {stats.get('52-wk low')} | PE: {stats.get('P/E ratio')}")
    return {'price': price, 'stats': stats}

for s in ['TATAMOTORS', 'HDFCBANK', 'RELIANCE', 'LTIM', 'ZOMATO', 'DMART', 'BAJAJFINSV']:
    parse_gf(s)
