# 📈 Nifty Ki Dukan - Live Indian Stock Market RSI Analytics Engine

A fully automated, real-time stock analytics website for Indian equities based on **Mahesh Chander Kaushik's "RSI Based Nifty Ki Dukan"** trading strategy.

---

## ⚡ Direct Live Market Sync (No Excel Uploads Required!)

You **no longer need to upload Excel sheets every day**! The website now connects directly to live market feeds for the top 100 Indian blue chips (Nifty 50 and Nifty Next 50) and automatically calculates the true 14-period Wilder RSI, real-time prices, and strategy signals.

### 🌟 Key Live Features
1. **Automated Live Market Feed**:
   - Fetches live market closing prices, previous day changes, 52-week Highs, and 52-week Lows directly for all 100 NSE stocks.
   - Computes the exact **14-day Wilder RSI** mathematically for every stock:
     $$RS = \frac{\text{Average Gain (14)}}{\text{Average Loss (14)}}$$
     $$RSI = 100 - \frac{100}{1 + RS}$$
   - **Zero missing data**: Eliminated `#N/A` and `RSI: 0` errors by automatically resolving corporate renamings and demergers (e.g. *Tata Motors*, *LTIMindtree*, *Zomato/Eternal*, *ICICI Prudential Life*).

2. **One-Click Live Refresh**:
   - Click the green **"🔄 Refresh Live Data"** button at the top right to pull fresh market quotes from the National Stock Exchange in ~12 seconds.

3. **Background Auto-Refresh Scheduler**:
   - Choose your desired auto-refresh interval:
     - `Every 5m` | `Every 15m (Default)` | `Every 30m` | `Every 1h` | `Off (Manual)`
   - The system automatically refreshes all 100 stocks in the background without needing a page reload.

4. **Preserved Sleek Dark UI**:
   - **Sheet 1 & 3**: Comprehensive screeners for Nifty 50 & Nifty Next 50 with live RSI gauges, P/E ratios, and 52-Week Range Pin bars.
   - **Sheet 2 & 4**: Step-by-step historical calculation engines with interactive dual-axis Chart.js price & RSI graphs.
   - **Sheet 5**: Historical benchmark sessions & trading volume timeline.
   - **Compounding Simulator**: Interactive ₹5,000 $\to$ ₹2 Crore 338-trade compounding path.

---

## 🚀 How to Run

### Option 1: 1-Click Launch (Recommended)
Double-click:
```
Launch_Website.bat
```
*(This starts the live Python API server on `http://localhost:8080` with background auto-refresh enabled and automatically opens your browser).*

### Option 2: Terminal / Command Prompt
```powershell
python c:\Users\MANOJ\.gemini\antigravity\scratch\manoj_dashboard_extension\nifty_dukan_analytics\start_app.py
```
Open **[http://localhost:8080](http://localhost:8080)** in Google Chrome or Microsoft Edge.
