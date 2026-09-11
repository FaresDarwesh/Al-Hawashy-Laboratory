/* =========================================================
QR Code Encoder — مكتوب من الصفر بدون أي مكتبة خارجية
يدعم: Byte mode / مستوى تصحيح خطأ M / إصدارات 1-6
الاستخدام: QR.svg(text, size) | QR.canvas(canvas, text) | QR.matrix(text)
========================================================= */
(function (global) {
'use strict';
/* ---------- GF(256) ---------- */
var EXP = new Array(512), LOG = new Array(256);
(function () {
var x = 1;
for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
})();
function gmul(a, b) { if (!a || !b) return 0; return EXP[LOG[a] + LOG[b]]; }
function genPoly(d) {
var p = [1];
for (var i = 0; i < d; i++) {
var np = new Array(p.length + 1);
for (var k = 0; k < np.length; k++) np[k] = 0;
for (var j = 0; j < p.length; j++) { np[j] ^= p[j]; np[j + 1] ^= gmul(p[j], EXP[i]); }
p = np;
}
return p;
}
function rsEncode(data, ecLen) {
var g = genPoly(ecLen);
var res = new Array(data.length + ecLen);
for (var i = 0; i < res.length; i++) res[i] = i < data.length ? data[i] : 0;
for (var i2 = 0; i2 < data.length; i2++) {
var c = res[i2];
if (c === 0) continue;
for (var j = 0; j < g.length; j++) res[i2 + j] ^= gmul(g[j], c);
}
return res.slice(data.length);
}
/* ---------- جداول الإصدارات (EC level M) ----------
[عدد أكواد البيانات لكل بلوك، عدد البلوكات، عدد أكواد التصحيح لكل بلوك] */
var VERSIONS = [
null,
{ data: 16, blocks: 1, ec: 10, align: [] }, // v1
{ data: 28, blocks: 1, ec: 16, align: [6, 18] }, // v2
{ data: 44, blocks: 1, ec: 26, align: [6, 22] }, // v3
{ data: 32, blocks: 2, ec: 18, align: [6, 26] }, // v4
{ data: 43, blocks: 2, ec: 24, align: [6, 30] }, // v5
{ data: 27, blocks: 4, ec: 16, align: [6, 34] } // v6
];
function pickVersion(len) {
for (var v = 1; v < VERSIONS.length; v++) {
var cfg = VERSIONS[v];
var cap = cfg.data * cfg.blocks - 2; // ناقص بايت الوضع والعدد
if (len <= cap) return v;
}
return 0; // أكبر من المتاح
}
/* ---------- ترميز UTF-8 ---------- */
function utf8(str) {
var out = [], s = unescape(encodeURIComponent(String(str)));
for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
return out;
}
/* ---------- بناء تدفق البتات ---------- */
function buildData(text, version) {
var cfg = VERSIONS[version];
var bytes = utf8(text);
var bits = [];
function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
put(4, 4); // Byte mode
put(bytes.length, 8); // عدد الأحرف (إصدارات 1-9 = 8 بت)
for (var i = 0; i < bytes.length; i++) put(bytes[i], 8);
// إنهاء
var capacityBits = cfg.data * cfg.blocks * 8;
var end = Math.min(4, capacityBits - bits.length);
for (var t = 0; t < end; t++) bits.push(0);
while (bits.length % 8 !== 0) bits.push(0);
// حشو
var pads = [0xEC, 0x11], p = 0;
while (bits.length < capacityBits) { put(pads[p % 2], 8); p++; }
// تحويل لأكواد
var dataWords = [];
for (var b = 0; b < bits.length; b += 8) {
var byte = 0;
for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b + k];
dataWords.push(byte);
}
// تقسيم لبلوكات + تصحيح خطأ
var blocks = [], ecBlocks = [], idx = 0, size = cfg.data;
for (var bi = 0; bi < cfg.blocks; bi++) {
var blk = dataWords.slice(idx, idx + size); idx += size;
blocks.push(blk); ecBlocks.push(rsEncode(blk, cfg.ec));
}
// دمج (Interleaving)
var out = [];
for (var c2 = 0; c2 < size; c2++) for (var b2 = 0; b2 < blocks.length; b2++) out.push(blocks[b2][c2]);
for (var c3 = 0; c3 < cfg.ec; c3++) for (var b3 = 0; b3 < ecBlocks.length; b3++) out.push(ecBlocks[b3][c3]);
return { words: out, total: out.length };
}
/* ---------- المصفوفة ---------- */
function buildMatrix(version, dataWords) {
var cfg = VERSIONS[version];
var n = 17 + 4 * version;
var m = [], reserved = [];
for (var r = 0; r < n; r++) { m.push(new Array(n).fill(null)); reserved.push(new Array(n).fill(false)); }
function setF(x, y, v) { if (x >= 0 && y >= 0 && x < n && y < n) { m[y][x] = v; reserved[y][x] = true; } }
function finder(ox, oy) {
for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) {
var x = ox + dx, y = oy + dy;
if (x < 0 || y < 0 || x >= n || y >= n) continue;
var inRing = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) || (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6));
var inCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
var v = (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) ? (inRing || inCore ? 1 : 0) : 0;
m[y][x] = v; reserved[y][x] = true;
}
}
finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
// الفواصل تم تعيينها ضمن finder
// أنماط التوقيت
for (var i = 8; i < n - 8; i++) { var tv = (i % 2 === 0) ? 1 : 0; setF(i, 6, tv); setF(6, i, tv); }
// أنماط المحاذاة
var ap = cfg.align;
for (var a = 0; a < ap.length; a++) for (var b = 0; b < ap.length; b++) {
var cx = ap[a], cy = ap[b];
if ((cx <= 8 && cy <= 8) || (cx >= n - 9 && cy <= 8) || (cx <= 8 && cy >= n - 9)) continue;
for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
var v2 = (Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1) ? 1 : 0;
setF(cx + dx2, cy + dy2, v2);
}
}
// منطقة معلومات التنسيق (30 وحدة + الوحدة الداكنة)
var i2;
for (i2 = 0; i2 <= 8; i2++) if (m[i2][8] === null) { m[i2][8] = 0; reserved[i2][8] = true; } // عمود 8 أعلى
for (i2 = n - 7; i2 < n; i2++) if (m[i2][8] === null) { m[i2][8] = 0; reserved[i2][8] = true; } // عمود 8 أسفل
for (i2 = 0; i2 <= 8; i2++) if (m[8][i2] === null) { m[8][i2] = 0; reserved[8][i2] = true; } // صف 8 يسار
for (i2 = n - 8; i2 < n; i2++) if (m[8][i2] === null) { m[8][i2] = 0; reserved[8][i2] = true; } // صف 8 يمين
setF(8, n - 8, 1); // الوحدة الداكنة
/* ---- وضع البيانات ---- */
var bitIdx = 0, total = dataWords.length * 8;
function nextBit() {
if (bitIdx >= total) return 0;
var w = dataWords[bitIdx >> 3], bit = (w >>> (7 - (bitIdx & 7))) & 1;
bitIdx++; return bit;
}
var up = true, col = n - 1;
while (col > 0) {
if (col === 6) col--;
for (var i3 = 0; i3 < n; i3++) {
var row = up ? (n - 1 - i3) : i3;
for (var c4 = 0; c4 < 2; c4++) {
var x2 = col - c4;
if (x2 < 0) continue;
if (!reserved[row][x2]) m[row][x2] = nextBit();
}
}
col -= 2; up = !up;
}
return { m: m, reserved: reserved, n: n };
}
/* ---------- الأقنعة ---------- */
var MASKS = [
function (i, j) { return (i + j) % 2 === 0; },
function (i, j) { return i % 2 === 0; },
function (i, j) { return j % 3 === 0; },
function (i, j) { return (i + j) % 3 === 0; },
function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; },
function (i, j) { return (i * j) % 2 + (i * j) % 3 === 0; },
function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; },
function (i, j) { return ((i + j) % 2 + (i * j) % 3) % 2 === 0; }
];
function applyMask(m, reserved, mask, n) {
for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
if (!reserved[r][c] && MASKS[mask](r, c)) m[r][c] ^= 1;
}
}
function penalty(m, n) {
var score = 0, r, c, run, dark = 0;
// قاعدة 1: صفوف وأعمدة متتالية
for (r = 0; r < n; r++) {
run = 1;
for (c = 1; c < n; c++) {
if (m[r][c] === m[r][c - 1]) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
}
if (run >= 5) score += run - 2;
}
for (c = 0; c < n; c++) {
run = 1;
for (r = 1; r < n; r++) {
if (m[r][c] === m[r - 1][c]) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
}
if (run >= 5) score += run - 2;
}
// قاعدة 2: مربعات 2×2
for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
var v = m[r][c];
if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
}
// قاعدة 3: أنماط شبيهة بنمط الكشف 1:1:3:1:1
var pat1 = [1, 0, 1, 1, 1, 0, 1], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
function matches(arr, start, pat) {
for (var k = 0; k < pat.length; k++) if (arr[start + k] !== pat[k]) return false;
return true;
}
for (r = 0; r < n; r++) for (c = 0; c <= n - 11; c++) {
var rowSeg = []; for (var k1 = 0; k1 < 11; k1++) rowSeg.push(m[r][c + k1]);
if (matches(rowSeg, 0, pat2)) score += 40;
if (c <= n - 7) { var s1 = []; for (var k2 = 0; k2 < 7; k2++) s1.push(m[r][c + k2]); if (matches(s1, 0, pat1)) score += 40; }
}
for (c = 0; c < n; c++) for (r = 0; r <= n - 11; r++) {
var colSeg = []; for (var k3 = 0; k3 < 11; k3++) colSeg.push(m[r + k3][c]);
if (matches(colSeg, 0, pat2)) score += 40;
if (r <= n - 7) { var s2 = []; for (var k4 = 0; k4 < 7; k4++) s2.push(m[r + k4][c]); if (matches(s2, 0, pat1)) score += 40; }
}
// قاعدة 4: نسبة الداكن
for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (m[r][c] === 1) dark++;
var percent = dark * 100 / (n * n);
score += Math.floor(Math.abs(percent - 50) / 5) * 10;
return score;
}
function formatBits(mask) {
var data = (0 << 3) | mask; // EC level M = 00
var d = data << 10;
for (var i = 4; i >= 0; i--) { if (d & (1 << (i + 10))) d ^= 0x537 << i; }
return ((data << 10) | d) ^ 0x5412;
}
function placeFormat(m, reserved, bits, n) {
var i, mod;
// النسخة الرأسية (عمود 8)
for (i = 0; i < 15; i++) {
mod = ((bits >> i) & 1) === 1 ? 1 : 0;
if (i < 6) m[i][8] = mod;
else if (i < 8) m[i + 1][8] = mod;
else m[n - 15 + i][8] = mod;
}
// النسخة الأفقية (صف 8)
for (i = 0; i < 15; i++) {
mod = ((bits >> i) & 1) === 1 ? 1 : 0;
if (i < 8) m[8][n - i - 1] = mod;
else if (i < 9) m[8][15 - i - 1 + 1] = mod;
else m[8][15 - i - 1] = mod;
}
m[n - 8][8] = 1; // الوحدة الداكنة الثابتة
}
function matrix(text) {
var v = pickVersion(utf8(text).length);
if (!v) return null;
var data = buildData(text, v);
var best = null, bestScore = Infinity;
for (var mask = 0; mask < 8; mask++) {
var built = buildMatrix(v, data.words);
applyMask(built.m, built.reserved, mask, built.n);
placeFormat(built.m, built.reserved, formatBits(mask), built.n);
var sc = penalty(built.m, built.n);
if (sc < bestScore) { bestScore = sc; best = built; }
}
return best ? best.m : null;
}
/* ---------- مخرجات ---------- */
function svg(text, size, margin) {
var m = matrix(text);
if (!m) return '';
var n = m.length; margin = margin == null ? 2 : margin;
var total = n + margin * 2, px = size || 160, unit = px / total;
var rects = '';
for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
if (m[r][c] === 1) rects += '<rect x="' + ((c + margin) * unit).toFixed(2) + '" y="' + ((r + margin) * unit).toFixed(2) +
'" width="' + (unit + 0.4).toFixed(2) + '" height="' + (unit + 0.4).toFixed(2) + '"/>';
}
return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + ' ' + px + '" shape-rendering="crispEdges">' +
'<rect width="100%" height="100%" fill="#fff"/><g fill="#06283d">' + rects + '</g></svg>';
}
function canvas(cv, text, size) {
var m = matrix(text);
if (!m || !cv) return false;
var n = m.length, margin = 2, total = n + margin * 2;
var px = size || 160; cv.width = px; cv.height = px;
var ctx = cv.getContext('2d');
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, px, px);
ctx.fillStyle = '#000';
var u = px / total;
for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
if (m[r][c] === 1) ctx.fillRect(Math.round((c + margin) * u), Math.round((r + margin) * u), Math.ceil(u), Math.ceil(u));
}
return true;
}
function dataURL(text, size) {
try {
var cv = document.createElement('canvas');
if (!canvas(cv, text, size)) return null;
return cv.toDataURL('image/png');
} catch (e) { return null; }
}
global.QR = { matrix: matrix, svg: svg, canvas: canvas, dataURL: dataURL,
_debug: { buildMatrix: buildMatrix, buildData: buildData, applyMask: applyMask, penalty: penalty, formatBits: formatBits, pickVersion: pickVersion, MASKS: MASKS, utf8: utf8, VERSIONS: VERSIONS } };
})(window);
