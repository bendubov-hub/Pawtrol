import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

const ROOM_NAMES: Record<string, string> = {
  rescues:    'מאורת ההצלות 🚨',
  volunteers: 'מאורת המתנדבים 🦺',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pawtrolit.org';

export async function POST(req: NextRequest) {
  try {
    const { roomId, senderUid, senderName, text } = await req.json();
    if (!roomId || !senderUid || !text) return NextResponse.json({ ok: false });

    // Determine target UIDs based on room
    let targetUids: string[] = [];

    if (roomId === 'rescues') {
      const snap = await adminDb.collection('fcm_tokens').get();
      targetUids = snap.docs.map(d => d.data().uid).filter(Boolean);
    } else if (roomId === 'volunteers') {
      const [vols, orgs, admins] = await Promise.all([
        adminDb.collection('volunteers').get(),
        adminDb.collection('organizations').get(),
        adminDb.collection('admins').get(),
      ]);
      targetUids = [
        ...vols.docs.map(d => d.id),
        ...orgs.docs.map(d => d.data().uid || d.id),
        ...admins.docs.map(d => d.id),
      ];
    } else if (roomId.startsWith('adopt_')) {
      const postId = roomId.replace('adopt_', '');
      const postDoc = await adminDb.collection('adoptions').doc(postId).get();
      const ownerUid = postDoc.data()?.userId;
      if (ownerUid) {
        targetUids = [ownerUid];
        // Add owner to participants so room appears in their מאורות
        await adminDb.collection('chat_rooms').doc(roomId).set({
          participants: FieldValue.arrayUnion(ownerUid),
          type: 'adopt',
          name: 'שיחה על אימוץ',
          icon: '🐾',
          color: '#10B981',
        }, { merge: true });
      }
    } else if (roomId.startsWith('seen_')) {
      const postId = roomId.replace('seen_', '');
      const postDoc = await adminDb.collection('seen_posts').doc(postId).get();
      const ownerUid = postDoc.data()?.userId;
      if (ownerUid) {
        targetUids = [ownerUid];
        // Add owner to participants so room appears in their מאורות
        await adminDb.collection('chat_rooms').doc(roomId).set({
          participants: FieldValue.arrayUnion(ownerUid),
          type: 'seen',
          name: 'שיחה על מי ראה?',
          icon: '🔍',
          color: '#F59E0B',
        }, { merge: true });
      }
    } else {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // Exclude sender
    targetUids = [...new Set(targetUids)].filter(uid => uid !== senderUid);
    if (targetUids.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    // Fetch tokens
    const tokensSnap = await adminDb.collection('fcm_tokens').get();
    const tokenMap: Record<string, string> = {};
    tokensSnap.docs.forEach(d => { if (d.data().uid) tokenMap[d.data().uid] = d.data().token; });

    const tokens = targetUids.map(uid => tokenMap[uid]).filter(Boolean) as string[];
    if (tokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const roomName = ROOM_NAMES[roomId] || (roomId.startsWith('adopt_') ? 'הודעה על מודעת אימוץ 🐾' : roomId.startsWith('seen_') ? 'הודעה ב"מי ראה?" 🔍' : 'צ\'אט');
    const url = `${APP_URL}/chat/${roomId}`;

    const body = `${senderName}: ${text.slice(0, 100)}`;
    const result = await adminMessaging.sendEachForMulticast({
      tokens,
      // webpush.notification: browser displays directly (no FCM SDK auto-display → no double notification)
      // data: passed to SW/foreground onMessage for in-app toast and click URL
      webpush: {
        notification: { title: roomName, body, icon: '/icon-192.png', badge: '/icon-192.png', dir: 'rtl' },
        fcmOptions: { link: url },
      },
      data: { title: roomName, body, url, icon: '/icon-192.png', msgId: Date.now().toString() },
      android: { priority: 'high' },
      apns: { payload: { aps: { contentAvailable: true } } },
    });

    // Remove stale tokens from Firestore so future sends don't fail silently
    const staleUids: string[] = [];
    result.responses.forEach((resp, i) => {
      if (!resp.success && (resp.error?.code === 'messaging/registration-token-not-registered' ||
          resp.error?.code === 'messaging/invalid-registration-token')) {
        const uid = targetUids.find(u => tokenMap[u] === tokens[i]);
        if (uid) staleUids.push(uid);
      }
    });
    await Promise.all(staleUids.map(uid => adminDb.collection('fcm_tokens').doc(uid).delete()));

    return NextResponse.json({ ok: true, sent: tokens.length });
  } catch (err: any) {
    console.error('notify-chat error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
