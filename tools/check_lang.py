with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8') as f:
    text = f.read()

for word in ["Let's talk", "Hablemos", "UI Designer", "Diseñador UI", "Creative Director", "Director creativo", "Designed and developed"]:
    print(f"'{word}' in source_page.html:", word in text)
