/**
 * Patrón de puntos — Componente compartido de frontend
 *
 * Los puntos son fondo CSS (cero elementos): este script solo escribe la
 * posición del cursor como variables sobre el contenedor, y el CSS resuelve la
 * máscara global y el halo de encendido.
 *
 * Uso desde el -view.js de un bloque:
 *
 *     window.onlinesPatronPuntos.init({ contenedor: elemento });
 *
 * El contenedor debe tener la clase patron-puntos y estar posicionado.
 */
(function () {
    'use strict';

    var ACTIVO_CLASS = 'is-activo';
    var STATIC_CLASS = 'is-static';

    function init(config) {
        if (!config || !config.contenedor) return;

        var contenedor = config.contenedor;

        /* El mouse se escucha sobre el elemento que envuelve al contenedor, no
           sobre el contenedor mismo: es lo que hacían los dos bloques y lo que
           define el sistema de coordenadas del cursor. */
        var area = config.area || contenedor.parentElement || contenedor;

        /* Sin hover no hay cursor que seguir: la máscara queda fija, no hay
           encendido y no se ata ningún listener. */
        if (!window.matchMedia('(hover: hover)').matches) {
            contenedor.classList.add(STATIC_CLASS);
            return;
        }

        var rafId    = null;
        var punteroX = '50%';
        var punteroY = '50%';

        function medir(evento) {
            var rect = area.getBoundingClientRect();
            punteroX = (evento.clientX - rect.left) + 'px';
            punteroY = (evento.clientY - rect.top) + 'px';
        }

        function escribir() {
            rafId = null;
            contenedor.style.setProperty('--dot-x', punteroX);
            contenedor.style.setProperty('--dot-y', punteroY);
            contenedor.style.setProperty('--dot-lit-x', punteroX);
            contenedor.style.setProperty('--dot-lit-y', punteroY);
        }

        /* Al entrar se escribe sin esperar al frame siguiente: si no, el halo
           aparece un frame en el centro y recién después salta al cursor. */
        area.addEventListener('mouseenter', function (evento) {
            medir(evento);
            escribir();
            contenedor.classList.add(ACTIVO_CLASS);
        });

        area.addEventListener('mousemove', function (evento) {
            medir(evento);
            if (rafId) return;
            rafId = window.requestAnimationFrame(escribir);
        }, { passive: true });

        /* La máscara global vuelve al centro, como antes. El halo NO: se apaga
           donde estaba, para que el fundido de 600ms no lo haga viajar hasta el
           centro mientras se desvanece.

           Hay que cancelar el frame pendiente, si no vuelve a escribir la
           posición del cursor justo después del reseteo. */
        area.addEventListener('mouseleave', function () {
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }

            contenedor.classList.remove(ACTIVO_CLASS);
            contenedor.style.setProperty('--dot-x', '50%');
            contenedor.style.setProperty('--dot-y', '50%');
        });
    }

    window.onlinesPatronPuntos = { init: init };
})();
