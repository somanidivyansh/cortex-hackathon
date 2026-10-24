/**
 * Home Portfolio — View Script (Animaciones de frontend)
 *
 * 1. Tarjetas: mazo de cartas que se abre en abanico cuando entra en pantalla.
 * 2. Comentarios Figma: aparecen desde distintas direcciones cuando cada uno entra en pantalla.
 * 3. Apps decorativas: zoom + bounce cuando cada una entra en pantalla.
 * 4. Título: líneas punteadas se dibujan progresivamente (clip-path).
 *
 * El slider de logos ya no vive acá: es el bloque `onlines/slider-logos`, que
 * este bloque renderiza por código y trae su propio view script.
 *
 * CONFIGURACIÓN DE ANIMACIÓN DE TARJETAS:
 * Editar las CSS custom properties en .home-portfolio__tarjetas:
 *   --hp-card-speed      → duración de la transición (default: 0.8s)
 *   --hp-card-delay-step → delay entre cada tarjeta (default: 0.15s)
 *   --hp-card-easing     → curva de la transición (default: cubic-bezier(0.34, 1.56, 0.64, 1))
 */
(function () {
    'use strict';

    var BLOQUE_SELECTOR       = '.home-portfolio';
    var TARJETAS_SELECTOR     = '.js-home-portfolio-tarjetas';
    var COMENTARIO_SELECTOR   = '.js-home-portfolio-comentario';
    var APP_SELECTOR          = '.js-home-portfolio-app';
    var TITULO_SELECTOR       = '.home-portfolio__titulo';

    var ENTRY_STAGGER_MAX     = 300; /* ms — offset máximo tras entrar en pantalla */
    var ENTRY_STAGGER_BASE    = 700; /* ms — delay máximo original en los data-delay del bloque */
    var TARJETAS_ENTRY_DELAY  = 150; /* ms — pequeño respiro antes de abrir el mazo */

    /* ==================================================================
       Inicialización del bloque
       ================================================================== */
    function initBloque() {
        var bloque = document.querySelector(BLOQUE_SELECTOR);
        if (!bloque) return;

        var tarjetas    = bloque.querySelector(TARJETAS_SELECTOR);
        var comentarios = bloque.querySelectorAll(COMENTARIO_SELECTOR);
        var apps        = bloque.querySelectorAll(APP_SELECTOR);
        var titulo      = bloque.querySelector(TITULO_SELECTOR);

        /* Animaciones disparadas por IntersectionObserver.
           Cada elemento se anima cuando él mismo entra en pantalla,
           no cuando entra la sección completa. */
        if ('IntersectionObserver' in window) {
            observeTituloOnEnter(bloque, titulo);
            observeTarjetasOnEnter(tarjetas);
            observeElementsOnEnter(comentarios);
            observeElementsOnEnter(apps);
        } else {
            /* Fallback: animar inmediatamente */
            revealAll(bloque, tarjetas, comentarios, apps);
        }
    }

    /* ==================================================================
       Orquestación de animaciones (disparo por elemento)
       ================================================================== */

    /* Delay escalonado comprimido a partir del data-delay original */
    function scaledDelay(el) {
        var raw = parseInt(el.getAttribute('data-delay'), 10) || 0;
        return Math.round(raw / ENTRY_STAGGER_BASE * ENTRY_STAGGER_MAX);
    }

    /* Comentarios y apps: revelar cada uno al entrar en pantalla */
    function observeElementsOnEnter(elementos) {
        if (!elementos.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                observer.unobserve(el);
                setTimeout(function () {
                    el.classList.add('is-visible');
                }, scaledDelay(el));
            });
        }, { threshold: 0.35 });

        elementos.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* Tarjetas: abrir el mazo en abanico cuando el mazo entra en pantalla */
    function observeTarjetasOnEnter(tarjetas) {
        if (!tarjetas) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                setTimeout(function () {
                    tarjetas.classList.add('is-fanned');
                }, TARJETAS_ENTRY_DELAY);
            });
        }, { threshold: 0.25 });

        observer.observe(tarjetas);
    }

    /* Título: activar el dibujo de líneas punteadas cuando el título entra en pantalla */
    function observeTituloOnEnter(bloque, titulo) {
        if (!titulo) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                bloque.classList.add('is-animated');
            });
        }, { threshold: 0.5 });

        observer.observe(titulo);
    }

    /* Fallback sin IntersectionObserver: revelar todo de inmediato */
    function revealAll(bloque, tarjetas, comentarios, apps) {
        bloque.classList.add('is-animated');
        if (tarjetas) tarjetas.classList.add('is-fanned');
        comentarios.forEach(function (el) { el.classList.add('is-visible'); });
        apps.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ==================================================================
       Iniciar cuando el DOM esté listo
       ================================================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBloque);
    } else {
        initBloque();
    }
})();
