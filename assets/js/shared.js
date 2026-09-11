/* =========================================================
Shared — سلة التحاليل + مكوّنات مشتركة بين الصفحات
========================================================= */
(function (global) {
'use strict';
var CART_KEY = 'elhoshy_cart_v1';
var _cm = null;
function cGet() { try { var v = localStorage.getItem(CART_KEY); return v === null ? _cm : v; } catch (e) { return _cm; } }
function cSet(v) { _cm = v; try { localStorage.setItem(CART_KEY, v); } catch (e) { } }
/* ---------------- Cart ---------------- */
var Cart = {
get: function () {
var raw = cGet();
try { return raw ? JSON.parse(raw) : { tests: [], pkg: null, coupon: null }; }
catch (e) { return { tests: [], pkg: null, coupon: null }; }
},
set: function (c) { cSet(JSON.stringify(c)); window.dispatchEvent(new CustomEvent('cartchange')); },
add: function (name) {
var c = Cart.get(); if (c.tests.indexOf(name) < 0) c.tests.push(name); Cart.set(c);
LAB.toast('تمت الإضافة', name, 'ok');
},
toggle: function (name) {
var c = Cart.get(), i = c.tests.indexOf(name);
if (i >= 0) { c.tests.splice(i, 1); } else { c.tests.push(name); LAB.toast('تمت الإضافة', name, 'ok'); }
Cart.set(c); return i < 0;
},
remove: function (name) { var c = Cart.get(); c.tests = c.tests.filter(function (x) { return x !== name; }); Cart.set(c); },
clear: function () { Cart.set({ tests: [], pkg: null, coupon: null }); },
count: function () { var c = Cart.get(); return c.tests.length + (c.pkg ? 1 : 0); },
has: function (name) { return Cart.get().tests.indexOf(name) >= 0; },
testObj: function (name) {
var t = LAB.db().tests.filter(function (x) { return x.name === name; })[0];
return t;
},
items: function () {
var c = Cart.get(), out = [], db = LAB.db();
c.tests.forEach(function (n) {
var t = db.tests.filter(function (x) { return x.name === n; })[0];
if (t) out.push({ id: t.id, name: t.name, price: t.price, type: 'test', cat: t.category, hours: t.hours, fasting: t.fasting, sample: t.sample, homeExtra: t.homeExtra || 0 });
});
if (c.pkg) {
var p = db.packages.filter(function (x) { return x.id === c.pkg; })[0];
if (p) out.push({ id: p.id, name: p.name, price: p.price, type: 'pkg', cat: 'باقة', hours: 24, fasting: false, sample: 'دم', homeExtra: 0 });
}
return out;
},
subtotal: function () { return Cart.items().reduce(function (a, b) { return a + b.price; }, 0); }
};
/* ---------------- Test card ---------------- */
function testCard(t, opts) {
opts = opts || {};
var selected = opts.selectable ? Cart.has(t.name) : false;
var card = LAB.el('div', { class: 'test-card' + (selected ? ' selected' : '') }, [
LAB.el('div', { class: 'top' }, [
LAB.el('div', {}, [
LAB.el('h5', { html: LAB.escapeHtml(t.name) }),
LAB.el('span', { class: 'cat', html: LAB.escapeHtml(t.cat || t.category) })
])
]),
LAB.el('div', { class: 'meta' }, [
LAB.el('span', { html: ' النتيجة: ' + (t.hours >= 24 ? (t.hours / 24) + ' يوم' : t.hours + ' ساعة') }),
LAB.el('span', { html: ' ' + LAB.escapeHtml(t.sample || 'دم') }),
t.fasting ? LAB.el('span', { style: 'color:#b97b0d;font-weight:800', html: ' يحتاج صيام' }) : null
]),
LAB.el('div', { class: 'row-between mt-1' }, [
LAB.el('div', { class: 'price', html: LAB.money(t.price) + ' <span style="font-size:12px;font-weight:700;color:var(--text-soft)">جنيه</span>' }),
opts.selectable
? LAB.el('button', {
class: 'btn btn-sm ' + (selected ? 'btn-success' : 'btn-outline'),
html: selected ? '<i data-icon="check"></i> تم الاختيار' : '+ أضف',
onclick: function (e) {
e.stopPropagation();
var added = Cart.toggle(t.name);
card.classList.toggle('selected', added);
var b = card.querySelector('button');
b.className = 'btn btn-sm ' + (added ? 'btn-success' : 'btn-outline');
b.textContent = added ? '<i data-icon="check"></i> تم الاختيار' : '+ أضف';
}
})
: LAB.el('a', { href: 'booking.html?test=' + encodeURIComponent(t.name), class: 'btn btn-sm btn-outline', html: 'احجز' })
]),
opts.selectable ? LAB.el('div', { class: 'check', html: LAB.icon('check',15) }) : null
]);
if (opts.selectable) card.onclick = function () { card.querySelector('button').click(); };
return card;
}
function packageCard(p) {
var db = LAB.db(), sum = 0;
p.tests.forEach(function (n) { var t = db.tests.filter(function (x) { return x.name === n; })[0]; if (t) sum += t.price; });
var save = sum - p.price;
return LAB.el('div', { class: 'card card-hover shine', style: 'padding:24px;position:relative' }, [
save > 0 ? LAB.el('span', { class: 'badge b-new', style: 'position:absolute;top:14px;inset-inline-end:14px', html: 'وفر ' + LAB.money(save) + ' ج' }) : null,
LAB.el('h4', { html: LAB.escapeHtml(p.name) }),
LAB.el('p', { class: 'small mt-1', style: 'min-height:44px', html: LAB.escapeHtml(p.desc) }),
LAB.el('div', { class: 'mt-2', style: 'font-size:13px;color:var(--text-soft)' }, [LAB.el('b', { html: 'يضم ' + p.tests.length + ' تحاليل:' }), LAB.el('div', { html: p.tests.slice(0, 4).map(LAB.escapeHtml).join(' • ') + (p.tests.length > 4 ? ' …' : '') })]),
LAB.el('div', { class: 'row-between mt-2' }, [
LAB.el('div', {}, [
LAB.el('div', { style: 'font-weight:900;font-size:24px;color:var(--teal)', html: LAB.money(p.price) + ' <span style="font-size:13px">ج</span>' }),
save > 0 ? LAB.el('div', { class: 'small', style: 'text-decoration:line-through', html: LAB.money(sum) + ' ج' }) : null
]),
LAB.el('div', { class: 'row' }, [
LAB.el('button', { class: 'btn btn-sm btn-outline', html: 'التفاصيل', onclick: function () { pkgModal(p); } }),
LAB.el('a', { href: 'booking.html?pkg=' + p.id, class: 'btn btn-sm btn-primary', html: 'احجز الباقة' })
])
])
]);
}
function pkgModal(p) {
var db = LAB.db(), sum = 0;
var rows = p.tests.map(function (n) {
var t = db.tests.filter(function (x) { return x.name === n; })[0];
var pr = t ? t.price : 0; sum += pr;
return '<div class="sum-line"><span>' + LAB.escapeHtml(n) + '</span><b>' + LAB.money(pr) + ' ج</b></div>';
}).join('');
LAB.modal({
title: p.name,
html: '<p class="small mb-2">' + LAB.escapeHtml(p.desc) + '</p>' + rows +
'<div class="sum-total"><span>سعر الباقة</span><span style="color:var(--teal)">' + LAB.money(p.price) + ' ج</span></div>' +
'<p class="small center mt-2">بدل ' + LAB.money(sum) + ' جنيه — <b style="color:var(--green)">توفير ' + LAB.money(sum - p.price) + ' جنيه</b></p>',
buttons: [{ text: 'إغلاق' }, { text: 'احجز الباقة', cls: 'btn-primary', action: function () { location.href = 'booking.html?pkg=' + p.id; } }]
});
}
/* ---------------- Offers slider ---------------- */
function offersSlider(wrap, dots) {
var offs = LAB.db().offers.filter(function (o) { return o.active; });
if (!offs.length) { wrap.parentElement.parentElement.style.display = 'none'; return; }
var i = 0;
function render() {
var o = offs[i];
var bg = ['var(--grad-dark)', 'linear-gradient(135deg,#7c3aed,#0e7c86)', 'linear-gradient(135deg,#0e7c86,#f2a93b)'][i % 3];
wrap.innerHTML = '<div class="offer-slide" style="background:' + bg + ';animation:fadeUp .6s">' +
'<div class="row-between"><div><span class="eyebrow" style="background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.3)">عرض حصري</span>' +
'<h3 class="mt-2">' + LAB.escapeHtml(o.title) + '</h3><p style="opacity:.9">' + LAB.escapeHtml(o.sub) + '</p>' +
'<div class="row mt-2"><a href="booking.html?code=' + encodeURIComponent(o.code) + '" class="btn btn-gold">احجز بالعرض</a>' +
'<button class="btn btn-outline" style="border-color:#fff;color:#fff" onclick="LAB.copyText(\'' + o.code + '\')">كود: ' + LAB.escapeHtml(o.code) + '</button></div></div>' +
'<div class="big" style="opacity:.95">' + LAB.icon('gift', 60) + '</div></div></div>';
dots.innerHTML = offs.map(function (_, k) {
return '<button class="dot" data-i="' + k + '" style="width:11px;height:11px;border-radius:50%;border:none;background:' + (k === i ? 'var(--gold)' : 'var(--line)') + ';transition:.3s"></button>';
}).join('');
LAB.$$('.dot', dots).forEach(function (d) { d.onclick = function () { i = +d.dataset.i; render(); }; });
}
render();
setInterval(function () { if (document.hidden) return; i = (i + 1) % offs.length; render(); }, 7000);
}
/* ---------------- Notifications bell (for dashboards) ---------------- */
function notifBell(container, role) {
function render() {
var list = LAB.db().notifications.filter(function (n) { return n.to === role || n.to === 'all'; });
var unread = list.filter(function (n) { return !n.read; }).length;
container.innerHTML = '<button class="btn-icon btn-ghost" title="الإشعارات" aria-label="الإشعارات" style="position:relative">' + LAB.icon('bell', 20) +
(unread ? '<span style="position:absolute;top:-4px;inset-inline-end:-4px;background:var(--red);color:#fff;font-size:10px;font-weight:900;width:18px;height:18px;border-radius:50%;display:grid;place-items:center">' + unread + '</span>' : '') + '</button>';
container.querySelector('button').onclick = function () {
var rows = list.slice(0, 30).map(function (n) {
return '<div class="file-chip" style="align-items:flex-start;' + (n.read ? 'opacity:.6' : '') + '">' +
'<span style="font-size:20px">' + ({ booking: LAB.icon('calendar', 19), pay: LAB.icon('card', 19), rx: LAB.icon('file', 19), doc: LAB.icon('stethoscope', 19), info: LAB.icon('bell', 19) }[n.type] || LAB.icon('bell', 19)) + '</span>' +
'<div style="flex:1"><b style="font-size:14px">' + LAB.escapeHtml(n.title) + '</b>' +
'<div class="small">' + LAB.escapeHtml(n.body) + '</div><div class="small" style="opacity:.7">' + LAB.ago(n.at) + '</div></div></div>';
}).join('') || '<div class="empty">لا توجد إشعارات</div>';
LAB.modal({
title: 'الإشعارات (' + list.length + ')', html: rows,
buttons: [{ text: 'تعيين الكل كمقروء', cls: 'btn-ghost', action: function (b, close) { list.forEach(function (n) { n.read = true; }); LAB.save(); close(); render(); } }, { text: 'إغلاق' }]
});
};
}
render();
window.addEventListener('storage', render);
}
global.Cart = Cart;
global.Shared = { testCard: testCard, packageCard: packageCard, offersSlider: offersSlider, notifBell: notifBell, pkgModal: pkgModal };
})(window);
