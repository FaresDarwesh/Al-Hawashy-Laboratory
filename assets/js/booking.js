/* =========================================================
صفحة الحجز — Wizard
========================================================= */
(function () {
'use strict';
LAB.load(); LAB.buildShell('booking.html');
var d = LAB.db(), s = d.settings;
var st = {
step: 1, type: 'lab', branchId: '', areaId: '', address: '', city: 'الدقهلية',
date: '', time: '', pay: 'cash', receipt: '', coupon: null, discount: 0
};
var params = {};
location.search.slice(1).split('&').forEach(function (p) {
if (!p) return; var kv = p.split('='); params[kv[0]] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
});
/* ---------- الخطوة 1 ---------- */
$$('#typeOpts .opt-card').forEach(function (c) {
c.onclick = function () {
$$('#typeOpts .opt-card').forEach(function (x) { x.classList.remove('active'); });
c.classList.add('active'); st.type = c.dataset.type;
$('#labBox').classList.toggle('hide', st.type !== 'lab');
$('#homeBox').classList.toggle('hide', st.type !== 'home');
renderSummary();
};
});
function renderBranches() {
var w = $('#branchOpts'); w.innerHTML = '';
d.branches.filter(function (b) { return b.active; }).forEach(function (b) {
w.appendChild(LAB.el('div', { class: 'opt-card' + (st.branchId === b.id ? ' active' : ''), onclick: function () { st.branchId = b.id; renderBranches(); renderSummary(); } }, [
LAB.el('span', { class: 'tick', html: LAB.icon('check',15) }), LAB.el('span', { class: 'ic', html: '' }),
LAB.el('b', { html: LAB.escapeHtml(b.name) }),
LAB.el('small', { html: LAB.escapeHtml(b.address) }),
LAB.el('small', { html: ' ' + LAB.escapeHtml(b.hours) })
]));
});
if (!st.branchId && w.firstChild) { st.branchId = d.branches.filter(function (b) { return b.active; })[0].id; w.firstChild.classList.add('active'); }
}
function renderAreas() {
var sel = $('#areaSel'); sel.innerHTML = '<option value="">— اختار المنطقة —</option>';
d.areas.filter(function (a) { return a.active; }).forEach(function (a) {
sel.appendChild(LAB.el('option', { value: a.id, html: LAB.escapeHtml(a.name) + ' — رسوم ' + LAB.money(a.fee) + ' ج' }));
});
sel.onchange = function () { st.areaId = this.value; feeHint(); renderSummary(); };
var ds = $('#homeDoctorSel'); ds.innerHTML = '<option value="">— بدون / غير محدد —</option>';
d.doctors.filter(function (x) { return x.active; }).forEach(function (doc) {
ds.appendChild(LAB.el('option', { value: doc.id, html: LAB.escapeHtml(doc.name) + ' — ' + LAB.escapeHtml(doc.title) }));
});
ds.onchange = function () { feeHint(); renderSummary(); };
if (params.branch) { st.branchId = params.branch; }
}
function feeHint() {
var a = d.areas.filter(function (x) { return x.id === st.areaId; })[0];
var fee = homeFee();
$('#areaFeeHint').innerHTML = a
? 'رسوم السحب لهذه المنطقة: <b style="color:var(--teal)">' + LAB.money(fee) + ' جنيه</b>' +
(fee !== a.fee ? ' <span style="color:var(--gold)">(تسعيرة الطبيب)</span>' : '')
: '';
}
function homeFee() {
if (st.type !== 'home' || !st.areaId) return 0;
var a = d.areas.filter(function (x) { return x.id === st.areaId; })[0];
if (!a) return 0;
var docId = $('#homeDoctorSel') ? $('#homeDoctorSel').value : '';
var docName = $('#pDoc') ? String($('#pDoc').value || '').trim() : '';
var doc = d.doctors.filter(function (x) { return x.id === docId; })[0];
if (!doc && docName) doc = d.doctors.filter(function (x) { return x.active && x.name === docName; })[0];
if (doc && doc.homePrices && doc.homePrices[st.areaId] != null && doc.homePrices[st.areaId] !== '') {
return Number(doc.homePrices[st.areaId]) || 0;
}
return Number(a.fee) || 0;
}
/* ---------- الخطوة 2 ---------- */
function renderTests() {
var cats = ['الكل'];
d.tests.forEach(function (t) { if (cats.indexOf(t.category) < 0 && t.active) cats.push(t.category); });
var sel = $('#bkCat');
if (!sel.options.length) cats.forEach(function (c) { sel.appendChild(LAB.el('option', { value: c, html: LAB.escapeHtml(c) })); });
function draw() {
var q = String($('#bkQ').value || '').trim().toLowerCase();
var cat = $('#bkCat').value || 'الكل';
var w = $('#bkList'); w.innerHTML = '';
var list = d.tests.filter(function (t) {
if (!t.active) return false;
if (cat !== 'الكل' && t.category !== cat) return false;
if (q && (t.name + t.category).toLowerCase().indexOf(q) < 0) return false;
return true;
});
list.slice(0, 60).forEach(function (t) { w.appendChild(Shared.testCard(t, { selectable: true })); });
if (!list.length) w.innerHTML = '<div class="empty">لا توجد نتائج</div>';
}
$('#bkQ').addEventListener('input', draw);
$('#bkCat').addEventListener('change', draw);
draw();
}
function renderPkgs() {
var w = $('#bkPkg'); w.innerHTML = '';
d.packages.filter(function (p) { return p.active; }).forEach(function (p) {
var sum = 0; p.tests.forEach(function (n) { var t = d.tests.filter(function (x) { return x.name === n; })[0]; if (t) sum += t.price; });
w.appendChild(LAB.el('div', { class: 'opt-card' + (Cart.get().pkg === p.id ? ' active' : ''), style: 'padding:16px', onclick: function () { var c = Cart.get(); c.pkg = (c.pkg === p.id ? null : p.id); Cart.set(c); renderPkgs(); renderSummary(); } }, [
LAB.el('span', { class: 'tick', html: LAB.icon('check',15) }),
LAB.el('b', { style: 'font-size:14.5px', html: ' ' + LAB.escapeHtml(p.name) }),
LAB.el('small', { html: p.tests.length + ' تحاليل — وفر ' + LAB.money(Math.max(0, sum - p.price)) + ' ج' }),
LAB.el('b', { style: 'color:var(--teal)', html: LAB.money(p.price) + ' ج' })
]));
});
}
/* ---------- الخطوة 3: المعاد ---------- */
function buildDays() {
var w = $('#dayStrip'); w.innerHTML = '';
var days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
var n = 0, i = 0;
while (n < 14 && i < 30) {
var dt = new Date(); dt.setDate(dt.getDate() + i);
var dw = dt.getDay();
if (s.closedDays.indexOf(dw) < 0) {
(function (dt, dw) {
var iso = LAB.dstr(dt);
if (!st.date && n === 0) st.date = iso;
w.appendChild(LAB.el('button', {
class: 'chip' + (st.date === iso ? ' active' : ''), 'data-d': iso, style: 'display:grid;justify-items:center;padding:10px 14px',
html: '<b style="font-size:12px;opacity:.8">' + days[dw] + '</b><b style="font-size:17px">' + dt.getDate() + '</b><b style="font-size:11px;opacity:.7">' + ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][dt.getMonth()] + '</b>',
onclick: function () { st.date = iso; st.time = ''; buildDays(); buildSlots(); renderSummary(); }
}));
})(dt, dw);
n++;
}
i++;
}
$('#workHours').textContent = s.workFrom + ' - ' + s.workTo;
buildSlots();
}
function buildSlots() {
var w = $('#slotGrid'); w.innerHTML = '';
if (!st.date) return;
var from = parseInt(s.workFrom, 10), to = parseInt(s.workTo, 10), step = parseInt(s.slotMinutes, 10) || 30;
var now = new Date(), today = LAB.dstr(now);
for (var h = from; h < to; h++) {
for (var m = 0; m < 60; m += step) {
(function (h, m) {
var t = LAB.pad(h) + ':' + LAB.pad(m);
var isPast = (st.date === today) && (h * 60 + m) <= (now.getHours() * 60 + now.getMinutes() + 30);
var cnt = d.bookings.filter(function (b) { return b.date && LAB.dstr(b.date) === st.date && b.time === t && b.status !== 'cancelled'; }).length;
var full = cnt >= 4;
var dis = isPast || full;
w.appendChild(LAB.el('button', {
class: 'chip' + (st.time === t ? ' active' : ''), style: (dis ? 'opacity:.45;cursor:not-allowed;' : '') + 'text-align:center;min-width:74px',
html: t + (full ? '<br><span style="font-size:10px">مكتمل</span>' : (isPast ? '<br><span style="font-size:10px">فات</span>' : '')),
onclick: function () { if (dis) return; st.time = t; buildSlots(); renderSummary(); }
}));
})(h, m);
}
}
}
/* ---------- الخطوة 5: الدفع ---------- */
$$('#payOpts .opt-card').forEach(function (c) {
c.onclick = function () {
$$('#payOpts .opt-card').forEach(function (x) { x.classList.remove('active'); });
c.classList.add('active'); st.pay = c.dataset.pay;
$('#ipBox').classList.toggle('hide', st.pay !== 'instapay');
renderSummary();
};
});
$('#ipNum').textContent = s.instapay;
$('#ipName').textContent = s.instapayName;
setupDropzone($('#rzReceipt'), $('#pvReceipt'), function (dataUrl) { st.receipt = dataUrl; }, true);
function setupDropzone(zone, preview, cb, single) {
var input = LAB.el('input', { type: 'file', accept: 'image/*', multiple: !single, style: 'display:none' });
zone.appendChild(input);
zone.onclick = function () { input.click(); };
['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); }); });
zone.addEventListener('drop', function (e) { handle(e.dataTransfer.files); });
input.onchange = function () { handle(this.files); input.value = ''; };
function handle(files) {
Array.prototype.slice.call(files).forEach(function (f) {
if (!/^image\//.test(f.type)) { LAB.toast('خطأ', 'الملف لازم يكون صورة', 'err'); return; }
if (f.size > 6 * 1024 * 1024) { LAB.toast('خطأ', 'حجم الصورة كبير (أقصى 6 ميجا)', 'err'); return; }
LAB.fileToDataURL(f, 1000, .72, function (u, name) {
if (single) { preview.innerHTML = ''; }
preview.appendChild(LAB.el('div', { class: 'thumb' }, [
LAB.el('img', { src: u, alt: '' }),
LAB.el('button', { class: 'del', html: '×', onclick: function (e) { e.stopPropagation(); this.parentElement.remove(); cb(null); } })
]));
cb(u);
});
});
}
}
$('#applyCoupon').onclick = function () {
var code = String($('#couponInp').value || '').trim().toUpperCase();
var c = d.coupons.filter(function (x) { return x.code === code && x.active; })[0];
if (!c) { $('#couponHint').innerHTML = '<span style="color:var(--red)">كود غير صالح</span>'; st.coupon = null; st.discount = 0; renderSummary(); return; }
if (c.max && c.used >= c.max) { $('#couponHint').innerHTML = '<span style="color:var(--red)">تم استنفاذ هذا الكود</span>'; return; }
st.coupon = c;
st.discount = c.type === 'percent' ? Math.round(testsTotal() * c.value / 100) : Math.min(c.value, testsTotal());
$('#couponHint').innerHTML = '<span style="color:var(--green);font-weight:800">✔ تم تطبيق خصم ' + LAB.money(st.discount) + ' جنيه</span>';
renderSummary();
};
/* ---------- الحسابات ---------- */
function items() { return Cart.items(); }
function testsTotal() { return Cart.subtotal(); }
function extrasTotal() {
if (st.type !== 'home') return 0;
return items().reduce(function (a, b) { return a + (b.homeExtra || 0); }, 0);
}
function total() { return Math.max(0, testsTotal() + (st.type === 'home' ? (homeFee() + extrasTotal()) : 0) - st.discount); }
function renderSummary() {
$('#sumType').children[1].textContent = st.type === 'home' ? 'سحب منزلي ' : 'في المعمل ';
var place = '—';
if (st.type === 'lab') { var b = d.branches.filter(function (x) { return x.id === st.branchId; })[0]; place = b ? b.name : '—'; }
else { var a = d.areas.filter(function (x) { return x.id === st.areaId; })[0]; place = a ? a.name : '—'; }
$('#sumPlace').children[1].textContent = place;
$('#sumDate').children[1].textContent = st.date ? (LAB.fmtDate(st.date) + (st.time ? ' — ' + st.time : '')) : '—';
var w = $('#sumTests'); w.innerHTML = '';
items().forEach(function (it) {
w.appendChild(LAB.el('div', { class: 'sum-line' }, [
LAB.el('span', { html: (it.type === 'pkg' ? ' ' : '• ') + LAB.escapeHtml(it.name) }),
LAB.el('b', { html: LAB.money(it.price) + ' ج' })
]));
});
if (!items().length) w.innerHTML = '<div class="sum-line"><span>لم تختر تحاليل بعد</span></div>';
var f = $('#sumFees'); f.innerHTML = '';
if (st.type === 'home') {
f.appendChild(LAB.el('div', { class: 'sum-line' }, [LAB.el('span', { html: 'رسوم السحب المنزلي' }), LAB.el('b', { html: LAB.money(homeFee()) + ' ج' })]));
if (extrasTotal()) f.appendChild(LAB.el('div', { class: 'sum-line' }, [LAB.el('span', { html: 'رسوم عينات إضافية' }), LAB.el('b', { html: LAB.money(extrasTotal()) + ' ج' })]));
}
if (st.discount) f.appendChild(LAB.el('div', { class: 'sum-line', style: 'color:var(--green)' }, [LAB.el('span', { html: 'خصم (' + st.coupon.code + ')' }), LAB.el('b', { html: '- ' + LAB.money(st.discount) + ' ج' })]));
$('#sumTotal').textContent = LAB.money(total()) + ' ج';
var fasting = items().filter(function (i) { return i.fasting; }).length;
$('#sumFasting').innerHTML = fasting ? ' <b>' + fasting + '</b> من تحاليلك تحتاج صيام 8-12 ساعة.' : '';
$('#sumPhone').textContent = s.phones[0]; $('#sumPhone').href = 'tel:' + s.phones[0];
$('#sumIP').textContent = s.instapay;
}
/* ---------- التنقل ---------- */
function go(n) {
if (n > st.step && !validate(st.step)) return;
st.step = n;
$$('.wizard-panel').forEach(function (p) { p.classList.toggle('active', +p.dataset.p === n); });
$$('#stepper .step').forEach(function (sp) {
var i = +sp.dataset.s;
sp.classList.toggle('active', i === n);
sp.classList.toggle('done', i < n);
sp.querySelector('.dot').textContent = i < n ? LAB.icon('check',15) : (i === 6 ? LAB.icon('check',15) : i);
});
if (n === 6) renderReview();
window.scrollTo({ top: 120, behavior: 'smooth' });
}
$$('[data-next]').forEach(function (b) { b.onclick = function () { go(Math.min(6, st.step + 1)); }; });
$$('[data-prev]').forEach(function (b) { b.onclick = function () { go(Math.max(1, st.step - 1)); }; });
function validate(step) {
if (step === 1) {
if (st.type === 'lab' && !st.branchId) { LAB.toast('مطلوب', 'اختار الفرع', 'warn'); return false; }
if (st.type === 'home') {
if (!st.areaId) { LAB.toast('مطلوب', 'اختار المنطقة', 'warn'); return false; }
st.address = String($('#addrInp').value || '').trim();
st.city = String($('#cityInp').value || '').trim();
if (st.address.length < 6) { LAB.toast('مطلوب', 'اكتب العنوان بالتفصيل', 'warn'); return false; }
}
return true;
}
if (step === 2) {
if (!items().length) { LAB.toast('مطلوب', 'اختار تحليل واحد على الأقل أو باقة', 'warn'); return false; }
return true;
}
if (step === 3) {
if (!st.date || !st.time) { LAB.toast('مطلوب', 'اختار التاريخ والوقت', 'warn'); return false; }
return true;
}
if (step === 4) {
var name = String($('#pName').value || '').trim();
var ph = LAB.validatePhone($('#pPhone').value);
var wa = LAB.validatePhone($('#pWhats').value);
if (name.length < 3) { LAB.toast('مطلوب', 'اكتب الاسم رباعي أو ثلاثي', 'warn'); return false; }
if (!ph) { LAB.toast('خطأ', 'رقم الموبايل غير صحيح (01XXXXXXXXX)', 'err'); return false; }
if (!wa) { LAB.toast('خطأ', 'رقم الواتساب غير صحيح (01XXXXXXXXX)', 'err'); return false; }
return true;
}
if (step === 5) {
if (st.pay === 'instapay' && !st.receipt) { LAB.toast('مطلوب', 'ارفع صورة إيصال التحويل', 'warn'); return false; }
return true;
}
return true;
}
function renderReview() {
var b = d.branches.filter(function (x) { return x.id === st.branchId; })[0];
var a = d.areas.filter(function (x) { return x.id === st.areaId; })[0];
var docId = $('#homeDoctorSel').value;
var doc = d.doctors.filter(function (x) { return x.id === docId; })[0];
var rows = [
['الاسم', $('#pName').value], ['الموبايل', LAB.validatePhone($('#pPhone').value)],
['واتساب', LAB.validatePhone($('#pWhats').value)], ['السن / النوع', ($('#pAge').value || '—') + ' / ' + $('#pGender').value],
['الدكتور المعالج', $('#pDoc').value || doc ? ($('#pDoc').value || (doc ? doc.name : '—')) : '—'],
['طريقة السحب', st.type === 'home' ? 'سحب منزلي' : 'في المعمل'],
['المكان', st.type === 'home' ? (a ? a.name : '—') + ' — ' + st.address : (b ? b.name + ' — ' + b.address : '—')],
['المعاد', LAB.fmtDate(st.date) + ' — الساعة ' + st.time],
['طريقة الدفع', st.pay === 'cash' ? 'كاش عند الكشف' : 'انستا باي (' + s.instapay + ')'],
['حالة الدفع', st.pay === 'cash' ? 'لم يُدفع بعد' : (st.receipt ? 'مرفق إيصال — بانتظار المراجعة' : '—')]
];
$('#reviewBox').innerHTML = '<div class="table-wrap"><table><tbody>' +
rows.map(function (r) { return '<tr><td style="width:110px;color:var(--text-soft);font-weight:800">' + LAB.escapeHtml(r[0]) + '</td><td>' + LAB.escapeHtml(r[1] || '—') + '</td></tr>'; }).join('') +
'</tbody></table></div>' +
'<div class="mt-2"><b>التحاليل:</b><div class="chips mt-1">' + items().map(function (i) { return '<span class="chip">' + LAB.escapeHtml(i.name) + ' — ' + LAB.money(i.price) + ' ج</span>'; }).join('') + '</div></div>' +
'<div class="sum-total"><span>الإجمالي النهائي</span><span style="color:var(--teal)">' + LAB.money(total()) + ' ج</span></div>';
}
/* ---------- التأكيد ---------- */
$('#confirmBtn').onclick = function () {
if (!validate(5)) { go(5); return; }
if (!$('#agree').checked) { LAB.toast('مطلوب', 'لازم توافق على الشروط والأحكام', 'warn'); return; }
d.counters.booking++;
var code = 'ELH-' + d.counters.booking;
var it = items();
var bk = {
id: LAB.uid(), code: code,
patientName: String($('#pName').value).trim(),
phone: LAB.validatePhone($('#pPhone').value),
whatsapp: LAB.validatePhone($('#pWhats').value),
age: $('#pAge').value || '', gender: $('#pGender').value,
conditions: $('#pCond').value || '',
doctorName: String($('#pDoc').value || '').trim(),
doctorId: ($('#homeDoctorSel').value || ''),
sampleType: st.type, branchId: st.type === 'lab' ? st.branchId : '',
areaId: st.type === 'home' ? st.areaId : '', address: st.type === 'home' ? st.address : '', city: st.city,
date: st.date, time: st.time, notes: $('#bkNotes').value || '',
tests: it.filter(function (i) { return i.type === 'test'; }).map(function (i) { return i.name; }),
packageId: Cart.get().pkg || '',
testsTotal: testsTotal(), homeFee: st.type === 'home' ? homeFee() : 0, extras: extrasTotal(),
discount: st.discount, coupon: st.coupon ? st.coupon.code : '',
total: total(),
paymentMethod: st.pay, paymentStatus: st.pay === 'instapay' ? 'review' : 'unpaid',
receipt: st.receipt || '', status: 'pending', files: [], resultNote: '',
createdAt: new Date().toISOString()
};
d.bookings.unshift(bk);
if (st.coupon) { var c = d.coupons.filter(function (x) { return x.code === st.coupon.code; })[0]; if (c) c.used++; }
if (st.pay === 'instapay') LAB.notify('إيصال انستا باي جديد', bk.code + ' — ' + bk.patientName + ' — ' + LAB.money(bk.total) + ' ج (مراجعة)', 'pay', 'admin');
LAB.notify('حجز جديد', bk.code + ' — ' + bk.patientName + ' — ' + LAB.money(bk.total) + ' ج', 'booking', 'admin');
LAB.log('حجز جديد ' + code + ' بقيمة ' + LAB.money(bk.total) + ' ج');
// ربط بحساب المريض إن وُجد
var pat = d.patients.filter(function (p) { return p.phone === bk.phone; })[0];
if (!pat) {
pat = { id: LAB.uid(), name: bk.patientName, phone: bk.phone, whatsapp: bk.whatsapp, password: bk.phone.slice(-6), gender: bk.gender, age: bk.age, createdAt: new Date().toISOString(), files: [], notes: [] };
d.patients.push(pat);
}
bk.patientId = pat.id;
LAB.save();
Cart.clear();
showSuccess(bk);
};
function showSuccess(bk) {
$('#okCode').textContent = bk.code;
var b = d.branches.filter(function (x) { return x.id === bk.branchId; })[0];
var a = d.areas.filter(function (x) { return x.id === bk.areaId; })[0];
$('#okDetails').innerHTML =
'<div class="sum-line"><span>الاسم</span><b>' + LAB.escapeHtml(bk.patientName) + '</b></div>' +
'<div class="sum-line"><span>المعاد</span><b>' + LAB.fmtDate(bk.date) + ' — ' + bk.time + '</b></div>' +
'<div class="sum-line"><span>طريقة السحب</span><b>' + (bk.sampleType === 'home' ? 'منزلي — ' + LAB.escapeHtml(a ? a.name : '') : LAB.escapeHtml(b ? b.name : '')) + '</b></div>' +
'<div class="sum-line"><span>التحاليل</span><b>' + bk.tests.length + ' تحليل' + (bk.packageId ? ' + باقة' : '') + '</b></div>' +
'<div class="sum-line"><span>الدفع</span><b>' + (bk.paymentMethod === 'cash' ? 'كاش عند الكشف' : 'انستا باي مراجعة') + '</b></div>' +
'<div class="sum-total"><span>الإجمالي</span><span style="color:var(--teal)">' + LAB.money(bk.total) + ' ج</span></div>';
var msg = encodeURIComponent('السلام عليكم، تم حجز تحليل في معمل الحوشي%0Aرقم الحجز: ' + bk.code +
'%0Aالاسم: ' + bk.patientName + '%0Aالمعاد: ' + LAB.fmtDate(bk.date) + ' الساعة ' + bk.time +
(bk.paymentMethod === 'instapay' ? '%0Aالدفع: انستا باي على ' + s.instapay : '') +
'%0Aالإجمالي: ' + LAB.money(bk.total) + ' جنيه');
$('#okWa').href = 'https://wa.me/' + String(bk.whatsapp).replace(/^0/, '2') + '?text=' + msg;
var qrBox = $('#okQR');
if (qrBox) qrBox.innerHTML = LAB.qr(LAB.trackURL(bk.code), 132) ||
(bk.code ? '' : '');
$('#successWrap').classList.remove('hide');
window.__lastBooking = bk;
confetti();
}
window.printReceipt = function () {
var bk = window.__lastBooking; if (!bk) return;
var w = window.open('', '_blank', 'width=800,height=900');
var rows = (bk.tests || []).map(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0];
return '<tr><td>' + LAB.escapeHtml(n) + '</td><td>' + (t ? t.price : '-') + ' ج</td></tr>';
}).join('');
w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>إيصال حجز ' + bk.code + '</title>' +
'<style>body{font-family:Tahoma;padding:28px;line-height:1.8}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #bbb;padding:8px}h1{color:#0e7c86;margin:0}.hd{display:flex;justify-content:space-between;border-bottom:3px solid #0e7c86;padding-bottom:8px}.code{font-size:26px;font-weight:900;color:#0e7c86}</style></head><body>' +
'<table style="width:100%;border:none;margin-bottom:10px"><tr style="border:none"><td style="border:none">' +
'<h1>' + s.labName + '</h1><p>' + s.ownerName + ' — ' + s.ownerTitle + '</p><p>' + s.phones[0] + ' | ' + s.address + '</p></td>' +
'<td style="border:none;text-align:left;width:120px">' + LAB.qr(LAB.trackURL(bk.code), 100) + '</td></tr></table>' +
'<div style="border-bottom:3px solid #0e7c86;margin-bottom:14px"></div>' +
'<div><b>إيصال حجز</b><br><span class="code">' + bk.code + '</span><br>' + LAB.fmtDate(new Date()) + '</div></div>' +
'<p><b>المريض:</b> ' + LAB.escapeHtml(bk.patientName) + ' | <b>الهاتف:</b> ' + bk.phone + ' | <b>المعاد:</b> ' + LAB.fmtDate(bk.date) + ' ' + bk.time + '</p>' +
'<p><b>طريقة السحب:</b> ' + (bk.sampleType === 'home' ? 'منزلي — ' + LAB.escapeHtml(bk.address) : 'المعمل') + '</p>' +
'<table><tr><th>التحليل</th><th>السعر</th></tr>' + rows + '</table>' +
(bk.homeFee ? '<p>رسوم السحب المنزلي: ' + bk.homeFee + ' ج</p>' : '') +
(bk.extras ? '<p>رسوم عينات إضافية: ' + bk.extras + ' ج</p>' : '') +
(bk.discount ? '<p>الخصم: ' + bk.discount + ' ج</p>' : '') +
'<p style="font-size:20px;font-weight:900">الإجمالي: ' + bk.total + ' جنيه</p>' +
'<p>طريقة الدفع: ' + (bk.paymentMethod === 'cash' ? 'كاش عند الكشف' : 'انستا باي — ' + s.instapay) + '</p>' +
'<hr><p style="font-size:11px;color:#777">شكراً لثقتكم بـ' + s.labName + ' — احتفظ بهذا الإيصال</p>' +
'<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>');
w.document.close();
};
window.closeSuccess = function () { $('#successWrap').classList.add('hide'); };
$('#successWrap').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hide'); });
function confetti() {
var c = $('#confetti'), ctx = c.getContext('2d');
var r = c.getBoundingClientRect(); c.width = r.width; c.height = r.height;
var colors = ['#0e7c86', '#22d3ee', '#f2a93b', '#16a34a', '#e11d48', '#7c3aed'];
var ps = [];
for (var i = 0; i < 130; i++) ps.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, w: Math.random() * 8 + 4, h: Math.random() * 6 + 4, c: colors[i % colors.length], vy: Math.random() * 3 + 2, vx: (Math.random() - .5) * 2, a: Math.random() * 360 });
var t = 0;
(function tick() {
ctx.clearRect(0, 0, c.width, c.height);
ps.forEach(function (p) {
p.x += p.vx; p.y += p.vy; p.a += 6; t++;
ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a * Math.PI / 180);
ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 420);
ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
});
if (t < 420) requestAnimationFrame(tick);
})();
}
window.termsModal = function () {
LAB.modal({
title: 'الشروط والأحكام', html:
'<p>1. الحجز عبر الموقع يُعتبر طلباً وليس تأكيداً نهائياً إلا بعد التواصل من المعمل.</p>' +
'<p>2. بعض التحاليل تتطلب صياماً من 8 إلى 12 ساعة، والمعمل غير مسؤول عن دقة نتيجة تحليل تم دون الالتزام بالصيام.</p>' +
'<p>3. رسوم السحب المنزلي تُحدد حسب المنطقة وقد تختلف بتسعيرة الطبيب.</p>' +
'<p>4. في حال الدفع بانستا باي: يُرجى التحويل على الرقم المعلن وإرفاق الإيصال، ولا يُعتبر الحجز مؤكداً قبل مراجعة الإيصال.</p>' +
'<p>5. النتائج تُسلَّم إلكترونياً ولا تُسلَّم ورقياً إلا بطلب خاص.</p>' +
'<p>6. بيانات المريض سرية تماماً ولا تُشارك مع أي جهة خارجية.</p>'
});
};
/* ---------- init ---------- */
renderBranches(); renderAreas(); renderTests(); renderPkgs(); buildDays();
var dl = $('#docList');
d.doctors.filter(function (x) { return x.active; }).forEach(function (doc) { dl.appendChild(LAB.el('option', { value: doc.name })); });
if (params.test) { Cart.add(params.test); }
if (params.pkg) { var c = Cart.get(); c.pkg = params.pkg; Cart.set(c); }
if (params.code) { $('#couponInp').value = params.code; $('#applyCoupon').click(); }
if (params.branch) { st.branchId = params.branch; renderBranches(); }
renderSummary();
window.addEventListener('cartchange', renderSummary);
LAB.initFX();
})();
