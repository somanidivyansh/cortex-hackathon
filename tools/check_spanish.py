import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'<h[1-6][^>]*>(.*?)</h[1-6]>', text, re.DOTALL)
for m in matches[:10]:
    clean = re.sub(r'<[^>]+>', '', m).strip()
    print("Heading:", clean)
