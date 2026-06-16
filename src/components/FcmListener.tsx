'use client';

import { useEffect } from 'react';
import { playHowl } from '@/lib/alert-sound';

export default function FcmListener() {
  useEffect(() => {
    let unsub: (() => void) | null = null;

    async function init() {
      try {
        const { isSupported, getMessaging, onMessage } = await import('firebase/messaging');
        const { initializeApp, getApps } = await import('firebase/app');

        const supported = await isSupported();
        if (!supported) return;

        const app = getApps()[0];
        if (!app) return;

        const messaging = getMessaging(app);

        unsub = onMessage(messaging, (payload) => {
          playHowl();

          // Show in-app toast notification (data-only payload — avoids double system notification)
          const { title, body } = payload.data || {};
          if (title) showToast(title, body || '');
        });
      } catch { /* FCM not available */ }
    }

    // Clear stale notifications from the OS tray when the app opens
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg =>
        reg.getNotifications().then(notifs => notifs.forEach(n => n.close()))
      ).catch(() => {});
    }

    init();
    return () => { unsub?.(); };
  }, []);

  return null;
}

function showToast(title: string, body: string) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; top:20px; left:50%; transform:translateX(-50%);
    background:#1E293B; border:1px solid #EF4444; border-radius:14px;
    padding:14px 20px; color:white; font-family:Arial,sans-serif;
    font-size:14px; z-index:9999; max-width:320px; width:90%;
    box-shadow:0 10px 30px rgba(0,0,0,0.5); direction:rtl;
    animation:slideDown 0.3s ease;
  `;
  toast.innerHTML = `
    <style>@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
    <div style="font-weight:700;margin-bottom:4px">🐾 ${title}</div>
    <div style="color:#94A3B8;font-size:13px">${body}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
