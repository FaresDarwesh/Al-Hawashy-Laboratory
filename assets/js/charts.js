/* =========================================================
Charts — رسم بياني بدون أي مكتبات خارجية (Canvas)
الأنواع: line (area) | bar | hbar | donut | spark
========================================================= */
(function (global) {
'use strict';
var PALETTE = ['#0e7c86', '#22d3ee', '#f2a93b', '#7c3aed', '#16a34a', '#e11d48', '#0284c7', '#db2777', '#65a30d', '#ea580c'];
function css(v) {
return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
function theme() {
var dark = document.documentElement.getAttribute('data-theme') === 'dark';
return {
text: dark ? '#9db4c6' : '#5a7183',
grid: dark ? 'rgba(255,255,255,.07)' : 'rgba(6,40,61,.08)',
line: dark ? '#17354a' : '#e2e8f0',
title: dark ? '#e8f4fb' : '#0f2b3d'
};
}
/* يقبل عنصر <canvas> أو أي حاوية (div) فيُنشئ canvas بداخلها */
function resolve(target) {
if (!target) return null;
if (target.tagName === 'CANVAS') return target;
var c = target.querySelector('canvas');
if (!c) {
c = document.createElement('canvas');
c.style.cssText = 'width:100%;height:100%;display:block';
target.appendChild(c);
}
return c;
}
function setup(el) {
var canvas = resolve(el);
if (!canvas) return { ctx: null, w: 0, h: 0, dead: true };
var dpr = window.devicePixelRatio || 1;
var r = canvas.getBoundingClientRect();
var w = r.width || canvas.parentElement.clientWidth || 400;
var h = r.height || canvas.parentElement.clientHeight || 260;
canvas.width = w * dpr; canvas.height = h * dpr;
var ctx = canvas.getContext('2d');
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.clearRect(0, 0, w, h);
return { ctx: ctx, w: w, h: h };
}
function gradient(ctx, x0, y0, x1, y1, color) {
var g = ctx.createLinearGradient(x0, y0, x1, y1);
g.addColorStop(0, color + 'cc'); g.addColorStop(1, color + '05');
return g;
}
function fmt(n) {
n = Number(n) || 0;
if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'م';
if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'ألف';
return Math.round(n).toLocaleString('en-US');
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
/* ---------- Line / Area ---------- */
function line(el, opts) {
var canvas = resolve(el);
if (!canvas) return;
var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h, T = theme();
var labels = opts.labels || [], series = (opts.series || []).map(function (x) { return x.data || x; });
var names = (opts.series || []).map(function (x, i) { return x.name || ('سلسلة ' + (i + 1)); });
var pad = { t: 16, r: 16, b: 34, l: 46 };
var max = 0;
series.forEach(function (arr) { arr.forEach(function (v) { if (v > max) max = v; }); });
max = max || 1; max = max * 1.12;
var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
var stepX = labels.length > 1 ? iw / (labels.length - 1) : iw;
// grid
ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.font = '11px ' + (opts.font || 'Tahoma');
ctx.fillStyle = T.text; ctx.textAlign = 'right';
for (var gi = 0; gi <= 4; gi++) {
var y = pad.t + ih - (ih / 4) * gi;
ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
ctx.fillText(fmt(max / 4 * gi), pad.l - 8, y + 4);
}
// labels x
ctx.textAlign = 'center';
var every = Math.ceil(labels.length / 8);
labels.forEach(function (lb, i) {
if (i % every !== 0 && i !== labels.length - 1) return;
ctx.fillText(lb, pad.l + stepX * i, h - 10);
});
function drawSeries(p) {
series.forEach(function (arr, si) {
var color = opts.colors ? opts.colors[si % opts.colors.length] : PALETTE[si % PALETTE.length];
var n = arr.length;
ctx.beginPath();
for (var i = 0; i < n; i++) {
var x = pad.l + stepX * i;
var y = pad.t + ih - (arr[i] / max) * ih * p;
i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
}
if (opts.fill !== false) {
var lg = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
lg.addColorStop(0, color + '55'); lg.addColorStop(1, color + '02');
ctx.save();
ctx.lineTo(pad.l + stepX * (n - 1), pad.t + ih); ctx.lineTo(pad.l, pad.t + ih); ctx.closePath();
ctx.fillStyle = lg; ctx.fill(); ctx.restore();
}
ctx.beginPath();
for (var j = 0; j < n; j++) {
var xx = pad.l + stepX * j, yy = pad.t + ih - (arr[j] / max) * ih * p;
j === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
}
ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke();
if (opts.dots !== false) {
for (var k = 0; k < n; k++) {
var dx = pad.l + stepX * k, dy = pad.t + ih - (arr[k] / max) * ih * p;
ctx.beginPath(); ctx.arc(dx, dy, 3.4, 0, 6.3); ctx.fillStyle = '#fff'; ctx.fill();
ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.stroke();
}
}
});
}
animate(function (p) { drawSeries(easeOut(p)); });
// tooltip
bindTooltip(canvas, function (mx) {
var i = Math.round((mx - pad.l) / (stepX || 1));
i = Math.max(0, Math.min(labels.length - 1, i));
return { title: labels[i], rows: series.map(function (arr, si) { return { c: opts.colors ? opts.colors[si % opts.colors.length] : PALETTE[si % PALETTE.length], n: names[si], v: arr[i] }; }) };
});
function animate(cb) {
var st = performance.now(), dur = opts.duration || 900;
(function step(now) {
var p = Math.min(1, (now - st) / dur);
ctx.clearRect(0, 0, w, h);
// أعد رسم الشبكة
ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.font = '11px Tahoma'; ctx.fillStyle = T.text; ctx.textAlign = 'right';
for (var gi = 0; gi <= 4; gi++) {
var y = pad.t + ih - (ih / 4) * gi;
ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
ctx.fillText(fmt(max / 4 * gi), pad.l - 8, y + 4);
}
ctx.textAlign = 'center';
labels.forEach(function (lb, ix) { if (ix % every === 0 || ix === labels.length - 1) ctx.fillText(lb, pad.l + stepX * ix, h - 10); });
cb(p);
if (p < 1) requestAnimationFrame(step);
})(st);
}
return canvas.__tooltipRefresh;
}
/* ---------- Bar ---------- */
function bar(el, opts) {
var canvas = resolve(el);
if (!canvas) return;
var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h, T = theme();
var labels = opts.labels || [], data = opts.data || [];
var pad = { t: 18, r: 14, b: 40, l: 46 };
var max = Math.max.apply(null, data.concat([1])) * 1.15;
var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
var bw = iw / (data.length || 1);
ctx.font = '11px Tahoma'; ctx.textAlign = 'center';
data.forEach(function (v, i) {
var x = pad.l + bw * i + bw * .16;
var bwidth = bw * .68;
var y = pad.t + ih, hh = 0;
var color = opts.colors ? opts.colors[i % opts.colors.length] : PALETTE[i % PALETTE.length];
var st = performance.now(), dur = 900;
(function step(now) {
var p = easeOut(Math.min(1, (now - st) / dur));
if (i === 0) {
ctx.clearRect(0, 0, w, h);
ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.fillStyle = T.text; ctx.textAlign = 'right';
for (var gi = 0; gi <= 4; gi++) {
var gy = pad.t + ih - (ih / 4) * gi;
ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
ctx.fillText(fmt(max / 4 * gi), pad.l - 8, gy + 4);
}
}
var tg = (v / max) * ih * p;
var g = ctx.createLinearGradient(0, pad.t + ih - tg, 0, pad.t + ih);
g.addColorStop(0, color); g.addColorStop(1, color + '33');
ctx.fillStyle = g;
roundRect(ctx, x, pad.t + ih - tg, bwidth, tg, Math.min(8, bwidth / 2));
ctx.fill();
if (p >= 1 && data.length <= 12) {
ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.font = 'bold 11px Tahoma';
ctx.fillText(fmt(v), x + bwidth / 2, pad.t + ih - tg - 6);
}
if (p < 1) requestAnimationFrame(step);
else if (i === data.length - 1) {
ctx.fillStyle = T.text; ctx.font = '11px Tahoma'; ctx.textAlign = 'center';
labels.forEach(function (lb, ix) {
ctx.fillText(short(lb), pad.l + bw * ix + bw / 2, h - 8);
});
}
})(st);
});
bindTooltip(canvas, function (mx, my) {
var i = Math.floor((mx - pad.l) / (bw || 1));
i = Math.max(0, Math.min(data.length - 1, i));
return { title: labels[i], rows: [{ c: opts.colors ? opts.colors[i % opts.colors.length] : PALETTE[i % PALETTE.length], n: opts.name || 'القيمة', v: data[i] }] };
});
}
function short(s) { s = String(s); return s.length > 12 ? s.slice(0, 11) + '…' : s; }
/* ---------- Horizontal bar ---------- */
function hbar(el, opts) {
var canvas = resolve(el);
if (!canvas) return;
var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h, T = theme();
var labels = opts.labels || [], data = opts.data || [];
var pad = { t: 10, r: 60, b: 10, l: 130 };
var max = Math.max.apply(null, data.concat([1]));
var ih = h - pad.t - pad.b, bh = ih / (data.length || 1), iw = w - pad.l - pad.r;
ctx.clearRect(0, 0, w, h);
ctx.font = 'bold 12px Tahoma'; ctx.textAlign = 'right'; ctx.fillStyle = T.title;
data.forEach(function (v, i) {
var y = pad.t + bh * i + bh * .18;
var barH = bh * .64;
var color = opts.colors ? opts.colors[i % opts.colors.length] : PALETTE[i % PALETTE.length];
var st = performance.now(), dur = 800;
(function step(now) {
var p = easeOut(Math.min(1, (now - st) / dur));
ctx.clearRect(0, pad.t + bh * i, w, bh);
ctx.fillStyle = T.text; ctx.font = 'bold 12px Tahoma'; ctx.textAlign = 'right';
ctx.fillText(short(labels[i] || ''), pad.l - 10, y + barH * .72);
ctx.fillStyle = 'rgba(100,116,139,.13)';
roundRect(ctx, pad.l, y, iw, barH, 6); ctx.fill();
var g = ctx.createLinearGradient(pad.l, 0, pad.l + iw, 0);
g.addColorStop(0, color + '55'); g.addColorStop(1, color);
ctx.fillStyle = g;
roundRect(ctx, pad.l, y, Math.max(3, (v / max) * iw * p), barH, 6); ctx.fill();
ctx.fillStyle = T.title; ctx.font = 'bold 12px Tahoma'; ctx.textAlign = 'left';
ctx.fillText(fmt(v), pad.l + iw + 8, y + barH * .75);
if (p < 1) requestAnimationFrame(step);
})(st);
});
}
/* ---------- Donut ---------- */
function donut(el, opts) {
var canvas = resolve(el);
if (!canvas) return;
var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h, T = theme();
var labels = opts.labels || [], data = opts.data || [];
var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 12, r = R * .62;
var sum = data.reduce(function (a, b) { return a + b; }, 0) || 1;
var st = performance.now(), dur = 1000;
(function step(now) {
var p = easeOut(Math.min(1, (now - st) / dur));
ctx.clearRect(0, 0, w, h);
var a0 = -Math.PI / 2;
data.forEach(function (v, i) {
var a1 = a0 + (v / sum) * Math.PI * 2 * p;
var color = opts.colors ? opts.colors[i % opts.colors.length] : PALETTE[i % PALETTE.length];
ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, r, a1, a0, true); ctx.closePath();
var g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
g.addColorStop(0, color); g.addColorStop(1, color + 'aa');
ctx.fillStyle = g; ctx.fill();
ctx.strokeStyle = css('--card') || '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
a0 = a1;
});
ctx.fillStyle = T.title; ctx.textAlign = 'center'; ctx.font = 'bold 20px Tahoma';
ctx.fillText(fmt(sum), cx, cy + 2);
ctx.fillStyle = T.text; ctx.font = '11px Tahoma';
ctx.fillText(opts.centerLabel || 'الإجمالي', cx, cy + 20);
if (p < 1) requestAnimationFrame(step);
})(st);
bindTooltip(canvas, function (mx, my) {
var dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy);
if (dist < r || dist > R) return null;
var ang = Math.atan2(dy, dx) + Math.PI / 2; if (ang < 0) ang += Math.PI * 2;
var acc = 0;
for (var i = 0; i < data.length; i++) {
var seg = (data[i] / sum) * Math.PI * 2;
if (ang <= acc + seg) return { title: labels[i], rows: [{ c: PALETTE[i % PALETTE.length], n: 'النسبة', v: Math.round(data[i] / sum * 100) + '%' }] };
acc += seg;
}
return null;
});
}
/* ---------- Sparkline (SVG string) ---------- */
function spark(data, color) {
var w = 110, h = 46, max = Math.max.apply(null, data.concat([1])), min = Math.min.apply(null, data.concat([0]));
var range = (max - min) || 1;
var pts = data.map(function (v, i) {
var x = (i / Math.max(1, data.length - 1)) * w;
var y = h - ((v - min) / range) * (h - 8) - 4;
return x.toFixed(1) + ',' + y.toFixed(1);
}).join(' ');
return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
'<polyline fill="none" stroke="' + (color || '#fff') + '" stroke-width="2.6" stroke-linejoin="round" points="' + pts + '"/></svg>';
}
/* ---------- Tooltip ---------- */
function bindTooltip(canvas, hit) {
var tip = document.createElement('div');
tip.style.cssText = 'position:fixed;z-index:5000;pointer-events:none;background:rgba(6,40,61,.95);color:#fff;' +
'padding:10px 13px;border-radius:11px;font-size:12.5px;box-shadow:0 12px 30px rgba(0,0,0,.3);display:none;min-width:130px;font-family:Tahoma';
document.body.appendChild(tip);
canvas.addEventListener('mousemove', function (e) {
var r = canvas.getBoundingClientRect();
var res = hit(e.clientX - r.left, e.clientY - r.top);
if (!res) { tip.style.display = 'none'; return; }
tip.innerHTML = '<b style="display:block;margin-bottom:6px">' + res.title + '</b>' +
res.rows.map(function (row) {
return '<div style="display:flex;align-items:center;gap:7px;margin:3px 0">' +
'<i style="width:9px;height:9px;border-radius:2px;background:' + row.c + ';display:inline-block"></i>' +
'<span style="color:#bcd7e4">' + row.n + ':</span><b dir="ltr" style="margin-inline-start:auto">' +
(typeof row.v === 'number' ? row.v.toLocaleString('en-US') : row.v) + '</b></div>';
}).join('');
tip.style.display = 'block';
var tw = tip.offsetWidth;
tip.style.left = Math.min(window.innerWidth - tw - 10, e.clientX + 16) + 'px';
tip.style.top = (e.clientY - 20) + 'px';
});
canvas.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
}
function roundRect(ctx, x, y, w, h, r) {
r = Math.min(r, w / 2, h / 2);
ctx.beginPath();
ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
global.Charts = { line: line, bar: bar, hbar: hbar, donut: donut, spark: spark, PALETTE: PALETTE, fmt: fmt };
})(window);
