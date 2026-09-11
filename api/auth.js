/* تسجيل الدخول — التحقق بيحصل على السيرفر (مش في المتصفح) */
const L = require('./_lib');

function norm(s) { return String(s == null ? '' : s).trim(); }

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return L.json(res, 405, { error: 'POST فقط' });
    if (!L.URL || !L.KEY) return L.json(res, 500, { error: 'السيرفر غير مضبوط: SUPABASE_URL / SUPABASE_SERVICE_KEY' });
    if (!L.rateLimit(req, 20, 60000)) return L.json(res, 429, { error: 'محاولات كثيرة — استنى دقيقة' });

    const b = await L.body(req);

    /* دخول الأدمن / طبيب */
    if (b.username) {
      const docs = await L.readRows(['doctors'], 0);
      const doc = docs.filter(function (r) {
        const d = r.data || {};
        return norm(d.username).toLowerCase() === norm(b.username).toLowerCase()
          && norm(d.password) === norm(b.password) && d.active !== false;
      })[0];
      if (!doc) return L.json(res, 401, { error: 'بيانات الدخول غير صحيحة' });
      const d = doc.data;
      return L.json(res, 200, {
        ok: true,
        token: L.signToken({ role: d.role === 'owner' ? 'admin' : 'doctor', id: doc.id, name: d.name }, 12),
        user: { role: d.role === 'owner' ? 'admin' : 'doctor', id: doc.id, name: d.name }
      });
    }

    /* دخول مريض: الموبايل + آخر 6 أرقام */
    if (b.phone) {
      const pw = norm(b.password) || norm(b.phone).slice(-6);
      const pats = await L.readRows(['patients'], 0);
      const p = pats.filter(function (r) {
        const d = r.data || {};
        return norm(d.phone) === norm(b.phone) && norm(d.password || norm(d.phone).slice(-6)) === pw;
      })[0];
      if (!p) return L.json(res, 401, { error: 'بيانات الدخول غير صحيحة' });
      const d = p.data;
      return L.json(res, 200, {
        ok: true,
        token: L.signToken({ role: 'patient', id: p.id, name: d.name, phone: d.phone }, 12),
        user: { role: 'patient', id: p.id, name: d.name, phone: d.phone }
      });
    }

    return L.json(res, 400, { error: 'بيانات ناقصة' });
  } catch (e) {
    return L.json(res, 500, { error: String(e.message || e) });
  }
};
