/**
 * Home Equipo — View Script (Animaciones de frontend)
 *
 * 1. Grilla interactiva de fondo (componente compartido grilla-celdas).
 * 2. Comentarios aparecen con fade-in cuando cada uno entra en pantalla.
 * 3. Integrantes aparecen con zoom-in cuando cada uno entra en pantalla.
 * 4. Selección de texto animada (highlight + borde + handles).
 */
(function () {
    'use strict';

    var BLOQUE_SELECTOR = '.home-equipo';
    var GRID_SELECTOR = '.js-home-equipo-grilla';
    var COMENTARIO_SELECTOR = '.js-home-equipo-comentario';
    var INTEGRANTE_SELECTOR = '.js-home-equipo-integrante';
    var SELECCION_SELECTOR = '.js-home-equipo-seleccion';
    var TITULO_WRAP_SELECTOR = '.home-equipo__titulo-wrap';
    var TITULO_HIGHLIGHT_SELECTOR = '.home-equipo__titulo .js-home-equipo-highlight, .home-equipo__titulo strong';
    var ENTRY_STAGGER_MAX = 300;   /* ms — offset máximo tras entrar en pantalla */
    var ENTRY_STAGGER_BASE = 1800; /* ms — delay máximo original en los data-delay */

    /* ---- Grilla interactiva ---- */
    /* La resuelve el componente compartido blocks/grilla-celdas/: las líneas son
       fondo CSS y el resaltado usa un pool de divs reciclados, con un solo
       listener. Antes había un div y un mouseenter por celda (~300 de cada uno). */
    function initInteractiveGrid(bloque) {
        var gridContainer = bloque.querySelector(GRID_SELECTOR);
        if (!gridContainer || !window.onlinesGrillaCeldas) return;

        window.onlinesGrillaCeldas.init({ contenedor: gridContainer });
    }

    /* ---- Inicialización del bloque ---- */
    function initBloque() {
        var bloque = document.querySelector(BLOQUE_SELECTOR);
        if (!bloque) return;

        /* Grilla inmediata */
        initInteractiveGrid(bloque);

        var comentarios = bloque.querySelectorAll(COMENTARIO_SELECTOR);
        var integrantes = bloque.querySelectorAll(INTEGRANTE_SELECTOR);
        var seleccion = bloque.querySelector(SELECCION_SELECTOR);

        positionSelectionOnStrong(bloque, seleccion);

        window.addEventListener('resize', function () {
            positionSelectionOnStrong(bloque, seleccion);
        });

        if ('IntersectionObserver' in window) {
            /* Cada elemento se anima cuando él mismo entra en pantalla,
               no cuando entra la sección completa. */
            observeElementsOnEnter(comentarios);
            observeElementsOnEnter(integrantes);
            observeSelectionOnEnter(bloque, seleccion);
        } else {
            revealAll(comentarios, integrantes, seleccion);
        }
    }

    /* ---- Delay escalonado comprimido a partir del data-delay original ---- */
    function scaledDelay(el) {
        var raw = parseInt(el.getAttribute('data-delay'), 10) || 0;
        return Math.round(raw / ENTRY_STAGGER_BASE * ENTRY_STAGGER_MAX);
    }

    /* ---- Observa cada elemento y lo revela al entrar en pantalla ---- */
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

    /* ---- Observa el título y dispara la selección al entrar en pantalla ---- */
    function observeSelectionOnEnter(bloque, seleccion) {
        if (!seleccion) return;

        var tituloWrap = bloque.querySelector(TITULO_WRAP_SELECTOR);
        if (!tituloWrap) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                /* Recalcular la posición justo antes de animar, por si las
                   fuentes terminaron de cargar tras el init. */
                positionSelectionOnStrong(bloque, seleccion);
                startSeleccionAnimation(seleccion);
            });
        }, { threshold: 0.5 });

        observer.observe(tituloWrap);
    }

    /* ---- Fallback sin IntersectionObserver: revelar todo de inmediato ---- */
    function revealAll(comentarios, integrantes, seleccion) {
        comentarios.forEach(function (el) { el.classList.add('is-visible'); });
        integrantes.forEach(function (el) { el.classList.add('is-visible'); });
        if (seleccion) startSeleccionAnimation(seleccion);
    }

    /* ---- Posicionar selección según el texto en strong ---- */
    function positionSelectionOnStrong(bloque, seleccion) {
        if (!bloque || !seleccion) return;

        var tituloWrap = bloque.querySelector(TITULO_WRAP_SELECTOR);
        var strongTarget = bloque.querySelector(TITULO_HIGHLIGHT_SELECTOR);

        if (!tituloWrap || !strongTarget) return;

        var wrapRect = tituloWrap.getBoundingClientRect();
        var strongRect = strongTarget.getBoundingClientRect();

        if (!wrapRect.width || !strongRect.width) return;

        var paddingX = 4;
        var paddingY = 6;
        var left = strongRect.left - wrapRect.left - paddingX;
        var top = strongRect.top - wrapRect.top - paddingY;
        var width = strongRect.width + (paddingX * 2);
        var height = strongRect.height + (paddingY * 2);

        seleccion.style.left = left + 'px';
        seleccion.style.top = top + 'px';
        seleccion.style.width = width + 'px';
        seleccion.style.height = height + 'px';
    }

    /* ---- Animación de selección de texto ---- */
    function startSeleccionAnimation(seleccion) {
        /* Fase 1: highlight crece de izquierda a derecha (simula arrastre de selección) */
        seleccion.classList.add('is-selecting');

        var fondo = seleccion.querySelector('.home-equipo__seleccion-fondo');
        if (fondo) {
            fondo.addEventListener('animationend', function onHighlightEnd() {
                fondo.removeEventListener('animationend', onHighlightEnd);

                /* Fase 2: borde y handles aparecen (estilo Figma) */
                seleccion.classList.remove('is-selecting');
                seleccion.classList.add('is-selected');
            });
        }
    }

    /* ---- Iniciar cuando el DOM esté listo ---- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBloque);
    } else {
        initBloque();
    }
})();
