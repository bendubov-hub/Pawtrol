'use client';

import { useRouter } from 'next/navigation';
import { useChatNotify } from '@/lib/chat-notify-context';

export default function ChatToastLayer() {
  const { toasts, dismissToast } = useChatNotify();
  const router = useRouter();

  if (toasts.length === 0) return null;

  return (
    <>
      <div style={{
        position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px',
        maxWidth: '320px', width: 'calc(100% - 32px)',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => { dismissToast(toast.id); router.push(`/chat/${toast.roomId}`); }}
            style={{
              background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px',
              padding: '12px 14px', cursor: 'pointer',
              display: 'flex', gap: '10px', alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              animation: 'chatSlideDown 0.3s ease',
              direction: 'rtl',
            }}
          >
            <span style={{ fontSize: '26px', flexShrink: 0 }}>{toast.roomIcon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 1px', fontWeight: '600' }}>{toast.roomName}</p>
              <p style={{ color: '#CBD5E1', fontSize: '12px', fontWeight: '700', margin: '0 0 2px' }}>{toast.senderName}</p>
              <p style={{ color: 'white', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {toast.text}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); dismissToast(toast.id); }}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', padding: '2px 4px', flexShrink: 0 }}
            >×</button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes chatSlideDown {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
