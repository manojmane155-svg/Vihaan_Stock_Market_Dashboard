import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {'User-Agent': 'Mozilla/5.0'}

# Test BSE codes and Yahoo symbols
test_symbols = [
    'TATAMOTORS.BO', '500570.BO', # Tata Motors BSE code is 500570
    'LTIM.BO', '540005.BO',
    'ZOMATO.BO', '543320.BO',
    'ICICIPRULI.NS', 'ICICIPRULI.BO',
    'HDFCBANK.NS', 'HDFCBANK.BO',
    'RELIANCE.NS', 'RELIANCE.BO'
]

for sym in test_symbols:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            meta = data['chart']['result'][0]['meta']
            print(f"SUCCESS {sym:15} -> Price: {meta.get('regularMarketPrice')}, 52H: {meta.get('fiftyTwoWeekHigh')}, 52L: {meta.get('fiftyTwoWeekLow')}")
    except Exception as e:
        print(f"FAIL    {sym:15} -> {e}")
