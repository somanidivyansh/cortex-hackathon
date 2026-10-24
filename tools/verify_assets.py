import os
import re
from bs4 import BeautifulSoup

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8', errors='ignore') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

available_assets = set(os.listdir('d:/Work/cortex hackathon/assets'))
print(f"Total available assets in assets/: {len(available_assets)}")

missing = set()
found = set()

for img in soup.find_all('img'):
    src = img.get('src', '')
    fname = src.split('?')[0].split('/')[-1]
    if fname:
        if fname in available_assets:
            found.add(fname)
        else:
            missing.add((fname, src))

for s in soup.find_all('source'):
    srcset = s.get('srcset', '')
    for part in srcset.split(','):
        u = part.strip().split(' ')[0]
        fname = u.split('?')[0].split('/')[-1]
        if fname:
            if fname in available_assets:
                found.add(fname)
            else:
                missing.add((fname, u))

print(f"Found in assets/: {len(found)}")
print(f"Missing ({len(missing)}):")
for fname, u in sorted(missing):
    print(" ", fname, "->", u)
