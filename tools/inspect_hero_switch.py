with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    code = f.read()

import re
matches = [line for line in code.split('\n') if 'switch' in line.lower()]
for m in matches[:15]:
    print(m)
