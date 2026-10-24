/**
 * Home Contacto — View Script (Animaciones de frontend)
 *
 * 1. Patrón de puntos con máscara que sigue el cursor: lo resuelve el
 *    componente compartido blocks/patron-puntos/.
 * 2. Tarjetas: fade-in cuando cada una entra en pantalla.
 * 3. Apps: zoom + bounce cuando cada una entra en pantalla.
 * 4. Cursor decorativo: fade-in cuando entra en pantalla y arranca su recorrido.
 * 5. Título: líneas punteadas se dibujan progresivamente (clip-path).
 */
(function () {
    'use strict';

    var BLOCK_SELECTOR    = '.home-contacto';
    var DOTS_SELECTOR     = '.js-home-contacto-dots';
    var CARD_SELECTOR     = '.js-home-contacto-card';
    var CHAT_SELECTOR     = '.js-home-contacto-chat';
    var AA_SELECTOR       = '.js-home-contacto-aa';
    var APP_SELECTOR      = '.js-home-contacto-app';
    var CURSOR_SELECTOR   = '.js-home-contacto-cursor';
    var ANIM_AREA_SELECTOR = '.home-contacto__animaciones';
    var TITULO_SELECTOR   = '.home-contacto__titulo';

    var ENTRY_STAGGER_MAX  = 300; /* ms — offset máximo tras entrar en pantalla */
    var ENTRY_STAGGER_BASE = 480; /* ms — delay máximo original en los data-*-delay del bloque */
    var CURSOR_LOOP_DELAY  = 380; /* ms — respiro entre mostrar el cursor y arrancar su recorrido */

    var CURSOR_WAYPOINTS = [
        { x: 0.41, y: 0.35, pause: 450 },
        { x: 0.20, y: 0.16, pause: 760, click: true },
        { x: 0.57, y: 0.17, pause: 540 },
        { x: 0.89, y: 0.20, pause: 720, click: true },
        { x: 0.82, y: 0.49, pause: 460 },
        { x: 0.62, y: 0.62, pause: 700, click: true },
        { x: 0.23, y: 0.64, pause: 420 },
        { x: 0.10, y: 0.79, pause: 760, click: true },
        { x: 0.33, y: 0.49, pause: 500 },
        { x: 0.48, y: 0.08, pause: 620, click: true }
    ];

    function lerp(start, end, progress) {
        return start + ((end - start) * progress);
    }

    function easeInOutSine(progress) {
        return -(Math.cos(Math.PI * progress) - 1) / 2;
    }

    /* Delay escalonado comprimido a partir del data-*-delay original */
    function scaledDelay(node, attrName) {
        var raw = parseInt(node.getAttribute(attrName), 10) || 0;
        return Math.round(raw / ENTRY_STAGGER_BASE * ENTRY_STAGGER_MAX);
    }

    /* Revela cada nodo de la lista cuando él mismo entra en pantalla */
    function observeReveal(nodeList, attrName) {
        if (!nodeList || !nodeList.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var node = entry.target;
                observer.unobserve(node);
                setTimeout(function () {
                    node.classList.add('is-visible');
                }, scaledDelay(node, attrName));
            });
        }, { threshold: 0.35 });

        nodeList.forEach(function (node) {
            observer.observe(node);
        });
    }

    /* Ejecuta onEnter una sola vez cuando el nodo entra en pantalla */
    function observeSingle(node, onEnter) {
        if (!node) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                onEnter(node);
            });
        }, { threshold: 0.35 });

        observer.observe(node);
    }

    /* Cursor: aparece al entrar en pantalla y arranca su recorrido */
    function observeCursorOnEnter(cursor, animArea) {
        if (!cursor) return;

        observeSingle(cursor, function () {
            cursor.classList.add('is-visible');
            window.setTimeout(function () {
                startCursorLoop(cursor, animArea);
            }, CURSOR_LOOP_DELAY);
        });
    }

    /* Fallback sin IntersectionObserver: revelar todo de inmediato */
    function revealAll(block, cards, apps, aa, chat, cursor, animArea) {
        block.classList.add('is-animated');
        cards.forEach(function (node) { node.classList.add('is-visible'); });
        apps.forEach(function (node) { node.classList.add('is-visible'); });
        if (aa) aa.classList.add('is-visible');
        if (chat) chat.classList.add('is-visible');
        if (cursor) {
            cursor.classList.add('is-visible');
            window.setTimeout(function () {
                startCursorLoop(cursor, animArea);
            }, CURSOR_LOOP_DELAY);
        }
    }

    function startCursorLoop(cursor, animArea) {
        if (!cursor || !animArea) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        var currentIndex = 0;
        var phase = 'pause';
        var phaseStart = null;
        var clickTriggered = false;
        var fromPoint = null;
        var toPoint = null;

        function waypointToPixels(waypoint) {
            return {
                x: animArea.offsetWidth * waypoint.x,
                y: animArea.offsetHeight * waypoint.y
            };
        }

        function setCursorPosition(point) {
            cursor.style.left = point.x + 'px';
            cursor.style.top = point.y + 'px';
        }

        function triggerClickBurst() {
            cursor.classList.add('is-clicking');
            window.setTimeout(function () {
                if (cursor.isConnected) {
                    cursor.classList.remove('is-clicking');
                }
            }, 220);
        }

        function beginMove(timestamp) {
            var nextIndex = (currentIndex + 1) % CURSOR_WAYPOINTS.length;
            fromPoint = waypointToPixels(CURSOR_WAYPOINTS[currentIndex]);
            toPoint = waypointToPixels(CURSOR_WAYPOINTS[nextIndex]);
            phase = 'move';
            phaseStart = timestamp;
            clickTriggered = false;
        }

        function beginPause(timestamp) {
            phase = 'pause';
            phaseStart = timestamp;
            clickTriggered = false;
        }

        function tick(timestamp) {
            if (!cursor.isConnected || !animArea.isConnected) {
                return;
            }

            if (phaseStart === null) {
                phaseStart = timestamp;
                setCursorPosition(waypointToPixels(CURSOR_WAYPOINTS[currentIndex]));
            }

            if (phase === 'pause') {
                var currentWaypoint = CURSOR_WAYPOINTS[currentIndex];
                var pauseElapsed = timestamp - phaseStart;

                if (currentWaypoint.click && !clickTriggered && pauseElapsed >= 90) {
                    clickTriggered = true;
                    triggerClickBurst();
                }

                if (pauseElapsed >= currentWaypoint.pause) {
                    beginMove(timestamp);
                }
            } else {
                var nextIndex = (currentIndex + 1) % CURSOR_WAYPOINTS.length;
                var travelDuration = CURSOR_WAYPOINTS[nextIndex].click ? 1380 : 1100;
                var moveElapsed = timestamp - phaseStart;
                var moveProgress = Math.min(moveElapsed / travelDuration, 1);
                var easedProgress = easeInOutSine(moveProgress);

                setCursorPosition({
                    x: lerp(fromPoint.x, toPoint.x, easedProgress),
                    y: lerp(fromPoint.y, toPoint.y, easedProgress)
                });

                if (moveProgress >= 1) {
                    currentIndex = nextIndex;
                    beginPause(timestamp);
                }
            }

            window.requestAnimationFrame(tick);
        }

        setCursorPosition(waypointToPixels(CURSOR_WAYPOINTS[0]));
        window.requestAnimationFrame(tick);
    }

    function initContacto() {
        var block = document.querySelector(BLOCK_SELECTOR);
        if (!block) return;

        /* El componente escucha el mouse sobre el padre del contenedor, que es
           .home-contacto__animaciones: el mismo elemento sobre el que se medía
           el cursor antes. */
        var dots = block.querySelector(DOTS_SELECTOR);
        if (dots) {
            window.onlinesPatronPuntos.init({ contenedor: dots });
        }

        var cards    = block.querySelectorAll(CARD_SELECTOR);
        var apps     = block.querySelectorAll(APP_SELECTOR);
        var aa       = block.querySelector(AA_SELECTOR);
        var chat     = block.querySelector(CHAT_SELECTOR);
        var cursor   = block.querySelector(CURSOR_SELECTOR);
        var animArea = block.querySelector(ANIM_AREA_SELECTOR);
        var titulo   = block.querySelector(TITULO_SELECTOR);

        if ('IntersectionObserver' in window) {
            /* Cada elemento se anima cuando él mismo entra en pantalla,
               no cuando entra la sección completa. */
            observeSingle(titulo, function () { block.classList.add('is-animated'); });
            observeReveal(cards, 'data-card-delay');
            observeSingle(aa, function (node) { node.classList.add('is-visible'); });
            observeSingle(chat, function (node) { node.classList.add('is-visible'); });
            observeReveal(apps, 'data-delay');
            observeCursorOnEnter(cursor, animArea);
        } else {
            revealAll(block, cards, apps, aa, chat, cursor, animArea);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContacto);
    } else {
        initContacto();
    }
})();
