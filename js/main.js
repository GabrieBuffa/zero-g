/* ZERO-G :: Main Controller (Client-Side)
   Fluxos locais, criptografia local SHA-256 e backups JSON.
*/

// =====================================================================
// AUXILIARES CRIPTOGRÁFICOS (Web Crypto API)
// =====================================================================
async function hashPattern(sequence) {
  // Transforma array [0,1,2] em string "012"
  const canonical = sequence.join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Converte buffer em hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =====================================================================
// TELA 1: BOOT SPLASH
// =====================================================================
function runBoot() {
  const TOTAL_BLOCKS = 20;
  const INTERVAL_MS  = 75;

  const blocks = [];
  const bar = document.getElementById('boot-bar');
  bar.innerHTML = ''; // Limpa antes de preencher

  for (let i = 0; i < TOTAL_BLOCKS; i++) {
    const b = document.createElement('div');
    b.className = 'boot-block';
    bar.appendChild(b);
    blocks.push(b);
  }

  let idx = 0;
  const timer = setInterval(() => {
    if (idx < TOTAL_BLOCKS) {
      blocks[idx].classList.add('lit');
      idx++;
    } else {
      clearInterval(timer);
      setTimeout(() => transitionTo('screen-lock'), 300);
    }
  }, INTERVAL_MS);
}

// =====================================================================
// TRANSIÇÃO ENTRE TELAS
// =====================================================================
function transitionTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    if (screenId === 'screen-dashboard') {
      Dashboard.init();
    }
  }
}

// =====================================================================
// TELA 2: PATTERN LOCK (Local Auth)
// =====================================================================
async function initLock() {
  const canvas  = document.getElementById('lock-canvas');
  const dotEls  = Array.from(document.querySelectorAll('.lock-dot'));
  const statusEl = document.getElementById('lock-status');
  const wrapper = document.getElementById('lock-wrapper');

  // Verifica se existe padrão cadastrado no localStorage
  let storedHash = localStorage.getItem('zerog_user_hash');
  let primeiroUso = !storedHash;

  if (primeiroUso) {
    document.getElementById('lock-hint').textContent = '[ PRIMEIRO ACESSO — DEFINA SEU PADRÃO ]';
    statusEl.textContent = 'DESENHE SEU PADRÃO DE SEGURANÇA';
  } else {
    document.getElementById('lock-hint').textContent = '[ TERMINAL SEGURO — CONECTE MÍNIMO 4 NÓS ]';
    statusEl.textContent = 'AGUARDANDO AUTENTICAÇÃO...';
  }

  LockEngine.init(canvas, dotEls, async (sequence) => {
    statusEl.className = 'lock-status';
    statusEl.textContent = 'VERIFICANDO...';

    const hexHash = await hashPattern(sequence);

    if (primeiroUso) {
      localStorage.setItem('zerog_user_hash', hexHash);
      statusEl.className = 'lock-status success';
      statusEl.textContent = 'PADRÃO REGISTRADO!';
      primeiroUso = false;
      setTimeout(() => transitionTo('screen-dashboard'), 600);
    } else {
      if (hexHash === storedHash) {
        statusEl.className = 'lock-status success';
        statusEl.textContent = 'ACESSO AUTORIZADO';
        setTimeout(() => transitionTo('screen-dashboard'), 600);
      } else {
        statusEl.className = 'lock-status error';
        statusEl.textContent = 'ACESSO NEGADO // TENTE NOVAMENTE';
        wrapper.classList.add('shake');
        setTimeout(() => {
          wrapper.classList.remove('shake');
          LockEngine.reset();
          statusEl.className = 'lock-status';
          statusEl.textContent = 'AGUARDANDO AUTENTICAÇÃO...';
        }, 500);
      }
    }
  });
}

// =====================================================================
// PAINEL INJECT DATA
// =====================================================================
const InjectPanel = (() => {
  const CATEGORIAS = ['HABITAT','SUPRIMENTOS','LAZER','LOGISTICA','EQUIPAMENTO','RESERVA'];
  const CAT_ICONS  = ['🏠','🛒','🎮','🚗','💻','💰'];

  let selectedCat  = null;
  let selectedTipo = 'SAÍDA';
  let catBtns      = [];
  let inpValor, inpDesc, inpParcelas;
  let toggleReplicar;

  function build() {
    const panel = document.getElementById('panel-inject');

    // Botões de categoria
    const catGrid = document.getElementById('cat-grid');
    catGrid.innerHTML = ''; // Limpa
    catBtns = [];
    
    CATEGORIAS.forEach((cat, i) => {
      const btn = document.createElement('button');
      btn.className    = 'cat-btn';
      btn.dataset.cat  = cat;
      btn.innerHTML    = `<span class="cat-icon">${CAT_ICONS[i]}</span>${cat}`;
      btn.addEventListener('click', () => selectCat(cat, btn));
      catGrid.appendChild(btn);
      catBtns.push(btn);
    });

    // Referências
    inpValor    = document.getElementById('inp-valor');
    inpDesc     = document.getElementById('inp-desc');
    inpParcelas = document.getElementById('inp-parcelas');
    toggleReplicar = document.getElementById('toggle-replicar');

    // Tipo ENTRADA/SAÍDA
    document.getElementById('btn-tipo-saida').addEventListener('click', () => selectTipo('SAÍDA'));
    document.getElementById('btn-tipo-entrada').addEventListener('click', () => selectTipo('ENTRADA'));
    selectTipo('SAÍDA');

    // Toggle replicar
    toggleReplicar.addEventListener('change', () => {
      const pf = document.getElementById('parcelas-field');
      pf.classList.toggle('visible', toggleReplicar.checked);
    });

    // Predictor
    inpDesc.addEventListener('input', () => {
      Predictor.aplicar(inpDesc.value, catBtns);
    });

    // Botão transmitir
    document.getElementById('btn-transmitir').addEventListener('click', transmitir);

    // Fechar
    document.getElementById('btn-panel-close').addEventListener('click', close);
    document.getElementById('overlay').addEventListener('click', close);
  }

  function open() {
    resetForm();
    document.getElementById('panel-inject').classList.add('open');
    document.getElementById('overlay').classList.add('active');
    document.getElementById('btn-inject').style.display = 'none';

    setTimeout(() => {
      inpValor.focus();
      try { inpValor.click(); } catch(e) {}
    }, 350);
  }

  function close() {
    document.getElementById('panel-inject').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('btn-inject').style.display = '';
  }

  function selectCat(cat, btn) {
    selectedCat = cat;
    catBtns.forEach(b => b.classList.remove('selected', 'sugerida'));
    btn.classList.add('selected');
    audioClick();
  }

  function selectTipo(tipo) {
    selectedTipo = tipo;
    const saida   = document.getElementById('btn-tipo-saida');
    const entrada = document.getElementById('btn-tipo-entrada');
    saida.className   = 'tipo-btn' + (tipo === 'SAÍDA'   ? ' selected-saida'   : '');
    entrada.className = 'tipo-btn' + (tipo === 'ENTRADA' ? ' selected-entrada' : '');
  }

  function resetForm() {
    inpValor.value    = '';
    inpDesc.value     = '';
    inpParcelas.value = '';
    selectedCat       = null;
    selectedTipo      = 'SAÍDA';
    catBtns.forEach(b => b.classList.remove('selected','sugerida'));
    toggleReplicar.checked = false;
    document.getElementById('parcelas-field').classList.remove('visible');
    selectTipo('SAÍDA');
  }

  function transmitir() {
    const valor = parseFloat(inpValor.value);
    const desc  = inpDesc.value.trim();
    const parc  = parseInt(inpParcelas.value) || 1;

    if (!valor || valor <= 0) {
      showToast('INFORME O VALOR', true);
      inpValor.focus();
      return;
    }
    if (!desc) {
      showToast('INFORME A DESCRIÇÃO', true);
      inpDesc.focus();
      return;
    }
    if (!selectedCat) {
      showToast('SELECIONE A CATEGORIA', true);
      return;
    }
    if (toggleReplicar.checked && (parc < 2 || parc > 120)) {
      showToast('PARCELAS: 2 A 120', true);
      return;
    }

    const payload = {
      valor,
      descricao:      desc,
      categoria:      selectedCat,
      tipo:           selectedTipo,
      total_parcelas: toggleReplicar.checked ? parc : 1,
    };

    const result = Dashboard.criarTransacao(payload);

    if (result.ok) {
      audioBeep(880, 80);
      showToast(result.mensagem);
      close();
    } else {
      audioError();
      showToast(result.mensagem, true);
    }
  }

  return { build, open, close };
})();

// =====================================================================
// PAINEL CONFIG FIXOS, BACKUP & RESET
// =====================================================================
const ConfigPanel = (() => {
  let fixosData = [];

  function open() {
    document.getElementById('panel-config').classList.add('open');
    carregarFixos();
  }

  function close() {
    document.getElementById('panel-config').classList.remove('open');
  }

  function carregarFixos() {
    fixosData = Dashboard.getPresets();
    renderFixos(fixosData);
  }

  function renderFixos(fixos) {
    const lista = document.getElementById('config-fixos-list');
    lista.innerHTML = fixos.map(f => `
      <div class="config-fixo-row">
        <span class="config-fixo-label">▪ ${f.descricao.toUpperCase()}</span>
        <input class="config-fixo-input"
               id="cfg-inp-${f.id}"
               type="number"
               inputmode="decimal"
               step="0.01"
               min="0"
               value="${f.valor_padrao > 0 ? f.valor_padrao.toFixed(2) : ''}"
               placeholder="0,00"
               autocomplete="off"
               onfocus="this.select()"
               data-fixo-id="${f.id}">
      </div>
    `).join('');
  }

  function salvar() {
    const inputs = document.querySelectorAll('.config-fixo-input');
    const presets = Dashboard.getPresets();

    inputs.forEach(inp => {
      const id    = parseInt(inp.dataset.fixoId);
      const valor = parseFloat(inp.value) || 0.0;
      const idx = presets.findIndex(p => p.id === id);
      if (idx >= 0) {
        presets[idx].valor_padrao = Math.round(valor * 100) / 100;
      }
    });

    Dashboard.savePresets(presets);
    audioBeep(880, 80);
    showToast('CONFIGURAÇÃO SALVA ✓');
    close();
  }

  function resetarPadrao() {
    const confirmar = window.confirm(
      '⚠ ATENÇÃO: Isto apagará seu padrão de acesso atual.\n\nVocê precisará cadastrar um novo padrão de 9 pontos na próxima abertura.\n\nOs dados financeiros serão preservados.\n\nContinuar?'
    );
    if (!confirmar) return;

    localStorage.removeItem('zerog_user_hash');
    audioError();
    showToast('PADRÃO APAGADO. REDIRECIONANDO...');
    setTimeout(() => {
      close();
      transitionTo('screen-lock');
      setTimeout(initLock, 300);
    }, 1500);
  }

  // ---- Motor de Exportar Backup JSON ----
  function exportarBackup() {
    const backup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      user_hash: localStorage.getItem('zerog_user_hash'),
      presets: Dashboard.getPresets(),
      transactions: Dashboard.getTransactions()
    };

    const str = JSON.stringify(backup, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `zerog_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('BACKUP EXPORTADO ✓');
  }

  // ---- Motor de Importar Backup JSON ----
  function importarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = JSON.parse(evt.target.result);
        
        // Validação simples de integridade do backup
        if (!data.presets || !data.transactions) {
          throw new Error('Formato de backup inválido.');
        }

        localStorage.setItem('zerog_presets', JSON.stringify(data.presets));
        localStorage.setItem('zerog_transactions', JSON.stringify(data.transactions));
        if (data.user_hash) {
          localStorage.setItem('zerog_user_hash', data.user_hash);
        }

        showToast('BACKUP RESTAURADO ✓');
        close();
        
        // Recarrega o dashboard
        Dashboard.carregarMes();
      } catch (err) {
        showToast('ERRO AO LER ARQUIVO', true);
      }
    };
    reader.readAsText(file);
  }

  function build() {
    document.getElementById('btn-config-close').addEventListener('click', close);
    document.getElementById('btn-salvar-config').addEventListener('click', salvar);
    document.getElementById('btn-reset-padrao').addEventListener('click', resetarPadrao);
    document.getElementById('btn-open-config').addEventListener('click', open);
    
    // Backup triggers
    document.getElementById('btn-export-backup').addEventListener('click', exportarBackup);
    const inpFile = document.getElementById('inp-backup-file');
    document.getElementById('btn-import-backup').addEventListener('click', () => inpFile.click());
    inpFile.addEventListener('change', importarBackup);
  }

  return { build, open, close };
})();

// =====================================================================
// WEB AUDIO — Feedback Sonoro (sem arquivos externos)
// =====================================================================
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function audioBeep(freq = 880, ms = 80) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + ms / 1000);
  } catch (e) {}
}

function audioError() {
  try {
    audioBeep(440, 150);
    setTimeout(() => audioBeep(220, 200), 160);
  } catch (e) {}
}

function audioClick() {
  audioBeep(1200, 20);
}

// =====================================================================
// INICIALIZAÇÃO GERAL
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  InjectPanel.build();
  ConfigPanel.build();

  document.getElementById('btn-inject').addEventListener('click', InjectPanel.open);

  transitionTo('screen-boot');
  runBoot();

  setTimeout(initLock, 400);
});
