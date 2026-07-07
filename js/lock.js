/* ZERO-G :: Pattern Lock Engine
   Gerencia o canvas SVG do Pattern Lock (Tela 2)
   Grade 3x3, 9 nós (índices 0–8):
     [0][1][2]
     [3][4][5]
     [6][7][8]
*/

const LockEngine = (() => {
  const COLS = 3;
  const ROWS = 3;
  const TOTAL_NODES = COLS * ROWS;

  let canvas, ctx, dotEls;
  let sequence = [];
  let drawing = false;
  let currentPos = { x: 0, y: 0 };
  let onComplete = null; // callback(sequence)

  // ----- Inicialização -----
  function init(canvasEl, dotElements, completeCb) {
    canvas   = canvasEl;
    dotEls   = dotElements;
    onComplete = completeCb;

    ctx = canvas.getContext('2d');
    resize();

    // Touch events
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onEnd,   { passive: false });

    // Mouse events (para teste desktop)
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup',   onEnd);

    window.addEventListener('resize', resize);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    redraw();
  }

  // ----- Posição do dot no canvas -----
  function dotCenter(index) {
    const rect = canvas.getBoundingClientRect();
    const dotRect = dotEls[index].getBoundingClientRect();
    return {
      x: dotRect.left - rect.left + dotRect.width  / 2,
      y: dotRect.top  - rect.top  + dotRect.height / 2,
    };
  }

  // ----- Hit test: qual nó está perto de (x, y)? -----
  function hitNode(x, y) {
    const RADIUS = 28;
    for (let i = 0; i < TOTAL_NODES; i++) {
      const c = dotCenter(i);
      const dx = x - c.x;
      const dy = y - c.y;
      if (Math.sqrt(dx * dx + dy * dy) <= RADIUS) return i;
    }
    return -1;
  }

  // ----- Posição relativa ao canvas -----
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ----- Eventos -----
  function onStart(e) {
    e.preventDefault();
    drawing = true;
    sequence = [];
    resetDots();
    redraw();

    const pos = getPos(e);
    const hit = hitNode(pos.x, pos.y);
    if (hit >= 0) addNode(hit);
    currentPos = pos;
    redraw();
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    currentPos = pos;

    const hit = hitNode(pos.x, pos.y);
    if (hit >= 0 && !sequence.includes(hit)) {
      addNode(hit);
    }
    redraw();
  }

  function onEnd(e) {
    if (!drawing) return;
    drawing = false;
    redraw(false); // sem linha de arraste

    if (sequence.length >= 4 && onComplete) {
      onComplete([...sequence]);
    } else if (sequence.length < 4) {
      reset();
    }
  }

  // ----- Lógica de sequência -----
  function addNode(index) {
    sequence.push(index);
    dotEls[index].classList.add('active');
  }

  function resetDots() {
    dotEls.forEach(d => d.classList.remove('active'));
  }

  function reset() {
    sequence = [];
    drawing  = false;
    resetDots();
    redraw(false);
  }

  // ----- Desenho no canvas -----
  function redraw(showTrail = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (sequence.length === 0) return;

    ctx.strokeStyle = '#FFB000';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#FFB000';
    ctx.shadowBlur  = 8;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    ctx.beginPath();
    const first = dotCenter(sequence[0]);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < sequence.length; i++) {
      const c = dotCenter(sequence[i]);
      ctx.lineTo(c.x, c.y);
    }

    if (showTrail && drawing) {
      ctx.lineTo(currentPos.x, currentPos.y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  return { init, reset };
})();
