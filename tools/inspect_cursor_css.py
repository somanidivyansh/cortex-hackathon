with open('d:/Work/cortex hackathon/css/home-hero.css', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('.home-hero__cursor')
print(text[idx:idx+1500])
