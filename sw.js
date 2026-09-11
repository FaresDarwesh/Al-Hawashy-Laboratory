/* ===========================================================
   Service Worker — معمل الحوشي
   v2: الشبكة أولاً لصفحات HTML (علشان أي تحديث يوصل فوراً)
       والكاش للمكتبات والصور بس (أداء أسرع بدون تعليق نسخة قديمة)
   =========================================================== */
var VER = 'elhoshy-v2';
var ASSETS = [
  './', 'index.html', 'tests.html', 'booking.html', 'prescription.html',
  'track.html', 'patient.html', 'contact.html', 'privacy.html', '404.html',
  'manifest.json', 'assets/css/style.css',
  'assets/js/core.js', 'assets/js/shared.js', 'assets/js/app.js',
  'assets/js/booking.js', 'assets/js/patient.js', 'assets/js/qr.js',
  'assets/js/charts.js', 'assets/js/admin.js', 'assets/js/admin2.js',
  'assets/js/doctor.js', 'assets/js/supabase-config.js', 'assets/js/sync.js',
  'assets/img/doctor.jpg'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VER).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () { }); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === VER ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* HTML: الشبكة أولاً — أي تحديث على GitHub/Vercel يبان فوراً */
function isHTML(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') > -1;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* /api وطلبات خارجية: بلاش كاش */

  if (isHTML(req)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VER).then(function (c) { c.put(req, copy); }).catch(function () { });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }

  /* ملفات ثابتة: كاش أولاً مع تحديث في الخلفية */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VER).then(function (c) { c.put(req, copy); }).catch(function () { });
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
