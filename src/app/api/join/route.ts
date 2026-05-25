import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

    // Validate invite
    const inviteRef = adminDb.collection('invites').doc(token);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) return NextResponse.json({ error: 'invalid_token' }, { status: 404 });

    const invite = inviteSnap.data()!;
    if (invite.used) return NextResponse.json({ error: 'used' }, { status: 409 });
    if (new Date(invite.expiresAt) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 });

    // Create or update Firebase Auth user
    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(invite.email);
      // Email exists — update password so they can log in with what they just typed
      await adminAuth.updateUser(existing.uid, { password });
      uid = existing.uid;
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        const created = await adminAuth.createUser({ email: invite.email, password });
        uid = created.uid;
      } else {
        throw e;
      }
    }

    const isOrg = invite.type === 'organization';

    if (isOrg) {
      const orgData = {
        uid, name: invite.name, email: invite.email, phone: invite.phone,
        city: invite.city, address: invite.address, description: invite.description,
        website: invite.website, animalTypes: invite.animalTypes,
        registrationNumber: invite.registrationNumber,
        status: 'approved', verified: true, createdAt: FieldValue.serverTimestamp(),
      };
      await adminDb.collection('organizations').doc(uid).set(orgData);
      if (invite.orgId && invite.orgId !== uid) {
        await adminDb.collection('organizations').doc(invite.orgId).update({ uid });
      }
    } else {
      await adminDb.collection('volunteers').doc(uid).set({
        uid, name: invite.fullName, email: invite.email, phone: invite.phone,
        city: invite.city, address: invite.address, hasCar: invite.hasCar,
        availableHours: invite.availableHours, available: false,
        status: 'approved', verified: true, createdAt: FieldValue.serverTimestamp(),
      });
      if (invite.applicationId) {
        await adminDb.collection('volunteer_applications').doc(invite.applicationId).update({ accountCreated: true });
      }
    }

    await inviteRef.update({ used: true, usedAt: new Date().toISOString() });

    return NextResponse.json({ ok: true, isOrg });
  } catch (err: any) {
    console.error('join error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
