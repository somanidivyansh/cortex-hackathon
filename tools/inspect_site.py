from bs4 import BeautifulSoup

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8', errors='ignore') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

entry = soup.find(class_='entry-content')
if entry:
    for i, child in enumerate(entry.children):
        if child.name:
            print(f'[{i}] <{child.name} class="{child.get("class")}" id="{child.get("id")}">'[:140])
