import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

hero = soup.find(class_='home-hero')
ia = hero.find(class_='home-hero__ia')
print(ia.prettify() if ia else "Not found")
