/* ===================================
   VECTRASIM 404 PAGE BEHAVIOUR
   =================================== */

const SITE_INDEX = [
  { title: 'Home', href: '/', keywords: ['home', 'main', 'console', 'hub', 'landing'] },
  { title: 'SLAM Simulator', href: '/slam.html', keywords: ['slam', 'lidar', 'mapping', 'localization'] },
  { title: 'SLAM Landing', href: '/src/slam_landing.html', keywords: ['slam', 'landing', 'intro'] },
  { title: 'NEXUS Simulator', href: '/nexus.html', keywords: ['nexus', 'navigation', 'path', 'planning'] },
  { title: 'NEXUS Landing', href: '/src/nexus_landing.html', keywords: ['nexus', 'landing', 'intro'] },
  { title: 'HIVE Simulator', href: '/hive.html', keywords: ['hive', 'swarm', 'multi', 'robot', 'coordination'] },
  { title: 'HIVE Landing', href: '/src/hive_landing.html', keywords: ['hive', 'landing', 'intro'] },
  { title: 'Privacy Policy', href: '/privacy.html', keywords: ['privacy', 'policy', 'data', 'gdpr'] },
  { title: 'Terms of Service', href: '/terms.html', keywords: ['terms', 'service', 'legal', 'tos'] },
];

function scoreMatch(query, item) {
  const q = query.toLowerCase();
  let score = 0;
  if (item.title.toLowerCase().includes(q)) score += 100;
  if (item.href.includes(q)) score += 50;
  for (const kw of item.keywords) {
    if (kw.includes(q)) score += 30;
  }
  if (item.href.split('/').some(seg => seg.includes(q))) score += 20;
  return score;
}

function renderResults(query) {
  const list = document.getElementById('nf-results');
  if (!list) return;
  if (!query.trim()) {
    list.innerHTML = '<p class="nf-results-empty" aria-live="polite">Type to search&hellip;</p>';
    return;
  }
  const ranked = SITE_INDEX
    .map(item => ({ item, score: scoreMatch(query, item) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  if (ranked.length === 0) {
    list.innerHTML = '<p class="nf-results-empty" aria-live="polite">No matches for &ldquo;<strong>' +
      query.replace(/[&<>]/g, c => ({'&':'&','<':'<','>':'>'}[c])) + '&ldquo;</p>';
    return;
  }
  list.innerHTML = ranked.map(r =>
    `<a href="${r.item.href}"><span>${r.item.title}</span><span>${r.item.href}</span></a>`
  ).join('');
}

function showSuggestion(path) {
  const el = document.getElementById('nf-suggestion');
  if (!el) return;
  const p = path.toLowerCase();
  let suggestion = null;
  if (p.includes('slam')) suggestion = { title: 'SLAM Simulator', href: '/slam.html' };
  else if (p.includes('nexus')) suggestion = { title: 'NEXUS Simulator', href: '/nexus.html' };
  else if (p.includes('hive')) suggestion = { title: 'HIVE Simulator', href: '/hive.html' };
  else if (p.includes('privacy') || p.includes('policy')) suggestion = { title: 'Privacy Policy', href: '/privacy.html' };
  else if (p.includes('terms') || p.includes('tos')) suggestion = { title: 'Terms of Service', href: '/terms.html' };
  else if (p.includes('hub') || p === '/' || p === '/index.html') suggestion = { title: 'Home Console', href: '/' };
  if (suggestion) {
    el.innerHTML = `Did you mean <a href="${suggestion.href}">${suggestion.title}</a>?`;
  } else {
    el.innerHTML = '';
  }
}

function init() {
  const path = window.location.pathname + window.location.search;
  const pathEl = document.getElementById('nf-path');
  if (pathEl) {
    pathEl.textContent = path;
  }

  const searchInput = document.getElementById('nf-search-input');
  const resultsEl = document.getElementById('nf-results');

  if (searchInput && resultsEl) {
    searchInput.value = path;
    searchInput.addEventListener('input', e => renderResults(e.target.value));
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstLink = resultsEl.querySelector('a');
        if (firstLink) {
          firstLink.focus();
        }
      }
    });
    renderResults(path);
  }

  showSuggestion(path);

  const title = document.querySelector('.nf-title');
  if (title) {
    title.tabIndex = -1;
    requestAnimationFrame(() => {
      title.focus({ preventScroll: true });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}