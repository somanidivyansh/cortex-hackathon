import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

hero = soup.find(class_='home-hero')

for el in hero.find_all(class_='home-hero__cursor'):
    label = el.find(class_='home-hero__cursor-label')
    cls = el.get('class')
    print('Cursor:', cls, 'Text:', label.get_text() if label else 'No label')

for el in hero.find_all(class_='comentario-figma__burbuja'):
    print('Comment bubble:', el.get_text(strip=True))

for el in hero.find_all(class_='home-hero__ia'):
    print('AI block:', el.get_text(strip=True), el)
