/* Mouse-tracking eyes for the hero profile illustration.
 *
 * profile.png is a painted portrait whose irises are baked into the artwork, so
 * simply overlaying a moving pupil would leave two irises behind. Instead we
 *
 *   1. erase the painted iris (iris disc intersected with the eye opening) and
 *      repair the sclera from the surrounding eye white,
 *   2. redraw a live iris on a canvas overlay, clipped to the eye opening so
 *      the iris slides under the eyelids,
 *   3. steer it with the pointer, exactly like "Eyes that follow the mouse".
 *
 * All coordinates below are pixels of the 1148x1125 source image.
 */
(function () {
    'use strict';

    var SOURCE_W = 1148;
    var SOURCE_H = 1125;

    /* Eye geometry traced from profile.png.
     * `poly` follows the inner edge of the eyelids, `home` is the centre of the
     * painted iris and `radius` the radius of the painted iris disc. */
    var EYES = [
        {
            /* viewer's left eye */
            home: { x: 503, y: 330 },
            radius: 44,
            travel: { x: 32, y: 14 },
            poly: [
                [462, 320], [470, 313], [480, 310], [490, 308], [500, 307],
                [510, 308], [520, 310], [530, 312], [540, 314], [550, 316],
                [560, 318], [570, 322], [578, 330], [584, 340], [588, 352],
                [588, 362], [582, 372], [575, 379], [566, 381], [555, 377],
                [540, 372], [528, 368], [515, 365], [500, 360], [488, 354],
                [478, 346], [470, 338], [464, 330]
            ]
        },
        {
            /* viewer's right eye */
            home: { x: 732, y: 422 },
            radius: 36,
            travel: { x: 26, y: 11 },
            poly: [
                [692, 412], [700, 397], [710, 396], [720, 397], [730, 398],
                [740, 398], [751, 399], [760, 400], [770, 403], [780, 406],
                [790, 412], [800, 421], [808, 432], [813, 443], [815, 455],
                [810, 466], [805, 476], [795, 470], [785, 464], [775, 459],
                [765, 455], [755, 452], [745, 449], [735, 446], [725, 444],
                [715, 441], [705, 437], [697, 428]
            ]
        }
    ];

    var POINTER_RANGE = 250;   /* source px needed to reach the full travel */
    var EASE = 0.25;           /* easing per animation frame */
    var SETTLE = 0.15;         /* below this the animation stops */

    var img = document.getElementById('profile-img');
    var wrap = document.getElementById('profile-wrap');
    var canvas = document.getElementById('eye-canvas');
    if (!img || !wrap || !canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var source = document.createElement('canvas');   /* scratch canvas for the inpaint */
    var sourceCtx = source.getContext('2d', { willReadFrequently: true });
    var patches = [];             /* the repaired eye patches, in source pixels */
    var layout = { scale: 1, x: 0, y: 0 };
    var running = false;
    var eyes = EYES.map(function (eye) {
        return {
            def: eye,
            x: eye.home.x,
            y: eye.home.y,
            targetX: eye.home.x,
            targetY: eye.home.y
        };
    });

    /* ---------------------------------------------------------------- utils */

    function pointInPoly(px, py, poly) {
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i][0], yi = poly[i][1];
            var xj = poly[j][0], yj = poly[j][1];
            if ((yi > py) !== (yj > py) &&
                px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    function tracePoly(c, poly) {
        c.beginPath();
        c.moveTo(poly[0][0], poly[0][1]);
        for (var i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
        c.closePath();
    }

    /* ------------------------------------------------------------- inpainting */

    /* Repairs the hole (the painted iris) with the colour of the eye white.
     *
     * Only the light sclera pixels are used as a source: the dark eyelid and
     * lash pixels are treated as walls, otherwise their colour bleeds into the
     * repair and leaves a grey smear behind. The repair is a flood fill of the
     * hole starting from the surrounding sclera, smoothed afterwards. */
    function inpaint(imageData, hole) {
        var w = imageData.width, h = imageData.height, d = imageData.data;
        var total = w * h;
        var px = new Float32Array(total * 3);
        var next = new Float32Array(total * 3);
        var state = new Uint8Array(total);   /* 0 = hole, 1 = sclera, 2 = wall, 3 = repaired */
        var queue = [];
        var i, c, idx, x, y;

        for (i = 0; i < total; i++) {
            px[i * 3] = d[i * 4];
            px[i * 3 + 1] = d[i * 4 + 1];
            px[i * 3 + 2] = d[i * 4 + 2];
            if (hole[i]) {
                state[i] = 0;
                continue;
            }
            var mn = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
            var mx = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
            if (mn >= 215 && mx - mn <= 60) {
                state[i] = 1;             /* sclera: a source for the repair */
                queue.push(i);
            } else {
                state[i] = 2;             /* lash, skin: a wall */
            }
        }

        /* flood the hole from the sclera */
        var head = 0;
        while (head < queue.length) {
            idx = queue[head++];
            x = idx % w;
            y = (idx / w) | 0;
            var neighbours = [];
            if (x > 0) neighbours.push(idx - 1);
            if (x < w - 1) neighbours.push(idx + 1);
            if (y > 0) neighbours.push(idx - w);
            if (y < h - 1) neighbours.push(idx + w);
            for (var n = 0; n < neighbours.length; n++) {
                var q = neighbours[n];
                if (state[q] !== 0) continue;
                state[q] = 3;
                for (c = 0; c < 3; c++) px[q * 3 + c] = px[idx * 3 + c];
                queue.push(q);
            }
        }

        /* anything the flood could not reach falls back to the mean sclera */
        var count = 0, sum = [0, 0, 0];
        for (i = 0; i < total; i++) {
            if (state[i] !== 1) continue;
            count++;
            sum[0] += px[i * 3];
            sum[1] += px[i * 3 + 1];
            sum[2] += px[i * 3 + 2];
        }
        if (count > 0) {
            sum = [sum[0] / count, sum[1] / count, sum[2] / count];
            for (i = 0; i < total; i++) {
                if (state[i] !== 0) continue;
                state[i] = 3;
                for (c = 0; c < 3; c++) px[i * 3 + c] = sum[c];
            }
        }

        /* the eyelids cast a shadow onto the repaired area */
        var dist = new Int32Array(total).fill(-1);
        var shadowQueue = [];
        for (i = 0; i < total; i++) {
            if (state[i] === 2) {
                dist[i] = 0;
                shadowQueue.push(i);
            }
        }
        for (head = 0; head < shadowQueue.length; head++) {
            idx = shadowQueue[head];
            x = idx % w;
            y = (idx / w) | 0;
            var around = [];
            if (x > 0) around.push(idx - 1);
            if (x < w - 1) around.push(idx + 1);
            if (y > 0) around.push(idx - w);
            if (y < h - 1) around.push(idx + w);
            for (var m = 0; m < around.length; m++) {
                var a = around[m];
                if (dist[a] !== -1) continue;
                dist[a] = dist[idx] + 1;
                shadowQueue.push(a);
            }
        }

        /* match the brightness of the painted sclera before shading it */
        var srcSum = [0, 0, 0], srcCount = 0;
        var fixSum = [0, 0, 0], fixCount = 0;
        for (i = 0; i < total; i++) {
            if (state[i] === 1) {
                srcCount++;
                for (c = 0; c < 3; c++) srcSum[c] += px[i * 3 + c];
            } else if (state[i] === 3) {
                fixCount++;
                for (c = 0; c < 3; c++) fixSum[c] += px[i * 3 + c];
            }
        }
        if (srcCount > 0 && fixCount > 0) {
            for (c = 0; c < 3; c++) {
                var gain = (srcSum[c] / srcCount) / (fixSum[c] / fixCount);
                if (!isFinite(gain) || gain <= 0) gain = 1;
                gain = Math.min(gain, 1.6);
                for (i = 0; i < total; i++) {
                    if (state[i] !== 3) continue;
                    px[i * 3 + c] *= gain;
                }
            }
        }

        for (i = 0; i < total; i++) {
            if (state[i] !== 3) continue;
            var shade = 1 - 0.28 * Math.exp(-dist[i] / 9);
            px[i * 3] *= shade;
            px[i * 3 + 1] *= shade;
            px[i * 3 + 2] *= shade;
        }

        /* smooth the repair, the sclera pixels stay untouched */
        for (var iter = 0; iter < 16; iter++) {
            for (y = 0; y < h; y++) {
                for (x = 0; x < w; x++) {
                    idx = y * w + x;
                    if (state[idx] !== 3) {
                        for (c = 0; c < 3; c++) next[idx * 3 + c] = px[idx * 3 + c];
                        continue;
                    }
                    var acc = [0, 0, 0], n2 = 0, oy, ox;
                    for (oy = -1; oy <= 1; oy++) {
                        for (ox = -1; ox <= 1; ox++) {
                            if (!ox && !oy) continue;
                            var nx = x + ox, ny = y + oy;
                            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                            var nidx = ny * w + nx;
                            if (state[nidx] !== 1 && state[nidx] !== 3) continue;
                            acc[0] += px[nidx * 3];
                            acc[1] += px[nidx * 3 + 1];
                            acc[2] += px[nidx * 3 + 2];
                            n2++;
                        }
                    }
                    if (!n2) {
                        for (c = 0; c < 3; c++) next[idx * 3 + c] = px[idx * 3 + c];
                    } else {
                        for (c = 0; c < 3; c++) next[idx * 3 + c] = acc[c] / n2;
                    }
                }
            }
            var swap = px;
            px = next;
            next = swap;
        }

        for (i = 0; i < total; i++) {
            if (!hole[i]) continue;
            d[i * 4] = px[i * 3];
            d[i * 4 + 1] = px[i * 3 + 1];
            d[i * 4 + 2] = px[i * 3 + 2];
        }
    }

    /* Repairs the painted irises and keeps the repaired pixels as transparent
     * patches that cover only the holes. */
    function buildPatches() {
        patches = [];
        source.width = SOURCE_W;
        source.height = SOURCE_H;
        sourceCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
        sourceCtx.drawImage(img, 0, 0, SOURCE_W, SOURCE_H);

        for (var i = 0; i < EYES.length; i++) {
            var eye = EYES[i];
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            var j;
            for (j = 0; j < eye.poly.length; j++) {
                minX = Math.min(minX, eye.poly[j][0]);
                maxX = Math.max(maxX, eye.poly[j][0]);
                minY = Math.min(minY, eye.poly[j][1]);
                maxY = Math.max(maxY, eye.poly[j][1]);
            }
            var pad = 4;
            var x0 = Math.max(0, minX - pad);
            var y0 = Math.max(0, minY - pad);
            var w = Math.min(SOURCE_W - x0, maxX - x0 + pad + 1);
            var h = Math.min(SOURCE_H - y0, maxY - y0 + pad + 1);

            /* the painted iris: iris disc clipped by the eye opening */
            var region = sourceCtx.getImageData(x0, y0, w, h);
            var mask = new Uint8Array(w * h);
            var r2 = eye.radius * eye.radius;
            var yy, xx, sx, sy;
            for (yy = 0; yy < h; yy++) {
                for (xx = 0; xx < w; xx++) {
                    sx = xx + x0 - eye.home.x;
                    sy = yy + y0 - eye.home.y;
                    if (sx * sx + sy * sy > r2) continue;
                    if (!pointInPoly(xx + x0, yy + y0, eye.poly)) continue;
                    mask[yy * w + xx] = 1;
                }
            }
            inpaint(region, mask);

            /* keep the repaired pixels only, everything else stays transparent */
            var patch = sourceCtx.createImageData(w, h);
            for (var p = 0; p < w * h; p++) {
                if (!mask[p]) continue;
                patch.data[p * 4] = region.data[p * 4];
                patch.data[p * 4 + 1] = region.data[p * 4 + 1];
                patch.data[p * 4 + 2] = region.data[p * 4 + 2];
                patch.data[p * 4 + 3] = 255;
            }
            var patchCanvas = document.createElement('canvas');
            patchCanvas.width = w;
            patchCanvas.height = h;
            patchCanvas.getContext('2d').putImageData(patch, 0, 0);
            patches.push({ canvas: patchCanvas, x: x0, y: y0 });
        }

        /* the scratch canvas is not needed any more */
        source.width = source.height = 0;
    }

    /* ---------------------------------------------------------------- drawing */

    function drawIris(c, eye, cx, cy) {
        var r = eye.radius;

        var body = c.createRadialGradient(cx - r * 0.18, cy + r * 0.22, r * 0.08, cx, cy, r);
        body.addColorStop(0, 'rgb(16,8,18)');
        body.addColorStop(0.5, 'rgb(22,11,26)');
        body.addColorStop(0.85, 'rgb(40,28,44)');
        body.addColorStop(1, 'rgb(64,42,36)');
        c.fillStyle = body;
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.fill();

        /* glossy highlight, upper left */
        c.save();
        c.translate(cx - r * 0.34, cy - r * 0.34);
        c.rotate(-0.55);
        c.scale(1, 0.6);
        var hl = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
        hl.addColorStop(0, 'rgba(255,255,255,0.95)');
        hl.addColorStop(0.55, 'rgba(255,255,255,0.5)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = hl;
        c.beginPath();
        c.arc(0, 0, r * 0.32, 0, Math.PI * 2);
        c.fill();
        c.restore();

        /* blue catch light, lower right */
        c.save();
        c.translate(cx + r * 0.42, cy + r * 0.2);
        var gl = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.24);
        gl.addColorStop(0, 'rgba(150,180,240,0.95)');
        gl.addColorStop(0.6, 'rgba(96,132,214,0.85)');
        gl.addColorStop(1, 'rgba(60,92,180,0)');
        c.fillStyle = gl;
        c.beginPath();
        c.arc(0, 0, r * 0.24, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    function render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(layout.scale, 0, 0, layout.scale, layout.x, layout.y);

        /* the repaired eye white, painted over the original iris */
        for (var i = 0; i < patches.length; i++) {
            ctx.drawImage(patches[i].canvas, patches[i].x, patches[i].y);
        }

        for (var j = 0; j < eyes.length; j++) {
            var eye = eyes[j];
            ctx.save();
            tracePoly(ctx, eye.def.poly);
            ctx.clip();
            drawIris(ctx, eye.def, eye.x, eye.y);
            ctx.restore();
        }
    }

    /* --------------------------------------------------------------- layout */

    function resize() {
        var w = img.offsetWidth, h = img.offsetHeight;
        if (!w || !h) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        /* the wrapper is the offset parent, so these are wrapper relative */
        canvas.style.left = img.offsetLeft + 'px';
        canvas.style.top = img.offsetTop + 'px';
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);

        /* replicate the object-cover fit of the image */
        var scale = Math.max(w / SOURCE_W, h / SOURCE_H) * dpr;
        layout.scale = scale;
        layout.x = (w * dpr - SOURCE_W * scale) / 2;
        layout.y = (h * dpr - SOURCE_H * scale) / 2;
        canvas.style.visibility = 'visible';
        render();
    }

    /* ------------------------------------------------------------ animation */

    function aim(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        /* client coords -> device pixels of the canvas -> source pixels */
        var mx = ((clientX - rect.left) / rect.width * canvas.width - layout.x) / layout.scale;
        var my = ((clientY - rect.top) / rect.height * canvas.height - layout.y) / layout.scale;

        for (var i = 0; i < eyes.length; i++) {
            var eye = eyes[i];
            var home = eye.def.home;
            var dx = mx - home.x, dy = my - home.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var reach = Math.min(1, dist / POINTER_RANGE);
            eye.targetX = home.x + (dx / dist) * eye.def.travel.x * reach;
            eye.targetY = home.y + (dy / dist) * eye.def.travel.y * reach;
        }
        start();
    }

    function tick() {
        var moving = false;
        for (var i = 0; i < eyes.length; i++) {
            var eye = eyes[i];
            var dx = eye.targetX - eye.x;
            var dy = eye.targetY - eye.y;
            if (Math.abs(dx) > SETTLE || Math.abs(dy) > SETTLE) moving = true;
            eye.x += dx * EASE;
            eye.y += dy * EASE;
        }
        render();
        if (moving) {
            window.requestAnimationFrame(tick);
        } else {
            running = false;
        }
    }

    function start() {
        if (reduced || running) return;
        running = true;
        window.requestAnimationFrame(tick);
    }

    /* ----------------------------------------------------------------- init */

    function init() {
        if (img.naturalWidth !== SOURCE_W || img.naturalHeight !== SOURCE_H) return;
        buildPatches();
        resize();

        if (!reduced) {
            window.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
            window.addEventListener('touchmove', function (e) {
                if (!e.touches.length) return;
                aim(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: true });
        }

        if (window.ResizeObserver) {
            new ResizeObserver(resize).observe(img);
        } else {
            window.addEventListener('resize', resize);
        }
    }

    if (img.complete && img.naturalWidth) {
        init();
    } else {
        img.addEventListener('load', init, { once: true });
    }
})();
