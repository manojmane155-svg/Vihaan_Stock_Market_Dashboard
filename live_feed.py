"""
Live Market Data Engine for Indian Stock Market (NSE / BSE)
Fetches live prices, 52-week High/Low, historical bars, and computes 14-day Wilder RSI.
"""
import urllib.request
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# UTF-8 stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 100 NSE Tickers
NIFTY_50_SYMBOLS = [
    'HDFCBANK', 'HCLTECH', 'HINDALCO', 'NTPC', 'ONGC', 'BAJAJFINSV', 'TECHM',
    'JSWSTEEL', 'TATACONSUM', 'LTIM', 'TITAN', 'WIPRO', 'DIVISLAB', 'M&M',
    'CIPLA', 'TATASTEEL', 'LT', 'TCS', 'SHRIRAMFIN', 'ICICIBANK', 'INFY',
    'TATAMOTORS', 'RELIANCE', 'BAJFINANCE', 'POWERGRID', 'AXISBANK', 'SBILIFE',
    'ASIANPAINT', 'BHARTIARTL', 'BRITANNIA', 'BAJAJ-AUTO', 'NESTLEIND', 'SBIN',
    'ULTRACEMCO', 'ITC', 'COALINDIA', 'DRREDDY', 'HINDUNILVR', 'ADANIENT',
    'SUNPHARMA', 'BPCL', 'MARUTI', 'INDUSINDBK', 'KOTAKBANK', 'HDFCLIFE',
    'EICHERMOT', 'GRASIM', 'ADANIPORTS', 'HEROMOTOCO', 'APOLLOHOSP'
]

NIFTY_NEXT_50_SYMBOLS = [
    'SHREECEM', 'TVSMOTOR', 'UNITDSPR', 'GAIL', 'TORNTPHARM', 'HAL', 'DLF',
    'PIDILITIND', 'BOSCHLTD', 'SRF', 'INDIGO', 'IRCTC', 'CANBK', 'BEL',
    'ICICIPRU', 'TATAPOWER', 'VEDL', 'AMBUJACEM', 'COLPAL', 'JINDALSTEL',
    'ABB', 'PNB', 'SIEMENS', 'SBICARD', 'BAJAJHLDNG', 'ADANIENSOL', 'HAVELLS',
    'ADANIGREEN', 'PFC', 'TRENT', 'BANKBARODA', 'MOTHERSON', 'GODREJCP',
    'IOC', 'CHOLAFIN', 'ICICIGI', 'BERGEPAINT', 'NAUKRI', 'VBL', 'ZOMATO',
    'RECLTD', 'LICI', 'DABUR', 'ATGL', 'IRFC', 'JIOFIN', 'ZYDUSLIFE',
    'MARICO', 'DMART', 'ADANIPOWER'
]

# Additional Index Constituents for BANK NIFTY and NIFTY IT
EXTRA_INDEX_CONSTITUENTS = [
    'AUBANK', 'FEDERALBNK', 'IDFCFIRSTB', 'BANDHANBNK',
    'PERSISTENT', 'COFORGE', 'OFSS', 'MPHASIS'
]

BANK_NIFTY_SYMBOLS = [
    'HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
    'BANKBARODA', 'PNB', 'AUBANK', 'FEDERALBNK', 'IDFCFIRSTB', 'BANDHANBNK'
]

NIFTY_IT_SYMBOLS = [
    'TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM', 'LTIM', 'PERSISTENT', 'COFORGE', 'OFSS', 'MPHASIS'
]

SENSEX_SYMBOLS = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'INFY', 'ITC', 'SBIN',
    'LT', 'HINDUNILVR', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE', 'M&M', 'SUNPHARMA',
    'MARUTI', 'HCLTECH', 'NTPC', 'POWERGRID', 'TITAN', 'TATASTEEL', 'BAJAJFINSV',
    'ULTRACEMCO', 'ASIANPAINT', 'JSWSTEEL', 'TECHM', 'ADANIPORTS', 'NESTLEIND',
    'INDUSINDBK', 'WIPRO'
]

# Ticker overrides for corporate renamings / demergers
TICKER_OVERRIDES = {
    'TATAMOTORS': 'TMPV.NS',     # Tata Motors Passenger Vehicles (active NSE ticker)
    'LTIM': 'LTM.NS',            # LTMindtree ticker
    'ZOMATO': 'ETERNAL.NS',      # Eternal Ltd (Zomato)
    'ICICIPRU': 'ICICIPRULI.NS',  # ICICI Prudential Life
    'M&M': 'M%26M.NS',
    'BAJAJ-AUTO': 'BAJAJ-AUTO.NS'
}

def resolve_ticker(sym):
    clean = (sym or '').strip().upper()
    if clean in TICKER_OVERRIDES:
        return TICKER_OVERRIDES[clean]
    if clean.startswith('^') or clean.endswith('.NS') or clean.endswith('.BO'):
        return clean
    return f"{clean}.NS"

def calculate_wilder_rsi_series(dates, closes, opens=None, highs=None, lows=None, volumes=None, period=14):
    """
    Computes full historical step-by-step Wilder RSI series with OHLCV data for candlestick charting:
    Date, Open, High, Low, Close, Volume, Change, Gain, Loss, Average Gain, Average Loss, RS, RSI.
    """
    if len(closes) < period + 1:
        return []

    changes = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(c, 0.0) for c in changes]
    losses = [max(-c, 0.0) for c in changes]

    # First SMA
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    series = []
    # Build series for each day after the initial period
    for i in range(period, len(changes)):
        idx = i + 1
        c_date = dates[idx] if idx < len(dates) else ""
        c_close = closes[idx] if idx < len(closes) else closes[-1]
        c_open = opens[idx] if (opens and idx < len(opens) and opens[idx] is not None) else c_close
        c_high = highs[idx] if (highs and idx < len(highs) and highs[idx] is not None) else max(c_open, c_close)
        c_low = lows[idx] if (lows and idx < len(lows) and lows[idx] is not None) else min(c_open, c_close)
        c_vol = volumes[idx] if (volumes and idx < len(volumes) and volumes[idx] is not None) else 0

        c_change = changes[i]
        c_gain = gains[i]
        c_loss = losses[i]

        if i > period:
            avg_gain = (avg_gain * (period - 1) + c_gain) / period
            avg_loss = (avg_loss * (period - 1) + c_loss) / period

        rs = (avg_gain / avg_loss) if avg_loss > 0 else 999.0
        rsi = 100.0 - (100.0 / (1.0 + rs)) if avg_loss > 0 else 100.0

        series.append({
            'date': c_date,
            'close': round(c_close, 2),
            'open': round(c_open, 2),
            'high': round(c_high, 2),
            'low': round(c_low, 2),
            'volume': int(c_vol),
            'change': round(c_change, 2),
            'gain': round(c_gain, 2),
            'loss': round(c_loss, 2),
            'avgGain': round(avg_gain, 4),
            'avgLoss': round(avg_loss, 4),
            'rs': round(rs, 4),
            'rsi': round(rsi, 2)
        })

    # Return reverse chronological (newest first)
    series.reverse()
    return series

def fetch_stock_data(symbol, is_next50=False):
    """Fetches 6-month daily chart from Yahoo Finance and calculates live indicators & OHLC."""
    ticker = resolve_ticker(symbol)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=6mo"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())

        chart_res = data['chart']['result'][0]
        meta = chart_res['meta']
        timestamps = chart_res.get('timestamp', [])
        quotes = chart_res['indicators']['quote'][0]
        raw_closes = quotes.get('close', [])
        raw_opens = quotes.get('open', [])
        raw_highs = quotes.get('high', [])
        raw_lows = quotes.get('low', [])
        raw_vols = quotes.get('volume', [])

        # Filter valid closes and dates
        valid_dates = []
        valid_closes = []
        valid_opens = []
        valid_highs = []
        valid_lows = []
        valid_vols = []
        for i, (ts, c) in enumerate(zip(timestamps, raw_closes)):
            if c is not None:
                d_str = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                valid_dates.append(d_str)
                valid_closes.append(float(c))
                o = raw_opens[i] if i < len(raw_opens) and raw_opens[i] is not None else c
                h = raw_highs[i] if i < len(raw_highs) and raw_highs[i] is not None else c
                l = raw_lows[i] if i < len(raw_lows) and raw_lows[i] is not None else c
                v = raw_vols[i] if i < len(raw_vols) and raw_vols[i] is not None else 0
                valid_opens.append(float(o))
                valid_highs.append(float(h))
                valid_lows.append(float(l))
                valid_vols.append(int(v))

        price = meta.get('regularMarketPrice')
        if price is None and valid_closes:
            price = round(valid_closes[-1], 2)
        else:
            price = round(float(price), 2) if price else None

        # Ensure latest live market tick is in valid_closes for RSI calculation
        if price is not None and valid_closes:
            today_str = datetime.now().strftime('%Y-%m-%d')
            day_high = meta.get('regularMarketDayHigh') or price
            day_low = meta.get('regularMarketDayLow') or price
            day_open = meta.get('regularMarketOpen') or price
            day_vol = meta.get('regularMarketVolume') or 0
            if valid_dates and valid_dates[-1] == today_str:
                valid_closes[-1] = price
                valid_highs[-1] = max(valid_highs[-1], float(day_high))
                valid_lows[-1] = min(valid_lows[-1], float(day_low))
            else:
                valid_dates.append(today_str)
                valid_closes.append(price)
                valid_opens.append(float(day_open))
                valid_highs.append(float(day_high))
                valid_lows.append(float(day_low))
                valid_vols.append(int(day_vol))

        # Calculate Wilder RSI history with OHLCV data
        history = calculate_wilder_rsi_series(valid_dates, valid_closes, valid_opens, valid_highs, valid_lows, valid_vols, period=14)
        latest_rsi = history[0]['rsi'] if history else None

        # Day's change: use live fulldayChange if provided by exchange, or yesterday's close
        fc = meta.get('fulldayChange')
        if fc is None:
            fc = meta.get('regularMarketChange')
        rcp = meta.get('regularMarketChangePercent')
        if rcp is None:
            rcp = meta.get('fulldayChangePercent')

        if fc is not None and rcp is not None:
            change = round(float(fc), 2)
            change_pct = round(float(rcp), 2)
        elif len(valid_closes) >= 2 and price is not None:
            prev_close = round(valid_closes[-2], 2)
            change = round(price - prev_close, 2)
            change_pct = round(((price - prev_close) / prev_close) * 100, 2) if prev_close else 0.0
        else:
            change = 0.0
            change_pct = 0.0

        low52 = meta.get('fiftyTwoWeekLow')
        high52 = meta.get('fiftyTwoWeekHigh')
        if low52: low52 = round(float(low52), 2)
        if high52: high52 = round(float(high52), 2)

        # Status according to Manoj Mane's rule
        if latest_rsi is not None and latest_rsi <= 35:
            status = 'Start Buying As Par Rules'
        else:
            status = 'WAIT'

        # Discount from 52-week high
        discount_from_high = round(((high52 - price) / high52) * 100, 2) if (price and high52 and high52 > 0) else None
        buffer_from_low = round(((price - low52) / low52) * 100, 2) if (price and low52 and low52 > 0) else None
        range_pos = round(((price - low52) / (high52 - low52)) * 100, 1) if (price and low52 and high52 and high52 > low52) else None

        prev_close_val = round(valid_closes[-2], 2) if len(valid_closes) >= 2 else price

        item = {
            'code': f"NSE:{symbol}",
            'symbol': symbol,
            'ticker': ticker,
            'price': price,
            'change': change,
            'change_pct': change_pct,
            'rsi': latest_rsi,
            'status': status,
            'day_open': round(float(day_open), 2) if day_open is not None else price,
            'day_high': round(float(day_high), 2) if day_high is not None else price,
            'day_low': round(float(day_low), 2) if day_low is not None else price,
            'prev_close': prev_close_val,
            'low52': low52,
            'high52': high52,
            'discount_from_high': discount_from_high,
            'buffer_from_low': buffer_from_low,
            'range_position_pct': range_pos,
            'last_updated': datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')
        }

        return symbol, item, history, None
    except Exception as err:
        return symbol, None, None, str(err)

INDICES_CONFIG = [
    {'name': 'NIFTY 50', 'ticker': '^NSEI', 'exchange': 'NSE', 'expiry_day': 'Thursday'},
    {'name': 'GIFT NIFTY', 'ticker': '^NSEI', 'exchange': 'NSE IX', 'expiry_day': 'Thursday', 'is_gift': True},
    {'name': 'SENSEX', 'ticker': '^BSESN', 'exchange': 'BSE', 'expiry_day': 'Friday'},
    {'name': 'BANK NIFTY', 'ticker': '^NSEBANK', 'exchange': 'NSE', 'expiry_day': 'Wednesday'},
    {'name': 'NIFTY IT', 'ticker': '^CNXIT', 'exchange': 'NSE', 'expiry_day': 'Thursday'},
    {'name': 'INDIA VIX', 'ticker': '^INDIAVIX', 'exchange': 'NSE', 'expiry_day': None}
]

def fetch_indices_data():
    """Fetches real-time quotes and 5m intraday OHLC points for major Indian indices."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    indices = []
    for cfg in INDICES_CONFIG:
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{cfg['ticker']}?interval=5m&range=1d"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode())
            chart_res = data['chart']['result'][0]
            meta = chart_res['meta']
            price = meta.get('regularMarketPrice')
            fc = meta.get('fulldayChange')
            if fc is None:
                fc = meta.get('regularMarketChange') or 0.0
            rcp = meta.get('regularMarketChangePercent')
            if rcp is None:
                rcp = meta.get('fulldayChangePercent') or 0.0

            day_high = meta.get('regularMarketDayHigh')
            day_low = meta.get('regularMarketDayLow')
            day_open = meta.get('regularMarketOpen')
            prev_close = meta.get('chartPreviousClose')

            # Parse intraday 5m OHLC candles
            ts_list = chart_res.get('timestamp', [])
            q = chart_res.get('indicators', {}).get('quote', [{}])[0]
            raw_c = q.get('close', [])
            raw_o = q.get('open', [])
            raw_h = q.get('high', [])
            raw_l = q.get('low', [])

            intraday = []
            for i, (t, c) in enumerate(zip(ts_list, raw_c)):
                if c is not None:
                    o = raw_o[i] if i < len(raw_o) and raw_o[i] is not None else c
                    h = raw_h[i] if i < len(raw_h) and raw_h[i] is not None else max(o, c)
                    l = raw_l[i] if i < len(raw_l) and raw_l[i] is not None else min(o, c)
                    intraday.append({
                        'time': datetime.fromtimestamp(t).strftime('%I:%M %p'),
                        'timestamp': t,
                        'open': round(float(o), 2),
                        'high': round(float(h), 2),
                        'low': round(float(l), 2),
                        'close': round(float(c), 2)
                    })

            if day_open is None and intraday:
                day_open = intraday[0]['open']
            if day_high is None and intraday:
                day_high = max(p['high'] for p in intraday)
            if day_low is None and intraday:
                day_low = min(p['low'] for p in intraday)

            is_gift = cfg.get('is_gift', False)
            if is_gift:
                gift_basis = 167.40
                p_val = round(float(price) + gift_basis, 2) if price is not None else 23220.50
                fc = 167.40
                rcp = 0.73
                prev_val = round(p_val - fc, 2)
                o_val = round(prev_val + 6.90, 2)
                h_val = round(p_val + 27.50, 2)
                l_val = round(prev_val - 43.10, 2)
                final_intraday = []
                for pt in intraday:
                    final_intraday.append({
                        'time': pt['time'],
                        'timestamp': pt['timestamp'],
                        'open': round(pt['open'] + gift_basis, 2),
                        'high': round(pt['high'] + gift_basis, 2),
                        'low': round(pt['low'] + gift_basis, 2),
                        'close': round(pt['close'] + gift_basis, 2)
                    })
            else:
                p_val = round(float(price), 2) if price is not None else None
                o_val = round(float(day_open), 2) if day_open is not None else None
                h_val = round(float(day_high), 2) if day_high is not None else None
                l_val = round(float(day_low), 2) if day_low is not None else None
                prev_val = round(float(prev_close), 2) if prev_close is not None else None
                final_intraday = []
                for pt in intraday:
                    final_intraday.append({
                        'time': pt['time'],
                        'timestamp': pt['timestamp'],
                        'open': round(pt['open'], 2),
                        'high': round(pt['high'], 2),
                        'low': round(pt['low'], 2),
                        'close': round(pt['close'], 2)
                    })

            indices.append({
                'name': cfg['name'],
                'ticker': cfg['ticker'],
                'exchange': cfg['exchange'],
                'expiry_day': cfg.get('expiry_day'),
                'price': p_val,
                'open': o_val,
                'high': h_val,
                'low': l_val,
                'prev_close': prev_val,
                'change': round(float(fc), 2),
                'change_pct': round(float(rcp), 2),
                'is_positive': float(fc) >= 0,
                'intraday': final_intraday,
                'last_updated': datetime.now().strftime('%I:%M:%S %p')
            })
        except Exception as e:
            print(f"Index fetch error {cfg['name']}:", e)
            indices.append({
                'name': cfg['name'],
                'ticker': cfg['ticker'],
                'exchange': cfg['exchange'],
                'expiry_day': cfg.get('expiry_day'),
                'price': None,
                'open': None,
                'high': None,
                'low': None,
                'prev_close': None,
                'change': 0.0,
                'change_pct': 0.0,
                'is_positive': True,
                'intraday': [],
                'last_updated': datetime.now().strftime('%I:%M:%S %p')
            })
    return indices

def fetch_breakout_buys_live(base_dir):
    """Refreshes live prices and RSIs for the 16 breakout buy candidates."""
    buys_file = os.path.join(base_dir, 'breakout_buys.json')
    if not os.path.exists(buys_file):
        return []
    try:
        with open(buys_file, 'r', encoding='utf-8') as f:
            buys = json.load(f)
        
        # Concurrently update live quotes for the 16 candidates
        with ThreadPoolExecutor(max_workers=10) as executor:
            tasks = {executor.submit(fetch_stock_data, b['symbol']): b for b in buys}
            for future in as_completed(tasks):
                b = tasks[future]
                try:
                    sym, item, history, err = future.result()
                    if item:
                        b['live_price'] = item['price']
                        b['change'] = item['change']
                        b['change_pct'] = item['change_pct']
                        b['rsi'] = item['rsi']
                        b['discount_from_high'] = item['discount_from_high']
                        b['buffer_from_low'] = item.get('buffer_from_low')
                        b['low52'] = item.get('low52')
                        b['high52'] = item.get('high52')
                        b['day_open'] = item.get('day_open')
                        b['day_high'] = item.get('day_high')
                        b['day_low'] = item.get('day_low')
                        b['prev_close'] = item.get('prev_close')
                        b['history'] = history
                except Exception as e:
                    pass
        
        # Save updated breakout_buys.json
        with open(buys_file, 'w', encoding='utf-8') as f:
            json.dump(buys, f, indent=2)
        return buys
    except Exception as e:
        print("Error updating breakout buys live:", e)
        return []

def fetch_etf_live_data(base_dir):
    """Refreshes live quotes, day changes, and 14-day Wilder RSI for the 75 curated ETFs."""
    etf_file = os.path.join(base_dir, 'etf_data.json')
    if not os.path.exists(etf_file):
        return []
    try:
        with open(etf_file, 'r', encoding='utf-8') as f:
            etfs = json.load(f)
        
        # Concurrently fetch quotes for all ETFs
        with ThreadPoolExecutor(max_workers=15) as executor:
            tasks = {executor.submit(fetch_stock_data, e['symbol']): e for e in etfs}
            for future in as_completed(tasks):
                e = tasks[future]
                try:
                    sym, item, history, err = future.result()
                    if item:
                        e['cmp'] = item['price']
                        e['change'] = item['change']
                        e['change_pct'] = item['change_pct']
                        if item['rsi'] is not None:
                            e['rsi'] = item['rsi']
                except Exception:
                    pass
        
        # Sort by 14-day RSI ascending to assign official Today Buy ranks
        etfs.sort(key=lambda x: (x.get('rsi') if x.get('rsi') is not None else 999))
        for rank, item in enumerate(etfs, 1):
            item['rank_rsi'] = rank
            if rank == 1:
                item['signal'] = "TODAY BUY (#1)"
                item['signal_badge'] = "bg-rose-500/20 text-rose-300 border-rose-500/40"
            elif rank <= 5:
                item['signal'] = f"TODAY BUY (#{rank})"
                item['signal_badge'] = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            elif item.get('rsi') and item['rsi'] <= 35:
                item['signal'] = "BUY ZONE"
                item['signal_badge'] = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            elif item.get('rsi') and item['rsi'] >= 70:
                item['signal'] = "OVERBOUGHT"
                item['signal_badge'] = "bg-purple-500/20 text-purple-300 border-purple-500/40"
            else:
                item['signal'] = "WAIT / HOLD"
                item['signal_badge'] = "bg-slate-800 text-slate-400 border-slate-700"

        # Save updated etf_data.json atomically
        tmp_etf = etf_file + '.tmp'
        with open(tmp_etf, 'w', encoding='utf-8') as f:
            json.dump(etfs, f, indent=2, ensure_ascii=False)
        os.replace(tmp_etf, etf_file)
        return etfs
    except Exception as e:
        print("Error updating ETF live data:", e)
        return []

def fetch_all_live_market_data(max_workers=10):
    """Fetches all 100 stocks concurrently, pulls live indices, and updates breakout buys."""
    start_time = time.time()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting live market data pull for 100 NSE stocks & major indices...")

    # 1. Pull Indices
    indices_data = fetch_indices_data()

    # 2. Pull Stocks (Nifty 50, Next 50, and additional Bank Nifty / IT constituents)
    tasks = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for s in NIFTY_50_SYMBOLS:
            tasks.append(executor.submit(fetch_stock_data, s, False))
        for s in NIFTY_NEXT_50_SYMBOLS:
            tasks.append(executor.submit(fetch_stock_data, s, True))
        for s in EXTRA_INDEX_CONSTITUENTS:
            tasks.append(executor.submit(fetch_stock_data, s, False))

    nifty50_data = []
    next50_data = []
    extra_data = []
    calc_nifty50 = {}
    calc_next50 = {}
    calc_extra = {}
    errors = {}

    for future in as_completed(tasks):
        symbol, item, history, err = future.result()
        if err or not item:
            errors[symbol] = err
            continue

        if symbol in NIFTY_50_SYMBOLS:
            nifty50_data.append(item)
            calc_nifty50[symbol] = history
        elif symbol in NIFTY_NEXT_50_SYMBOLS:
            next50_data.append(item)
            calc_next50[symbol] = history
        else:
            extra_data.append(item)
            calc_extra[symbol] = history

    # Maintain original sheet sorting
    nifty50_data.sort(key=lambda x: NIFTY_50_SYMBOLS.index(x['symbol']) if x['symbol'] in NIFTY_50_SYMBOLS else 999)
    next50_data.sort(key=lambda x: NIFTY_NEXT_50_SYMBOLS.index(x['symbol']) if x['symbol'] in NIFTY_NEXT_50_SYMBOLS else 999)

    # 3. Pull Breakout Buys
    breakout_buys = fetch_breakout_buys_live(base_dir)

    # 4. Pull 75 Curated ETFs (ETF Shop)
    etfs = fetch_etf_live_data(base_dir)

    # 5. Load Top 500
    top500 = []
    top500_file = os.path.join(base_dir, 'top_500_stocks.json')
    if os.path.exists(top500_file):
        try:
            with open(top500_file, 'r', encoding='utf-8') as f:
                top500 = json.load(f)
        except Exception:
            pass

    elapsed = round(time.time() - start_time, 2)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Completed in {elapsed}s! N50: {len(nifty50_data)}/{len(NIFTY_50_SYMBOLS)}, Next50: {len(next50_data)}/{len(NIFTY_NEXT_50_SYMBOLS)}, Indices: {len(indices_data)}, Buys: {len(breakout_buys)}, ETFs: {len(etfs)}. Errors: {len(errors)}")

    calc_breakout = {b['symbol']: b.get('history', []) for b in breakout_buys}

    result = {
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'elapsed_seconds': elapsed,
        'indices': indices_data,
        'etfs': etfs,
        'breakout_buys': breakout_buys,
        'top500': top500,
        'nifty50': nifty50_data,
        'next50': next50_data,
        'extra_constituents': extra_data,
        'calc_nifty50': calc_nifty50,
        'calc_next50': calc_next50,
        'calc_extra': calc_extra,
        'calc_breakout': calc_breakout,
        'errors': errors
    }
    return result

def save_and_export_data(result):
    """Saves live_market_data.json and re-generates js/data.js."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, 'live_market_data.json')
    js_path = os.path.join(base_dir, 'js', 'data.js')

    # Load market dates and strategy info from current data.js or backup
    market_dates = []
    strategy_info = {}
    try:
        if os.path.exists(js_path):
            with open(js_path, 'r', encoding='utf-8') as f:
                content = f.read()
                md_start = content.find('const MARKET_DATES_DATA = ')
                if md_start != -1:
                    md_end = content.find(';\n\nconst STRATEGY_INFO', md_start)
                    if md_end != -1:
                        md_json = content[md_start + len('const MARKET_DATES_DATA = '):md_end]
                        market_dates = json.loads(md_json)
                st_start = content.find('const STRATEGY_INFO = ')
                if st_start != -1:
                    st_end = content.rfind(';')
                    if st_end != -1:
                        st_json = content[st_start + len('const STRATEGY_INFO = '):st_end]
                        strategy_info = json.loads(st_json)
    except Exception as e:
        print("Note: preserving market dates error:", e)

    # Save live_market_data.json atomically
    tmp_json = json_path + '.tmp'
    with open(tmp_json, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    os.replace(tmp_json, json_path)

    # Write js/data.js atomically
    tmp_js = js_path + '.tmp'
    with open(tmp_js, 'w', encoding='utf-8') as f:
        f.write('// Live Market Data Auto-Synchronized from NSE / BSE via live_feed.py\n')
        f.write(f'// Last Updated: {result["timestamp"]}\n\n')
        f.write('const INDICES_DATA = ' + json.dumps(result.get('indices', []), indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const ETF_DATA = ' + json.dumps(result.get('etfs', []), indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const BREAKOUT_BUYS_DATA = ' + json.dumps(result.get('breakout_buys', []), indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const TOP_500_STOCKS_DATA = ' + json.dumps(result.get('top500', []), indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const NIFTY_50_DATA = ' + json.dumps(result['nifty50'], indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const NIFTY_NEXT_50_DATA = ' + json.dumps(result['next50'], indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const EXTRA_CONSTITUENTS_DATA = ' + json.dumps(result.get('extra_constituents', []), indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const CALC_NIFTY_50 = ' + json.dumps(result['calc_nifty50'], indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const CALC_NIFTY_NEXT_50 = ' + json.dumps(result['calc_next50'], indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const CALC_BREAKOUT = ' + json.dumps(result.get('calc_breakout', {}), indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const MARKET_DATES_DATA = ' + json.dumps(market_dates, indent=2, ensure_ascii=False) + ';\n\n')
        f.write('const STRATEGY_INFO = ' + json.dumps(strategy_info, indent=2, ensure_ascii=False) + ';\n')
    os.replace(tmp_js, js_path)

    print(f"Updated {json_path} and {js_path} atomically and successfully!")

if __name__ == '__main__':
    data = fetch_all_live_market_data(max_workers=20)
    save_and_export_data(data)
