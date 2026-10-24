/**
 * Home Bloque Dark Mode — View Script (Animaciones de frontend)
 *
 * 1. Dark mode: IntersectionObserver activa/desactiva el dark mode según la visibilidad del
 *    párrafo `.home-bloque-dark-mode__descripcion`: el modo oscuro está ON mientras ese elemento
 *    intersecta el viewport (apenas asoma → dark) y OFF cuando sale por completo (→ light).
 *    El comportamiento es simétrico en ambas direcciones de scroll e idéntico en desktop/mobile.
 *
 * 2. Título draggable: el título y su selección decorativa tipo Figma se arrastran juntos con
 *    el puntero, limitados a los bordes de la card. Solo en desktop (>= 1024px).
 */
(function () {
    'use strict';

    var BLOCK_SELECTOR = '.home-bloque-dark-mode';
    var TRIGGER_SELECTOR = '.home-bloque-dark-mode__descripcion';
    var BODY_DARK_CLASS = 'is-dark';
    var SWITCHING_CLASS = 'theme-switching';
    var SWITCHING_DURATION = 850;

    /* Drag del título */
    var TITULO_WRAP_SELECTOR = '.js-home-bloque-dark-mode-titulo';
    var TITULO_SELECTOR = '.home-bloque-dark-mode__titulo';
    var SELECCION_SELECTOR = '.home-bloque-dark-mode__seleccion';
    var CARD_SELECTOR = '.home-bloque-dark-mode__card';
    var DRAG_AREA_SELECTOR = '.js-home-bloque-dark-mode-drag-area';
    var CONTENIDO_SELECTOR = '.home-bloque-dark-mode__contenido';
    var PARRAFOS_SELECTOR = '.home-bloque-dark-mode__parrafos';
    var DRAGGABLE_CLASS = 'is-draggable';
    var DRAGGING_CLASS = 'is-dragging';
    var DRAG_MIN_WIDTH = 1024; /* coincide con el breakpoint del CSS del bloque */
    var RESIZE_DEBOUNCE = 150;

    /**
     * Margen del viewport para adelantar/atrasar el disparo (formato CSS de rootMargin).
     * '0px' = el cambio ocurre exactamente cuando el elemento asoma / desaparece del borde.
     * Ej.: '0px 0px -100px 0px' exigiría que entre 100px antes de prender.
     */
    var TRIGGER_ROOT_MARGIN = '0px';

    /**
     * Activa o desactiva el dark mode agregando una clase temporal `theme-switching`
     * al body durante la ventana de la transición. Mientras dura, el CSS suprime los
     * costos de pintado pesados: el cambio de color de los miles de dots se vuelve
     * instantáneo y los elementos con backdrop-filter desactivan el desenfoque, evitando
     * que el navegador recalcule todo en cada frame mientras los fondos se funden. Fuera
     * del toggle, los efectos (fundido del cursor sobre los dots, frosted-glass) quedan
     * intactos.
     */
    var switchingTimeout = null;

    function setDarkMode(activar) {
        var body = document.body;

        if (activar === body.classList.contains(BODY_DARK_CLASS)) {
            return;
        }

        body.classList.add(SWITCHING_CLASS);

        if (activar) {
            body.classList.add(BODY_DARK_CLASS);
        } else {
            body.classList.remove(BODY_DARK_CLASS);
        }

        if (switchingTimeout) {
            clearTimeout(switchingTimeout);
        }

        switchingTimeout = setTimeout(function () {
            body.classList.remove(SWITCHING_CLASS);
            switchingTimeout = null;
        }, SWITCHING_DURATION);
    }

    /* ---- 1. Dark mode toggle mediante IntersectionObserver ---- */
    function initDarkModeToggle(blocks) {
        if (!blocks.length) return;

        /* Objetivo a observar: el párrafo __descripcion de cada bloque. Si no existe
           (atributo vacío → no se renderiza el <p>), se usa el bloque como respaldo. */
        var targets = [];
        for (var b = 0; b < blocks.length; b++) {
            var trigger = blocks[b].querySelector(TRIGGER_SELECTOR) || blocks[b];
            targets.push(trigger);
        }

        var observer = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                setDarkMode(entries[i].isIntersecting);
            }
        }, {
            root: null,
            rootMargin: TRIGGER_ROOT_MARGIN,
            threshold: 0
        });

        for (var t = 0; t < targets.length; t++) {
            observer.observe(targets[t]);
        }
    }

    /* ---- 2. Título draggable (free drag dentro de la card) ---- */
    function initDragTitulo(block) {
        if (!window.PointerEvent) return;

        var wrap = block.querySelector(TITULO_WRAP_SELECTOR);
        var card = block.querySelector(CARD_SELECTOR);
        var dragArea = block.querySelector(DRAG_AREA_SELECTOR);
        var contenido = block.querySelector(CONTENIDO_SELECTOR);
        var parrafos = block.querySelector(PARRAFOS_SELECTOR);

        if (!wrap || !card) return;

        var mq = window.matchMedia('(min-width: ' + DRAG_MIN_WIDTH + 'px)');
        var enabled = false;

        /* Offset acumulado respecto de la posición en flujo. Persiste entre drags. */
        var currentX = 0;
        var currentY = 0;

        /* Estado del gesto en curso */
        var activePointerId = null;
        var startMouseX = 0, startMouseY = 0;
        var startOffsetX = 0, startOffsetY = 0;
        /* Última posición del puntero — solo se escribe en pointermove */
        var pendingX = 0, pendingY = 0;
        /* Límites del offset, cacheados en pointerdown */
        var minX = 0, maxX = 0, minY = 0, maxY = 0;
        var rafId = null;
        var resizeTimeout = null;

        function aplicarPosicion() {
            if (currentX === 0 && currentY === 0) {
                wrap.style.transform = '';
                return;
            }

            wrap.style.transform = 'translate3d(' + currentX + 'px, ' + currentY + 'px, 0)';
        }

        function resetPosicion() {
            currentX = 0;
            currentY = 0;
            aplicarPosicion();
        }

        /**
         * Rect visual del título: une el rect del texto renderizado con el de la selección
         * decorativa. Tanto el h3 como el wrap ocupan todo el ancho de __contenido como bloques,
         * por lo que no pueden usarse directamente para los límites horizontales.
         */
        function getRectVisual() {
            var titulo = wrap.querySelector(TITULO_SELECTOR);
            var rect = titulo ? titulo.getBoundingClientRect() : wrap.getBoundingClientRect();

            if (titulo && titulo.textContent.trim()) {
                var range = document.createRange();
                range.selectNodeContents(titulo);

                var textRect = range.getBoundingClientRect();

                if (textRect.width > 0 && textRect.height > 0) {
                    rect = textRect;
                }
            }

            var top = rect.top;
            var left = rect.left;
            var right = rect.right;
            var bottom = rect.bottom;
            var seleccion = wrap.querySelector(SELECCION_SELECTOR);

            if (seleccion) {
                var selRect = seleccion.getBoundingClientRect();

                if (selRect.width > 0 && selRect.height > 0) {
                    top = Math.min(top, selRect.top);
                    left = Math.min(left, selRect.left);
                    right = Math.max(right, selRect.right);
                    bottom = Math.max(bottom, selRect.bottom);
                }
            }

            return { top: top, left: left, width: right - left, height: bottom - top };
        }

        /**
         * Area segura del drag: usa la columna izquierda como limite horizontal para no
         * invadir la imagen, y el inicio de los parrafos como limite inferior para no tapar textos.
         */
        function getAreaSegura() {
            var cardRect = card.getBoundingClientRect();

            if (dragArea) {
                var dragAreaRect = dragArea.getBoundingClientRect();

                if (dragAreaRect.width > 0 && dragAreaRect.height > 0) {
                    return {
                        top: Math.max(cardRect.top, dragAreaRect.top),
                        left: Math.max(cardRect.left, dragAreaRect.left),
                        right: Math.min(cardRect.right, dragAreaRect.right),
                        bottom: Math.min(cardRect.bottom, dragAreaRect.bottom)
                    };
                }
            }

            var contenidoRect = contenido ? contenido.getBoundingClientRect() : cardRect;
            var parrafosRect = parrafos ? parrafos.getBoundingClientRect() : null;

            var left = Math.max(cardRect.left, contenidoRect.left);
            var right = Math.min(cardRect.right, contenidoRect.right);
            var top = Math.max(cardRect.top, contenidoRect.top);
            var bottom = parrafosRect ? parrafosRect.top : Math.min(cardRect.bottom, contenidoRect.bottom);

            return { top: top, left: left, right: right, bottom: bottom };
        }

        /* Tick de drag: lee coordenadas cacheadas, calcula y escribe al DOM (1 frame máximo) */
        function dragTick() {
            rafId = null;

            var dx = pendingX - startMouseX;
            var dy = pendingY - startMouseY;

            currentX = Math.max(minX, Math.min(startOffsetX + dx, maxX));
            currentY = Math.max(minY, Math.min(startOffsetY + dy, maxY));

            aplicarPosicion();
        }

        function onPointerDown(e) {
            if (activePointerId !== null) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            e.preventDefault();

            activePointerId = e.pointerId;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            pendingX = e.clientX;
            pendingY = e.clientY;
            startOffsetX = currentX;
            startOffsetY = currentY;

            /* Medidas leídas una sola vez — no cambian durante el gesto */
            var visual = getRectVisual();
            var area = getAreaSegura();
            /* Posición sin transform, para poder expresar los límites como offsets */
            var baseLeft = visual.left - currentX;
            var baseTop = visual.top - currentY;

            minX = area.left - baseLeft;
            maxX = area.right - visual.width - baseLeft;
            minY = area.top - baseTop;
            maxY = area.bottom - visual.height - baseTop;

            /* Si el título es más grande que la card no hay margen: queda quieto en ese eje */
            if (maxX < minX) {
                minX = currentX;
                maxX = currentX;
            }

            if (maxY < minY) {
                minY = currentY;
                maxY = currentY;
            }

            if (wrap.setPointerCapture) {
                try {
                    wrap.setPointerCapture(e.pointerId);
                } catch (err) {}
            }

            wrap.classList.add(DRAGGING_CLASS);

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        }

        function onPointerMove(e) {
            if (e.pointerId !== activePointerId) return;

            /* Solo guarda coordenadas — el DOM lo toca dragTick en el próximo frame */
            pendingX = e.clientX;
            pendingY = e.clientY;

            if (rafId === null) {
                rafId = window.requestAnimationFrame(dragTick);
            }
        }

        function onPointerUp(e) {
            if (e && e.pointerId !== activePointerId) return;
            endDrag();
        }

        function endDrag() {
            if (activePointerId === null) return;

            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }

            if (wrap.releasePointerCapture) {
                try {
                    wrap.releasePointerCapture(activePointerId);
                } catch (err) {}
            }

            activePointerId = null;
            wrap.classList.remove(DRAGGING_CLASS);

            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        }

        /* Al redimensionar cambian los límites: el título vuelve a su posición en flujo */
        function onResize() {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(function () {
                resizeTimeout = null;
                endDrag();
                resetPosicion();
            }, RESIZE_DEBOUNCE);
        }

        function enable() {
            if (enabled) return;

            enabled = true;
            wrap.classList.add(DRAGGABLE_CLASS);
            wrap.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('resize', onResize);
        }

        function disable() {
            if (!enabled) return;

            enabled = false;
            endDrag();
            resetPosicion();
            wrap.classList.remove(DRAGGABLE_CLASS);
            wrap.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('resize', onResize);

            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
                resizeTimeout = null;
            }
        }

        function sync() {
            if (mq.matches) {
                enable();
            } else {
                disable();
            }
        }

        sync();

        if (mq.addEventListener) {
            mq.addEventListener('change', sync);
        } else if (mq.addListener) {
            mq.addListener(sync);
        }
    }

    /* ---- Init ---- */
    function init() {
        var blocks = document.querySelectorAll(BLOCK_SELECTOR);

        if (!blocks.length) return;

        initDarkModeToggle(blocks);

        for (var i = 0; i < blocks.length; i++) {
            initDragTitulo(blocks[i]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
