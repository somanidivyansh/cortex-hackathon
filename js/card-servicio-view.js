(() => {
    'use strict';

    /*
     * Dibuja una línea punteada debajo de cada renglón renderizado del título
     * en la variante vertical. El título viene del post_title del CPT, así que
     * los saltos de línea no se conocen de antemano: hay que medir el wrap real
     * en el navegador y reconstruir el título línea por línea.
     */

    const TITLE_SELECTOR = '.card-servicio--vertical .js-card-servicio-titulo';
    const LINE_CLASS = 'card-servicio__titulo-linea';
    const LINE_TEXT_CLASS = 'card-servicio__titulo-linea-texto';
    const LINE_RULE_CLASS = 'card-servicio__titulo-puntos';
    const MEASURE_CLASS = 'card-servicio__titulo-measure';
    const WORD_CLASS = 'card-servicio__titulo-palabra';
    const TOP_EPSILON = 1;

    const normalizeTitle = (text) => text.replace(/\s+/g, ' ').trim();

    const getOriginalTitle = (titleElement) => {
        const storedTitle = titleElement.dataset.cardServicioTitle || '';

        if (storedTitle) {
            return storedTitle;
        }

        const fallbackTitle = normalizeTitle(titleElement.textContent || '');
        titleElement.dataset.cardServicioTitle = fallbackTitle;

        return fallbackTitle;
    };

    const createMeasureNode = (originalTitle) => {
        const measureNode = document.createElement('span');
        measureNode.className = MEASURE_CLASS;
        measureNode.setAttribute('aria-hidden', 'true');

        const words = originalTitle.split(' ');

        words.forEach((word, index) => {
            const wordNode = document.createElement('span');
            wordNode.className = WORD_CLASS;
            wordNode.textContent = word;
            measureNode.appendChild(wordNode);

            if (index < words.length - 1) {
                measureNode.appendChild(document.createTextNode(' '));
            }
        });

        return measureNode;
    };

    const getWrappedLines = (measureNode) => {
        const wordNodes = Array.from(measureNode.querySelectorAll('.' + WORD_CLASS));

        if (!wordNodes.length) {
            return [];
        }

        const lines = [];
        let currentTop = null;
        let currentWords = [];

        wordNodes.forEach((wordNode) => {
            const wordTop = Math.round(wordNode.offsetTop);

            if (currentTop === null || Math.abs(wordTop - currentTop) <= TOP_EPSILON) {
                currentWords.push(wordNode.textContent || '');
                currentTop = currentTop === null ? wordTop : currentTop;
                return;
            }

            lines.push(currentWords.join(' '));
            currentWords = [wordNode.textContent || ''];
            currentTop = wordTop;
        });

        if (currentWords.length) {
            lines.push(currentWords.join(' '));
        }

        return lines;
    };

    const renderWrappedLines = (titleElement, lines) => {
        const fragment = document.createDocumentFragment();

        lines.forEach((lineText) => {
            const lineNode = document.createElement('span');
            lineNode.className = LINE_CLASS;

            const textNode = document.createElement('span');
            textNode.className = LINE_TEXT_CLASS;
            textNode.textContent = lineText + ' ';

            const ruleNode = document.createElement('span');
            ruleNode.className = LINE_RULE_CLASS;
            ruleNode.setAttribute('aria-hidden', 'true');

            lineNode.append(textNode, ruleNode);
            fragment.appendChild(lineNode);
        });

        titleElement.replaceChildren(fragment);
    };

    const splitTitleIntoLines = (titleElement) => {
        const originalTitle = getOriginalTitle(titleElement);

        if (!originalTitle) {
            return;
        }

        const measureNode = createMeasureNode(originalTitle);
        titleElement.replaceChildren(measureNode);

        const lines = getWrappedLines(measureNode);

        if (!lines.length) {
            titleElement.textContent = originalTitle;
            return;
        }

        renderWrappedLines(titleElement, lines);
    };

    const scheduleSplit = (titleElement) => {
        if (titleElement.cardServicioFrame) {
            cancelAnimationFrame(titleElement.cardServicioFrame);
        }

        titleElement.cardServicioFrame = requestAnimationFrame(() => {
            splitTitleIntoLines(titleElement);
            titleElement.cardServicioFrame = null;
        });
    };

    const observeWidthChanges = (titleElement) => {
        const observedElement = titleElement.closest('.card-servicio__textos') || titleElement;

        if ('ResizeObserver' in window) {
            let lastWidth = Math.round(observedElement.getBoundingClientRect().width);
            const resizeObserver = new ResizeObserver((entries) => {
                const nextWidth = Math.round(entries[0].contentRect.width);

                if (!nextWidth || nextWidth === lastWidth) {
                    return;
                }

                lastWidth = nextWidth;
                scheduleSplit(titleElement);
            });

            resizeObserver.observe(observedElement);
            return;
        }

        const onResize = () => scheduleSplit(titleElement);
        window.addEventListener('resize', onResize, { passive: true });
    };

    const initTitle = (titleElement) => {
        scheduleSplit(titleElement);
        observeWidthChanges(titleElement);

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready
                .then(() => {
                    scheduleSplit(titleElement);
                })
                .catch(() => {});
        }
    };

    const init = () => {
        const titleElements = document.querySelectorAll(TITLE_SELECTOR);

        if (!titleElements.length) {
            return;
        }

        titleElements.forEach(initTitle);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        return;
    }

    init();
})();
