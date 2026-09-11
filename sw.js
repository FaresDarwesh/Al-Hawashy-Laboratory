/* Service Worker — يجعل الموقع يعمل بدون إنترنت (PWA) */
var CACHE = 'elhoshy-lab-v1';
var FILES = [
  './', './index.html', './tests.html', './booking.html', './prescription.html',
  './track.html', './patient.html', './contact.html', './admin.html', './doctor.html',
  './assets/css/style.css',
  './assets/js/core.js', './assets/js/charts.js', './assets/js/shared.js',
  './assets/js/app.js', './assets/js/booking.js', './assets/js/patient.js',
  './assets/js/admin.js', './assets/js/admin2.js', './assets/js/doctor.js',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES).catch(function () { }); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () { });
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
