import { detect } from './sources.js';
import * as C from './cloud.js';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => { t = isFinite(t) && t > 0 ? t : 0; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const mb = n => (n / 1048576).toFixed(2) + ' MB';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('sanplay_' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sanplay_' + k, JSON.stringify(v)); } catch {} }
};
const SRC = { upload: 'SAN', youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', other: 'Stream' };
const sourceLabel = s => SRC[s?.sourceType] || 'SAN';
const hue = str => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

const svg = (p, fill = false) => `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  home: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  library: svg('<path d="M4 4v16M9 4v16M14 5.5l5 14.5"/>'),
  heart: svg('<path d="M12 20.5s-7.5-4.6-9.5-9.2C1.2 8.2 3.4 5 6.7 5c2 0 3.6 1.1 4.3 2.6C11.7 6.1 13.3 5 15.3 5c3.3 0 5.5 3.2 4.2 6.3-2 4.6-7.5 9.2-7.5 9.2z"/>'),
  play: svg('<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/>', true),
  pause: svg('<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>', true),
  prev: svg('<path d="M6 5v14"/><path d="M19 5.5v13a.8.8 0 0 1-1.3.6L8.5 12.6a.8.8 0 0 1 0-1.2l9.2-6.7a.8.8 0 0 1 1.3.6z"/>', true),
  next: svg('<path d="M18 5v14"/><path d="M5 5.5v13a.8.8 0 0 0 1.3.6l9.2-6.7a.8.8 0 0 0 0-1.2L6.3 4.9A.8.8 0 0 0 5 5.5z"/>', true),
  shuffle: svg('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  expand: svg('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>'),
  volume: svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  music: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  cloud: svg('<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>')
};

/* ---------- state ---------- */
const S = {
  songs: [], loaded: false, user: null, admin: false, liked: new Set(),
  view: 'home', search: '', viewList: [], queue: [], index: -1, current: null,
  shuffle: false, repeat: 'off', volume: store.get('volume', 0.8),
  adminTab: 'add', editing: null, deepLinkDone: false, sheetOpen: false
};
let libUnsub = null;

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- covers and rows ---------- */
function cover(s, cls = '') {
  if (s?.cover) return `<img class="cover ${cls}" src="${esc(s.cover)}" alt="" loading="lazy">`;
  return `<div class="cover ${cls} gen" style="--h:${hue(s?.title || 'SAN')}">${ICON.music}</div>`;
}

function row(s, i) {
  const on = S.current?.id === s.id;
  const liked = S.liked.has(s.id);
  return `<div class="row ${on ? 'playing' : ''}" data-act="play" data-id="${esc(s.id)}">
    <span class="num">${on ? '♪' : i + 1}</span>${cover(s, 'xs')}
    <div class="meta"><b>${esc(s.title)}</b><small>${esc(s.artist)}${s.album ? ' · ' + esc(s.album) : ''}</small></div>
    <span class="badge">${sourceLabel(s)}</span>
    <span class="plays">${s.plays || 0} plays</span>
    <button class="ib ${liked ? 'on' : ''}" data-act="like" data-id="${esc(s.id)}" aria-label="Like">${ICON.heart}</button>
    <button class="ib" data-act="share" data-id="${esc(s.id)}" aria-label="Share">${ICON.share}</button>
  </div>`;
}

const card = s => `<article class="card glass-sm" data-act="play" data-id="${esc(s.id)}">
  <div class="cover-wrap">${cover(s)}<span class="card-play">${ICON.play}</span></div>
  <b>${esc(s.title)}</b><small>${esc(s.artist)}</small></article>`;

const sortedNew = () => [...S.songs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const sortedPop = () => [...S.songs].sort((a, b) => (b.plays || 0) - (a.plays || 0));
const emptyState = msg => `<div class="empty">${msg}</div>`;
const pageHead = (title, sub, actions = '') =>
  `<header class="page-head"><div><span class="eyebrow">SAN PLAYER</span><h2>${title}</h2><p class="muted">${sub}</p></div><div class="btns">${actions}</div></header>`;

/* ---------- views ---------- */
function viewHome(m) {
  const list = sortedNew();
  S.viewList = list.map(s => s.id);
  const pop = sortedPop().slice(0, 6);
  const artists = [...new Set(S.songs.map(s => s.artist))].slice(0, 10);
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const who = S.user ? `Signed in as ${esc(S.user.displayName || 'listener')}` : 'Listening as guest';
  const body = !S.loaded ? emptyState('Loading music…')
    : !list.length ? emptyState('No songs yet. Admin can publish music from the dashboard.')
    : `<h3 class="sec">Latest music</h3><div class="grid">${list.slice(0, 10).map(card).join('')}</div>
       <h3 class="sec">Popular right now</h3><div class="list glass">${pop.map((s, i) => row(s, i)).join('')}</div>
       <h3 class="sec">Artists</h3><div class="chips-row">${artists.map(a => `<button class="chip" data-act="search" data-q="${esc(a)}">${esc(a)}</button>`).join('')}</div>`;
  m.innerHTML = `
  <section class="hero glass">
    <div class="hero-copy">
      <span class="eyebrow"><i class="dot"></i> Your sound. Your space.</span>
      <h1>Feel every<br><em>moment.</em></h1>
      <p>Stream the latest songs instantly. No account needed. Log in only if you want to save likes.</p>
      <div class="btns">
        <button class="btn primary" data-act="playall">${ICON.play} Play all</button>
        <button class="btn ghost" data-act="shuffleall">${ICON.shuffle} Shuffle</button>
      </div>
      <div class="chips"><span>${S.songs.length} songs</span><span>${artists.length} artists</span><span>${who}</span></div>
    </div>
    <img class="hero-logo" src="assets/san-player-logo.png" alt="">
  </section>
  <div class="greet"><h2>${greet}</h2><span class="muted">${date}</span></div>
  ${body}`;
}

function viewSearch(m) {
  m.innerHTML = pageHead('Search', 'Find songs, artists and albums') +
    `<label class="search glass-sm">${ICON.search}<input id="q" type="search" placeholder="What do you want to listen to?" autocomplete="off" value="${esc(S.search)}"></label><div id="results"></div>`;
  const update = () => {
    S.search = $('#q').value;
    const q = S.search.trim().toLowerCase();
    const res = q ? S.songs.filter(s => [s.title, s.artist, s.album, s.genre].join(' ').toLowerCase().includes(q)) : [];
    S.viewList = res.map(s => s.id);
    $('#results').innerHTML = !q ? emptyState('Type to search the library.')
      : res.length ? `<div class="list glass">${res.map((s, i) => row(s, i)).join('')}</div>`
      : emptyState('No results.');
  };
  $('#q').oninput = update;
  update();
}

function viewLibrary(m) {
  const list = sortedNew();
  S.viewList = list.map(s => s.id);
  m.innerHTML = pageHead('Your Library', `${list.length} songs`,
    list.length ? `<button class="btn primary" data-act="playall">${ICON.play} Play</button><button class="btn ghost" data-act="shuffleall">${ICON.shuffle} Shuffle</button>` : '') +
    (list.length ? `<div class="list glass">${list.map((s, i) => row(s, i)).join('')}</div>` : emptyState('No songs yet.'));
}

function viewLiked(m) {
  if (!S.user) {
    S.viewList = [];
    m.innerHTML = pageHead('Liked Songs', 'Log in to see the songs you liked.') +
      `<div class="glass empty-card"><p>Login is only needed to save likes and playlists. Listening is always free.</p><button class="btn primary" data-act="login">Log in with Google</button></div>`;
    return;
  }
  const list = sortedNew().filter(s => S.liked.has(s.id));
  S.viewList = list.map(s => s.id);
  m.innerHTML = pageHead('Liked Songs', `${list.length} songs`,
    list.length ? `<button class="btn primary" data-act="playall">${ICON.play} Play</button>` : '') +
    (list.length ? `<div class="list glass">${list.map((s, i) => row(s, i)).join('')}</div>` : emptyState('Tap the heart on any song to like it.'));
}

function go(view) {
  S.view = view;
  S.search = view === 'search' ? S.search : '';
  $('.main').scrollTop = 0;
  render();
}

function render() {
  $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === S.view));
  const m = $('#view');
  ({ home: viewHome, search: viewSearch, library: viewLibrary, liked: viewLiked })[S.view](m);
  updateChrome();
  updateNowPlaying();
}

function updateChrome() {
  $('#loginBtn').hidden = !!S.user;
  $('#userChip').hidden = !S.user;
  if (S.user) {
    $('#userName').textContent = S.user.displayName || S.user.email || 'Listener';
    $('#userAvatar').innerHTML = S.user.photoURL ? `<img src="${esc(S.user.photoURL)}" alt="">` : esc((S.user.displayName || 'S')[0].toUpperCase());
  }
  $$('[data-admin]').forEach(el => el.hidden = !S.admin);
}

/* ---------- playback engine ---------- */
const audio = new Audio();
audio.preload = 'metadata';
let mode = null;           // 'audio' | 'youtube' | 'embed' | null
let ytPlayer = null, ytReady = false, pendingYt = null;

window.onYouTubeIframeAPIReady = () => {
  ytReady = true;
  if (pendingYt) { ensureYt(pendingYt); pendingYt = null; }
};
function loadYtApi() {
  if (document.getElementById('yt-api')) return;
  const s = document.createElement('script');
  s.id = 'yt-api';
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}
function ensureYt(id) {
  if (!ytPlayer) {
    ytPlayer = new YT.Player('ytHost', {
      width: '100%', height: '100%', videoId: id,
      playerVars: { controls: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
      events: {
        onReady: e => { e.target.setVolume(S.volume * 100); e.target.playVideo(); },
        onStateChange: e => { if (e.data === 0) onEnded(); refreshPlayBtn(); },
        onError: () => toast('This video cannot play here. The owner may have disabled embedding.')
      }
    });
  } else {
    ytPlayer.loadVideoById(id);
  }
}

function setMode(m) {
  if (mode === 'audio' && m !== 'audio') audio.pause();
  if (mode === 'youtube' && m !== 'youtube' && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
  mode = m;
  $('#ytWrap').hidden = m !== 'youtube';
  $('#embedWrap').hidden = m !== 'embed';
  if (m !== 'embed') $('#embedWrap').innerHTML = '';
  $('#mediaDock').hidden = m !== 'youtube' && m !== 'embed';
  document.body.classList.toggle('video-mode', m === 'youtube' || m === 'embed');
}

function isPlaying() {
  if (mode === 'audio') return !audio.paused;
  if (mode === 'youtube' && ytPlayer?.getPlayerState) return ytPlayer.getPlayerState() === 1;
  return false;
}
function duration() {
  if (mode === 'audio') return isFinite(audio.duration) ? audio.duration : 0;
  if (mode === 'youtube' && ytPlayer?.getDuration) return ytPlayer.getDuration() || 0;
  return 0;
}
function current() {
  if (mode === 'audio') return audio.currentTime || 0;
  if (mode === 'youtube' && ytPlayer?.getCurrentTime) return ytPlayer.getCurrentTime() || 0;
  return 0;
}
function seek(t) {
  if (mode === 'audio' && isFinite(audio.duration)) audio.currentTime = t;
  else if (mode === 'youtube' && ytPlayer?.seekTo) ytPlayer.seekTo(t, true);
}
function setVolume(v) {
  S.volume = v;
  audio.volume = v;
  $('#vol').style.setProperty('--p', (v * 100) + '%');
  if (ytPlayer?.setVolume) ytPlayer.setVolume(v * 100);
  store.set('volume', v);
}

function playSong(id, list) {
  if (list && list.length) S.queue = [...list];
  if (!S.queue.includes(id)) S.queue = [id];
  playAt(S.queue.indexOf(id));
}

function playAt(i) {
  for (let tries = 0; tries < S.queue.length; tries++) {
    const idx = (i + S.queue.length) % S.queue.length;
    const s = S.songs.find(x => x.id === S.queue[idx]);
    if (s) { S.index = idx; loadSong(s); return; }
    i = idx + 1; // song was deleted: skip it
  }
  stopAll();
}

function loadSong(s) {
  S.current = s;
  if (s.sourceType === 'youtube') {
    const d = detect(s.sourceUrl);
    if (!d) { toast('This YouTube link is not valid.'); return; }
    setMode('youtube');
    loadYtApi();
    if (ytReady) ensureYt(d.id); else pendingYt = d.id;
  } else if (s.sourceType === 'spotify' || s.sourceType === 'soundcloud') {
    const d = detect(s.sourceUrl);
    setMode('embed');
    $('#embedWrap').innerHTML = d?.embed
      ? `<iframe src="${esc(d.embed)}" title="${esc(s.title)}" allow="autoplay; encrypted-media; clipboard-write" loading="lazy"></iframe>`
      : '';
    if (!d?.embed) toast('This link is not a valid Spotify or SoundCloud link.');
  } else {
    setMode('audio');
    audio.src = s.src;
    audio.play().catch(() => toast('Tap play to start the song.'));
  }
  C.countPlay(s);
  updateNowPlaying();
  syncMediaSession();
}

function stopAll() {
  audio.pause();
  audio.removeAttribute('src');
  if (ytPlayer?.stopVideo) ytPlayer.stopVideo();
  setMode(null);
  S.current = null;
  S.queue = [];
  S.index = -1;
  updateNowPlaying();
}

function togglePlay() {
  if (!S.current) {
    const l = sortedNew();
    if (l.length) playSong(l[0].id, l.map(s => s.id));
    return;
  }
  if (mode === 'audio') {
    if (audio.paused) audio.play().catch(() => toast('Tap play again to start.'));
    else audio.pause();
  } else if (mode === 'youtube' && ytPlayer) {
    isPlaying() ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
  } else if (mode === 'embed') {
    toast('Use the controls inside the embedded player.');
  }
  refreshPlayBtn();
}

function next(auto) {
  if (!S.queue.length) return;
  let i;
  if (S.shuffle && S.queue.length > 1) {
    do { i = Math.floor(Math.random() * S.queue.length); } while (i === S.index);
  } else {
    i = S.index + 1;
    if (i >= S.queue.length) {
      if (auto && S.repeat !== 'all') { audio.pause(); refreshPlayBtn(); return; }
      i = 0;
    }
  }
  playAt(i);
}

function prev() {
  if (current() > 3) { seek(0); return; }
  if (!S.queue.length) return;
  const i = S.index > 0 ? S.index - 1 : (S.repeat === 'all' ? S.queue.length - 1 : 0);
  playAt(i);
}

function onEnded() {
  if (S.repeat === 'one') {
    seek(0);
    if (mode === 'audio') audio.play().catch(() => {});
    else if (ytPlayer?.playVideo) ytPlayer.playVideo();
    return;
  }
  next(true);
}

audio.addEventListener('ended', onEnded);
audio.addEventListener('play', refreshPlayBtn);
audio.addEventListener('pause', refreshPlayBtn);
audio.addEventListener('error', () => { if (mode === 'audio' && S.current) toast('Could not play this audio. Check the file or link.'); });

function refreshPlayBtn() {
  const p = isPlaying();
  $$('[data-act="toggle"]').forEach(b => { b.innerHTML = p ? ICON.pause : ICON.play; });
  $('#player').classList.toggle('is-playing', p);
}

function tick() {
  if (!S.current) return;
  const d = duration(), c = current();
  $$('.seek').forEach(el => {
    if (document.activeElement !== el) el.value = d ? Math.round(c / d * 1000) : 0;
    el.style.setProperty('--p', (d ? c / d * 100 : 0) + '%');
  });
  $$('.tcur').forEach(el => el.textContent = fmt(c));
  $$('.tdur').forEach(el => el.textContent = fmt(d));
}

function syncMediaSession() {
  if (!('mediaSession' in navigator) || !S.current) return;
  const s = S.current;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: s.title, artist: s.artist, album: s.album || 'SAN Player',
      artwork: [{ src: s.cover || 'assets/san-icon-512.png', sizes: '512x512' }]
    });
    navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying()) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying()) togglePlay(); });
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', () => next(false));
  } catch {}
}

/* ---------- now playing UI ---------- */
function updateNowPlaying() {
  const s = S.current;
  const liked = !!(s && S.liked.has(s.id));
  const badge = s ? (s.sourceType === 'upload' || !s.sourceType ? 'SAN' : sourceLabel(s) + (mode === 'embed' ? ' · embedded' : '')) : '';
  $('#pCover').innerHTML = s ? cover(s, 'mini') : `<div class="cover mini gen" style="--h:260">${ICON.music}</div>`;
  $('#pTitle').textContent = s ? s.title : 'Choose a song';
  $('#pArtist').textContent = s ? s.artist : 'Your music starts here';
  $('#pBadge').textContent = badge;
  $('#sCover').innerHTML = s ? cover(s, 'big') : `<div class="cover big gen" style="--h:260">${ICON.music}</div>`;
  $('#sTitle').textContent = s ? s.title : 'Choose a song';
  $('#sArtist').textContent = s ? s.artist : 'Your music starts here';
  $('#sBadge').textContent = badge;
  $('#sLyrics').textContent = s?.lyrics ? s.lyrics : 'No lyrics available for this song.';
  $$('[data-act="like"]').forEach(b => { if (!b.dataset.id) b.classList.toggle('on', liked); });
  $$('[data-act="shuffle"]').forEach(b => b.classList.toggle('on', S.shuffle));
  $$('[data-act="repeat"]').forEach(b => {
    b.classList.toggle('on', S.repeat !== 'off');
    b.dataset.mode = S.repeat;
  });
  refreshPlayBtn();
  tick();
}

function openSheet(open) {
  S.sheetOpen = open;
  $('#sheet').classList.toggle('open', open);
  document.body.classList.toggle('sheet-open', open);
}

/* ---------- likes and share ---------- */
function toggleLike(id) {
  if (!S.user) { toast('Log in to save likes.'); return; }
  if (S.liked.has(id)) S.liked.delete(id); else S.liked.add(id);
  C.saveLikes(S.user.uid, [...S.liked]).catch(() => toast('Could not save like.'));
  render();
}

async function shareSong(id) {
  const s = S.songs.find(x => x.id === id);
  if (!s) return;
  const url = `${location.origin}${location.pathname}?song=${encodeURIComponent(id)}`;
  try {
    if (navigator.share) { await navigator.share({ title: `${s.title} — ${s.artist}`, text: 'Listen on SAN Player', url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Song link copied');
  } catch (e) {
    if (e?.name === 'AbortError') return;
    try { await navigator.clipboard.writeText(url); toast('Song link copied'); }
    catch { prompt('Copy this link', url); }
  }
}

/* ---------- admin dashboard ---------- */
function openAdmin(tab = 'add') {
  if (!S.admin) { toast('Admin only.'); return; }
  S.adminTab = tab;
  $('#modal').hidden = false;
  renderAdmin();
}
function closeModal() { $('#modal').hidden = true; S.editing = null; }

function renderAdmin() {
  const tabs = [['add', 'Add song'], ['bulk', 'Bulk upload'], ['library', 'Library'], ['stats', 'Storage & stats']];
  $('#modalBody').innerHTML = `
    <div class="admin-head"><h2>Admin dashboard</h2><p class="muted">Everything you publish here is instantly playable by every visitor, logged in or not.</p></div>
    <div class="seg">${tabs.map(([k, l]) => `<button data-act="tab" data-tab="${k}" class="${S.adminTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="adminPane"></div>`;
  const pane = $('#adminPane');
  ({ add: paneAdd, bulk: paneBulk, library: paneLibrary, stats: paneStats })[S.adminTab](pane);
}

function paneAdd(p) {
  const e = S.editing ? S.songs.find(s => s.id === S.editing) : null;
  const linkVal = e && e.sourceType !== 'upload' ? (e.sourceUrl || e.src || '') : '';
  p.innerHTML = `<form id="songForm" class="form">
    <div class="grid2">
      <label>Song title<input name="title" required value="${esc(e?.title || '')}"></label>
      <label>Artist<input name="artist" required value="${esc(e?.artist || '')}"></label>
    </div>
    <div class="grid2">
      <label>Album<input name="album" value="${esc(e?.album || '')}"></label>
      <label>Genre<input name="genre" value="${esc(e?.genre || '')}"></label>
    </div>
    <div class="grid2">
      <label class="drop">${ICON.upload}<span id="audioName">${e?.sourceType === 'upload' ? 'Current file kept. Choose to replace.' : 'Upload audio (MP3, WAV, OGG, M4A, AAC, FLAC · max 50 MB)'}</span><input class="sr-only" type="file" name="audioFile" accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"></label>
      <label class="drop">${ICON.upload}<span id="coverName">Upload cover image (max 5 MB)</span><input class="sr-only" type="file" name="coverFile" accept="image/*"></label>
    </div>
    <label>…or a link: direct audio URL, YouTube, Spotify or SoundCloud
      <input name="audioUrl" placeholder="https://" value="${esc(linkVal)}"></label>
    <label>Cover image URL (optional)
      <input name="coverUrl" placeholder="https://" value="${esc(e?.cover && !e.cover.includes('firebasestorage') ? e.cover : '')}"></label>
    <label>Lyrics (optional)<textarea name="lyrics" rows="5">${esc(e?.lyrics || '')}</textarea></label>
    <div class="form-foot">
      <span id="adminStatus" class="muted"></span>
      ${e ? `<button type="button" class="btn ghost" data-act="tab" data-tab="library">Cancel</button>` : ''}
      <button class="btn primary" type="submit">${e ? 'Save changes' : 'Publish song'}</button>
    </div>
  </form>`;
  const form = $('#songForm');
  form.onchange = ev => {
    if (ev.target.name === 'audioFile') $('#audioName').textContent = ev.target.files[0]?.name || 'Upload audio';
    if (ev.target.name === 'coverFile') $('#coverName').textContent = ev.target.files[0]?.name || 'Upload cover image';
  };
  form.onsubmit = async ev => {
    ev.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const song = await buildSong(form, e, msg => { $('#adminStatus').textContent = msg; });
      await C.saveSong(song);
      S.editing = null;
      toast('Song published');
      S.adminTab = 'library';
      renderAdmin();
    } catch (err) {
      toast(err.message || 'Could not save the song.');
      btn.disabled = false;
    }
  };
}

async function buildSong(form, old, status) {
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim();
  const artist = String(fd.get('artist') || '').trim();
  if (!title || !artist) throw Error('Title and artist are required.');

  const song = {
    id: old?.id || 's' + Date.now() + Math.random().toString(36).slice(2, 6),
    title, artist,
    album: String(fd.get('album') || '').trim(),
    genre: String(fd.get('genre') || '').trim(),
    lyrics: String(fd.get('lyrics') || ''),
    sourceType: old?.sourceType || 'upload', sourceUrl: old?.sourceUrl || '', src: old?.src || '', audioKey: old?.audioKey || '',
    cover: old?.cover || '', audioBytes: old?.audioBytes || 0, coverBytes: old?.coverBytes || 0,
    plays: old?.plays || 0, createdAt: old?.createdAt || Date.now()
  };

  const audioFile = fd.get('audioFile');
  const link = String(fd.get('audioUrl') || '').trim();
  const coverFile = fd.get('coverFile');
  const coverUrl = String(fd.get('coverUrl') || '').trim();

  if (audioFile && audioFile.size) {
    status('Uploading audio…');
    const r = await C.upload(audioFile, 'audio', p => status(`Uploading audio ${Math.round(p * 100)}%`));
    Object.assign(song, { sourceType: 'upload', src: r.url, audioKey: r.key, sourceUrl: '', audioBytes: r.bytes });
  } else if (link && link !== (old?.sourceUrl || old?.src || '')) {
    const d = detect(link);
    if (!d) throw Error('Link must start with https://');
    if (d.type === 'youtube_playlist') throw Error('Playlist links are not supported. Paste a single video link.');
    if (d.type === 'other') Object.assign(song, { sourceType: 'other', src: link, sourceUrl: '', audioKey: '', audioBytes: 0 });
    else Object.assign(song, { sourceType: d.type, sourceUrl: link, src: '', audioKey: '', audioBytes: 0 });
  } else if (!old && !link) {
    throw Error('Choose an audio file or paste a link.');
  }

  if (coverFile && coverFile.size) {
    status('Uploading cover…');
    const r = await C.upload(coverFile, 'covers');
    song.cover = r.url;
    song.coverKey = r.key;
    song.coverBytes = r.bytes;
  } else if (coverUrl && coverUrl !== old?.cover) {
    if (!/^https:\/\//.test(coverUrl)) throw Error('Cover URL must start with https://');
    song.cover = coverUrl;
    song.coverKey = '';
    song.coverBytes = 0;
  } else if (!song.cover && song.sourceType === 'youtube') {
    const d = detect(song.sourceUrl);
    if (d) song.cover = `https://i.ytimg.com/vi/${d.id}/hqdefault.jpg`;
  }
  return song;
}

function paneBulk(p) {
  p.innerHTML = `<form id="bulkForm" class="form">
    <label class="drop wide">${ICON.upload}<span id="bulkName">Choose several audio files. Names like "Artist - Song title.mp3" fill in the fields for you.</span>
      <input class="sr-only" type="file" name="files" multiple accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"></label>
    <div id="bulkRows" class="bulk-rows"></div>
    <div class="form-foot"><span id="adminStatus" class="muted"></span><button class="btn primary" type="submit" id="bulkBtn" disabled>Publish all</button></div>
  </form>`;
  const form = $('#bulkForm');
  let files = [];
  form.elements.files.onchange = () => {
    files = [...form.elements.files.files];
    $('#bulkName').textContent = `${files.length} file(s) selected`;
    $('#bulkRows').innerHTML = files.map((f, i) => {
      const { artist, title } = parseName(f.name);
      return `<div class="bulk-row"><input data-i="${i}" data-f="title" value="${esc(title)}" placeholder="Title"><input data-i="${i}" data-f="artist" value="${esc(artist)}" placeholder="Artist"><small class="muted">${mb(f.size)}</small></div>`;
    }).join('');
    $('#bulkBtn').disabled = !files.length;
  };
  form.onsubmit = async ev => {
    ev.preventDefault();
    const btn = $('#bulkBtn');
    btn.disabled = true;
    let done = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const title = $(`[data-i="${i}"][data-f="title"]`).value.trim();
        const artist = $(`[data-i="${i}"][data-f="artist"]`).value.trim();
        if (!title || !artist) throw Error(`File ${i + 1}: title and artist are required.`);
        const r = await C.upload(files[i], 'audio', p => { $('#adminStatus').textContent = `File ${i + 1}: ${Math.round(p * 100)}%`; });
        await C.saveSong({
          id: 's' + Date.now() + '_' + i, title, artist, album: '', genre: '', lyrics: '',
          sourceType: 'upload', sourceUrl: '', src: r.url, audioKey: r.key, cover: '', coverKey: '', audioBytes: r.bytes, coverBytes: 0,
          plays: 0, createdAt: Date.now() + i
        });
        done++;
        btn.textContent = `Uploaded ${done}/${files.length}`;
      }
      toast(`${done} songs published.`);
      S.adminTab = 'library';
      renderAdmin();
    } catch (err) {
      toast(err.message || 'Bulk upload failed.');
      btn.disabled = false;
      btn.textContent = 'Retry upload';
    }
  };
}

function parseName(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim();
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: base };
}

function paneLibrary(p) {
  const list = sortedNew();
  p.innerHTML = `<div class="lib-head"><h3>Published library (${list.length})</h3>
      <button class="btn ghost small" data-act="tab" data-tab="add">${ICON.plus} Add song</button></div>
    <div class="list glass">${list.map(s => `<div class="row admin-row">${cover(s, 'xs')}
        <div class="meta"><b>${esc(s.title)}</b><small>${esc(s.artist)} · ${s.plays || 0} plays · ${sourceLabel(s)}</small></div>
        <button class="btn small ghost" data-act="edit" data-id="${esc(s.id)}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${esc(s.id)}">Delete</button></div>`).join('') || emptyState('No songs published yet.')}</div>`;
}

function paneStats(p) {
  const sum = k => S.songs.reduce((n, s) => n + (s[k] || 0), 0);
  const audio = sum('audioBytes'), covers = sum('coverBytes');
  const artists = new Set(S.songs.map(s => s.artist)).size;
  const stat = (v, l) => `<div class="stat glass-sm"><b>${v}</b><span>${l}</span></div>`;
  p.innerHTML = `<div class="stats">${stat(S.songs.length, 'Songs')}${stat(artists, 'Artists')}${stat(sum('plays'), 'Plays')}${stat(mb(audio + covers), 'Audio + covers (est.)')}</div>
    <div class="glass-sm info">${ICON.cloud}<div><b>Cloudflare R2 Storage</b><p class="muted">Audio and cover files are stored in your Cloudflare R2 bucket. Limits: 50 MB per audio file, 5 MB per cover. Deleting a song also removes its R2 files. Sizes are estimates from uploads made here.</p>
      <p class="muted">Audio files ${mb(audio)} · Cover images ${mb(covers)}</p></div></div>
    <h3 class="sec">Most played</h3>
    <div class="list glass">${sortedPop().slice(0, 8).map((s, i) => row(s, i)).join('') || emptyState('No songs uploaded yet.')}</div>`;
}

async function deleteSong(id) {
  const s = S.songs.find(x => x.id === id);
  if (!s || !confirm(`Delete "${s.title}" for everyone? Its uploaded files will be removed too.`)) return;
  try {
    await C.deleteSong(s);
    if (S.current?.id === id) stopAll();
    S.queue = S.queue.filter(x => x !== id);
    toast('Song deleted');
    renderAdmin();
  } catch (e) {
    toast('Delete failed: ' + e.message);
  }
}

/* ---------- actions (delegated) ---------- */
const ACT = {
  go: el => go(el.dataset.view),
  play: el => playSong(el.dataset.id, S.viewList),
  playall: () => {
    const ids = S.viewList.length ? S.viewList : sortedNew().map(s => s.id);
    if (!ids.length) return toast('No songs yet.');
    S.shuffle = false;
    playSong(ids[0], ids);
  },
  shuffleall: () => {
    const ids = S.viewList.length ? S.viewList : sortedNew().map(s => s.id);
    if (!ids.length) return toast('No songs yet.');
    S.shuffle = true;
    playSong(ids[Math.floor(Math.random() * ids.length)], ids);
  },
  toggle: togglePlay,
  next: () => next(false),
  prev,
  shuffle: () => { S.shuffle = !S.shuffle; updateNowPlaying(); toast(S.shuffle ? 'Shuffle on' : 'Shuffle off'); },
  repeat: () => {
    S.repeat = S.repeat === 'off' ? 'all' : S.repeat === 'all' ? 'one' : 'off';
    updateNowPlaying();
    toast(S.repeat === 'off' ? 'Repeat off' : S.repeat === 'all' ? 'Repeat all' : 'Repeat one');
  },
  like: el => { const id = el.dataset.id || S.current?.id; if (id) toggleLike(id); },
  share: el => { const id = el.dataset.id || S.current?.id; if (id) shareSong(id); },
  'sheet-open': () => openSheet(true),
  'sheet-close': () => openSheet(false),
  search: el => { S.search = el.dataset.q || ''; go('search'); },
  login: () => C.login().catch(e => toast(e.message)),
  logout: () => C.logout(),
  install: installApp,
  admin: () => openAdmin(),
  tab: el => { S.adminTab = el.dataset.tab; S.editing = null; renderAdmin(); },
  edit: el => { S.editing = el.dataset.id; S.adminTab = 'add'; renderAdmin(); },
  del: el => deleteSong(el.dataset.id),
  'close-modal': closeModal
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) ACT[el.dataset.act](el, e);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList.contains('seek')) {
    const d = duration();
    if (d) seek((t.value / 1000) * d);
  } else if (t.id === 'vol') {
    setVolume(+t.value);
  }
});
document.addEventListener('keydown', e => {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.key === 'Escape') { openSheet(false); closeModal(); }
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ---------- install as an app ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; toast('SAN Player installed.'); });
async function installApp() {
  if (!deferredInstall) {
    toast('iPhone: tap Share → Add to Home Screen. Android/PC: use the browser menu → Install.');
    return;
  }
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
}

/* ---------- data from Firebase ---------- */
function onSongs(list) {
  S.songs = list;
  S.loaded = true;
  if (S.current) {
    const fresh = list.find(s => s.id === S.current.id);
    if (fresh) S.current = fresh;
  }
  if (!S.deepLinkDone) {
    S.deepLinkDone = true;
    const sid = new URLSearchParams(location.search).get('song');
    if (sid) {
      const s = list.find(x => x.id === sid);
      if (s) playSong(s.id, sortedNew().map(x => x.id));
      else toast('That shared song is no longer available.');
    }
  }
  render();
}

function onUser(user, admin) {
  S.user = user;
  S.admin = admin;
  if (libUnsub) { libUnsub(); libUnsub = null; }
  if (user) {
    libUnsub = C.watchLibrary(user.uid, d => { S.liked = new Set(d.likes || []); render(); });
  } else {
    S.liked = new Set();
  }
  render();
}

/* ---------- boot ---------- */
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ICON[el.dataset.icon] || ''; });
$('#vol').value = S.volume;
setVolume(S.volume);

if (window.SAN_FIREBASE_CONFIG) {
  try {
    C.init(window.SAN_FIREBASE_CONFIG, {
      onSongs,
      onUser,
      onError: e => toast('Could not sync songs: ' + e.message)
    });
  } catch (e) {
    S.loaded = true;
    toast('Firebase error: ' + e.message);
  }
} else {
  S.loaded = true;
  toast('Firebase config is missing (firebase-config.js).');
}

setInterval(tick, 300);
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
