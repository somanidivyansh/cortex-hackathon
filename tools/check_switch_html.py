with open('d:/Work/cortex hackathon/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('home-hero__switch')
print(text[idx-50:idx+600])
