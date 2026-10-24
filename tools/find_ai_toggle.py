with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [line for line in text.split('\n') if any(w in line.lower() for w in ['modo ia', 'ai mode', 'switch', 'toggle', 'ai-mode', 'modo-ia'])]
print(f"Found {len(matches)} matches in HTML:")
for m in matches[:10]:
    print(m[:120])

with open('d:/Work/cortex hackathon/css/home-hero.css', 'r', encoding='utf-8') as f:
    css = f.read()

css_matches = [line for line in css.split('}') if any(w in line.lower() for w in ['ia', 'toggle', 'switch', 'modo'])]
print(f"Found {len(css_matches)} matches in home-hero.css:")
for m in css_matches[:10]:
    print(m.strip()[:120])
