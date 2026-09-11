/* =========================================================
الصفحة الرئيسية — app.js
========================================================= */
(function () {
'use strict';
LAB.load();
LAB.buildShell('index.html');
var d = LAB.db(), s = d.settings;
/* نصوص الهيرو */
$('#heroTitle').textContent = s.heroTitle;
$('#heroSub').textContent = s.heroSub;
$('#ownerName').textContent = s.ownerName;
$('#ownerTitle').textContent = s.ownerTitle;
$('#docName').textContent = s.ownerName;
$('#docTitle').textContent = s.ownerTitle;
/* التصنيفات والتحاليل */
var cats = ['الكل'];
d.tests.forEach(function (t) { if (cats.indexOf(t.category) < 0) cats.push(t.category); });
var activeCat = 'الكل';
function renderCats() {
var wrap = $('#homeCats'); wrap.innerHTML = '';
cats.forEach(function (c) {
wrap.appendChild(LAB.el('button', {
class: 'chip' + (c === activeCat ? ' active' : ''), html: LAB.escapeHtml(c),
onclick: function () { activeCat = c; renderCats(); renderTests(); }
}));
});
}
function renderTests() {
var wrap = $('#homeTests'); wrap.innerHTML = '';
var list = d.tests.filter(function (t) { return t.active && (activeCat === 'الكل' || t.category === activeCat); }).slice(0, 12);
list.forEach(function (t) { wrap.appendChild(Shared.testCard(t, { selectable: true })); });
if (!list.length) wrap.innerHTML = '<div class="empty">لا توجد تحاليل في هذا التصنيف</div>';
}
renderCats(); renderTests();
/* البحث السريع */
$('#homeSearch').addEventListener('input', function () {
var q = this.value.trim().toLowerCase();
var res = $('#homeSearchRes'); res.innerHTML = '';
if (q.length < 2) return;
var found = d.tests.filter(function (t) { return t.active && (t.name.toLowerCase().indexOf(q) >= 0 || t.category.indexOf(q) >= 0); }).slice(0, 8);
if (!found.length) res.innerHTML = '<div class="empty"> مفيش نتائج — جرّب كلمة تانية أو <a href="prescription.html" style="color:var(--teal)">ارفع الروشتة</a> وهنحددها لك</div>';
found.forEach(function (t) { res.appendChild(Shared.testCard(t, { selectable: true })); });
});
/* الباقات */
var pw = $('#homePackages');
d.packages.filter(function (p) { return p.active; }).slice(0, 6).forEach(function (p) { pw.appendChild(Shared.packageCard(p)); });
/* الفروع */
var bw = $('#homeBranches');
d.branches.filter(function (b) { return b.active; }).forEach(function (b, i) {
bw.appendChild(LAB.el('div', { class: 'card card-hover reveal', style: 'padding:28px;position:relative;overflow:hidden' }, [
LAB.el('div', { style: 'position:absolute;inset-inline-end:-40px;top:-40px;width:150px;height:150px;border-radius:50%;background:rgba(14,124,134,.08)' }),
LAB.el('div', { class: 'row', style: 'gap:14px' }, [
LAB.el('div', { class: 'ic', style: 'width:56px;height:56px;border-radius:16px;background:var(--grad);display:grid;place-items:center;color:#fff;font-size:24px', html: '' }),
LAB.el('div', {}, [LAB.el('h4', { html: LAB.escapeHtml(b.name) }), LAB.el('div', { class: 'small', html: ' ' + LAB.escapeHtml(b.address) })])
]),
LAB.el('div', { class: 'mt-2', style: 'display:grid;gap:8px' }, [
LAB.el('div', { class: 'small', html: ' ' + LAB.escapeHtml(b.hours) }),
LAB.el('a', { href: 'tel:' + b.phone, class: 'small', dir: 'ltr', style: 'display:block', html: ' ' + LAB.escapeHtml(b.phone) })
]),
LAB.el('div', { class: 'row mt-2' }, [
LAB.el('a', { href: 'booking.html?branch=' + b.id, class: 'btn btn-sm btn-primary', html: 'احجز من الفرع' }),
LAB.el('a', { href: 'https://maps.google.com/?q=' + encodeURIComponent(b.address), target: '_blank', class: 'btn btn-sm btn-ghost', html: ' الخريطة' }),
LAB.el('a', { href: 'https://wa.me/' + s.whatsapp, target: '_blank', class: 'btn btn-sm btn-ghost', html: ' واتساب' })
])
]));
});
/* الدكاترة */
var dw = $('#homeDoctors');
d.doctors.filter(function (x) { return x.active; }).forEach(function (doc) {
dw.appendChild(LAB.el('div', { class: 'card card-hover reveal', style: 'padding:0;overflow:hidden;text-align:center' }, [
LAB.el('div', { style: 'height:200px;background:linear-gradient(160deg,rgba(14,124,134,.12),rgba(34,211,238,.06));display:grid;place-items:center;overflow:hidden' }, [
doc.avatar
? LAB.el('img', { src: doc.avatar, alt: '', style: 'width:100%;height:100%;object-fit:cover;object-position:top' })
: LAB.el('div', { style: 'width:110px;height:110px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:38px;font-weight:900', html: doc.name.replace('د. ', '').charAt(0) })
]),
LAB.el('div', { style: 'padding:20px' }, [
LAB.el('h4', { html: LAB.escapeHtml(doc.name) }),
LAB.el('div', { class: 'small', style: 'color:var(--teal);font-weight:800', html: LAB.escapeHtml(doc.title) }),
LAB.el('div', { class: 'small mt-1', html: ' ' + LAB.escapeHtml(doc.specialty || '') }),
doc.commission > 0 ? LAB.el('div', { class: 'small mt-1', html: ' استشارات فردية' }) : null
])
]));
});
/* الآراء */
var rw = $('#homeReviews');
d.reviews.filter(function (r) { return r.active; }).slice(0, 6).forEach(function (r) {
rw.appendChild(LAB.el('div', { class: 'review-card reveal' }, [
LAB.el('div', { class: 'stars', html: LAB.stars(r.rate, 15) }),
LAB.el('p', { class: 'mt-1', style: 'font-size:14.5px;color:var(--text-soft)', html: '“' + LAB.escapeHtml(r.text) + '”' }),
LAB.el('div', { class: 'who' }, [
LAB.el('div', { class: 'avatar', html: LAB.escapeHtml(r.name.charAt(0)) }),
LAB.el('div', {}, [LAB.el('b', { style: 'font-size:14px', html: LAB.escapeHtml(r.name) }), LAB.el('div', { class: 'small', html: LAB.escapeHtml(r.area) })])
])
]));
});
/* الأسئلة الشائعة */
var fw = $('#homeFaqs');
d.faqs.forEach(function (f, i) {
fw.appendChild(LAB.el('div', { class: 'acc reveal' + (i === 0 ? ' open' : '') }, [
LAB.el('div', { class: 'acc-head' }, [LAB.el('span', { html: LAB.escapeHtml(f.q) }), LAB.el('span', { class: 'plus', html: '+' })]),
LAB.el('div', { class: 'acc-body', style: i === 0 ? 'max-height:400px' : '' }, [LAB.el('div', { html: LAB.escapeHtml(f.a) })])
]));
});
Shared.offersSlider($('#offersWrap'), $('#offerDots'));
LAB.initParticles($('#particles'));
LAB.initFX();
})();
/* نموذج التقييم (مستدعى من الزر) */
function reviewForm() {
return '<div class="field"><label>الاسم</label><input id="rvName" class="input" placeholder="اسمك الكريم"></div>' +
'<div class="field"><label>المنطقة</label><input id="rvArea" class="input" placeholder="السنبلاوين"></div>' +
'<div class="field"><label>التقييم</label><select id="rvRate" class="select"><option value="5"> ممتاز</option><option value="4"> جيد جداً</option><option value="3"> جيد</option><option value="2"> مقبول</option><option value="1"> ضعيف</option></select></div>' +
'<div class="field"><label>رأيك</label><textarea id="rvText" class="textarea" placeholder="شاركنا تجربتك مع المعمل…"></textarea></div>';
}
