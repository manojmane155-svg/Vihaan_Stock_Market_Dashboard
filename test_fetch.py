import requests
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def test_google_finance(symbol):
    url = f"https://www.google.com/finance/quote/{symbol}:NSE"
    r = requests.get(url, headers=headers, timeout=10)
    print(f"Google Finance {symbol}: status {r.status_code}")
    if r.status_code == 200:
        # Price
        m_price = re.search(r'class="YMlKec fxKbKc">₹?([0-9,.]+)<', r.text)
        if m_price:
            print("  Price:", m_price.group(1))
        # Previous close
        m_prev = re.search(r'Previous close.*?class="P6K39c">₹?([0-9,.]+)<', r.text, re.DOTALL)
        if m_prev:
            print("  Prev close:", m_prev.group(1))
        # 52-week range
        m_range = re.search(r'Year range.*?class="P6K39c">₹?([0-9,.]+)\s*-\s*₹?([0-9,.]+)<', r.text, re.DOTALL)
        if m_range:
            print(f"  52W Range: Low={m_range.group(1)}, High={m_range.group(2)}")
        # P/E
        m_pe = re.search(r'P/E ratio.*?class="P6K39c">([0-9,.]+)<', r.text, re.DOTALL)
        if m_pe:
            print("  P/E ratio:", m_pe.group(1))

for s in ['TATAMOTORS', 'HDFCBANK', 'RELIANCE', 'LTIM', 'ZOMATO', 'DMART']:
    test_google_finance(s)
