const CACHE='gold-nepal-v2';
const CORE=['./','./index.html','./data/fenegosida.json','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    try{
      const res=await fetch(req);
      if(res.ok){
        const cache=await caches.open(CACHE);
        cache.put(req,res.clone()).catch(()=>{});
      }
      return res;
    }catch(e){
      const cached=await caches.match(req);
      if(cached)return cached;
      if(req.mode==='navigate')return caches.match('./index.html');
      throw e;
    }
  })());
});