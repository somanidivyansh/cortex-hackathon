/**
 * Home Quote Block — View Script (Animaciones de frontend mejoradas)
 *
 * 1. Patrón de puntos con máscara que sigue el cursor.
 * 2. Texto se revela palabra por palabra de forma suave y responsiva al hacer scroll.
 */
(function () {
    'use strict';

    var BLOCK_SELECTOR = '.home-quote-block';
    var STICKY_SELECTOR = '.js-quote-sticky';
    var DOTS_SELECTOR = '.js-quote-dots';
    var WORD_SELECTOR = '.js-quote-word';
    var REVEALED_CLASS = 'is-revealed';
    var ANIMATING_CLASS = 'is-animating';

    function initTextReveal(block) {
        var words = block.querySelectorAll('.' + WORD_SELECTOR.replace('.', ''));
        if (!words.length) return;

        block.classList.add(ANIMATING_CLASS);

        var titleWords = block.querySelectorAll('[data-quote-group="titulo"] .' + WORD_SELECTOR.replace('.', ''));
        var subWords = block.querySelectorAll('[data-quote-group="subtitulo"] .' + WORD_SELECTOR.replace('.', ''));

        function paintWords(wordList, progress) {
            var count = Math.ceil(progress * wordList.length);
            for (var i = 0; i < wordList.length; i++) {
                if (i < count) {
                    wordList[i].classList.add(REVEALED_CLASS);
                } else {
                    wordList[i].classList.remove(REVEALED_CLASS);
                }
            }
        }

        function paintAll() {
            for (var i = 0; i < words.length; i++) {
                words[i].classList.add(REVEALED_CLASS);
            }
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            paintAll();
            return;
        }

        function updateWords() {
            var rect = block.getBoundingClientRect();
            var windowH = window.innerHeight || 800;

            // Compute progress as block travels through the viewport
            var totalDistance = rect.height - windowH;
            if (totalDistance <= 0) totalDistance = windowH;

            // Scrolled distance from top of block hitting viewport top
            var scrolled = -rect.top;
            var progress = Math.max(0, Math.min(1, scrolled / totalDistance));

            // Also check if block is centered in viewport
            var centerDist = Math.abs(rect.top + rect.height / 2 - windowH / 2);
            if (centerDist < windowH * 0.4) {
                // Boost progress so words are always legible when in center view
                progress = Math.max(progress, 0.45);
            }
            if (rect.top <= 0 && rect.bottom >= windowH) {
                // When sticky is active, progress scales smoothly
                var stickyProgress = Math.max(0, Math.min(1, -rect.top / (rect.height - windowH || 1)));
                progress = Math.max(progress, stickyProgress);
            }

            // Distribute reveal: title first (0 to 0.5), subtitle second (0.35 to 1.0)
            var titleProg = Math.max(0, Math.min(1, progress / 0.5));
            var subProg = Math.max(0, Math.min(1, (progress - 0.35) / 0.65));

            paintWords(titleWords, titleProg);
            paintWords(subWords, subProg);
        }

        window.addEventListener('scroll', updateWords, { passive: true });
        window.addEventListener('resize', updateWords);
        block.addEventListener('mousemove', function () {
            // Hover over quote block gradually illuminates words for immediate feedback
            paintAll();
        }, { once: true });

        // Initial check
        updateWords();

        // Failsafe: if section is visible in viewport, ensure words reveal
        if ('IntersectionObserver' in window) {
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        updateWords();
                        setTimeout(function () {
                            if (entry.isIntersecting) {
                                paintAll();
                            }
                        }, 1200);
                    }
                });
            }, { threshold: 0.15 });
            obs.observe(block);
        }
    }

    function initQuoteBlock() {
        var block = document.querySelector(BLOCK_SELECTOR);
        if (!block) return;

        var dots = block.querySelector(DOTS_SELECTOR);
        if (dots && window.cadencePatronPuntos) {
            window.cadencePatronPuntos.init({ contenedor: dots });
        }

        initTextReveal(block);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuoteBlock);
    } else {
        initQuoteBlock();
    }
})();
