with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('initTyping')
if idx == -1:
    idx = code.find('TYPING_SELECTOR')
print(code[idx:idx+1500])
