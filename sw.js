/* sw.js — offline cache. Bump VERSION on any file change so clients refresh. */
var VERSION = "mechab-v1";
var ASSETS = [
  ".",
  "index.html",
  "style.css",
  "manifest.json",
  "parts.js",
  "mechgen.js",
  "foegen.js",
  "chassis.js",
  "combat.js",
  "input.js",
  "game.js",
  "icon-192.png",
  "icon-512.png",
  "icon-180.png",
];

self.addEventListener("install", function (e){
  e.waitUntil(caches.open(VERSION).then(function (c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e){
  e.waitUntil(caches.keys().then(function (keys){
    return Promise.all(keys.filter(function (k){ return k !== VERSION; })
                          .map(function (k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});

// network-first, cache fallback: dev iterations stay fresh, offline still works
self.addEventListener("fetch", function (e){
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (res){
      var copy = res.clone();
      caches.open(VERSION).then(function (c){ c.put(e.request, copy); });
      return res;
    }).catch(function (){ return caches.match(e.request); })
  );
});
