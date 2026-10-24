with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace SCROLL_LOCK_FAILSAFE from 8000 to 400 so animations start promptly
code = code.replace('var SCROLL_LOCK_FAILSAFE = 8000;', 'var SCROLL_LOCK_FAILSAFE = 400;')
code = code.replace('var SCROLL_LOCK_DURATION = 1500;', 'var SCROLL_LOCK_DURATION = 600;')

# In CODE_LINES, use clean English/modern code matching the screenshot
code = code.replace(
"""    var CODE_LINES = [
        '<!DOCTYPE html>',
        '<html lang="es">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <title>¡Hola Mundo!</title>',
        '</head>',
        '<body>',
        '    <h1>¡Hola Mundo!</h1>',
        '</body>',
        '</html>'
    ];""",
"""    var CODE_LINES = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <title>Hello Internet</title>',
        '</head>',
        '<body>',
        '    <h1>Online Studio</h1>',
        '</body>',
        '</html>'
    ];"""
)

with open('d:/Work/cortex hackathon/js/home-hero-view.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated home-hero-view.js successfully!")
