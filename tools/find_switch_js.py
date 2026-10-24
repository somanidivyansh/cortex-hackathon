import os

js_dir = 'd:/Work/cortex hackathon/js'
for f in os.listdir(js_dir):
    with open(os.path.join(js_dir, f), 'r', encoding='utf-8', errors='ignore') as fp:
        c = fp.read()
    if 'home-hero__switch' in c or 'js-home-hero-switch' in c or 'is-on' in c or 'is-active' in c:
        print(f"Match in {f}")
