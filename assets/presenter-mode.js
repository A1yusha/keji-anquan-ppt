(() => {
  const isPreview = new URLSearchParams(location.search).get('presenter-preview') === '1';
  if (isPreview) {
    document.body.classList.add('presenter-preview');
    const style = document.createElement('style');
    style.textContent = '#hint,#nav,#overview{display:none!important}.notes[data-hana-presenter="1"]{display:none!important}';
    document.head.appendChild(style);
    return;
  }

  const style = document.createElement('style');
  style.textContent = '.notes[data-hana-presenter="1"]{display:none!important}';
  document.head.appendChild(style);

  let presenterWin = null;
  const deck = document.getElementById('deck');
  const slides = deck ? Array.from(deck.querySelectorAll('.slide')) : [];

  function currentIndex() {
    return Math.max(0, Math.min(slides.length - 1, Number(window.__currentSlideIndex) || 0));
  }

  function noteFor(i) {
    return slides[i]?.querySelector('.notes[data-hana-presenter="1"]')?.innerHTML || '这一页还没有讲稿。';
  }

  function titleFor(i) {
    const s = slides[i];
    if (!s) return '';
    const pick = s.querySelector('.h-hero,.h-hero-zh,.h-xl,.h-xl-zh,.h-md,h1,h2,.title,.kicker');
    return (pick?.textContent || `第 ${i + 1} 页`).replace(/\s+/g, ' ').trim();
  }

  function previewUrl(i) {
    const u = new URL(location.href);
    u.searchParams.set('slide', String(i + 1));
    u.searchParams.set('presenter-preview', '1');
    return u.toString();
  }

  function presenterHtml() {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>演讲者模式 · 凿一面墙</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#111;color:#f6efe5;font-family:Inter,"Microsoft YaHei",system-ui,sans-serif;overflow:hidden}.app{height:100vh;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:42vh 1fr 86px;gap:12px;padding:12px}.card{background:#1d1b18;border:1px solid rgba(255,255,255,.14);border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.24)}.head{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.1);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#a8b8ff}iframe{width:100%;height:calc(100% - 42px);border:0;background:#f7f1e8}.notes{grid-column:1/3;padding:22px 26px;overflow:auto;font-size:28px;line-height:1.55;white-space:pre-wrap;background:#fff7e8;color:#211b16}.notes b,.notes strong{color:#002FA7}.bar{grid-column:1/3;display:grid;grid-template-columns:1fr auto auto auto auto;gap:12px;align-items:center;padding:0 18px;background:#1d1b18;border:1px solid rgba(255,255,255,.14);border-radius:18px}.title{font-size:18px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.meta{font-family:ui-monospace,Consolas,monospace;color:#bfb7aa}.timer{font-size:28px;font-weight:800;color:#79ffc1}.btn{border:0;border-radius:999px;background:#315dff;color:#fff;padding:12px 18px;font-weight:800;cursor:pointer}.btn.secondary{background:#3a332c}.hint{font-size:12px;color:#9f968c}
</style></head><body><div class="app"><section class="card"><div class="head"><span>Current</span><span id="curMeta"></span></div><iframe id="curFrame"></iframe></section><section class="card"><div class="head"><span>Next</span><span id="nextMeta"></span></div><iframe id="nextFrame"></iframe></section><section class="card notes" id="notes">等待主窗口同步……</section><section class="bar"><div><div class="title" id="slideTitle">演讲者模式</div><div class="hint">←/→ 或空格翻页；R 重置计时；关闭此窗口不会影响观众屏</div></div><button class="btn secondary" id="prevBtn">上一页</button><button class="btn" id="nextBtn">下一页</button><button class="btn secondary" id="resetBtn">重置计时</button><div class="timer" id="timer">00:00</div><div class="meta" id="counter">0 / 0</div></section></div><script>
let startedAt=Date.now();function fmt(ms){const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}setInterval(()=>{document.getElementById('timer').textContent=fmt(Date.now()-startedAt)},500);document.getElementById('prevBtn').onclick=()=>opener&&opener.postMessage({type:'presenter-command',cmd:'prev'},'*');document.getElementById('nextBtn').onclick=()=>opener&&opener.postMessage({type:'presenter-command',cmd:'next'},'*');document.getElementById('resetBtn').onclick=()=>{startedAt=Date.now()};addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' '){opener&&opener.postMessage({type:'presenter-command',cmd:'next'},'*')}if(e.key==='ArrowLeft'){opener&&opener.postMessage({type:'presenter-command',cmd:'prev'},'*')}if(e.key.toLowerCase()==='r'){startedAt=Date.now()}});addEventListener('message',e=>{const d=e.data||{};if(d.type!=='presenter-update')return;const curFrame=document.getElementById('curFrame');const nextFrame=document.getElementById('nextFrame');if(curFrame.src!==d.currentUrl)curFrame.src=d.currentUrl;if(nextFrame.src!==d.nextUrl)nextFrame.src=d.nextUrl;document.getElementById('notes').innerHTML=d.notes;document.getElementById('counter').textContent=(d.idx+1)+' / '+d.total;document.getElementById('curMeta').textContent=(d.idx+1)+' / '+d.total;document.getElementById('nextMeta').textContent=(Math.min(d.idx+2,d.total))+' / '+d.total;document.getElementById('slideTitle').textContent=d.title||''});setTimeout(()=>opener&&opener.postMessage({type:'presenter-ready'},'*'),100);
<\/script></body></html>`;
  }

  function syncPresenter() {
    if (!presenterWin || presenterWin.closed || slides.length === 0) return;
    const i = currentIndex();
    presenterWin.postMessage({
      type: 'presenter-update',
      idx: i,
      total: slides.length,
      title: titleFor(i),
      notes: noteFor(i),
      currentUrl: previewUrl(i),
      nextUrl: previewUrl(Math.min(i + 1, slides.length - 1)),
    }, '*');
  }

  function openPresenter() {
    if (presenterWin && !presenterWin.closed) {
      presenterWin.focus();
      syncPresenter();
      return;
    }
    presenterWin = window.open('', 'hanaPresenterMode', 'popup=yes,width=1280,height=800,left=80,top=80');
    if (!presenterWin) {
      alert('演讲者模式窗口被浏览器拦截了，请允许弹窗后重试。');
      return;
    }
    presenterWin.document.open();
    presenterWin.document.write(presenterHtml());
    presenterWin.document.close();
    setTimeout(syncPresenter, 250);
  }

  const oldGo = window.go;
  if (typeof oldGo === 'function' && !window.__hanaPresenterGoWrapped) {
    window.__hanaPresenterGoWrapped = true;
    window.go = function(n) {
      oldGo(n);
      setTimeout(syncPresenter, 40);
      setTimeout(syncPresenter, 760);
    };
  }

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'presenter-ready') syncPresenter();
    if (d.type === 'presenter-command') {
      if (d.cmd === 'next') window.go(currentIndex() + 1);
      if (d.cmd === 'prev') window.go(currentIndex() - 1);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key && e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openPresenter();
    }
  });
  window.addEventListener('click', () => setTimeout(syncPresenter, 80), true);
  window.openPresenterMode = openPresenter;
})();
