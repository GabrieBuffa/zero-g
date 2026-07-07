/* ZERO-G :: Dashboard Engine (Client-Side)
   Gerencia os dados locais persistidos no localStorage do navegador.
*/

const Dashboard = (() => {
  const CATEGORIAS = ['HABITAT','SUPRIMENTOS','LAZER','LOGISTICA','EQUIPAMENTO','RESERVA'];
  const CAT_LABELS = ['HABIT.','SUPRIM.','LAZER','LOGIST.','EQUIP.','RESERVA'];
  const EQ_BLOCKS  = 10;

  // Preset Padrão de Fixos
  const FIXOS_PADRAO = [
    { id: 1, descricao: "Aluguel", valor_padrao: 0.0, categoria: "HABITAT" },
    { id: 2, descricao: "Condomínio", valor_padrao: 0.0, categoria: "HABITAT" },
    { id: 3, descricao: "Consórcio", valor_padrao: 0.0, categoria: "HABITAT" },
    { id: 4, descricao: "Internet", valor_padrao: 0.0, categoria: "HABITAT" },
    { id: 5, descricao: "Energia", valor_padrao: 0.0, categoria: "HABITAT" },
    { id: 6, descricao: "Gás", valor_padrao: 0.0, categoria: "HABITAT" },
    { id: 7, descricao: "Seguro do Carro", valor_padrao: 0.0, categoria: "HABITAT" }
  ];

  // Estado
  let mesAtual  = new Date();

  // Elementos do DOM
  let elMonthLabel, elSaldo;
  let elFixosList, elVarList, elEntradaList;
  let elEqGrid;

  // ---- GET/SET LocalStorage ----
  function getTransactions() {
    return JSON.parse(localStorage.getItem('zerog_transactions') || '[]');
  }

  function saveTransactions(txs) {
    localStorage.setItem('zerog_transactions', JSON.stringify(txs));
  }

  function getPresets() {
    let presets = localStorage.getItem('zerog_presets');
    if (!presets) {
      localStorage.setItem('zerog_presets', JSON.stringify(FIXOS_PADRAO));
      return FIXOS_PADRAO;
    }
    return JSON.parse(presets);
  }

  function savePresets(presets) {
    localStorage.setItem('zerog_presets', JSON.stringify(presets));
  }

  // ---- Inicialização ----
  function init() {
    elMonthLabel  = document.getElementById('dash-month');
    elSaldo       = document.getElementById('dash-saldo');
    elFixosList   = document.getElementById('fixos-list');
    elVarList     = document.getElementById('var-list');
    elEntradaList = document.getElementById('entrada-list');
    elEqGrid      = document.getElementById('eq-grid');

    document.getElementById('btn-prev-month').addEventListener('click', () => navMes(-1));
    document.getElementById('btn-next-month').addEventListener('click', () => navMes(+1));

    carregarMes();
  }

  // ---- Navegação temporal ----
  function navMes(delta) {
    mesAtual.setMonth(mesAtual.getMonth() + delta);
    mesAtual = new Date(mesAtual);
    carregarMes();
  }

  function mesRef() {
    const y = mesAtual.getFullYear();
    const m = String(mesAtual.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function mesLabel() {
    // Meses em PT-BR
    const MESES = [
      'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
      'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
    ];
    return `${MESES[mesAtual.getMonth()]} ${mesAtual.getFullYear()}`;
  }

  // ---- Carregamento de dados ----
  function carregarMes() {
    const ref = mesRef();
    elMonthLabel.textContent = mesLabel();

    // Auto-injeção de fixos para o mês se ainda não existirem
    inicializarMes(ref);

    const txs = getTransactions().filter(t => t.mes_referencia === ref);
    renderDados(txs);
  }

  // ---- Auto-injeção (idempotente) ----
  function inicializarMes(mes) {
    let txs = getTransactions();
    const jaInicializado = txs.some(t => t.mes_referencia === mes && t.is_fixo === 1);

    if (!jaInicializado) {
      const presets = getPresets();
      const novas = presets.map(p => ({
        id: Date.now() + Math.random(), // id único no client-side
        valor: p.valor_padrao,
        descricao: p.descricao,
        categoria: p.categoria,
        tipo: 'SAÍDA',
        mes_referencia: mes,
        is_fixo: 1,
        fixo_id: p.id
      }));
      txs.push(...novas);
      saveTransactions(txs);
    }
  }

  // ---- Render completo ----
  function renderDados(txs) {
    const total_entradas = txs.filter(t => t.tipo === 'ENTRADA').reduce((a, b) => a + b.valor, 0);
    const total_saidas   = txs.filter(t => t.tipo === 'SAÍDA').reduce((a, b) => a + b.valor, 0);
    const saldo_liquido  = total_entradas - total_saidas;

    renderSaldo(saldo_liquido);
    renderFixos(txs.filter(t => t.is_fixo === 1));
    renderVariaveis(txs.filter(t => t.is_fixo === 0 && t.tipo === 'SAÍDA'));
    renderEntradas(txs.filter(t => t.tipo === 'ENTRADA'));

    // Calcular equalizador por categoria
    const por_categoria = {};
    txs.forEach(t => {
      if (t.tipo === 'SAÍDA') {
        por_categoria[t.categoria] = (por_categoria[t.categoria] || 0) + t.valor;
      }
    });
    renderEqualizador(por_categoria);
  }

  // ---- Saldo ----
  function renderSaldo(valor) {
    const fmt = formatBRL(Math.abs(valor));
    elSaldo.textContent = valor >= 0 ? `+${fmt}` : `-${fmt}`;
    elSaldo.className = 'dash-saldo-value ' + (valor > 0 ? 'positivo' : valor < 0 ? 'negativo' : 'neutro');
  }

  // ---- Fixos ----
  function renderFixos(fixos) {
    if (!fixos.length) {
      elFixosList.innerHTML = '<div class="empty-state">SEM FIXOS CONFIGURADOS</div>';
      return;
    }
    elFixosList.innerHTML = fixos.map(f => `
      <div class="fixo-row" id="fixo-row-${f.id}">
        <span class="fixo-icon">▪</span>
        <span class="fixo-desc">${f.descricao.toUpperCase()}</span>
        <span class="fixo-valor" id="fixo-val-${f.id}">${formatBRL(f.valor)}</span>
        <button class="fixo-adj-btn" onclick="Dashboard.abrirAdj('${f.id}')">[ADJ]</button>
      </div>
    `).join('');
  }

  // ---- Ajuste inline de fixo (ADJ) ----
  function abrirAdj(id) {
    const row = document.getElementById(`fixo-row-${id}`);
    if (!row) return;

    if (row.querySelector('.adj-input-row')) {
      row.querySelector('.adj-input-row').remove();
      return;
    }

    const adjRow = document.createElement('div');
    adjRow.className = 'adj-input-row';
    adjRow.innerHTML = `
      <input class="adj-input" id="adj-inp-${id}" type="number" inputmode="decimal"
             step="0.01" min="0" placeholder="0.00" autocomplete="off" onfocus="this.select()">
      <button class="adj-confirm-btn" onclick="Dashboard.confirmarAdj('${id}')">[ OK ]</button>
    `;
    row.insertAdjacentElement('afterend', adjRow);
    setTimeout(() => document.getElementById(`adj-inp-${id}`)?.focus(), 100);
  }

  function confirmarAdj(id) {
    const inp = document.getElementById(`adj-inp-${id}`);
    if (!inp) return;
    const valor = parseFloat(inp.value);
    if (isNaN(valor) || valor < 0) {
      showToast('VALOR INVÁLIDO', true);
      return;
    }

    let txs = getTransactions();
    // Procura por ID string/number
    const idx = txs.findIndex(t => String(t.id) === String(id));
    if (idx >= 0) {
      txs[idx].valor = Math.round(valor * 100) / 100;
      saveTransactions(txs);
      inp.closest('.adj-input-row')?.remove();
      carregarMes();
      showToast('FIXO AJUSTADO');
    } else {
      showToast('TRANSAÇÃO NÃO ENCONTRADA', true);
    }
  }

  // ---- Variáveis ----
  function renderVariaveis(vars) {
    if (!vars.length) {
      elVarList.innerHTML = '<div class="empty-state">SEM GASTOS VARIÁVEIS</div>';
      return;
    }
    elVarList.innerHTML = vars.map(t => `
      <div class="var-row">
        <span class="var-desc" title="${t.descricao}">${t.descricao.toUpperCase()}</span>
        <span class="var-cat">${t.categoria}</span>
        <span class="var-valor">-${formatBRL(t.valor)}</span>
        <button class="var-del" onclick="Dashboard.deletarTransacao('${t.id}')" title="Remover">✕</button>
      </div>
    `).join('');
  }

  // ---- Entradas ----
  function renderEntradas(entradas) {
    if (!entradas.length) {
      elEntradaList.innerHTML = '<div class="empty-state">SEM ENTRADAS</div>';
      return;
    }
    elEntradaList.innerHTML = entradas.map(t => `
      <div class="entrada-row">
        <span class="entrada-icon">▲</span>
        <span class="entrada-desc">${t.descricao.toUpperCase()}</span>
        <span class="entrada-valor">+${formatBRL(t.valor)}</span>
        <button class="entrada-del" onclick="Dashboard.deletarTransacao('${t.id}')" title="Remover">✕</button>
      </div>
    `).join('');
  }

  // ---- Deletar transação ----
  function deletarTransacao(id) {
    let txs = getTransactions();
    const novas = txs.filter(t => String(t.id) !== String(id));
    saveTransactions(novas);
    carregarMes();
    showToast('REGISTRO REMOVIDO');
  }

  // ---- Equalizador ----
  function renderEqualizador(porCategoria) {
    const valores = CATEGORIAS.map(c => porCategoria[c] || 0);
    const maxVal  = Math.max(...valores, 1);

    elEqGrid.innerHTML = CATEGORIAS.map((cat, i) => {
      const val    = valores[i];
      const nivel  = Math.round((val / maxVal) * EQ_BLOCKS);
      const blocos = Array.from({ length: EQ_BLOCKS }, (_, b) => {
        const lit = b < nivel;
        const cls = lit ? (val > maxVal * 0.8 ? 'lit-red' : 'lit') : '';
        return `<div class="eq-block ${cls}"></div>`;
      }).join('');

      return `
        <div class="eq-col">
          <div class="eq-blocks">${blocos}</div>
          <div class="eq-label">${CAT_LABELS[i]}</div>
          <div class="eq-valor">${val > 0 ? formatCompact(val) : '—'}</div>
        </div>
      `;
    }).join('');
  }

  // ---- Criar transação (manual ou parcelada) ----
  function criarTransacao(payload) {
    let txs = getTransactions();
    const ref = mesRef();

    if (payload.total_parcelas && payload.total_parcelas >= 2) {
      // Motor de parcelamento local
      const total = payload.total_parcelas;
      const valorParcela = Math.round((payload.valor / total) * 100) / 100;
      const [anoIni, mesIni] = ref.split('-').map(Number);

      for (let i = 1; i <= total; i++) {
        const mesOffset = mesIni + i - 1;
        const anoRef = anoIni + Math.floor((mesOffset - 1) / 12);
        const mesRefNum = ((mesOffset - 1) % 12) + 1;
        const mesRefStr = `${anoRef}-${String(mesRefNum).padStart(2, '0')}`;

        txs.push({
          id: Date.now() + Math.random(),
          valor: valorParcela,
          descricao: `[${i}/${total}] ${payload.descricao}`,
          categoria: payload.categoria,
          tipo: 'SAÍDA',
          mes_referencia: mesRefStr,
          is_fixo: 0,
          parcela_atual: i,
          total_parcelas: total
        });
      }
      saveTransactions(txs);
      carregarMes();
      return { ok: true, mensagem: `${total}x PARCELADO ✓` };
    } else {
      // Inserção simples
      txs.push({
        id: Date.now(),
        valor: Math.round(payload.valor * 100) / 100,
        descricao: payload.descricao,
        categoria: payload.categoria,
        tipo: payload.tipo,
        mes_referencia: ref,
        is_fixo: 0
      });
      saveTransactions(txs);
      carregarMes();
      return { ok: true, mensagem: 'DADOS INJETADOS ✓' };
    }
  }

  // ---- Helpers ----
  function formatBRL(valor) {
    return 'R$ ' + Number(valor).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatCompact(valor) {
    if (valor >= 1000) return 'R$' + (valor / 1000).toFixed(1) + 'k';
    return 'R$' + valor.toFixed(0);
  }

  return {
    init,
    abrirAdj,
    confirmarAdj,
    deletarTransacao,
    criarTransacao,
    getPresets,
    savePresets,
    getTransactions,
    saveTransactions,
    carregarMes,
    mesRef
  };
})();

// Toast global
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = '▸ ' + msg;
  t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 2800);
}
