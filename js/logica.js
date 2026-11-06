/* Contas do site, sem nada de tela. Fica separado para ser fácil de conferir e de adaptar. */
(function () {
  'use strict';
  var D = window.FRIAGEM;

  function calcularBTU(e) {
    var fator = e.sol ? D.BTU_COM_SOL : D.BTU_SEM_SOL;
    var bruto = e.area * fator;
    var base = Math.round(bruto);
    var propPe = Math.max(1, e.pe / D.PE_REF);
    var pe = Math.round(bruto * (propPe - 1));
    var pessoas = (e.pessoas - 1) * D.BTU_EXTRA;
    var equip = e.equip * D.BTU_EXTRA;
    return { fator: fator, base: base, pe: pe, pessoas: pessoas, equip: equip, total: base + pe + pessoas + equip };
  }

  function capacidadeIndicada(total) {
    var c = D.PRODUTOS.map(function (p) { return p.btu; }).filter(function (b) { return b >= total; });
    return c.length ? Math.min.apply(null, c) : null;
  }

  /* De cada tipo, o modelo mais barato na menor capacidade que dá conta, sem exagerar no tamanho. */
  function recomendar(total) {
    var escolhidos = Object.keys(D.TIPOS).map(function (t) {
      var ok = D.PRODUTOS.filter(function (p) { return p.tipo === t && p.btu >= total; });
      ok.sort(function (a, b) { return a.btu - b.btu || a.preco - b.preco; });
      return ok[0];
    }).filter(function (p) { return p && p.btu <= total * 1.7; });
    escolhidos.sort(function (a, b) { return a.btu - b.btu || a.preco - b.preco; });
    return escolhidos.slice(0, 3);
  }

  function custoInstalacao(tipo, metros) {
    var t = D.TIPOS[tipo];
    var extras = t.metro ? Math.max(0, metros - D.METROS_INCLUIDOS) : 0;
    return { base: t.base, extras: extras, porMetro: t.metro, total: t.base + extras * t.metro };
  }

  /* Parcela pela tabela Price, arredondada em centavos. Em 1x não há juros. */
  function parcelas(valor, n) {
    if (n <= 1) return { parcela: valor, total: valor, juros: 0 };
    var i = D.JUROS_MES;
    var p = Math.round(valor * i / (1 - Math.pow(1 + i, -n)) * 100) / 100;
    var total = Math.round(p * n * 100) / 100;
    return { parcela: p, total: total, juros: Math.round((total - valor) * 100) / 100 };
  }

  function filtrar(lista, f) {
    var min = f.min === '' ? null : Number(f.min);
    var max = f.max === '' ? null : Number(f.max);
    return lista.filter(function (p) {
      if (f.tipos.length && f.tipos.indexOf(p.tipo) < 0) return false;
      if (f.btu && p.btu !== Number(f.btu)) return false;
      if (f.tensao && p.tensao !== Number(f.tensao)) return false;
      if (min !== null && !isNaN(min) && p.preco < min) return false;
      if (max !== null && !isNaN(max) && p.preco > max) return false;
      return true;
    });
  }

  var ORDENS = {
    'preco-asc': function (a, b) { return a.preco - b.preco; },
    'preco-desc': function (a, b) { return b.preco - a.preco; },
    'btu-asc': function (a, b) { return a.btu - b.btu || a.preco - b.preco; },
    'btu-desc': function (a, b) { return b.btu - a.btu || a.preco - b.preco; },
    'ruido-asc': function (a, b) { return a.ruido - b.ruido || a.preco - b.preco; }
  };
  function ordenar(lista, ordem) { return lista.slice().sort(ORDENS[ordem] || ORDENS['preco-asc']); }

  window.FRIAGEM_LOGICA = { calcularBTU: calcularBTU, capacidadeIndicada: capacidadeIndicada, recomendar: recomendar, custoInstalacao: custoInstalacao, parcelas: parcelas, filtrar: filtrar, ordenar: ordenar };
})();
