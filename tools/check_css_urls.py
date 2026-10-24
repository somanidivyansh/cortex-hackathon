import os
import re

css_dir = 'd:/Work/cortex hackathon/css'
for fname in os.listdir(css_dir):
    fpath = os.path.join(css_dir, fname)
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    urls = re.findall(r'url\s*\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', content)
    if urls:
        print(f"=== {fname} ({len(urls)} urls) ===")
        for u in set(urls):
            print("  ", u)
