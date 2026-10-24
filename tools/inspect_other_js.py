import os, sys
sys.stdout.reconfigure(encoding='utf-8')

scripts = [
    'home-bloque-dark-mode-view.js',
    'shader-halftone-view.js',
    'home-contacto-view.js',
    'card-servicio-view.js',
    'home-portfolio-view.js'
]

for s in scripts:
    path = os.path.join('d:/Work/cortex hackathon/downloaded_assets/js', s)
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"=== {s} ===")
    lines = content.split('\n')
    print('\n'.join(lines[:15]))
    print('...\n')
