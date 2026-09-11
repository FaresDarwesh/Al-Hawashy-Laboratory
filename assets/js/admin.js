/* =========================================================
لوحة تحكم المدير — الجزء الأول (shell, نظرة عامة, حجوزات, مرضى, روشتات)
========================================================= */
var Admin = {
views: {},
cur: 'overview',
go: function (v) {
Admin.cur = v;
$$('#adDash .side-nav a').forEach(function (a) { a.classList.toggle('active', a.dataset.v === v); });
var wrap = $('#adViews');
wrap.innerHTML = '';
if (!Admin.views[v]) { wrap.innerHTML = '<div class="empty">قريباً</div>'; return; }
var view = Admin.views[v];
var head = LAB.el('div', { class: 'row-between mb-3' }, [
LAB.el('div', {}, [LAB.el('h3', { html: view.title }), view.sub ? LAB.el('p', { class: 'small', html: view.sub }) : null]),
view.action ? LAB.el('div', { class: 'row' }, view.action()) : null
]);
wrap.appendChild(head);
var body = LAB.el('div', {});
wrap.appendChild(body);
view.render(body);
window.scrollTo({ top: 0, behavior: 'smooth' });
$('#adSide').classList.remove('open');
},
refresh: function () { Admin.go(Admin.cur); Admin.counters(); },
counters: function () {
var d = LAB.db();
$('#cBk').textContent = d.bookings.filter(function (b) { return b.status === 'pending' || b.status === 'confirmed'; }).length;
$('#cRx').textContent = d.prescriptions.filter(function (r) { return r.status === 'new' || r.status === 'reviewing'; }).length;
}
};
(function () {
'use strict';
LAB.load();
var d = LAB.db(), s = d.settings;
$('#lgLab').textContent = s.labName;
/* ---------- helpers ---------- */
var ST = {
pending: ['قيد الانتظار', 'b-wait'], confirmed: ['مؤكد', 'b-new'], sampled: ['تم السحب', 'b-prog'],
processing: ['جاري التحليل', 'b-prog'], ready: ['النتيجة جاهزة', 'b-done'], done: ['مكتمل', 'b-done'], cancelled: ['ملغي', 'b-cancel']
};
var PAY = { unpaid: ['غير مدفوع', 'b-unpaid'], review: ['مراجعة إيصال', 'b-wait'], paid: ['مدفوع', 'b-paid'] };
window.ADM = { ST: ST, PAY: PAY };
function badge(map, k) { var v = map[k] || ['—', 'b-gray']; return '<span class="badge ' + v[1] + '">' + v[0] + '</span>'; }
ADM.badge = badge;
ADM.tbl = function (headers, rows, empty) {
if (!rows.length) return '<div class="empty"><span class="ic"></span>' + (empty || 'لا توجد بيانات') + '</div>';
return '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
'</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
};
ADM.row = function (cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; };
ADM.branchName = function (id) { var b = d.branches.filter(function (x) { return x.id === id; })[0]; return b ? b.name : 'سحب منزلي'; };
ADM.areaName = function (id) { var a = d.areas.filter(function (x) { return x.id === id; })[0]; return a ? a.name : '—'; };
ADM.docName = function (b) {
if (b.doctorId) { var x = d.doctors.filter(function (y) { return y.id === b.doctorId; })[0]; if (x) return x.name; }
return b.doctorName || '—';
};
ADM.paidTotal = function (list) { return list.filter(function (b) { return b.paymentStatus === 'paid'; }).reduce(function (a, b) { return a + b.total; }, 0); };
/* ---------- login ---------- */
$('#adBtn').onclick = function () {
var u = String($('#adUser').value || '').trim().toLowerCase();
var p = $('#adPass').value;
var doc = d.doctors.filter(function (x) { return (x.username || '').toLowerCase() === u && x.password === p; })[0];
if (!doc || doc.role !== 'owner') { LAB.toast('خطأ', 'بيانات الدخول غير صحيحة أو لا تملك صلاحية المدير', 'err'); return; }
LAB.setSession({ role: 'admin', id: doc.id });
LAB.log('دخول المدير: ' + doc.name);
start();
};
$('#adLogout').onclick = function () { LAB.logout(); location.reload(); };
$('#adTheme').onclick = LAB.toggleTheme;
$('#adBurger').onclick = function () { $('#adSide').classList.toggle('open'); };
$('#adBackup').onclick = function () { LAB.exportDB(); LAB.toast('تم', 'تم تنزيل نسخة احتياطية كاملة', 'ok'); };
$('#adQuick').onclick = function () { location.href = 'booking.html'; };
function start() {
var ses = LAB.getSession();
var doc = d.doctors.filter(function (x) { return x.id === (ses && ses.id); })[0];
$('#adLogin').classList.add('hide'); $('#adDash').classList.remove('hide');
$('#adWelcome').textContent = 'أهلاً ' + (doc ? doc.name : s.ownerName) + ' ';
$('#adDate').textContent = LAB.fmtDate(new Date(), true) + ' • لوحة تحكم المدير';
Shared.notifBell($('#adBell'), 'admin');
Admin.go('overview'); Admin.counters();
}
/* =========================================================
نظرة عامة
========================================================= */
Admin.views.overview = {
title: ' نظرة عامة — كل شيء في لمحة',
sub: 'إحصائيات حية تتحدث لحظياً مع كل حجز جديد',
action: function () {
return [
LAB.el('select', {
class: 'select', style: 'width:auto', onchange: function () { Admin.views.overview.days = +this.value; Admin.refresh(); },
html: '<option value="7">آخر 7 أيام</option><option value="30" selected>آخر 30 يوم</option><option value="90">آخر 90 يوم</option><option value="365">السنة</option>'
}),
LAB.el('button', { class: 'btn btn-ghost btn-sm', html: ' تحديث', onclick: function () { Admin.refresh(); } }),
LAB.el('a', { href: 'booking.html', target: '_blank', class: 'btn btn-primary btn-sm', html: '+ حجز جديد' })
];
},
days: 30,
render: function (w) {
var days = Admin.views.overview.days;
var now = Date.now(), from = now - days * 86400000;
var all = d.bookings.filter(function (b) { return new Date(b.createdAt).getTime() >= from && b.status !== 'cancelled'; });
var prevFrom = from - days * 86400000;
var prev = d.bookings.filter(function (b) { var t = new Date(b.createdAt).getTime(); return t >= prevFrom && t < from && b.status !== 'cancelled'; });
var revenue = all.reduce(function (a, b) { return a + b.total; }, 0);
var prevRev = prev.reduce(function (a, b) { return a + b.total; }, 0);
var delta = prevRev ? Math.round((revenue - prevRev) / prevRev * 100) : 100;
var collected = ADM.paidTotal(all);
var today = LAB.dstr(new Date());
var todayBk = d.bookings.filter(function (b) { return b.date === today; });
/* KPIs */
var kpis = [
['', 'إجمالي الإيرادات', LAB.money(revenue) + ' ج', delta, 'var(--grad)', 'مقارنة بالفترة السابقة'],
['', 'عدد الحجوزات', all.length, prev.length ? Math.round((all.length - prev.length) / prev.length * 100) : 100, 'linear-gradient(135deg,#7c3aed,#a855f7)', 'حجوزات غير ملغية'],
['', 'متوسط قيمة الحجز', LAB.money(all.length ? revenue / all.length : 0) + ' ج', 0, 'var(--grad-gold)', 'متوسط الفاتورة'],
['', 'المحصّل فعلياً', LAB.money(collected) + ' ج', Math.round(revenue ? collected / revenue * 100 : 0), 'linear-gradient(135deg,#16a34a,#22c55e)', 'نسبة التحصيل'],
['', 'حجوزات اليوم', todayBk.length, 0, 'linear-gradient(135deg,#0284c7,#22d3ee)', 'المجدولة لليوم'],
['', 'إجمالي المرضى', d.patients.length, 0, 'linear-gradient(135deg,#f43f5e,#fb7185)', 'حسابات مسجلة'],
['', 'روشتات جديدة', d.prescriptions.filter(function (r) { return r.status === 'new' || r.status === 'reviewing'; }).length, 0, 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'بانتظار المراجعة'],
['', 'طلبات سحب منزلي', all.filter(function (b) { return b.sampleType === 'home'; }).length, 0, 'linear-gradient(135deg,#0e7c86,#22d3ee)', 'من إجمالي الحجوزات']
];
var kw = LAB.el('div', { class: 'kpis' });
kpis.forEach(function (k, i) {
var sparkData = [];
for (var j = 6; j >= 0; j--) {
var day = new Date(now - j * 86400000), iso = LAB.dstr(day);
sparkData.push(d.bookings.filter(function (b) { return b.date === iso && b.status !== 'cancelled'; }).reduce(function (a, b) { return a + b.total; }, 0) / 100);
}
kw.appendChild(LAB.el('div', { class: 'kpi reveal' + (i > 3 ? ' d' + (i - 3) : '') }, [
LAB.el('div', { class: 'ic', style: 'background:' + k[4], html: k[0] }),
LAB.el('div', { class: 'val', html: k[2] }),
LAB.el('div', { class: 'lbl', html: k[1] }),
k[3] ? LAB.el('div', { class: 'delta ' + (k[3] >= 0 ? 'up' : 'down'), html: (k[3] >= 0 ? '▲' : '▼') + ' ' + Math.abs(k[3]) + '% ' + k[5] }) : LAB.el('div', { class: 'delta', style: 'color:var(--text-soft)', html: k[5] }),
i === 0 ? LAB.el('div', { style: 'position:absolute;bottom:0;inset-inline-end:0', html: Charts.spark(sparkData) }) : null
]));
});
w.appendChild(kw);
/* charts row 1 */
var c1 = LAB.el('div', { class: 'grid', style: 'grid-template-columns:2fr 1fr;gap:18px;margin-bottom:18px' }, [
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' إيرادات آخر ' + days + ' يوم' }),
LAB.el('div', { class: 'small mb-2', html: 'إجمالي قيمة الحجوزات المؤكدة يومياً' }),
LAB.el('div', { class: 'chart-box', id: 'chRev' })
]),
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' توزيع الحجوزات' }),
LAB.el('div', { class: 'small mb-2', html: 'حسب الفرع / السحب المنزلي' }),
LAB.el('div', { class: 'chart-box', id: 'chBranch' })
])
]);
w.appendChild(c1);
var c2 = LAB.el('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr 1fr;gap:18px;margin-bottom:18px' }, [
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' الأكثر طلباً' }), LAB.el('div', { class: 'small mb-2', html: 'أعلى 8 تحاليل' }),
LAB.el('div', { class: 'chart-box', style: 'height:260px', id: 'chTop' })
]),
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' طرق الدفع' }), LAB.el('div', { class: 'small mb-2', html: 'كاش مقابل انستا باي' }),
LAB.el('div', { class: 'chart-box', style: 'height:260px', id: 'chPay' }),
LAB.el('div', { class: 'legend', id: 'lgPay' })
]),
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' حالات الحجوزات' }), LAB.el('div', { class: 'small mb-2', html: 'الوضع الحالي لكل الحجوزات' }),
LAB.el('div', { class: 'chart-box', style: 'height:260px', id: 'chStatus' }),
LAB.el('div', { class: 'legend', id: 'lgStatus' })
])
]);
w.appendChild(c2);
var c3 = LAB.el('div', { class: 'grid', style: 'grid-template-columns:1.4fr 1fr;gap:18px' }, [
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' مقارنة شهرية' }), LAB.el('div', { class: 'small mb-2', html: 'إيرادات آخر 8 شهور' }),
LAB.el('div', { class: 'chart-box', id: 'chMonth' })
]),
LAB.el('div', { class: 'chart-card' }, [
LAB.el('h4', { html: ' مواعيد اليوم' }),
LAB.el('div', { class: 'small mb-2', html: 'جدول حجوزات اليوم — ' + LAB.fmtDate(new Date()) }),
LAB.el('div', { style: 'max-height:280px;overflow:auto', id: 'todayList' })
])
]);
w.appendChild(c3);
/* خريطة أوقات الذروة */
var from = parseInt(s.workFrom, 10), to = parseInt(s.workTo, 10);
var hours = [], maxH = 1;
for (var hh = from; hh <= to; hh++) {
var cnt = all.filter(function (b) { return parseInt(String(b.time).split(':')[0], 10) === hh; }).length;
if (cnt > maxH) maxH = cnt;
hours.push({ h: hh, c: cnt });
}
var hm = LAB.el('div', { class: 'chart-card mt-3' }, [
LAB.el('h4', { html: ' خريطة أوقات الذروة' }),
LAB.el('div', { class: 'small mb-2', html: 'توزيع الحجوزات على ساعات اليوم — يساعدك تحدد الورديات المطلوبة' }),
LAB.el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(58px,1fr));gap:8px' },
hours.map(function (o) {
var alpha = o.c ? Math.max(.14, o.c / maxH) : .05;
return LAB.el('div', {
title: o.c + ' حجز',
style: 'background:rgba(14,124,134,' + alpha.toFixed(2) + ');border:1px solid var(--line);border-radius:12px;padding:12px 6px;text-align:center;transition:.3s;cursor:default',
html: '<b style="font-size:13px">' + o.h + ':00</b><div style="font-weight:900;color:var(--teal);font-size:16px">' + o.c + '</div>'
});
})
)
]);
w.appendChild(hm);
/* آخر النشاطات */
var act = LAB.el('div', { class: 'chart-card mt-3' }, [LAB.el('h4', { html: ' آخر النشاطات' }), LAB.el('div', { id: 'actList' })]);
w.appendChild(act);
/* ===== render charts ===== */
var labels = [], vals = [], counts = [];
for (var i = days - 1; i >= 0; i--) {
var dt = new Date(now - i * 86400000), iso = LAB.dstr(dt);
labels.push(dt.getDate() + '/' + (dt.getMonth() + 1));
var dayB = d.bookings.filter(function (b) { return b.date === iso && b.status !== 'cancelled'; });
vals.push(dayB.reduce(function (a, b) { return a + b.total; }, 0));
counts.push(dayB.length);
}
Charts.line($('#chRev'), {
labels: labels, colors: ['#0e7c86', '#f2a93b'],
series: [{ name: 'الإيرادات (ج)', data: vals }, { name: 'عدد الحجوزات', data: counts }]
});
var bl = [], bd = [];
d.branches.filter(function (b) { return b.active; }).forEach(function (b) { bl.push(b.name); bd.push(all.filter(function (x) { return x.branchId === b.id; }).length); });
bl.push('سحب منزلي'); bd.push(all.filter(function (x) { return x.sampleType === 'home'; }).length);
Charts.donut($('#chBranch'), { labels: bl, data: bd, centerLabel: 'حجز' });
$('#chBranch').parentElement.appendChild(legend(bl, Charts.PALETTE));
var freq = {};
all.forEach(function (b) { (b.tests || []).forEach(function (t) { freq[t] = (freq[t] || 0) + 1; }); });
var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 8);
Charts.hbar($('#chTop'), { labels: top, data: top.map(function (t) { return freq[t]; }), colors: ['#0e7c86', '#22d3ee', '#f2a93b'] });
var cash = all.filter(function (b) { return b.paymentMethod === 'cash'; }).length;
var ip = all.filter(function (b) { return b.paymentMethod === 'instapay'; }).length;
Charts.donut($('#chPay'), { labels: ['كاش عند الكشف', 'انستا باي'], data: [cash, ip], centerLabel: 'حجز' });
$('#lgPay').innerHTML = legendHTML(['كاش عند الكشف', 'انستا باي'], Charts.PALETTE);
var sk = Object.keys(ST), sd = sk.map(function (k) { return d.bookings.filter(function (b) { return b.status === k; }).length; });
Charts.donut($('#chStatus'), { labels: sk.map(function (k) { return ST[k][0]; }), data: sd, centerLabel: 'حجز' });
$('#lgStatus').innerHTML = legendHTML(sk.map(function (k) { return ST[k][0]; }), Charts.PALETTE);
var mNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
var mLabels = [], mVals = [];
for (var m = 7; m >= 0; m--) {
var d2 = new Date(); d2.setMonth(d2.getMonth() - m);
mLabels.push(mNames[d2.getMonth()] + ' ' + String(d2.getFullYear()).slice(2));
mVals.push(d.bookings.filter(function (b) {
var bb = new Date(b.createdAt); return bb.getMonth() === d2.getMonth() && bb.getFullYear() === d2.getFullYear() && b.status !== 'cancelled';
}).reduce(function (a, b) { return a + b.total; }, 0));
}
Charts.bar($('#chMonth'), { labels: mLabels, data: mVals, name: 'الإيرادات (ج)', colors: Charts.PALETTE });
/* مواعيد اليوم */
var tl = $('#todayList');
if (!todayBk.length) tl.innerHTML = '<div class="empty" style="padding:20px">لا توجد مواعيد اليوم</div>';
todayBk.sort(function (a, b) { return a.time.localeCompare(b.time); }).forEach(function (b) {
tl.appendChild(LAB.el('div', { class: 'file-chip', style: 'cursor:pointer', onclick: function () { bookingModal(b); } }, [
LAB.el('b', { style: 'min-width:52px;color:var(--teal)', html: b.time }),
LAB.el('div', { style: 'flex:1' }, [
LAB.el('div', { style: 'font-size:14px;font-weight:800', html: LAB.escapeHtml(b.patientName) }),
LAB.el('div', { class: 'small', html: (b.sampleType === 'home' ? ' ' + ADM.areaName(b.areaId) : ' ' + ADM.branchName(b.branchId)) + ' • ' + b.tests.length + ' تحليل' })
]),
LAB.el('span', { class: 'badge ' + ST[b.status][1], html: ST[b.status][0] })
]));
});
/* النشاطات */
var al = $('#actList');
d.activity.slice(0, 10).forEach(function (a) {
al.appendChild(LAB.el('div', { class: 'file-chip' }, [
LAB.el('span', { html: '' }),
LAB.el('div', { style: 'flex:1' }, [LAB.el('div', { style: 'font-size:14px', html: LAB.escapeHtml(a.text) }), LAB.el('div', { class: 'small', html: LAB.ago(a.at) + ' • ' + LAB.escapeHtml(a.by) })])
]));
});
if (!d.activity.length) al.innerHTML = '<div class="empty">لا نشاطات بعد</div>';
LAB.initFX();
}
};
function legendHTML(labels, colors) {
return labels.map(function (l, i) {
return '<span><i style="background:' + colors[i % colors.length] + '"></i>' + LAB.escapeHtml(l) + '</span>';
}).join('');
}
function legend(labels, colors) {
var d2 = LAB.el('div', { class: 'legend', style: 'margin-top:10px' });
d2.innerHTML = legendHTML(labels, colors);
return d2;
}
/* =========================================================
الحجوزات
========================================================= */
var bkFilter = { status: 'all', pay: 'all', type: 'all', from: '', to: '', q: '' };
Admin.views.bookings = {
title: ' إدارة الحجوزات',
sub: 'متابعة وتعديل كل حجوزات المعمل، رفع النتائج وتأكيد الدفع',
action: function () {
return [LAB.el('button', {
class: 'btn btn-primary btn-sm', html: ' تصدير CSV', onclick: function () {
var rows = [['الكود', 'المريض', 'الهاتف', 'التاريخ', 'الوقت', 'النوع', 'المكان', 'التحاليل', 'الإجمالي', 'الدفع', 'حالة الدفع', 'الحالة']];
d.bookings.forEach(function (b) {
rows.push([b.code, b.patientName, b.phone, b.date, b.time, b.sampleType === 'home' ? 'منزلي' : 'معمل',
b.sampleType === 'home' ? ADM.areaName(b.areaId) : ADM.branchName(b.branchId), (b.tests || []).join(' | '),
b.total, b.paymentMethod === 'cash' ? 'كاش' : 'انستا باي', b.paymentStatus, ST[b.status][0]]);
});
csv(rows, 'bookings-' + LAB.dstr(new Date()) + '.csv');
}
})];
},
render: function (w) {
var tb = LAB.el('div', { class: 'toolbar' }, [
LAB.el('input', { class: 'input', placeholder: ' كود / اسم / هاتف', id: 'bkQ2', value: bkFilter.q, oninput: function () { bkFilter.q = this.value; draw(); } }),
LAB.el('select', {
class: 'select', id: 'bkSt', onchange: function () { bkFilter.status = this.value; draw(); },
html: '<option value="all">كل الحالات</option>' + Object.keys(ST).map(function (k) {
return '<option value="' + k + '"' + (bkFilter.status === k ? ' selected' : '') + '>' + ST[k][0] + '</option>';
}).join('')
}),
LAB.el('select', {
class: 'select', onchange: function () { bkFilter.pay = this.value; draw(); },
html: '<option value="all">كل طرق الدفع</option><option value="cash"' + (bkFilter.pay === 'cash' ? ' selected' : '') + '>كاش</option><option value="instapay"' + (bkFilter.pay === 'instapay' ? ' selected' : '') + '>انستا باي</option>'
}),
LAB.el('select', {
class: 'select', onchange: function () { bkFilter.type = this.value; draw(); },
html: '<option value="all">كل الأنواع</option><option value="lab"' + (bkFilter.type === 'lab' ? ' selected' : '') + '>في المعمل</option><option value="home"' + (bkFilter.type === 'home' ? ' selected' : '') + '>سحب منزلي</option>'
}),
LAB.el('input', { class: 'input', type: 'date', value: bkFilter.from, onchange: function () { bkFilter.from = this.value; draw(); }, style: 'width:auto' }),
LAB.el('input', { class: 'input', type: 'date', value: bkFilter.to, onchange: function () { bkFilter.to = this.value; draw(); }, style: 'width:auto' }),
LAB.el('button', { class: 'btn btn-ghost btn-sm', html: 'مسح الفلاتر', onclick: function () { bkFilter = { status: 'all', pay: 'all', type: 'all', from: '', to: '', q: '' }; Admin.refresh(); } })
]);
w.appendChild(tb);
var box = LAB.el('div', { id: 'bkTable' });
w.appendChild(box);
function draw() {
var list = d.bookings.filter(function (b) {
if (bkFilter.status !== 'all' && b.status !== bkFilter.status) return false;
if (bkFilter.pay !== 'all' && b.paymentMethod !== bkFilter.pay) return false;
if (bkFilter.type !== 'all' && b.sampleType !== bkFilter.type) return false;
if (bkFilter.from && b.date < bkFilter.from) return false;
if (bkFilter.to && b.date > bkFilter.to) return false;
if (bkFilter.q) {
var q = bkFilter.q.toLowerCase();
if ((b.code + b.patientName + b.phone).toLowerCase().indexOf(q) < 0) return false;
}
return true;
}).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
var rows = list.map(function (b) {
return ADM.row([
'<b>' + b.code + '</b><div class="small">' + LAB.ago(b.createdAt) + '</div>',
LAB.escapeHtml(b.patientName) + '<div class="small" dir="ltr">' + b.phone + '</div>',
LAB.fmtDate(b.date) + '<div class="small">' + b.time + '</div>',
(b.sampleType === 'home' ? ' ' : ' ') + LAB.escapeHtml(b.sampleType === 'home' ? ADM.areaName(b.areaId) : ADM.branchName(b.branchId)),
b.tests.length + (b.packageId ? ' +' : '') + '<div class="small">' + ADM.docName(b) + '</div>',
'<b>' + LAB.money(b.total) + ' ج</b>',
(b.paymentMethod === 'cash' ? ' كاش' : ' انستا باي') + '<br>' + badge(PAY, b.paymentStatus),
badge(ST, b.status),
'<div class="tbl-actions"><button class="btn btn-sm btn-primary" data-open="' + b.id + '">فتح</button>' +
'<a class="btn btn-sm btn-ghost" target="_blank" href="https://wa.me/' + String(b.whatsapp || b.phone).replace(/^0/, '2') + '"></a></div>'
]);
});
box.innerHTML = '<div class="small mb-2">عدد النتائج: <b>' + list.length + '</b> — الإجمالي: <b>' + LAB.money(list.reduce(function (a, b) { return a + b.total; }, 0)) + ' ج</b></div>' +
ADM.tbl(['الكود', 'المريض', 'المعاد', 'المكان', 'التحاليل', 'الإجمالي', 'الدفع', 'الحالة', 'إجراءات'], rows, 'لا توجد حجوزات مطابقة');
LAB.$$('[data-open]', box).forEach(function (btn) {
btn.onclick = function () {
var b = d.bookings.filter(function (x) { return x.id === btn.dataset.open; })[0];
bookingModal(b);
};
});
}
draw();
}
};
/* ---------- نافذة الحجز الشاملة ---------- */
function bookingModal(b) {
var br = d.branches.filter(function (x) { return x.id === b.branchId; })[0];
var ar = d.areas.filter(function (x) { return x.id === b.areaId; })[0];
var testsRows = (b.tests || []).map(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0];
return '<div class="sum-line"><span>' + LAB.escapeHtml(n) + '</span><b>' + LAB.money(t ? t.price : 0) + ' ج</b></div>';
}).join('');
var pkg = b.packageId ? d.packages.filter(function (p) { return p.id === b.packageId; })[0] : null;
var html =
'<div class="grid g2" style="gap:16px">' +
'<div><b>المريض:</b> ' + LAB.escapeHtml(b.patientName) + '</div>' +
'<div><b>الهاتف:</b> <span dir="ltr">' + b.phone + '</span></div>' +
'<div><b>واتساب:</b> <span dir="ltr">' + (b.whatsapp || b.phone) + '</span></div>' +
'<div><b>السن/النوع:</b> ' + (b.age || '-') + ' / ' + (b.gender || '-') + '</div>' +
'<div><b>المعاد:</b> ' + LAB.fmtDate(b.date) + ' — ' + b.time + '</div>' +
'<div><b>الدكتور:</b> ' + LAB.escapeHtml(ADM.docName(b)) + '</div>' +
'<div><b>الطريقة:</b> ' + (b.sampleType === 'home' ? 'سحب منزلي' : 'في المعمل') + '</div>' +
'<div><b>المكان:</b> ' + LAB.escapeHtml(b.sampleType === 'home' ? (ar ? ar.name + ' — ' + (b.address || '') : b.address || '') : (br ? br.name : '')) + '</div>' +
(b.conditions ? '<div style="grid-column:1/-1"><b>حالة صحية:</b> ' + LAB.escapeHtml(b.conditions) + '</div>' : '') +
(b.notes ? '<div style="grid-column:1/-1"><b>ملاحظات:</b> ' + LAB.escapeHtml(b.notes) + '</div>' : '') +
'</div>' +
'<div class="divider"></div><h4>التحاليل</h4>' + testsRows +
(pkg ? '<div class="sum-line"><span> ' + LAB.escapeHtml(pkg.name) + '</span><b>' + LAB.money(pkg.price) + ' ج</b></div>' : '') +
(b.homeFee ? '<div class="sum-line"><span>رسوم السحب المنزلي</span><b>' + LAB.money(b.homeFee) + ' ج</b></div>' : '') +
(b.discount ? '<div class="sum-line" style="color:var(--green)"><span>خصم (' + b.coupon + ')</span><b>- ' + LAB.money(b.discount) + ' ج</b></div>' : '') +
'<div class="sum-total"><span>الإجمالي</span><span style="color:var(--teal)">' + LAB.money(b.total) + ' ج</span></div>' +
'<div class="grid g3 mt-3">' +
'<div class="field"><label>حالة الحجز</label><select class="select" id="mdStatus">' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (b.status === k ? ' selected' : '') + '>' + ST[k][0] + '</option>'; }).join('') + '</select></div>' +
'<div class="field"><label>حالة الدفع</label><select class="select" id="mdPay">' + Object.keys(PAY).map(function (k) { return '<option value="' + k + '"' + (b.paymentStatus === k ? ' selected' : '') + '>' + PAY[k][0] + '</option>'; }).join('') + '</select></div>' +
'<div class="field"><label>الطبيب المسؤول</label><select class="select" id="mdDoc"><option value="">— بدون —</option>' + d.doctors.filter(function (x) { return x.active; }).map(function (x) { return '<option value="' + x.id + '"' + (b.doctorId === x.id ? ' selected' : '') + '>' + LAB.escapeHtml(x.name) + '</option>'; }).join('') + '</select></div>' +
'</div>' +
'<div class="field"><label>ملاحظات النتيجة / تفسير</label><textarea class="textarea" id="mdNote" placeholder="مثال: كل النتائج داخل المعدل الطبيعي عدا …">' + LAB.escapeHtml(b.resultNote || '') + '</textarea></div>' +
'<div class="field"><label>مرفقات النتيجة (صور / PDF كصور)</label>' +
'<div class="dropzone" id="mdZone"><span class="ic"></span><b>اضغط لرفع ملفات النتيجة</b></div><div class="preview-grid" id="mdPrev"></div></div>' +
(b.receipt ? '<div class="field"><label>إيصال انستا باي</label><div class="preview-grid"><div class="thumb"><img src="' + b.receipt + '" onclick="window.open(this.src)"></div></div>' +
'<div class="row mt-1"><button class="btn btn-sm btn-success" id="mdAcceptPay"> تأكيد استلام المبلغ</button>' +
'<button class="btn btn-sm btn-danger" id="mdRejectPay"> رفض الإيصال</button></div></div>' : '') +
'<div class="divider"></div>' +
'<div class="row" style="gap:16px;align-items:center"><div style="background:#fff;padding:6px;border-radius:12px;border:1px solid var(--line);line-height:0">' +
LAB.qr(LAB.trackURL(b.code), 96) + '</div>' +
'<div class="small"> كود الحجز — امسحه للوصول السريع أو اطبعه كملصق على العينة<br><b dir="ltr" style="font-size:12px;opacity:.7">' + LAB.escapeHtml(LAB.trackURL(b.code)) + '</b></div></div>' +
'<div class="divider"></div>' +
'<div class="row"><button class="btn btn-success" id="mdSave"> حفظ التغييرات</button>' +
'<button class="btn btn-ghost" id="mdMsg"> رسالة واتساب</button>' +
'<button class="btn btn-outline" id="mdPrint"> طباعة الفاتورة</button>' +
'<button class="btn btn-danger" id="mdDel"> حذف</button></div>';
var m = LAB.modal({ title: 'حجز ' + b.code, html: html, wide: true });
var files = (b.files || []).slice();
function renderPrev() {
var pv = $('#mdPrev'); pv.innerHTML = '';
files.forEach(function (f, i) {
pv.appendChild(LAB.el('div', { class: 'thumb' }, [
LAB.el('img', { src: f.url, onclick: function () { window.open(f.url); } }),
LAB.el('button', { class: 'del', html: '×', onclick: function (e) { e.stopPropagation(); files.splice(i, 1); renderPrev(); } })
]));
});
}
renderPrev();
var zone = $('#mdZone'), inp = LAB.el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
zone.appendChild(inp); zone.onclick = function () { inp.click(); };
inp.onchange = function () {
Array.prototype.slice.call(this.files).forEach(function (f) {
LAB.fileToDataURL(f, 1400, .8, function (u) { files.push({ url: u, name: f.name, at: new Date().toISOString() }); renderPrev(); });
});
this.value = '';
};
$('#mdSave').onclick = function () {
var old = b.status;
b.status = $('#mdStatus').value; b.paymentStatus = $('#mdPay').value;
b.doctorId = $('#mdDoc').value;
b.resultNote = $('#mdNote').value; b.files = files;
if (b.doctorId) { var dd = d.doctors.filter(function (x) { return x.id === b.doctorId; })[0]; if (dd) b.doctorName = dd.name; }
LAB.save();
LAB.log('تحديث حجز ' + b.code + ' → ' + ST[b.status][0]);
if (old !== b.status && b.status === 'ready') {
LAB.notify('نتيجتك جاهزة ', 'نتيجة حجزك ' + b.code + ' جاهزة — ادخل على ملفك الطبي', 'booking', 'patient:' + b.phone);
LAB.toast('تم', 'تم إشعار المريض بجاهزية النتيجة', 'ok');
}
m.close(); Admin.refresh();
};
$('#mdMsg').onclick = function () {
var t = encodeURIComponent('السلام عليكم ' + b.patientName + '، معكم معمل الحوشي للتحاليل \nبخصوص الحجز رقم ' + b.code + '\n' + (b.resultNote ? 'ملاحظات النتيجة: ' + b.resultNote + '\n' : '') + 'لأي استفسار احنا معاكم — ' + s.phones[0]);
window.open('https://wa.me/' + String(b.whatsapp || b.phone).replace(/^0/, '2') + '?text=' + t, '_blank');
};
$('#mdPrint').onclick = function () { printInvoice(b); };
$('#mdDel').onclick = function () {
LAB.confirm('حذف الحجز', 'حذف نهائي للحجز ' + b.code + '؟', function () {
d.bookings = d.bookings.filter(function (x) { return x.id !== b.id; }); LAB.save(); LAB.log('حذف حجز ' + b.code); m.close(); Admin.refresh();
}, 'احذف');
};
if ($('#mdAcceptPay')) $('#mdAcceptPay').onclick = function () { b.paymentStatus = 'paid'; LAB.save(); LAB.toast('تم', 'تم تأكيد الدفع', 'ok'); m.close(); Admin.refresh(); };
if ($('#mdRejectPay')) $('#mdRejectPay').onclick = function () { b.paymentStatus = 'unpaid'; b.receipt = ''; LAB.save(); LAB.toast('تم', 'تم رفض الإيصال وإخطار الحجز كغير مدفوع', 'warn'); m.close(); Admin.refresh(); };
}
ADM.bookingModal = bookingModal;
window.printInvoice = function (b) {
var w = window.open('', '_blank', 'width=800,height=900');
var rows = (b.tests || []).map(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0];
return '<tr><td>' + n + '</td><td>' + (t ? t.price : '-') + ' ج</td></tr>';
}).join('');
w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>فاتورة ' + b.code + '</title>' +
'<style>body{font-family:Tahoma;padding:26px}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #bbb;padding:8px}h1{color:#0e7c86;margin:0}.hd{display:flex;justify-content:space-between;border-bottom:3px solid #0e7c86;padding-bottom:8px;margin-bottom:14px}.tot{font-size:20px;font-weight:900}</style></head><body>' +
'<div class="hd"><div><h1>' + s.labName + '</h1><p>' + s.ownerName + ' — ' + s.ownerTitle + '</p><p>' + s.address + ' | ' + s.phones[0] + '</p></div>' +
'<div><b>فاتورة حجز</b><br>رقم: ' + b.code + '<br>التاريخ: ' + LAB.fmtDate(new Date()) + '</div></div>' +
'<p><b>المريض:</b> ' + b.patientName + ' | <b>الهاتف:</b> ' + b.phone + ' | <b>المعاد:</b> ' + LAB.fmtDate(b.date) + ' ' + b.time + '</p>' +
'<table><tr><th>التحليل</th><th>السعر</th></tr>' + rows + '</table>' +
(b.homeFee ? '<p>رسوم السحب المنزلي: ' + b.homeFee + ' ج</p>' : '') +
(b.discount ? '<p>الخصم: ' + b.discount + ' ج</p>' : '') +
'<p class="tot">الإجمالي: ' + b.total + ' جنيه</p>' +
'<p>طريقة الدفع: ' + (b.paymentMethod === 'cash' ? 'كاش عند الكشف' : 'انستا باي — ' + s.instapay) + '</p>' +
'<hr><p style="font-size:11px;color:#777">شكراً لثقتكم بـ' + s.labName + '</p>' +
'<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>');
w.document.close();
};
/* =========================================================
المرضى
========================================================= */
Admin.views.patients = {
title: ' المرضى والسجلات الطبية',
sub: 'ملف كامل لكل مريض: حجوزاته، نتائجه، ملفاته، وإنفاقه',
render: function (w) {
var q = LAB.el('input', { class: 'input', placeholder: ' اسم أو هاتف', style: 'max-width:320px', oninput: function () { draw(this.value); } });
w.appendChild(LAB.el('div', { class: 'toolbar' }, [q]));
var box = LAB.el('div'); w.appendChild(box);
function draw(val) {
var list = d.patients.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
if (val) list = list.filter(function (p) { return (p.name + p.phone).indexOf(val) >= 0; });
var rows = list.map(function (p) {
var bs = d.bookings.filter(function (b) { return b.phone === p.phone || b.patientId === p.id; });
var spent = bs.reduce(function (a, b) { return a + b.total; }, 0);
return ADM.row([
LAB.escapeHtml(p.name) + '<div class="small" dir="ltr">' + p.phone + '</div>',
(p.age || '-') + ' / ' + (p.gender || '-'),
bs.length, (p.files || []).length,
'<b>' + LAB.money(spent) + ' ج</b>',
LAB.fmtDate(p.createdAt),
'<button class="btn btn-sm btn-primary" data-p="' + p.id + '">الملف</button>'
]);
});
box.innerHTML = '<div class="small mb-2">إجمالي المرضى: <b>' + list.length + '</b></div>' +
ADM.tbl(['المريض', 'السن/النوع', 'حجوزات', 'ملفات', 'الإنفاق', 'تاريخ التسجيل', 'إجراءات'], rows, 'لا يوجد مرضى مسجلين');
LAB.$$('[data-p]', box).forEach(function (btn) {
btn.onclick = function () {
var p = d.patients.filter(function (x) { return x.id === btn.dataset.p; })[0];
patientModal(p);
};
});
}
draw('');
}
};
function patientModal(p) {
var bs = d.bookings.filter(function (b) { return b.phone === p.phone || b.patientId === p.id; }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
var html = '<div class="grid g3 mb-3">' +
'<div class="kpi"><div class="val">' + bs.length + '</div><div class="lbl">حجوزات</div></div>' +
'<div class="kpi"><div class="val">' + LAB.money(bs.reduce(function (a, b) { return a + b.total; }, 0)) + '</div><div class="lbl">إجمالي الإنفاق</div></div>' +
'<div class="kpi"><div class="val">' + (p.files || []).length + '</div><div class="lbl">ملفات طبية</div></div></div>' +
'<div class="row-between mb-2"><b> <span dir="ltr">' + p.phone + '</span> | <span dir="ltr">' + (p.whatsapp || p.phone) + '</span></b>' +
'<a class="btn btn-sm btn-success" target="_blank" href="https://wa.me/' + String(p.whatsapp || p.phone).replace(/^0/, '2') + '"> واتساب</a></div>';
html += '<h4>آخر الحجوزات</h4>' + ADM.tbl(['الكود', 'التاريخ', 'التحاليل', 'الإجمالي', 'الحالة'],
bs.slice(0, 8).map(function (b) {
return ADM.row([b.code, LAB.fmtDate(b.date), b.tests.length, LAB.money(b.total) + ' ج', badge(ST, b.status)]);
}), 'لا حجوزات');
if ((p.files || []).length) {
html += '<h4 class="mt-3">الملفات الطبية</h4><div class="preview-grid">' +
p.files.map(function (f) { return '<div class="thumb"><img src="' + f.url + '" onclick="window.open(this.src)"></div>'; }).join('') + '</div>';
}
LAB.modal({
title: 'ملف المريض: ' + p.name, html: html, wide: true,
buttons: [
{ text: ' حجز جديد له', cls: 'btn-primary', action: function () { save(); location.href = 'booking.html'; } },
{ text: 'حفظ الملاحظات', cls: 'btn-ghost', action: function (bd, close) { save(); close(); } },
{ text: 'إغلاق' }
]
});
function save() { LAB.save(); }
}
/* =========================================================
الروشتات
========================================================= */
Admin.views.rx = {
title: ' روشتات المرضى',
sub: 'راجع الروشتة، حدد التحاليل، وابعث السعر للمريض فوراً',
render: function (w) {
var box = LAB.el('div'); w.appendChild(box);
function draw() {
var list = d.prescriptions.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
var RXS = { new: ['جديد', 'b-wait'], reviewing: ['تحت المراجعة', 'b-prog'], quoted: ['تم التسعير', 'b-new'], done: ['تم الحجز', 'b-done'], rejected: ['مرفوض', 'b-cancel'] };
var rows = list.map(function (r) {
return ADM.row([
'<b>' + r.code + '</b>', LAB.escapeHtml(r.name) + '<div class="small" dir="ltr">' + r.phone + '</div>',
LAB.escapeHtml(r.doctor || '—'), (r.images || []).length + ' صورة',
(r.tests || []).length, r.quoted ? '<b>' + LAB.money(r.quoted) + ' ج</b>' : '—',
LAB.ago(r.createdAt), '<span class="badge ' + (RXS[r.status] || RXS.new)[1] + '">' + (RXS[r.status] || RXS.new)[0] + '</span>',
'<button class="btn btn-sm btn-primary" data-r="' + r.id + '">مراجعة</button>'
]);
});
box.innerHTML = ADM.tbl(['الكود', 'المريض', 'الدكتور', 'صور', 'تحاليل', 'السعر', 'التاريخ', 'الحالة', 'إجراءات'], rows, 'لا توجد روشتات بعد');
LAB.$$('[data-r]', box).forEach(function (btn) {
btn.onclick = function () {
var r = d.prescriptions.filter(function (x) { return x.id === btn.dataset.r; })[0];
rxModal(r, draw);
};
});
}
draw();
}
};
function rxModal(r, redraw) {
var selected = (r.tests || []).slice();
var html = '<div class="split" style="grid-template-columns:1fr 1fr;gap:20px;align-items:start">' +
'<div><h4>صور الروشتة</h4><div class="preview-grid mt-1">' +
(r.images || []).map(function (u) { return '<div class="thumb"><img src="' + u + '" onclick="window.open(this.src)" style="cursor:zoom-in"></div>'; }).join('') +
'</div>' +
'<div class="mt-2"><b>المريض:</b> ' + LAB.escapeHtml(r.name) + ' — <span dir="ltr">' + r.phone + '</span></div>' +
'<div><b>الدكتور:</b> ' + LAB.escapeHtml(r.doctor || '—') + '</div>' +
(r.notes ? '<div><b>ملاحظات:</b> ' + LAB.escapeHtml(r.notes) + '</div>' : '') +
'</div><div>' +
'<h4>تحديد التحاليل</h4>' +
'<input id="rxSearch" class="input mt-1" placeholder=" ابحث واضغط للإضافة">' +
'<div id="rxRes" style="max-height:190px;overflow:auto;margin-top:8px"></div>' +
'<div class="mt-2"><b>التحاليل المختارة:</b><div id="rxSel" class="chips mt-1"></div></div>' +
'<div class="field mt-2"><label>سعر العرض النهائي (ج)</label><input id="rxPrice" class="input" type="number" value="' + (r.quoted || '') + '"></div>' +
'<div class="field"><label>رسالة للمريض</label><textarea id="rxReply" class="textarea">' + LAB.escapeHtml(r.reply || '') + '</textarea></div>' +
'<div class="field"><label>الحالة</label><select id="rxStatus" class="select">' +
['new', 'reviewing', 'quoted', 'done', 'rejected'].map(function (k) {
return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' + ({ new: 'جديد', reviewing: 'تحت المراجعة', quoted: 'تم التسعير', done: 'تم الحجز', rejected: 'مرفوض' })[k] + '</option>';
}).join('') + '</select></div>' +
'</div></div>';
var m = LAB.modal({
title: 'روشتة ' + r.code, html: html, wide: true,
buttons: [
{ text: ' حفظ', cls: 'btn-primary', action: function (bd, close) { doSave(); close(); } },
{ text: ' حفظ + إرسال واتساب', cls: 'btn-success', action: function (bd, close) { doSave(true); close(); } },
{ text: 'إغلاق' }
]
});
function renderSel() {
var w2 = $('#rxSel'); w2.innerHTML = '';
var total = 0;
selected.forEach(function (n) {
var t = d.tests.filter(function (x) { return x.name === n; })[0];
total += t ? t.price : 0;
w2.appendChild(LAB.el('span', { class: 'chip', style: 'background:var(--teal);color:#fff;border-color:var(--teal)' }, [
document.createTextNode(n + ' (' + (t ? t.price : 0) + 'ج) '),
LAB.el('b', { style: 'cursor:pointer', html: ' ×', onclick: function (e) { e.stopPropagation(); selected = selected.filter(function (x) { return x !== n; }); renderSel(); } })
]));
});
if (!$('#rxPrice').value) $('#rxPrice').value = total;
}
$('#rxSearch').addEventListener('input', function () {
var q = this.value.trim().toLowerCase(), w3 = $('#rxRes'); w3.innerHTML = '';
if (q.length < 2) return;
d.tests.filter(function (t) { return t.active && t.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 10).forEach(function (t) {
w3.appendChild(LAB.el('div', { class: 'file-chip', style: 'cursor:pointer', onclick: function () { if (selected.indexOf(t.name) < 0) { selected.push(t.name); renderSel(); } } }, [
LAB.el('b', { style: 'font-size:13px', html: LAB.escapeHtml(t.name) }),
LAB.el('span', { class: 'small', style: 'margin-inline-start:auto', html: t.price + ' ج' })
]));
});
});
renderSel();
function doSave(send) {
r.tests = selected; r.quoted = Number($('#rxPrice').value) || 0; r.reply = $('#rxReply').value; r.status = $('#rxStatus').value;
LAB.save();
LAB.notify('رد على روشتتك ', 'تم تحديد التحاليل والسعر: ' + LAB.money(r.quoted) + ' ج', 'rx', 'patient:' + r.phone);
LAB.log('مراجعة روشتة ' + r.code);
if (send) {
var msg = encodeURIComponent('السلام عليكم ' + r.name + ' \nمعكم معمل الحوشي للتحاليل \nبخصوص الروشتة رقم ' + r.code +
'\nالتحاليل المطلوبة:\n' + selected.map(function (n, i) { return (i + 1) + ') ' + n; }).join('\n') +
'\n السعر الإجمالي: ' + LAB.money(r.quoted) + ' جنيه' +
(r.reply ? '\n ' + r.reply : '') + '\n\nللحجز: تواصل معنا أو احجز أونلاين مباشرة ');
window.open('https://wa.me/' + String(r.phone).replace(/^0/, '2') + '?text=' + msg, '_blank');
}
LAB.toast('تم', 'تم حفظ مراجعة الروشتة', 'ok');
redraw && redraw();
}
}
/* ---------- CSV ---------- */
function csv(rows, name) {
var text = '\uFEFF' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
LAB.downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), name);
LAB.toast('تم', 'تم تنزيل الملف', 'ok');
}
ADM.csv = csv;
/* ---------- start ---------- */
document.addEventListener('DOMContentLoaded', function () {
var ses = LAB.getSession();
if (ses && ses.role === 'admin') {
var doc = d.doctors.filter(function (x) { return x.id === ses.id; })[0];
if (doc && doc.role === 'owner') start();
}
LAB.initFX();
});
})();
