/* =========================================================================
   طبقة السيرفر الآمنة — مكتبة مشتركة
   -------------------------------------------------------------------------
   الفكرة: المتصفح لا يعرف أي مفتاح. كل حاجة بتمر من هنا:
     - المفتاح السرّي (service_role) محفوظ في Environment Variables على Vercel
     - كل طلب لازم يكون عليه توكن موقّع (HMAC) أو يكون طلب عام محدود
     - المريض يشوف بياناته بس، والمدير يشوف كل حاجة
   ========================================================================= */
const crypto = require('crypto');

/* ------------------ الإعدادات من متغيرات البيئة ------------------ */
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SECRET = process.env.APP_SECRET || 'change-me-please-0123456789';

/* ------------------ تصنيف الجداول ------------------ */
const PUBLIC_READ = ['tests', 'packages', 'branches', 'areas', 'offers', 'reviews'];
const SENSITIVE = ['bookings', 'patients', 'prescriptions', 'expenses', 'activity', 'notifications'];
const ALL_TABLES = PUBLIC_READ.concat(SENSITIVE, ['doctors', 'settings', 'counters']);

/* ------------------ أدوات ------------------ */
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise(function (resolve) {
    let raw = '';
    req.on('data', function (c) { raw += c; if (raw.length > 4e6) req.destroy(); });
    req.on('end', function () {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve({}); }
    });
  });
}
function b64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }

/* توكن موقّع: {role,id,exp} + توقيع HMAC */
function signToken(payload, ttlHours) {
  payload.exp = Date.now() + (ttlHours || 12) * 3600 * 1000;
  const data = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return data + '.' + sig;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expect = crypto.createHmac('sha256', SECRET).update(parts[0]).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (expect.length !== parts[1].length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(parts[1]))) return null;
  try {
    const p = JSON.parse(unb64(parts[0]));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}

/* ------------------ الاتصال بـ Supabase بالمفتاح السرّي ------------------ */
function sb(path, opts) {
  opts = opts || {};
  const headers = Object.assign({
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }, opts.headers || {});
  return fetch(URL_ + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body
  }).then(async function (r) {
    const t = await r.text();
    let data = null;
    try { data = t ? JSON.parse(t) : null; } catch (e) { data = t; }
    if (!r.ok) throw new Error('supabase ' + r.status + ': ' + String(t).slice(0, 200));
    return data;
  });
}
/* المفاتيح الجديدة (sb_secret_) مش JWT → لازم apikey فقط */
function keyHeaders(extra) {
  const h = { 'apikey': KEY };
  if (/^eyJ[A-Za-z0-9_-]+\./.test(KEY)) h['Authorization'] = 'Bearer ' + KEY;
  return Object.assign(h, extra || {});
}

function readRows(tables, since) {
  let q = '/rest/v1/lab_data?select=tbl,id,data,_u,_del&limit=2000';
  if (tables && tables.length) q += '&tbl=in.(' + tables.map(encodeURIComponent).join(',') + ')';
  if (since) q += '&_u=gt.' + encodeURIComponent(String(since));
  return sb(q).then(function (rows) { return rows || []; });
}
function writeRows(rows) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += 200) chunks.push(rows.slice(i, i + 200));
  return chunks.reduce(function (p, ch) {
    return p.then(function () {
      return sb('/rest/v1/lab_data?on_conflict=tbl,id', {
        method: 'POST',
        headers: Object.assign(keyHeaders({ 'Content-Type': 'application/json' }),
          { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(ch)
      });
    });
  }, Promise.resolve());
}

/* ------------------ تنقية الصفوف حسب الصلاحية ------------------ */
function publicSafe(row) {
  const t = row.tbl;
  if (t === 'doctors') {
    const d = Object.assign({}, row.data);
    delete d.password;                 // لا كلمة مرور
    return { tbl: t, id: row.id, _u: row._u, _del: row._del, data: d };
  }
  if (t === 'settings') {
    const s = row.data || {};
    return {
      tbl: t, id: row.id, _u: row._u, _del: row._del,
      data: { labName: s.labName, labShort: s.labShort, ownerName: s.ownerName, ownerTitle: s.ownerTitle, ownerBio: s.ownerBio, phones: s.phones, whatsapp: s.whatsapp, instapay: s.instapay, instapayName: s.instapayName, email: s.email, address: s.address, workFrom: s.workFrom, workTo: s.workTo, closedDays: s.closedDays, homeServiceEnabled: s.homeServiceEnabled, homeBaseFee: s.homeBaseFee, slotMinutes: s.slotMinutes, about: s.about, heroTitle: s.heroTitle, heroSub: s.heroSub }
      /* ملاحظة: cloud (المفاتيح) مش بتتبعت للمتصفح أبداً */
    };
  }
  return row;
}

function filterRows(rows, user) {
  const role = user ? user.role : 'public';
  if (role === 'admin') return rows;
  if (role === 'doctor') {
    return rows.map(function (r) {
      if (r.tbl === 'doctors' && r.id !== user.id) return publicSafe(r);
      if (r.tbl === 'expenses') return null;
      return r;
    }).filter(Boolean);
  }
  if (role === 'patient') {
    const phone = String(user.phone || '').trim();
    return rows.filter(function (r) {
      if (PUBLIC_READ.indexOf(r.tbl) >= 0) return true;
      if (r.tbl === 'settings' || r.tbl === 'doctors') return true;
      if (r.tbl === 'patients') return r.id === user.id;
      if (r.tbl === 'bookings') return String((r.data || {}).phone || '').trim() === phone;
      if (r.tbl === 'prescriptions') return String((r.data || {}).phone || '').trim() === phone;
      return false;                     // expenses / activity / notifications: ممنوع
    }).map(publicSafe);
  }
  /* زائر عام */
  return rows.filter(function (r) {
    return PUBLIC_READ.indexOf(r.tbl) >= 0 || r.tbl === 'doctors' || r.tbl === 'settings';
  }).map(publicSafe);
}

/* ------------------ صلاحيات الكتابة ------------------ */
const MAX_TOTAL = 100000;
function checkWrite(rows, user) {
  const role = user ? user.role : 'public';
  const errs = [];
  rows.forEach(function (r, i) {
    const t = r.tbl, d = r.data || {};
    if (ALL_TABLES.indexOf(t) < 0) { errs.push('#' + i + ' جدول غير معروف'); return; }
    if (role === 'admin') return;                                  /* المدير: كل حاجة */
    if (role === 'doctor') {
      if (t === 'expenses' || t === 'settings') errs.push('#' + i + ' ممنوع للطبيب');
      if (t === 'doctors' && r.id !== user.id) errs.push('#' + i + ' طبيب آخر');
      return;
    }
    if (role === 'patient') {
      if (t === 'patients') { if (r.id !== user.id) errs.push('#' + i + ' مريض آخر'); return; }
      if (t === 'bookings') {
        if (String(d.phone || '').trim() !== String(user.phone || '').trim()) errs.push('#' + i + ' حجز غير تابع لك');
        return;
      }
      if (t === 'prescriptions') {
        if (String(d.phone || '').trim() !== String(user.phone || '').trim()) errs.push('#' + i + ' روشتة غير تابعة لك');
        return;
      }
      errs.push('#' + i + ' ممنوع للمريض');
      return;
    }
    /* زائر عام: إضافة حجز/روشتة/مريض فقط، وببيانات محددة */
    if (t === 'bookings' || t === 'prescriptions' || t === 'patients') {
      if (r._del) { errs.push('#' + i + ' ممنوع الحذف'); return; }
      if (!d.phone && !d.patient) { errs.push('#' + i + ' بيانات ناقصة'); return; }
      /* تنظيف: منع التلاعب بالحالة أو السعر */
      if (t === 'bookings') {
        d.status = 'pending';
        d.paymentStatus = d.payment && d.payment === 'instapay' ? 'review' : 'pending';
        if (d.total && Number(d.total) > MAX_TOTAL) d.total = MAX_TOTAL;
        delete d.results;
      }
      if (t === 'prescriptions') { d.status = 'pending'; d.price = 0; delete d.reply; }
      r.data = d;
      return;
    }
    errs.push('#' + i + ' ممنوع للزوار (' + t + ')');
  });
  return errs;
}

/* ------------------ تحديد عدد الطلبات (حماية بسيطة) ------------------ */
const HITS = new Map();
function rateLimit(req, max, winMs) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip').toString();
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter(function (t) { return now - t < winMs; });
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length <= max;
}

module.exports = {
  URL: URL_, KEY: KEY, SECRET: SECRET,
  PUBLIC_READ: PUBLIC_READ, SENSITIVE: SENSITIVE, ALL_TABLES: ALL_TABLES,
  json: json, body: body, sb: sb, keyHeaders: keyHeaders,
  readRows: readRows, writeRows: writeRows,
  signToken: signToken, verifyToken: verifyToken,
  filterRows: filterRows, publicSafe: publicSafe, checkWrite: checkWrite,
  rateLimit: rateLimit
};
