with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('SCROLL_LOCK_FAILSAFE')
print(text[idx-200:idx+1500])
