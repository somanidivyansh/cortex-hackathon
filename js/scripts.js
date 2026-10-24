//import "./main.js";

const LENIS_SCROLL_LOCK_CLASS = 'is-hero-scroll-lock';

const stopLenis = () => {
    if (!window.cadenceLenis || typeof window.cadenceLenis.stop !== 'function') {
        return;
    }

    window.cadenceLenis.stop();
};

const startLenis = () => {
    const root = document.documentElement;

    if (
        root.classList.contains(LENIS_SCROLL_LOCK_CLASS) ||
        !window.cadenceLenis ||
        typeof window.cadenceLenis.start !== 'function'
    ) {
        return;
    }

    window.cadenceLenis.start();
};

const initLenis = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof window.Lenis === 'undefined') {
        return;
    }

    window.cadenceLenis = new window.Lenis({
        autoRaf: true,
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.2,
    });

    if (document.documentElement.classList.contains(LENIS_SCROLL_LOCK_CLASS)) {
        stopLenis();
    }
};

window.addEventListener('cadence:lenis-stop', stopLenis);
window.addEventListener('cadence:lenis-start', startLenis);

initLenis();

// El CTA del header es fijo (ver .header .wp-block-buttons en css/partials/_main.scss),
// así que sigue visible cuando el hero oscuro del single ya pasó de largo.
// Este observador le agrega el modificador --alt mientras el botón está sobre ese hero
// y se lo saca cuando lo traspasa, para que vuelva al estilo por defecto.

const BTN_CALL_SELECTOR = '.header__btn-call';
const BTN_CALL_ALT_CLASS = 'header__btn-call--alt';
const HERO_OSCURO_SELECTOR = '.single__hero:not(.fondo-shader--grilla)';

const initBotonCallAlt = () => {
    const boton = document.querySelector(BTN_CALL_SELECTOR);
    const hero = document.querySelector(HERO_OSCURO_SELECTOR);

    if (!boton || !hero || typeof window.IntersectionObserver === 'undefined') {
        return;
    }

    let observador = null;

    // Observa una banda de 1px a la altura del centro del botón: si el hero la cubre,
    // el botón está sobre fondo oscuro. Evita escuchar el scroll, que pelearía con Lenis.
    const observarBanda = () => {
        if (observador) {
            observador.disconnect();
        }

        const caja = boton.getBoundingClientRect();
        const centro = Math.round(caja.top + caja.height / 2);
        const alto = window.innerHeight;
        const margenSuperior = Math.min(Math.max(centro, 0), alto - 1);
        const margenInferior = alto - margenSuperior - 1;

        observador = new IntersectionObserver(
            (entradas) => {
                entradas.forEach((entrada) => {
                    boton.classList.toggle(BTN_CALL_ALT_CLASS, entrada.isIntersecting);
                });
            },
            {
                rootMargin: `-${margenSuperior}px 0px -${margenInferior}px 0px`,
                threshold: 0,
            }
        );

        observador.observe(hero);
    };

    let temporizadorResize = null;

    window.addEventListener('resize', () => {
        window.clearTimeout(temporizadorResize);
        temporizadorResize = window.setTimeout(observarBanda, 150);
    });

    observarBanda();
};

initBotonCallAlt();

