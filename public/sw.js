self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Zelcon', body: event.data.text() }
  }

  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    icon: '/icons/pwa-192.png',
    badge: '/icons/pwa-192.png',
    tag: data.tag || 'zelcon-update',
    renotify: Boolean(data.renotify),
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Zelcon', options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const requestedUrl = new URL(event.notification.data?.url || '/', self.location.origin)
  const targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl.href : self.location.origin

  event.waitUntil((async function () {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(targetUrl)
        return client.focus()
      }
    }
    return self.clients.openWindow(targetUrl)
  })())
})
