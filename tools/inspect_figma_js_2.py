with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('SELECCION_SELECTOR =')
idx2 = text.find('SELECCION_SELECTOR', idx + 30)
print(text[idx2:idx2+1500])
