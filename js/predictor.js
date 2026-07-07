/* ZERO-G :: Predictor — Dicionário Léxico Preditivo
   Analisa o campo de descrição em tempo real e sugere a categoria.
*/

const Predictor = (() => {
  const DICIONARIO = {
    HABITAT:     ['aluguel','condominio','agua','luz','energia','gas','internet','seguro','boleto','iptu','ipva'],
    SUPRIMENTOS: ['padaria','ifood','mercado','supermercado','feira','acougue','hortifruti','pao','leite','rappi','uber eats','delivery','compras','atacado','minimercado','sacolao'],
    LAZER:       ['cinema','netflix','spotify','show','ingresso','bar','restaurante','pizza','hamburguer','steam','jogo','teatro','parque','passeio','disney','prime','hbo','globoplay'],
    LOGISTICA:   ['uber','99','combustivel','gasolina','estacionamento','pedagio','onibus','metro','manutencao','troca de oleo','mecanico','revisao','borracheiro','passagem'],
    EQUIPAMENTO: ['amazon','shopee','mercadolivre','roupa','tenis','celular','notebook','computador','cartao','parcelado','eletronico','tv','monitor','teclado','mouse'],
    RESERVA:     ['investimento','poupanca','tesouro','acao','fundo','aporte','nubank','xp','rico','btg','rendimento','reserva'],
  };

  // Normaliza: lowercase, remove acentos, remove pontuação
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');
  }

  // Analisa o texto e retorna a categoria detectada (ou null)
  function detectar(texto) {
    if (!texto || texto.trim().length < 2) return null;
    const norm = normalize(texto);

    for (const [cat, palavras] of Object.entries(DICIONARIO)) {
      for (const p of palavras) {
        const normP = normalize(p);
        // Verifica se a palavra-chave está contida no texto
        if (norm.includes(normP)) {
          return cat;
        }
      }
    }
    return null;
  }

  // Aplica o highlight nos botões de categoria
  function aplicar(texto, catBtns) {
    const cat = detectar(texto);
    catBtns.forEach(btn => {
      const btnCat = btn.dataset.cat;
      if (cat && btnCat === cat && !btn.classList.contains('selected')) {
        btn.classList.add('sugerida');
      } else {
        btn.classList.remove('sugerida');
      }
    });
    return cat;
  }

  return { detectar, aplicar };
})();
