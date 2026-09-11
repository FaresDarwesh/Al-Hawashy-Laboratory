/* قراءة البيانات — الصلاحيات بتتطبق هنا قبل أي حاجة توصل المتصفح */
const L = require('./_lib');

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return L.json(res, 405, { error: 'POST فقط' });
    if (!L.URL || !L.KEY) return L.json(res, 500, { error: 'السيرفر غير مضبوط: SUPABASE_URL / SUPABASE_SERVICE_KEY' });
    if (!L.rateLimit(req, 120, 60000)) return L.json(res, 429, { error: 'طلبات كثيرة — استنى شوية' });

    const b = await L.body(req);
    const user = L.verifyToken(b.token);
    const tables = Array.isArray(b.tables) && b.tables.length ? b.tables : null;
    const rows = await L.readRows(tables, b.since || 0);
    const safe = L.filterRows(rows, user);
    return L.json(res, 200, { ok: true, role: user ? user.role : 'public', rows: safe });
  } catch (e) {
    return L.json(res, 500, { error: String(e.message || e) });
  }
};
