document.addEventListener('DOMContentLoaded', () => {
    const logos = document.querySelectorAll('.js-header-logo');
    if (!logos.length) return;

    logos.forEach((logo) => {
        const smallContainer = logo.querySelector('.js-header-logo-small');
        const fullContainer  = logo.querySelector('.js-header-logo-full');
        const dot             = logo.querySelector('.js-header-logo-dot');
        const bar             = logo.querySelector('.js-header-logo-bar');

        if (!smallContainer || !fullContainer || !dot || !bar) return;

        // Smooth quick reveal of the full "cadence" brand logo
        setTimeout(() => {
            bar.classList.add('header-logo--blink');
            setTimeout(() => {
                bar.classList.add('header-logo--erase');
                dot.classList.add('header-logo--erase');
                setTimeout(() => {
                    smallContainer.classList.add('header-logo__small--hidden');
                    fullContainer.classList.add('header-logo__full--visible');
                    fullContainer.classList.add('header-logo__full--animate-in');
                }, 200);
            }, 300);
        }, 300);
    });
});
