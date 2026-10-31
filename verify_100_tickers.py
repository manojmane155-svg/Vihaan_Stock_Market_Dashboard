import urllib.request
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

with open('c:/Users/MANOJ/.gemini/antigravity/scratch/manoj_dashboard_extension/all_sheets_data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

n50 = [r[0].replace('NSE:', '').strip() for r in d['RSI of Nifty 50 Stocks'][2:] if r[0] and str(r[0]).startswith('NSE:')]
next50 = [r[0].replace('NSE:', '').strip() for r in d['RSI of Nifty Next 50 Stocks'][2:] if r[0] and str(r[0]).startswith('NSE:')]

# Known alias mappings for recent NSE corporate renamings / ticker updates
TICKER_MAP = {
    'TATAMOTORS': 'TMPV.NS',   # Tata Motors Passenger Vehicles (post-demerger)
    'LTIM': 'LTM.NS',          # LTIMindtree ticker updated to LTM
    'ZOMATO': 'ETERNAL.NS',    # Zomato Ltd renamed to Eternal Ltd
    'ICICIPRU': 'ICICIPRULI.NS',# ICICI Prudential Life
    'M&M': 'M%26M.NS',         # URL encoded &
    'BAJAJ-AUTO': 'BAJAJ-AUTO.NS'
}

def resolve_ticker(sym):
    return TICKER_MAP.get(sym, f"{sym}.NS")

headers = {'User-Agent': 'Mozilla/5.0'}

print("Testing Nifty 50 tickers...")
failed_n50 = []
for s in n50:
    t = resolve_ticker(s)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{t}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            p = data['chart']['result'][0]['meta'].get('regularMarketPrice')
            print(f"  [OK] {s:12} ({t:12}) -> ₹{p}")
    except Exception as e:
        print(f"  [FAIL] {s:12} ({t:12}) -> {e}")
        failed_n50.append(s)

print(f"\nNifty 50 Failed ({len(failed_n50)}): {failed_n50}")

print("\nTesting Nifty Next 50 tickers...")
failed_next50 = []
for s in next50:
    t = resolve_ticker(s)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{t}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            p = data['chart']['result'][0]['meta'].get('regularMarketPrice')
            print(f"  [OK] {s:12} ({t:12}) -> ₹{p}")
    except Exception as e:
        print(f"  [FAIL] {s:12} ({t:12}) -> {e}")
        failed_next50.append(s)

print(f"\nNext 50 Failed ({len(failed_next50)}): {failed_next50}")
