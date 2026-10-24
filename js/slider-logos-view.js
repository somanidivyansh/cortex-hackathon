/**
 * Slider de logos — View Script
 *
 * Marquee continuo de logos con Swiper (loop infinito, autoplay a velocidad
 * constante) más el ancho responsive de cada logo vía data-width-mobile.
 *
 * Soporta varias instancias en la misma página: recorre todos los .slider-logos.
 */
(function () {
    'use strict';

    var BLOQUE_SELECTOR   = '.slider-logos';
    var SLIDER_SELECTOR   = '.js-slider-logos';
    var IMG_SELECTOR      = '.slider-logos__img[data-width-mobile]';

    var WATCHDOG_INTERVAL = 1500; /* ms — frecuencia de sondeo del autoplay del slider */
    var WATCHDOG_MIN_SHIFT = 5;   /* px — desplazamiento mínimo esperado entre sondeos */

    /* ==================================================================
       Logos: aplicar ancho mobile vía data-width-mobile
       ================================================================== */
    function applyLogoMobileWidths(bloque) {
        var isMobile = window.matchMedia('(max-width: 1023px)').matches;
        var imgs = bloque.querySelectorAll(IMG_SELECTOR);
        imgs.forEach(function (img) {
            if (isMobile) {
                img.style.width = img.getAttribute('data-width-mobile') + 'px';
            } else {
                img.style.width = img.getAttribute('width') + 'px';
            }
        });
    }

    /* ==================================================================
       Slider de logos (Swiper — marquee continuo)
       ================================================================== */
    function initLogoSlider(bloque) {
        var swiperContainer = bloque.querySelector(SLIDER_SELECTOR);
        if (!swiperContainer) return;

        /* Verificar que Swiper esté disponible */
        if (typeof Swiper === 'undefined') return;

        var hasAutoplay = swiperContainer.getAttribute('data-autoplay') !== 'false';

        var swiper = new Swiper(swiperContainer, {
            loop: true,

            autoplay: hasAutoplay ? {
                delay: 0,
                disableOnInteraction: false,
            } : false,

            speed: 5000,
            slidesPerView: 'auto',
            spaceBetween: 77,
            allowTouchMove: false,

            /* Swiper procesa los eventos de mouse como si fueran touch. Al clickear
               un slide interrumpe la transición en curso y rompe la cadena que
               sostiene el marquee (ver guardLogoAutoplay). Con simulateTouch en
               false, onTouchStart/Move/End descartan pointerType "mouse" y el click
               deja de afectar al slider. */
            simulateTouch: false,

            freeMode: true,
        });

        if (hasAutoplay) {
            guardLogoAutoplay(swiper, swiperContainer);
        }
    }

    /* ==================================================================
       Watchdog del autoplay del slider de logos

       Con delay 0, Swiper no usa un temporizador continuo: encadena cada
       ciclo del marquee a un evento. En beforeTransitionStart llama a
       pause(), que —con waitForTransition activo— registra un listener de
       un solo uso de transitionend sobre .swiper-wrapper; recién al recibir
       ese evento hace resume() y agenda el siguiente slide.

       Si un transitionend no llega (transición interrumpida, transitioncancel,
       pestaña oculta), la cadena se corta y el autoplay queda pausado de forma
       permanente: no hay temporizador que lo reactive.

       Este watchdog vigila el desplazamiento real del wrapper y reanuda el
       autoplay si detecta que quedó congelado.
       ================================================================== */
    function guardLogoAutoplay(swiper, swiperContainer) {
        var wrapper = swiperContainer.querySelector('.swiper-wrapper');
        if (!wrapper) return;

        var lastTranslate = null;
        var intervalId;

        function rearm() {
            if (swiper.destroyed || !swiper.autoplay || !swiper.autoplay.running) return;
            if (document.hidden) return;

            /* Una transición interrumpida deja animating en true y bloquea el
               siguiente ciclo. */
            swiper.animating = false;
            swiper.autoplay.resume();
        }

        /* Transición cancelada: Swiper nunca va a recibir su transitionend. */
        wrapper.addEventListener('transitioncancel', function (event) {
            if (event.target !== wrapper) return;
            rearm();
        });

        /* Al volver a la pestaña, reanudar por si el resume interno no corrió. */
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) rearm();
        });

        /* Sondeo de respaldo: cubre cualquier otra forma de corte de la cadena. */
        intervalId = setInterval(function () {
            if (swiper.destroyed) {
                clearInterval(intervalId);
                return;
            }
            if (document.hidden || !swiper.autoplay || !swiper.autoplay.running) {
                lastTranslate = null;
                return;
            }

            var current = wrapperTranslateX(wrapper);

            /* A velocidad normal el wrapper recorre cientos de px por sondeo;
               un desplazamiento casi nulo significa que está congelado. */
            if (lastTranslate !== null && Math.abs(current - lastTranslate) < WATCHDOG_MIN_SHIFT) {
                rearm();
            }

            lastTranslate = current;
        }, WATCHDOG_INTERVAL);
    }

    /* Posición horizontal real del wrapper, leída del transform computado.
       A diferencia de swiper.translate (que solo se actualiza al iniciar cada
       transición), este valor cambia de forma continua mientras el marquee corre. */
    function wrapperTranslateX(wrapper) {
        var transform = window.getComputedStyle(wrapper).transform;
        if (!transform || transform === 'none') return 0;

        var valores = transform.match(/matrix3d\((.+)\)/);
        if (valores) return parseFloat(valores[1].split(',')[12]) || 0;

        valores = transform.match(/matrix\((.+)\)/);
        if (valores) return parseFloat(valores[1].split(',')[4]) || 0;

        return 0;
    }

    /* ==================================================================
       Inicialización
       ================================================================== */
    function initBloques() {
        var bloques = document.querySelectorAll(BLOQUE_SELECTOR);
        if (!bloques.length) return;

        bloques.forEach(function (bloque) {
            applyLogoMobileWidths(bloque);
            initLogoSlider(bloque);
        });

        window.addEventListener('resize', function () {
            bloques.forEach(function (bloque) { applyLogoMobileWidths(bloque); });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBloques);
    } else {
        initBloques();
    }
})();
