// SAN Player publishing backend: authoritative publish/schedule logic. Clients can never mark a song published.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { DateTime } = require('luxon');
admin.initializeApp();
const db = admin.firestore(), FV = admin.firestore.FieldValue, TS = admin.firestore.Timestamp;
const isAdmin = a => a?.token?.admin === true && a.token.email_verified === true;
const EMBED = ['youtube', 'youtube_playlist', 'spotify', 'soundcloud', 'other'];
const logRef = () => db.collection('publishingLogs').doc();

// Runs inside a transaction: verifies the song, then publishes exactly once (idempotent).
async function publishTx(tx, songRef, by) {
  const snap = await tx.get(songRef);
  if (!snap.exists) throw new Error('Song not found');
  const s = snap.data();
  if (s.publishingStatus === 'published') return 'already';
  if (['rejected'].includes(s.publishingStatus)) throw new Error('Song was rejected');
  let dist = null;
  if (s.distributionId) { dist = await tx.get(db.doc(`distributions/${s.distributionId}`)); }
  if (!s.title || !s.artistId) throw new Error('Missing title or artist');
  if (EMBED.includes(s.sourceType) ? !/^https:\/\//.test(s.sourceUrl || '') : !/^https:\/\//.test(s.audioUrl || '')) throw new Error('Missing valid audio or source URL');
  if (s.distributionId && !(dist?.exists && dist.data().approvalStatus === 'approved' && dist.data().rightsConfirmed === true && dist.data().songId === songRef.id))
    throw new Error('Distribution is not approved or rights are not confirmed');
  tx.update(songRef, { publishingStatus: 'published', publishedAt: FV.serverTimestamp(), scheduledReleaseAt: null, releaseDate: s.releaseDate || DateTime.utc().toISODate() });
  tx.set(db.doc(`artists/${s.artistId}`), { latestSongId: songRef.id, lastReleaseAt: FV.serverTimestamp(), songCount: FV.increment(1) }, { merge: true });
  tx.set(db.doc(`scheduledReleases/${songRef.id}`), { status: 'done', doneAt: FV.serverTimestamp() }, { merge: true });
  tx.set(logRef(), { songId: songRef.id, event: 'published', by, at: FV.serverTimestamp() });
  return 'published';
}

exports.setSongState = onCall(async req => {
  const a = req.auth; if (!a) throw new HttpsError('unauthenticated', 'Sign in required.');
  const { songId, action, date, time, tz } = req.data || {};
  if (typeof songId !== 'string' || !songId) throw new HttpsError('invalid-argument', 'songId required');
  const ref = db.doc(`songs/${songId}`), snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Song not found.');
  const s = snap.data(), adm = isAdmin(a), owner = a.token.artist === true && s.ownerUid === a.uid;
  if (!adm && !owner) throw new HttpsError('permission-denied', 'Not allowed.');
  const approved = async () => !s.distributionId || (await db.doc(`distributions/${s.distributionId}`).get()).data()?.approvalStatus === 'approved';
  const relRef = db.doc(`scheduledReleases/${songId}`);
  const log = (event, extra) => db.collection('publishingLogs').add({ songId, event, by: a.uid, at: FV.serverTimestamp(), ...extra });
  try {
    if (['approve', 'reject', 'retry'].includes(action) && !adm) throw new HttpsError('permission-denied', 'Admin only.');
    if (action === 'approve' || action === 'reject') {
      const ok = action === 'approve', b = db.batch();
      if (s.distributionId) b.update(db.doc(`distributions/${s.distributionId}`), { approvalStatus: ok ? 'approved' : 'rejected', reviewedBy: a.uid, reviewedAt: FV.serverTimestamp() });
      if (s.publishingStatus !== 'published') b.update(ref, { publishingStatus: ok ? 'approved' : 'rejected' });
      if (!ok) b.set(relRef, { status: 'cancelled' }, { merge: true });
      await b.commit(); await log(action); return { ok: true };
    }
    if (action === 'draft' || action === 'cancel') {
      if (s.publishingStatus === 'published') throw new HttpsError('failed-precondition', 'Already published.');
      await db.runTransaction(async tx => { tx.update(ref, { publishingStatus: 'draft', scheduledReleaseAt: null }); tx.set(relRef, { status: 'cancelled' }, { merge: true }); });
      await log(action); return { ok: true };
    }
    if (!(await approved())) throw new HttpsError('failed-precondition', 'This submission must be approved first.');
    if (action === 'publishNow') { const r = await db.runTransaction(tx => publishTx(tx, ref, a.uid)); return { ok: true, result: r }; }
    if (action === 'schedule') {
      const dt = DateTime.fromISO(`${date}T${time}`, { zone: tz });
      if (!dt.isValid) throw new HttpsError('invalid-argument', 'Invalid date, time or timezone.');
      const at = dt.toUTC(); if (at.toMillis() < Date.now() + 30000) throw new HttpsError('invalid-argument', 'Release time must be in the future.');
      await db.runTransaction(async tx => {
        const cur = await tx.get(ref); if (cur.data().publishingStatus === 'published') throw new HttpsError('failed-precondition', 'Already published.');
        tx.update(ref, { publishingStatus: 'scheduled', scheduledReleaseAt: TS.fromMillis(at.toMillis()), scheduledTimezone: tz, scheduledLocal: `${date} ${time}` });
        tx.set(relRef, { songId, ownerUid: s.ownerUid || null, artistId: s.artistId, publishAt: TS.fromMillis(at.toMillis()), tz, status: 'scheduled', attempts: 0, lastError: null });
      });
      await log('scheduled', { publishAt: at.toISO() }); return { ok: true, publishAt: at.toISO() };
    }
    if (action === 'retry') { await relRef.update({ status: 'scheduled', attempts: 0, lastError: null }); await ref.update({ publishingStatus: 'scheduled' }); await log('retry'); return { ok: true }; }
    throw new HttpsError('invalid-argument', 'Unknown action.');
  } catch (e) { if (e instanceof HttpsError) throw e; throw new HttpsError('internal', e.message); }
});

// Admin-only: lets an artist account use SAN Distribut uploads.
exports.grantArtist = onCall(async req => {
  if (!isAdmin(req.auth)) throw new HttpsError('permission-denied', 'Admin only.');
  const u = await admin.auth().getUserByEmail(String(req.data?.email || ''));
  await admin.auth().setCustomUserClaims(u.uid, { ...(u.customClaims || {}), artist: true });
  return { ok: true, uid: u.uid };
});

// Server-side scheduler (no browser needed). Each release is published in a transaction => no duplicates; failures retry next minute, then mark failed.
exports.publishDueReleases = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Asia/Colombo', retryCount: 2 }, async () => {
  const due = await db.collection('scheduledReleases').where('status', '==', 'scheduled').where('publishAt', '<=', TS.now()).limit(50).get();
  for (const d of due.docs) {
    try {
      await db.runTransaction(async tx => {
        const rel = await tx.get(d.ref); if (rel.data().status !== 'scheduled') return;
        await publishTx(tx, db.doc(`songs/${d.id}`), 'scheduler');
      });
    } catch (e) {
      const n = (d.data().attempts || 0) + 1, failed = n >= 5;
      await d.ref.update({ attempts: n, lastError: String(e.message).slice(0, 300), status: failed ? 'failed' : 'scheduled' });
      await db.collection('publishingLogs').add({ songId: d.id, event: failed ? 'failed' : 'retry', error: String(e.message).slice(0, 300), by: 'scheduler', at: FV.serverTimestamp() });
      if (failed) await db.doc(`songs/${d.id}`).update({ publishingStatus: 'failed' }).catch(() => {});
    }
  }
});
