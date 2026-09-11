/* كتابة البيانات — كل صف بيتفحص قبل ما يتكتب */
const L = require('./_lib');

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return L.json(res, 405, { error: 'POST فقط' });
    if (!L.URL || !L.KEY) return L.json(res, 500, { error: 'السيرفر غير مضبوط' });
    if (!L.rateLimit(req, 60, 60000)) return L.json(res, 429, { error: 'طلبات كثيرة' });

    const b = await L.body(req);
    const user = L.verifyToken(b.token);
    const rows = Array.isArray(b.rows) ? b.rows : [];
    if (!rows.length) return L.json(res, 200, { ok: true, written: 0 });
    if (rows.length > 500) return L.json(res, 413, { error: 'عدد كبير جداً' });

    const errs = L.checkWrite(rows, user);
    if (errs.length) return L.json(res, 403, { error: 'مرفوض: ' + errs.slice(0, 5).join(' | ') });

    /* ---- حماية إضافية للزوار (بدون توكن) ---- */
    if (!user) {
      /* 1) ممنوع التعديل على مريض موجود — إنشاء جديد بس، وبحقول محددة */
      const patRows = rows.filter(function (r) { return r.tbl === 'patients'; });
      if (patRows.length) {
        const existing = await L.readRows(['patients'], 0);
        const ids = {};
        existing.forEach(function (r) { ids[r.id] = 1; });
        for (const r of patRows) {
          if (ids[r.id]) return L.json(res, 403, { error: 'مريض موجود بالفعل — التعديل من اللوحة فقط' });
          const d = r.data || {};
          r.data = {
            id: r.id,
            name: String(d.name || '').slice(0, 80),
            phone: String(d.phone || '').slice(0, 20),
            whatsapp: String(d.whatsapp || d.phone || '').slice(0, 20),
            password: String(d.phone || '').slice(-6),   /* كلمة المرور الافتراضية فقط */
            age: String(d.age || '').slice(0, 10),
            gender: String(d.gender || '').slice(0, 10),
            files: [], notes: [],
            createdAt: d.createdAt || new Date().toISOString()
          };
        }
      }
      /* 2) تنظيف الحجوزات والروشتات: ممنوع حقن نتائج أو حالة أو أسعار وهمية */
      ['bookings', 'prescriptions'].forEach(function (t) {
        rows.filter(function (r) { return r.tbl === t; }).forEach(function (r) {
          const d = r.data || {};
          delete d.results; delete d.status; delete d.paymentStatus; delete d.reply; delete d.price;
          if (t === 'bookings') {
            d.status = 'pending';
            d.paymentStatus = d.payment === 'instapay' ? 'review' : 'pending';
            d.total = Math.min(Number(d.total) || 0, 100000);
          } else { d.status = 'pending'; d.price = 0; }
          r.data = d;
        });
      });
    }

    /* ---- حماية للمريض: ممنوع يكتب كلمة مرور أو نتائج لنفسه ---- */
    if (user && user.role === 'patient') {
      rows.forEach(function (r) {
        const d = r.data || {};
        delete d.results; delete d.status; delete d.paymentStatus; delete d.total;
      });
    }

    await L.writeRows(rows);
    return L.json(res, 200, { ok: true, written: rows.length });
  } catch (e) {
    return L.json(res, 500, { error: String(e.message || e) });
  }
};
