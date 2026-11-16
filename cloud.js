// Firebase handles accounts + catalogue; Cloudflare R2 stores uploaded media.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, collection, doc, onSnapshot, setDoc, getDoc, deleteDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const AUDIO_RE = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
const MAX_AUDIO = 50 * 1024 * 1024;
const MAX_COVER = 5 * 1024 * 1024;
let auth, db;

export function init(config, { onSongs, onUser, onError }) {
  const app = initializeApp(config);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  getRedirectResult(auth).catch(() => {});
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch { db = getFirestore(app); }
  onSnapshot(collection(db, 'songs'), snap => onSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onError);
  onAuthStateChanged(auth, async user => {
    let admin = false;
    if (user) { try { const t = await user.getIdTokenResult(); admin = t.claims.admin === true && user.emailVerified; } catch {} }
    onUser(user, admin);
  });
}

let provider;
export async function login() {
  if (!provider) provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider);
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    throw e;
  }
}
export const logout = () => signOut(auth);

async function r2Request(path, { method = 'POST', body, onProgress } = {}) {
  if (!window.SAN_R2_CONFIG?.workerUrl) throw Error('Cloudflare R2 is not configured yet. Add the Worker URL in r2-config.js.');
  const user = auth?.currentUser;
  if (!user) throw Error('Please sign in with the administrator account before uploading.');
  const token = await user.getIdToken();
  const url = `${window.SAN_R2_CONFIG.workerUrl.replace(/\/$/, '')}${path}`;
  if (body instanceof FormData && onProgress && window.XMLHttpRequest) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open(method, url); xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = () => { let data; try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(Error(data.error || `Upload failed (${xhr.status})`)); };
      xhr.onerror = () => reject(Error('Network error while uploading to Cloudflare R2.'));
      xhr.send(body);
    });
  }
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(data.error || `Cloudflare request failed (${res.status})`);
  return data;
}

export async function upload(file, kind, onProgress) {
  if (kind === 'audio') {
    if (!AUDIO_RE.test(file.name)) throw Error('Audio must be MP3, WAV, OGG, M4A, AAC or FLAC.');
    if (file.size > MAX_AUDIO) throw Error('Audio file is over 50 MB.');
  } else {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw Error('Cover must be a JPEG, PNG, WEBP or GIF image.');
    if (file.size > MAX_COVER) throw Error('Cover image is over 5 MB.');
  }
  const fd = new FormData(); fd.append('file', file, file.name); fd.append('kind', kind);
  const result = await r2Request('/upload', { body: fd, onProgress });
  return { url: result.url, key: result.key, bytes: file.size };
}

export async function saveSong(song) {
  const songRef = doc(db, 'songs', song.id);
  const previous = await getDoc(songRef);
  const old = previous.exists() ? previous.data() : {};
  await setDoc(songRef, song);
  for (const key of [old.audioKey && old.audioKey !== song.audioKey ? old.audioKey : '', old.coverKey && old.coverKey !== song.coverKey ? old.coverKey : ''].filter(Boolean)) {
    try { await r2Request('/delete', { body: JSON.stringify({ key }), method: 'POST' }); } catch (e) { console.warn('Old R2 object cleanup failed:', e); }
  }
}
export async function deleteSong(song) {
  await deleteDoc(doc(db, 'songs', song.id));
  for (const key of [song.audioKey, song.coverKey].filter(Boolean)) {
    try { await r2Request('/delete', { body: JSON.stringify({ key }), method: 'POST' }); } catch (e) { console.warn('R2 object cleanup failed:', e); }
  }
}
export function countPlay(song) {
  if (!auth?.currentUser) return;
  updateDoc(doc(db, 'songs', song.id), { plays: increment(1) }).catch(() => {});
}
export const watchLibrary = (uid, cb) => onSnapshot(doc(db, 'users', uid, 'library', 'main'), s => cb(s.exists() ? s.data() : { likes: [] }), () => {});
export const saveLikes = (uid, likes) => setDoc(doc(db, 'users', uid, 'library', 'main'), { likes }, { merge: true });
