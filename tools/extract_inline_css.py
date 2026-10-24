from bs4 import BeautifulSoup
import re

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8', errors='ignore') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

styles = soup.find_all('style')
combined = []
for s in styles:
    sid = s.get('id', 'inline')
    combined.append(f"/* === Style: {sid} === */\n" + s.text.strip())

all_inline_css = "\n\n".join(combined)

# Replace remote font URLs with local paths
all_inline_css = re.sub(
    r'https://onlines\.com\.ar/wp-content/themes/onlines-web-2026/assets/fonts/inter-display/([^\'\")]+)',
    r'../fonts/\1',
    all_inline_css
)
all_inline_css = re.sub(
    r'https://onlines\.com\.ar/wp-content/themes/onlines-web-2026/assets/fonts/jetbrains-mono/([^\'\")]+)',
    r'../fonts/\1',
    all_inline_css
)

with open('d:/Work/cortex hackathon/css/theme-inline.css', 'w', encoding='utf-8') as f:
    f.write(all_inline_css)

print("Saved theme-inline.css, total length:", len(all_inline_css))
