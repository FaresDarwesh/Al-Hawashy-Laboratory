/* =========================================================
لوحة الطبيب — doctor.js
========================================================= */
(function () {
'use strict';
LAB.load();
var d = LAB.db(), s = d.settings, me = null;
var ST = {
pending: ['قيد الانتظار', 'b-wait'], confirmed: ['مؤكد', 'b-new'], sampled: ['تم السحب', 'b-prog'],
processing: ['جاري التحليل', 'b-prog'], ready: ['النتيجة جاهزة', 'b-done'], done: ['مكتمل', 'b-done'], cancelled: ['ملغي', 'b-cancel']
};
var PAY = { unpaid: ['غير مدفوع', 'b-unpaid'], review: ['مراجعة إيصال', 'b-wait'], paid: ['مدفوع', 'b-paid'] };
function badge(m, k) { var v = m[k] || ['—', 'b-gray']; return '<span class="badge ' + v[1] + '">' + v[0] + '</span>'; }
$('#dcLab').textContent = s.labName;
var Doc = {
views: {}, cur: 'home',
go: function (v) {
Doc.cur = v;
$$('#dcDash .side-nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.v === v); });
var wrap = $('#dcViews'); wrap.innerHTML = '';
var view = Doc.views[v];
if (!view) { wrap.innerHTML = '<div class="empty">قريباً</div>'; return; }
wrap.appendChild(LAB.el('div', { class: 'row-between mb-3' }, [
LAB.el('div', {}, [LAB.el('h3', { html: view.title }), view.sub ? LAB.el('p', { class: 'small', html: view.sub }) : null])
]));
var body = LAB.el('div'); wrap.appendChild(body);
view.render(body);
window.scrollTo({ top: 0, behavior: 'smooth' });
$('#dcSide').classList.remove('open');
},
refresh: function () { Doc.go(Doc.cur); Doc.counts(); },
counts: function () {
var mine = myBookings();
$('#dcBk').textContent = mine.filter(function (b) { return b.status === 'pending' || b.status === 'confirmed'; }).length;
$('#dcOpen').textContent = d.bookings.filter(function (b) { return !b.doctorId && (b.status === 'pending' || b.status === 'confirmed'); }).length;
$('#dcRx').textContent = d.prescriptions.filter(function (r) { return r.status === 'new' || r.status === 'reviewing'; }).length;
}
};
function myBookings() {
return d.bookings.filter(function (b) {
return b.doctorId === me.id || (b.doctorName && b.doctorName === me.name);
}).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
}
window.Doc = Doc;
/* ---------- login ---------- */
$('#dcBtn').onclick = function () {
var u = String($('#dcUser').value || '').trim().toLowerCase();
var p = $('#dcPass').value;
var doc = d.doctors.filter(function (x) { return (x.username || '').toLowerCase() === u && x.password === p && x.active; })[0];
if (!doc) { LAB.toast('خطأ', 'بيانات الدخول غير صحيحة أو الحساب موقوف', 'err'); return; }
LAB.setSession({ role: 'doctor', id: doc.id });
if (LAB.cloud && LAB.cloud.serverLogin) LAB.cloud.serverLogin({ username: u, password: p });
LAB.log('دخول الطبيب: ' + doc.name);
me = doc; start();
};
$('#dcLogout').onclick = function () { LAB.logout(); location.reload(); };
$('#dcBurger').onclick = function () { $('#dcSide').classList.toggle('open'); };
function start() {
$('#dcLogin').classList.add('hide'); $('#dcDash').classList.remove('hide');
$('#dcName').textContent = me.name;
$('#dcTitle').textContent = me.title + ' — ' + (me.specialty || '');
$('#dcAvatar').innerHTML = me.avatar
? '<img src="' + me.avatar + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top">'
: '<div class="avatar" style="width:52px;height:52px;font-size:20px">' + me.name.replace('د. ', '').charAt(0) + '</div>';
Shared.notifBell($('#dcBell'), 'doctor');
Doc.go('home'); Doc.counts();
}
/* ---------- نظرتي ---------- */
Doc.views.home = {
title: ' أهلاً ' + '',
sub: '',
render: function (w) {
var mine = myBookings();
var today = LAB.dstr(new Date());
var todayB = mine.filter(function (b) { return b.date === today; });
var doneB = mine.filter(function (b) { return b.status === 'done' || b.status === 'ready'; });
var paid = mine.filter(function (b) { return b.paymentStatus === 'paid'; });
var earn = paid.reduce(function (a, b) { return a + b.total * (me.commission || 0) / 100; }, 0);
var h3 = $('#dcViews h3');
if (h3) h3.textContent = ' أهلاً ' + me.name;
var k = LAB.el('div', { class: 'kpis' }, [
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:var(--grad)', html: LAB.icon('calendar', 22) }), LAB.el('div', { class: 'val', html: String(mine.length) }), LAB.el('div', { class: 'lbl', html: 'إجمالي حجوزاتي' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#0284c7,#22d3ee)', html: LAB.icon('clock', 22) }), LAB.el('div', { class: 'val', html: String(todayB.length) }), LAB.el('div', { class: 'lbl', html: 'حجوزات اليوم' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#16a34a,#22c55e)', html: LAB.icon('check', 22) }), LAB.el('div', { class: 'val', html: String(doneB.length) }), LAB.el('div', { class: 'lbl', html: 'حالات مكتملة' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:var(--grad-gold)', html: LAB.icon('wallet', 22) }), LAB.el('div', { class: 'val', html: LAB.money(earn) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'مستحقاتي (' + (me.commission || 0) + '%)' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#7c3aed,#a855f7)', html: LAB.icon('file', 22) }), LAB.el('div', { class: 'val', html: String(d.prescriptions.filter(function (r) { return r.status === 'new' || r.status === 'reviewing'; }).length) }), LAB.el('div', { class: 'lbl', html: 'روشتات بانتظار المراجعة' })])
]);
w.appendChild(k);
var row = LAB.el('div', { class: 'grid', style: 'grid-template-columns:1.3fr 1fr;gap:18px' }, [
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' جدول اليوم — ' + LAB.fmtDate(new Date()) }),
LAB.el('div', { style: 'max-height:300px;overflow:auto', id: 'dcToday' })
]),
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' حالات حجوزاتي' }),
LAB.el('div', { class: 'chart-box', style: 'height:250px', id: 'dcCh' }),
LAB.el('div', { class: 'legend', id: 'dcLg' })
])
]);
w.appendChild(row);
var tl = $('#dcToday');
if (!todayB.length) tl.innerHTML = '<div class="empty" style="padding:20px">لا مواعيد اليوم </div>';
todayB.sort(function (a, b) { return a.time.localeCompare(b.time); }).forEach(function (b) {
tl.appendChild(LAB.el('div', { class: 'file-chip', style: 'cursor:pointer', onclick: function () { bkModal(b); } }, [
LAB.el('b', { style: 'min-width:52px;color:var(--teal)', html: b.time }),
LAB.el('div', { style: 'flex:1' }, [
LAB.el('div', { style: 'font-size:14px;font-weight:800', html: LAB.escapeHtml(b.patientName) }),
LAB.el('div', { class: 'small', html: b.tests.slice(0, 2).map(LAB.escapeHtml).join('، ') + (b.tests.length > 2 ? ' …' : '') })
]),
LAB.el('span', { class: 'badge ' + ST[b.status][1], html: ST[b.status][0] })
]));
});
var ks = Object.keys(ST);
Charts.donut($('#dcCh'), { labels: ks.map(function (x) { return ST[x][0]; }), data: ks.map(function (x) { return mine.filter(function (b) { return b.status === x; }).length; }), centerLabel: 'حجز' });
$('#dcLg').innerHTML = ks.map(function (x, i) { return '<span><i style="background:' + Charts.PALETTE[i % Charts.PALETTE.length] + '"></i>' + ST[x][0] + '</span>'; }).join('');
/* روشتات عاجلة */
var urgent = d.prescriptions.filter(function (r) { return r.status === 'new'; });
w.appendChild(LAB.el('div', { class: 'chart-card mt-3' }, [
LAB.el('h4', { html: ' روشتات تحتاج مراجعة (' + urgent.length + ')' }),
LAB.el('div', { class: 'row mt-2' }, urgent.length ? urgent.slice(0, 6).map(function (r) {
return LAB.el('button', { class: 'btn btn-sm btn-outline', html: r.code + ' — ' + LAB.escapeHtml(r.name), onclick: function () { Doc.go('rx'); } });
}) : [LAB.el('span', { class: 'small', html: 'لا روشتات جديدة ' })])
]));
}
};
/* ---------- جدول الحجوزات ---------- */
function bkTable(w, list, showTake) {
var rows = list.map(function (b) {
return ADM_ROW([
'<b>' + b.code + '</b><div class="small">' + LAB.fmtDate(b.date) + ' ' + b.time + '</div>',
LAB.escapeHtml(b.patientName) + '<div class="small" dir="ltr">' + b.phone + '</div>',
(b.sampleType === 'home' ? ' ' : ' ') + LAB.escapeHtml(b.sampleType === 'home' ? areaName(b.areaId) : branchName(b.branchId)),
b.tests.length + '<div class="small">' + b.tests.slice(0, 1).map(LAB.escapeHtml).join('') + (b.tests.length > 1 ? ' …' : '') + '</div>',
'<b>' + LAB.money(b.total) + ' ج</b><br>' + badge(PAY, b.paymentStatus),
badge(ST, b.status),
'<div class="tbl-actions">' +
(showTake ? '<button class="btn btn-sm btn-success" data-take="' + b.id + '">استلام</button>' : '') +
'<button class="btn btn-sm btn-primary" data-open="' + b.id + '">فتح</button>' +
'<a class="btn btn-sm btn-ghost" target="_blank" href="https://wa.me/' + String(b.whatsapp || b.phone).replace(/^0/, '2') + '"></a></div>'
]);
function ADM_ROW(cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }
});
w.innerHTML = ADM.tblHTML(['الكود', 'المريض', 'المكان', 'التحاليل', 'الإجمالي', 'الحالة', 'إجراءات'], rows);
LAB.$$('[data-open]', w).forEach(function (btn) {
btn.onclick = function () { bkModal(d.bookings.filter(function (x) { return x.id === btn.dataset.open; })[0]); };
});
LAB.$$('[data-take]', w).forEach(function (btn) {
btn.onclick = function () {
var b = d.bookings.filter(function (x) { return x.id === btn.dataset.take; })[0];
b.doctorId = me.id; b.doctorName = me.name; b.status = b.status === 'pending' ? 'confirmed' : b.status;
LAB.save(); LAB.log('استلام حجز ' + b.code + ' بواسطة ' + me.name); LAB.toast('تم', 'تم استلام الحجز', 'ok'); Doc.refresh();
};
});
}
var ADM = window.ADM || {};
window.ADM = ADM;
ADM.tblHTML = function (h, rows) {
if (!rows.length) return '<div class="empty"><span class="ic"></span>لا توجد بيانات</div>';
return '<div class="table-wrap"><table><thead><tr>' + h.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
};
function branchName(id) { var b = d.branches.filter(function (x) { return x.id === id; })[0]; return b ? b.name : '—'; }
function areaName(id) { var a = d.areas.filter(function (x) { return x.id === id; })[0]; return a ? a.name : '—'; }
Doc.views.mine = {
title: ' حجوزاتي', sub: 'كل الحجوزات المسندة إليك — تابع الحالة وارفع النتائج',
render: function (w) {
var box = LAB.el('div', { class: 'toolbar' }, [
LAB.el('input', { class: 'input', placeholder: ' بحث باسم المريض أو الكود', oninput: function () { draw(this.value); } }),
LAB.el('select', {
class: 'select', style: 'width:auto', onchange: function () { window.__ds = this.value; draw(''); },
html: '<option value="">كل الحالات</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '">' + ST[k][0] + '</option>'; }).join('')
})
]);
w.appendChild(box);
var t = LAB.el('div'); w.appendChild(t);
function draw(q) {
var list = myBookings();
if (window.__ds) list = list.filter(function (b) { return b.status === window.__ds; });
if (q) list = list.filter(function (b) { return (b.patientName + b.code + b.phone).indexOf(q) >= 0; });
bkTable(t, list, false);
}
draw('');
}
};
Doc.views.open = {
title: ' حجوزات بدون طبيب', sub: 'حجوزات جديدة لم يُسند لها طبيب — استلمها لتظهر في حجوزاتك',
render: function (w) {
var t = LAB.el('div'); w.appendChild(t);
bkTable(t, d.bookings.filter(function (b) { return !b.doctorId && b.status !== 'cancelled'; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }), true);
}
};
/* ---------- نافذة الحجز للطبيب ---------- */
function bkModal(b) {
var html = '<div class="grid g2" style="gap:14px">' +
'<div><b>الكود:</b> ' + b.code + '</div><div><b>المريض:</b> ' + LAB.escapeHtml(b.patientName) + '</div>' +
'<div><b>الهاتف:</b> <span dir="ltr">' + b.phone + '</span></div><div><b>المعاد:</b> ' + LAB.fmtDate(b.date) + ' ' + b.time + '</div>' +
'<div><b>السن/النوع:</b> ' + (b.age || '-') + '/' + (b.gender || '-') + '</div>' +
'<div><b>المكان:</b> ' + (b.sampleType === 'home' ? ' ' + LAB.escapeHtml(areaName(b.areaId)) + ' — ' + LAB.escapeHtml(b.address || '') : ' ' + LAB.escapeHtml(branchName(b.branchId))) + '</div>' +
(b.conditions ? '<div style="grid-column:1/-1"><b>حالة صحية:</b> ' + LAB.escapeHtml(b.conditions) + '</div>' : '') +
(b.notes ? '<div style="grid-column:1/-1"><b>ملاحظات:</b> ' + LAB.escapeHtml(b.notes) + '</div>' : '') +
'</div>' +
'<div class="divider"></div><h4>التحاليل المطلوبة</h4>' +
(b.tests || []).map(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0];
return '<div class="sum-line"><span>' + LAB.escapeHtml(n) + (t && t.fasting ? ' ' : '') + '</span><b>' + (t ? t.price : '-') + ' ج</b></div>';
}).join('') +
'<div class="sum-total"><span>الإجمالي</span><span style="color:var(--teal)">' + LAB.money(b.total) + ' ج</span></div>' +
'<div class="field-row mt-3">' +
'<div class="field"><label>حالة الحجز</label><select class="select" id="dSt">' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (b.status === k ? ' selected' : '') + '>' + ST[k][0] + '</option>'; }).join('') + '</select></div>' +
'<div class="field"><label>حالة الدفع</label><select class="select" id="dPay">' + Object.keys(PAY).map(function (k) { return '<option value="' + k + '"' + (b.paymentStatus === k ? ' selected' : '') + '>' + PAY[k][0] + '</option>'; }).join('') + '</select></div>' +
'</div>' +
'<div class="field"><label>تفسير النتيجة / ملاحظات طبية</label><textarea class="textarea" id="dNote" placeholder="مثال: النتائج داخل المعدل الطبيعي، يُنصح بإعادة التحليل بعد شهر…">' + LAB.escapeHtml(b.resultNote || '') + '</textarea></div>' +
(b.receipt ? '<div class="field"><label>إيصال انستا باي</label><div class="preview-grid"><div class="thumb"><img src="' + b.receipt + '" onclick="window.open(this.src)"></div></div>' +
'<div class="row mt-1"><button class="btn btn-sm btn-success" id="dOkPay"> تأكيد الاستلام</button></div></div>' : '') +
'<div class="field"><label>مرفقات النتيجة</label><div class="dropzone" id="dZone"><span class="ic"></span><b>اضغط لرفع صور النتيجة</b></div><div class="preview-grid" id="dPrev"></div></div>' +
'<div class="row mt-3" style="gap:14px;align-items:center"><div style="background:#fff;padding:6px;border-radius:12px;border:1px solid var(--line);line-height:0">' +
LAB.qr(LAB.trackURL(b.code), 88) + '</div>' +
'<div class="small"> كود الحجز — للصقه على العينة أو طباعته للمريض</div></div>' +
'<div class="row mt-2"><button class="btn btn-success" id="dSave"> حفظ</button>' +
'<button class="btn btn-outline" id="dSend"> إرسال النتيجة للمريض (واتساب)</button>' +
'<button class="btn btn-ghost" onclick="window.printResultB && window.printResultB()"> طباعة</button></div>';
var m = LAB.modal({ title: 'حجز ' + b.code, html: html, wide: true });
var files = (b.files || []).slice();
function renderPrev() {
var pv = $('#dPrev'); pv.innerHTML = '';
files.forEach(function (f, i) {
pv.appendChild(LAB.el('div', { class: 'thumb' }, [
LAB.el('img', { src: f.url, onclick: function () { window.open(f.url); } }),
LAB.el('button', { class: 'del', html: '×', onclick: function (e) { e.stopPropagation(); files.splice(i, 1); renderPrev(); } })
]));
});
}
renderPrev();
var zone = $('#dZone'), inp = LAB.el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
Array.prototype.slice.call(this.files).forEach(function (f) {
LAB.fileToDataURL(f, 1400, .8, function (u) { files.push({ url: u, name: f.name, at: new Date().toISOString() }); renderPrev(); });
});
this.value = '';
};
window.printResultB = function () { printBk(b); };
$('#dSave').onclick = function () {
var old = b.status;
b.status = $('#dSt').value; b.paymentStatus = $('#dPay').value;
b.resultNote = $('#dNote').value; b.files = files;
if (!b.doctorId) { b.doctorId = me.id; b.doctorName = me.name; }
LAB.save(); LAB.log('تحديث حجز ' + b.code + ' → ' + ST[b.status][0] + ' بواسطة ' + me.name);
if (old !== b.status && b.status === 'ready') LAB.notify('نتيجتك جاهزة ', 'نتيجة حجزك ' + b.code + ' جاهزة', 'booking', 'patient:' + b.phone);
m.close(); Doc.refresh(); LAB.toast('تم', 'تم حفظ التغييرات', 'ok');
};
$('#dSend').onclick = function () {
var t = encodeURIComponent('السلام عليكم ' + b.patientName + ' \nمعكم ' + me.name + ' من معمل الحوشي للتحاليل \n' +
'بخصوص الحجز رقم ' + b.code + '\n' + ($('#dNote').value ? 'ملاحظات النتيجة: ' + $('#dNote').value + '\n' : '') +
'لأي استفسار احنا معاكم — ' + s.phones[0]);
window.open('https://wa.me/' + String(b.whatsapp || b.phone).replace(/^0/, '2') + '?text=' + t, '_blank');
};
if ($('#dOkPay')) $('#dOkPay').onclick = function () { b.paymentStatus = 'paid'; LAB.save(); LAB.toast('تم', 'تم تأكيد الدفع', 'ok'); m.close(); Doc.refresh(); };
}
/* ---------- طباعة التقرير ---------- */
function printBk(b) {
var w = window.open('', '_blank', 'width=820,height=900');
var rows = (b.tests || []).map(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0];
return '<tr><td>' + n + '</td><td>' + (t ? t.price : '-') + ' ج</td></tr>';
}).join('');
w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>تقرير ' + b.code + '</title>' +
'<style>body{font-family:Tahoma;padding:28px;line-height:1.8}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #bbb;padding:8px}h1{color:#0e7c86;margin:0}.hd{display:flex;justify-content:space-between;border-bottom:3px solid #0e7c86;padding-bottom:8px}</style></head><body>' +
'<div class="hd"><div><h1>' + s.labName + '</h1><p>' + me.name + ' — ' + me.title + '</p></div>' +
'<div><b>تقرير حجز</b><br>' + b.code + '<br>' + LAB.fmtDate(new Date()) + '</div></div>' +
'<p><b>المريض:</b> ' + b.patientName + ' | <b>الهاتف:</b> ' + b.phone + ' | <b>المعاد:</b> ' + LAB.fmtDate(b.date) + ' ' + b.time + '</p>' +
'<table><tr><th>التحليل</th><th>السعر</th></tr>' + rows + '</table>' +
'<p><b>الإجمالي:</b> ' + b.total + ' جنيه</p>' +
(b.resultNote ? '<h3>ملاحظات النتيجة</h3><p>' + b.resultNote + '</p>' : '') +
(b.files && b.files.length ? b.files.map(function (f) { return '<img src="' + f.url + '" style="max-width:100%;margin:8px 0;border:1px solid #ddd">'; }).join('') : '') +
'<hr><p style="font-size:11px;color:#777">' + s.labName + ' — ' + s.phones[0] + '</p>' +
'<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>');
w.document.close();
}
/* ---------- رفع النتائج ---------- */
Doc.views.results = {
title: ' رفع النتائج', sub: 'الحجوزات التي تم سحبها وتحتاج اعتماد النتيجة',
render: function (w) {
var list = (me.role === 'owner' ? d.bookings : myBookings()).filter(function (b) {
return ['confirmed', 'sampled', 'processing'].indexOf(b.status) >= 0;
}).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
var t = LAB.el('div'); w.appendChild(t);
bkTable(t, list, false);
}
};
/* ---------- الروشتات ---------- */
Doc.views.rx = {
title: ' مراجعة الروشتات', sub: 'حدد التحاليل المطلوبة وابعث السعر للمريض',
render: function (w) {
var t = LAB.el('div'); w.appendChild(t);
function draw() {
var list = d.prescriptions.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
var RXS = { new: ['جديد', 'b-wait'], reviewing: ['تحت المراجعة', 'b-prog'], quoted: ['تم التسعير', 'b-new'], done: ['تم الحجز', 'b-done'], rejected: ['مرفوض', 'b-cancel'] };
var rows = list.map(function (r) {
return '<tr><td><b>' + r.code + '</b></td><td>' + LAB.escapeHtml(r.name) + '<div class="small" dir="ltr">' + r.phone + '</div></td>' +
'<td>' + (r.images || []).length + '</td><td>' + (r.tests || []).length + '</td>' +
'<td>' + (r.quoted ? '<b>' + LAB.money(r.quoted) + ' ج</b>' : '—') + '</td>' +
'<td><span class="badge ' + (RXS[r.status] || RXS.new)[1] + '">' + (RXS[r.status] || RXS.new)[0] + '</span></td>' +
'<td><button class="btn btn-sm btn-primary" data-r="' + r.id + '">مراجعة</button></td></tr>';
});
t.innerHTML = ADM.tblHTML(['الكود', 'المريض', 'صور', 'تحاليل', 'السعر', 'الحالة', 'إجراءات'], rows);
LAB.$$('[data-r]', t).forEach(function (btn) {
btn.onclick = function () { rxForm(d.prescriptions.filter(function (x) { return x.id === btn.dataset.r; })[0], draw); };
});
}
draw();
}
};
function rxForm(r, redraw) {
var selected = (r.tests || []).slice();
var html = '<div class="split" style="grid-template-columns:1fr 1fr;gap:18px;align-items:start">' +
'<div><h4>صور الروشتة</h4><div class="preview-grid mt-1">' +
(r.images || []).map(function (u) { return '<div class="thumb"><img src="' + u + '" onclick="window.open(this.src)" style="cursor:zoom-in"></div>'; }).join('') +
'</div><div class="mt-2 small"><b>' + LAB.escapeHtml(r.name) + '</b> — <span dir="ltr">' + r.phone + '</span>' + (r.doctor ? '<br> ' + LAB.escapeHtml(r.doctor) : '') + (r.notes ? '<br> ' + LAB.escapeHtml(r.notes) : '') + '</div></div>' +
'<div><h4>التحاليل</h4><input id="drs" class="input mt-1" placeholder=" ابحث واضغط للإضافة">' +
'<div id="dres" style="max-height:170px;overflow:auto;margin-top:8px"></div>' +
'<div class="chips mt-2" id="dsel"></div>' +
'<div class="field mt-2"><label>السعر النهائي (ج)</label><input class="input" type="number" id="drp" value="' + (r.quoted || '') + '"></div>' +
'<div class="field"><label>رسالة للمريض</label><textarea class="textarea" id="drr">' + LAB.escapeHtml(r.reply || '') + '</textarea></div>' +
'<div class="field"><label>الحالة</label><select class="select" id="drst">' +
['reviewing', 'quoted', 'done', 'rejected'].map(function (k) { return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' + ({ reviewing: 'تحت المراجعة', quoted: 'تم التسعير', done: 'تم الحجز', rejected: 'مرفوض' })[k] + '</option>'; }).join('') +
'</select></div></div></div>';
var m = LAB.modal({
title: 'روشتة ' + r.code, html: html, wide: true,
buttons: [
{ text: ' حفظ', cls: 'btn-primary', action: function (b, close) { save(); close(); } },
{ text: ' حفظ + واتساب', cls: 'btn-success', action: function (b, close) { save(true); close(); } },
{ text: 'إغلاق' }
]
});
function renderSel() {
var w = $('#dsel'); w.innerHTML = ''; var total = 0;
selected.forEach(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0]; total += t ? t.price : 0;
w.appendChild(LAB.el('span', { class: 'chip', style: 'background:var(--teal);color:#fff;border-color:var(--teal)' }, [
document.createTextNode(n + ' (' + (t ? t.price : 0) + 'ج) '),
LAB.el('b', { style: 'cursor:pointer', html: '×', onclick: function (e) { e.stopPropagation(); selected = selected.filter(function (x) { return x !== n; }); renderSel(); } })
]));
});
if (!$('#drp').value) $('#drp').value = total;
}
$('#drs').addEventListener('input', function () {
var q = this.value.trim().toLowerCase(), w = $('#dres'); w.innerHTML = '';
if (q.length < 2) return;
d.tests.filter(function (t) { return t.active && t.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 10).forEach(function (t) {
w.appendChild(LAB.el('div', { class: 'file-chip', style: 'cursor:pointer', onclick: function () { if (selected.indexOf(t.name) < 0) { selected.push(t.name); renderSel(); } } }, [
LAB.el('b', { style: 'font-size:13px', html: LAB.escapeHtml(t.name) }),
LAB.el('span', { class: 'small', style: 'margin-inline-start:auto', html: t.price + ' ج' })
]));
});
});
renderSel();
function save(send) {
r.tests = selected; r.quoted = Number($('#drp').value) || 0; r.reply = $('#drr').value; r.status = $('#drst').value;
r.reviewedBy = me.name;
LAB.save(); LAB.log('مراجعة روشتة ' + r.code + ' بواسطة ' + me.name);
LAB.notify('رد على روشتتك ', 'التحاليل: ' + selected.length + ' — السعر: ' + LAB.money(r.quoted) + ' ج', 'rx', 'patient:' + r.phone);
if (send) {
window.open('https://wa.me/' + String(r.phone).replace(/^0/, '2') + '?text=' + encodeURIComponent(
'السلام عليكم ' + r.name + ' \nمعكم ' + me.name + ' من معمل الحوشي \nبخصوص الروشتة ' + r.code + '\nالتحاليل المطلوبة:\n' +
selected.map(function (n, i) { return (i + 1) + ') ' + n; }).join('\n') + '\n الإجمالي: ' + LAB.money(r.quoted) + ' جنيه' +
(r.reply ? '\n ' + r.reply : '')), '_blank');
}
LAB.toast('تم', 'تم حفظ المراجعة', 'ok'); redraw && redraw(); Doc.counts();
}
}
/* ---------- مرضاي ---------- */
Doc.views.patients = {
title: ' مرضاي', sub: 'المرضى الذين تابعت حجوزاتهم',
render: function (w) {
var phones = {};
myBookings().forEach(function (b) { phones[b.phone] = (phones[b.phone] || 0) + 1; });
var list = Object.keys(phones).map(function (p) {
var bs = d.bookings.filter(function (b) { return b.phone === p; });
var last = bs.sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
var pat = d.patients.filter(function (x) { return x.phone === p; })[0];
return {
name: (last && last.patientName) || (pat && pat.name) || '—', phone: p, count: bs.length,
last: last ? last.date : null, spent: bs.reduce(function (a, b) { return a + b.total; }, 0),
files: pat ? (pat.files || []).length : 0
};
});
var rows = list.map(function (x) {
return '<tr><td><b>' + LAB.escapeHtml(x.name) + '</b><div class="small" dir="ltr">' + x.phone + '</div></td>' +
'<td>' + x.count + '</td><td>' + (x.last ? LAB.fmtDate(x.last) : '—') + '</td>' +
'<td><b>' + LAB.money(x.spent) + ' ج</b></td><td>' + x.files + '</td>' +
'<td><div class="tbl-actions"><a class="btn btn-sm btn-outline" target="_blank" href="https://wa.me/' + String(x.phone).replace(/^0/, '2') + '"></a>' +
'<button class="btn btn-sm btn-primary" data-p="' + x.phone + '">السجل</button></div></td></tr>';
});
var box = LAB.el('div', { html: ADM.tblHTML(['المريض', 'حجوزات', 'آخر زيارة', 'الإنفاق', 'ملفات', 'إجراءات'], rows) });
w.appendChild(box);
LAB.$$('[data-p]', box).forEach(function (b) {
b.onclick = function () {
var ph = b.dataset.p;
var bs = d.bookings.filter(function (x) { return x.phone === ph; }).sort(function (a, c) { return new Date(c.date) - new Date(a.date); });
var pat = d.patients.filter(function (x) { return x.phone === ph; })[0];
LAB.modal({
title: 'سجل المريض: ' + (bs[0] ? bs[0].patientName : ph), wide: true,
html: '<p class="small mb-2"> <span dir="ltr">' + ph + '</span> — عدد الحجوزات: <b>' + bs.length + '</b> — الإنفاق: <b>' + LAB.money(bs.reduce(function (a, c) { return a + c.total; }, 0)) + ' ج</b></p>' +
ADM.tblHTML(['الكود', 'التاريخ', 'التحاليل', 'الحالة', 'النتيجة'], bs.map(function (x) {
return '<tr><td>' + x.code + '</td><td>' + LAB.fmtDate(x.date) + '</td><td>' + x.tests.length + '</td><td>' + badge(ST, x.status) + '</td>' +
'<td>' + LAB.escapeHtml((x.resultNote || '—').slice(0, 60)) + '</td></tr>';
})) +
(pat && pat.files && pat.files.length ? '<h4 class="mt-3">الملفات الطبية</h4><div class="preview-grid">' +
pat.files.map(function (f) { return '<div class="thumb"><img src="' + f.url + '" onclick="window.open(this.src)"></div>'; }).join('') + '</div>' : ''),
buttons: [{ text: 'إغلاق' }]
});
};
});
}
};
/* ---------- تسعيرة الكشف المنزلي ---------- */
Doc.views.prices = {
title: ' تسعيرة الكشف/السحب المنزلي', sub: 'حدد سعرك لكل منطقة — يُطبق تلقائياً عند اختيار المريض لاسمك',
render: function (w) {
me.homePrices = me.homePrices || {};
var html = '<p class="small mb-2">سيتم استخدام هذه الأسعار بدلاً من الأسعار الافتراضية للمعمل عند اختيار المريض لاسمك في الحجز أو عند إسناد الحجز إليك.</p>' +
'<div class="table-wrap"><table><thead><tr><th>المنطقة</th><th>السعر الافتراضي للمعمل</th><th>سعرك (ج)</th><th>الفرق</th></tr></thead><tbody>' +
d.areas.filter(function (a) { return a.active; }).map(function (a) {
var v = me.homePrices[a.id];
return '<tr><td><b>' + LAB.escapeHtml(a.name) + '</b></td><td>' + a.fee + ' ج</td>' +
'<td><input class="input" data-a="' + a.id + '" type="number" placeholder="' + a.fee + '" value="' + (v != null ? v : '') + '" style="max-width:160px"></td>' +
'<td>' + (v != null && v !== '' ? '<b style="color:' + (v > a.fee ? 'var(--green)' : 'var(--gold)') + '">' + (v - a.fee > 0 ? '+' : '') + (v - a.fee) + ' ج</b>' : '—') + '</td></tr>';
}).join('') + '</tbody></table></div>';
var card = LAB.el('div', { class: 'card', style: 'padding:22px', html: html });
w.appendChild(card);
w.appendChild(LAB.el('button', {
class: 'btn btn-primary mt-2', html: ' حفظ التسعيرات', onclick: function () {
me.homePrices = {};
LAB.$$('[data-a]', card).forEach(function (i) { if (i.value !== '') me.homePrices[i.dataset.a] = Number(i.value) || 0; });
LAB.save(); LAB.log('تحديث تسعيرة الكشف المنزلي — ' + me.name);
LAB.toast('تم', 'تم حفظ تسعيراتك', 'ok'); Doc.refresh();
}
}));
w.appendChild(LAB.el('button', {
class: 'btn btn-ghost mt-2', style: 'margin-inline-start:8px', html: ' مسح الكل (استخدام افتراضي المعمل)', onclick: function () {
me.homePrices = {}; LAB.save(); Doc.refresh();
}
}));
}
};
/* ---------- المستحقات ---------- */
Doc.views.earn = {
title: ' مستحقاتي', sub: 'حساب أرباحك من الحجوزات المحصّلة',
render: function (w) {
var mine = myBookings().filter(function (b) { return b.status !== 'cancelled'; });
var paid = mine.filter(function (b) { return b.paymentStatus === 'paid'; });
var unpaid = mine.filter(function (b) { return b.paymentStatus !== 'paid'; });
var rate = me.commission || 0;
var earn = paid.reduce(function (a, b) { return a + b.total * rate / 100; }, 0);
var pending = unpaid.reduce(function (a, b) { return a + b.total * rate / 100; }, 0);
var k = LAB.el('div', { class: 'kpis' }, [
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:var(--grad)', html: LAB.icon('calendar', 22) }), LAB.el('div', { class: 'val', html: String(mine.length) }), LAB.el('div', { class: 'lbl', html: 'حجوزاتي' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#16a34a,#22c55e)', html: LAB.icon('wallet', 22) }), LAB.el('div', { class: 'val', html: LAB.money(earn) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'مستحق محصّل' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:var(--grad-gold)', html: LAB.icon('clock', 22) }), LAB.el('div', { class: 'val', html: LAB.money(pending) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'مستحق مؤجل' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#7c3aed,#a855f7)', html: LAB.icon('chart', 22) }), LAB.el('div', { class: 'val', html: LAB.money(mine.reduce(function (a, b) { return a + b.total; }, 0)) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'قيمة حجوزاتي الكلية' })])
]);
w.appendChild(k);
var rows = mine.slice(0, 40).map(function (b) {
return '<tr><td>' + b.code + '</td><td>' + LAB.escapeHtml(b.patientName) + '</td><td>' + LAB.fmtDate(b.date) + '</td>' +
'<td>' + LAB.money(b.total) + ' ج</td><td>' + (b.paymentStatus === 'paid' ? '<span class="badge b-paid">مدفوع</span>' : '<span class="badge b-unpaid">غير مدفوع</span>') + '</td>' +
'<td><b style="color:var(--green)">' + LAB.money(b.total * rate / 100) + ' ج</b></td></tr>';
});
w.appendChild(LAB.el('div', { class: 'chart-card mt-3' }, [
LAB.el('h4', { html: ' كشف الحساب' }),
LAB.el('div', { class: 'mt-2', html: ADM.tblHTML(['الكود', 'المريض', 'التاريخ', 'الإجمالي', 'التحصيل', 'عمولتك (' + rate + '%)'], rows) })
]));
}
};
/* ---------- الملف الشخصي ---------- */
Doc.views.profile = {
title: ' بياناتي وكلمة المرور',
render: function (w) {
var card = LAB.el('div', { class: 'card', style: 'padding:24px;max-width:640px' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'الاسم' }), LAB.el('input', { class: 'input', id: 'pfN', value: me.name })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اللقب العلمي' }), LAB.el('input', { class: 'input', id: 'pfT', value: me.title || '' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'التخصص' }), LAB.el('input', { class: 'input', id: 'pfS', value: me.specialty || '' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'الهاتف' }), LAB.el('input', { class: 'input', id: 'pfP', value: me.phone || '', dir: 'ltr' })]),
LAB.el('div', { class: 'divider' }),
LAB.el('h4', { html: ' تغيير كلمة المرور' }),
LAB.el('div', { class: 'field mt-2' }, [LAB.el('label', { html: 'كلمة المرور الحالية' }), LAB.el('input', { class: 'input', type: 'password', id: 'pfOld' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'كلمة المرور الجديدة' }), LAB.el('input', { class: 'input', type: 'password', id: 'pfNew' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'الصورة الشخصية' }),
LAB.el('div', { class: 'dropzone', id: 'pfImg' }, [LAB.el('span', { class: 'ic', html: LAB.icon('upload', 22) }), LAB.el('b', { html: 'اضغط لرفع صورة' })]),
LAB.el('div', { class: 'preview-grid', id: 'pfPrev' })]),
LAB.el('button', {
class: 'btn btn-primary mt-2', html: ' حفظ', onclick: function () {
me.name = $('#pfN').value; me.title = $('#pfT').value; me.specialty = $('#pfS').value; me.phone = $('#pfP').value;
var o = $('#pfOld').value, n = $('#pfNew').value;
if (n) {
if (o !== me.password) { LAB.toast('خطأ', 'كلمة المرور الحالية غير صحيحة', 'err'); return; }
me.password = n; LAB.toast('تم', 'تم تغيير كلمة المرور', 'ok');
}
LAB.save(); LAB.toast('تم', 'تم حفظ البيانات', 'ok'); Doc.refresh();
}
})
]);
w.appendChild(card);
if (me.avatar) $('#pfPrev').innerHTML = '<div class="thumb"><img src="' + me.avatar + '"></div>';
var zone = $('#pfImg'), inp = LAB.el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
var f = this.files[0]; if (!f) return;
LAB.fileToDataURL(f, 400, .8, function (u) { me.avatar = u; LAB.save(); $('#pfPrev').innerHTML = '<div class="thumb"><img src="' + u + '"></div>'; });
};
}
};
/* =========================================================
   ربط زراير القائمة الجانبية للوحة الطبيب (نفس إصلاح الأدمن)
   ========================================================= */
(function bindDoctorNav() {
  var links = document.querySelectorAll('#dcDash .side-nav a[data-v]');
  if (!links.length) return;
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var v = a.getAttribute('data-v');
      if (typeof Doc !== 'undefined' && Doc.go) Doc.go(v);
    });
  });
})();

/* ---------- start if session ---------- */
var ses = LAB.getSession();
if (ses && ses.role === 'doctor') {
me = d.doctors.filter(function (x) { return x.id === ses.id; })[0];
if (me && me.active) start();
}
LAB.initFX();
})();
