/* =========================================================================
   المزامنة السحابية — بدون أي مكتبة خارجية
   -------------------------------------------------------------------------
   يدعم مزوّدين (تختار من إعدادات الأدمن):
     1) Supabase  → جدول lab_data (tbl, id, data jsonb, _u, _del)
     2) Firebase  → Firestore: collection  lab  (وثيقة لكل سجل)
                    Storage  : مجلد الصور (روشتات/إيصالات/صور الأطباء)
   - أول مرة: نسحب كل البيانات (السحاب يكسب).
   - بعد كده: أي تغيير محلي يُرفع فوراً، وأي تغيير من جهاز تاني يُسحب دورياً.
   - مفيش إنترنت أو الإعدادات فاضية → الموقع يشتغل محلي 100% بدون تعطيل.
   ========================================================================= */
(function () {
  if (typeof LAB === 'undefined') return;

  var TABLES = ['bookings', 'patients', 'prescriptions', 'expenses', 'reviews',
    'offers', 'notifications', 'activity', 'tests', 'packages', 'branches', 'areas', 'doctors'];
  var STATE_KEY = 'elhoshy_cloud_state_v1';

  var S = {
    synced: {}, tombs: {},
    meta: { lastPull: 0, lastPush: 0, booted: false, count: 0, ts: 0 },
    status: 'off', msg: '', busy: false, timer: null, pushTimer: null
  };

  /* ---------------- أدوات عامة ---------------- */
  function hash(str) {
    var h = 5381, i = str.length;
    while (i) { h = (h * 33) ^ str.charCodeAt(--i); }
    return (h >>> 0).toString(36);
  }
  function j(o) { try { return JSON.stringify(o); } catch (e) { return ''; } }
  function loadState() {
    try {
      var st = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      if (st && st.meta) { S.synced = st.synced || {}; S.tombs = st.tombs || {}; S.meta = st.meta; }
    } catch (e) { }
  }
  function saveState() {
    try { localStorage.setItem(STATE_KEY, j({ synced: S.synced, tombs: S.tombs, meta: S.meta })); } catch (e) { }
  }
  function cfg() {
    var c = (LAB.db().settings || {}).cloud || {};
    var g = (typeof SUPABASE !== 'undefined' && SUPABASE) || {};
    return {
      provider: 'supabase', /* المزوّد الأساسي — Supabase */
      url: (c.url || g.url || '').replace(/\/+$/, ''),
      key: c.key || g.key || '',
      bucket: c.bucket || g.bucket || 'lab-files',
      projectId: c.projectId || g.projectId || '',
      apiKey: c.apiKey || g.apiKey || '',
      mode: c.mode || g.mode || 'direct',
      enabled: c.enabled !== undefined ? !!c.enabled : !!g.enabled
    };
  }
  function rid(tbl, id) { return tbl + ':' + id; }
  function req(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t.slice(0, 140)); });
      return r.text().then(function (t) { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } });
    });
  }
  function mode() { return cfg().mode === 'server' ? 'server' : 'direct'; }
  /* direct → المزوّد المختار (supabase/firebase) — server → طبقة /api */
  function cur() {
    if (mode() === 'server') return AD.server;
    return AD[cfg().provider] || AD.supabase;
  }
  function active() {
    var c = cfg();
    if (!c.enabled) return false;
    return !!cur() && cur().ok(c);
  }
  /* توكن الجلسة الآمنة (وضع السيرفر) */
  function token() { try { return localStorage.getItem('elhoshy_cloud_token') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem('elhoshy_cloud_token', t) : localStorage.removeItem('elhoshy_cloud_token'); } catch (e) { } }

  /* ------------------------------------------------------------------
     مفاتيح Supabase:
       - القديمة (JWT) بتبدأ بـ eyJ...      → بتتبعت في apikey + Authorization: Bearer
       - الجديدة sb_publishable_/sb_secret_ → لازم apikey فقط (مش JWT،
         ولو اتبعتت في Bearer السيرفر بيرفضها بـ Invalid JWT)
     ------------------------------------------------------------------ */
  function isJWT(k) { return /^eyJ[A-Za-z0-9_-]+\./.test(String(k || '').trim()); }
  function authHeaders(extra) {
    var c = cfg(), h = { 'apikey': c.key };
    if (isJWT(c.key)) h['Authorization'] = 'Bearer ' + c.key;
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  /* =======================================================================
     1) مزوّد Supabase
     ======================================================================= */
  var AD = {};
  AD.supabase = {
    label: 'Supabase',
    ok: function (c) { return !!(c.url && c.key); },
    pull: function (since) {
      var c = cfg();
      var q = '/rest/v1/lab_data?select=tbl,id,data,_u,_del' + (since ? '&_u=gt.' + since : '');
      return req(c.url + q, { headers: authHeaders({ 'Accept': 'application/json' }) })
        .then(function (rows) { return rows || []; });
    },
    push: function (rows) {
      var c = cfg(), chunks = [];
      for (var i = 0; i < rows.length; i += 150) chunks.push(rows.slice(i, i + 150));
      return chunks.reduce(function (p, ch) {
        return p.then(function () {
          return req(c.url + '/rest/v1/lab_data?on_conflict=tbl,id', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
            body: j(ch)
          });
        });
      }, Promise.resolve());
    },
    test: function () {
      var c = cfg();
      return req(c.url + '/rest/v1/lab_data?select=tbl&limit=1', {
        headers: authHeaders({ 'Accept': 'application/json' })
      }).then(function () { return true; });
    },
    upload: function (file, folder) {
      var c = cfg();
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      var path = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return fetch(c.url + '/storage/v1/object/' + c.bucket + '/' + path, {
        method: 'POST',
        headers: authHeaders({ 'x-upsert': 'true', 'Content-Type': file.type || 'application/octet-stream' }),
        body: file
      }).then(function (r) {
        if (!r.ok) return null;
        return c.url + '/storage/v1/object/public/' + c.bucket + '/' + path;
      }).catch(function () { return null; });
    },
    hint: 'Project URL + anon public key'
  };

  /* =======================================================================
     2) مزوّد السيرفر الآمن (Vercel Serverless + مفتاح سرّي على السيرفر فقط)
     -----------------------------------------------------------------------
     المتصفح مبيعرفش أي مفتاح. كل حاجة بتمر على /api والسيرفر هو اللي
     بيحدد مين يشوف إيه (مريض → بياناته بس، أدمن → كل حاجة).
     ======================================================================= */
  function apiPost(path, obj) {
    return fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: j(obj)
    }).then(function (r) {
      return r.text().then(function (t) {
        var b = null;
        try { b = t ? JSON.parse(t) : null; } catch (e) { b = null; }
        /* صفحة HTML (404 من Vercel مثلًا) مش رد سليم — لازم نعتبره فشل */
        if (/^\s*</.test(String(t || ''))) throw new Error('السيرفر /api مش موجود (404) — تأكد إن مجلد api مرفوع على Vercel');
        if (!r.ok) throw new Error((b && b.error) ? b.error : ('HTTP ' + r.status));
        return b || {};
      });
    }).then(function (res) { if (res && res.error) throw new Error(res.error); return res; });
  }
  AD.server = {
    label: 'سيرفر آمن (Vercel)',
    ok: function () { return true; },          /* مش محتاج مفاتيح في المتصفح */
    pull: function (since) {
      return apiPost('/api/data', { token: token(), since: since || 0, tables: TABLES.concat(['settings', 'counters', 'doctors']) })
        .then(function (r) { return (r && r.rows) || []; });
    },
    push: function (rows) {
      return apiPost('/api/write', { token: token(), rows: rows }).then(function () { return true; });
    },
    test: function () {
      return apiPost('/api/data', { tables: ['tests'] }).then(function (r) { return !!(r && r.ok); });
    },
    upload: function (file, folder) {
      return new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onload = function () {
          var b64 = String(fr.result || '').split(',')[1] || '';
          fetch('/api/upload', {
            method: 'POST',
            headers: { 'x-token': token(), 'x-file': b64, 'x-name': file.name }
          }).then(function (r) { return r.json(); })
            .then(function (r) { resolve((r && r.url) || null); })
            .catch(function () { resolve(null); });
        };
        fr.onerror = function () { resolve(null); };
        fr.readAsDataURL(file);
      });
    },
    hint: 'محتاج متغيرات بيئة على Vercel فقط'
  };

  /* =======================================================================
     3) مزوّد Firebase (Firestore) — محوّل إضافي نايم
     ======================================================================= */
  function fsBase(c) {
    return 'https://firestore.googleapis.com/v1/projects/' + c.projectId + '/databases/(default)/documents';
  }
  function fsDocId(tbl, id) {
    return encodeURIComponent(String(tbl).replace(/[~/]/g, '_') + '~' + String(id).replace(/[~/]/g, '_'));
  }
  function fsFields(row) {
    return {
      tbl: { stringValue: String(row.tbl) },
      _u: { integerValue: String(row._u || 0) },
      _del: { booleanValue: !!row._del },
      j: { stringValue: j(row.data) }
    };
  }
  function fsParse(doc) {
    if (!doc || !doc.fields) return null;
    var name = String(doc.name || '').split('/').pop();
    name = decodeURIComponent(name);
    var i = name.indexOf('~');
    if (i < 0) return null;
    var f = doc.fields;
    var data = null;
    try { data = JSON.parse((f.j && (f.j.stringValue || '')) || 'null'); } catch (e) { data = null; }
    if (data === null) return null;
    return {
      tbl: (f.tbl && f.tbl.stringValue) || name.slice(0, i),
      id: name.slice(i + 1),
      data: data,
      _u: parseInt((f._u && (f._u.integerValue || f._u.doubleValue)) || 0, 10) || 0,
      _del: !!(f._del && f._del.booleanValue)
    };
  }
  /* توكن مجهول (بدون SDK) علشان نقدر نرفع صور على Storage */
  function fbToken(c) {
    try {
      var t = JSON.parse(localStorage.getItem('elhoshy_fb_token') || 'null');
      if (t && t.idToken && t.exp > Date.now()) return Promise.resolve(t.idToken);
    } catch (e) { }
    return req('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + c.apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: j({ returnSecureToken: true })
    }).then(function (r) {
      if (!r || !r.idToken) return '';
      try {
        localStorage.setItem('elhoshy_fb_token', j({ idToken: r.idToken, exp: Date.now() + 50 * 60 * 1000 }));
      } catch (e) { }
      return r.idToken;
    }).catch(function () { return ''; });
  }

  AD.firebase = {
    label: 'Firebase (Google)',
    ok: function (c) { return !!(c.projectId && c.apiKey); },

    /* قراءة: كل الوثائق، أو اللي اتعدل بعد since بس (بيوفّر جداً في حد القراءة المجاني) */
    pull: function (since) {
      var c = cfg(), base = fsBase(c), key = '?key=' + encodeURIComponent(c.apiKey);
      function collect(arr) {
        var out = [];
        (arr || []).forEach(function (r) {
          if (!r) return;
          if (r.document) out.push(r.document);
          else if (r.documents) out = out.concat(r.documents);
        });
        return out.map(fsParse).filter(Boolean);
      }
      if (since) {
        return req(base + ':runQuery' + key, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: j({
            structuredQuery: {
              from: [{ collectionId: 'lab' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: '_u' }, op: 'GREATER_THAN',
                  value: { integerValue: String(since) }
                }
              },
              orderBy: [{ field: { fieldPath: '_u' }, direction: 'ASCENDING' }],
              limit: 400
            }
          })
        }).then(collect);
      }
      /* أول مرة: سحب كامل مع ترقيم الصفحات */
      var all = [], token = '', page = 0;
      function step() {
        if (page++ > 12) return Promise.resolve(all);
        return req(base + '/lab' + key + '&pageSize=300' + (token ? '&pageToken=' + token : ''), {})
          .then(function (r) {
            r = r || {};
            all = all.concat((r.documents || []).map(fsParse).filter(Boolean));
            token = r.nextPageToken || '';
            return token ? step() : all;
          });
      }
      return step();
    },

    push: function (rows) {
      var c = cfg(), base = fsBase(c), key = '?key=' + encodeURIComponent(c.apiKey);
      var chunks = [];
      for (var i = 0; i < rows.length; i += 200) chunks.push(rows.slice(i, i + 200));
      return chunks.reduce(function (p, ch) {
        return p.then(function () {
          return req(base + ':batchWrite' + key, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: j({
              writes: ch.map(function (r) {
                return {
                  update: {
                    name: 'projects/' + c.projectId + '/databases/(default)/documents/lab/' + fsDocId(r.tbl, r.id),
                    fields: fsFields(r)
                  }
                };
              })
            })
          });
        });
      }, Promise.resolve());
    },

    test: function () {
      var c = cfg();
      return req(fsBase(c) + '/lab' + '?key=' + encodeURIComponent(c.apiKey) + '&pageSize=1', {})
        .then(function () { return true; });
    },

    upload: function (file, folder) {
      var c = cfg();
      var b = c.bucket || (c.projectId + '.appspot.com');
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      var path = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return fbToken(c).then(function (tok) {
        var h = { 'Content-Type': file.type || 'application/octet-stream' };
        if (tok) h['Authorization'] = 'Firebase ' + tok;
        return req('https://firebasestorage.googleapis.com/v0/b/' + b + '/o?uploadType=media&name=' + encodeURIComponent(path), {
          method: 'POST', headers: h, body: file
        }).then(function (r) {
          if (!r || !r.name) return null;
          var url = 'https://firebasestorage.googleapis.com/v0/b/' + b + '/o/' + encodeURIComponent(r.name) + '?alt=media';
          if (r.downloadTokens) url += '&token=' + r.downloadTokens;
          return url;
        }).catch(function () { return null; });
      });
    },
    hint: 'Project ID + Web API Key'
  };

  /* ---------------- الجداول المحلية ---------------- */
  function localMap(tbl) {
    var d = LAB.db(), m = {};
    if (tbl === 'settings') { m['main'] = d.settings; return m; }
    if (tbl === 'counters') { m['main'] = d.counters; return m; }
    (d[tbl] || []).forEach(function (r) { if (r && r.id) m[r.id] = r; });
    return m;
  }
  function writeLocal(tbl, map) {
    var d = LAB.db();
    if (tbl === 'settings') { d.settings = map['main'] || d.settings; return; }
    if (tbl === 'counters') { d.counters = map['main'] || d.counters; return; }
    var out = []; for (var id in map) if (map[id]) out.push(map[id]);
    d[tbl] = out;
  }
  function diff() {
    var up = [], del = [], all = TABLES.concat(['settings', 'counters']);
    all.forEach(function (tbl) {
      var m = localMap(tbl);
      for (var id in m) {
        var h = hash(j(m[id])), k = rid(tbl, id);
        if (S.synced[k] !== h) up.push({ tbl: tbl, id: id, data: m[id], _u: Date.now(), _del: false });
      }
      for (var k2 in S.synced) {
        if (k2.indexOf(tbl + ':') !== 0) continue;
        var lid = k2.slice(tbl.length + 1);
        if (!m[lid] && !S.tombs[k2]) {
          del.push({ tbl: tbl, id: lid, data: {}, _u: Date.now(), _del: true });
          S.tombs[k2] = Date.now();
        }
      }
    });
    return { up: up, del: del };
  }

  /* ---------------- السحب / الرفع ---------------- */
  var queue = Promise.resolve();
  function enqueue(fn) { queue = queue.then(fn).catch(function () { return 0; }); return queue; }

  /* لو مجلد api مش مرفوع أو السيرفر واقع → ارجع للوضع المباشر تلقائياً بدل ما الموقع يفضل فاضي */
  var _fellBack = false;
  function fallBackToDirect(e) {
    if (_fellBack || mode() !== 'server') return false;
    var m = String((e && e.message) || e || '');
    /* نرجع للوضع المباشر بس لو /api نفسه مش موجود أو مش قادر نوصل له —
       أما خطأ صلاحيات أو ضغط طلبات فسيبه كما هو (مش عطل في الإعداد) */
    if (!/404|NOT_FOUND|صفحة HTML|Failed to fetch|NetworkError|Unexpected token </.test(m)) return false;
    _fellBack = true;
    try { var st = LAB.db().settings; st.cloud = st.cloud || {}; st.cloud.mode = 'direct'; LAB.save(); } catch (x) { }
    setStatus('err', 'السيرفر /api مش متاح (' + (/صفحة HTML|404|NOT_FOUND/.test(m) ? 'مجلد api مش مرفوع' : 'لا يوجد اتصال')
      + ') — تم الرجوع للوضع المباشر. ' + m.slice(0, 60));
    return true;
  }
  function pull() { if (!active()) { setStatus('off'); return Promise.resolve(0); } return enqueue(_pull); }
  function push() { if (!active()) { setStatus('off'); return Promise.resolve(0); } return enqueue(_push); }

  function _pull() {
    if (!active()) { setStatus('off'); return Promise.resolve(0); }
    var c = cfg(), A = cur();
    S.busy = true; setStatus('sync', 'جاري السحب…');
    return A.pull(S.meta.ts || 0).then(function (rows) {
      rows = rows || [];
      var changed = 0, all = TABLES.concat(['settings', 'counters']);
      all.forEach(function (tbl) {
        var m = localMap(tbl), touched = false;
        rows.forEach(function (r) {
          if (!r || r.tbl !== tbl) return;
          var k = rid(tbl, r.id);
          if (S.synced[k] && S.synced[k] !== hash(j(m[r.id]))) return; /* محلي متعدّل — هنرفعه إحنا */
          if (r._del) { if (m[r.id]) { delete m[r.id]; touched = true; changed++; } S.tombs[k] = r._u; return; }
          if (!m[r.id]) { m[r.id] = r.data; S.synced[k] = hash(j(r.data)); touched = true; changed++; return; }
          if (S.synced[k] !== hash(j(r.data))) {
            if (tbl === 'counters') { for (var f in r.data) m[r.id][f] = Math.max(m[r.id][f] || 0, r.data[f] || 0); }
            else m[r.id] = r.data;
            S.synced[k] = hash(j(m[r.id])); touched = true; changed++;
          }
          if ((r._u || 0) > (S.meta.ts || 0)) S.meta.ts = r._u;
        });
        if (touched) writeLocal(tbl, m);
      });
      if (!S.meta.booted) {
        /* لو السحاب فيه بيانات → اعتبر المحلي متزامن (من غير رفع البذرة).
           لو فاضي → سيب synced فاضي علشان أول رفع ينقل بيانات المدير. */
        if (rows.length > 0) {
          all.forEach(function (tbl) {
            var mm = localMap(tbl);
            for (var id in mm) S.synced[rid(tbl, id)] = hash(j(mm[id]));
          });
          S.meta.ts = S.meta.ts || Date.now() - 1000;
        }
        S.meta.booted = true;
      }
      S.meta.lastPull = Date.now(); S.meta.count = rows.length; saveState();
      if (changed) { LAB.save(); }
      setStatus('ok', 'آخر مزامنة: ' + new Date().toLocaleTimeString('ar-EG'));
      return changed;
    }).catch(function (e) {
      if (fallBackToDirect(e)) return _pull();
      setStatus('err', 'تعذر السحب: ' + e.message); return 0;
    })
      .then(function (n) { S.busy = false; return n; });
  }

  function _push(retry) {
    /* لو لسه معملناش أول سحب: اعمله مرة واحدة بس (من غير تكرار لا نهائي لو السحب فشل) */
    if (!active()) { setStatus('off'); return Promise.resolve(0); }
    if (!S.meta.booted) {
      if (retry) return Promise.resolve(0);
      return _pull().then(function () { return _push(true); });
    }
    var d = diff(), body = d.up.concat(d.del);
    if (!body.length) { setStatus('ok'); return Promise.resolve(0); }
    S.busy = true; setStatus('sync', 'جاري الرفع (' + body.length + ')…');
    return cur().push(body).then(function () {
      d.up.forEach(function (r) { S.synced[rid(r.tbl, r.id)] = hash(j(r.data)); });
      d.del.forEach(function (r) { S.tombs[rid(r.tbl, r.id)] = r._u; });
      S.meta.lastPush = Date.now(); saveState();
      setStatus('ok', 'آخر رفع: ' + new Date().toLocaleTimeString('ar-EG'));
      return body.length;
    }).catch(function (e) {
      if (fallBackToDirect(e)) return _push(true);
      setStatus('err', 'تعذر الرفع: ' + e.message); return 0;
    })
      .then(function (n) { S.busy = false; return n; });
  }

  function test() {
    var c = cfg(), A = cur();
    if (!A || !A.ok(c)) {
      LAB.toast('بيانات ناقصة',
        mode() === 'server' ? 'استضافة السيرفر غير جاهزة — راجع متغيرات البيئة على Vercel'
          : 'ادخل Project URL و anon public key الأول', 'warn');
      return Promise.resolve(false);
    }
    return A.test().then(function () {
      LAB.toast('نجح الاتصال ', 'السحاب (' + A.label + ') جاهز وكل الأجهزة هتتزامن', 'ok');
      setStatus('ok'); return true;
    }).catch(function (e) { LAB.toast('فشل الاتصال', e.message, 'err'); setStatus('err', e.message); return false; });
  }

  /* ---------------- مؤشر الحالة ---------------- */
  var badge = null;
  function setStatus(st, m) {
    S.status = st; S.msg = m || S.msg;
    if (!badge) {
      if (!document.body) return;
      badge = document.createElement('div'); badge.id = 'cloudBadge';
      document.body.appendChild(badge);
    }
    var map = {
      ok: ['متصل بالسحاب', 'var(--green)'], sync: ['جاري المزامنة', 'var(--cyan)'],
      err: ['تعذر الاتصال', 'var(--red)'], off: ['بدون مزامنة', '#7f96ab']
    };
    var t = map[st] || map.off;
    badge.className = 'cloud-badge';
    badge.innerHTML = '<span class="dot" style="background:' + t[1] + '"></span><span>' + t[0] + '</span>';
    badge.title = (AD[cfg().provider] ? AD[cfg().provider].label + ' — ' : '') + (S.msg || '');
    badge.style.display = (st === 'off' && !cfg().enabled) ? 'none' : 'flex';
  }
  function schedulePush() {
    clearTimeout(S.pushTimer);
    S.pushTimer = setTimeout(function () { push(); }, 1200);
  }

  /* ---------------- كارت الإعدادات ---------------- */
  function settingsCard() {
    var c = cfg(), prov = c.provider || 'supabase';
    var card = LAB.el('div', { class: 'card', id: 'cloudCard', style: 'padding:24px;max-width:860px;margin-top:18px' }, [
      LAB.el('h4', { html: LAB.icon('upload', 18) + ' الربط السحابي' }),
      LAB.el('p', { class: 'small', html: 'اربط الموقع بقاعدة بيانات سحابية علشان كل الحجوزات والنتائج تبان على كل الأجهزة فوراً، وتفضل محفوظة حتى لو اتمسحت بيانات المتصفح.' }),
      LAB.el('div', { class: 'small mt-2', style: 'background:rgba(244,63,94,.10);border:1px solid rgba(244,63,94,.35);color:var(--red);border-radius:12px;padding:12px 14px;font-weight:700;line-height:1.9', html: LAB.icon('shield', 15) + ' تنبيه أمني: مفتاح anon/publishable بيدي صلاحية قراءة البيانات. متحطوش في ملف عام أو ترسلهوش لحد. لو هتنشر المفاتيح جوه الكود (supabase-config.js) يبقى لازم تقفل صلاحيات القراءة من جدول lab_data أو تعمل طبقة سيرفر — شوف ملف «الأمان-والخصوصية.md».' }),
      LAB.el('div', { class: 'field mt-2' }, [
        LAB.el('label', { html: 'قاعدة البيانات' }),
        LAB.el('input', { class: 'input', value: 'Supabase — قاعدة بيانات PostgreSQL سحابية', disabled: true })
      ]),
      LAB.el('div', { class: 'field' }, [
        LAB.el('label', { html: 'طريقة الاتصال (مهم للأمان)' }),
        LAB.el('select', { class: 'select', id: 'clMode', onchange: function () { renderCloudFields(); } }, [
          LAB.el('option', { value: 'server', selected: c.mode === 'server', html: 'عبر السيرفر الآمن /api — الأأمن (مُوصى به)' }),
          LAB.el('option', { value: 'direct', selected: c.mode !== 'server', html: 'مباشر من المتصفح (المفتاح بيبان للزوار)' })
        ])
      ]),
      LAB.el('div', { id: 'clFields' }),
      LAB.el('div', { class: 'row mt-2', style: 'flex-wrap:wrap;gap:8px' }, [
        LAB.el('button', {
          class: 'btn btn-primary', html: LAB.icon('check', 16) + ' حفظ واختبار الاتصال', onclick: function () {
            var st = LAB.db().settings, $ = LAB.$;
            st.cloud = st.cloud || {};
            st.cloud.provider = 'supabase';
            st.cloud.mode = $('#clMode').value;
            if (st.cloud.mode === 'direct') {
              st.cloud.url = (($('#clUrl') || {}).value || '').trim().replace(/\/+$/, '');
              st.cloud.key = (($('#clKey') || {}).value || '').trim();
              st.cloud.bucket = (($('#clBucket') || {}).value || '').trim() || 'lab-files';
            } else {
              st.cloud.bucket = 'lab-files';
            }
            st.cloud.enabled = $('#clOn').value === '1';
            LAB.save();
            test().then(function (ok) {
              if (ok) { S.meta.booted = false; S.meta.ts = 0; saveState(); pull().then(push); LAB.toast('جاري النقل', 'أول مزامنة شغالة…', 'ok'); }
            });
          }
        }),
        LAB.el('button', { class: 'btn btn-outline', html: LAB.icon('download', 16) + ' سحب من السحاب', onclick: function () { pull().then(function (n) { LAB.toast('تم السحب', n + ' سجل محدّث', 'ok'); }); } }),
        LAB.el('button', { class: 'btn btn-outline', html: LAB.icon('upload', 16) + ' رفع للسحاب', onclick: function () { push().then(function (n) { LAB.toast('تم الرفع', n + ' سجل', 'ok'); }); } }),
        LAB.el('button', {
          class: 'btn btn-danger', html: LAB.icon('trash', 16) + ' فصل وإعادة التعيين', onclick: function () {
            LAB.confirm('فصل السحاب', 'سيتم مسح حالة المزامنة من الجهاز ده (البيانات السحابية نفسها مش هتتمسح).', function () {
              LAB.db().settings.cloud = { provider: 'supabase', url: '', key: '', bucket: 'lab-files', enabled: false };
              S.synced = {}; S.tombs = {}; S.meta = { lastPull: 0, lastPush: 0, booted: false, count: 0, ts: 0 };
              saveState(); LAB.save(); setStatus('off'); LAB.toast('تم', 'تم فصل المزامنة', 'ok');
            }, 'افصل');
          }
        })
      ]),
      LAB.el('div', {
        class: 'small mt-2', id: 'clStatus',
        html: 'الحالة: ' + (c.enabled ? 'مفعّلة' : 'متوقفة') + ' · آخر سحب: ' +
          (S.meta.lastPull ? new Date(S.meta.lastPull).toLocaleString('ar-EG') : '—') + ' · آخر رفع: ' +
          (S.meta.lastPush ? new Date(S.meta.lastPush).toLocaleString('ar-EG') : '—')
      })
    ]);

    function renderCloudFields() {
      var box = card.querySelector('#clFields');
      if (!box) return;
      box.innerHTML = '';
      var rows = [];
      var m = card.querySelector('#clMode').value;
      if (m === 'server') {
        rows = [
          LAB.el('div', { class: 'small', style: 'background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.35);color:var(--green);border-radius:12px;padding:12px 14px;line-height:1.9;font-weight:700',
            html: LAB.icon('shield', 15) + ' الوضع الآمن: المتصفح مش بيشوف أي مفتاح — كل حاجة بتمر على /api والسيرفر هو اللي بيحدد المسموح. ' +
                  'المفاتيح بتتحط مرة واحدة في Vercel: SUPABASE_URL و SUPABASE_SERVICE_KEY و APP_SECRET.' }),
          LAB.el('div', { class: 'small mt-2', html: 'بعد الحفظ: سجّل خروج ودخول تاني من اللوحة علشان تاخد توكن صالح.' })
        ];
      } else if (false) {
        rows = [
          LAB.el('div', { class: 'field' }, [
            LAB.el('label', { html: 'Project ID' }),
            LAB.el('input', { class: 'input', id: 'fbProj', dir: 'ltr', value: c.projectId, placeholder: 'elhoshy-lab' })
          ]),
          LAB.el('div', { class: 'field' }, [
            LAB.el('label', { html: 'Web API Key' }),
            LAB.el('input', { class: 'input', id: 'fbKey', dir: 'ltr', value: c.apiKey, placeholder: 'AIzaSy...' })
          ]),
          LAB.el('div', { class: 'field' }, [
            LAB.el('label', { html: 'Storage bucket (سيبه فاضي للتلقائي)' }),
            LAB.el('input', { class: 'input', id: 'fbBucket', dir: 'ltr', value: c.bucket, placeholder: (c.projectId || 'elhoshy-lab') + '.appspot.com' })
          ]),
          LAB.el('div', { class: 'small mt-1', html: ' المجموعة المستخدمة على Firestore اسمها: <b dir="ltr">lab</b>' })
        ];
      } else {
        rows = [
          LAB.el('div', { class: 'field' }, [
            LAB.el('label', { html: 'Project URL' }),
            LAB.el('input', { class: 'input', id: 'clUrl', dir: 'ltr', value: c.url, placeholder: 'https://xxxxxxxx.supabase.co' })
          ]),
          LAB.el('div', { class: 'field' }, [
            LAB.el('label', { html: 'anon public key' }),
            LAB.el('input', { class: 'input', id: 'clKey', dir: 'ltr', value: c.key, placeholder: 'eyJhbGciOi...' })
          ]),
          LAB.el('div', { class: 'field' }, [
            LAB.el('label', { html: 'مجلد الملفات (Bucket)' }),
            LAB.el('input', { class: 'input', id: 'clBucket', dir: 'ltr', value: c.bucket })
          ]),
          LAB.el('div', { class: 'small mt-1', html: ' الجدول المستخدم اسمه: <b dir="ltr">lab_data</b> — شغّل ملف <b>supabase/schema.sql</b> مرة واحدة من SQL Editor.' })
        ];
      }
      rows.forEach(function (r) { box.appendChild(r); });
      box.appendChild(LAB.el('div', { class: 'field' }, [
        LAB.el('label', { html: 'المزامنة' }),
        LAB.el('select', { class: 'select', id: 'clOn' }, [
          LAB.el('option', { value: '1', selected: c.enabled, html: 'مفعّلة' }),
          LAB.el('option', { value: '0', selected: !c.enabled, html: 'متوقفة (محلي فقط)' })
        ])
      ]));
    }
    setTimeout(renderCloudFields, 30);
    return card;
  }

  /* ---------------- التشغيل ---------------- */
  function boot() {
    loadState();
    if (!active()) { setStatus('off'); return; }
    setStatus('sync', 'جاري الاتصال…');
    pull().then(function () { return push(); });
    clearInterval(S.timer);
    S.timer = setInterval(function () { if (!document.hidden && active()) pull(); }, 45000);
    window.addEventListener('online', function () { push(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && active()) pull(); });
  }

  var _save = LAB.save;
  LAB.save = function () {
    var r = _save.apply(null, arguments);
    if (r !== false && active()) schedulePush();
    return r;
  };
  var _f2d = LAB.fileToDataURL;
  LAB.fileToDataURL = function (file, max, q, cb) {
    var c = cfg();
    if (active() && file && file.size > 350 * 1024) {
      cur().upload(file, 'uploads').then(function (url) {
        if (url) cb(url, file.name); else _f2d(file, max, q, cb);
      });
      return;
    }
    return _f2d(file, max, q, cb);
  };

  /* دخول آمن: السيرفر هو اللي بيتحقق وبيصدر توكن موقّع */
  function serverLogin(creds) {
    if (mode() !== 'server' || !cfg().enabled) return Promise.resolve(null);
    return apiPost('/api/auth', creds).then(function (r) {
      if (r && r.ok && r.token) { setToken(r.token); setStatus('ok'); }
      return r;
    }).catch(function () { return null; });
  }
  var _logout = LAB.logout;
  LAB.logout = function () { setToken(''); return _logout.apply(null, arguments); };

  LAB.cloud = {
    boot: boot, pull: pull, push: push, test: test, settingsCard: settingsCard,
    serverLogin: serverLogin, mode: mode,
    state: S, cfg: cfg, providers: AD,
    status: function () { return { status: S.status, msg: S.msg, meta: S.meta }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
  else setTimeout(boot, 400);
})();
