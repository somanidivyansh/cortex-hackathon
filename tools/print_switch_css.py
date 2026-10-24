with open('d:/Work/cortex hackathon/css/home-hero.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'home-hero__switch' in line:
        for j in range(max(0, i-2), min(len(lines), i+30)):
            print(lines[j], end='')
        break
