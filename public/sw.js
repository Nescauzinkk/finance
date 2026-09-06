// Service worker mínimo — existe principalmente para satisfazer os requisitos
// de instalação de PWA. Não faz cache agressivo: o app depende de dados
// vivos do Supabase, então preferimos sempre buscar da rede.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // passthrough simples — deixa o navegador lidar com o cache HTTP normal
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
