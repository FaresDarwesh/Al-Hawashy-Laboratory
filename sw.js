/* ===========================================================
   Service Worker — معمل الحوشي
   v4: الشبكة أولاً لكل حاجة مهمة (HTML + CSS + JS)
       والكاش للصور بس.
       السبب: أي تحديث على الموقع لازم يوصل للزوار فوراً،
       ولو حصل خلط بين نسخة قديمة من الجافاسكريبت وصفحة جديدة
       الموقع بيبوّظ (الأيقونات بتطلع كود بدل ما تترسم).
   =========================================================== */
var VER = 'elhoshy-v4';

self.addEventListener('install', function () {
  self.skipWaiting();              /* يفعّل فوراً من غير ما يستنى */
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));  /* امسح أي كاش قديم */
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* رسالة من الصفحة: امسح الكاش / او_unregister */
self.addEventListener('message', function (e) {
  if (e.data === 'clear') {
    e.waitUntil(caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }));
  }
  if (e.data === 'unregister') {
    e.waitUntil(caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.registration.unregister(); }));
  }
});

function isImportant(url) {
  return url.pathname.endsWith('.html') || url.pathname === '/' ||
         url.pathname.indexOf('/assets/js/') === 0 ||
         url.pathname.indexOf('/assets/css/') === 0;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      /* /api وطلبات خارجية: بلاش كاش */
  if (url.pathname.indexOf('/api/') === 0) return;

  /* الحاجات المهمة: الشبكة أولاً — والكاش بس لو النت مقطوع */
  if (isImportant(url)) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VER).then(function (c) { c.put(req, copy); }).catch(function () { });
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true })
          .then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }

  /* الصور والخطوط: كاش أولاً مع تحديث في الخلفية */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VER).then(function (c) { c.put(req, copy); }).catch(function () { });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
