/* رفع صورة (روشتة / إيصال) — بيترفع على Supabase Storage بالمفتاح السرّي */
const L = require('./_lib');

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') return L.json(res, 405, { error: 'POST فقط' });
    if (!L.URL || !L.KEY) return L.json(res, 500, { error: 'السيرفر غير مضبوط' });
    if (!L.rateLimit(req, 30, 60000)) return L.json(res, 429, { error: 'طلبات كثيرة' });

    const token = (req.headers['x-token'] || '').toString();
    const user = L.verifyToken(token);
    if (!user) return L.json(res, 401, { error: 'تسجيل دخول مطلوب (أو الحجز مفتوح للزوار)' });

    const b64 = (req.headers['x-file'] || '').toString();
    const name = (req.headers['x-name'] || 'img.jpg').toString();
    if (!b64) return L.json(res, 400, { error: 'مفيش ملف' });
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 6 * 1024 * 1024) return L.json(res, 413, { error: 'الملف أكبر من 6 ميجا' });

    const ext = (name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = 'uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + (ext || 'jpg');
    const bucket = 'lab-files';

    const up = await fetch(L.URL + '/storage/v1/object/' + bucket + '/' + path, {
      method: 'POST',
      headers: L.keyHeaders({ 'Content-Type': 'application/octet-stream', 'x-upsert': 'true' }),
      body: buf
    });
    if (!up.ok) {
      const t = await up.text();
      return L.json(res, 502, { error: 'فشل الرفع: ' + t.slice(0, 160) });
    }
    const url = L.URL + '/storage/v1/object/public/' + bucket + '/' + path;
    return L.json(res, 200, { ok: true, url: url });
  } catch (e) {
    return L.json(res, 500, { error: String(e.message || e) });
  }
};
