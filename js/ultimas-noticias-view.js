(function () {
    'use strict';

    if (!document.body.classList.contains('home')) return;

    var ITEM_SELECTOR = '.ultimas-noticias .card-noticia-article';
    var VISIBLE_CLASS = 'is-visible';
    var DELAYS = ['0s', '0.15s', '0.3s'];

    function init() {
        var items = document.querySelectorAll(ITEM_SELECTOR);
        if (!items.length) return;

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

        for (var i = 0; i < items.length; i++) {
            items[i].style.setProperty('--item-delay', DELAYS[i % DELAYS.length]);
            observer.observe(items[i]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
