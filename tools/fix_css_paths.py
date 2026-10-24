import os

css_dir = 'd:/Work/cortex hackathon/css'
for fname in os.listdir(css_dir):
    fpath = os.path.join(css_dir, fname)
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if '../images/' in content or 'home-hero-images' in content:
        print(f"File with image references: {fname}")
        content = content.replace('../images/cursor-onlines.svg', '../assets/cursor-onlines.svg')
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {fname}")
