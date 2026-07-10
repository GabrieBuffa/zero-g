/* ZERO-G :: Dashboard Engine (Client-Side)
   Gerencia os dados locais persistidos no localStorage do navegador.
*/

const Dashboard = (() => {
  const CATEGORIAS = ['HABITAT','SUPRIMENTOS','LAZER','LOGISTICA','EQUIPAMENTO','RESERVA'];
  const CAT_LABELS = ['HABIT.','SUPRIM.','LAZER','LOGIST.','EQUIP.','RESERVA'];
  const EQ_BLOCKS  = 10;
  const CAT_LIMITS = {
    'HABITAT': 5000,
    'SUPRIMENTOS': 1500,
    'LAZER': 1000,
    'LOGISTICA': 1500,
    'EQUIPAMENTO': 2000,
    'RESERVA': 3000
  };

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
  let colStates = {
    habitat: localStorage.getItem('zerog_col_habitat') === 'true',
    eq: localStorage.getItem('zerog_col_eq') === 'true',
    cartao: localStorage.getItem('zerog_col_cartao') === 'true',
    var: localStorage.getItem('zerog_col_var') === 'true',
    entrada: localStorage.getItem('zerog_col_entrada') === 'true'
  };

  // Elementos do DOM
  let elMonthLabel, elSaldo;
  let elFixosList, elCartaoList, elVarList, elEntradaList;
  let elEqGrid, elCartaoTotalVal;

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

  function getConfigCartao() {
    let conf = localStorage.getItem('zerog_config_cartao');
    if (!conf) {
      return { fechamento: 2, vencimento: 10 };
    }
    return JSON.parse(conf);
  }

  function saveConfigCartao(conf) {
    localStorage.setItem('zerog_config_cartao', JSON.stringify(conf));
  }

  // ---- Inicialização ----
  function init() {
    elMonthLabel  = document.getElementById('dash-month');
    elSaldo       = document.getElementById('dash-saldo');
    elFixosList   = document.getElementById('fixos-list');
    elCartaoList  = document.getElementById('cartao-list');
    elVarList     = document.getElementById('var-list');
    elEntradaList = document.getElementById('entrada-list');
    elEqGrid      = document.getElementById('eq-grid');
    elCartaoTotalVal = document.getElementById('cartao-total-val');

    document.getElementById('btn-prev-month').addEventListener('click', () => navMes(-1));
    document.getElementById('btn-next-month').addEventListener('click', () => navMes(+1));

    setupCollapse('habitat-header', 'fixos-list', 'habitat-toggle-icon', 'habitat');
    setupCollapse('eq-header', 'eq-grid', 'eq-toggle-icon', 'eq');
    setupCollapse('cartao-header', 'cartao-list', 'cartao-toggle-icon', 'cartao');
    setupCollapse('var-header', 'var-list', 'var-toggle-icon', 'var');
    setupCollapse('entrada-header', 'entrada-list', 'entrada-toggle-icon', 'entrada');

    carregarMes();
  }

  function setupCollapse(headerId, listId, iconId, key) {
    const header = document.getElementById(headerId);
    if (header) {
      header.addEventListener('click', () => {
        colStates[key] = !colStates[key];
        localStorage.setItem(`zerog_col_${key}`, colStates[key]);
        applyCollapse(listId, iconId, key);
      });
      applyCollapse(listId, iconId, key);
    }
  }

  function applyCollapse(listId, iconId, key) {
    const list = document.getElementById(listId);
    const icon = document.getElementById(iconId);
    if (list && icon) {
      if (colStates[key]) {
        list.classList.add('collapsed');
        icon.textContent = '[▲]';
      } else {
        list.classList.remove('collapsed');
        icon.textContent = '[▼]';
      }
    }
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

  function calcularMesReferenciaCredito(dataOrigem = new Date()) {
    const config = getConfigCartao();
    const fechamento = config.fechamento;
    
    // Se o dia da compra for MAIOR ou IGUAL ao dia de fechamento (e assumindo fechamento no próprio mês corrente),
    // a fatura irá para o mês seguinte.
    // Detalhe: Se compra = 2 de julho (fecha 2 de julho), vence 10 de julho (mesma fatura).
    // Se compra = 3 de julho (fecha 2), vence 10 de agosto (fatura seguinte).
    let d = new Date(dataOrigem);
    if (d.getDate() > fechamento) {
      d.setMonth(d.getMonth() + 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
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
    
    const elIn = document.getElementById('dash-in-val');
    const elOut = document.getElementById('dash-out-val');
    if (elIn) elIn.textContent = '+' + formatBRL(total_entradas);
    if (elOut) elOut.textContent = '-' + formatBRL(total_saidas);
    
    updateDonutChart(total_entradas, total_saidas);

    const varsCredito = txs.filter(t => t.tipo === 'SAÍDA' && t.is_credito === 1);
    const varsDebito  = txs.filter(t => t.tipo === 'SAÍDA' && t.is_fixo === 0 && (!t.is_credito || t.is_credito === 0));

    renderFixos(txs.filter(t => t.is_fixo === 1));
    renderCartao(varsCredito);
    renderVariaveis(varsDebito);
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

  // ---- Saldo & Donut Chart ----
  function renderSaldo(valor) {
    const fmt = formatBRL(Math.abs(valor));
    if(elSaldo) {
      elSaldo.textContent = valor >= 0 ? `+${fmt}` : `-${fmt}`;
      elSaldo.className = 'dash-saldo-value ' + (valor > 0 ? 'positivo' : valor < 0 ? 'negativo' : 'neutro');
    }
  }

  function updateDonutChart(entradas, saidas) {
    const segGreen = document.getElementById('donut-segment-green');
    const segRed = document.getElementById('donut-segment-red');
    if (!segGreen || !segRed) return;

    const C = 251.2;

    if (entradas === 0 && saidas === 0) {
      segGreen.style.strokeDashoffset = C;
      segRed.style.strokeDashoffset = C;
      return;
    }

    if (entradas === 0 && saidas > 0) {
      segGreen.style.strokeDashoffset = C;
      segRed.style.strokeDashoffset = 0;
      segRed.style.transformOrigin = '50% 50%';
      segRed.style.transform = 'rotate(-90deg)';
      return;
    }

    const total = entradas;
    const pctSaidas = Math.min(1.0, saidas / total);
    const pctSaldo = Math.max(0.0, 1.0 - pctSaidas);

    const redLen = pctSaidas * C;
    const greenLen = pctSaldo * C;

    segRed.style.strokeDashoffset = C - redLen;
    segRed.style.transformOrigin = '50% 50%';
    segRed.style.transform = 'rotate(-90deg)';

    segGreen.style.strokeDashoffset = C - greenLen;
    const startAngle = (pctSaidas * 360) - 90;
    segGreen.style.transformOrigin = '50% 50%';
    segGreen.style.transform = `rotate(${startAngle}deg)`;
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

    const nextSib = row.nextElementSibling;
    if (nextSib && nextSib.classList.contains('adj-input-row')) {
      nextSib.remove();
      return;
    }

    document.querySelectorAll('.adj-input-row').forEach(el => el.remove());

    const adjRow = document.createElement('div');
    adjRow.className = 'adj-input-row';
    adjRow.innerHTML = `
      <input class="adj-input" id="adj-inp-${id}" type="number" inputmode="decimal"
             step="0.01" min="0" placeholder="0.00" autocomplete="off" onfocus="this.select()">
      <div style="display: flex; gap: 4px;">
        <button class="adj-confirm-btn" onclick="Dashboard.confirmarAdj('${id}')">[ OK ]</button>
        <button class="adj-cancel-btn" onclick="Dashboard.fecharAdj('${id}')">[ ✕ ]</button>
      </div>
    `;
    row.insertAdjacentElement('afterend', adjRow);
    setTimeout(() => document.getElementById(`adj-inp-${id}`)?.focus(), 100);
  }

  function fecharAdj(id) {
    const row = document.getElementById(`fixo-row-${id}`);
    if (!row) return;
    const nextSib = row.nextElementSibling;
    if (nextSib && nextSib.classList.contains('adj-input-row')) {
      nextSib.remove();
    }
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
      txs[idx].is_dirty = 1;
      saveTransactions(txs);
      inp.closest('.adj-input-row')?.remove();
      carregarMes();
      showToast('FIXO AJUSTADO');
    } else {
      showToast('TRANSAÇÃO NÃO ENCONTRADA', true);
    }
  }

  // ---- Variáveis e Cartão ----
  function renderCartao(creditoTxs) {
    if (elCartaoTotalVal) {
      const total = creditoTxs.reduce((a, b) => a + b.valor, 0);
      elCartaoTotalVal.textContent = 'R$ ' + total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    if (!elCartaoList) return;
    
    if (!creditoTxs.length) {
      elCartaoList.innerHTML = '<div class="empty-state">SEM GASTOS NO CARTÃO</div>';
      return;
    }
    
    elCartaoList.innerHTML = creditoTxs.map(t => `
      <div class="var-row" style="background: rgba(0, 210, 255, 0.05); margin-bottom: 4px; padding: 10px;">
        <span class="var-desc" title="${t.descricao}" style="color: #fff;">${t.descricao.toUpperCase()}</span>
        <span class="var-cat" style="color: #00d2ff; background: rgba(0, 210, 255, 0.1); border: 1px solid rgba(0, 210, 255, 0.2);">${t.categoria}</span>
        <span class="var-valor" style="color: #00d2ff;">-${formatBRL(t.valor)}</span>
        <button class="var-del" style="color: rgba(0, 210, 255, 0.6);" onclick="Dashboard.deletarTransacao('${t.id}')" title="Remover">✕</button>
      </div>
    `).join('');
  }

  function renderVariaveis(vars) {
    if (!vars.length) {
      elVarList.innerHTML = '<div class="empty-state">SEM GASTOS VARIÁVEIS</div>';
      return;
    }
    elVarList.innerHTML = vars.map(t => {
      const isReserva = t.categoria === 'RESERVA';
      const valorClass = isReserva ? 'var-valor investimento' : 'var-valor';
      return `
        <div class="var-row">
          <span class="var-desc" title="${t.descricao}">${t.descricao.toUpperCase()}</span>
          <span class="var-cat" ${isReserva ? 'style="color: #00d2ff;"' : ''}>${t.categoria}</span>
          <span class="${valorClass}">${isReserva ? '' : '-'}${formatBRL(t.valor)}</span>
          <button class="var-del" onclick="Dashboard.deletarTransacao('${t.id}')" title="Remover">✕</button>
        </div>
      `;
    }).join('');
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
    elEqGrid.innerHTML = CATEGORIAS.map((cat, i) => {
      const val    = porCategoria[cat] || 0;
      const limit  = CAT_LIMITS[cat] || 1000;
      const pct    = val / limit;
      const nivel  = Math.min(EQ_BLOCKS, Math.round(pct * EQ_BLOCKS));
      const blocos = Array.from({ length: EQ_BLOCKS }, (_, b) => {
        const lit = b < nivel;
        let cls = '';
        if (lit) {
          if (cat === 'RESERVA') {
            cls = 'lit-blue';
          } else {
            cls = pct > 0.8 ? 'lit-red' : 'lit';
          }
        }
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
    let ref = mesRef();

    // Se for crédito, calcula o mês em que a fatura será paga
    if (payload.is_credito) {
      ref = calcularMesReferenciaCredito();
    }

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
          is_credito: payload.is_credito ? 1 : 0,
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
        is_fixo: 0,
        is_credito: payload.is_credito ? 1 : 0
      });
      saveTransactions(txs);
      
      // Se foi de crédito e a referência pulou de mês (ex: comprou hoje mas vai pra fatura do mês que vem), 
      // talvez o usuário não veja no mês atual. O Toast ajuda a informar.
      let msg = 'DADOS INJETADOS ✓';
      if (payload.is_credito && ref !== mesRef()) {
        const d = ref.split('-');
        msg = `COMPRA ALOCADA P/ FATURA DE ${d[1]}/${d[0]}`;
      }
      carregarMes();
      return { ok: true, mensagem: msg };
    }
  }

  // ---- Propagar Presets Futuros ----
  function propagarPresets(presets) {
    let txs = getTransactions();
    const currentRef = mesRef();
    
    txs = txs.map(t => {
      if (t.is_fixo === 1 && t.mes_referencia >= currentRef && !t.is_dirty) {
        const preset = presets.find(p => p.id === t.fixo_id);
        if (preset) {
          t.valor = preset.valor_padrao;
        }
      }
      return t;
    });
    
    saveTransactions(txs);
    carregarMes();
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
    fecharAdj,
    confirmarAdj,
    deletarTransacao,
    criarTransacao,
    getPresets,
    savePresets,
    getConfigCartao,
    saveConfigCartao,
    propagarPresets,
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
