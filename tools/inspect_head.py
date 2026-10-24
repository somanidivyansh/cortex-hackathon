from bs4 import BeautifulSoup

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8', errors='ignore') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("Title:", soup.title.string if soup.title else "")
meta_tags = soup.find_all('meta')
for m in meta_tags:
    attrs = " ".join([f'{k}="{v}"' for k,v in m.attrs.items()])
    print(f"<meta {attrs}>")
