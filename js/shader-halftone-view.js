(() => {
    const HALFTONE_TYPE = 'holes';
    const HALFTONE_GRID = 'square';
    const SOURCE_LIMIT = 1800;
    const MAX_PIXELS = 1400000;
    const GRAIN_TILE_SHIFT = 9;
    const GRAIN_TILE_SIZE = 1 << GRAIN_TILE_SHIFT;
    const GRAIN_TILE_MASK = GRAIN_TILE_SIZE - 1;
    const POW_TABLE_SIZE = 1024;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const clamp01 = (value) => clamp(value, 0, 1);
    const mix = (start, end, amount) => start + ((end - start) * amount);

    const toNumber = (value, fallback) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    let colorParserContext = null;

    const getColorParserContext = () => {
        if (colorParserContext) {
            return colorParserContext;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        colorParserContext = canvas.getContext('2d');
        return colorParserContext;
    };

    const parseCssColor = (value) => {
        if (!value) {
            return null;
        }

        if (value.charAt(0) === '#') {
            if (value.length === 4) {
                return {
                    r: parseInt(value.charAt(1) + value.charAt(1), 16),
                    g: parseInt(value.charAt(2) + value.charAt(2), 16),
                    b: parseInt(value.charAt(3) + value.charAt(3), 16),
                };
            }

            if (value.length === 7) {
                return {
                    r: parseInt(value.slice(1, 3), 16),
                    g: parseInt(value.slice(3, 5), 16),
                    b: parseInt(value.slice(5, 7), 16),
                };
            }
        }

        const matches = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

        if (!matches) {
            return null;
        }

        return {
            r: Number(matches[1]),
            g: Number(matches[2]),
            b: Number(matches[3]),
        };
    };

    const parseColor = (value, fallback) => {
        const context = getColorParserContext();

        if (!context) {
            return fallback;
        }

        const fallbackValue = 'rgb(' + fallback.r + ', ' + fallback.g + ', ' + fallback.b + ')';

        try {
            context.fillStyle = fallbackValue;
            context.fillStyle = value || fallbackValue;
            return parseCssColor(context.fillStyle) || fallback;
        } catch (error) {
            return fallback;
        }
    };

    const parseColorUnit = (value, fallback) => {
        const color = parseColor(value, fallback);

        return {
            r: color.r / 255,
            g: color.g / 255,
            b: color.b / 255,
        };
    };

    const hash21 = (x, y) => {
        const seed = Math.sin((x * 12.9898) + (y * 78.233)) * 43758.5453;
        return seed - Math.floor(seed);
    };

    let grainTile = null;

    const getGrainTile = () => {
        if (grainTile) {
            return grainTile;
        }

        grainTile = new Float32Array(GRAIN_TILE_SIZE * GRAIN_TILE_SIZE);

        for (let y = 0; y < GRAIN_TILE_SIZE; y += 1) {
            for (let x = 0; x < GRAIN_TILE_SIZE; x += 1) {
                grainTile[(y * GRAIN_TILE_SIZE) + x] = hash21(x, y);
            }
        }

        return grainTile;
    };

    // El tile es potencia de dos, asi que el modulo se resuelve con una mascara.
    const getLatticeValue = (tile, x, y) => tile[((y & GRAIN_TILE_MASK) << GRAIN_TILE_SHIFT) + (x & GRAIN_TILE_MASK)];

    const powTables = {};

    // Los exponentes del grano de postproceso son constantes: se resuelven por tabla.
    const getPowTable = (exponent) => {
        const key = String(exponent);

        if (powTables[key]) {
            return powTables[key];
        }

        const table = new Float32Array(POW_TABLE_SIZE + 1);

        for (let index = 0; index <= POW_TABLE_SIZE; index += 1) {
            table[index] = Math.pow(index / POW_TABLE_SIZE, exponent);
        }

        powTables[key] = table;
        return table;
    };

    const lookupPow = (table, value) => table[(clamp01(value) * POW_TABLE_SIZE) | 0];

    const isLittleEndian = (() => {
        const probe = new ArrayBuffer(4);
        new Uint32Array(probe)[0] = 1;
        return new Uint8Array(probe)[0] === 1;
    })();

    // Escribir el pixel completo como entero de 32 bits evita cuatro escrituras clampeadas.
    const packPixel = isLittleEndian
        ? (red, green, blue) => (0xff000000 | (blue << 16) | (green << 8) | red)
        : (red, green, blue) => ((red << 24) | (green << 16) | (blue << 8) | 0xff);

    const valueNoise = (tile, x, y) => {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const ux = fx * fx * (3 - (2 * fx));
        const uy = fy * fy * (3 - (2 * fy));
        const a = getLatticeValue(tile, ix, iy);
        const b = getLatticeValue(tile, ix + 1, iy);
        const c = getLatticeValue(tile, ix, iy + 1);
        const d = getLatticeValue(tile, ix + 1, iy + 1);
        return mix(mix(a, b, ux), mix(c, d, ux), uy);
    };

    const normalizeConfig = (inputConfig) => ({
        imageUrl: inputConfig.imageUrl || '',
        width: Math.max(1, Math.round(toNumber(inputConfig.width, 1280))),
        height: Math.max(1, Math.round(toNumber(inputConfig.height, 720))),
        colorBack: inputConfig.colorBack || '#f2f1e8',
        colorFront: inputConfig.colorFront || '#2b2b2b',
        originalColors: inputConfig.originalColors !== false,
        inverted: Boolean(inputConfig.inverted),
        size: clamp(toNumber(inputConfig.size, 0.01), 0, 1),
        radius: clamp(toNumber(inputConfig.radius, 1.01), 0, 2),
        contrast: clamp(toNumber(inputConfig.contrast, 0.01), 0, 1),
        grainMixer: clamp(toNumber(inputConfig.grainMixer, 0.11), 0, 1),
        grainOverlay: clamp(toNumber(inputConfig.grainOverlay, 0), 0, 1),
        grainSize: clamp(toNumber(inputConfig.grainSize, 0), 0, 1),
        scale: clamp(toNumber(inputConfig.scale, 1), 0.1, 4),
        fit: inputConfig.fit === 'contain' ? 'contain' : 'cover',
        type: HALFTONE_TYPE,
        grid: HALFTONE_GRID,
    });

    const getDrawRect = (config, sourceWidth, sourceHeight, targetWidth, targetHeight) => {
        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = targetWidth / targetHeight;

        let baseWidth = 0;
        let baseHeight = 0;

        if (config.fit === 'contain') {
            if (sourceRatio > targetRatio) {
                baseWidth = targetWidth;
                baseHeight = baseWidth / sourceRatio;
            } else {
                baseHeight = targetHeight;
                baseWidth = baseHeight * sourceRatio;
            }
        } else if (sourceRatio > targetRatio) {
            baseHeight = targetHeight;
            baseWidth = baseHeight * sourceRatio;
        } else {
            baseWidth = targetWidth;
            baseHeight = baseWidth / sourceRatio;
        }

        const scaledWidth = baseWidth * config.scale;
        const scaledHeight = baseHeight * config.scale;

        return {
            x: (targetWidth - scaledWidth) / 2,
            y: (targetHeight - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
        };
    };

    const createSource = (image) => {
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        const factor = Math.min(1, SOURCE_LIMIT / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * factor));
        const height = Math.max(1, Math.round(sourceHeight * factor));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            return null;
        }

        context.drawImage(image, 0, 0, width, height);

        return {
            width,
            height,
            data: context.getImageData(0, 0, width, height).data,
        };
    };

    const createSigmoidTable = (contrast) => {
        const table = new Float32Array(256);

        for (let index = 0; index < 256; index += 1) {
            table[index] = 1 / (1 + Math.exp(-contrast * ((index / 255) - 0.5)));
        }

        return table;
    };

    const buildCellGrid = (source, config, padX, padY, minCellX, minCellY, cellsX, cellsY) => {
        const total = cellsX * cellsY;
        const radiusMod = new Float32Array(total);
        const inverted = new Uint8Array(total);
        const inFrame = new Uint8Array(total);
        const colors = new Float32Array(total * 3);
        const sourceData = source.data;
        const sourceWidth = source.width;
        const sourceHeight = source.height;

        const contrast = config.originalColors
            ? mix(0.1, 4, Math.pow(config.contrast, 2))
            : mix(0, 15, Math.pow(config.contrast, 1.5));
        const baseRadius = config.originalColors
            ? 2 * Math.pow(0.5 * config.radius, 0.3)
            : config.radius;

        const sigmoid = createSigmoidTable(contrast);

        for (let cellY = 0; cellY < cellsY; cellY += 1) {
            const samplingV = ((minCellY + cellY + 1) * padY) + 0.5;
            const insideV = samplingV >= -padY && samplingV <= 1 + padY;
            const sampleY = clamp(Math.round(clamp01(samplingV) * (sourceHeight - 1)), 0, sourceHeight - 1);

            for (let cellX = 0; cellX < cellsX; cellX += 1) {
                const cellIndex = (cellY * cellsX) + cellX;
                const samplingU = ((minCellX + cellX + 1) * padX) + 0.5;

                if (!insideV || samplingU < -padX || samplingU > 1 + padX) {
                    inFrame[cellIndex] = 0;
                    continue;
                }

                inFrame[cellIndex] = 1;

                const sampleX = clamp(Math.round(clamp01(samplingU) * (sourceWidth - 1)), 0, sourceWidth - 1);
                const sourceIndex = ((sampleY * sourceWidth) + sampleX) * 4;
                const alpha = sourceData[sourceIndex + 3] / 255;
                const red = sigmoid[sourceData[sourceIndex]];
                const green = sigmoid[sourceData[sourceIndex + 1]];
                const blue = sigmoid[sourceData[sourceIndex + 2]];

                let luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
                luminance = mix(1, luminance, alpha);

                if (config.inverted) {
                    luminance = 1 - luminance;
                }

                const radius = 0.75 * baseRadius * (1 - luminance);
                radiusMod[cellIndex] = radius - (Math.floor(radius / 0.5) * 0.5);
                inverted[cellIndex] = radius < 0.5 ? 0 : 1;

                const colorIndex = cellIndex * 3;
                colors[colorIndex] = (sourceData[sourceIndex] / 255) * alpha;
                colors[colorIndex + 1] = (sourceData[sourceIndex + 1] / 255) * alpha;
                colors[colorIndex + 2] = (sourceData[sourceIndex + 2] / 255) * alpha;
            }
        }

        return {
            radiusMod,
            inverted,
            inFrame,
            colors,
            cellsX,
            cellsY,
            minCellX,
            minCellY,
        };
    };

    const renderHalftoneFrame = (stage, canvas, source, config) => {
        const cssWidth = Math.max(1, Math.round(stage.clientWidth || config.width));
        const cssHeight = Math.max(1, Math.round(stage.clientHeight || config.height));
        const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);

        let width = Math.max(1, Math.round(cssWidth * pixelRatio));
        let height = Math.max(1, Math.round(cssHeight * pixelRatio));
        const totalPixels = width * height;

        if (totalPixels > MAX_PIXELS) {
            const ratio = Math.sqrt(MAX_PIXELS / totalPixels);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const imageData = context.createImageData(width, height);
        const buffer = new Uint32Array(imageData.data.buffer);
        const drawRect = getDrawRect(config, source.width, source.height, width, height);
        const imageAspect = drawRect.width / drawRect.height;

        const cellsPerSide = mix(300, 7, Math.pow(config.size, 0.7));
        const padY = 1 / cellsPerSide;
        const padX = padY / imageAspect;
        const cellPx = Math.max(0.0001, drawRect.height / cellsPerSide);
        const antialias = clamp(1 / cellPx, 0.0001, 0.5);
        const invAntialiasRange = 1 / (2 * antialias);

        const centerX = drawRect.x + (drawRect.width / 2);
        const centerY = drawRect.y + (drawRect.height / 2);
        const invCellPx = 1 / cellPx;
        const startX = ((0.5 - centerX) * invCellPx) - 0.5;
        const startY = ((0.5 - centerY) * invCellPx) - 0.5;

        const minCellX = Math.floor(startX);
        const maxCellX = Math.floor(startX + ((width - 1) * invCellPx));
        const minCellY = Math.floor(startY);
        const maxCellY = Math.floor(startY + ((height - 1) * invCellPx));
        const cellsX = Math.max(1, maxCellX - minCellX + 1);
        const cellsY = Math.max(1, maxCellY - minCellY + 1);

        const grid = buildCellGrid(source, config, padX, padY, minCellX, minCellY, cellsX, cellsY);
        const inFrame = grid.inFrame;
        const radiusMod = grid.radiusMod;
        const invertedCell = grid.inverted;
        const cellColors = grid.colors;

        const back = parseColorUnit(config.colorBack, { r: 242, g: 241, b: 232 });
        const front = parseColorUnit(config.colorFront, { r: 43, g: 43, b: 43 });
        const backRed = back.r * 255;
        const backGreen = back.g * 255;
        const backBlue = back.b * 255;
        const backPixel = packPixel((backRed + 0.5) | 0, (backGreen + 0.5) | 0, (backBlue + 0.5) | 0);
        const frontRed = front.r * 255;
        const frontGreen = front.g * 255;
        const frontBlue = front.b * 255;

        const useGrain = config.grainMixer > 0;
        const useGrainOverlay = config.grainOverlay > 0;
        const tile = (useGrain || useGrainOverlay) ? getGrainTile() : null;
        const grainScale = mix(2000, 200, config.grainSize);
        const grainScaleY = grainScale / imageAspect;
        const grainStepX = grainScale / drawRect.width;
        const grainStartX = (((0.5 - drawRect.x) / drawRect.width) - 0.5) * grainScale;
        const invGrainRange = 1 / ((0.7 + (0.2 * config.grainMixer)) - 0.55);

        // Todo lo que depende solo de la columna se resuelve una vez por frame.
        const columnCell = new Int32Array(width);
        const columnDeltaSq = new Float32Array(width);
        const grainColumnIndex0 = tile ? new Int32Array(width) : null;
        const grainColumnIndex1 = tile ? new Int32Array(width) : null;
        const grainColumnFraction = tile ? new Float32Array(width) : null;

        for (let x = 0; x < width; x += 1) {
            const pixelX = startX + (x * invCellPx);
            const cellX = Math.floor(pixelX);
            const deltaX = (pixelX - cellX) - 0.5;
            columnCell[x] = cellX - minCellX;
            columnDeltaSq[x] = deltaX * deltaX;

            if (tile) {
                const grainX = grainStartX + (x * grainStepX) + 0.5;
                const grainIntX = Math.floor(grainX);
                const grainFractionX = grainX - grainIntX;
                grainColumnIndex0[x] = grainIntX & GRAIN_TILE_MASK;
                grainColumnIndex1[x] = (grainIntX + 1) & GRAIN_TILE_MASK;
                grainColumnFraction[x] = grainFractionX * grainFractionX * (3 - (2 * grainFractionX));
            }
        }

        const cosOne = Math.cos(1);
        const sinOne = Math.sin(1);
        const cosTwo = Math.cos(2);
        const sinTwo = Math.sin(2);
        const overlayStepFirstX = grainStepX * cosOne;
        const overlayStepFirstY = grainStepX * sinOne;
        const overlayStepSecondX = grainStepX * cosTwo;
        const overlayStepSecondY = grainStepX * sinTwo;
        const overlayShapeTable = useGrainOverlay ? getPowTable(1.3) : null;
        const overlayStrengthTable = useGrainOverlay ? getPowTable(0.8) : null;

        for (let y = 0; y < height; y += 1) {
            const pixelY = startY + (y * invCellPx);
            const cellY = Math.floor(pixelY);
            const rowIndex = cellY - minCellY;
            const deltaY = (pixelY - cellY) - 0.5;
            const deltaYSq = deltaY * deltaY;
            const rowInside = rowIndex >= 0 && rowIndex < grid.cellsY;
            const rowOffset = rowIndex * grid.cellsX;
            let index = y * width;

            let grainRow0 = 0;
            let grainRow1 = 0;
            let grainFractionY = 0;
            let grainUvY = 0;
            let overlayFirstX = 0;
            let overlayFirstY = 0;
            let overlaySecondX = 0;
            let overlaySecondY = 0;

            if (tile) {
                const imageV = (y + 0.5 - drawRect.y) / drawRect.height;
                grainUvY = ((imageV - 0.5) * grainScaleY) + 0.5;
                const grainIntY = Math.floor(grainUvY);
                const fractionY = grainUvY - grainIntY;
                grainRow0 = (((grainIntY % GRAIN_TILE_SIZE) + GRAIN_TILE_SIZE) % GRAIN_TILE_SIZE) * GRAIN_TILE_SIZE;
                grainRow1 = ((((grainIntY + 1) % GRAIN_TILE_SIZE) + GRAIN_TILE_SIZE) % GRAIN_TILE_SIZE) * GRAIN_TILE_SIZE;
                grainFractionY = fractionY * fractionY * (3 - (2 * fractionY));

                if (useGrainOverlay) {
                    const grainUvXStart = grainStartX + 0.5;
                    overlayFirstX = (grainUvXStart * cosOne) - (grainUvY * sinOne) + 3;
                    overlayFirstY = (grainUvXStart * sinOne) + (grainUvY * cosOne) + 3;
                    overlaySecondX = (grainUvXStart * cosTwo) - (grainUvY * sinTwo) - 1;
                    overlaySecondY = (grainUvXStart * sinTwo) + (grainUvY * cosTwo) - 1;
                }
            }

            for (let x = 0; x < width; x += 1) {
                let shape = 0;
                let cellIndex = -1;

                if (rowInside) {
                    const columnIndex = columnCell[x];

                    if (columnIndex >= 0 && columnIndex < grid.cellsX) {
                        cellIndex = rowOffset + columnIndex;

                        if (inFrame[cellIndex]) {
                            const distance = Math.sqrt(columnDeltaSq[x] + deltaYSq);
                            const rawEdge = (distance - radiusMod[cellIndex] + antialias) * invAntialiasRange;
                            const edge = rawEdge < 0 ? 0 : (rawEdge > 1 ? 1 : rawEdge);
                            const circle = 1 - (edge * edge * (3 - (2 * edge)));
                            shape = invertedCell[cellIndex] ? 1 - circle : circle;
                        }
                    }
                }

                if (shape === 0 && !useGrainOverlay) {
                    buffer[index] = backPixel;
                    index += 1;
                    continue;
                }

                let finalShape = shape > 1 ? 1 : shape;

                if (useGrain) {
                    const column0 = grainColumnIndex0[x];
                    const column1 = grainColumnIndex1[x];
                    const fractionX = grainColumnFraction[x];
                    const top = mix(tile[grainRow0 + column0], tile[grainRow0 + column1], fractionX);
                    const bottom = mix(tile[grainRow1 + column0], tile[grainRow1 + column1], fractionX);
                    const noise = mix(top, bottom, grainFractionY);
                    const edge = clamp01((noise - 0.55) * invGrainRange);
                    const grain = edge * edge * (3 - (2 * edge)) * config.grainMixer;
                    finalShape = finalShape * (1 - grain);
                }

                let red = 0;
                let green = 0;
                let blue = 0;

                if (config.originalColors) {
                    // Replica el `totalColor / max(totalShape, eps)` del shader original.
                    const ratio = shape >= 0.0001 ? 1 : shape * 10000;
                    const coverage = ratio * finalShape;
                    const colorIndex = cellIndex >= 0 ? cellIndex * 3 : 0;
                    const inverseCoverage = 1 - coverage;

                    red = (cellColors[colorIndex] * coverage * 255) + (backRed * inverseCoverage);
                    green = (cellColors[colorIndex + 1] * coverage * 255) + (backGreen * inverseCoverage);
                    blue = (cellColors[colorIndex + 2] * coverage * 255) + (backBlue * inverseCoverage);
                } else {
                    const inverseShape = 1 - finalShape;
                    red = (frontRed * finalShape) + (backRed * inverseShape);
                    green = (frontGreen * finalShape) + (backGreen * inverseShape);
                    blue = (frontBlue * finalShape) + (backBlue * inverseShape);
                }

                if (useGrainOverlay) {
                    const overlay = lookupPow(overlayShapeTable, mix(
                        valueNoise(tile, overlayFirstX, overlayFirstY),
                        valueNoise(tile, overlaySecondX, overlaySecondY),
                        0.5
                    ));

                    const signedOverlay = (overlay * 2) - 1;
                    const overlayColor = signedOverlay >= 0 ? 255 : 0;
                    const strength = lookupPow(
                        overlayStrengthTable,
                        config.grainOverlay * Math.abs(signedOverlay)
                    ) * 0.5;

                    red = mix(red, overlayColor, strength);
                    green = mix(green, overlayColor, strength);
                    blue = mix(blue, overlayColor, strength);

                    overlayFirstX += overlayStepFirstX;
                    overlayFirstY += overlayStepFirstY;
                    overlaySecondX += overlayStepSecondX;
                    overlaySecondY += overlayStepSecondY;
                }

                buffer[index] = packPixel(
                    ((red + 0.5) | 0) & 255,
                    ((green + 0.5) | 0) & 255,
                    ((blue + 0.5) | 0) & 255
                );
                index += 1;
            }
        }

        context.putImageData(imageData, 0, 0);
    };

    const loadImage = (src) => new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error('missing-image'));
            return;
        }

        const image = new Image();
        image.decoding = 'async';

        if (/^https?:\/\//i.test(src)) {
            image.crossOrigin = 'anonymous';
        }

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('image-load-failed'));
        image.src = src;

        if (image.complete && image.naturalWidth > 0) {
            resolve(image);
        }
    });

    const mountHalftone = (stage, canvas, rawConfig) => {
        const config = normalizeConfig(rawConfig || {});
        let destroyed = false;
        let animationFrame = 0;
        let resizeObserver = null;
        let source = null;

        const scheduleRender = () => {
            if (destroyed || !source) {
                return;
            }

            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }

            animationFrame = window.requestAnimationFrame(() => {
                if (!destroyed) {
                    stage.classList.remove('is-loading', 'is-error');
                    renderHalftoneFrame(stage, canvas, source, config);
                }
            });
        };

        const onResize = () => {
            scheduleRender();
        };

        stage.classList.add('is-loading');

        loadImage(config.imageUrl)
            .then((image) => {
                if (destroyed) {
                    return;
                }

                source = createSource(image);

                if (!source) {
                    throw new Error('image-source-failed');
                }

                scheduleRender();

                if ('ResizeObserver' in window) {
                    resizeObserver = new ResizeObserver(onResize);
                    resizeObserver.observe(stage);
                }

                window.addEventListener('resize', onResize);
                window.addEventListener('orientationchange', onResize);
            })
            .catch(() => {
                if (destroyed) {
                    return;
                }

                stage.classList.remove('is-loading');
                stage.classList.add('is-error');
            });

        return () => {
            destroyed = true;

            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }

            if (resizeObserver) {
                resizeObserver.disconnect();
            }

            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    };

    const instances = new WeakMap();

    const initStage = (stage) => {
        if (!stage || instances.has(stage)) {
            return;
        }

        const canvas = stage.querySelector('.js-shader-halftone-canvas');
        if (!canvas) {
            return;
        }

        let config = {};

        try {
            config = JSON.parse(stage.getAttribute('data-halftone-config') || '{}');
        } catch (error) {
            stage.classList.add('is-error');
            return;
        }

        instances.set(stage, mountHalftone(stage, canvas, config));
    };

    const initAllHalftones = (root = document) => {
        root.querySelectorAll('.js-shader-halftone').forEach((stage) => {
            initStage(stage);
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        initAllHalftones();

        if ('MutationObserver' in window) {
            const observer = new MutationObserver((entries) => {
                entries.forEach((entry) => {
                    entry.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) {
                            return;
                        }

                        if (node.matches('.js-shader-halftone')) {
                            initStage(node);
                            return;
                        }

                        initAllHalftones(node);
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    });
})();
