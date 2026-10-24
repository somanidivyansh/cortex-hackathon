with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [line for line in text.split('\n') if any(w in line.lower() for w in ['switch', 'ia', 'knob', 'pill'])]
print("Matches in home-hero-view.js:", len(matches))
for m in matches:
    print(" ", m.strip())
