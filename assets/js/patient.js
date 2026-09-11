/* =========================================================
بوابة المريض — patient.js
========================================================= */
(function () {
'use strict';
LAB.load(); LAB.buildShell('patient.html');
var d = LAB.db(), s = d.settings, me = null;
$('#lgName').textContent = s.labName;
$$('.tab').forEach(function (t) {
t.onclick = function () {
if (!t.dataset.t) return;
$$('.tab').forEach(function (x) { if (x.dataset.t) x.classList.remove('active'); });
t.classList.add('active');
$('#pane-login,#pane-reg').forEach(function (n) { n.classList.add('hide'); });
$('#pane-' + t.dataset.t).classList.remove('hide');
};
});
$$('#dashWrap .tab').forEach(function (t) {
t.onclick = function () {
$$('#dashWrap .tab').forEach(function (x) { x.classList.remove('active'); });
t.classList.add('active');
$$('.view').forEach(function (v) { v.classList.remove('active'); });
$('#v-' + t.dataset.v).classList.add('active');
if (t.dataset.v === 'chart') drawChart();
};
});
$('#lgBtn').onclick = function () {
var ph = LAB.validatePhone($('#lgPhone').value), pw = $('#lgPass').value;
if (!ph || !pw) { LAB.toast('مطلوب', 'أدخل الموبايل وكلمة المرور', 'warn'); return; }
var p = d.patients.filter(function (x) { return x.phone === ph; })[0];
if (!p) { LAB.toast('غير موجود', 'مفيش حساب بهذا الرقم — اعمل حساب جديد', 'err'); return; }
if (p.password !== pw) { LAB.toast('خطأ', 'كلمة المرور غير صحيحة', 'err'); return; }
LAB.setSession({ role: 'patient', id: p.id });
if (LAB.cloud && LAB.cloud.serverLogin) LAB.cloud.serverLogin({ phone: ph, password: pw });
me = p; enter();
};
$('#rgBtn').onclick = function () {
var n = String($('#rgName').value || '').trim();
var ph = LAB.validatePhone($('#rgPhone').value);
var pw = $('#rgPass').value;
if (n.length < 3 || !ph || pw.length < 4) { LAB.toast('مطلوب', 'أكمل البيانات (كلمة مرور 4 أحرف على الأقل)', 'warn'); return; }
if (d.patients.filter(function (x) { return x.phone === ph; })[0]) { LAB.toast('موجود', 'الحساب موجود — سجّل الدخول', 'warn'); return; }
var p = {
id: LAB.uid(), name: n, phone: ph, whatsapp: LAB.validatePhone($('#rgWhats').value) || ph,
password: pw, age: $('#rgAge').value, gender: $('#rgGender').value,
files: [], notes: [], createdAt: new Date().toISOString()
};
d.patients.push(p); LAB.save(); LAB.log('مريض جديد: ' + n);
LAB.setSession({ role: 'patient', id: p.id });
if (LAB.cloud && LAB.cloud.serverLogin) LAB.cloud.serverLogin({ phone: ph, password: pw });
me = p;
LAB.toast('أهلاً بك ', 'تم إنشاء حسابك', 'ok'); enter();
};
$('#pLogout').onclick = function () { LAB.logout(); location.reload(); };
var s0 = LAB.getSession();
if (s0 && s0.role === 'patient') {
me = d.patients.filter(function (x) { return x.id === s0.id; })[0];
if (me) enter();
}
function enter() {
$('#authWrap').classList.add('hide'); $('#dashWrap').classList.remove('hide');
$('#pName').textContent = 'أهلاً ' + me.name;
$('#pAvatar').textContent = me.name.charAt(0);
$('#pMeta').textContent = me.phone + ' • ' + (me.age ? me.age + ' سنة' : '') + ' • ' + (me.gender || '');
var pc = $('#patientCard');
if (pc) pc.innerHTML = '<div style="background:#fff;padding:8px;border-radius:14px;border:1px solid var(--line);line-height:0">' +
LAB.qr(JSON.stringify({ n: me.name, p: me.phone, id: me.id }), 96) + '</div>' +
'<div class="small" style="text-align:center">بطاقة المريض</div>';
render();
}
function myBookings() {
return d.bookings.filter(function (b) {
return (b.patientId && b.patientId === me.id) || b.phone === me.phone;
}).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}
function render() {
var bs = myBookings();
$('#kBookings').textContent = bs.length;
$('#kResults').textContent = bs.filter(function (b) { return (b.files && b.files.length) || b.resultNote; }).length;
$('#kSpent').textContent = LAB.money(bs.filter(function (b) { return b.status !== 'cancelled'; }).reduce(function (a, b) { return a + b.total; }, 0));
$('#kLast').textContent = bs.length ? LAB.fmtDate(bs[0].date) : '—';
/* حجوزات */
var w = $('#v-bookings'); w.innerHTML = '';
if (!bs.length) w.innerHTML = '<div class="empty"><span class="ic"></span>مفيش حجوزات لسه<br><a href="booking.html" class="btn btn-primary btn-sm mt-2">احجز أول تحليل</a></div>';
bs.forEach(function (b) { w.appendChild(bookingCard(b)); });
/* نتائج */
var r = $('#v-results'); r.innerHTML = '';
var done = bs.filter(function (b) { return (b.files && b.files.length) || b.resultNote; });
if (!done.length) r.innerHTML = '<div class="empty"><span class="ic"></span>لا توجد نتائج بعد — هتظهر هنا فور اعتمادها</div>';
done.forEach(function (b) { r.appendChild(resultCard(b)); });
/* ملفات */
var f = $('#v-files'); f.innerHTML = '';
f.appendChild(LAB.el('div', { class: 'card', style: 'padding:22px;margin-bottom:18px' }, [
LAB.el('h4', { html: ' أرفق ملف طبي (تحليل قديم، أشعة، تقرير طبيب…)' }),
LAB.el('div', { class: 'field-row mt-2' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'اسم الملف / الوصف' }), LAB.el('input', { class: 'input', id: 'mfTitle', placeholder: 'مثال: تحليل صورة دم - مستشفى …' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'التاريخ' }), LAB.el('input', { class: 'input', type: 'date', id: 'mfDate' })])
]),
LAB.el('div', { class: 'dropzone mt-1', id: 'mfZone', html: '<span class="ic"></span><b>اضغط لرفع صورة أو ملف</b><small>الصور تُحفظ كصور — المستندات تُرابط باسمها</small>' }),
LAB.el('div', { class: 'preview-grid', id: 'mfPrev' })
]));
var mfFiles = [];
var zone = $('#mfZone'), inp = LAB.el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
Array.prototype.slice.call(this.files).forEach(function (file) {
LAB.fileToDataURL(file, 1200, .75, function (u) {
mfFiles.push(u);
$('#mfPrev').appendChild(LAB.el('div', { class: 'thumb' }, [
LAB.el('img', { src: u }),
LAB.el('button', { class: 'del', html: '×', onclick: function (e) { e.stopPropagation(); mfFiles.splice(mfFiles.indexOf(u), 1); this.parentElement.remove(); } })
]));
});
});
this.value = '';
};
var saveBtn = LAB.el('button', {
class: 'btn btn-primary mt-2', html: ' حفظ في ملفي', onclick: function () {
if (!mfFiles.length) { LAB.toast('مطلوب', 'ارفع ملف واحد على الأقل', 'warn'); return; }
mfFiles.forEach(function (u) {
me.files.push({ id: LAB.uid(), title: $('#mfTitle').value || 'ملف طبي', date: $('#mfDate').value || LAB.dstr(new Date()), url: u, at: new Date().toISOString() });
});
LAB.save(); LAB.toast('تم', 'تم حفظ الملفات في سجلك الطبي', 'ok'); render();
}
});
f.appendChild(saveBtn);
if (!me.files.length) {
f.appendChild(LAB.el('div', { class: 'empty', html: '<span class="ic"></span>سجلك الطبي فاضي — ارفع أي تحليل أو تقرير سابق ليكون متاحاً للدكتور' }));
} else {
var grid = LAB.el('div', { class: 'grid g3 mt-3' });
me.files.slice().reverse().forEach(function (fl) {
grid.appendChild(LAB.el('div', { class: 'card card-hover', style: 'padding:0;overflow:hidden' }, [
LAB.el('img', { src: fl.url, style: 'height:150px;width:100%;object-fit:cover;cursor:zoom-in', onclick: function () { window.open(fl.url); } }),
LAB.el('div', { style: 'padding:14px' }, [
LAB.el('b', { style: 'font-size:14px', html: LAB.escapeHtml(fl.title) }),
LAB.el('div', { class: 'small', html: ' ' + LAB.escapeHtml(fl.date) }),
LAB.el('button', {
class: 'btn btn-sm btn-danger mt-1', html: 'حذف', onclick: function () {
LAB.confirm('حذف', 'حذف هذا الملف من سجلك؟', function () {
me.files = me.files.filter(function (x) { return x.id !== fl.id; }); LAB.save(); render();
});
}
})
])
]));
});
f.appendChild(grid);
}
/* روشتات */
var rx = $('#v-rx'); rx.innerHTML = '';
var list = d.prescriptions.filter(function (x) { return x.phone === me.phone; });
if (!list.length) rx.innerHTML = '<div class="empty"><span class="ic"></span>مفيش روشتات مرفوعة<br><a href="prescription.html" class="btn btn-primary btn-sm mt-2">ارفع روشتة</a></div>';
list.forEach(function (p) {
var st = { new: ['جديد ', 'b-wait'], reviewing: ['تحت المراجعة ', 'b-prog'], quoted: ['تم التسعير ', 'b-new'], done: ['تم الحجز ', 'b-done'] }[p.status] || ['جديد', 'b-wait'];
rx.appendChild(LAB.el('div', { class: 'card', style: 'padding:18px;margin-bottom:12px' }, [
LAB.el('div', { class: 'row-between' }, [LAB.el('b', { html: ' ' + p.code }), LAB.el('span', { class: 'badge ' + st[1], html: st[0] })]),
LAB.el('div', { class: 'small mt-1', html: LAB.ago(p.createdAt) + (p.doctor ? ' — ' + LAB.escapeHtml(p.doctor) : '') }),
p.tests && p.tests.length ? LAB.el('div', { class: 'small mt-1', html: '<b>التحاليل:</b> ' + p.tests.map(LAB.escapeHtml).join('، ') }) : null,
p.quoted ? LAB.el('div', { class: 'mt-1', style: 'font-weight:900;color:var(--teal);font-size:19px', html: 'السعر: ' + LAB.money(p.quoted) + ' ج' }) : null,
p.status === 'quoted' ? LAB.el('a', { href: 'booking.html', class: 'btn btn-sm btn-primary mt-2', html: 'احجز بالسعر المعروض' }) : null,
LAB.el('div', { class: 'preview-grid mt-2' }, (p.images || []).map(function (u) {
return LAB.el('div', { class: 'thumb' }, [LAB.el('img', { src: u, onclick: function () { window.open(u); } })]);
}))
]));
});
/* الملف الشخصي */
var pf = $('#v-profile'); pf.innerHTML = '';
pf.appendChild(LAB.el('div', { class: 'card', style: 'padding:24px;max-width:640px' }, [
LAB.el('h4', { html: ' بيانات الحساب' }),
LAB.el('div', { class: 'field-row mt-2' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'الاسم' }), LAB.el('input', { class: 'input', id: 'pfName', value: me.name })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'الموبايل' }), LAB.el('input', { class: 'input', id: 'pfPhone', value: me.phone, dir: 'ltr' })])
]),
LAB.el('div', { class: 'field-row' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'واتساب' }), LAB.el('input', { class: 'input', id: 'pfWhats', value: me.whatsapp || me.phone, dir: 'ltr' })]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'السن' }), LAB.el('input', { class: 'input', id: 'pfAge', type: 'number', value: me.age || '' })])
]),
LAB.el('div', { class: 'field-row' }, [
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'النوع' }), LAB.el('select', { class: 'select', id: 'pfGender' }, [LAB.el('option', { html: 'ذكر' }), LAB.el('option', { html: 'أنثى' })])]),
LAB.el('div', { class: 'field' }, [LAB.el('label', { html: 'كلمة المرور الجديدة (اختياري)' }), LAB.el('input', { class: 'input', id: 'pfPass', type: 'password', placeholder: 'اتركها فارغة للإبقاء' })])
]),
LAB.el('button', {
class: 'btn btn-primary mt-2', html: ' حفظ التعديلات', onclick: function () {
me.name = $('#pfName').value; me.phone = LAB.validatePhone($('#pfPhone').value) || me.phone;
me.whatsapp = LAB.validatePhone($('#pfWhats').value) || me.phone;
me.age = $('#pfAge').value; me.gender = $('#pfGender').value;
if ($('#pfPass').value) me.password = $('#pfPass').value;
LAB.save(); LAB.toast('تم', 'تم حفظ بياناتك', 'ok'); render();
}
}),
LAB.el('div', { class: 'divider' }),
LAB.el('div', { class: 'small', html: ' بياناتك وملفاتك الطبية خاصة تماماً ومحفوظة داخل حسابك.' })
]));
$('#pfGender').value = me.gender || 'ذكر';
LAB.initFX();
}
function bookingCard(b) {
var st = { pending: ['في انتظار التأكيد', 'b-wait'], confirmed: ['مؤكد', 'b-new'], sampled: ['تم السحب', 'b-prog'], processing: ['جاري التحليل', 'b-prog'], ready: ['النتيجة جاهزة', 'b-done'], done: ['مكتمل', 'b-done'], cancelled: ['ملغي', 'b-cancel'] }[b.status] || ['—', 'b-gray'];
var br = d.branches.filter(function (x) { return x.id === b.branchId; })[0];
var ar = d.areas.filter(function (x) { return x.id === b.areaId; })[0];
return LAB.el('div', { class: 'card', style: 'padding:20px;margin-bottom:14px' }, [
LAB.el('div', { class: 'row-between' }, [
LAB.el('div', {}, [
LAB.el('b', { html: ' ' + b.code }),
LAB.el('div', { class: 'small', html: LAB.fmtDate(b.date) + ' — ' + b.time + ' • ' + (b.sampleType === 'home' ? 'سحب منزلي (' + LAB.escapeHtml((ar && ar.name) || '') + ')' : LAB.escapeHtml((br && br.name) || '')) })
]),
LAB.el('span', { class: 'badge ' + st[1], html: st[0] })
]),
LAB.el('div', { class: 'chips mt-2' }, b.tests.map(function (n) { return LAB.el('span', { class: 'chip', html: LAB.escapeHtml(n) }); })),
LAB.el('div', { class: 'row-between mt-2' }, [
LAB.el('div', { class: 'small', html: ' <b>' + LAB.money(b.total) + ' ج</b> — ' + (b.paymentMethod === 'cash' ? 'كاش' : 'انستا باي') + ' <span class="badge ' + (b.paymentStatus === 'paid' ? 'b-paid' : 'b-unpaid') + '">' + (b.paymentStatus === 'paid' ? 'مدفوع' : b.paymentStatus === 'review' ? 'مراجعة' : 'غير مدفوع') + '</span>' }),
LAB.el('div', { class: 'row' }, [
b.status === 'pending' || b.status === 'confirmed'
? LAB.el('button', {
class: 'btn btn-sm btn-danger', html: 'إلغاء', onclick: function () {
LAB.confirm('إلغاء', 'إلغاء الحجز ' + b.code + '؟', function () { b.status = 'cancelled'; LAB.save(); LAB.toast('تم', 'تم الإلغاء', 'ok'); render(); }, 'نعم');
}
})
: null,
LAB.el('a', { href: 'https://wa.me/' + s.whatsapp, target: '_blank', class: 'btn btn-sm btn-ghost', html: ' استفسار' })
])
])
]);
}
function resultCard(b) {
return LAB.el('div', { class: 'card', style: 'padding:20px;margin-bottom:14px' }, [
LAB.el('div', { class: 'row-between' }, [
LAB.el('b', { html: ' نتيجة ' + b.code }),
LAB.el('span', { class: 'small', html: LAB.fmtDate(b.date) })
]),
b.resultNote ? LAB.el('p', { class: 'small mt-2', html: LAB.escapeHtml(b.resultNote) }) : null,
(b.files && b.files.length)
? LAB.el('div', { class: 'preview-grid mt-2' }, b.files.map(function (f) {
return LAB.el('div', { class: 'thumb' }, [LAB.el('img', { src: f.url, onclick: function () { window.open(f.url); } })]);
}))
: null,
LAB.el('div', { class: 'row mt-2' }, [
LAB.el('button', { class: 'btn btn-sm btn-primary', html: ' طباعة / PDF', onclick: function () { window.printResult(b); } }),
LAB.el('button', { class: 'btn btn-sm btn-ghost', html: ' تفسير النتيجة مع الدكتور', onclick: function () {
window.open('https://wa.me/' + s.whatsapp + '?text=' + encodeURIComponent('السلام عليكم، أريد تفسير نتيجة تحليل رقم ' + b.code), '_blank');
} })
])
]);
}
/* رسم تطور الإنفاق / عدد التحاليل */
function drawChart() {
var w = $('#v-chart'); w.innerHTML = '';
var bs = myBookings().slice().reverse();
if (bs.length < 1) { w.innerHTML = '<div class="empty"><span class="ic"></span>لا توجد بيانات كافية بعد</div>'; return; }
w.appendChild(LAB.el('div', { class: 'grid g2' }, [
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' مصروفاتك على التحاليل' }),
LAB.el('div', { class: 'small mb-2', html: 'آخر ' + Math.min(10, bs.length) + ' حجوزات' }),
LAB.el('div', { class: 'chart-box', id: 'cb1' })
]),
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' عدد التحاليل في كل حجز' }),
LAB.el('div', { class: 'small mb-2', html: 'مقارنة سريعة لحجوزاتك' }),
LAB.el('div', { class: 'chart-box', id: 'cb2' })
])
]));
var last = bs.slice(-10);
Charts.line($('#cb1'), {
labels: last.map(function (b) { return b.code.replace('ELH-', '#'); }),
series: [{ name: 'الإجمالي (ج)', data: last.map(function (b) { return b.total; }) }],
colors: ['#0e7c86']
});
Charts.bar($('#cb2'), {
labels: last.map(function (b) { return b.code.replace('ELH-', '#'); }),
data: last.map(function (b) { return b.tests.length + (b.packageId ? 3 : 0); }),
colors: ['#22d3ee', '#0e7c86', '#f2a93b'], name: 'تحاليل'
});
}
/* طباعة النتيجة (مشاركة مع track) */
window.printResult = function (b) {
var w = window.open('', '_blank', 'width=820,height=900');
var rows = b.tests.map(function (n) { var t = d.tests.filter(function (x) { return x.name === n; })[0]; return '<tr><td>' + n + '</td><td>' + (t ? t.price : '-') + ' ج</td></tr>'; }).join('');
w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>تقرير ' + b.code + '</title>' +
'<style>body{font-family:Tahoma;padding:30px;line-height:1.8}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #ccc;padding:8px}h1{color:#0e7c86}.hd{display:flex;justify-content:space-between;border-bottom:3px solid #0e7c86;padding-bottom:10px}</style></head><body>' +
'<div class="hd"><div><h1>' + s.labName + '</h1><p>' + s.ownerName + ' — ' + s.ownerTitle + '</p></div>' +
'<div><p>تاريخ الطباعة: ' + LAB.fmtDate(new Date()) + '</p><p>رقم الحجز: ' + b.code + '</p></div></div>' +
'<h2>بيانات المريض</h2><p>الاسم: ' + b.patientName + ' | الموبايل: ' + b.phone + ' | السن: ' + (b.age || '-') + ' | النوع: ' + (b.gender || '-') + '</p>' +
'<h2>التحاليل</h2><table><tr><th>التحليل</th><th>السعر</th></tr>' + rows + '</table>' +
'<p>رسوم السحب: ' + b.homeFee + ' ج | الخصم: ' + b.discount + ' ج | <b>الإجمالي: ' + b.total + ' ج</b></p>' +
(b.resultNote ? '<h2>ملاحظات النتيجة</h2><p>' + b.resultNote + '</p>' : '') +
'<hr><p style="font-size:12px;color:#666">تقرير صادر إلكترونياً من نظام ' + s.labName + ' — ' + s.phones[0] + '</p>' +
'<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>');
w.document.close();
};
LAB.initFX();
})();
