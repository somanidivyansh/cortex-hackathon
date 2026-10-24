with open('d:/Work/cortex hackathon/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [line for line in text.split('\n') if 'seleccion' in line]
for m in matches:
    print(m)
