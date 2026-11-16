import { importX509, jwtVerify } from 'jose';

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
const AUDIO_MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac' };
const MAX_AUDIO = 50 * 1024 * 1024;
const MAX_COVER = 5 * 1024 * 1024;
let certCache = { expires: 0, certs: null };

function cors(origin, env) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? allowed : 'null'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}
async function verifyAdmin(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sign in with the administrator account first.');
  if (!certCache.certs || Date.now() > certCache.expires) {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (!res.ok) throw new Error('Could not verify the sign-in token.');
    certCache = { certs: await res.json(), expires: Date.now() + 45 * 60 * 1000 };
  }
  const { payload, protectedHeader } = await jwtVerify(token, async header => {
    const cert = certCache.certs?.[header.kid];
    if (!cert) throw new Error('Signing key not found. Please sign in again.');
    return importX509(cert, 'RS256');
  }, { issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, audience: env.FIREBASE_PROJECT_ID });
  if (!payload.sub || !payload.email_verified || payload.admin !== true) throw new Error('Administrator permission required.');
  return payload;
}

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get('Origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);
    try {
      await verifyAdmin(request, env);
      const url = new URL(request.url);
      if (url.pathname === '/upload') {
        const form = await request.formData();
        const file = form.get('file');
        const kind = form.get('kind');
        if (!(file instanceof File) || !['audio','covers'].includes(kind)) return json({ error: 'Choose a valid audio or cover file.' }, 400, headers);
        const isAudio = kind === 'audio';
        if (isAudio && (!AUDIO_EXT.test(file.name) || (file.type && file.type !== 'application/octet-stream' && !file.type.startsWith('audio/')))) return json({ error: 'Unsupported audio format.' }, 415, headers);
        if (!isAudio && !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) return json({ error: 'Cover must be an image.' }, 415, headers);
        if (file.size > (isAudio ? MAX_AUDIO : MAX_COVER)) return json({ error: `File exceeds the ${isAudio ? '50 MB' : '5 MB'} limit.` }, 413, headers);
        const ext = (file.name.split('.').pop() || (isAudio ? 'mp3' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
        const key = `${kind}/${crypto.randomUUID()}.${ext}`;
        const contentType = isAudio ? (AUDIO_MIME[ext] || file.type || 'application/octet-stream') : file.type;
        await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { originalName: file.name.slice(0, 180) } });
        const base = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
        if (!base || base.includes('YOUR-PUBLIC')) { await env.MEDIA.delete(key); return json({ error: 'Set PUBLIC_BASE_URL in the Cloudflare Worker settings first.' }, 503, headers); }
        return json({ url: `${base}/${key.split('/').map(encodeURIComponent).join('/')}`, key, bytes: file.size }, 200, headers);
      }
      if (url.pathname === '/delete') {
        const { key } = await request.json();
        if (typeof key !== 'string' || !/^(audio|covers)\/[a-zA-Z0-9._-]+$/.test(key)) return json({ error: 'Invalid file key.' }, 400, headers);
        await env.MEDIA.delete(key);
        return json({ ok: true }, 200, headers);
      }
      return json({ error: 'Not found.' }, 404, headers);
    } catch (error) {
      const message = error?.code === 'ERR_JWT_EXPIRED' ? 'Your sign-in expired. Sign in again.' : (error.message || 'Request failed.');
      const status = /permission|required|sign in|expired|token/i.test(message) ? 403 : 400;
      return json({ error: message }, status, headers);
    }
  }
};
