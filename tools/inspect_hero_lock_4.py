with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function triggerAnimations')
print(text[idx-500:idx+800])
