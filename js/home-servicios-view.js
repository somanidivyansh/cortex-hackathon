(function () {
    'use strict';

    /*
     * Animación de entrada escalonada de las cards del listado.
     * Los delays se calculan por instancia del bloque, no sobre el documento
     * entero, para que dos listados en la misma página no compartan la cuenta.
     */

    var BLOCK_SELECTOR = '.home-servicios';
    var ITEM_SELECTOR = '.card-servicio-article';
    var VISIBLE_CLASS = 'is-visible';
    var DELAYS = ['0s', '0.15s', '0.3s'];

    function initBloque(bloque, observer) {
        var items = bloque.querySelectorAll(ITEM_SELECTOR);

        for (var i = 0; i < items.length; i++) {
            items[i].style.setProperty('--item-delay', DELAYS[i % DELAYS.length]);
            observer.observe(items[i]);
        }
    }

    function init() {
        var bloques = document.querySelectorAll(BLOCK_SELECTOR);
        if (!bloques.length) return;

        var observer = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add(VISIBLE_CLASS);
                    observer.unobserve(entries[i].target);
                }
            }
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -60px 0px'
        });

        for (var i = 0; i < bloques.length; i++) {
            initBloque(bloques[i], observer);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
