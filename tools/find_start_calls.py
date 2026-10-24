with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('startAnimations(')
while idx != -1:
    print(text[max(0, idx-100):idx+200])
    print("="*40)
    idx = text.find('startAnimations(', idx + 1)
