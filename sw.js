const scope = self.registration.scope;
const prefix = 'thinkinbrain:' + scope + ':';
const version = prefix + 'ios-2.12.3-web1';
const root = new URL('index.html',scope).href;
const assets = new Set([
  'index.html','style.css','app.js','state.js','notebook.js','visuals.js','dictation.js',
  'manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png',
  'assets/notebook.bin','assets/grain.png'
].map(path=>new URL(path,scope).href));

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(version);
    await cache.addAll([...assets].map(url=>new Request(url,{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(prefix)&&key!==version).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET' || !request.url.startsWith(scope))return;
  const url=request.url.split('?')[0];
  const navigation=request.mode==='navigate'&&(url===root||url===scope);
  if(!navigation&&!assets.has(url))return;
  event.respondWith((async()=>{
    const cache=await caches.open(version);
    return await cache.match(navigation?root:url) || fetch(request);
  })());
});
