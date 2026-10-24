/**
 * Grilla de celdas — Componente compartido de frontend
 *
 * Dibuja la grilla como fondo CSS (cero elementos) y resuelve el resaltado con
 * un pool fijo de divs reciclados, en lugar de crear un div por celda.
 *
 * Uso desde el -view.js de un bloque:
 *
 *     window.cadenceGrillaCeldas.init({ contenedor: elemento });
 *
 * El contenedor debe tener la clase grilla-celdas y estar posicionado.
 */
(function () {
    'use strict';

    var LIT_CLASS        = 'grilla-celdas__lit';
    var LIT_ACTIVE_CLASS = 'is-lit';

    var FADE_DURATION = 600;  /* ms — tiene que coincidir con la transición del CSS */
    var REBUILD_DELAY = 200;  /* ms — debounce del resize */
    var HIGHLIGHTS    = 12;   /* divs reciclados que forman la estela */

    function init(config) {
        if (!config || !config.contenedor) return;

        var contenedor      = config.contenedor;
        var totalHighlights = config.highlights || HIGHLIGHTS;
        var soportaHover    = window.matchMedia('(hover: hover)').matches;

        var celdaAncho = 0;
        var celdaAlto  = 0;

        /* Misma fórmula que la versión con celdas: redondear al entero más
           cercano y repartir el sobrante, para que la grilla llene el contenedor
           exacto (sin hueco a la derecha ni corte abajo). Antes eso lo hacía el
           1fr del grid; ahora son dos variables CSS. */
        function medir() {
            var estilos  = window.getComputedStyle(contenedor);
            var objetivo = parseFloat(estilos.getPropertyValue('--grilla-celda-size')) || 60;

            var ancho = contenedor.offsetWidth;
            var alto  = contenedor.offsetHeight;
            if (!ancho || !alto) return;

            var cols = Math.max(1, Math.round(ancho / objetivo));
            var rows = Math.max(1, Math.round(alto / objetivo));

            celdaAncho = ancho / cols;
            celdaAlto  = alto / rows;

            contenedor.style.setProperty('--grilla-celda-ancho', celdaAncho + 'px');
            contenedor.style.setProperty('--grilla-celda-alto', celdaAlto + 'px');
        }

        medir();

        /* Ante cambios de viewport (barra de direcciones mobile, rotación) ya no
           hay que reconstruir nada: alcanza con recalcular las dos variables. */
        var medirTimer = null;
        function programarMedicion() {
            if (medirTimer) window.clearTimeout(medirTimer);
            medirTimer = window.setTimeout(medir, REBUILD_DELAY);
        }

        window.addEventListener('resize', programarMedicion, { passive: true });
        window.addEventListener('orientationchange', programarMedicion, { passive: true });

        /* Sin hover la grilla se ve igual, solo no se enciende: no hace falta
           crear el pool ni atar el listener. */
        if (!soportaHover) return;

        var pool     = [];
        var siguiente = 0;
        var indice;

        for (indice = 0; indice < totalHighlights; indice++) {
            var elemento = document.createElement('div');
            elemento.className = LIT_CLASS;
            contenedor.appendChild(elemento);
            pool.push({ el: elemento, timeout: null });
        }

        function encender(col, row) {
            var item = pool[siguiente];
            siguiente = (siguiente + 1) % pool.length;

            if (item.timeout) {
                window.clearTimeout(item.timeout);
                item.timeout = null;
            }

            /* Al reciclar un resaltado que todavía se está apagando hay que
               moverlo con la transición desactivada, si no se lo ve viajar hasta
               su nueva celda. Se vuelve a encender en el frame siguiente. */
            item.el.style.transition = 'none';
            item.el.classList.remove(LIT_ACTIVE_CLASS);
            item.el.style.transform = 'translate(' + (col * celdaAncho) + 'px, ' + (row * celdaAlto) + 'px)';

            window.requestAnimationFrame(function () {
                item.el.style.transition = '';
                item.el.classList.add(LIT_ACTIVE_CLASS);
            });

            item.timeout = window.setTimeout(function () {
                item.el.classList.remove(LIT_ACTIVE_CLASS);
                item.timeout = null;
            }, FADE_DURATION);
        }

        /* Un único listener para toda la grilla, con el trabajo diferido a un
           requestAnimationFrame y sin hacer nada mientras el cursor no cambie
           de celda. */
        var rafId       = null;
        var ultimaCelda = null;
        var punteroX    = 0;
        var punteroY    = 0;

        contenedor.addEventListener('mousemove', function (evento) {
            punteroX = evento.clientX;
            punteroY = evento.clientY;

            if (rafId) return;

            rafId = window.requestAnimationFrame(function () {
                rafId = null;
                if (!celdaAncho || !celdaAlto) return;

                var rect = contenedor.getBoundingClientRect();
                var col  = Math.floor((punteroX - rect.left) / celdaAncho);
                var row  = Math.floor((punteroY - rect.top) / celdaAlto);
                var celda = col + ':' + row;

                if (celda === ultimaCelda) return;

                ultimaCelda = celda;
                encender(col, row);
            });
        }, { passive: true });

        contenedor.addEventListener('mouseleave', function () {
            ultimaCelda = null;
        });
    }

    window.cadenceGrillaCeldas = { init: init };
})();
