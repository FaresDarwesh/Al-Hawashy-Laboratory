/* =========================================================
لوحة تحكم المدير — الجزء الثاني
(مالية، تحاليل، باقات، فروع، أطباء، مناطق، عروض، محتوى، إعدادات، سجلات)
========================================================= */
(function () {
'use strict';
var d = LAB.db(), s = d.settings;
var ST = ADM.ST, badge = ADM.badge;
function btn(text, cls, fn) { return LAB.el('button', { class: 'btn btn-sm ' + (cls || 'btn-ghost'), html: text, onclick: fn }); }
function crudView(opts) {
// opts: {key, title, sub, cols, row(item), form(item, cb), empty, filter}
Admin.views[opts.key] = {
title: opts.title, sub: opts.sub,
action: function () { return [LAB.el('button', { class: 'btn btn-primary btn-sm', html: ' إضافة جديد', onclick: function () { opts.form(null, function () { LAB.save(); Admin.refresh(); }); } })]; },
render: function (w) {
var tb = LAB.el('div', { class: 'toolbar' }, [
LAB.el('input', { class: 'input', placeholder: ' بحث', oninput: function () { draw(this.value); } }),
opts.extra ? opts.extra(drawRef) : null
]);
w.appendChild(tb);
var box = LAB.el('div'); w.appendChild(box);
function drawRef() { draw(tb.querySelector('input').value); }
function draw(q) {
var list = d[opts.key].slice();
if (q) list = list.filter(function (i) { return JSON.stringify(i).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
if (opts.sort) list.sort(opts.sort);
box.innerHTML = '<div class="small mb-2">العدد: <b>' + list.length + '</b></div>' +
ADM.tbl(opts.cols, list.map(function (i) {
return ADM.row(opts.row(i).concat([
'<div class="tbl-actions">' +
'<button class="btn btn-sm btn-outline" data-e="' + i.id + '">تعديل</button>' +
(opts.toggle ? '<button class="btn btn-sm ' + (i.active ? 'btn-ghost' : 'btn-success') + '" data-t="' + i.id + '">' + (i.active ? 'إيقاف' : 'تشغيل') + '</button>' : '') +
'<button class="btn btn-sm btn-danger" data-d="' + i.id + '">حذف</button>' +
(opts.actions ? opts.actions(i) : '') +
'</div>'
]));
}), opts.empty || 'لا توجد بيانات');
LAB.$$('[data-e]', box).forEach(function (b) { b.onclick = function () { var it = d[opts.key].filter(function (x) { return x.id === b.dataset.e; })[0]; opts.form(it, function () { LAB.save(); Admin.refresh(); }); }; });
LAB.$$('[data-d]', box).forEach(function (b) {
b.onclick = function () {
var it = d[opts.key].filter(function (x) { return x.id === b.dataset.d; })[0];
LAB.confirm('حذف', 'حذف "' + (it.name || it.code || it.id) + '" نهائياً؟', function () {
d[opts.key] = d[opts.key].filter(function (x) { return x.id !== it.id; });
LAB.save(); LAB.log('حذف: ' + (it.name || it.id)); Admin.refresh();
}, 'احذف');
};
});
LAB.$$('[data-t]', box).forEach(function (b) {
b.onclick = function () {
var it = d[opts.key].filter(function (x) { return x.id === b.dataset.t; })[0];
it.active = !it.active; LAB.save(); Admin.refresh();
};
});
if (opts.after) opts.after(box, drawRef);
}
draw('');
}
};
}
/* ===================== المالية ===================== */
var EX_CATS = ['كواشف ومستهلكات', 'رواتب', 'إيجار', 'كهرباء ومياه', 'صيانة وأجهزة', 'تسويق وإعلان', 'نقل ومواصلات', 'أخرى'];
function expenseForm(e) {
var isNew = !e;
e = e || { id: LAB.uid(), date: LAB.dstr(new Date()), amount: 0, cat: EX_CATS[0], note: '' };
LAB.modal({
title: isNew ? 'تسجيل مصروف' : 'تعديل مصروف',
html:
'<div class="field-row"><div class="field"><label>التاريخ</label><input class="input" type="date" id="exDate" value="' + (e.date || LAB.dstr(new Date())) + '"></div>' +
'<div class="field"><label>المبلغ (ج)</label><input class="input" type="number" id="exAmt" value="' + (e.amount || 0) + '"></div></div>' +
'<div class="field"><label>التصنيف</label><select class="select" id="exCat">' +
EX_CATS.map(function (c) { return '<option' + (c === e.cat ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
'<div class="field"><label>البيان</label><input class="input" id="exNote" value="' + LAB.escapeHtml(e.note || '') + '"></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
var amt = Number(b.querySelector('#exAmt').value) || 0;
if (amt <= 0) { LAB.toast('مطلوب', 'اكتب مبلغ المصروف', 'warn'); return; }
e.date = b.querySelector('#exDate').value || LAB.dstr(new Date());
e.amount = amt;
e.cat = b.querySelector('#exCat').value;
e.note = b.querySelector('#exNote').value;
if (isNew) { e.at = new Date().toISOString(); d.expenses.unshift(e); LAB.log('تسجيل مصروف: ' + LAB.money(amt)); }
else { LAB.log('تعديل مصروف: ' + LAB.money(amt)); }
LAB.save(); close(); Admin.refresh();
LAB.toast('تم', isNew ? 'تم تسجيل المصروف' : 'تم تعديل المصروف', 'ok');
}
}, { text: 'إلغاء' }]
});
}
Admin.views.finance = {
title: ' الإيرادات والمصروفات',
sub: 'صافي الربح، التحصيل، والمصروفات التشغيلية',
action: function () {
return [LAB.el('button', {
class: 'btn btn-primary btn-sm', html: ' مصروف جديد', onclick: function () { expenseForm(null); }
})];
},
render: function (w) {
var paid = d.bookings.filter(function (b) { return b.paymentStatus === 'paid' && b.status !== 'cancelled'; });
var due = d.bookings.filter(function (b) { return b.paymentStatus !== 'paid' && b.status !== 'cancelled'; });
var rev = paid.reduce(function (a, b) { return a + b.total; }, 0);
var dueAmt = due.reduce(function (a, b) { return a + b.total; }, 0);
var exp = d.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
var fees = d.bookings.filter(function (b) { return b.sampleType === 'home'; }).reduce(function (a, b) { return a + b.homeFee; }, 0);
var k = LAB.el('div', { class: 'kpis' }, [
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#16a34a,#22c55e)', html: LAB.icon('wallet', 22) }), LAB.el('div', { class: 'val', html: LAB.money(rev) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'المحصّل فعلياً' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:var(--grad-gold)', html: LAB.icon('clock', 22) }), LAB.el('div', { class: 'val', html: LAB.money(dueAmt) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'مستحق التحصيل' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#e11d48,#fb7185)', html: LAB.icon('card', 22) }), LAB.el('div', { class: 'val', html: LAB.money(exp) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'إجمالي المصروفات' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:var(--grad)', html: LAB.icon('chart', 22) }), LAB.el('div', { class: 'val', html: LAB.money(rev - exp) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'صافي الربح' })]),
LAB.el('div', { class: 'kpi' }, [LAB.el('div', { class: 'ic', style: 'background:linear-gradient(135deg,#7c3aed,#a855f7)', html: LAB.icon('home', 22) }), LAB.el('div', { class: 'val', html: LAB.money(fees) + ' ج' }), LAB.el('div', { class: 'lbl', html: 'إيراد رسوم السحب المنزلي' })])
]);
w.appendChild(k);
var row = LAB.el('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr;gap:18px' }, [
LAB.el('div', { class: 'chart-card' }, [LAB.el('h4', { html: ' مصروفات آخر 6 شهور مقابل الإيرادات' }), LAB.el('div', { class: 'chart-box', id: 'fch1' })]),
LAB.el('div', { class: 'chart-card' }, [LAB.el('h4', { html: ' توزيع المصروفات' }), LAB.el('div', { class: 'chart-box', style: 'height:250px', id: 'fch2' }), LAB.el('div', { class: 'legend', id: 'flg2' })])
]);
w.appendChild(row);
/* جدول المصروفات */
var tbl = LAB.el('div', { class: 'chart-card mt-3' }, [LAB.el('h4', { html: ' سجل المصروفات' }), LAB.el('div', { id: 'expTbl' })]);
w.appendChild(tbl);
var rows = d.expenses.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).map(function (e) {
return ADM.row([LAB.fmtDate(e.date), LAB.escapeHtml(e.cat), LAB.escapeHtml(e.note || '—'), '<b>' + LAB.money(e.amount) + ' ج</b>',
'<div class="tbl-actions"><button class="btn btn-sm btn-outline" data-e="' + e.id + '">تعديل</button>' +
'<button class="btn btn-sm btn-danger" data-x="' + e.id + '">حذف</button></div>']);
});
$('#expTbl').innerHTML = ADM.tbl(['التاريخ', 'التصنيف', 'البيان', 'المبلغ', 'إجراء'], rows, 'لا توجد مصروفات مسجلة');
LAB.$$('[data-e]').forEach(function (b) {
b.onclick = function () {
var ex = d.expenses.filter(function (x) { return x.id === b.dataset.e; })[0];
if (ex) expenseForm(ex);
};
});
LAB.$$('[data-x]').forEach(function (b) {
b.onclick = function () {
var ex = d.expenses.filter(function (x) { return x.id === b.dataset.x; })[0];
LAB.confirm('حذف المصروف', 'حذف مصروف بقيمة ' + LAB.money(ex ? ex.amount : 0) + ' ج؟', function () {
d.expenses = d.expenses.filter(function (x) { return x.id !== b.dataset.x; });
LAB.save(); LAB.log('حذف مصروف'); Admin.refresh();
}, 'احذف');
};
});
var mNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
var mL = [], mRev = [], mExp = [];
for (var i = 5; i >= 0; i--) {
var dt = new Date(); dt.setMonth(dt.getMonth() - i);
mL.push(mNames[dt.getMonth()]);
mRev.push(d.bookings.filter(function (b) {
var x = new Date(b.date); return x.getMonth() === dt.getMonth() && x.getFullYear() === dt.getFullYear() && b.status !== 'cancelled';
}).reduce(function (a, b) { return a + b.total; }, 0));
mExp.push(d.expenses.filter(function (e) { var x = new Date(e.date); return x.getMonth() === dt.getMonth() && x.getFullYear() === dt.getFullYear(); }).reduce(function (a, b) { return a + b.amount; }, 0));
}
Charts.bar($('#fch1'), { labels: mL, data: mRev, name: 'الإيرادات', colors: ['#0e7c86', '#22d3ee', '#16a34a', '#f2a93b', '#7c3aed', '#e11d48'] });
var cats = {};
d.expenses.forEach(function (e) { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });
var ck = Object.keys(cats);
Charts.donut($('#fch2'), { labels: ck, data: ck.map(function (c) { return cats[c]; }), centerLabel: 'مصروفات' });
$('#flg2').innerHTML = ck.map(function (c, i) { return '<span><i style="background:' + Charts.PALETTE[i % Charts.PALETTE.length] + '"></i>' + LAB.escapeHtml(c) + '</span>'; }).join('');
LAB.initFX();
}
};
/* ===================== التحاليل ===================== */
crudView({
key: 'tests', title: ' التحاليل والأسعار', sub: 'أضف أو عدّل أي تحليل — التغيير ينعكس فوراً على الموقع',
cols: ['التحليل', 'التصنيف', 'السعر', 'العينة', 'مدة النتيجة', 'صيام', 'الحالة', 'إجراءات'],
sort: function (a, b) { return (a.category || '').localeCompare(b.category) || a.name.localeCompare(b.name); },
toggle: true,
extra: function (redraw) {
return [
LAB.el('select', {
class: 'select', style: 'width:auto', html: '<option value="">كل التصنيفات</option>' + uniqueCats().map(function (c) { return '<option>' + LAB.escapeHtml(c) + '</option>'; }).join(''),
onchange: function () { window.__tcat = this.value; redraw(); }
}),
LAB.el('button', {
class: 'btn btn-ghost btn-sm', html: ' تصدير CSV', onclick: function () {
var rows = [['الاسم', 'التصنيف', 'السعر', 'العينة', 'الساعات', 'صيام', 'مفعل']];
d.tests.forEach(function (t) { rows.push([t.name, t.category, t.price, t.sample, t.hours, t.fasting ? 'نعم' : 'لا', t.active ? 'نعم' : 'لا']); });
ADM.csv(rows, 'tests.csv');
}
}),
LAB.el('button', {
class: 'btn btn-ghost btn-sm', html: ' استيراد CSV', onclick: function () {
LAB.modal({
title: 'استيراد تحاليل من CSV',
html: '<p class="small mb-2">الأعمدة المطلوبة بالترتيب: <b>الاسم، التصنيف، السعر، العينة، الساعات، صيام(نعم/لا)</b><br>السطر الأول عنوان (سيتم تجاهله). التحاليل الموجودة بنفس الاسم يتم تحديث سعرها.</p>' +
'<div class="dropzone" id="csvZone"><span class="ic"></span><b>اضغط لاختيار ملف CSV</b></div>' +
'<div class="small mt-2" id="csvInfo"></div>',
buttons: [{
text: 'إغلاق'
}]
});
var zone = $('#csvZone');
var inp = LAB.el('input', { type: 'file', accept: '.csv,text/csv', style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
var f = this.files[0]; if (!f) return;
var fr = new FileReader();
fr.onload = function () {
var lines = String(fr.result).replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
var added = 0, updated = 0;
lines.slice(1).forEach(function (line) {
// دعم الفاصلة داخل علامات التنصيص
var cells = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
cells = cells.map(function (c) { return c.replace(/^"|"$/g, '').replace(/""/g, '"').trim(); });
var name = cells[0]; if (!name) return;
var price = parseFloat(cells[2]);
if (isNaN(price)) return;
var ex = d.tests.filter(function (t) { return t.name === name; })[0];
if (ex) {
ex.price = price; if (cells[1]) ex.category = cells[1];
if (cells[3]) ex.sample = cells[3];
if (cells[4]) ex.hours = parseFloat(cells[4]) || ex.hours;
if (cells[5] != null) ex.fasting = /نعم|yes|1|true/i.test(cells[5]);
updated++;
} else {
d.tests.push({
id: LAB.uid(), name: name, category: cells[1] || 'عام', price: price,
sample: cells[3] || 'دم', hours: parseFloat(cells[4]) || 3,
fasting: /نعم|yes|1|true/i.test(cells[5] || ''), active: true, homeExtra: 0
});
added++;
}
});
LAB.save();
$('#csvInfo').innerHTML = '<b style="color:var(--green)">✔ تم: ' + added + ' إضافة — ' + updated + ' تحديث</b>';
LAB.log('استيراد تحاليل من CSV: ' + added + ' جديد، ' + updated + ' تحديث');
setTimeout(function () { Admin.refresh(); }, 900);
};
fr.readAsText(f, 'utf-8');
};
}
}),
LAB.el('button', {
class: 'btn btn-ghost btn-sm', html: ' تعديل جماعي للأسعار %', onclick: function () {
LAB.modal({
title: 'تعديل جماعي للأسعار', html: '<div class="field"><label>النسبة % (مثال 10 لزيادة أو -10 لنقص)</label><input class="input" type="number" id="pc"></div>' +
'<div class="field"><label>التصنيف (اتركه فارغاً للكل)</label><select class="select" id="pcat"><option value="">كل التصنيفات</option>' + uniqueCats().map(function (c) { return '<option>' + LAB.escapeHtml(c) + '</option>'; }).join('') + '</select></div>',
buttons: [{
text: 'تطبيق', cls: 'btn-primary', action: function (b, close) {
var p = Number(b.querySelector('#pc').value) || 0, cat = b.querySelector('#pcat').value;
d.tests.forEach(function (t) { if (!cat || t.category === cat) t.price = Math.max(1, Math.round(t.price * (1 + p / 100))); });
LAB.save(); close(); Admin.refresh(); LAB.toast('تم', 'تم تحديث الأسعار', 'ok');
}
}, { text: 'إلغاء' }]
});
}
})
];
},
row: function (t) {
return [
'<b>' + LAB.escapeHtml(t.name) + '</b>',
LAB.escapeHtml(t.category),
'<b>' + LAB.money(t.price) + ' ج</b>' + (t.homeExtra ? '<div class="small">+ منزلي ' + t.homeExtra + '</div>' : ''),
LAB.escapeHtml(t.sample || 'دم'),
t.hours >= 24 ? (t.hours / 24) + ' يوم' : t.hours + ' ساعة',
t.fasting ? '<span class="badge b-wait"> صيام</span>' : '<span class="badge b-gray">لا</span>',
t.active ? '<span class="badge b-done">مفعل</span>' : '<span class="badge b-cancel">موقف</span>'
];
},
form: function (t, done) {
var isNew = !t;
t = t || { id: LAB.uid(), name: '', category: '', price: 100, sample: 'دم', hours: 3, fasting: false, homeExtra: 0, active: true };
LAB.modal({
title: isNew ? 'إضافة تحليل' : 'تعديل: ' + t.name,
html: '<div class="field"><label>اسم التحليل</label><input class="input" id="tn" value="' + LAB.escapeHtml(t.name) + '"></div>' +
'<div class="field-row"><div class="field"><label>التصنيف</label><input class="input" id="tc" list="catList" value="' + LAB.escapeHtml(t.category) + '"><datalist id="catList">' + uniqueCats().map(function (c) { return '<option value="' + LAB.escapeHtml(c) + '">'; }).join('') + '</datalist></div>' +
'<div class="field"><label>السعر (ج)</label><input class="input" type="number" id="tp" value="' + t.price + '"></div></div>' +
'<div class="field-row"><div class="field"><label>نوع العينة</label><select class="select" id="ts">' + ['دم', 'بول', 'براز', 'مسحة', 'سائل منوي', 'تنفس', 'أخرى'].map(function (x) { return '<option' + (t.sample === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
'<div class="field"><label>مدة النتيجة (ساعة)</label><input class="input" type="number" id="th" value="' + t.hours + '"></div></div>' +
'<div class="field-row"><div class="field"><label>رسوم إضافية للسحب المنزلي (ج)</label><input class="input" type="number" id="tx" value="' + (t.homeExtra || 0) + '"></div>' +
'<div class="field"><label>الحالة</label><select class="select" id="ta"><option value="1"' + (t.active ? ' selected' : '') + '>مفعل</option><option value="0"' + (!t.active ? ' selected' : '') + '>موقف</option></select></div></div>' +
'<label class="switch"><input type="checkbox" id="tf"' + (t.fasting ? ' checked' : '') + '><span class="track"></span><span>يحتاج صيام 8-12 ساعة</span></label>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
t.name = b.querySelector('#tn').value.trim();
if (!t.name) { LAB.toast('مطلوب', 'اسم التحليل', 'warn'); return; }
t.category = b.querySelector('#tc').value.trim() || 'عام';
t.price = Number(b.querySelector('#tp').value) || 0;
t.sample = b.querySelector('#ts').value;
t.hours = Number(b.querySelector('#th').value) || 3;
t.homeExtra = Number(b.querySelector('#tx').value) || 0;
t.active = b.querySelector('#ta').value === '1';
t.fasting = b.querySelector('#tf').checked;
if (isNew) d.tests.push(t);
LAB.log((isNew ? 'إضافة تحليل: ' : 'تعديل تحليل: ') + t.name);
close(); done();
}
}, { text: 'إلغاء' }]
});
}
});
function uniqueCats() {
var c = []; d.tests.forEach(function (t) { if (c.indexOf(t.category) < 0) c.push(t.category); }); return c.sort();
}
/* ===================== الباقات ===================== */
crudView({
key: 'packages', title: ' باقات التحاليل', sub: 'باقات مخفضة تظهر للمرضى في الموقع',
cols: ['الباقة', 'الوصف', 'عدد التحاليل', 'السعر', 'السعر الأصلي', 'التوفير', 'الحالة', 'إجراءات'],
toggle: true,
row: function (p) {
var sum = 0; p.tests.forEach(function (n) { var t = d.tests.filter(function (x) { return x.name === n; })[0]; if (t) sum += t.price; });
return ['<b>' + LAB.escapeHtml(p.name) + '</b>', '<span class="small">' + LAB.escapeHtml(p.desc || '') + '</span>', p.tests.length,
'<b style="color:var(--teal)">' + LAB.money(p.price) + ' ج</b>', LAB.money(sum) + ' ج',
'<b style="color:var(--green)">' + LAB.money(Math.max(0, sum - p.price)) + ' ج</b>',
p.active ? '<span class="badge b-done">مفعل</span>' : '<span class="badge b-cancel">موقف</span>'];
},
form: function (p, done) {
var isNew = !p;
p = p || { id: LAB.uid(), name: '', desc: '', tests: [], price: 0, active: true };
var html = '<div class="field"><label>اسم الباقة</label><input class="input" id="pn" value="' + LAB.escapeHtml(p.name) + '"></div>' +
'<div class="field"><label>وصف مختصر</label><input class="input" id="pd" value="' + LAB.escapeHtml(p.desc || '') + '"></div>' +
'<div class="field"><label>سعر الباقة (ج)</label><input class="input" type="number" id="pp" value="' + p.price + '"></div>' +
'<div class="field"><label>اختر التحاليل</label><input class="input" id="psearch" placeholder=" ابحث واضغط للإضافة"><div id="pres" style="max-height:180px;overflow:auto;margin-top:8px"></div>' +
'<div class="chips mt-2" id="psel"></div></div>';
var m = LAB.modal({
title: isNew ? 'إضافة باقة' : 'تعديل: ' + p.name, html: html, wide: true,
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
p.name = b.querySelector('#pn').value.trim();
if (!p.name) { LAB.toast('مطلوب', 'اسم الباقة', 'warn'); return; }
p.desc = b.querySelector('#pd').value; p.price = Number(b.querySelector('#pp').value) || 0;
if (isNew) d.packages.push(p);
LAB.save(); close(); done();
}
}, { text: 'إلغاء' }]
});
function sel() {
var w = m.body.querySelector('#psel'); w.innerHTML = '';
p.tests.forEach(function (n) {
w.appendChild(LAB.el('span', { class: 'chip', style: 'background:var(--teal);color:#fff;border-color:var(--teal)' }, [
document.createTextNode(n + ' '),
LAB.el('b', { style: 'cursor:pointer', html: '×', onclick: function () { p.tests = p.tests.filter(function (x) { return x !== n; }); sel(); } })
]));
});
}
m.body.querySelector('#psearch').addEventListener('input', function () {
var q = this.value.trim().toLowerCase(), r = m.body.querySelector('#pres'); r.innerHTML = '';
if (q.length < 2) return;
d.tests.filter(function (t) { return t.active && t.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 12).forEach(function (t) {
r.appendChild(LAB.el('div', { class: 'file-chip', style: 'cursor:pointer', onclick: function () { if (p.tests.indexOf(t.name) < 0) { p.tests.push(t.name); sel(); } } }, [
LAB.el('b', { style: 'font-size:13px', html: LAB.escapeHtml(t.name) }), LAB.el('span', { class: 'small', style: 'margin-inline-start:auto', html: t.price + ' ج' })
]));
});
});
sel();
}
});
/* ===================== الفروع ===================== */
Admin.views.branches = {
title: ' إدارة الفروع', sub: 'أضف أو عدّل أو أوقف أي فرع — التغيير يظهر فوراً في الموقع',
action: function () { return [LAB.el('button', { class: 'btn btn-primary btn-sm', html: ' فرع جديد', onclick: function () { branchForm(null); } })]; },
render: function (w) {
var grid = LAB.el('div', { class: 'grid g2' });
d.branches.forEach(function (b) {
var cnt = d.bookings.filter(function (x) { return x.branchId === b.id; }).length;
grid.appendChild(LAB.el('div', { class: 'card', style: 'padding:22px' }, [
LAB.el('div', { class: 'row-between' }, [LAB.el('h4', { html: ' ' + LAB.escapeHtml(b.name) }), LAB.el('span', { class: 'badge ' + (b.active ? 'b-done' : 'b-cancel'), html: b.active ? 'مفعل' : 'موقف' })]),
LAB.el('div', { class: 'small mt-1', html: ' ' + LAB.escapeHtml(b.address) }),
LAB.el('div', { class: 'small', html: ' <span dir="ltr">' + LAB.escapeHtml(b.phone) + '</span>' }),
LAB.el('div', { class: 'small', html: ' ' + LAB.escapeHtml(b.hours) }),
LAB.el('div', { class: 'small', html: ' عدد الحجوزات: <b>' + cnt + '</b>' }),
LAB.el('div', { class: 'row mt-2' }, [
btn(' تعديل', 'btn-outline', function () { branchForm(b); }),
btn(b.active ? ' إيقاف' : '▶ تشغيل', 'btn-ghost', function () { b.active = !b.active; LAB.save(); Admin.refresh(); }),
btn(' حذف', 'btn-danger', function () {
LAB.confirm('حذف الفرع', 'حذف "' + b.name + '"؟ الحجوزات السابقة لن تتأثر.', function () {
d.branches = d.branches.filter(function (x) { return x.id !== b.id; }); LAB.save(); LAB.log('حذف فرع: ' + b.name); Admin.refresh();
}, 'احذف');
})
])
]));
});
w.appendChild(grid);
}
};
function branchForm(b) {
var isNew = !b;
b = b || { id: LAB.uid(), name: '', address: '', phone: s.phones[0], hours: 'يومياً 8ص - 11م', active: true, lat: '', lng: '' };
LAB.modal({
title: isNew ? 'إضافة فرع' : 'تعديل: ' + b.name,
html: '<div class="field"><label>اسم الفرع</label><input class="input" id="bn" value="' + LAB.escapeHtml(b.name) + '"></div>' +
'<div class="field"><label>العنوان</label><input class="input" id="ba" value="' + LAB.escapeHtml(b.address) + '"></div>' +
'<div class="field-row"><div class="field"><label>الهاتف</label><input class="input" id="bp" value="' + LAB.escapeHtml(b.phone) + '" dir="ltr"></div>' +
'<div class="field"><label>مواعيد العمل</label><input class="input" id="bh" value="' + LAB.escapeHtml(b.hours) + '"></div></div>' +
'<div class="field"><label>الحالة</label><select class="select" id="bs"><option value="1"' + (b.active ? ' selected' : '') + '>مفعل</option><option value="0"' + (!b.active ? ' selected' : '') + '>موقف</option></select></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (x, close) {
b.name = x.querySelector('#bn').value.trim(); if (!b.name) { LAB.toast('مطلوب', 'اسم الفرع', 'warn'); return; }
b.address = x.querySelector('#ba').value; b.phone = x.querySelector('#bp').value;
b.hours = x.querySelector('#bh').value; b.active = x.querySelector('#bs').value === '1';
if (isNew) d.branches.push(b);
LAB.save(); LAB.log((isNew ? 'إضافة فرع: ' : 'تعديل فرع: ') + b.name); close(); Admin.refresh();
}
}, { text: 'إلغاء' }]
});
}
/* ===================== الأطباء ===================== */
Admin.views.doctors = {
title: ' الأطباء والصلاحيات', sub: 'أضف دكتور بصلاحياته وكلمة مروره وتسعيرة الكشف المنزلي لكل منطقة',
action: function () { return [LAB.el('button', { class: 'btn btn-primary btn-sm', html: ' دكتور جديد', onclick: function () { doctorForm(null); } })]; },
render: function (w) {
var grid = LAB.el('div', { class: 'grid g2' });
d.doctors.forEach(function (doc) {
var bs = d.bookings.filter(function (b) { return b.doctorId === doc.id; });
var earn = bs.filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (a, b) { return a + b.total * (doc.commission || 0) / 100; }, 0);
grid.appendChild(LAB.el('div', { class: 'card', style: 'padding:22px' }, [
LAB.el('div', { class: 'row', style: 'gap:14px' }, [
doc.avatar ? LAB.el('img', { src: doc.avatar, style: 'width:60px;height:60px;border-radius:50%;object-fit:cover;object-position:top' })
: LAB.el('div', { style: 'width:60px;height:60px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:22px;font-weight:900', html: doc.name.replace('د. ', '').charAt(0) }),
LAB.el('div', {}, [
LAB.el('h4', { html: LAB.escapeHtml(doc.name) }),
LAB.el('div', { class: 'small', style: 'color:var(--teal);font-weight:800', html: LAB.escapeHtml(doc.title) }),
LAB.el('div', { class: 'small', html: ' ' + LAB.escapeHtml(doc.specialty || '—') })
])
]),
LAB.el('div', { class: 'small mt-2', html: ' المستخدم: <b dir="ltr">' + LAB.escapeHtml(doc.username || '—') + '</b> — <span dir="ltr">' + LAB.escapeHtml(doc.password || '') + '</span>' }),
LAB.el('div', { class: 'small', html: ' الصلاحية: <b>' + (doc.role === 'owner' ? 'مدير عام' : 'طبيب') + '</b> — النسبة: <b>' + (doc.commission || 0) + '%</b>' }),
LAB.el('div', { class: 'small', html: ' حجوزات: <b>' + bs.length + '</b> — مستحقات: <b style="color:var(--green)">' + LAB.money(earn) + ' ج</b>' }),
LAB.el('div', { class: 'small', html: ' تسعيرات منزلية مخصصة: <b>' + Object.keys(doc.homePrices || {}).filter(function (k) { return doc.homePrices[k] !== ''; }).length + '</b> منطقة' }),
LAB.el('div', { class: 'row mt-2' }, [
btn(LAB.icon('edit', 15) + ' تعديل البيانات', 'btn-outline', function () { doctorForm(doc); }),
btn(LAB.icon('home', 15) + ' أسعار الكشف المنزلي', 'btn-ghost', function () { homePricesModal(doc); }),
btn(LAB.icon(doc.active ? 'eye' : 'check', 15) + (doc.active ? ' إيقاف' : ' تشغيل'), 'btn-ghost', function () { doc.active = !doc.active; LAB.save(); Admin.refresh(); }),
btn(LAB.icon('trash', 15) + ' حذف', 'btn-danger', function () {
var me = LAB.currentUser();
if (me && me.id === doc.id) { LAB.toast('غير مسموح', 'لا يمكن حذف الحساب الذي تستخدمه الآن', 'warn'); return; }
LAB.confirm('حذف نهائي', 'سيتم حذف ' + doc.name + ' وكل بياناته نهائياً ولا يمكن التراجع.', function () {
d.doctors = d.doctors.filter(function (x) { return x.id !== doc.id; });
d.bookings.forEach(function (b) { if (b.doctorId === doc.id) { b.doctorId = ''; b.doctor = ''; } });
LAB.save(); LAB.log('حذف طبيب: ' + doc.name, 'danger'); Admin.refresh();
}, 'احذف نهائياً');
})
])
]));
});
w.appendChild(grid);
}
};
function doctorForm(doc) {
var isNew = !doc;
doc = doc || { id: LAB.uid(), name: '', title: '', specialty: '', phone: '', username: '', password: '', role: 'doctor', commission: 15, active: true, homePrices: {}, avatar: '', bio: '' };
LAB.modal({
title: isNew ? 'إضافة طبيب' : 'تعديل: ' + doc.name, wide: true,
html: '<div class="field-row"><div class="field"><label>الاسم</label><input class="input" id="dn" value="' + LAB.escapeHtml(doc.name) + '"></div>' +
'<div class="field"><label>اللقب العلمي</label><input class="input" id="dt" value="' + LAB.escapeHtml(doc.title || '') + '" placeholder="أخصائي باثولوجيا إكلينيكية"></div></div>' +
'<div class="field-row"><div class="field"><label>التخصص</label><input class="input" id="ds" value="' + LAB.escapeHtml(doc.specialty || '') + '"></div>' +
'<div class="field"><label>الهاتف</label><input class="input" id="dp" value="' + LAB.escapeHtml(doc.phone || '') + '" dir="ltr"></div></div>' +
'<div class="divider"></div><h4>بيانات الدخول</h4>' +
'<div class="field-row"><div class="field"><label>اسم المستخدم</label><input class="input" id="du" value="' + LAB.escapeHtml(doc.username || '') + '" dir="ltr"></div>' +
'<div class="field"><label>كلمة المرور</label><input class="input" id="dw" value="' + LAB.escapeHtml(doc.password || '') + '" dir="ltr"></div></div>' +
'<div class="field-row"><div class="field"><label>الصلاحية</label><select class="select" id="dr"><option value="doctor"' + (doc.role === 'doctor' ? ' selected' : '') + '>طبيب</option><option value="owner"' + (doc.role === 'owner' ? ' selected' : '') + '>مدير عام (دخول لوحة التحكم)</option></select></div>' +
'<div class="field"><label>نسبة الطبيب %</label><input class="input" type="number" id="dc" value="' + (doc.commission || 0) + '"></div></div>' +
'<div class="field"><label>الصورة الشخصية</label><div class="dropzone" id="dimg"><span class="ic"></span><b>اضغط لرفع صورة</b></div><div class="preview-grid" id="dprev"></div></div>' +
'<div class="field"><label>نبذة</label><textarea class="textarea" id="dbio">' + LAB.escapeHtml(doc.bio || '') + '</textarea></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
doc.name = b.querySelector('#dn').value.trim();
if (!doc.name) { LAB.toast('مطلوب', 'اسم الطبيب', 'warn'); return; }
doc.title = b.querySelector('#dt').value; doc.specialty = b.querySelector('#ds').value; doc.phone = b.querySelector('#dp').value;
doc.username = b.querySelector('#du').value.trim(); doc.password = b.querySelector('#dw').value;
doc.role = b.querySelector('#dr').value; doc.commission = Number(b.querySelector('#dc').value) || 0;
doc.bio = b.querySelector('#dbio').value;
if (isNew) d.doctors.push(doc);
LAB.save(); LAB.log((isNew ? 'إضافة طبيب: ' : 'تعديل طبيب: ') + doc.name); close(); Admin.refresh();
}
}, { text: 'إلغاء' }]
});
var zone = $('#dimg'), pv = $('#dprev');
if (doc.avatar) pv.innerHTML = '<div class="thumb"><img src="' + doc.avatar + '"></div>';
var inp = LAB.el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
var f = this.files[0]; if (!f) return;
LAB.fileToDataURL(f, 400, .8, function (u) { doc.avatar = u; pv.innerHTML = '<div class="thumb"><img src="' + u + '"></div>'; });
};
}
function homePricesModal(doc) {
var html = '<p class="small mb-2">حدد سعر الكشف/السحب المنزلي الخاص بـ <b>' + LAB.escapeHtml(doc.name) + '</b> لكل منطقة. اترك الخانة فارغة لاستخدام السعر الافتراضي للمعمل.</p>' +
'<div class="table-wrap"><table><thead><tr><th>المنطقة</th><th>السعر الافتراضي</th><th>سعر الطبيب (ج)</th></tr></thead><tbody>' +
d.areas.map(function (a) {
return '<tr><td>' + LAB.escapeHtml(a.name) + '</td><td>' + a.fee + ' ج</td>' +
'<td><input class="input" data-a="' + a.id + '" type="number" placeholder="' + a.fee + '" value="' + ((doc.homePrices || {})[a.id] != null ? (doc.homePrices || {})[a.id] : '') + '"></td></tr>';
}).join('') + '</tbody></table></div>';
LAB.modal({
title: ' تسعيرة الكشف المنزلي — ' + doc.name, html: html, wide: true,
buttons: [{
text: 'حفظ التسعيرات', cls: 'btn-primary', action: function (b, close) {
doc.homePrices = doc.homePrices || {};
LAB.$$('[data-a]', b).forEach(function (i) {
if (i.value === '') delete doc.homePrices[i.dataset.a];
else doc.homePrices[i.dataset.a] = Number(i.value) || 0;
});
LAB.save(); close(); LAB.toast('تم', 'تم حفظ تسعيرات الكشف المنزلي', 'ok'); Admin.refresh();
}
}, { text: 'إلغاء' }]
});
}
/* ===================== المناطق ===================== */
crudView({
key: 'areas', title: ' المناطق ورسوم السحب', sub: 'حدد رسوم السحب المنزلي لكل منطقة — تُحسب تلقائياً في الحجز',
cols: ['المنطقة', 'رسوم السحب', 'عدد الطلبات', 'الحالة', 'إجراءات'],
toggle: true,
row: function (a) {
return ['<b>' + LAB.escapeHtml(a.name) + '</b>', '<b>' + LAB.money(a.fee) + ' ج</b>', d.bookings.filter(function (b) { return b.areaId === a.id; }).length,
a.active ? '<span class="badge b-done">مفعل</span>' : '<span class="badge b-cancel">موقف</span>'];
},
form: function (a, done) {
var isNew = !a;
a = a || { id: LAB.uid(), name: '', fee: 50, active: true };
LAB.modal({
title: isNew ? 'إضافة منطقة' : 'تعديل: ' + a.name,
html: '<div class="field"><label>اسم المنطقة</label><input class="input" id="an" value="' + LAB.escapeHtml(a.name) + '"></div>' +
'<div class="field"><label>رسوم السحب (ج)</label><input class="input" type="number" id="af" value="' + a.fee + '"></div>' +
'<div class="field"><label>الحالة</label><select class="select" id="aa"><option value="1"' + (a.active ? ' selected' : '') + '>مفعل</option><option value="0"' + (!a.active ? ' selected' : '') + '>موقف</option></select></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
a.name = b.querySelector('#an').value.trim(); if (!a.name) { LAB.toast('مطلوب', 'اسم المنطقة', 'warn'); return; }
a.fee = Number(b.querySelector('#af').value) || 0; a.active = b.querySelector('#aa').value === '1';
if (isNew) d.areas.push(a);
LAB.save(); close(); done();
}
}, { text: 'إلغاء' }]
});
}
});
/* ===================== العروض والأكواد ===================== */
Admin.views.offers = {
title: ' العروض وأكواد الخصم',
sub: 'تحكم في السلايدر الرئيسي وأكواد الخصم',
render: function (w) {
/* العروض */
w.appendChild(LAB.el('div', { class: 'row-between mb-2' }, [
LAB.el('h4', { html: 'العروض (سلايدر الرئيسية)' }),
LAB.el('button', { class: 'btn btn-primary btn-sm', html: ' عرض جديد', onclick: function () {
var o = { id: LAB.uid(), title: '', sub: '', code: '', active: true, color: 'a' };
LAB.modal({
title: 'عرض جديد', html: '<div class="field"><label>العنوان</label><input class="input" id="ot"></div>' +
'<div class="field"><label>الوصف</label><input class="input" id="os"></div>' +
'<div class="field"><label>كود العرض</label><input class="input" id="oc"></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
o.title = b.querySelector('#ot').value; o.sub = b.querySelector('#os').value; o.code = b.querySelector('#oc').value;
d.offers.push(o); LAB.save(); close(); Admin.refresh();
}
}, { text: 'إلغاء' }]
});
} })
]));
var og = LAB.el('div', { class: 'grid g3 mb-4' });
d.offers.forEach(function (o) {
og.appendChild(LAB.el('div', { class: 'card', style: 'padding:18px' }, [
LAB.el('div', { class: 'row-between' }, [LAB.el('b', { html: LAB.escapeHtml(o.title) }), LAB.el('span', { class: 'badge ' + (o.active ? 'b-done' : 'b-cancel'), html: o.active ? 'مفعل' : 'موقف' })]),
LAB.el('div', { class: 'small mt-1', html: LAB.escapeHtml(o.sub) }),
LAB.el('div', { class: 'small mt-1', html: 'الكود: <b dir="ltr">' + LAB.escapeHtml(o.code) + '</b>' }),
LAB.el('div', { class: 'row mt-2' }, [
btn(LAB.icon('edit', 14) + ' تعديل', 'btn-outline', function () {
LAB.modal({
title: 'تعديل العرض', html: '<div class="field"><label>العنوان</label><input class="input" id="ot" value="' + LAB.escapeHtml(o.title) + '"></div>' +
'<div class="field"><label>الوصف</label><input class="input" id="os" value="' + LAB.escapeHtml(o.sub) + '"></div>' +
'<div class="field"><label>الكود</label><input class="input" id="oc" value="' + LAB.escapeHtml(o.code) + '"></div>',
buttons: [{ text: 'حفظ', cls: 'btn-primary', action: function (b, close) { o.title = b.querySelector('#ot').value; o.sub = b.querySelector('#os').value; o.code = b.querySelector('#oc').value; LAB.save(); close(); Admin.refresh(); } }, { text: 'إلغاء' }]
});
}),
btn(o.active ? LAB.icon('eye', 14) + ' إيقاف' : LAB.icon('check', 14) + ' تشغيل', 'btn-ghost', function () { o.active = !o.active; LAB.save(); Admin.refresh(); }),
btn(LAB.icon('trash', 14) + ' حذف', 'btn-danger', function () {
LAB.confirm('حذف العرض', 'حذف "' + LAB.escapeHtml(o.title) + '"؟', function () {
d.offers = d.offers.filter(function (x) { return x.id !== o.id; }); LAB.save(); LAB.log('حذف عرض: ' + o.title); Admin.refresh();
}, 'احذف');
})
])
]));
});
w.appendChild(og);
/* الكوبونات */
w.appendChild(LAB.el('div', { class: 'row-between mb-2' }, [
LAB.el('h4', { html: 'أكواد الخصم' }),
LAB.el('button', { class: 'btn btn-primary btn-sm', html: ' كود جديد', onclick: function () {
var c = { id: LAB.uid(), code: '', type: 'percent', value: 10, max: 50, used: 0, active: true };
couponForm(c, true);
} })
]));
var rows = d.coupons.map(function (c) {
return ADM.row(['<b dir="ltr">' + LAB.escapeHtml(c.code) + '</b>',
c.type === 'percent' ? c.value + '%' : LAB.money(c.value) + ' ج',
c.used + ' / ' + (c.max || '∞'),
c.active ? '<span class="badge b-done">مفعل</span>' : '<span class="badge b-cancel">موقف</span>',
'<div class="tbl-actions"><button class="btn btn-sm btn-outline" data-c="' + c.id + '">تعديل</button>' +
'<button class="btn btn-sm btn-danger" data-dc="' + c.id + '">حذف</button></div>']);
});
var box = LAB.el('div', { html: ADM.tbl(['الكود', 'قيمة الخصم', 'الاستخدام', 'الحالة', 'إجراءات'], rows, 'لا توجد أكواد') });
w.appendChild(box);
LAB.$$('[data-c]', box).forEach(function (b) { b.onclick = function () { couponForm(d.coupons.filter(function (x) { return x.id === b.dataset.c; })[0], false); }; });
LAB.$$('[data-dc]', box).forEach(function (b) {
b.onclick = function () { d.coupons = d.coupons.filter(function (x) { return x.id !== b.dataset.dc; }); LAB.save(); Admin.refresh(); };
});
}
};
function couponForm(c, isNew) {
LAB.modal({
title: isNew ? 'كود خصم جديد' : 'تعديل الكود',
html: '<div class="field"><label>الكود</label><input class="input" id="cc" value="' + LAB.escapeHtml(c.code) + '" dir="ltr" style="text-transform:uppercase"></div>' +
'<div class="field-row"><div class="field"><label>النوع</label><select class="select" id="ct"><option value="percent"' + (c.type === 'percent' ? ' selected' : '') + '>نسبة مئوية %</option><option value="flat"' + (c.type === 'flat' ? ' selected' : '') + '>مبلغ ثابت</option></select></div>' +
'<div class="field"><label>القيمة</label><input class="input" type="number" id="cv" value="' + c.value + '"></div></div>' +
'<div class="field"><label>أقصى عدد استخدامات</label><input class="input" type="number" id="cm" value="' + (c.max || 0) + '"></div>' +
'<div class="field"><label>الحالة</label><select class="select" id="ca"><option value="1"' + (c.active ? ' selected' : '') + '>مفعل</option><option value="0"' + (!c.active ? ' selected' : '') + '>موقف</option></select></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
c.code = String(b.querySelector('#cc').value || '').trim().toUpperCase();
if (!c.code) { LAB.toast('مطلوب', 'الكود', 'warn'); return; }
c.type = b.querySelector('#ct').value; c.value = Number(b.querySelector('#cv').value) || 0;
c.max = Number(b.querySelector('#cm').value) || 0; c.active = b.querySelector('#ca').value === '1';
if (isNew) d.coupons.push(c);
LAB.save(); close(); Admin.refresh();
}
}, { text: 'إلغاء' }]
});
}
/* ===================== المحتوى ===================== */
Admin.views.content = {
title: ' المحتوى والآراء', sub: 'آراء المرضى، الأسئلة الشائعة، ونصوص الصفحة الرئيسية',
render: function (w) {
var tabs = LAB.el('div', { class: 'tabs' }, [
LAB.el('button', { class: 'tab active', html: ' آراء المرضى', onclick: function () { sw(0); } }),
LAB.el('button', { class: 'tab', html: ' الأسئلة الشائعة', onclick: function () { sw(1); } }),
LAB.el('button', { class: 'tab', html: ' نصوص الصفحة الرئيسية', onclick: function () { sw(2); } })
]);
w.appendChild(tabs);
var p0 = LAB.el('div', { class: 'mt-3' }), p1 = LAB.el('div', { class: 'mt-3 hide' }), p2 = LAB.el('div', { class: 'mt-3 hide' });
w.appendChild(p0); w.appendChild(p1); w.appendChild(p2);
function sw(i) {
LAB.$$('.tab', tabs).forEach(function (t, k) { t.classList.toggle('active', k === i); });
[p0, p1, p2].forEach(function (p, k) { p.classList.toggle('hide', k !== i); });
}
/* الآراء */
var rows = d.reviews.slice().sort(function (a, b) { return (a.active === b.active ? 0 : a.active ? -1 : 1); }).map(function (r) {
return ADM.row(['<b>' + LAB.escapeHtml(r.name) + '</b><div class="small">' + LAB.escapeHtml(r.area || '') + '</div>',
'<span class="stars">' + LAB.stars(r.rate, 14) + '</span>',
'<span class="small">' + LAB.escapeHtml(r.text.slice(0, 70)) + '…</span>',
LAB.fmtDate(r.date || r.createdAt),
r.active ? '<span class="badge b-done">منشور</span>' : '<span class="badge b-wait">بانتظار الموافقة</span>',
'<div class="tbl-actions">' +
'<button class="btn btn-sm ' + (r.active ? 'btn-ghost' : 'btn-success') + '" data-ap="' + r.id + '">' + (r.active ? 'إخفاء' : 'نشر') + '</button>' +
'<button class="btn btn-sm btn-danger" data-dr="' + r.id + '">حذف</button></div>']);
});
p0.innerHTML = ADM.tbl(['الاسم', 'التقييم', 'الرأي', 'التاريخ', 'الحالة', 'إجراءات'], rows, 'لا توجد آراء');
LAB.$$('[data-ap]', p0).forEach(function (b) { b.onclick = function () { var r = d.reviews.filter(function (x) { return x.id === b.dataset.ap; })[0]; r.active = !r.active; LAB.save(); Admin.refresh(); }; });
LAB.$$('[data-dr]', p0).forEach(function (b) { b.onclick = function () { d.reviews = d.reviews.filter(function (x) { return x.id !== b.dataset.dr; }); LAB.save(); Admin.refresh(); }; });
p0.appendChild(LAB.el('button', {
class: 'btn btn-outline btn-sm mt-2', html: ' إضافة رأي يدوياً', onclick: function () {
LAB.modal({
title: 'رأي جديد', html: '<div class="field"><label>الاسم</label><input class="input" id="rn"></div>' +
'<div class="field"><label>المنطقة</label><input class="input" id="ra"></div>' +
'<div class="field"><label>التقييم</label><select class="select" id="rr"><option value="5">5</option><option value="4">4</option><option value="3">3</option></select></div>' +
'<div class="field"><label>النص</label><textarea class="textarea" id="rt"></textarea></div>',
buttons: [{
text: 'حفظ', cls: 'btn-primary', action: function (b, close) {
d.reviews.unshift({ id: LAB.uid(), name: b.querySelector('#rn').value, area: b.querySelector('#ra').value, rate: +b.querySelector('#rr').value, text: b.querySelector('#rt').value, active: true, date: new Date().toISOString() });
LAB.save(); close(); Admin.refresh();
}
}, { text: 'إلغاء' }]
});
}
}));
/* الأسئلة */
var frows = d.faqs.map(function (f, i) {
return ADM.row([String(i + 1), '<b>' + LAB.escapeHtml(f.q) + '</b>', '<span class="small">' + LAB.escapeHtml(f.a.slice(0, 80)) + '…</span>',
'<div class="tbl-actions"><button class="btn btn-sm btn-outline" data-fe="' + i + '">تعديل</button><button class="btn btn-sm btn-danger" data-fd="' + i + '">حذف</button></div>']);
});
p1.innerHTML = ADM.tbl(['#', 'السؤال', 'الإجابة', 'إجراءات'], frows, 'لا توجد أسئلة');
LAB.$$('[data-fe]', p1).forEach(function (b) {
b.onclick = function () {
var f = d.faqs[+b.dataset.fe];
LAB.modal({
title: 'تعديل السؤال', html: '<div class="field"><label>السؤال</label><input class="input" id="fq" value="' + LAB.escapeHtml(f.q) + '"></div><div class="field"><label>الإجابة</label><textarea class="textarea" id="fa">' + LAB.escapeHtml(f.a) + '</textarea></div>',
buttons: [{ text: 'حفظ', cls: 'btn-primary', action: function (x, close) { f.q = x.querySelector('#fq').value; f.a = x.querySelector('#fa').value; LAB.save(); close(); Admin.refresh(); } }, { text: 'إلغاء' }]
});
};
});
LAB.$$('[data-fd]', p1).forEach(function (b) { b.onclick = function () { d.faqs.splice(+b.dataset.fd, 1); LAB.save(); Admin.refresh(); }; });
p1.appendChild(LAB.el('button', {
class: 'btn btn-outline btn-sm mt-2', html: ' سؤال جديد', onclick: function () {
LAB.modal({
title: 'سؤال جديد', html: '<div class="field"><label>السؤال</label><input class="input" id="fq"></div><div class="field"><label>الإجابة</label><textarea class="textarea" id="fa"></textarea></div>',
buttons: [{ text: 'حفظ', cls: 'btn-primary', action: function (x, close) { d.faqs.push({ q: x.querySelector('#fq').value, a: x.querySelector('#fa').value }); LAB.save(); close(); Admin.refresh(); } }, { text: 'إلغاء' }]
});
}
}));
/* نصوص الرئيسية */
p2.appendChild(LAB.el('div', { class: 'card', style: 'padding:22px;max-width:720px' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'عنوان الهيرو' }), LAB.el('input', { class: 'input', id: 'ht', value: s.heroTitle })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'النص التعريفي تحت العنوان' }), LAB.el('textarea', { class: 'textarea', id: 'hs', html: LAB.escapeHtml(s.heroSub) })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'نبذة عن المعمل' }), LAB.el('textarea', { class: 'textarea', id: 'hab', html: LAB.escapeHtml(s.about) })]),
LAB.el('button', {
class: 'btn btn-primary', html: ' حفظ النصوص', onclick: function () {
s.heroTitle = $('#ht').value; s.heroSub = $('#hs').value; s.about = $('#hab').value;
LAB.save(); LAB.toast('تم', 'تم تحديث نصوص الموقع', 'ok');
}
})
]));
}
};
/* ===================== الإعدادات ===================== */
Admin.views.settings = {
title: ' إعدادات المعمل',
sub: 'كل بيانات المعمل: الأرقام، انستا باي، المواعيد، والنسخ الاحتياطي',
render: function (w) {
var days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
var card = LAB.el('div', { class: 'card', style: 'padding:24px;max-width:860px' }, [
LAB.el('h4', { html: ' بيانات المعمل' }),
LAB.el('div', { class: 'field-row mt-2' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اسم المعمل' }), LAB.el('input', { class: 'input', id: 'sName', value: s.labName })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اسم مختصر' }), LAB.el('input', { class: 'input', id: 'sShort', value: s.labShort || '' })])
]),
LAB.el('div', { class: 'field-row' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اسم المدير/الدكتور' }), LAB.el('input', { class: 'input', id: 'sOwner', value: s.ownerName })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اللقب' }), LAB.el('input', { class: 'input', id: 'sTitle', value: s.ownerTitle })])
]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'نبذة عن الدكتور' }), LAB.el('textarea', { class: 'textarea', id: 'sBio', html: LAB.escapeHtml(s.ownerBio || '') })]),
LAB.el('div', { class: 'divider' }),
LAB.el('h4', { html: ' بيانات التواصل' }),
LAB.el('div', { class: 'field-row mt-2' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'أرقام التليفون (مفصولة بـ ,)' }), LAB.el('input', { class: 'input', id: 'sPhones', value: (s.phones || []).join(','), dir: 'ltr' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'واتساب (بالمقدمة الدولية)' }), LAB.el('input', { class: 'input', id: 'sWa', value: s.whatsapp, dir: 'ltr' })])
]),
LAB.el('div', { class: 'field-row' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'رقم انستا باي' }), LAB.el('input', { class: 'input', id: 'sIP', value: s.instapay, dir: 'ltr' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اسم حساب انستا باي' }), LAB.el('input', { class: 'input', id: 'sIPN', value: s.instapayName || '' })])
]),
LAB.el('div', { class: 'field-row' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'البريد الإلكتروني' }), LAB.el('input', { class: 'input', id: 'sMail', value: s.email })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'العنوان' }), LAB.el('input', { class: 'input', id: 'sAddr', value: s.address })])
]),
LAB.el('div', { class: 'divider' }),
LAB.el('h4', { html: ' المواعيد والحجز' }),
LAB.el('div', { class: 'field-row mt-2' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'من' }), LAB.el('input', { class: 'input', type: 'time', id: 'sFrom', value: s.workFrom })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'إلى' }), LAB.el('input', { class: 'input', type: 'time', id: 'sTo', value: s.workTo })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'مدة السlot (دقيقة)' }), LAB.el('input', { class: 'input', type: 'number', id: 'sSlot', value: s.slotMinutes })])
]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'أيام الأجازة' }),
LAB.el('div', { class: 'chips mt-1' }, days.map(function (n, i) {
return LAB.el('button', { class: 'chip' + ((s.closedDays || []).indexOf(i) >= 0 ? ' active' : ''), html: n, 'data-day': i, onclick: function () { this.classList.toggle('active'); } });
}))
]),
LAB.el('label', { class: 'switch mt-2' }, [LAB.el('input', { type: 'checkbox', id: 'sHome', checked: s.homeServiceEnabled ? true : null }), LAB.el('span', { class: 'track' }), LAB.el('span', { html: 'تفعيل خدمة السحب المنزلي' })]),
LAB.el('div', { class: 'field mt-2' }, [LAB.el('label', { html: 'رسوم السحب الأساسية (ج)' }), LAB.el('input', { class: 'input', type: 'number', id: 'sHomeFee', value: s.homeBaseFee || 0 })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'صورة الدكتور (تظهر في الرئيسية)' }),
LAB.el('div', { class: 'dropzone', id: 'sImg' }, [LAB.el('span', { class: 'ic', html: LAB.icon('upload', 22) }), LAB.el('b', { html: 'اضغط لرفع صورة' })]),
LAB.el('div', { class: 'preview-grid', id: 'sImgPrev' })]),
LAB.el('button', {
class: 'btn btn-primary mt-3', html: ' حفظ كل الإعدادات', onclick: function () {
s.labName = $('#sName').value; s.labShort = $('#sShort').value; s.ownerName = $('#sOwner').value; s.ownerTitle = $('#sTitle').value;
s.ownerBio = $('#sBio').value; s.phones = $('#sPhones').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
s.whatsapp = $('#sWa').value; s.instapay = $('#sIP').value; s.instapayName = $('#sIPN').value;
s.email = $('#sMail').value; s.address = $('#sAddr').value;
s.workFrom = $('#sFrom').value; s.workTo = $('#sTo').value; s.slotMinutes = Number($('#sSlot').value) || 30;
s.homeServiceEnabled = $('#sHome').checked; s.homeBaseFee = Number($('#sHomeFee').value) || 0;
var closed = [];
LAB.$$('[data-day]').forEach(function (c) { if (c.classList.contains('active')) closed.push(+c.dataset.day); });
s.closedDays = closed;
// مزامنة اسم المدير مع بيانات الطبيب المالك
var own = d.doctors.filter(function (x) { return x.role === 'owner'; })[0];
if (own) { own.name = s.ownerName; own.title = s.ownerTitle; }
LAB.save(); LAB.log('تحديث إعدادات المعمل');
LAB.toast('تم', 'تم حفظ الإعدادات بنجاح', 'ok');
}
}),
LAB.el('div', { class: 'divider' }),
LAB.el('h4', { html: ' النسخ الاحتياطي والاستعادة' }),
LAB.el('div', { class: 'row mt-2' }, [
LAB.el('button', { class: 'btn btn-outline', html: ' تصدير نسخة كاملة (JSON)', onclick: function () { LAB.exportDB(); } }),
LAB.el('button', { class: 'btn btn-outline', html: ' استيراد نسخة', onclick: function () {
var i = LAB.el('input', { type: 'file', accept: '.json' });
i.onchange = function () { LAB.importDB(this.files[0], function () { location.reload(); }); };
i.click();
} }),
LAB.el('button', { class: 'btn btn-danger', html: ' إعادة ضبط المصنع', onclick: function () {
LAB.confirm('إعادة الضبط', 'سيتم حذف كل البيانات (الحجوزات، المرضى، التحاليل) وإرجاع البيانات التجريبية. متأكد؟', function () {
LAB.resetDB(); location.reload();
}, 'نعم، امسح الكل');
} })
]),
LAB.el('div', { class: 'small mt-2', html: ' نصيحة: صدّر نسخة احتياطية أسبوعياً — كل البيانات مخزّنة في متصفحك على هذا الجهاز.' })
]);
w.appendChild(card);
/* كارت صيانة الموقع: مسح الكاش وتحديث النسخة */
w.appendChild(LAB.el('div', { class: 'card', style: 'padding:24px;max-width:860px;margin-top:18px' }, [
LAB.el('h4', { html: LAB.icon('bolt', 18) + ' تحديث الموقع ومسح الكاش' }),
LAB.el('p', { class: 'small', html: 'لو رفعت نسخة جديدة على Vercel والمتصفح لسه بيعرض نسخة قديمة (أو الأيقونات باينة ككود)، اضغط الزر تحت: هيمسح الكاش القديم ويحدّث الموقع فوراً.' }),
LAB.el('div', { class: 'row mt-2', style: 'flex-wrap:wrap;gap:8px' }, [
LAB.el('button', { class: 'btn btn-primary', html: LAB.icon('bolt', 16) + ' تحديث الموقع ومسح الكاش', onclick: function () {
LAB.clearSiteCache(function () { location.replace(location.pathname + '?clear=1'); });
} }),
LAB.el('button', { class: 'btn btn-outline', html: LAB.icon('sun', 16) + ' اجعل الوضع النهاري الافتراضي', onclick: function () {
try { localStorage.removeItem('theme'); } catch (e) { }
LAB.toast('تم', 'الوضع النهاري هو الافتراضي الآن', 'ok');
location.replace(location.pathname + '?theme=light&clear=1');
} })
]),
LAB.el('div', { class: 'small mt-2', html: ' تقدر كمان تفتح أي صفحة وتضيف <b dir="ltr">?clear=1</b> في آخر الرابط — هيعمل نفس الحاجة.' })
]));
if (LAB.cloud && LAB.cloud.settingsCard) w.appendChild(LAB.cloud.settingsCard());
if (LAB.securityCard) w.appendChild(LAB.securityCard());
// صورة الدكتور
var owner = d.doctors.filter(function (x) { return x.role === 'owner'; })[0];
var zone = $('#sImg');
if (owner && owner.avatar) $('#sImgPrev').innerHTML = '<div class="thumb"><img src="' + owner.avatar + '"></div>';
var inp = LAB.el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
var f = this.files[0]; if (!f) return;
LAB.fileToDataURL(f, 600, .8, function (u) {
if (owner) owner.avatar = u;
$('#sImgPrev').innerHTML = '<div class="thumb"><img src="' + u + '"></div>';
LAB.save();
});
};
}
};
/* ===================== مركز الرسائل ===================== */
var TPL = [
{ id: 'confirm', name: ' تأكيد حجز', text: 'السلام عليكم {name} \nمعكم معمل الحوشي للتحاليل \nتم تأكيد حجزك رقم {code}\n {date} الساعة {time}\n الإجمالي: {total} جنيه\n{fasting}لأي استفسار احنا معاكم ' },
{ id: 'remind', name: ' تذكير بمعاد', text: 'صباح الخير {name} \nبنذكرك بمعاد تحليلك بكرة {date} الساعة {time} في معمل الحوشي.\n{fasting}رقم الحجز: {code}\nلو عايز تغيّر المعاد كلمني ' },
{ id: 'ready', name: ' النتيجة جاهزة', text: 'السلام عليكم {name} \nنتيجة تحليلك جاهزة \nرقم الحجز: {code}\nهتلاقيها في حسابك على الموقع أو ابعتلنا وهنبعتها فوراً ' },
{ id: 'collect', name: ' تذكير تحصيل', text: 'مساء الخير {name} \nبنذكرك بسداد فاتورة حجزك رقم {code} بقيمة {total} جنيه.\nتقدر تحول على انستا باي: ' + s.instapay + '\nأو تدفع في المعمل. شكراً لتعاونك ' },
{ id: 'follow', name: ' متابعة بعد النتيجة', text: 'إزيك يا {name}؟ \nحبينا نطمن على نتيجة تحليلك رقم {code}.\nلو في أي استفسار عن النتيجة، الدكاترة معانا جاهزين في أي وقت ' }
];
Admin.views.msgs = {
title: ' مركز الرسائل الجاهزة',
sub: 'قوالب واتساب جاهزة تُعبأ تلقائياً ببيانات الحجز — اضغط إرسال وهيوصلك واتساب المريض',
render: function (w) {
var sel = LAB.el('select', { class: 'select', id: 'msgBk', style: 'width:auto;min-width:300px', html: '<option value="">— اختر حجزاً لتعبئة البيانات —</option>' +
d.bookings.slice(0, 200).map(function (b) { return '<option value="' + b.id + '">' + b.code + ' — ' + LAB.escapeHtml(b.patientName) + ' — ' + b.phone + '</option>'; }).join('')
});
var area = LAB.el('textarea', { class: 'textarea', id: 'msgText', style: 'min-height:170px' });
var info = LAB.el('div', { class: 'small mt-2', id: 'msgInfo' });
var chips = LAB.el('div', { class: 'chips mb-2' }, TPL.map(function (t) {
return LAB.el('button', { class: 'chip', html: t.name, onclick: function () { area.value = t.text; fill(); } });
}));
w.appendChild(LAB.el('div', { class: 'card', style: 'padding:24px;max-width:760px' }, [
LAB.el('div', { class: 'toolbar' }, [sel]),
chips, area, info,
LAB.el('div', { class: 'row mt-2' }, [
LAB.el('button', {
class: 'btn btn-success', html: ' إرسال واتساب', onclick: function () {
var b = d.bookings.filter(function (x) { return x.id === sel.value; })[0];
if (!b) { LAB.toast('مطلوب', 'اختر حجزاً أولاً', 'warn'); return; }
window.open('https://wa.me/' + String(b.whatsapp || b.phone).replace(/^0/, '2') + '?text=' + encodeURIComponent(area.value), '_blank');
LAB.log('إرسال رسالة واتساب لحجز ' + b.code);
}
}),
LAB.el('button', {
class: 'btn btn-outline', html: ' نسخ النص', onclick: function () { LAB.copyText(area.value); }
}),
LAB.el('button', {
class: 'btn btn-ghost', html: ' إرسال جماعي (كل حجوزات اليوم)', onclick: function () {
var today = LAB.dstr(new Date());
var list = d.bookings.filter(function (b) { return b.date === today && b.status !== 'cancelled'; });
if (!list.length) { LAB.toast('تنبيه', 'لا حجوزات اليوم', 'warn'); return; }
LAB.confirm('إرسال جماعي', 'سيفتح واتساب لكل مريض (' + list.length + ') تباعاً. المتصفح قد يمنع النوافذ المنبثقة.', function () {
list.forEach(function (b, i) {
setTimeout(function () {
var t = area.value.replace(/\{name\}/g, b.patientName).replace(/\{code\}/g, b.code)
.replace(/\{date\}/g, LAB.fmtDate(b.date)).replace(/\{time\}/g, b.time)
.replace(/\{total\}/g, b.total).replace(/\{fasting\}/g, fastingNote(b));
window.open('https://wa.me/' + String(b.whatsapp || b.phone).replace(/^0/, '2') + '?text=' + encodeURIComponent(t), '_blank');
}, i * 900);
});
LAB.log('إرسال جماعي لواتساب (' + list.length + ' مريض)');
}, 'ابدأ');
}
})
]),
LAB.el('p', { class: 'small mt-2', html: 'المتغيرات المتاحة: <b>{name}</b> اسم المريض — <b>{code}</b> رقم الحجز — <b>{date}</b> التاريخ — <b>{time}</b> الوقت — <b>{total}</b> الإجمالي — <b>{fasting}</b> تنبيه الصيام' })
]));
function fastingNote(b) {
var f = (b.tests || []).filter(function (n) { var t = d.tests.filter(function (x) { return x.name === n; })[0]; return t && t.fasting; });
return f.length ? ' تذكّر الصيام 8-12 ساعة قبل التحليل\n' : '';
}
function fill() {
var b = d.bookings.filter(function (x) { return x.id === sel.value; })[0];
if (!b) { info.innerHTML = 'اختر حجزاً لتعبئة المتغيرات تلقائياً'; return; }
area.value = area.value
.replace(/\{name\}/g, b.patientName).replace(/\{code\}/g, b.code)
.replace(/\{date\}/g, LAB.fmtDate(b.date)).replace(/\{time\}/g, b.time)
.replace(/\{total\}/g, b.total).replace(/\{fasting\}/g, fastingNote(b));
info.innerHTML = ' ' + LAB.escapeHtml(b.patientName) + ' — <span dir="ltr">' + b.phone + '</span> — <span dir="ltr">' + (b.whatsapp || b.phone) + '</span>';
}
sel.onchange = fill;
area.value = TPL[0].text;
}
};
/* ===================== QR وملصقات ===================== */
Admin.views.poster = {
title: ' رموز QR وملصقات المعمل',
sub: 'اطبع ملصقات للاستقبال والفروع — المريض يمسحها ويحجز أو يتابع نتيجته فوراً',
render: function (w) {
var cards = [
[' رابط الموقع', LAB.siteURL(), 'امسح الكود وادخل على موقع المعمل'],
[' واتساب المعمل', 'https://wa.me/' + s.whatsapp, 'تواصل مباشر مع المعمل'],
[' صفحة الحجز', LAB.siteURL() + 'booking.html', 'احجز تحليلك في دقيقتين'],
[' تتبع النتيجة', LAB.siteURL() + 'track.html', 'تابع حجزك ونتيجتك'],
[' ارفع الروشتة', LAB.siteURL() + 'prescription.html', 'صوّر روشتتك واعرف السعر'],
[' اتصال سريع', 'tel:' + s.phones[0], 'اتصل بالمعمل ' + s.phones[0]]
];
d.branches.filter(function (b) { return b.active; }).forEach(function (b) {
cards.push([' ' + b.name, LAB.siteURL() + 'booking.html?branch=' + b.id, b.address]);
});
var grid = LAB.el('div', { class: 'grid g3' });
cards.forEach(function (c) {
grid.appendChild(LAB.el('div', { class: 'card', style: 'padding:20px;text-align:center' }, [
LAB.el('b', { html: c[0] }),
LAB.el('div', { style: 'background:#fff;padding:10px;border-radius:14px;border:1px solid var(--line);margin:12px auto;width:max-content;line-height:0', html: LAB.qr(c[1], 150) }),
LAB.el('div', { class: 'small', html: LAB.escapeHtml(c[2]) }),
LAB.el('div', { class: 'row mt-2', style: 'justify-content:center' }, [
LAB.el('button', { class: 'btn btn-sm btn-outline', html: ' طباعة', onclick: function () { printPoster(c); } }),
LAB.el('button', { class: 'btn btn-sm btn-ghost', html: ' نسخ الرابط', onclick: function () { LAB.copyText(c[1]); } })
])
]));
});
w.appendChild(grid);
w.appendChild(LAB.el('div', { class: 'chart-card mt-3' }, [
LAB.el('h4', { html: ' بوستر دعائي كامل (A4)' }),
LAB.el('p', { class: 'small', html: 'بوستر جاهز للطباعة فيه بيانات المعمل + كود الحجز + كود الواتساب.' }),
LAB.el('button', {
class: 'btn btn-primary mt-2', html: ' طباعة البوستر', onclick: function () { printFullPoster(); }
})
]));
function printPoster(c) {
var win = window.open('', '_blank', 'width=520,height=680');
win.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>' + c[0] + '</title><style>' +
'body{font-family:Tahoma;text-align:center;padding:26px}h2{color:#0e7c86;margin:6px 0}p{color:#555;font-size:14px}' +
'.box{border:3px solid #0e7c86;border-radius:18px;padding:22px;margin-top:14px}</style></head><body>' +
'<div class="box"><h2>' + s.labName + '</h2><p>' + s.ownerName + ' — ' + s.ownerTitle + '</p>' +
'<div style="margin:14px 0">' + LAB.qr(c[1], 230) + '</div>' +
'<h3>' + c[0] + '</h3><p>' + c[2] + '</p><p><b>' + s.phones[0] + '</b></p></div>' +
'<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>');
win.document.close();
}
function printFullPoster() {
var win = window.open('', '_blank', 'width=800,height=1100');
var brs = d.branches.filter(function (b) { return b.active; }).map(function (b) {
return '<p><b>' + b.name + '</b> — ' + b.address + ' — ' + b.phone + '</p>';
}).join('');
win.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>بوستر ' + s.labName + '</title><style>' +
'body{font-family:Tahoma;text-align:center;padding:30px;background:#fff}h1{color:#0e7c86;font-size:30px;margin:0}' +
'.hero{background:linear-gradient(135deg,#06283d,#0e7c86);color:#fff;border-radius:22px;padding:26px;margin-bottom:20px}' +
'.cards{display:flex;justify-content:center;gap:26px;flex-wrap:wrap}.c{border:2px solid #0e7c86;border-radius:16px;padding:16px;width:210px}' +
'p{font-size:13px;color:#444}.big{font-size:15px;font-weight:800;color:#0e7c86}</style></head><body>' +
'<div class="hero"><h1>' + s.labName + '</h1><p style="color:#cfe4ef;font-size:16px">' + s.ownerName + ' — ' + s.ownerTitle + '</p>' +
'<p style="color:#cfe4ef"> ' + s.phones[0] + ' | انستا باي: ' + s.instapay + '</p></div>' +
'<div class="cards">' +
'<div class="c"><div>' + LAB.qr(LAB.siteURL() + 'booking.html', 150) + '</div><p class="big">احجز تحليلك أونلاين</p><p>دقيقتين وخلاص</p></div>' +
'<div class="c"><div>' + LAB.qr('https://wa.me/' + s.whatsapp, 150) + '</div><p class="big">واتساب المعمل</p><p>رد فوري على استفسارك</p></div>' +
'<div class="c"><div>' + LAB.qr(LAB.siteURL() + 'prescription.html', 150) + '</div><p class="big">ارفع الروشتة</p><p>واعرف السعر فوراً</p></div>' +
'</div>' +
'<div style="margin-top:24px"><h2 style="color:#0e7c86;font-size:20px">فروعنا</h2>' + brs + '</div>' +
'<p style="margin-top:18px"> خدمة السحب المنزلي | دفع كاش أو انستا باي | نتائج في نفس اليوم</p>' +
'<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>');
win.document.close();
}
}
};
/* ===================== السجلات ===================== */
Admin.views.logs = {
title: ' سجل النشاطات',
sub: 'كل حركة حصلت في النظام بالترتيب الزمني',
action: function () { return [LAB.el('button', { class: 'btn btn-ghost btn-sm', html: ' مسح السجل', onclick: function () { d.activity = []; LAB.save(); Admin.refresh(); } })]; },
render: function (w) {
var nwrap = LAB.el('div', { class: 'chart-card mb-3' }, [LAB.el('h4', { html: ' الإشعارات' }), LAB.el('div', { id: 'nlist' })]);
w.appendChild(nwrap);
var rows = d.activity.map(function (a) {
return ADM.row([LAB.fmtDate(a.at, true), LAB.escapeHtml(a.by), LAB.escapeHtml(a.text), LAB.ago(a.at)]);
});
w.appendChild(LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' النشاطات (' + d.activity.length + ')' }),
LAB.el('div', { class: 'mt-2', html: ADM.tbl(['التاريخ', 'بواسطة', 'الحدث', 'منذ'], rows, 'لا نشاطات') })
]));
var nl = $('#nlist');
d.notifications.slice(0, 15).forEach(function (n) {
nl.appendChild(LAB.el('div', { class: 'file-chip' }, [
LAB.el('span', { html: n.read ? '' : '' }),
LAB.el('div', { style: 'flex:1' }, [
LAB.el('div', { style: 'font-size:14px;font-weight:800', html: LAB.escapeHtml(n.title) }),
LAB.el('div', { class: 'small', html: LAB.escapeHtml(n.body) + ' — ' + LAB.ago(n.at) })
])
]));
});
if (!d.notifications.length) nl.innerHTML = '<div class="empty">لا إشعارات</div>';
}
};
})();

/* =========================================================
   ربط زراير القائمة الجانبية للوحة الأدمن  (إصلاح من الجذور)
   المشكلة: Admin.go() كان بيغيّر شكل الزر النشط بس،
   وماكانش فيه أي مستمع نقرة على الروابط — فكل أقسام اللوحة
   (الحجوزات، المالية، التحاليل، الأطباء، الإعدادات...) كانت ميتة
   تماماً: بتدوس على أي قسم ومفيش حاجة بتحصل.
   الحل: ربط فعلي لكل رابط data-v بنداء Admin.go().
   ========================================================= */
(function bindAdminNav() {
  var links = document.querySelectorAll('#adDash .side-nav a[data-v]');
  if (!links.length) return;
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var v = a.getAttribute('data-v');
      if (window.Admin && typeof window.Admin.go === 'function') window.Admin.go(v);
      else if (typeof Admin !== 'undefined' && Admin.go) Admin.go(v);
    });
  });
})();
