/* overview.js — Masonry + v2 Lightbox（外側矢印/×・キャプション・スワイプ） */
(function () {
  // Masonry 初期化
  window.addEventListener('load', () => {
    const grid = document.querySelector('.masonry');
    if (!grid) return;

    const msnry = new Masonry(grid, {
      itemSelector: '.masonry-item',
      columnWidth: '.masonry-sizer',
      gutter: '.masonry-gutter',
      percentPosition: true,
      transitionDuration: 0
    });

    imagesLoaded(grid).on('progress', () => msnry.layout());
    window.addEventListener('resize', () => msnry.layout());
  });






  // ===== Lightbox (v2) — JS only =====
(() => {
  const grid = document.querySelector('.masonry');
  if (!grid) return;

  // 並び順で画像リストを作成（<a data-title> があれば優先）
  const items  = Array.from(grid.querySelectorAll('.masonry-item'));
  const images = items.map(it => {
    const a   = it.querySelector('a');
    const img = it.querySelector('img');
    const src = a?.getAttribute('href') || img?.getAttribute('src');
    const cap = a?.getAttribute('data-title') || img?.getAttribute('alt') || '';
    const el  = a || img;
    return src ? { el, src, cap } : null;
　　}).filter(it => it && it.src);


  // data-index を付与（委譲で拾う）
  images.forEach((info, i) => {
    info.el.dataset.lbIndex = String(i);
    info.el.style.cursor = 'zoom-in';
  });

  // v2 viewer 参照
  const viewer   = document.getElementById('v2-viewer');
  const frame    = viewer?.querySelector('.v2-frame');
  const box      = viewer?.querySelector('.v2-box');
  const imgEl    = document.getElementById('v2-img');
  const capEl    = viewer?.querySelector('.v2-cap');
  const btnPrev  = viewer?.querySelector('.v2-prev');
  const btnNext  = viewer?.querySelector('.v2-next');
  const btnClose = viewer?.querySelector('.v2-close');
  const backdrop = viewer?.querySelector('.v2-backdrop');

  if (!viewer || !frame || !box || !imgEl || !capEl || !btnPrev || !btnNext || !btnClose || !backdrop) return;

  let index = 0, open = false;

  function show(i){
    index = (i + images.length) % images.length;
    const { src, cap } = images[index];
    imgEl.style.opacity = '0';          // フェードしたい場合
    imgEl.removeAttribute('width');
    imgEl.removeAttribute('height');
    imgEl.src = src;
    imgEl.alt = cap || '';
    capEl.textContent = cap || '';
    window.__updateLightboxNav?.();     // あらかじめ一度配置
  }

  // 画像読み込み後にフェード＋再配置
  imgEl.addEventListener('load', () => {
    requestAnimationFrame(() => {
      imgEl.style.opacity = '1';
      window.__updateLightboxNav?.();
    });
  });

  function openV2(i){
    open = true;
    viewer.hidden = false;
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    show(i);
  }
  function closeV2(){
    open = false;
    viewer.hidden = true;
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    imgEl.src = '';
  }
  const next = () => show(index + 1);
  const prev = () => show(index - 1);

  // 外部から統一操作できるように公開
  window.__v2_api__ = { move: (dir) => (dir > 0 ? next() : prev()) };

  // サムネイルクリック（委譲）
  grid.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest('[data-lb-index]') : null;
    if (!t) return;
    e.preventDefault();
    openV2(Number(t.getAttribute('data-lb-index') || 0));
  });

  // ボタン・背景
  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  btnClose.addEventListener('click', closeV2);
  backdrop.addEventListener('click', closeV2);

  // キー操作
  window.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') closeV2();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft')  prev();
  });

  // ===== 画像“外側”に矢印を一定間隔で配置 =====
  function cssPx(varName, fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const n = parseFloat(v); return Number.isFinite(n) ? n : fallback;
  }
  function updateNavPosition(){
    const hit = cssPx('--v2-hit-size', 56);
    const gap = cssPx('--v2-gap', 12);
    const rect = box.getBoundingClientRect();       // 画像＋キャプションの箱
    const cy   = Math.round(rect.top + rect.height/2 - hit/2);

    let leftX  = Math.round(rect.left  - gap - hit);
    let rightX = Math.round(rect.right + gap);

    leftX  = Math.max(4, leftX);
    rightX = Math.min(window.innerWidth - hit - 4, rightX);

    // prev
    btnPrev.style.position = 'fixed';
    btnPrev.style.left  = leftX + 'px';
    btnPrev.style.right = '';
    btnPrev.style.top   = cy + 'px';
    // next
    btnNext.style.position = 'fixed';
    btnNext.style.left  = '';
    btnNext.style.right = (window.innerWidth - rightX - hit) + 'px';
    btnNext.style.top   = cy + 'px';
  }
  window.__updateLightboxNav = updateNavPosition;

  const ro = new ResizeObserver(updateNavPosition);
  ro.observe(box);
  window.addEventListener('resize', updateNavPosition, { passive:true });
  frame.addEventListener('scroll', updateNavPosition, { passive:true });

  // ===== ジェスチャ（スワイプ／ドラッグ／二本指） =====
  // タッチスワイプ
  let tX=0, tY=0, moved=false;
  viewer.addEventListener('touchstart', e=>{
    const t = e.touches[0]; tX=t.clientX; tY=t.clientY; moved=false;
  }, {passive:true});
  viewer.addEventListener('touchmove', ()=>{ moved=true; }, {passive:true});
  viewer.addEventListener('touchend', e=>{
    if (!moved) return;
    const dx = e.changedTouches[0].clientX - tX;
    const dy = Math.abs(e.changedTouches[0].clientY - tY);
    if (Math.abs(dx) > 40 && dy < 80) window.__v2_api__?.move(dx < 0 ? +1 : -1);
  }, {passive:true});

  // マウス／トラックパッドのドラッグ
  let dragX=0, dragging=false;
  frame.addEventListener('pointerdown', e=>{
    const el = e.target;
    if (el instanceof Element && el.closest('.v2-nav, .v2-close')) return;
    dragging = true; dragX = e.clientX;
    try { frame.setPointerCapture?.(e.pointerId); } catch {}
  });
  frame.addEventListener('pointerup', e=>{
    if (!dragging) return;
    const dx = e.clientX - dragX; dragging = false;
    try { frame.releasePointerCapture?.(e.pointerId); } catch {}
    if (Math.abs(dx) > 60) window.__v2_api__?.move(dx < 0 ? +1 : -1);
  });
  frame.addEventListener('pointercancel', ()=>{ dragging=false; });

  // Mac 二本指スワイプ（水平ホイール）
  const THRESHOLD=120, MIN_STEP=4, DECAY_MS=260, COOLDOWN_MS=350, INVERT=false;
  let accum=0, lastT=0, sign=0, locked=false;
  frame.addEventListener('wheel', e=>{
    if (viewer.getAttribute('aria-hidden') !== 'false') return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (locked) return;

    const now=performance.now(), dt= lastT? now-lastT : 16; lastT=now;
    accum *= Math.exp(-dt/DECAY_MS);
    if (Math.abs(e.deltaX) < MIN_STEP) return;

    const s = Math.sign(e.deltaX) || 0;
    if (sign === 0 || s === sign) accum += e.deltaX; else { sign=s; accum=e.deltaX; }
    sign = s;

    if (Math.abs(accum) >= THRESHOLD){
      let dir = accum < 0 ? +1 : -1; if (INVERT) dir = -dir;
      window.__v2_api__?.move(dir);
      accum=0; sign=0; locked=true; setTimeout(()=>locked=false, COOLDOWN_MS);
    }
  }, {passive:false});
})();




})();


