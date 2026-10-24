import re

with open('d:/Work/cortex hackathon/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace custom script in index.html with perfected version
new_script_block = """// Interactive AI Mode Toggle
    const switchPill = document.querySelector('.js-home-hero-switch');
    if (switchPill) {
        const toggle = switchPill.querySelector('.home-hero__switch-toggle');
        const knob = switchPill.querySelector('.home-hero__switch-toggle-knob');
        let isOn = true;

        const updateSwitch = () => {
            if (isOn) {
                toggle.style.background = '#0070F3';
                toggle.style.justifyContent = 'flex-end';
                toggle.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                knob.style.boxShadow = '0 2px 4px rgba(0,112,243,0.4)';
            } else {
                toggle.style.background = '#cbd5e1';
                toggle.style.justifyContent = 'flex-start';
                toggle.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                knob.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
            }
        };

        // Call immediately on load to ensure bright blue state
        updateSwitch();

        switchPill.style.cursor = 'pointer';
        switchPill.addEventListener('click', (e) => {
            e.stopPropagation();
            isOn = !isOn;
            updateSwitch();
        });
    }"""

html = re.sub(
    r'// Interactive AI Mode Toggle.*?switchPill\.addEventListener\(\'mouseenter\', \(\) => clearInterval\(autoToggle\)\);\s*\}',
    new_script_block,
    html,
    flags=re.DOTALL
)

with open('d:/Work/cortex hackathon/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated script in index.html successfully!")
