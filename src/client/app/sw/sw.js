/**
 * Service Worker
 */

import composeNotification from './compose-notification';
import { version } from '../config';

// インストールされたとき
self.addEventListener('install', ev => {
	console.info('installed');

	ev.waitUntil(Promise.all([
		self.skipWaiting(), // Force activate
	]));
});

// プッシュ通知を受け取ったとき
self.addEventListener('push', ev => {
	// クライアント取得
	ev.waitUntil(self.clients.matchAll({
		includeUncontrolled: true
	}).then(clients => {
		// クライアントがあったらストリームに接続しているということなので通知しない
		if (clients.length != 0) return;

		const { type, body } = ev.data.json();

		const n = composeNotification(type, body);
		return self.registration.showNotification(n.title, {
			body: n.body,
			icon: n.icon
		});
	}));
});

self.addEventListener('fetch', ev => {
	ev.respondWith(
		fetch(ev.request)
		.catch(e => {
			console.error(e, ev.request);
			return new Response(`Offline. Service Worker @${version}\n${e}`, { status: 200, statusText: 'NG SW' });
		})
	);
});

self.addEventListener('notificationclick', function(event) {
	event.notification.close();

	// This looks to see if the current is already open and
	// focuses if it is
	event.waitUntil(self.clients.matchAll({
		type: 'window'
	}).then(function(clientList) {
		for (var i = 0; i < clientList.length; i++) {
			var client = clientList[i];
			if (client.url == '/' && 'focus' in client)
				return client.focus();
		}
		if (self.clients.openWindow)
			return self.clients.openWindow('/');
	}));
});
