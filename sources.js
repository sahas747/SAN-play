// Detect the music platform from a URL. Only official embeds / links are used; nothing is downloaded or extracted.
export function detect(url) {
  let u; try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const h = u.hostname.replace(/^(www|m)\./, ''), id11 = /^[\w-]{11}$/;
  if (h === 'youtu.be') return id11.test(u.pathname.slice(1)) ? { platform: 'YouTube', type: 'youtube', id: u.pathname.slice(1) } : null;
  if (h === 'youtube.com' || h === 'music.youtube.com') {
    const v = u.searchParams.get('v'), l = u.searchParams.get('list'), m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
    if (v && id11.test(v)) return { platform: 'YouTube', type: 'youtube', id: v };
    if (m) return { platform: 'YouTube', type: 'youtube', id: m[1] };
    if (l && u.pathname === '/playlist') return { platform: 'YouTube', type: 'youtube_playlist', id: l };
    return null;
  }
  if (h === 'open.spotify.com') {
    const m = u.pathname.match(/^\/(?:intl-\w+\/)?(track|album|playlist|episode)\/(\w+)/);
    return m ? { platform: 'Spotify', type: 'spotify', id: m[2], embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}` } : null;
  }
  if ((h === 'soundcloud.com' && u.pathname.split('/').filter(Boolean).length >= 2) || h === 'on.soundcloud.com')
    return { platform: 'SoundCloud', type: 'soundcloud', embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}` };
  return { platform: h, type: 'other' };
}
export const oembed = { youtube: u => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`, spotify: u => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`, soundcloud: u => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}` };
