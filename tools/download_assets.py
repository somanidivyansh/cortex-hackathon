import urllib.request
import os
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

urls = set()
for img in soup.find_all('img'):
    if img.get('src'):
        urls.add(img['src'])
for s in soup.find_all('source'):
    if s.get('srcset'):
        for part in s['srcset'].split(','):
            u = part.strip().split(' ')[0]
            if u:
                urls.add(u)

# Also check for fonts or other links
for l in soup.find_all('link'):
    href = l.get('href')
    if href and any(ext in href for ext in ['.woff', '.woff2', '.ttf', '.svg', '.png', '.ico']):
        urls.add(href)

css_dir = 'd:/Work/cortex hackathon/downloaded_assets/css'
for fname in os.listdir(css_dir):
    with open(os.path.join(css_dir, fname), 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        for match in re.findall(r'url\s*\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', content):
            if not match.startswith('data:'):
                urls.add(urljoin('https://onlines.com.ar/wp-content/themes/onlines-web-2026/css/', match))

print(f'Total unique asset URLs: {len(urls)}')
dest_dir = 'd:/Work/cortex hackathon/downloaded_assets/assets'
os.makedirs(dest_dir, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
success = 0
for u in sorted(urls):
    if not u.startswith('http'):
        u = urljoin('https://onlines.com.ar/', u)
    filename = u.split('?')[0].split('/')[-1]
    if not filename:
        continue
    filepath = os.path.join(dest_dir, filename)
    if os.path.exists(filepath):
        success += 1
        continue
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp, open(filepath, 'wb') as out:
            out.write(resp.read())
        success += 1
        print('Downloaded:', filename)
    except Exception as e:
        print(f'Failed {u}: {e}')

print(f'Downloaded {success} of {len(urls)} assets')
