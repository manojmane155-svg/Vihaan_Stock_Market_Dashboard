import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def calculate_wilder_rsi(closes, period=14):
    """
    Standard Wilder's RSI calculation (the exact method used by Google Finance / Excel):
    """
    if len(closes) < period + 1:
        return None
    
    # Calculate price changes
    changes = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(c, 0.0) for c in changes]
    losses = [max(-c, 0.0) for c in changes]
    
    # First average gain and loss (SMA of first 14 periods)
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    # Wilder's exponential smoothing for subsequent periods
    for i in range(period, len(changes)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return round(rsi, 2)

# Test with HDFCBANK.NS, RELIANCE.NS, BAJAJFINSV.NS, NESTLEIND.NS
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

test_syms = ['HDFCBANK.NS', 'RELIANCE.NS', 'BAJAJFINSV.NS', 'NESTLEIND.NS', 'DMART.NS', 'TMCV.NS', 'TMPV.NS']
for sym in test_syms:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=3mo"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            res = data['chart']['result'][0]
            meta = res['meta']
            quotes = res['indicators']['quote'][0]
            closes = [c for c in quotes.get('close', []) if c is not None]
            rsi = calculate_wilder_rsi(closes, period=14)
            p = meta.get('regularMarketPrice')
            prev = meta.get('chartPreviousClose')
            chg_pct = round(((p - prev) / prev) * 100, 2) if (p and prev) else 0.0
            h52 = meta.get('fiftyTwoWeekHigh')
            l52 = meta.get('fiftyTwoWeekLow')
            signal = "START BUYING" if (rsi and rsi <= 35) else "WAIT"
            print(f"{sym:15} | Price: ₹{p:<8} | Chg: {chg_pct:>+6.2f}% | 14-RSI: {rsi:<5} | Signal: {signal:<12} | 52H: ₹{h52} | 52L: ₹{l52}")
    except Exception as e:
        print(f"{sym:15} | Error: {e}")
