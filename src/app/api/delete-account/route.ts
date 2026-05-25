import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { callerToken } = await req.json();
    if (!callerToken) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });

    const decoded = await adminAuth.verifyIdToken(callerToken);
    const uid = decoded.uid;

    // Delete from Firestore
    const collections = ['users', 'volunteers', 'organizations', 'fcm_tokens'];
    await Promise.all(collections.map(col =>
      adminDb.collection(col).doc(uid).delete().catch(() => {})
    ));

    // Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
