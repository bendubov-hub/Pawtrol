import { NextRequest, NextResponse } from 'next/server';
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
      if (ownerUid) targetUids = [ownerUid];
    } else if (roomId.startsWith('seen_')) {
      const postId = roomId.replace('seen_', '');
      const postDoc = await adminDb.collection('seen_posts').doc(postId).get();
      const ownerUid = postDoc.data()?.userId;
      if (ownerUid) targetUids = [ownerUid];
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

    await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: roomName,
        body: `${senderName}: ${text.slice(0, 100)}`,
      },
      webpush: {
        fcmOptions: { link: url },
        notification: { icon: '/icon-192.png', badge: '/icon-192.png', dir: 'rtl' },
      },
      data: { url },
    });

    return NextResponse.json({ ok: true, sent: tokens.length });
  } catch (err: any) {
    console.error('notify-chat error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
