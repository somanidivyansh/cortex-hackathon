with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('SCROLL_LOCK_FAILSAFE =')
idx2 = text.find('SCROLL_LOCK_FAILSAFE', idx + 30)
print(text[idx2-100:idx2+1500])
