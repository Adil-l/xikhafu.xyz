const CACHE="pao-de-cada-dia-v45";
const ASSETS=["./?v=45","./index.html?v=45","./styles.css?v=45","./app.js?v=45","./manifest.json?v=45","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{const url=new URL(e.request.url);if(e.request.method!=="GET"||url.origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const y=x.clone();caches.open(CACHE).then(c=>c.put(e.request,y));return x}).catch(()=>caches.match("./index.html"))))});
