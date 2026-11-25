/* Cartas arrastáveis (porte em JS puro do componente DraggableCardBody).
   Cada carta acompanha o mouse com inclinação 3D e brilho nas bordas, pode ser arrastada e continua deslizando com inércia. */
(() => {
  const stage = document.getElementById('dragStage');
  if (!stage) return;
  const cards = [...stage.querySelectorAll('.dcard')];
  if (!cards.length) return;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SPRING = { k: 100, c: 20, m: 0.5 }; // mesmos valores do componente original
  let zTop = 10, raf = 0, last = 0;

  const S = cards.map((el) => ({
    el, glare: el.querySelector('.dcard-glare'),
    x: 0, y: 0, vx: 0, vy: 0,
    rx: 0, ry: 0, vrx: 0, vry: 0, trx: 0, try_: 0,
    sc: 1, vsc: 0, tsc: 1,
    op: 1, vop: 0, top: 1, gl: 0, vgl: 0, tgl: 0,
    dragging: false, sx: 0, sy: 0, ox: 0, oy: 0, lastX: 0, lastY: 0, lastT: 0, pvx: 0, pvy: 0, baseRot: parseFloat(el.dataset.rot || '0'),
  }));

  function bounds(s) {
    // a carta pode andar por todo o palco (o centro dela não sai de lá)
    const st = stage.getBoundingClientRect();
    const r = s.el.getBoundingClientRect();
    const baseLeft = r.left - s.x, baseTop = r.top - s.y; // posição sem o deslocamento
    return {
      minX: st.left - baseLeft - r.width * 0.15, maxX: st.right - baseLeft - r.width * 0.85,
      minY: st.top - baseTop - r.height * 0.15, maxY: st.bottom - baseTop - r.height * 0.85,
    };
  }

  function paint(s) {
    s.el.style.transform = `translate3d(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px,0) rotate(${s.baseRot}deg) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg) scale(${s.sc.toFixed(4)})`;
    s.el.style.opacity = clamp(s.op, 0, 1).toFixed(3);
    s.glare.style.opacity = clamp(s.gl, 0, 1).toFixed(3);
  }

  const spring = (v, t, vel, dt) => {
    const a = (-SPRING.k * (v - t) - SPRING.c * vel) / SPRING.m;
    const nv = vel + a * dt;
    return [v + nv * dt, nv];
  };

  function step(now) {
    const dt = last ? Math.min(0.034, (now - last) / 1000) : 1 / 60;
    last = now;
    let busy = false;
    S.forEach((s) => {
      [s.rx, s.vrx] = spring(s.rx, s.trx, s.vrx, dt);
      [s.ry, s.vry] = spring(s.ry, s.try_, s.vry, dt);
      [s.sc, s.vsc] = spring(s.sc, s.tsc, s.vsc, dt);
      [s.op, s.vop] = spring(s.op, s.top, s.vop, dt);
      [s.gl, s.vgl] = spring(s.gl, s.tgl, s.vgl, dt);
      if (!s.dragging && (Math.abs(s.vx) > 6 || Math.abs(s.vy) > 6)) {
        // inércia depois de soltar: desacelera e quica de leve nas bordas do palco
        const b = bounds(s);
        const f = Math.exp(-3.2 * dt);
        s.vx *= f; s.vy *= f;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < b.minX) { s.x = b.minX; s.vx = Math.abs(s.vx) * 0.35; }
        if (s.x > b.maxX) { s.x = b.maxX; s.vx = -Math.abs(s.vx) * 0.35; }
        if (s.y < b.minY) { s.y = b.minY; s.vy = Math.abs(s.vy) * 0.35; }
        if (s.y > b.maxY) { s.y = b.maxY; s.vy = -Math.abs(s.vy) * 0.35; }
      } else if (!s.dragging) { s.vx = 0; s.vy = 0; }
      paint(s);
      if (s.dragging || Math.abs(s.vx) > 6 || Math.abs(s.vy) > 6 || Math.abs(s.rx - s.trx) > 0.02 || Math.abs(s.ry - s.try_) > 0.02 || Math.abs(s.vrx) > 0.05 || Math.abs(s.vry) > 0.05 || Math.abs(s.sc - s.tsc) > 0.0005 || Math.abs(s.gl - s.tgl) > 0.002 || Math.abs(s.op - s.top) > 0.002) busy = true;
    });
    if (busy) raf = requestAnimationFrame(step);
    else { raf = 0; last = 0; }
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(step); } };

  function tilt(s, e) {
    const r = s.el.getBoundingClientRect();
    const mx = e.clientX - (r.left + r.width / 2);
    const my = e.clientY - (r.top + r.height / 2);
    s.trx = clamp(my / 300, -1, 1) * -25;
    s.try_ = clamp(mx / 300, -1, 1) * 25;
    const edge = Math.min(1, Math.abs(mx) / 300);
    s.top = 1 - 0.2 * edge;
    s.tgl = 0.2 * edge;
  }
  const relax = (s) => { s.trx = 0; s.try_ = 0; s.top = 1; s.tgl = 0; };

  S.forEach((s) => {
    const el = s.el;
    el.addEventListener('pointerenter', () => { s.tsc = 1.02; kick(); });
    el.addEventListener('pointerleave', (e) => { if (s.dragging) return; relax(s); s.tsc = 1; kick(); });
    el.addEventListener('pointermove', (e) => {
      if (s.dragging) {
        const now = performance.now();
        const b = bounds(s);
        s.x = clamp(s.ox + (e.clientX - s.sx), b.minX, b.maxX);
        s.y = clamp(s.oy + (e.clientY - s.sy), b.minY, b.maxY);
        const dtm = Math.max(1, now - s.lastT);
        s.pvx = s.pvx * 0.6 + ((e.clientX - s.lastX) / dtm * 1000) * 0.4;
        s.pvy = s.pvy * 0.6 + ((e.clientY - s.lastY) / dtm * 1000) * 0.4;
        s.lastX = e.clientX; s.lastY = e.clientY; s.lastT = now;
      } else if (e.pointerType === 'mouse') {
        tilt(s, e);
      }
      kick();
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      s.dragging = true;
      s.sx = e.clientX; s.sy = e.clientY; s.ox = s.x; s.oy = s.y;
      s.lastX = e.clientX; s.lastY = e.clientY; s.lastT = performance.now(); s.pvx = 0; s.pvy = 0; s.vx = 0; s.vy = 0;
      el.style.zIndex = ++zTop;
      el.classList.add('is-dragging');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* o arrasto continua sem a captura */ }
      kick();
    });
    const end = (e) => {
      if (!s.dragging) return;
      s.dragging = false;
      el.classList.remove('is-dragging');
      // inércia: continua deslizando com a velocidade do gesto (limitada; se parou antes de soltar, não desliza)
      const fresh = performance.now() - s.lastT < 90;
      s.vx = fresh ? clamp(s.pvx * 0.55, -1800, 1800) : 0;
      s.vy = fresh ? clamp(s.pvy * 0.55, -1800, 1800) : 0;
      relax(s);
      if (e.pointerType !== 'mouse') s.tsc = 1;
      kick();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dragstart', (e) => e.preventDefault());
  });
  window.addEventListener('resize', () => { S.forEach((s) => { s.x = 0; s.y = 0; s.vx = 0; s.vy = 0; paint(s); }); });
  S.forEach(paint);
})();
