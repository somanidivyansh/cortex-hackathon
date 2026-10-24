import urllib.request
import re
from bs4 import BeautifulSoup

base_url = "http://localhost:3000"

with open('d:/Work/cortex hackathon/index.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

urls_to_test = set()

for link in soup.find_all('link', rel='stylesheet'):
    href = link.get('href')
    if href and not href.startswith('http'):
        urls_to_test.add(href)

for script in soup.find_all('script'):
    src = script.get('src')
    if src and not src.startswith('http'):
        urls_to_test.add(src)

for img in soup.find_all('img'):
    src = img.get('src')
    if src and not src.startswith('http'):
        urls_to_test.add(src)

for s in soup.find_all('source'):
    srcset = s.get('srcset')
    if srcset:
        for part in srcset.split(','):
            u = part.strip().split(' ')[0]
            if u and not u.startswith('http'):
                urls_to_test.add(u)

print(f"Testing {len(urls_to_test)} local resources...")

failures = 0
for u in sorted(urls_to_test):
    clean_u = u.lstrip('./')
    url = f"{base_url}/{clean_u}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            if resp.status != 200:
                print(f"HTTP {resp.status}: {clean_u}")
                failures += 1
    except Exception as e:
        print(f"FAILED {clean_u}: {e}")
        failures += 1

print(f"Resource test complete. Failures: {failures}")
