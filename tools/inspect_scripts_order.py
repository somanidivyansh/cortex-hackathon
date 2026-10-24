from bs4 import BeautifulSoup

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8', errors='ignore') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

scripts = soup.find_all('script')
for i, s in enumerate(scripts):
    src = s.get('src')
    sid = s.get('id')
    content = s.text.strip()
    if src:
        print(f"[{i}] SRC: {src}")
    elif content:
        print(f"[{i}] INLINE id={sid} (len {len(content)}): {content[:100].replace(chr(10), ' ')}")
