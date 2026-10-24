import os

js_dir = 'd:/Work/cortex hackathon/js'
for fname in os.listdir(js_dir):
    fpath = os.path.join(js_dir, fname)
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if 'https://onlines.com.ar' in content:
        print(f"Match in {fname}")
