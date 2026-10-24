import re

with open('d:/Work/cortex hackathon/css/theme-inline.css', 'r', encoding='utf-8') as f:
    css = f.read()

ffs = re.findall(r'@font-face\s*\{[^}]+\}', css)
print("Font-face rules in theme-inline.css:", len(ffs))
for f in ffs[:3]:
    print(f)
