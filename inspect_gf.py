import requests
import re

url = "https://www.google.com/finance/quote/HDFCBANK:NSE"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
r = requests.get(url, headers=headers)

print("Status:", r.status_code)
# Search for numbers and labels
for line in r.text.split('\n'):
    if 'YMlKec' in line or 'P6K39c' in line:
        print("Found line:", line[:200])
        break

# Let's find price
matches = re.findall(r'<div[^>]*class="[^"]*YMlKec[^"]*"[^>]*>(.*?)</div>', r.text)
print("YMlKec elements:", matches[:5])

# Let's find all label/value pairs in stats table
labels = re.findall(r'<div class="mfs7Fc">(.*?)</div>\s*<div class="P6K39c">(.*?)</div>', r.text)
print("Stats found:", labels)
