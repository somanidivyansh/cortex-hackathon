import re

with open('d:/Work/cortex hackathon/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure AI mode toggle switch has the blue active style explicitly
old_toggle_css = """.home-hero__switch-toggle {"""
new_toggle_css = """.home-hero__switch-toggle {
    background: #0070F3 !important;
    justify-content: flex-end !important;
"""

# Let's add bilingual dictionary for instant toggle between English and Spanish
lang_script = """
<script>
window.currentLang = 'en';
const translations = {
    en: {
        title: "Internet.",
        callBtn: "Let's talk",
        aiMode: "AI Mode",
        c1Text: "Let's create your new website.",
        c2Text: "Designed and developed to order.",
        heroQuote: "We craft high-impact web experiences for forward-thinking enterprises, institutions and founders.",
        servicesH: "Services designed for modern internet",
        serv1: "Experience & Interface Design",
        serv2: "Bespoke Web Engineering",
        serv3: "Custom Digital Solutions",
        darkH: "From zero to one",
        darkDesc: "We build websites that thrive at the intersection of human emotion and AI intelligence.",
        darkBtn: "Schedule a discovery call",
        teamH: "A team that loves the internet.",
        portH: "Details are not details",
        portDesc: "Design and engineering are inseparable craft traditions in our studio.",
        portBtn: "Explore work",
        contactH: "Let's build something extraordinary together",
        contactDesc: "Transform your brand vision into an iconic digital flagship.",
        contactBtn: "Get in touch"
    },
    es: {
        title: "internet.",
        callBtn: "Hablemos",
        aiMode: "Modo IA",
        c1Text: "Hagamos tu nuevo sitio web.",
        c2Text: "Diseñado y desarrollado a medida.",
        heroQuote: "Hacemos sitios web de alta calidad para empresas, gobiernos y organizaciones.",
        servicesH: "Servicios",
        serv1: "Diseño de experiencias y de interfaces",
        serv2: "Desarrollo de sitios web a medida",
        serv3: "Servicios digitales personalizados",
        darkH: "De cero a uno",
        darkDesc: "Trabajamos bajo una metodología colaborativa que nos permite crear sitios web de alta calidad.",
        darkBtn: "Agendar una llamada",
        teamH: "Un equipo que ama internet.",
        portH: "Los detalles no son detalles",
        portDesc: "Consideramos que diseño y desarrollo son inseparables e indivisibles en nuestro proceso de trabajo.",
        portBtn: "Ver portfolio",
        contactH: "Hagamos un proyecto juntos",
        contactDesc: "Transformemos tus ideas en un sitio web de alta calidad que funcione alineado a tus objetivos.",
        contactBtn: "Hablemos"
    }
};

function toggleLanguage(lang) {
    window.currentLang = lang;
    const t = translations[lang];
    if (!t) return;

    // Update hero title
    const heroTitle = document.querySelector('.home-hero__titulo');
    if (heroTitle) heroTitle.innerText = t.title;

    // Update header CTA
    const callBtn = document.querySelector('.header__btn-call a');
    if (callBtn) callBtn.innerText = t.callBtn;

    // Update switch
    const switchLbl = document.querySelector('.home-hero__switch-label');
    if (switchLbl) switchLbl.innerText = t.aiMode;

    // Update chat bubbles
    const comments = document.querySelectorAll('.home-hero__comentario .comentario-figma__texto');
    if (comments.length >= 2) {
        comments[0].innerText = t.c1Text;
        comments[1].innerText = t.c2Text;
    }

    // Update language badge pills
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}
</script>
"""

# Add language toggle pill to header next to Let's talk
header_btn_marker = '<div class="wp-block-button header__btn-call'
replacement_btn = """<div class="lang-switcher" style="display:inline-flex; align-items:center; background:rgba(0,0,0,0.05); padding:3px 6px; border-radius:20px; margin-right:12px; font-family:var(--wp--preset--font-family--inter-display); font-size:12px; font-weight:600; pointer-events:auto; z-index:1001;">
    <button class="lang-btn active" data-lang="en" onclick="toggleLanguage('en')" style="border:none; background:#fff; color:#000; border-radius:15px; padding:3px 9px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1); font-weight:bold; transition:all 0.2s;">EN</button>
    <button class="lang-btn" data-lang="es" onclick="toggleLanguage('es')" style="border:none; background:transparent; color:#666; border-radius:15px; padding:3px 9px; cursor:pointer; font-weight:normal; transition:all 0.2s;">ES</button>
</div>
<div class="wp-block-button header__btn-call"""

if 'lang-switcher' not in content:
    content = content.replace(header_btn_marker, replacement_btn, 1)

# Add custom lang script before closing body
if 'window.currentLang' not in content:
    content = content.replace('</body>', lang_script + '</body>')

with open('d:/Work/cortex hackathon/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html with language switcher and styling refinements!")
