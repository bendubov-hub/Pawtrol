import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { targetUid, callerToken } = await req.json();
    if (!targetUid || !callerToken) return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });

    // Verify caller is admin
    const decoded = await adminAuth.verifyIdToken(callerToken);
    const adminSnap = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!adminSnap.exists) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });

    // Delete from Firebase Auth
    await adminAuth.deleteUser(targetUid);

    // Delete from all Firestore collections (whichever exists)
    const collections = ['users', 'volunteers', 'organizations'];
    await Promise.all(collections.map(col =>
      adminDb.collection(col).doc(targetUid).delete().catch(() => {})
    ));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
