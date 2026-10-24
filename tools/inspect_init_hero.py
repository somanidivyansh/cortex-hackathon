with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function initHero')
if idx == -1:
    idx = text.find('init(')
if idx == -1:
    idx = text.find('waitForFirstScroll')
print(text[idx-200:idx+800])
