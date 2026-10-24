import re
import os
from bs4 import BeautifulSoup, Comment

with open('d:/Work/cortex hackathon/source_page.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

# Remove unwanted scripts from the original WordPress site
for s in list(soup.find_all('script')):
    # Remove GTM, Speculation Rules, View Transitions, admin-ajax
    txt = s.text
    src = s.get('src', '')
    if 'googletagmanager' in src or 'gtm.js' in txt:
        s.decompose()
    elif 'plvt' in src or 'plvt' in (s.get('id') or '') or 'plvtInitViewTransitions' in txt:
        s.decompose()
    elif 'speculation' in txt or 'speculation-rules' in src:
        s.decompose()
    elif 'optimization-detective' in src or 'performance-lab' in src:
        s.decompose()
    elif s.get('type') == 'application/ld+json':
        pass # keep schema.org

# Remove WordPress generator meta tags
for m in list(soup.find_all('meta')):
    if m.get('name') == 'generator':
        m.decompose()

# Clean up all remote link stylesheet tags and replace with local ones
for link in list(soup.find_all('link', rel='stylesheet')):
    link.decompose()

# Clean up all inline style tags that we extracted into theme-inline.css
for st in list(soup.find_all('style')):
    st.decompose()

# Update head with local stylesheet links
head = soup.find('head')
if head:
    # Set favicon
    fav = soup.find('link', rel=lambda r: r and 'icon' in r)
    if not fav:
        new_fav = soup.new_tag('link', rel='icon', href='./assets/cropped-favicon-32x32-1-32x32.png')
        head.append(new_fav)
    else:
        fav['href'] = './assets/cropped-favicon-32x32-1-32x32.png'

    # Add stylesheets in correct order
    css_files = [
        './css/lenis.css',
        './css/swiper.min.css',
        './css/theme-inline.css',
        './css/styles.css',
        './css/home-hero.css',
        './css/card-servicio.css',
        './css/home-bloque-dark-mode.css',
        './css/home-equipo.css',
        './css/home-portfolio.css',
        './css/card-noticia.css',
        './css/home-contacto.css'
    ]
    for css in css_files:
        link_tag = soup.new_tag('link', rel='stylesheet', href=css)
        head.append(link_tag)

# Update all images and picture sources to point to local ./assets/
for img in soup.find_all('img'):
    src = img.get('src', '')
    if src:
        fname = src.split('?')[0].split('/')[-1]
        img['src'] = f'./assets/{fname}'
    if img.get('srcset'):
        parts = []
        for part in img['srcset'].split(','):
            u = part.strip().split(' ')
            fn = u[0].split('?')[0].split('/')[-1]
            desc = (" " + u[1]) if len(u) > 1 else ""
            parts.append(f'./assets/{fn}{desc}')
        img['srcset'] = ", ".join(parts)

for s in soup.find_all('source'):
    if s.get('srcset'):
        parts = []
        for part in s['srcset'].split(','):
            u = part.strip().split(' ')
            fn = u[0].split('?')[0].split('/')[-1]
            desc = (" " + u[1]) if len(u) > 1 else ""
            parts.append(f'./assets/{fn}{desc}')
        s['srcset'] = ", ".join(parts)

# Remove old external script tags
for s in list(soup.find_all('script')):
    if s.get('src'):
        s.decompose()

# Clean up any leftover inline config script with remote url
for s in list(soup.find_all('script')):
    if 'wp-admin/admin-ajax.php' in s.text:
        s.decompose()

# Now find or create scripts block at end of body
body = soup.find('body')

# Update Hero elements according to user screenshot:
# 1. Title: internet. -> Internet.
hero_title = soup.find(class_='home-hero__titulo')
if hero_title:
    hero_title.string = 'Internet.'

# 2. Header button: Hablemos -> Let's talk
btn_call = soup.find(class_='header__btn-call')
if btn_call:
    link = btn_call.find('a')
    if link:
        link.string = "Let's talk"

# 3. Switch: Modo IA -> AI Mode
switch_label = soup.find(class_='home-hero__switch-label')
if switch_label:
    switch_label.string = 'AI Mode'

# 4. Cursor labels:
cursor_translations = {
    'home-hero__cursor--desarrollador': 'Developer',
    'home-hero__cursor--cliente': 'Customer',
    'home-hero__cursor--director': 'Creative Director',
    'home-hero__cursor--ui': 'UI Designer',
    'home-hero__cursor--ux': 'UX Designer',
    'home-hero__cursor--pm': 'Project Manager',
    'home-hero__cursor--desarrollador2': 'Developer'
}
for cls_name, text in cursor_translations.items():
    cursor_el = soup.find(class_=cls_name)
    if cursor_el:
        lbl = cursor_el.find(class_='home-hero__cursor-label')
        if lbl:
            lbl.string = text

# 5. Figma comment bubbles in Hero:
hero_comentarios = soup.find_all(class_='home-hero__comentario')
if len(hero_comentarios) >= 2:
    # Comentario 1: "Online right now / Let's create your new website."
    c1 = hero_comentarios[0]
    c1_h = c1.find(class_='comentario-figma__header')
    if c1_h:
        c1_h.clear()
        c1_h.append(BeautifulSoup("<strong>Online</strong><span>right now</span>", 'html.parser'))
    c1_t = c1.find(class_='comentario-figma__texto')
    if c1_t:
        c1_t.string = "Let's create your new website."

    # Comentario 2: "Online right now / Designed and developed to order."
    c2 = hero_comentarios[1]
    c2_h = c2.find(class_='comentario-figma__header')
    if c2_h:
        c2_h.clear()
        c2_h.append(BeautifulSoup("<strong>Online</strong><span>right now</span>", 'html.parser'))
    c2_t = c2.find(class_='comentario-figma__texto')
    if c2_t:
        c2_t.string = "Designed and developed to order."

# Append scripts at end of body in optimal execution order
scripts_to_add = [
    './js/lenis.min.js',
    './js/swiper.min.js',
    './js/header-logo-view.js',
    './js/grilla-celdas-view.js',
    './js/home-hero-view.js',
    './js/patron-puntos-view.js',
    './js/home-quote-block-view.js',
    './js/card-servicio-view.js',
    './js/shader-halftone-view.js',
    './js/home-servicios-view.js',
    './js/home-bloque-dark-mode-view.js',
    './js/home-equipo-view.js',
    './js/slider-logos-view.js',
    './js/home-portfolio-view.js',
    './js/card-noticia-view.js',
    './js/ultimas-noticias-view.js',
    './js/home-contacto-view.js',
    './js/scripts.js'
]

for src in scripts_to_add:
    st = soup.new_tag('script', src=src)
    body.append(st)

# Add custom interactive script for AI Mode toggle and interactions
custom_interactive_script = soup.new_tag('script')
custom_interactive_script.string = """
document.addEventListener('DOMContentLoaded', () => {
    // Interactive AI Mode Toggle
    const switchPill = document.querySelector('.js-home-hero-switch');
    if (switchPill) {
        const toggle = switchPill.querySelector('.home-hero__switch-toggle');
        const knob = switchPill.querySelector('.home-hero__switch-toggle-knob');
        let isOn = true;

        const updateSwitch = () => {
            if (isOn) {
                toggle.style.background = '#0070F3';
                toggle.style.justifyContent = 'flex-end';
                knob.style.boxShadow = '0 2px 4px rgba(0,112,243,0.3)';
            } else {
                toggle.style.background = '#94a3b8';
                toggle.style.justifyContent = 'flex-start';
                knob.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
            }
        };

        switchPill.style.cursor = 'pointer';
        switchPill.addEventListener('click', (e) => {
            e.stopPropagation();
            isOn = !isOn;
            updateSwitch();
        });

        // Periodic subtle pulse/auto toggle demo
        let autoToggle = setInterval(() => {
            isOn = !isOn;
            updateSwitch();
        }, 6000);

        switchPill.addEventListener('mouseenter', () => clearInterval(autoToggle));
    }

    // Interactive 3D phone drag/rotate preview
    const phoneScreen = document.querySelector('.home-hero__celular');
    if (phoneScreen) {
        phoneScreen.style.cursor = 'grab';
        let isDragging = false;
        let startX = 0;
        let currentRot = 0;
        phoneScreen.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            phoneScreen.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            currentRot = dx * 0.15;
            phoneScreen.style.transform = `rotate(${currentRot}deg)`;
        });
        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            phoneScreen.style.cursor = 'grab';
            phoneScreen.style.transition = 'transform 0.5s ease-out';
            phoneScreen.style.transform = 'rotate(0deg)';
            setTimeout(() => { phoneScreen.style.transition = ''; }, 500);
        });
    }

    // Billboard subtle hover tilt
    const diseno = document.querySelector('.home-hero__diseno');
    if (diseno) {
        diseno.addEventListener('mousemove', (e) => {
            const rect = diseno.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            diseno.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`;
        });
        diseno.addEventListener('mouseleave', () => {
            diseno.style.transform = '';
        });
    }
});
"""
body.append(custom_interactive_script)

final_html = str(soup)

with open('d:/Work/cortex hackathon/index.html', 'w', encoding='utf-8') as f:
    f.write(final_html)

print("index.html created successfully! Size:", len(final_html))
