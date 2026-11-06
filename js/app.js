/* Telas do site. Todo dado variável entra pelo textContent, nunca como HTML. */
(function () {
  'use strict';
  var D = window.FRIAGEM;
  var L = window.FRIAGEM_LOGICA;
  var CHAVE = 'friagem:v1';
  var MAX_COMPARAR = 3;
  var CALC_PADRAO = { area: '12', pe: '2,7', pessoas: '2', equip: '1', sol: false };
  var FILTRO_PADRAO = { tipos: [], btu: '', tensao: '', min: '', max: '', ordem: 'preco-asc' };
  var porId = {};
  D.PRODUTOS.forEach(function (p) { porId[p.id] = p; });

  var $ = function (id) { return document.getElementById(id); };
  var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var inteiro = new Intl.NumberFormat('pt-BR');
  function reais(v) { return moeda.format(v); }
  function num(v) { return inteiro.format(v); }

  /* ---------- memória local (só dados que não são pessoais) ---------- */
  function ler() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      return bruto ? JSON.parse(bruto) : {};
    } catch (e) { return {}; }
  }
  function limpar(s) {
    var o = s && typeof s === 'object' ? s : {};
    var f = o.filtros && typeof o.filtros === 'object' ? o.filtros : {};
    var c = o.calc && typeof o.calc === 'object' ? o.calc : {};
    return {
      carrinho: (Array.isArray(o.carrinho) ? o.carrinho : []).map(limparLinha).filter(Boolean),
      comparar: (Array.isArray(o.comparar) ? o.comparar : []).filter(function (id) { return porId[id]; }).slice(0, MAX_COMPARAR),
      calc: {
        area: String(c.area !== undefined ? c.area : CALC_PADRAO.area),
        pe: String(c.pe !== undefined ? c.pe : CALC_PADRAO.pe),
        pessoas: String(c.pessoas !== undefined ? c.pessoas : CALC_PADRAO.pessoas),
        equip: String(c.equip !== undefined ? c.equip : CALC_PADRAO.equip),
        sol: c.sol === true
      },
      filtros: {
        tipos: (Array.isArray(f.tipos) ? f.tipos : []).filter(function (t) { return D.TIPOS[t]; }),
        btu: String(f.btu || ''), tensao: String(f.tensao || ''),
        min: String(f.min || ''), max: String(f.max || ''),
        ordem: typeof f.ordem === 'string' ? f.ordem : 'preco-asc'
      }
    };
  }
  function limitarMetros(m) {
    var n = Math.round(Number(m));
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(n, 30);
  }
  function limparLinha(l) {
    if (!l || typeof l !== 'object') return null;
    var metros = limitarMetros(l.metros);
    var qtd = Math.min(10, Math.max(1, Math.round(Number(l.qtd)) || 1));
    if (l.pid && porId[l.pid]) return { pid: l.pid, qtd: qtd, inst: l.inst === true, metros: metros };
    if (!l.pid && D.TIPOS[l.tipo]) return { tipo: l.tipo, qtd: qtd, inst: true, metros: metros };
    return null;
  }
  var E = limpar(ler());
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* segue sem guardar */ }
  }

  /* ---------- ajudantes de tela ---------- */
  function el(tag, props) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k];
      else if (k === 'class') n.className = props[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), props[k]);
      else if (props[k] === true) n.setAttribute(k, '');
      else if (props[k] !== false && props[k] !== undefined) n.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      if (arguments[i]) n.appendChild(arguments[i]);
    }
    return n;
  }
  function ilustracao(tipo) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 240 130');
    s.setAttribute('class', 'ilustra');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#' + D.TIPOS[tipo].simbolo);
    s.appendChild(u);
    return s;
  }
  var avisoTempo;
  function avisar(msg) {
    var a = $('aviso');
    a.textContent = msg;
    a.classList.add('aviso-ligado');
    clearTimeout(avisoTempo);
    avisoTempo = setTimeout(function () { a.classList.remove('aviso-ligado'); a.textContent = ''; }, 4500);
  }
  function nomeDe(p) { return p.marca + ' ' + p.modelo; }

  /* ---------- visor de sete segmentos ---------- */
  var SEG = {
    a: '10,0 46,0 40,8 16,8', b: '48,2 48,47 40,41 40,10', c: '48,53 48,98 40,90 40,59',
    d: '10,100 46,100 40,92 16,92', e: '8,53 8,98 16,90 16,59', f: '8,2 8,47 16,41 16,10',
    g: '11,50 18,46 38,46 45,50 38,54 18,54'
  };
  var MAPA = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
  function desenharDigitos(alvo, texto) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + (texto.length * 60) + ' 100');
    s.setAttribute('class', 'digitos');
    s.setAttribute('focusable', 'false');
    texto.split('').forEach(function (c, i) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', 'translate(' + (i * 60) + ' 0)');
      Object.keys(SEG).forEach(function (k) {
        var p = document.createElementNS(NS, 'polygon');
        p.setAttribute('points', SEG[k]);
        p.setAttribute('class', (MAPA[c] || '').indexOf(k) >= 0 ? 'seg-on' : 'seg-off');
        g.appendChild(p);
      });
      s.appendChild(g);
    });
    alvo.replaceChildren(s);
  }

  /* ---------- cartão de produto ---------- */
  var caixasComparar = {};
  function cartao(p) {
    var idc = 'cmp-' + p.id + '-' + Math.random().toString(36).slice(2, 7);
    var caixa = el('input', { type: 'checkbox', id: idc, 'data-cmp': p.id });
    caixa.checked = E.comparar.indexOf(p.id) >= 0;
    caixa.addEventListener('change', function () { alternarComparar(p.id, caixa); });
    var lista = el('dl', { class: 'plaqueta-dados' });
    [['Tipo', D.TIPOS[p.tipo].nome], ['Tensão', p.tensao + ' V'], ['Ruído interno', p.ruido + ' dB'], ['Ciclo', p.ciclo]].forEach(function (par) {
      lista.appendChild(el('div', null, el('dt', { text: par[0] }), el('dd', { text: par[1] })));
    });
    return el('li', { class: 'plaqueta', 'data-produto': p.id },
      ilustracao(p.tipo),
      el('h3', { class: 'plaqueta-nome' }, el('span', { class: 'plaqueta-marca', text: p.marca }), el('span', { text: p.modelo })),
      el('p', { class: 'plaqueta-btu' }, el('strong', { text: num(p.btu) }), el('span', { text: ' BTU' })),
      lista,
      el('p', { class: 'plaqueta-preco', 'data-preco': p.preco, text: reais(p.preco) }),
      el('button', { type: 'button', class: 'botao botao-escuro botao-cheio', 'aria-label': 'Adicionar ao orçamento: ' + nomeDe(p), text: 'Adicionar ao orçamento', onclick: function () { adicionar(p.id); } }),
      el('label', { class: 'marcar-comparar', for: idc }, caixa, el('span', { text: 'Comparar' }), el('span', { class: 'so-leitor', text: ' ' + nomeDe(p) }))
    );
  }

  function adicionar(pid) {
    var ja = E.carrinho.filter(function (l) { return l.pid === pid; })[0];
    if (ja) ja.qtd = Math.min(10, ja.qtd + 1);
    else E.carrinho.push({ pid: pid, qtd: 1, inst: true, metros: D.METROS_INCLUIDOS });
    salvar();
    atualizarContador();
    avisar(nomeDe(porId[pid]) + ' adicionado ao orçamento.');
  }
  function atualizarContador() {
    var n = E.carrinho.reduce(function (s, l) { return s + l.qtd; }, 0);
    $('contador').textContent = '(' + n + ')';
  }

  /* ---------- comparação ---------- */
  function alternarComparar(id, caixa) {
    var i = E.comparar.indexOf(id);
    if (caixa.checked && i < 0) {
      if (E.comparar.length >= MAX_COMPARAR) {
        caixa.checked = false;
        avisar('Você já escolheu 3 modelos. Tire um deles para incluir outro.');
        return;
      }
      E.comparar.push(id);
    } else if (!caixa.checked && i >= 0) {
      E.comparar.splice(i, 1);
    }
    salvar();
    sincronizarComparar();
  }
  function sincronizarComparar() {
    document.querySelectorAll('[data-cmp]').forEach(function (c) { c.checked = E.comparar.indexOf(c.getAttribute('data-cmp')) >= 0; });
    var rota = rotaAtual().nome;
    var mostrar = E.comparar.length > 0 && (rota === 'catalogo' || rota === 'calculadora');
    $('bandeja').hidden = !mostrar;
    document.body.classList.toggle('com-bandeja', mostrar);
    $('bandeja-texto').textContent = E.comparar.length + ' de ' + MAX_COMPARAR + ' para comparar';
  }
  function desenharComparacao() {
    var ps = E.comparar.map(function (id) { return porId[id]; });
    var caixa = $('comp-rolagem');
    caixa.replaceChildren();
    caixa.hidden = !ps.length;
    $('comp-dica').hidden = ps.length < 2;
    if (!ps.length) { $('comp-texto').textContent = 'Nenhum modelo escolhido. Marque "Comparar" nos modelos do catálogo.'; return; }
    $('comp-texto').textContent = ps.length === 1 ? 'Só um modelo escolhido. Marque mais um ou dois no catálogo para ver a diferença.' : 'Comparando ' + ps.length + ' modelos. Valores fictícios.';
    var menorPreco = Math.min.apply(null, ps.map(function (p) { return p.preco; }));
    var menorRuido = Math.min.apply(null, ps.map(function (p) { return p.ruido; }));
    var linhas = [
      ['Tipo', function (p) { return D.TIPOS[p.tipo].nome; }],
      ['Capacidade', function (p) { return num(p.btu) + ' BTU'; }],
      ['Tensão', function (p) { return p.tensao + ' V'; }],
      ['Preço', function (p) { return reais(p.preco) + (ps.length > 1 && p.preco === menorPreco ? ' (menor)' : ''); }],
      ['Instalação base', function (p) { return reais(D.TIPOS[p.tipo].base); }],
      ['Ruído interno', function (p) { return p.ruido + ' dB' + (ps.length > 1 && p.ruido === menorRuido ? ' (menor)' : ''); }],
      ['Gás', function (p) { return p.gas; }],
      ['Ciclo', function (p) { return p.ciclo; }],
      ['Recursos', function (p) { return p.recursos.join(', '); }]
    ];
    var cab = el('tr', null, el('td'));
    ps.forEach(function (p) {
      cab.appendChild(el('th', { scope: 'col' }, ilustracao(p.tipo), el('span', { class: 'comp-marca', text: p.marca }), el('span', { class: 'comp-modelo', text: p.modelo })));
    });
    var corpo = el('tbody');
    linhas.forEach(function (l) {
      var tr = el('tr', { 'data-linha': l[0] }, el('th', { scope: 'row', text: l[0] }));
      ps.forEach(function (p) { tr.appendChild(el('td', { text: l[1](p) })); });
      corpo.appendChild(tr);
    });
    var acoes = el('tr', null, el('th', { scope: 'row', text: 'Ações' }));
    ps.forEach(function (p) {
      acoes.appendChild(el('td', { class: 'comp-acoes' },
        el('button', { type: 'button', class: 'botao botao-escuro', 'aria-label': 'Adicionar ' + nomeDe(p) + ' ao orçamento', text: 'Adicionar', onclick: function () { adicionar(p.id); } }),
        el('button', { type: 'button', class: 'botao-link', 'aria-label': 'Tirar ' + nomeDe(p) + ' da comparação', text: 'Tirar', onclick: function () {
          E.comparar.splice(E.comparar.indexOf(p.id), 1);
          salvar();
          desenharComparacao();
          avisar(nomeDe(p) + ' saiu da comparação.');
          $('comp-texto').setAttribute('tabindex', '-1');
          $('comp-texto').focus();
        } })
      ));
    });
    corpo.appendChild(acoes);
    caixa.appendChild(el('table', { class: 'comp-tabela' }, el('caption', { class: 'so-leitor', text: 'Comparação de modelos' }), el('thead', null, cab), corpo));
  }

  /* ---------- catálogo ---------- */
  function montarFiltros() {
    var caixa = $('filtro-tipos');
    Object.keys(D.TIPOS).forEach(function (t) {
      var c = el('input', { type: 'checkbox', id: 'f-tipo-' + t, value: t });
      c.addEventListener('change', lerFiltros);
      caixa.appendChild(el('label', { for: 'f-tipo-' + t, class: 'marcador' }, c, el('span', { text: D.TIPOS[t].nome })));
    });
    var sel = $('f-btu');
    sel.appendChild(el('option', { value: '', text: 'Todas' }));
    D.PRODUTOS.map(function (p) { return p.btu; }).filter(function (b, i, a) { return a.indexOf(b) === i; }).sort(function (a, b) { return a - b; }).forEach(function (b) {
      sel.appendChild(el('option', { value: String(b), text: num(b) + ' BTU' }));
    });
    ['f-btu', 'f-tensao', 'f-ordem'].forEach(function (id) { $(id).addEventListener('change', lerFiltros); });
    ['f-min', 'f-max'].forEach(function (id) { $(id).addEventListener('input', lerFiltros); });
    $('filtros').addEventListener('submit', function (ev) { ev.preventDefault(); });
    $('f-limpar').addEventListener('click', limparFiltros);
    $('vazio-limpar').addEventListener('click', function () { limparFiltros(); $('f-ordem').focus(); });
    $('filtros-caixa').open = window.matchMedia('(min-width: 900px)').matches;
  }
  function limparFiltros() {
    E.filtros = JSON.parse(JSON.stringify(FILTRO_PADRAO));
    aplicarFiltrosNaTela();
    salvar();
    desenharCatalogo();
  }
  function aplicarFiltrosNaTela() {
    var f = E.filtros;
    Object.keys(D.TIPOS).forEach(function (t) { $('f-tipo-' + t).checked = f.tipos.indexOf(t) >= 0; });
    $('f-btu').value = f.btu; $('f-tensao').value = f.tensao;
    $('f-min').value = f.min; $('f-max').value = f.max;
    $('f-ordem').value = f.ordem;
    if ($('f-ordem').selectedIndex < 0) { $('f-ordem').value = 'preco-asc'; f.ordem = 'preco-asc'; }
    if ($('f-btu').selectedIndex < 0) { $('f-btu').value = ''; f.btu = ''; }
    if ($('f-tensao').selectedIndex < 0) { $('f-tensao').value = ''; f.tensao = ''; }
  }
  function lerFiltros() {
    E.filtros = {
      tipos: Object.keys(D.TIPOS).filter(function (t) { return $('f-tipo-' + t).checked; }),
      btu: $('f-btu').value, tensao: $('f-tensao').value,
      min: $('f-min').value, max: $('f-max').value, ordem: $('f-ordem').value
    };
    salvar();
    desenharCatalogo();
  }
  function desenharCatalogo() {
    var f = E.filtros;
    var invertido = f.min !== '' && f.max !== '' && Number(f.min) > Number(f.max);
    $('f-preco-erro').hidden = !invertido;
    var lista = L.ordenar(L.filtrar(D.PRODUTOS, f), f.ordem);
    var g = $('grade');
    g.replaceChildren();
    lista.forEach(function (p) { g.appendChild(cartao(p)); });
    $('vazio').hidden = lista.length > 0;
    g.hidden = lista.length === 0;
    $('contagem').textContent = lista.length === 1 ? '1 modelo encontrado' : lista.length + ' modelos encontrados';
  }

  /* ---------- calculadora ---------- */
  var CAMPOS = [
    { id: 'area', rotulo: 'Área do ambiente', unidade: 'm²', min: 1, max: 200, passo: 1, inteiro: false, nomeCurto: 'área' },
    { id: 'pe', rotulo: 'Pé-direito', unidade: 'm', min: 2, max: 6, passo: 0.1, inteiro: false, nomeCurto: 'pé-direito' },
    { id: 'pessoas', rotulo: 'Pessoas no ambiente', unidade: '', min: 1, max: 30, passo: 1, inteiro: true, nomeCurto: 'pessoas' },
    { id: 'equip', rotulo: 'Equipamentos que esquentam', unidade: '', min: 0, max: 20, passo: 1, inteiro: true, nomeCurto: 'equipamentos' }
  ];
  function lerNumero(txt) {
    var t = String(txt).trim().replace(',', '.');
    if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
  }
  function escreverNumero(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }
  function montarCalculadora() {
    var caixa = $('calc-campos');
    CAMPOS.forEach(function (c) {
      var entrada = el('input', { id: 'c-' + c.id, type: 'text', inputmode: c.inteiro ? 'numeric' : 'decimal', autocomplete: 'off', 'aria-describedby': 'c-' + c.id + '-faixa c-' + c.id + '-erro' });
      entrada.value = E.calc[c.id];
      entrada.addEventListener('input', function () { calcular(); });
      function passo(sinal) {
        var atual = lerNumero(entrada.value);
        if (isNaN(atual)) atual = c.min;
        var novo = Math.round((atual + sinal * c.passo) * 100) / 100;
        novo = Math.min(c.max, Math.max(c.min, novo));
        entrada.value = escreverNumero(novo);
        calcular();
      }
      caixa.appendChild(el('div', { class: 'tecla' },
        el('label', { for: entrada.id, text: c.rotulo + (c.unidade ? ' (' + c.unidade + ')' : '') }),
        el('div', { class: 'tecla-linha' },
          el('button', { type: 'button', class: 'borracha', 'aria-label': 'Diminuir ' + c.nomeCurto, text: '\u2212', onclick: function () { passo(-1); } }),
          entrada,
          el('button', { type: 'button', class: 'borracha', 'aria-label': 'Aumentar ' + c.nomeCurto, text: '+', onclick: function () { passo(1); } })
        ),
        el('p', { id: 'c-' + c.id + '-faixa', class: 'dica dica-tecla', text: 'De ' + c.min + ' a ' + c.max }),
        el('p', { id: 'c-' + c.id + '-erro', class: 'erro', hidden: true })
      ));
    });
    $('c-sol').checked = E.calc.sol;
    $('c-sol').addEventListener('change', calcular);
    $('calc').addEventListener('submit', function (ev) { ev.preventDefault(); });
    $('c-padrao').addEventListener('click', function () {
      CAMPOS.forEach(function (c) { $('c-' + c.id).value = CALC_PADRAO[c.id]; });
      $('c-sol').checked = false;
      calcular();
    });
  }
  function calcular() {
    var dados = { sol: $('c-sol').checked };
    var valido = true;
    E.calc.sol = dados.sol;
    CAMPOS.forEach(function (c) {
      var cx = $('c-' + c.id);
      var v = lerNumero(cx.value);
      var erro = '';
      if (isNaN(v)) erro = 'Digite um número.';
      else if (c.inteiro && v % 1 !== 0) erro = 'Digite um número inteiro.';
      else if (v < c.min || v > c.max) erro = 'Use um valor de ' + c.min + ' a ' + c.max + '.';
      var caixaErro = $('c-' + c.id + '-erro');
      caixaErro.textContent = erro;
      caixaErro.hidden = !erro;
      if (erro) { cx.setAttribute('aria-invalid', 'true'); valido = false; } else { cx.removeAttribute('aria-invalid'); }
      dados[c.id] = v;
      E.calc[c.id] = cx.value;
    });
    salvar();
    var ol = $('conta-linhas');
    var rec = $('rec-grade');
    ol.replaceChildren();
    rec.replaceChildren();
    $('rec-mais').replaceChildren();
    if (!valido) {
      desenharDigitos($('visor-digitos'), '----');
      $('visor-indicado').textContent = 'Corrija os campos marcados';
      $('conta-total').textContent = 'Sem resultado';
      $('calc-falado').textContent = 'Há campos a corrigir. Sem estimativa por enquanto.';
      $('rec-texto').textContent = 'Corrija os campos marcados para ver os modelos.';
      return;
    }
    var r = L.calcularBTU(dados);
    var cap = L.capacidadeIndicada(r.total);
    desenharDigitos($('visor-digitos'), String(r.total));
    $('visor-indicado').textContent = cap ? 'Aparelho indicado: ' + num(cap) + ' BTU' : 'Acima do maior aparelho do catálogo';
    $('conta-total').textContent = num(r.total) + ' BTU';
    $('calc-falado').textContent = 'Estimativa de ' + num(r.total) + ' BTU por hora. ' + (cap ? 'Aparelho indicado de ' + num(cap) + ' BTU.' : 'Nenhum aparelho do catálogo cobre esse valor sozinho.');
    var pe = dados.pe > D.PE_REF;
    var linhas = [
      ['Área: ' + escreverNumero(dados.area) + ' m² × ' + r.fator + ' BTU (' + (dados.sol ? 'com' : 'sem') + ' sol da tarde)', r.base],
      [pe ? 'Pé-direito de ' + escreverNumero(dados.pe) + ' m: área aumentada na proporção de ' + escreverNumero(dados.pe) + ' ÷ 2,7' : 'Pé-direito de ' + escreverNumero(dados.pe) + ' m: até 2,70 m não muda a conta', r.pe],
      ['Pessoas além da primeira: ' + (dados.pessoas - 1) + ' × 600 BTU', r.pessoas],
      ['Equipamentos: ' + dados.equip + ' × 600 BTU', r.equip]
    ];
    linhas.forEach(function (l, i) {
      ol.appendChild(el('li', null, el('span', { text: l[0] }), el('strong', { text: (i ? '+ ' : '') + num(l[1]) })));
    });
    var lista = L.recomendar(r.total);
    if (!cap) {
      $('rec-texto').textContent = 'Nenhum modelo sozinho cobre ' + num(r.total) + ' BTU. Para uma carga assim, um projetista precisa avaliar o uso de mais de um aparelho.';
      return;
    }
    $('rec-texto').textContent = 'Para ' + num(r.total) + ' BTU, a menor capacidade do catálogo que cobre o total é ' + num(cap) + ' BTU. Cada sugestão é a opção mais em conta de um tipo que cobre o total, sem exagerar no tamanho.';
    lista.forEach(function (p) { rec.appendChild(cartao(p)); });
    $('rec-mais').appendChild(el('a', { href: '#/catalogo?btu=' + cap, text: 'Ver todos os modelos de ' + num(cap) + ' BTU' }));
  }

  /* ---------- orçamento ---------- */
  function tipoDaLinha(l) { return l.pid ? porId[l.pid].tipo : l.tipo; }
  function totais() {
    var aparelhos = 0, inst = 0;
    E.carrinho.forEach(function (l) {
      if (l.pid) aparelhos += porId[l.pid].preco * l.qtd;
      if (l.inst) inst += L.custoInstalacao(tipoDaLinha(l), l.metros).total * l.qtd;
    });
    return { aparelhos: aparelhos, inst: inst, total: aparelhos + inst };
  }
  function desenharResumo() {
    var t = totais();
    $('r-aparelhos').textContent = reais(t.aparelhos);
    $('r-instalacao').textContent = reais(t.inst);
    $('r-total').textContent = reais(t.total);
    var n = Number($('p-n').value) || 1;
    var p = L.parcelas(t.total, n);
    $('p-resultado').textContent = n === 1 ? '1x de ' + reais(p.parcela) + ', sem juros' : n + 'x de ' + reais(p.parcela);
    $('p-total').textContent = reais(p.total);
    $('p-juros').textContent = reais(p.juros);
    atualizarContador();
  }
  function textoInstalacao(tipo, metros) {
    var c = L.custoInstalacao(tipo, metros);
    if (!c.porMetro) return 'Instalação de ' + D.TIPOS[tipo].nome + ': ' + reais(c.total) + ' (não usa tubulação)';
    if (!c.extras) return 'Instalação: ' + reais(c.total) + ' (base com até 3 m de tubulação)';
    return 'Instalação: ' + reais(c.base) + ' de base + ' + c.extras + ' m × ' + reais(c.porMetro) + ' = ' + reais(c.total);
  }
  function desenharCarrinho() {
    var ul = $('carrinho');
    ul.replaceChildren();
    $('carrinho-vazio').hidden = E.carrinho.length > 0;
    $('resumo').hidden = E.carrinho.length === 0;
    document.querySelector('.orc').classList.toggle('orc-vazio', E.carrinho.length === 0);
    E.carrinho.forEach(function (l, idx) { ul.appendChild(linhaCarrinho(l, idx)); });
    desenharResumo();
  }
  function linhaCarrinho(l, idx) {
    var p = l.pid ? porId[l.pid] : null;
    var tipo = tipoDaLinha(l);
    var nome = p ? nomeDe(p) : 'Instalação de ' + D.TIPOS[tipo].nome;
    var usaTubo = D.TIPOS[tipo].metro > 0;
    var pref = 'l' + idx;
    var qtd = el('select', { id: pref + '-qtd' });
    for (var q = 1; q <= 10; q++) qtd.appendChild(el('option', { value: String(q), text: String(q) }));
    qtd.value = String(l.qtd);
    var conta = el('p', { class: 'linha-conta', 'data-conta': idx });
    var subtotal = el('p', { class: 'linha-subtotal' });
    function atualizar() {
      var inst = l.inst ? L.custoInstalacao(tipo, l.metros).total : 0;
      subtotal.textContent = reais(((p ? p.preco : 0) + inst) * l.qtd);
      conta.textContent = l.inst ? textoInstalacao(tipo, l.metros) : 'Sem instalação';
    }
    qtd.addEventListener('change', function () { l.qtd = Number(qtd.value); salvar(); atualizar(); desenharResumo(); });
    var corpo = el('div', { class: 'linha-opcoes' }, el('div', { class: 'campo campo-curto' }, el('label', { for: qtd.id, text: 'Quantidade' }), qtd));
    var metros = null;
    if (usaTubo) {
      metros = el('input', { id: pref + '-metros', type: 'number', min: '1', max: '30', step: '1', inputmode: 'numeric' });
      metros.value = String(l.metros);
      metros.disabled = !l.inst;
      metros.addEventListener('change', function () {
        l.metros = limitarMetros(metros.value);
        metros.value = String(l.metros);
        salvar(); atualizar(); desenharResumo();
      });
      corpo.appendChild(el('div', { class: 'campo campo-curto' }, el('label', { for: metros.id, text: 'Tubulação (m)' }), metros));
    }
    var nodos = el('li', { class: 'linha', 'data-linha-pid': l.pid || l.tipo }, ilustracao(tipo),
      el('div', { class: 'linha-info' },
        el('h3', { text: nome }),
        p ? el('p', { class: 'dica', text: num(p.btu) + ' BTU, ' + p.tensao + ' V, ' + reais(p.preco) + ' cada' }) : el('p', { class: 'dica', text: 'Só o serviço, para quem já tem o aparelho' }),
        corpo));
    if (p) {
      var marca = el('input', { type: 'checkbox', id: pref + '-inst' });
      marca.checked = l.inst;
      marca.addEventListener('change', function () {
        l.inst = marca.checked;
        if (metros) metros.disabled = !l.inst;
        salvar(); atualizar(); desenharResumo();
      });
      corpo.insertBefore(el('label', { class: 'marcador marcador-linha', for: marca.id }, marca, el('span', { text: 'Incluir instalação' })), corpo.firstChild.nextSibling);
    }
    nodos.lastChild.appendChild(conta);
    nodos.appendChild(el('div', { class: 'linha-fim' }, subtotal,
      el('button', { type: 'button', class: 'botao-link', 'aria-label': 'Remover ' + nome + ' do orçamento', text: 'Remover', onclick: function () {
        E.carrinho.splice(E.carrinho.indexOf(l), 1);
        salvar();
        desenharCarrinho();
        avisar(nome + ' removido do orçamento.');
        $('t-carrinho').setAttribute('tabindex', '-1');
        $('t-carrinho').focus();
      } })));
    atualizar();
    return nodos;
  }
  function montarOrcamento() {
    var sel = $('i-tipo');
    var tb = $('tabela-inst');
    Object.keys(D.TIPOS).forEach(function (t) {
      var d = D.TIPOS[t];
      sel.appendChild(el('option', { value: t, text: d.nome }));
      tb.appendChild(el('tr', null, el('th', { scope: 'row', text: d.nome }), el('td', { text: reais(d.base) }), el('td', { text: d.metro ? reais(d.metro) : 'Não usa' })));
    });
    function conta() {
      var tipo = sel.value;
      var usa = D.TIPOS[tipo].metro > 0;
      var bruto = $('i-metros').value;
      var n = Number(bruto);
      $('i-metros').disabled = !usa;
      var erro = usa && (bruto === '' || !isFinite(n) || n < 1 || n > 30 || n % 1 !== 0) ? 'Use um número inteiro de 1 a 30 metros.' : '';
      $('i-erro').textContent = erro;
      $('i-erro').hidden = !erro;
      if (erro) { $('i-metros').setAttribute('aria-invalid', 'true'); $('i-conta').textContent = ''; return null; }
      $('i-metros').removeAttribute('aria-invalid');
      var m = usa ? n : D.METROS_INCLUIDOS;
      $('i-conta').textContent = textoInstalacao(tipo, m);
      return { tipo: tipo, metros: m };
    }
    sel.addEventListener('change', conta);
    $('i-metros').addEventListener('input', conta);
    $('inst').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var r = conta();
      if (!r) { $('i-metros').focus(); return; }
      E.carrinho.push({ tipo: r.tipo, qtd: 1, inst: true, metros: r.metros });
      salvar();
      desenharCarrinho();
      avisar('Instalação de ' + D.TIPOS[r.tipo].nome + ' adicionada ao orçamento.');
    });
    conta();
    var pn = $('p-n');
    for (var i = 1; i <= 12; i++) pn.appendChild(el('option', { value: String(i), text: i === 1 ? '1x, sem juros' : i + 'x, com juros de exemplo' }));
    pn.addEventListener('change', desenharResumo);
    var f = $('visita');
    f.addEventListener('submit', enviarVisita);
    ['v-nome', 'v-tel', 'v-bairro', 'v-data', 'v-periodo'].forEach(function (id) {
      $(id).addEventListener('input', function () { if ($(id).getAttribute('aria-invalid')) validarVisita(); });
      $(id).addEventListener('change', function () { if ($(id).getAttribute('aria-invalid')) validarVisita(); });
    });
    var amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    $('v-data').min = dataIso(amanha);
  }
  function dataIso(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dia;
  }
  function validarVisita() {
    var campos = [
      ['v-nome', function (v) { return v.trim().length < 3 ? 'Digite o nome, com pelo menos 3 letras.' : ''; }],
      ['v-tel', function (v) {
        var dig = v.replace(/\D/g, '');
        return /^[1-9][0-9](9?[0-9]{8})$/.test(dig) ? '' : 'Digite o telefone com DDD, com 10 ou 11 números.';
      }],
      ['v-bairro', function (v) { return v.trim().length < 2 ? 'Digite o bairro.' : ''; }],
      ['v-data', function (v) {
        if (!v) return 'Escolha uma data.';
        return v < $('v-data').min ? 'Escolha uma data a partir de amanhã.' : '';
      }],
      ['v-periodo', function (v) { return v ? '' : 'Escolha manhã ou tarde.'; }]
    ];
    var primeiro = null;
    campos.forEach(function (c) {
      var cx = $(c[0]);
      var msg = c[1](cx.value);
      var e = $(c[0] + '-erro');
      e.textContent = msg;
      e.hidden = !msg;
      if (msg) { cx.setAttribute('aria-invalid', 'true'); primeiro = primeiro || cx; } else { cx.removeAttribute('aria-invalid'); }
    });
    return primeiro;
  }
  function enviarVisita(ev) {
    ev.preventDefault();
    $('v-ok').hidden = true;
    var ruim = validarVisita();
    if (ruim) { ruim.focus(); return; }
    ev.target.reset();
    $('v-ok').hidden = false;
    $('v-ok').focus();
  }

  /* ---------- início ---------- */
  function montarInicio() {
    var ul = $('lista-tipos');
    Object.keys(D.TIPOS).forEach(function (t) {
      var d = D.TIPOS[t];
      ul.appendChild(el('li', null, ilustracao(t),
        el('div', null,
          el('h3', { text: d.nome }),
          el('p', { text: d.uso }),
          el('a', { href: '#/catalogo?tipo=' + t, text: 'Ver modelos de ' + d.nome })
        )));
    });
    ul.appendChild(el('li', { class: 'tipos-chamada' },
      el('h3', { text: 'Ainda em dúvida?' }),
      el('p', { text: 'Comece pelo cálculo. O resultado sugere modelos de tipos diferentes.' }),
      el('a', { class: 'botao botao-escuro', href: '#/calculadora', text: 'Calcular meu BTU' })));
    var led = $('led');
    var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calmo) { desenharDigitos(led, '24'); return; }
    var t = 38;
    desenharDigitos(led, String(t));
    var tic = setInterval(function () {
      t -= 1;
      desenharDigitos(led, String(t));
      if (t <= 24) clearInterval(tic);
    }, 110);
  }

  /* ---------- rotas ---------- */
  var ROTAS = { inicio: 1, catalogo: 1, calculadora: 1, comparar: 1, orcamento: 1, duvidas: 1, 'como-funciona': 1 };
  function rotaAtual() {
    var h = location.hash;
    if (h.indexOf('#/') !== 0) return { nome: 'inicio', busca: new URLSearchParams() };
    var partes = h.slice(2).split('?');
    return { nome: ROTAS[partes[0]] ? partes[0] : 'inicio', busca: new URLSearchParams(partes[1] || '') };
  }
  var primeira = true;
  function navegar() {
    if (location.hash && location.hash.indexOf('#/') !== 0) return;
    var r = rotaAtual();
    if (r.nome === 'catalogo' && (r.busca.get('tipo') || r.busca.get('btu'))) {
      var base = JSON.parse(JSON.stringify(FILTRO_PADRAO));
      if (D.TIPOS[r.busca.get('tipo')]) base.tipos = [r.busca.get('tipo')];
      if (r.busca.get('btu')) base.btu = r.busca.get('btu');
      E.filtros = base;
      aplicarFiltrosNaTela();
      salvar();
      history.replaceState(null, '', '#/catalogo');
    }
    var vista = null;
    document.querySelectorAll('[data-view]').forEach(function (v) {
      var ativa = v.getAttribute('data-view') === r.nome;
      v.hidden = !ativa;
      if (ativa) vista = v;
    });
    document.title = vista.getAttribute('data-titulo');
    document.querySelectorAll('[data-rota]').forEach(function (a) {
      if (a.getAttribute('data-rota') === r.nome) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    fecharMenu();
    $('aviso').classList.remove('aviso-ligado');
    $('aviso').textContent = '';
    if (r.nome === 'catalogo') desenharCatalogo();
    if (r.nome === 'calculadora') calcular();
    if (r.nome === 'comparar') desenharComparacao();
    if (r.nome === 'orcamento') desenharCarrinho();
    sincronizarComparar();
    window.scrollTo(0, 0);
    if (!primeira) vista.querySelector('h1').focus({ preventScroll: true });
    primeira = false;
  }
  function fecharMenu() {
    $('menu').classList.remove('menu-aberto');
    $('menu-botao').setAttribute('aria-expanded', 'false');
  }

  /* ---------- partida ---------- */
  $('menu-botao').addEventListener('click', function () {
    var abrir = !$('menu').classList.contains('menu-aberto');
    $('menu').classList.toggle('menu-aberto', abrir);
    $('menu-botao').setAttribute('aria-expanded', String(abrir));
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && $('menu').classList.contains('menu-aberto')) { fecharMenu(); $('menu-botao').focus(); }
  });
  $('menu').addEventListener('click', function (ev) { if (ev.target.closest('a')) fecharMenu(); });
  $('pular').addEventListener('click', function (ev) {
    ev.preventDefault();
    var h = document.querySelector('[data-view]:not([hidden]) h1');
    h.focus();
  });
  $('bandeja-limpar').addEventListener('click', function () {
    E.comparar = [];
    salvar();
    sincronizarComparar();
    avisar('Comparação limpa.');
    var alvo = document.querySelector('[data-view]:not([hidden]) h1');
    alvo.focus();
  });

  montarInicio();
  montarFiltros();
  aplicarFiltrosNaTela();
  montarCalculadora();
  montarOrcamento();
  atualizarContador();
  window.addEventListener('hashchange', navegar);
  navegar();
})();
