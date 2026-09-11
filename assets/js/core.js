/* =========================================================
ELHOSHY LAB — Core (data layer, seed, utils, shell)
يعمل بدون إنترنت — كل البيانات في localStorage
========================================================= */
(function (global) {
'use strict';
var DB_KEY = 'elhoshy_lab_db_v1';
var SCHEMA = 4; // تغييره يفرض تحديث البيانات المحفوظة
var SESSION_KEY = 'elhoshy_lab_session_v1';
/* طبقة تخزين آمنة: تعمل حتى لو كان localStorage محجوباً (مثل المعاينة داخل iframe) */
var _mem = {};
function lsGet(k) { try { var v = localStorage.getItem(k); return v === null ? (_mem[k] === undefined ? null : _mem[k]) : v; } catch (e) { return _mem[k] === undefined ? null : _mem[k]; } }
function lsSet(k, v) { _mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { } }
function lsDel(k) { delete _mem[k]; try { localStorage.removeItem(k); } catch (e) { } }
/* ---------------- Seed data ---------------- */
function seed() {
var now = Date.now();
var tests = [
// سكر
['سكر صائم FBS', 'سكر', 70, 'دم', 2], ['سكر فاطري / بعد الأكل 2س PPBS', 'سكر', 70, 'دم', 2],
['سكر تراكمي HbA1c', 'سكر', 180, 'دم', 6], ['منحنى سكر كامل (5 سحبات)', 'سكر', 320, 'دم', 12],
['سكر عشوائي RBS', 'سكر', 60, 'دم', 1],
// كلى
['كرياتينين Creatinine', 'كلى', 90, 'دم', 3], ['يوريا Urea', 'كلى', 80, 'دم', 3],
['حمض اليوريك Uric Acid', 'كلى', 90, 'دم', 3], ['نيتروجين اليوريا BUN', 'كلى', 70, 'دم', 3],
['تحليل بول كامل Urine Analysis', 'كلى', 90, 'بول', 2], ['ألبومين في البول (شريط)', 'كلى', 60, 'بول', 1],
['ميكروألبومين Microalbumin', 'كلى', 170, 'بول', 4], ['كرياتينين في البول', 'كلى', 110, 'بول', 3],
['صوديوم Na', 'كلى', 90, 'دم', 2], ['بوتاسيوم K', 'كلى', 90, 'دم', 2], ['كالسيوم Ca', 'كلى', 90, 'دم', 2],
['فوسفور Phosphorus', 'كلى', 100, 'دم', 3], ['مغنيسيوم Mg', 'كلى', 120, 'دم', 3],
// كبد
['ALT (GPT)', 'كبد', 90, 'دم', 3], ['AST (GOT)', 'كبد', 90, 'دم', 3],
['البيليروبين الكلي Total Bilirubin', 'كبد', 90, 'دم', 3], ['البيليروبين المباشر Direct', 'كبد', 80, 'دم', 3],
['ألبومين Albumin', 'كبد', 90, 'دم', 3], ['فوسفاتاز قلوي ALP', 'كبد', 100, 'دم', 3],
['GGT', 'كبد', 120, 'دم', 3], ['LDH', 'كبد', 120, 'دم', 3], ['زمن البروثرومبين PT/INR', 'كبد', 160, 'دم', 4],
// دهون
['كوليسترول كلي', 'دهون', 90, 'دم', 3], ['دهون ثلاثية TG', 'دهون', 90, 'دم', 8],
['HDL', 'دهون', 100, 'دم', 3], ['LDL', 'دهون', 100, 'دم', 3], ['VLDL', 'دهون', 80, 'دم', 3],
// دم
['صورة دم كاملة CBC', 'دم', 130, 'دم', 3], ['ESR سرعة ترسيب', 'دم', 70, 'دم', 2],
['حديد Serum Iron', 'دم', 110, 'دم', 3], ['تخزين حديد Ferritin', 'دم', 250, 'دم', 6],
['TIBC سعة ارتباط الحديد', 'دم', 160, 'دم', 4], ['فوليك أسيد', 'دم', 240, 'دم', 6],
['فيتامين B12', 'دم', 260, 'دم', 6], ['صبغة الهيموجلوبين Hb Electrophoresis', 'دم', 400, 'دم', 24],
['صورة دم + لطاخة', 'دم', 180, 'دم', 4], [' reticulocyte شبكيات', 'دم', 140, 'دم', 4],
// هرمونات
['TSH', 'هرمونات', 200, 'دم', 6], ['Free T4', 'هرمونات', 200, 'دم', 6], ['Free T3', 'هرمونات', 200, 'دم', 6],
['T3', 'هرمونات', 180, 'دم', 6], ['T4', 'هرمونات', 180, 'دم', 6], ['Anti-TPO', 'هرمونات', 300, 'دم', 8],
['برولاكتين Prolactin', 'هرمونات', 250, 'دم', 6], ['كورتيزول Cortisol', 'هرمونات', 280, 'دم', 8],
['تستوستيرون Testosterone', 'هرمونات', 300, 'دم', 8], ['إستروجين E2', 'هرمونات', 300, 'دم', 8],
['FSH', 'هرمونات', 260, 'دم', 8], ['LH', 'هرمونات', 260, 'دم', 8], ['AMH مخزون المبيض', 'هرمونات', 600, 'دم', 24],
['بروجستيرون Progesterone', 'هرمونات', 280, 'دم', 8], ['هرمون النمو GH', 'هرمونات', 420, 'دم', 12],
['PTH هرمون الجاردرقية', 'هرمونات', 450, 'دم', 12], ['إنسولين صائم', 'هرمونات', 320, 'دم', 8],
// فيتامينات
['فيتامين D (25 OH)', 'فيتامينات', 450, 'دم', 12], ['فيتامين B12 + فوليك', 'فيتامينات', 420, 'دم', 8],
['زنك Zinc', 'فيتامينات', 220, 'دم', 6], ['كالسيوم أيوني', 'فيتامينات', 140, 'دم', 3],
// فيروسات ومناعة
['HBsAg', 'فيروسات', 180, 'دم', 6], ['HCV Ab', 'فيروسات', 180, 'دم', 6], ['HIV 1&2', 'فيروسات', 250, 'دم', 8],
['PCR كورونا', 'فيروسات', 700, 'مسحة', 12], ['إنفلونزا A/B سريع', 'فيروسات', 220, 'مسحة', 1],
['CRP', 'مناعة', 180, 'دم', 3], ['RF عامل روماتويد', 'مناعة', 190, 'دم', 4],
['ASO', 'مناعة', 170, 'دم', 4], ['ANA', 'مناعة', 350, 'دم', 12], ['Widal widal', 'مناعة', 130, 'دم', 4],
['Brucella بروسيلا', 'مناعة', 150, 'دم', 4], ['IgE كلي', 'مناعة', 300, 'دم', 6],
['D-Dimer', 'مناعة', 550, 'دم', 6],
// براز وبكتريا
['تحليل براز كامل', 'براز', 90, 'براز', 2], ['براز جارديا/أميبا', 'براز', 120, 'براز', 3],
['دم خفي في البراز', 'براز', 110, 'براز', 2], ['مزرعة بول + مضادات', 'ميكروبيولوجي', 320, 'بول', 48],
['مزرعة براز', 'ميكروبيولوجي', 300, 'براز', 48], ['مزرعة حلق', 'ميكروبيولوجي', 280, 'مسحة', 48],
['هليكوباكتر (براز)', 'ميكروبيولوجي', 260, 'براز', 2], ['هليكوباكتر (تنفس UBT)', 'ميكروبيولوجي', 600, 'تنفس', 1],
// أورام
['PSA كلي', 'أورام', 300, 'دم', 8], ['CEA', 'أورام', 380, 'دم', 12], ['CA 15-3', 'أورام', 400, 'دم', 12],
['CA 125', 'أورام', 400, 'دم', 12], ['CA 19-9', 'أورام', 400, 'دم', 12], ['AFP', 'أورام', 350, 'دم', 12],
['بيتا HCG رقمي (حمل)', 'أورام', 250, 'دم', 4],
// حمل وخصوبة
['تحليل حمل رقمي β-hCG', 'حمل', 200, 'دم', 3], ['تحليل حمل منزلي (بول)', 'حمل', 60, 'بول', 1],
['تحليل سائل منوي Semen Analysis', 'خصوبة', 280, 'سائل منوي', 3],
// بوليمراز وجيني
['PCR HBV (فيروس بي)', 'جيني', 1200, 'دم', 48], ['PCR HCV (فيروس سي)', 'جيني', 1400, 'دم', 48],
['Thalassemia PCR', 'جيني', 1500, 'دم', 72], ['Factor V Leiden', 'جيني', 1300, 'دم', 72],
// باطنة عامة
['بروتين كلي Total Protein', 'كيمياء', 90, 'دم', 3], ['أميليز Amylase', 'كيمياء', 140, 'دم', 4],
['ليبيز Lipase', 'كيمياء', 150, 'دم', 4], ['CPK', 'كيمياء', 160, 'دم', 4],
['Troponin I (قلب)', 'كيمياء', 480, 'دم', 2], ['CK-MB', 'كيمياء', 220, 'دم', 3]
];
var areas = [
['شنفاس', 50], ['البهو فريك', 50], ['السبخا', 60], ['ديرب', 60],
['بقطارس', 70], ['برج النور الحمص', 50], ['المنشيه', 60]
];
var days = 60;
var bookings = []; // لا توجد بيانات وهمية — النظام جاهز للعمل الفعلي
if (false) {
var names = ['أحمد محمود', 'محمد السيد', 'فاطمة علي', 'مروة عبدالله', 'إبراهيم حسن', 'نهى سامي',
'كريم أشرف', 'رانيا خالد', 'يوسف عمر', 'سماح عادل', 'هبة إبراهيم', 'طارق مجدي', 'دعاء مصطفى', 'شيماء فتحي',
'عمر الشريف', 'منة الله صلاح', 'ولاء حسين', 'أسماء جابر', 'محمود رضا', 'سارة وليد'];
var statusList = ['done', 'done', 'done', 'done', 'done', 'done', 'done', 'done', 'confirmed', 'confirmed', 'pending', 'cancelled'];
var i, j;
for (i = 0; i < 140; i++) {
var tIdx = [Math.floor(Math.random() * tests.length), Math.floor(Math.random() * tests.length), Math.floor(Math.random() * tests.length)];
var picked = [];
for (j = 0; j < tIdx.length; j++) {
if (picked.indexOf(tests[tIdx[j]][0]) < 0) picked.push(tests[tIdx[j]][0]);
}
var total = 0;
for (j = 0; j < picked.length; j++) {
for (var k = 0; k < tests.length; k++) { if (tests[k][0] === picked[j]) { total += tests[k][2]; break; } }
}
var isHome = Math.random() > 0.55;
var area = areas[Math.floor(Math.random() * areas.length)];
if (isHome) total += area[1];
var st = statusList[Math.floor(Math.random() * statusList.length)];
bookings.push({
id: uid(), code: 'ELH-' + (1000 + i),
patientName: names[Math.floor(Math.random() * names.length)],
phone: '010' + Math.floor(10000000 + Math.random() * 89999999),
whatsapp: '', age: 18 + Math.floor(Math.random() * 50),
gender: Math.random() > .5 ? 'ذكر' : 'أنثى',
sampleType: isHome ? 'home' : 'lab',
branchId: isHome ? '' : (Math.random() > .5 ? 'br1' : 'br2'),
areaId: isHome ? 'a' + areas.indexOf(area) : '',
address: isHome ? area[0] + ' - شارع رئيسي - عمارة ' + (1 + Math.floor(Math.random() * 30)) : '',
date: new Date(now - Math.floor(Math.random() * days) * 86400000).toISOString(),
time: ['09:00', '10:00', '11:30', '12:30', '02:00', '04:00', '06:30', '08:00'][Math.floor(Math.random() * 8)],
tests: picked, testsTotal: total - (isHome ? area[1] : 0), homeFee: isHome ? area[1] : 0,
discount: 0, total: total,
paymentMethod: Math.random() > .35 ? 'instapay' : 'cash',
paymentStatus: st === 'cancelled' ? 'unpaid' : (Math.random() > .25 ? 'paid' : 'unpaid'),
receipt: '', status: st, notes: '', doctorId: '', doctorName: '',
createdAt: new Date(now - Math.floor(Math.random() * days) * 86400000 - Math.floor(Math.random() * 86400000)).toISOString()
});
}
}
var testObjs = tests.map(function (t, idx) {
return {
id: 't' + (idx + 1), name: t[0], category: t[1], price: t[2], sample: t[3],
hours: t[4], fasting: (t[1] === 'دهون' || t[1] === 'سكر' || (t[1] === 'كيمياء' && t[0].indexOf('سكر') >= 0)),
active: true, homeExtra: 0
};
});
var areaObjs = areas.map(function (a, idx) { return { id: 'a' + idx, name: a[0], fee: a[1], active: true }; });
return {
settings: {
labName: 'معمل الحوشي للتحاليل الطبية',
labShort: 'الحوشي',
ownerName: 'د. محمد الحوشي',
ownerTitle: 'ماجستير التحاليل الطبية',
ownerBio: 'خبرة تزيد عن 7 سنوات في مجال التحاليل الطبية والإشراف على معامل التحاليل، مع اعتماد أحدث أجهزة التحليل العالمية لضمان أدق النتائج في أسرع وقت.',
phones: ['01023290567'],
whatsapp: '201023290567',
instapay: '01010168622',
instapayName: 'معمل الحوشي للتحاليل',
email: 'info@elhoshy-lab.com',
address: 'برج النور الحمص',
workFrom: '08:00', workTo: '23:00',
closedDays: [5], // الجمعة
homeServiceEnabled: true,
lockMinutes: 20,
homeBaseFee: 50,
slotMinutes: 30,
about: 'معمل الحوشي للتحاليل الطبية - فرعين لخدمتكم في الدقهلية. نقدم خدمات التحاليل الطبية الشاملة بأحدث الأجهزة، مع خدمة السحب المنزلي ونتائج دقيقة تُسلَّم في نفس اليوم.',
heroTitle: 'دقة في التحليل .. ثقة في النتيجة',
heroSub: 'احجز تحليلك أونلاين في دقيقه، واختار السحب في المعمل أو من بيتك، وادفع كاش أو انستا باي — واستلم نتيجتك إلكترونياً.'
},
branches: [
{ id: 'br1', name: 'فرع برج النور الحمص', address: 'برج النور الحمص', phone: '01023290567', hours: 'يومياً 8ص - 11م', active: true, lat: '', lng: '' },
{ id: 'br2', name: 'فرع منشأه الاخوة', address: 'منشأة الاخوة', phone: '01023290567', hours: 'يومياً 8ص - 11م', active: true, lat: '', lng: '' }
],
doctors: [
{ id: 'd1', name: 'د. محمد الحوشي', title: 'ماجستير التحاليل الطبية', specialty: 'كيمياء سريرية & هرمونات', phone: '01023290567', username: 'admin', password: 'Mo@010', role: 'owner', active: true, commission: 0, homePrices: {}, avatar: 'assets/img/doctor.jpg', bio: '' },
{ id: 'd2', name: 'د. هبة سعيد', title: 'أخصائي باثولوجيا إكلينيكية', specialty: 'هيماتولوجي & بنك دم', phone: '', username: 'heba', password: '123456', role: 'doctor', active: true, commission: 15, homePrices: {}, avatar: '', bio: '' },
{ id: 'd3', name: 'د. كريم عادل', title: 'أخصائي ميكروبيولوجي', specialty: 'مزارع & PCR', phone: '', username: 'kareem', password: '123456', role: 'doctor', active: true, commission: 15, homePrices: {}, avatar: '', bio: '' }
],
tests: testObjs,
packages: [
{ id: 'p1', name: 'باقة الفحص الشامل', desc: 'صورة دم + سكر + كلى + كبد + دهون + بول', tests: ['صورة دم كاملة CBC', 'سكر صائم FBS', 'كرياتينين Creatinine', 'يوريا Urea', 'ALT (GPT)', 'AST (GOT)', 'كوليسترول كلي', 'دهون ثلاثية TG', 'تحليل بول كامل Urine Analysis'], price: 650, active: true },
{ id: 'p2', name: 'باقة السكر الشاملة', desc: 'سكر صائم + فاطري + تراكمي + بول', tests: ['سكر صائم FBS', 'سكر فاطري / بعد الأكل 2س PPBS', 'سكر تراكمي HbA1c', 'ميكروألبومين Microalbumin'], price: 420, active: true },
{ id: 'p3', name: 'باقة الأنيميا', desc: 'صورة دم + حديد + تخزين + B12 + فوليك', tests: ['صورة دم كاملة CBC', 'حديد Serum Iron', 'تخزين حديد Ferritin', 'فيتامين B12', 'فوليك أسيد'], price: 750, active: true },
{ id: 'p4', name: 'باقة الغدة الدرقية', desc: 'TSH + Free T4 + Free T3 + Anti-TPO', tests: ['TSH', 'Free T4', 'Free T3', 'Anti-TPO'], price: 800, active: true },
{ id: 'p5', name: 'باقة وظائف الكلى', desc: 'كرياتينين + يوريا + حمض يوريك + صوديوم + بوتاسيوم', tests: ['كرياتينين Creatinine', 'يوريا Urea', 'حمض اليوريك Uric Acid', 'صوديوم Na', 'بوتاسيوم K'], price: 400, active: true },
{ id: 'p6', name: 'باقة وظائف الكبد', desc: 'ALT + AST + بيليروبين + ألبومين + ALP + GGT', tests: ['ALT (GPT)', 'AST (GOT)', 'البيليروبين الكلي Total Bilirubin', 'ألبومين Albumin', 'فوسفاتاز قلوي ALP', 'GGT'], price: 550, active: true },
{ id: 'p7', name: 'باقة فيتامينات', desc: 'فيتامين D + B12 + فوليك + زنك + كالسيوم', tests: ['فيتامين D (25 OH)', 'فيتامين B12', 'فوليك أسيد', 'زنك Zinc', 'كالسيوم Ca'], price: 1100, active: true },
{ id: 'p8', name: 'باقة ما قبل الزواج', desc: 'صورة دم + سكر + كلى + كبد + فيروسات + مناعة', tests: ['صورة دم كاملة CBC', 'سكر صائم FBS', 'كرياتينين Creatinine', 'ALT (GPT)', 'HBsAg', 'HCV Ab', 'HIV 1&2', 'تحليل بول كامل Urine Analysis'], price: 950, active: true },
{ id: 'p9', name: 'باقة الخصوبة (سيدات)', desc: 'FSH + LH + برولاكتين + AMH + إستروجين', tests: ['FSH', 'LH', 'برولاكتين Prolactin', 'AMH مخزون المبيض', 'إستروجين E2'], price: 1800, active: true },
{ id: 'p10', name: 'باقة القلب', desc: 'دهون شاملة + Troponin + CK-MB + CPK', tests: ['كوليسترول كلي', 'دهون ثلاثية TG', 'HDL', 'LDL', 'Troponin I (قلب)', 'CK-MB'], price: 1300, active: true }
],
areas: areaObjs,
offers: [],
coupons: [
{ id: 'c1', code: 'WELCOME10', type: 'percent', value: 10, max: 5, used: 0, active: true },
{ id: 'c2', code: 'LAB50', type: 'flat', value: 50, max: 100, used: 0, active: true }
],
reviews: [
{ id: 'r1', name: 'أحمد محمود', area: 'شنفاس', rate: 5, text: 'دقة في النتائج وسرعة في التسليم، وخدمة السحب المنزلي ممتازة. شكراً د. محمد على الاهتمام.', active: true, date: new Date(now - 86400000 * 4).toISOString() },
{ id: 'r2', name: 'مروة عبدالله', area: 'البهو فريك', rate: 5, text: 'أفضل معامل المنطقة، النتائج بتوصل على الواتساب في نفس اليوم والتعامل راقي جداً.', active: true, date: new Date(now - 86400000 * 9).toISOString() },
{ id: 'r3', name: 'إبراهيم حسن', area: 'السبخا', rate: 5, text: 'الحجز أونلاين سهل جداً والدفع بانستا باي وفّر عليّ وقت كبير. أنصح بيه بشدة.', active: true, date: new Date(now - 86400000 * 15).toISOString() },
{ id: 'r4', name: 'فاطمة علي', area: 'ديرب', rate: 5, text: 'المعمل نظيف جداً والأجهزة حديثة، والاستقبال محترم. النتيجة جت مظبوطة ومطابقة لمعمل تاني.', active: true, date: new Date(now - 86400000 * 21).toISOString() },
{ id: 'r5', name: 'كريم أشرف', area: 'بقطارس', rate: 5, text: 'رفعت الروشتة من الموقع وردوا عليّ بالسعر في دقايق. تجربة محترمة جداً.', active: true, date: new Date(now - 86400000 * 27).toISOString() },
{ id: 'r6', name: 'رانيا خالد', area: 'برج النور الحمص', rate: 5, text: 'باقة ما قبل الزواج كانت شاملة وواضحة، والسعر أفضل من أي مكان تاني. ربنا يبارك.', active: true, date: new Date(now - 86400000 * 33).toISOString() }
],
faqs: [
{ q: 'إزاي أحجز تحليل أونلاين؟', a: 'ادخل على صفحة "احجز الآن"، واختار التحاليل أو الباقة، وحدد الفرع أو السحب المنزلي، واختار المعاد وطريقة الدفع (كاش أو انستا باي). هتوصلك رسالة تأكيد برقم الحجز.' },
{ q: 'هل لازم أكون صايم قبل التحليل؟', a: 'بعض التحاليل زي السكر والدهون تحتاج صيام من 8 لـ 12 ساعة. هتلاقي ملاحظة الصيام مكتوبة مع كل تحليل في الموقع.' },
{ q: 'النتيجة بتوصل إمتى وإزاي؟', a: 'أغلب النتائج بتكون جاهزة في نفس اليوم، وبتوصلك على واتسابك وبتقدر تحمّلها PDF من حسابك على الموقع.' },
{ q: 'خدمة السحب المنزلي متاحة فين؟', a: 'متاحة في كل مراكز الدقهلية، ورسوم السحب بتختلف حسب المنطقة وبيتم حسابها تلقائياً في خطوة الدفع.' },
{ q: 'طرق الدفع إيه؟', a: 'تقدر تدفع كاش وقت الكشف أو وقت الحضور للفرع، أو تحول على انستا باي على الرقم 01010168622 وترفع صورة الإيصال من الموقع.' },
{ q: 'ممكن ألغي أو أعدل الحجز؟', a: 'أيوه، من صفحة "تتبع الحجز" برقم الحجز ورقم الموبايل، أو تواصل معنا على 01023290567.' }
],
bookings: bookings,
prescriptions: [],
patients: [],
results: [],
expenses: [],
activity: [],
notifications: [],
counters: { booking: 0, patient: 0, prescription: 0 }
};
}
/* ---------------- tiny utils ---------------- */
function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function el(tag, attrs, children) {
var n = document.createElement(tag);
if (attrs) Object.keys(attrs).forEach(function (k) {
if (k === 'class') n.className = attrs[k];
else if (k === 'html') n.innerHTML = attrs[k];
else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
});
var kids = [];
(function flat(arr) {
arr.forEach(function (c) { Array.isArray(c) ? flat(c) : kids.push(c); });
})((children == null) ? [] : (Array.isArray(children) ? children : [children]));
kids.forEach(function (c) {
if (c === null || c === undefined || c === false) return;
n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
});
return n;
}
function money(n) { return (Math.round(Number(n || 0) * 100) / 100).toLocaleString('en-US'); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dstr(d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function fmtDate(v, withTime) {
var d = new Date(v);
if (isNaN(d)) return '—';
var months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
var s = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
if (withTime) s += ' — ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
return s;
}
function ago(v) {
var diff = Date.now() - new Date(v).getTime();
var m = Math.round(diff / 60000);
if (m < 1) return 'الآن';
if (m < 60) return 'منذ ' + m + ' دقيقة';
var h = Math.round(m / 60);
if (h < 24) return 'منذ ' + h + ' ساعة';
var dd = Math.round(h / 24);
if (dd < 30) return 'منذ ' + dd + ' يوم';
return fmtDate(v);
}
function escapeHtml(s) {
return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
});
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
/* ---------------- DB ---------------- */
var DB = null;
function load() {
try {
var raw = lsGet(DB_KEY);
DB = raw ? JSON.parse(raw) : null;
} catch (e) { DB = null; }
if (!DB || !DB.settings) { DB = seed(); save(); }
// ترقية آمنة للحقول الجديدة
var def = seed();
Object.keys(def).forEach(function (k) { if (DB[k] === undefined) DB[k] = def[k]; });
Object.keys(def.settings).forEach(function (k) { if (DB.settings[k] === undefined) DB.settings[k] = def.settings[k]; });
// توحيد صيغة التاريخ (YYYY-MM-DD) + تأمين الحقول الفرعية
DB.bookings.forEach(function (b) {
if (b.date && b.date.length > 10 && !isNaN(new Date(b.date))) b.date = dstr(b.date);
if (!b.files) b.files = [];
if (b.testsTotal == null) b.testsTotal = b.total || 0;
});
DB.doctors.forEach(function (x) { if (!x.homePrices) x.homePrices = {}; });
DB.patients.forEach(function (p) { if (!p.files) p.files = []; });
if (DB.version !== SCHEMA) { migrate(DB); DB.version = SCHEMA; save(); }
return DB;
}
function migrate(db) {
// المدير: اسم المستخدم وكلمة المرور المطلوبة
var owner = null;
db.doctors.forEach(function (x) { if (x.role === 'owner') owner = x; });
if (!owner) {
owner = { id: 'd1', name: db.settings.ownerName, title: db.settings.ownerTitle, username: 'admin', role: 'owner', active: true, commission: 0, homePrices: {}, avatar: '' };
db.doctors.unshift(owner);
}
owner.username = 'admin';
owner.password = 'Mo@010';
owner.active = true;
// الفروع والمناطق
var hasReal = db.branches.some(function (b) { return b.name.indexOf('برج النور') >= 0; });
if (!hasReal) {
db.branches = [
{ id: 'br1', name: 'فرع برج النور الحمص', address: 'برج النور الحمص', phone: db.settings.phones[0], hours: 'يومياً 8ص - 11م', active: true, lat: '', lng: '' },
{ id: 'br2', name: 'فرع منشأه الاخوة', address: 'منشأة الاخوة', phone: db.settings.phones[0], hours: 'يومياً 8ص - 11م', active: true, lat: '', lng: '' }
];
}
var areaNames = ['شنفاس', 'البهو فريك', 'السبخا', 'ديرب', 'بقطارس', 'برج النور الحمص', 'المنشيه'];
var fees = [50, 50, 60, 60, 70, 50, 60];
var hasArea = db.areas.some(function (a) { return a.name === 'شنفاس'; });
if (!hasArea) {
db.areas = areaNames.map(function (n, i) { return { id: 'a' + i, name: n, fee: fees[i], active: true }; });
}
// تنظيف أي بيانات تجريبية
db.bookings = []; db.patients = []; db.prescriptions = [];
db.expenses = []; db.activity = []; db.notifications = [];
db.counters = { booking: 0, patient: 0, prescription: 0 };
db.offers = [];
db.log = null; delete db.log;
}
function save() {
try { lsSet(DB_KEY, JSON.stringify(DB)); return true; }
catch (e) { toast('خطأ', 'مساحة التخزين ممتلئة — جرّب حذف بعض الصور أو تصدير نسخة.', 'err'); return false; }
}
function db() { return DB || load(); }
function resetDB() { lsDel(DB_KEY); DB = seed(); save(); }
function exportDB() {
var blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
downloadBlob(blob, 'elhoshy-lab-backup-' + dstr(new Date()) + '.json');
}
function importDB(file, cb) {
var fr = new FileReader();
fr.onload = function () {
try {
var o = JSON.parse(fr.result);
if (!o.settings || !o.bookings) throw 0;
DB = o; save(); toast('تم', 'تم استيراد النسخة الاحتياطية بنجاح', 'ok'); cb && cb();
} catch (e) { toast('خطأ', 'ملف غير صالح', 'err'); }
};
fr.readAsText(file);
}
/* ---------------- Session ---------------- */
function getSession() { try { return JSON.parse(lsGet(SESSION_KEY) || 'null'); } catch (e) { return null; } }
function setSession(s) { lsSet(SESSION_KEY, JSON.stringify(s)); }
function logout() { lsDel(SESSION_KEY); }
function currentUser() {
var s = getSession();
if (!s) return null;
if (s.role === 'admin') return { role: 'admin', name: db().settings.ownerName, id: 'admin' };
if (s.role === 'doctor') {
var d = db().doctors.filter(function (x) { return x.id === s.id; })[0];
return d ? { role: 'doctor', name: d.name, id: d.id, doc: d } : null;
}
if (s.role === 'patient') {
var p = db().patients.filter(function (x) { return x.id === s.id; })[0];
return p ? { role: 'patient', name: p.name, id: p.id, pat: p } : null;
}
return null;
}
/* ---------------- Toast ---------------- */
function toast(title, msg, type) {
var wrap = $('#toasts');
if (!wrap) { wrap = el('div', { id: 'toasts' }); document.body.appendChild(wrap); }
var icons = { ok: '', err: '', warn: '', info: '' };
var t = el('div', { class: 'toast ' + (type || 'info') }, [
el('span', { class: 'ic', html: icons[type] || icons.info }),
el('div', {}, [el('b', { html: escapeHtml(title) }), msg ? el('p', { html: escapeHtml(msg) }) : null])
]);
wrap.appendChild(t);
setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 3800);
}
/* ---------------- Modal ---------------- */
function modal(opts) {
var bd = el('div', { class: 'modal-backdrop' });
var head = el('div', { class: 'modal-head' }, [
el('h4', { html: opts.title || '' }),
el('button', { class: 'x', onclick: function () { close(); }, html: '&times;' })
]);
var body = el('div', { class: 'modal-body' }, []);
var foot = el('div', { class: 'modal-foot' }, []);
var box = el('div', { class: 'modal ' + (opts.wide ? 'wide' : '') }, [head, body, foot]);
if (opts.html) body.innerHTML = opts.html;
if (opts.node) body.appendChild(opts.node);
(opts.buttons || [{ text: 'إغلاق' }]).forEach(function (b) {
var btn = el('button', { class: 'btn ' + (b.cls || 'btn-ghost'), html: b.text, onclick: function () { b.action ? b.action(body, close) : close(); } });
foot.appendChild(btn);
});
function close() { bd.remove(); document.body.style.overflow = ''; }
bd.appendChild(box);
bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
document.body.appendChild(bd);
document.body.style.overflow = 'hidden';
setTimeout(function () { var f = body.querySelector('input,select,textarea'); f && f.focus(); }, 120);
return { close: close, body: body, box: box };
}
function confirmBox(title, msg, onYes, yesText) {
return modal({
title: title, html: '<p style="color:var(--text-soft)">' + escapeHtml(msg) + '</p>',
buttons: [{ text: 'إلغاء' }, { text: yesText || 'تأكيد', cls: 'btn-danger', action: function (b, close) { close(); onYes(); } }]
});
}
/* ---------------- Files ---------------- */
function fileToDataURL(file, maxW, quality, cb) {
var fr = new FileReader();
fr.onload = function () {
var img = new Image();
img.onload = function () {
var w = img.width, h = img.height;
var scale = Math.min(1, (maxW || 1000) / w);
var c = document.createElement('canvas');
c.width = Math.round(w * scale); c.height = Math.round(h * scale);
c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
cb(c.toDataURL('image/jpeg', quality || 0.72), file.name);
};
img.onerror = function () { cb(fr.result, file.name); };
img.src = fr.result;
};
fr.readAsDataURL(file);
}
function downloadBlob(blob, name) {
var a = document.createElement('a');
a.href = URL.createObjectURL(blob); a.download = name;
document.body.appendChild(a); a.click(); a.remove();
setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
}
function baseURL() {
var h = location.href.split('#')[0].split('?')[0];
return h.replace(/[^\/]*$/, '');
}
function trackURL(code) { return baseURL() + 'track.html?c=' + encodeURIComponent(code); }
function siteURL() { return baseURL(); }
function qr(text, size) {
try { return (global.QR && global.QR.svg) ? global.QR.svg(text, size || 140, 2) : ''; }
catch (e) { return ''; }
}
function copyText(t) {
if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t); }
else {
var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
ta.select(); document.execCommand('copy'); ta.remove();
}
toast('تم النسخ', t, 'ok');
}
/* ---------------- Activity log ---------------- */
function log(text, type) {
db().activity.unshift({ id: uid(), text: text, type: type || 'info', at: new Date().toISOString(), by: (currentUser() || {}).name || 'زائر' });
if (db().activity.length > 400) db().activity.length = 400;
save();
}
function notify(title, body, type, to) {
db().notifications.unshift({ id: uid(), title: title, body: body, type: type || 'info', to: to || 'admin', at: new Date().toISOString(), read: false });
if (db().notifications.length > 200) db().notifications.length = 200;
save();
}
/* ---------------- Shell (header/footer) ---------------- */
var NAV = [
{ href: 'index.html', label: 'الرئيسية' },
{ href: 'index.html#services', label: 'خدماتنا' },
{ href: 'tests.html', label: 'التحاليل والأسعار' },
{ href: 'booking.html', label: 'احجز الآن' },
{ href: 'prescription.html', label: 'ارفع الروشتة' },
{ href: 'track.html', label: 'تتبع الحجز' },
{ href: 'patient.html', label: 'ملفي الطبي' },
{ href: 'contact.html', label: 'تواصل معنا' }
];
function buildShell(active) {
var s = db().settings;
var here = location.pathname.split('/').pop() || 'index.html';
var header = el('header', { class: 'site-header' });
var inner = el('div', { class: 'container header-inner' });
var logo = el('a', { href: 'index.html', class: 'logo' }, [
el('div', { class: 'logo-mark', html: 'حـ' }),
el('div', {}, [el('span', { html: escapeHtml(s.labName) }), el('small', { html: escapeHtml(s.ownerName + ' — ' + s.ownerTitle) })])
]);
var nav = el('nav', { class: 'nav' });
NAV.forEach(function (n) {
var a = el('a', { href: n.href, html: escapeHtml(n.label) });
if (active === n.href || (n.href.indexOf('index.html') === 0 && active === 'index.html#' && false)) a.className = 'active';
if (n.href === here) a.className = 'active';
nav.appendChild(a);
});
var actions = el('div', { class: 'header-actions' }, [
el('a', { href: 'tel:' + s.phones[0], class: 'btn btn-primary btn-sm no-print', html: icon('phone', 16) + ' ' + escapeHtml(s.phones[0]) }),
el('button', {
class: 'theme-btn no-print', title: 'تبديل الوضع الليلي / النهاري', 'aria-label': 'تبديل الوضع',
html: '<span class="ic-moon">' + icon('moon', 19) + '</span><span class="ic-sun">' + icon('sun', 19) + '</span>',
onclick: function () { toggleTheme(); }
}),
el('button', { class: 'burger', onclick: function () { $('#mobileNav').classList.toggle('open'); }, html: '<i></i><i></i><i></i>' })
]);
inner.appendChild(logo); inner.appendChild(nav); inner.appendChild(actions);
header.appendChild(inner);
var mnav = el('nav', { class: 'mobile-nav', id: 'mobileNav' });
var mc = el('div', { class: 'container' });
NAV.concat([{ href: 'admin.html', label: ' لوحة المدير' }, { href: 'doctor.html', label: ' لوحة الطبيب' }]).forEach(function (n) {
mc.appendChild(el('a', { href: n.href, html: escapeHtml(n.label), onclick: function () { $('#mobileNav').classList.remove('open'); } }));
});
mnav.appendChild(mc);
document.body.insertBefore(mnav, document.body.firstChild);
document.body.insertBefore(header, document.body.firstChild);
/* شريط تقدم القراءة + شريط إعلاني متحرك */
var prog = el('div', { id: 'progress' }, [el('div')]);
document.body.appendChild(prog);
var tkItems = [];
db().branches.forEach(function (b) { if (b.active !== false) tkItems.push(['pin', b.name]); });
db().areas.slice(0, 7).forEach(function (a) { tkItems.push(['home', 'سحب منزلي - ' + a.name]); });
tkItems.push(['card', 'دفع انستا باي', 'mini']);
tkItems.push(['card', s.instapay, 'mini']);
tkItems.push(['chat', 'واتساب المعمل', 'mini']);
tkItems.push(['chat', s.phones[0], 'mini']);
tkItems.push(['bolt', 'نتائج في نفس اليوم']);
var tk = el('div', { class: 'ticker-track' });
for (var _r = 0; _r < 2; _r++) {
tkItems.forEach(function (it) {
tk.appendChild(el('span', {
class: it[2] === 'mini' ? 'mini' : '',
html: icon(it[0], 13) + '<span>' + escapeHtml(it[1]) + '</span>'
}));
});
}
document.body.appendChild(el('div', { class: 'ticker' }, [tk]));
window.addEventListener('scroll', function () {
var h = document.documentElement;
var pct = h.scrollTop / Math.max(1, (h.scrollHeight - h.clientHeight));
var bar = prog.firstChild; if (bar) bar.style.width = (pct * 100) + '%';
});
// فوتر
var f = el('footer', { class: 'site-footer' });
var fc = el('div', { class: 'container' });
var fg = el('div', { class: 'grid g4' });
fg.appendChild(el('div', {}, [
el('h5', { html: escapeHtml(s.labName) }),
el('p', { style: 'font-size:14px;opacity:.85', html: escapeHtml(s.about.slice(0, 150)) + '…' }),
el('div', { class: 'row mt-2' }, [
el('a', { href: 'https://wa.me/' + s.whatsapp, target: '_blank', html: ' واتساب' }),
el('a', { href: 'https://www.instagram.com/', target: '_blank', html: ' انستجرام' }),
el('a', { href: 'https://www.facebook.com/', target: '_blank', html: ' فيسبوك' })
])
]));
fg.appendChild(el('div', {}, [
el('h5', { html: 'روابط سريعة' }),
el('div', { style: 'display:grid' }, NAV.map(function (n) { return el('a', { href: n.href, html: escapeHtml(n.label) }); }))
]));
var br = el('div', {}, [el('h5', { html: 'فروعنا' })]);
db().branches.forEach(function (b) {
br.appendChild(el('div', { style: 'margin-bottom:12px;font-size:14px' }, [
el('b', { html: escapeHtml(b.name) }),
el('div', { style: 'opacity:.8', html: escapeHtml(b.address) }),
el('div', { style: 'opacity:.8', dir: 'ltr', html: ' ' + escapeHtml(b.phone) })
]));
});
fg.appendChild(br);
fg.appendChild(el('div', {}, [
el('h5', { html: 'تواصل معنا' }),
el('div', { style: 'display:grid;gap:6px;font-size:14px' }, [
el('a', { href: 'tel:' + s.phones[0], html: ' ' + escapeHtml(s.phones[0]) }),
el('a', { href: 'mailto:' + s.email, html: ' ' + escapeHtml(s.email) }),
el('span', { html: ' انستا باي: ' }),
el('b', { dir: 'ltr', style: 'color:var(--gold-2)', html: escapeHtml(s.instapay) }),
el('span', { html: ' ' + escapeHtml(s.workFrom) + ' - ' + escapeHtml(s.workTo) + ' يومياً' })
])
]));
fc.appendChild(fg);
fc.appendChild(el('div', { class: 'footer-bottom', html: '© ' + new Date().getFullYear() + ' ' + escapeHtml(s.labName) + ' — جميع الحقوق محفوظة. <a href="privacy.html" style="margin-inline-start:10px">سياسة الخصوصية</a>' }));
f.appendChild(fc);
document.body.appendChild(f);
// أزرار عائمة
var fabs = el('div', { class: 'fabs no-print' }, [
el('a', { href: 'https://wa.me/' + s.whatsapp, target: '_blank', class: 'fab fab-wa', html: '<span>واتساب</span>' }),
el('a', { href: 'tel:' + s.phones[0], class: 'fab fab-call', html: '<span>اتصل بنا</span>' }),
el('button', { class: 'fab fab-top', onclick: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); }, html: '↑<span>للأعلى</span>' })
]);
document.body.appendChild(fabs);
// سكرول
window.addEventListener('scroll', function () {
var h = $('.site-header'); if (h) h.classList.toggle('scrolled', window.scrollY > 20);
});
// تفعيل العمل بدون إنترنت (PWA)
try {
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
navigator.serviceWorker.register('sw.js').catch(function () { });
}
} catch (e) { }
var ic = $('#themeIcon'); if (ic) ic.textContent = '';
}
function currentTheme() {
var t = document.documentElement.getAttribute('data-theme');
return t === 'dark' ? 'dark' : 'light';
}
function toggleTheme() {
var next = currentTheme() === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', next);
lsSet('theme', next);
try { window.dispatchEvent(new CustomEvent('themechange', { detail: next })); } catch (e) {}
var m = document.querySelector('meta[name="theme-color"]');
if (m) m.setAttribute('content', next === 'dark' ? '#04101c' : '#0e7490');
}
function initTheme() {
var saved = lsGet('theme');
var t = (saved === 'dark' || saved === 'light') ? saved : 'light'; /* الافتراضي: نهاري */
document.documentElement.setAttribute('data-theme', t);
var m = document.querySelector('meta[name="theme-color"]');
if (m) m.setAttribute('content', t === 'dark' ? '#04101c' : '#0e7490');
}
/* ---------------- Reveal & counters & ripple ---------------- */
function initFX() {
var io = new IntersectionObserver(function (es) {
es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
$$('.reveal,.reveal-left,.reveal-right').forEach(function (n) { io.observe(n); });
var counters = $$('[data-count]');
if (counters.length) {
var io2 = new IntersectionObserver(function (es) {
es.forEach(function (e) {
if (!e.isIntersecting) return;
io2.unobserve(e.target);
var target = parseFloat(e.target.getAttribute('data-count'));
var suff = e.target.getAttribute('data-suffix') || '';
var dur = 1600, st = performance.now();
(function step(now) {
var p = Math.min(1, (now - st) / dur);
var v = Math.round(target * (1 - Math.pow(1 - p, 3)));
e.target.textContent = v.toLocaleString('en-US') + suff;
if (p < 1) requestAnimationFrame(step);
})(st);
});
}, { threshold: .4 });
counters.forEach(function (n) { io2.observe(n); });
}
$$('.acc-head').forEach(function (h) {
h.addEventListener('click', function () {
var acc = h.parentElement;
var open = acc.classList.contains('open');
$$('.acc').forEach(function (a) { a.classList.remove('open'); a.querySelector('.acc-body').style.maxHeight = null; });
if (!open) { acc.classList.add('open'); var b = acc.querySelector('.acc-body'); b.style.maxHeight = b.scrollHeight + 'px'; }
});
});
document.addEventListener('click', function (e) {
var b = e.target.closest && e.target.closest('.btn');
if (!b) return;
var r = document.createElement('span'); r.className = 'ripple';
var d = Math.max(b.clientWidth, b.clientHeight);
r.style.width = r.style.height = d + 'px';
r.style.left = (e.clientX - b.getBoundingClientRect().left - d / 2) + 'px';
r.style.top = (e.clientY - b.getBoundingClientRect().top - d / 2) + 'px';
b.appendChild(r); setTimeout(function () { r.remove(); }, 620);
});
watchIcons();
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var m = $('.modal-backdrop'); if (m) m.remove(); document.body.style.overflow = ''; } });
}
/* ---------------- Particles ---------------- */
var REDUCED = (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
function initParticles(canvas) {
if (!canvas) return;
/* تخطي الجزيئات على الأجهزة الضعيفة/الشاشات الصغيرة — بيمنع تهنيج الصفحة */
var smallScreen = (window.innerWidth || 1024) < 700;
var weakDevice = (navigator.hardwareConcurrency || 4) <= 2;
if (REDUCED || smallScreen || weakDevice) { canvas.style.display = 'none'; return; }
var ctx = canvas.getContext('2d'), W, H, dots = [], mouse = { x: -999, y: -999 }, running = true;
function size() {
var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
W = canvas.width = r.width * dpr; H = canvas.height = r.height * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W /= dpr; H /= dpr;
}
function build() {
dots = [];
var n = Math.min(48, Math.round((W * H) / 34000));
for (var i = 0; i < n; i++) dots.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .34, vy: (Math.random() - .5) * .34, r: Math.random() * 2.3 + .9 });
}
function tick() {
if (document.hidden) { requestAnimationFrame(tick); return; }
ctx.clearRect(0, 0, W, H);
var dark = document.documentElement.getAttribute('data-theme') === 'dark';
var c1 = dark ? '34,211,238' : '14,124,134';
for (var i = 0; i < dots.length; i++) {
var d = dots[i]; d.x += d.vx; d.y += d.vy;
if (d.x < 0 || d.x > W) d.vx *= -1; if (d.y < 0 || d.y > H) d.vy *= -1;
ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.3);
ctx.fillStyle = 'rgba(' + c1 + ',.5)'; ctx.fill();
for (var j = i + 1; j < dots.length; j++) {
var o = dots[j], dx = d.x - o.x, dy = d.y - o.y, dist = Math.hypot(dx, dy);
if (dist < 118) {
ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(o.x, o.y);
ctx.strokeStyle = 'rgba(' + c1 + ',' + (0.16 * (1 - dist / 118)) + ')'; ctx.lineWidth = 1; ctx.stroke();
}
}
var md = Math.hypot(d.x - mouse.x, d.y - mouse.y);
if (md < 130) {
ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(mouse.x, mouse.y);
ctx.strokeStyle = 'rgba(242,169,59,.18)'; ctx.stroke();
}
}
requestAnimationFrame(tick);
}
size(); build(); tick();
window.addEventListener('resize', function () { size(); build(); });
canvas.parentElement.addEventListener('mousemove', function (e) {
var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
});
canvas.parentElement.addEventListener('mouseleave', function () { mouse.x = mouse.y = -999; });
window.addEventListener('themechange', function () { });
}
/* ---------------- Validation ---------------- */
function validatePhone(p) {
p = String(p || '').replace(/[\s\-+]/g, '');
p = p.replace(/^00/, '');
if (p.indexOf('0') !== 0) p = '0' + p.replace(/^20/, '');
return /^01[0125][0-9]{8}$/.test(p) ? p : null;
}
function required(val, name) {
if (String(val == null ? '' : val).trim() === '') { toast('مطلوب', 'برجاء إدخال ' + name, 'warn'); return false; }
return true;
}
/* ---------------- أيقونات SVG (بديل الإيموجي) ---------------- */
var ICONS = {
flask: '<path d="M9.5 3h5M10 3v6.6L5.4 17.4A2 2 0 0 0 7.1 20.5h9.8a2 2 0 0 0 1.7-3.1L14 9.6V3"/><path d="M7.4 14h9.2"/>',
home: '<path d="M3.2 10.4 12 3.6l8.8 6.8V20a1 1 0 0 1-1 1h-4.6v-6.4H8.8V21H4.2a1 1 0 0 1-1-1z"/>',
pin: '<path d="M12 21.3s7-6.2 7-11.1A7 7 0 0 0 5 10.2c0 4.9 7 11.1 7 11.1z"/><circle cx="12" cy="10" r="2.6"/>',
phone: '<path d="M21 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 4.1 4.2 2 2 0 0 1 6.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L10.2 9.7a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1z"/>',
chat: '<path d="M21 11.6a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3.6 21l1.4-4.1A8.4 8.4 0 0 1 12 3.6a8.4 8.4 0 0 1 9 8z"/>',
clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/>',
users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.4 5.2a3.4 3.4 0 0 1 0 6.6M17.6 14.4A6.2 6.2 0 0 1 21.2 20"/>',
user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
wallet: '<path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11.5A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M3.5 10.5h17"/><circle cx="16.5" cy="15" r="1.3"/>',
card: '<rect x="2.8" y="5.5" width="18.4" height="13" rx="2.5"/><path d="M2.8 10h18.4M6.5 15h4"/>',
chart: '<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>',
activity: '<path d="M3 12.5h4l3-7 4 13 3-6h4"/>',
file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
camera: '<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.2"/>',
bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"/>',
shield: '<path d="M12 3.2 20 6v6c0 5-3.4 8.2-8 9.2-4.6-1-8-4.2-8-9.2V6z"/><path d="M9 12.2l2.2 2.2L15.5 10"/>',
check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.7"/>',
star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/>',
heart: '<path d="M20.4 8.6a5 5 0 0 0-8.4-1.7 5 5 0 0 0-8.4 6.6l7 7a1.4 1.4 0 0 0 2 0l7-7a5 5 0 0 0 .8-5.4z"/>',
gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M3.5 13.5h17M12 9v11.5"/><path d="M12 9S10.5 4 8 4a2.5 2.5 0 0 0 0 5M12 9s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
plus: '<path d="M12 5v14M5 12h14"/>',
edit: '<path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8z"/><path d="M14.5 6.5l3 3"/>',
trash: '<path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13"/>',
print: '<path d="M7 9V3.5h10V9"/><rect x="4" y="9" width="16" height="7" rx="1.6"/><path d="M7 15h10v5.5H7z"/>',
download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M4.5 20h15"/>',
upload: '<path d="M12 20V9m0 0 4 4m-4-4-4 4M4.5 4.5h15"/>',
bolt: '<path d="M13.2 2.5 4.5 13.8h6l-1.2 7.7 8.7-11.3h-6z"/>',
qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2M17 17h2"/>',
lab: '<path d="M8 3.5h8M9.5 3.5v7.2l-4.2 7A2 2 0 0 0 7 20.8h10a2 2 0 0 0 1.7-3.1l-4.2-7V3.5"/><path d="M7.6 14.3h8.8"/>',
drop: '<path d="M12 3.2s6 6.4 6 10.4a6 6 0 0 1-12 0c0-4 6-10.4 6-10.4z"/>',
award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.8 7 21l5-2.6L17 21l-1.6-7.2"/>',
layers: '<path d="M12 3.5 3.5 8l8.5 4.5L20.5 8z"/><path d="M3.5 13l8.5 4.5 8.5-4.5"/>',
grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
arrow: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
logout: '<path d="M15 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 8.5 6.5 12l3.5 3.5M6.5 12H16"/>',
coupon: '<path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h13a2 2 0 0 1 2 2v1a2.2 2.2 0 0 0 0 5v1a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1a2.2 2.2 0 0 0 0-5z"/><path d="M12 8.5v7"/>',
stethoscope: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2.5a5 5 0 0 0 10 0v-1.7"/><circle cx="20" cy="11.3" r="2"/>',
micro: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/>',
eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
moon: '<path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a8.6 8.6 0 1 0 10.7 10.7z"/>',
sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>'
};
function icon(name, size, color) {
var d = ICONS[name];
if (!d) return '';
var px = size || 20;
return '<svg class="ic-svg" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}
function stars(n, size) {
var px = size || 16, out = '';
for (var i = 1; i <= 5; i++) {
out += '<svg class="ic-svg" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" fill="' + (i <= n ? '#fbbf24' : 'none') +
'" stroke="' + (i <= n ? '#fbbf24' : '#5c778c') + '" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' + ICONS.star + '</svg>';
}
return '<span class="stars">' + out + '</span>';
}
function hydrateIcons(root) {
var scope = root || document;
var nodes = scope.querySelectorAll ? scope.querySelectorAll('[data-icon]') : [];
for (var i = 0; i < nodes.length; i++) {
var n = nodes[i];
if (n.getAttribute('data-done')) continue;
var name = n.getAttribute('data-icon');
if (!ICONS[name]) continue;
var sz = +n.getAttribute('data-size') || (n.classList.contains('ic') ? 26 : 19);
n.innerHTML = icon(name, sz);
n.setAttribute('data-done', '1');
}
}
function watchIcons() {
hydrateIcons(document);
if (typeof MutationObserver !== 'undefined') {
try {
var mo = new MutationObserver(function (muts) {
for (var i = 0; i < muts.length; i++) {
var m = muts[i];
if (!m.addedNodes) continue;
for (var j = 0; j < m.addedNodes.length; j++) {
var a = m.addedNodes[j];
if (a.nodeType !== 1) continue;
if (a.getAttribute && a.getAttribute('data-icon')) hydrateIcons(a.parentNode || document);
else if (a.querySelectorAll) hydrateIcons(a);
}
}
});
mo.observe(document.body, { childList: true, subtree: true });
} catch (e) {}
}
/* تشغيلات قليلة بعد التحميل + عند أي تغيير (بدل interval طويل يستهلك المعالج) */
[150, 700, 2000].forEach(function (ms) { setTimeout(function () { hydrateIcons(document); }, ms); });
document.addEventListener('load', function () { hydrateIcons(document); }, true);
}
/* ---------------- قفل تلقائي لحماية بيانات المرضى ---------------- */
var LAST_ACT = Date.now();
function touchAct() { LAST_ACT = Date.now(); }
['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(function (ev) {
document.addEventListener(ev, touchAct, { passive: true });
});
setInterval(function () {
try {
var s = getSession();
if (!s || (s.role !== 'admin' && s.role !== 'doctor')) return;
var mins = Number((db().settings && db().settings.lockMinutes) || 20);
if (mins <= 0) return;
if (Date.now() - LAST_ACT > mins * 60000) {
logout();
toast('تم قفل الجلسة', 'لحماية بيانات المرضى — سجّل الدخول مرة أخرى', 'warn');
setTimeout(function () { location.href = (s.role === 'admin' ? 'admin.html' : 'doctor.html'); }, 1500);
}
} catch (e) {}
}, 60000);

/* كارت إعدادات الأمان (بيظهر في الإعدادات) */
function securityCard() {
var st = db().settings;
return el('div', { class: 'card', style: 'padding:24px;max-width:860px;margin-top:18px' }, [
el('h4', { html: icon('shield', 18) + ' الأمان وحماية بيانات المرضى' }),
el('p', { class: 'small', html: 'بيانات المرضى (أسماء، أرقام، عناوين، نتائج، روشتات) بيانات حساسة — الإعدادات دي بتقلل المخاطر على الأجهزة اللي بتفتح اللوحة.' }),
el('div', { class: 'field mt-2' }, [
el('label', { html: 'قفل اللوحة تلقائياً بعد (دقيقة)' }),
el('select', { class: 'select', id: 'lockMin', onchange: function () {
db().settings.lockMinutes = Number(this.value) || 0; save();
toast('تم الحفظ', 'مدة القفل التلقائي: ' + (this.value === '0' ? 'معطّل' : this.value + ' دقيقة'), 'ok');
} }, [0, 5, 10, 20, 30, 60].map(function (m) {
return el('option', { value: String(m), selected: (st.lockMinutes || 20) === m, html: m === 0 ? 'معطّل (غير مُنصح به)' : m + ' دقيقة' });
}))
]),
el('div', { class: 'small mt-2', html: ' نصيحة: خليها 10–20 دقيقة، وقفل المتصفح دايماً بعد الشغل.' }),
el('div', { class: 'divider' }),
el('div', { class: 'small', style: 'line-height:2' }, [
el('b', { html: 'قواعد مهمة:' }),
el('div', { html: '• متحطش مفتاح <b>service_role</b> أو <b>sb_secret_</b> في أي ملف أو في Vercel.' }),
el('div', { html: '• متفتحش لوحة الأدمن على جهاز عام أو كمبيوتر بره المعمل.' }),
el('div', { html: '• صدّر نسخة احتياطية مشفّرة واحتفظ بيها في مكان آمن (الإعدادات ▸ تصدير).' }),
el('div', { html: '• امسح بيانات أي مريض يطلب ذلك — من شاشة المرضى.' })
])
]);
}

/* ---------------- حماية من الأخطاء المفاجئة ---------------- */
var ERR_COUNT = 0;
window.addEventListener('error', function (e) {
ERR_COUNT++;
if (ERR_COUNT <= 3 && typeof toast === 'function') {
try { toast('تنبيه', 'حصلت مشكلة بسيطة في الصفحة — أكمل عادي أو حدّث الصفحة', 'warn'); } catch (x) {}
}
try { console.warn('[LAB] خطأ:', e.message); } catch (x) {}
}, true);
window.addEventListener('unhandledrejection', function (e) {
try { console.warn('[LAB] وعد فاشل:', (e.reason && e.reason.message) || e.reason); } catch (x) {}
});

/* ---------------- Export ---------------- */
global.$ = $;
global.$$ = $$;
global.LAB = {
seed: seed, load: load, save: save, db: db, resetDB: resetDB, exportDB: exportDB, importDB: importDB,
getSession: getSession, setSession: setSession, logout: logout, currentUser: currentUser,
toast: toast, modal: modal, confirm: confirmBox,
fileToDataURL: fileToDataURL, downloadBlob: downloadBlob, copyText: copyText,
log: log, notify: notify, buildShell: buildShell, initFX: initFX, initParticles: initParticles,
qr: qr, trackURL: trackURL, siteURL: siteURL, baseURL: baseURL, icon: icon, ICONS: ICONS,
hydrateIcons: hydrateIcons, watchIcons: watchIcons, stars: stars, securityCard: securityCard,
toggleTheme: toggleTheme, initTheme: initTheme, currentTheme: currentTheme,
validatePhone: validatePhone, required: required,
uid: uid, $: $, $$: $$, el: el, money: money, fmtDate: fmtDate, ago: ago, escapeHtml: escapeHtml,
clone: clone, dstr: dstr, pad: pad
};
if (typeof document !== 'undefined') initTheme();
})(window);
