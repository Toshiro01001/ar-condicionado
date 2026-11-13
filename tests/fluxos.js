/*
 * Testes de ponta a ponta com Playwright.
 * Como rodar, a partir da pasta do projeto:
 *   NODE_PATH=$(npm root -g) node tests/fluxos.js [pasta-para-capturas]
 * O site é servido em http://localhost:PORTA/ar-condicionado/ para imitar o GitHub Pages.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const SAIDA = process.argv[2] ? path.resolve(process.argv[2]) : null;
const TIPOS_MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp' };

function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (!url.startsWith('/ar-condicionado/')) { res.writeHead(404); return res.end(); }
      let rel = url.slice('/ar-condicionado/'.length) || 'index.html';
      const arq = path.join(RAIZ, rel);
      if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TIPOS_MIME[path.extname(arq)] || 'application/octet-stream' });
      fs.createReadStream(arq).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

let falhas = 0, passou = 0;
function confere(cond, nome, extra) {
  if (cond) { passou++; console.log('  ok   ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome + (extra !== undefined ? ' | obtido: ' + JSON.stringify(extra) : '')); }
}
const soDigitos = (s) => Number(String(s).replace(/[^\d]/g, ''));
const reais = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));

async function foto(page, prefixo, nome, inteira) {
  if (!SAIDA) return;
  if (inteira) await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById('aviso').classList.remove('aviso-ligado'); });
  await page.screenshot({ path: path.join(SAIDA, prefixo ? prefixo + '-' + nome + '.png' : nome + '.png'), fullPage: !!inteira });
}
async function semRolagemLateral(page, onde) {
  const r = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  confere(r.s <= r.c, 'sem rolagem lateral: ' + onde, r);
}
async function ir(page, rota) {
  await page.evaluate((h) => { location.hash = h; }, rota);
  await page.waitForFunction((h) => location.hash === h || h.includes('?'), rota);
  await page.waitForTimeout(40);
}
async function definirCalc(page, v) {
  for (const [k, val] of Object.entries(v)) {
    if (k === 'sol') {
      const m = await page.isChecked('#c-sol');
      if (m !== val) await page.locator('label.chave').click();
    } else await page.fill('#c-' + k, String(val));
  }
}

const CASOS = [
  // Calculados à mão com a regra da tela.
  { nome: '12 m², 2,7 m, 2 pessoas, 1 equip., sem sol: 7200+0+600+600', v: { area: '12', pe: '2,7', pessoas: '2', equip: '1', sol: false }, total: 8400, cap: 9000 },
  { nome: '20 m², 3 m, 4 pessoas, 2 equip., com sol: 16000+1778+1800+1200', v: { area: '20', pe: '3', pessoas: '4', equip: '2', sol: true }, total: 20778, cap: 24000 },
  { nome: '9 m², 2,5 m, 1 pessoa, sem equip., sem sol: 5400 sem reduzir por pé baixo', v: { area: '9', pe: '2,5', pessoas: '1', equip: '0', sol: false }, total: 5400, cap: 7500 },
  { nome: '15 m², 2,7 m, 2 pessoas, 1 equip., com sol: 12000+600+600', v: { area: '15', pe: '2,7', pessoas: '2', equip: '1', sol: true }, total: 13200, cap: 18000 },
  { nome: '12,5 m² com vírgula, 2,7 m, 1 pessoa, sem equip., sem sol: 7500 exatos', v: { area: '12,5', pe: '2,7', pessoas: '1', equip: '0', sol: false }, total: 7500, cap: 7500 },
  { nome: '100 m², 3 m, 10 pessoas, 5 equip., com sol: 80000+8889+5400+3000', v: { area: '100', pe: '3', pessoas: '10', equip: '5', sol: true }, total: 97289, cap: null }
];

async function fluxoCompleto(browser, cfg, base) {
  console.log('\n== ' + cfg.nome + ' ==');
  const ctx = await browser.newContext(cfg.contexto);
  const page = await ctx.newPage();
  const erros = [];
  const externos = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|WebGL|GPU stall|swiftshader/i.test(m.text())) erros.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => erros.push('falhou: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) erros.push(r.status() + ': ' + r.url()); });
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) externos.push(r.url()); });
  const P = cfg.prefixo;

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1900);
  confere(await page.locator('.faixa').innerText() === 'Loja de demonstração: produtos e preços fictícios', 'faixa de demonstração visível');
  confere((await page.locator('.rodape').innerText()).includes('Demonstração feita por Mil e Uma Linhas!'), 'rodapé com a assinatura');
  confere(await page.locator('.rodape a[href="https://mileumalinhas.com.br"]').count() === 1, 'link do rodapé correto');
  confere(await page.evaluate(() => document.fonts.check('300 40px "Albert Sans Variable"')), 'fonte própria carregada');
  await semRolagemLateral(page, 'início');
  const cta = await page.locator('.hero__acoes .bt').boundingBox();
  confere(cta.y + cta.height <= (cfg.celular ? 2000 : 800), 'chamada principal visível sem rolar no computador', cta);
  await foto(page, P, '01-inicio-topo');
  await foto(page, P, '02-inicio-inteira', true);

  // Calculadora
  await ir(page, '#/calculadora');
  await semRolagemLateral(page, 'calculadora');
  for (const c of CASOS) {
    await definirCalc(page, c.v);
    const total = soDigitos(await page.textContent('#conta-total'));
    confere(total === c.total, 'calculadora: ' + c.nome, total);
    const ind = await page.textContent('#visor-indicado');
    if (c.cap) {
      confere(soDigitos(ind) === c.cap, 'aparelho indicado ' + c.cap, ind);
      const btus = await page.$$eval('#rec-grade [data-produto] .plaqueta-btu strong', (n) => n.map((x) => Number(x.textContent.replace(/\D/g, ''))));
      confere(btus.length >= 1 && btus.length <= 3 && btus.every((b) => b >= c.total), 'recomendações cobrem o total', btus);
    } else {
      confere(/Acima do maior/.test(ind) && await page.locator('#rec-grade [data-produto]').count() === 0, 'carga acima do catálogo avisa e não recomenda', ind);
    }
    const soma = await page.$$eval('#conta-linhas strong', (n) => n.reduce((s, x) => s + Number(x.textContent.replace(/\D/g, '')), 0));
    confere(soma === c.total, 'linhas da conta somam o total', soma);
  }
  await page.fill('#c-area', '');
  confere((await page.textContent('#c-area-erro')).includes('Digite') && (await page.textContent('#conta-total')) === 'Sem resultado', 'campo vazio mostra erro, sem NaN');
  confere(!(await page.locator('main').innerText()).includes('NaN'), 'nenhum NaN na tela');
  await page.fill('#c-area', '999');
  confere((await page.textContent('#c-area-erro')).includes('de 1 a 200'), 'valor fora da faixa mostra erro');
  await page.fill('#c-area', '12,5');
  await page.click('[aria-label="Aumentar área"]');
  confere((await page.inputValue('#c-area')) === '13,5', 'botão + soma mantendo a vírgula', await page.inputValue('#c-area'));
  if (cfg.celular) {
    await page.focus('#c-area');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const cobre = await page.evaluate(() => { const v = document.getElementById('visor').getBoundingClientRect(); const a = document.activeElement.getBoundingClientRect(); return { fundoVisor: v.bottom, topoFoco: a.top, id: document.activeElement.id || document.activeElement.getAttribute('aria-label') }; });
    confere(cobre.topoFoco >= cobre.fundoVisor - 1, 'visor fixo não cobre o campo em foco', cobre);
  }
  await page.click('#c-padrao');
  await definirCalc(page, { area: '20', pe: '3', pessoas: '4', equip: '2', sol: true });
  await foto(page, P, '03-calculadora');
  await foto(page, P, '04-calculadora-inteira', true);

  // Filtros
  await ir(page, '#/catalogo');
  await page.waitForSelector('#grade [data-produto]');
  const abrir = async () => { if (!(await page.locator('#filtros-caixa').getAttribute('open') !== null)) await page.locator('#filtros-caixa summary').click(); };
  await abrir();
  const dados = await page.evaluate(() => window.FRIAGEM.PRODUTOS);
  confere(new Set(dados.map((p) => p.tipo)).size === 5, 'cinco tipos no catálogo');
  const qtd = () => page.locator('#grade [data-produto]').count();
  confere(await qtd() === dados.length, 'sem filtros: todos os ' + dados.length + ' modelos', await qtd());
  await semRolagemLateral(page, 'catálogo');
  await page.check('#f-tipo-cassete');
  const espCass = dados.filter((p) => p.tipo === 'cassete').length;
  confere(await qtd() === espCass, 'filtro por tipo: ' + espCass, await qtd());
  await page.uncheck('#f-tipo-cassete');
  await page.selectOption('#f-btu', '12000');
  const espB = dados.filter((p) => p.btu === 12000).length;
  confere(await qtd() === espB, 'filtro por BTU 12000: ' + espB, await qtd());
  await page.selectOption('#f-tensao', '127');
  const espBT = dados.filter((p) => p.btu === 12000 && p.tensao === 127).length;
  confere(await qtd() === espBT, 'BTU 12000 + 127 V: ' + espBT, await qtd());
  await page.selectOption('#f-btu', '');
  await page.selectOption('#f-tensao', '');
  await page.fill('#f-min', '2000');
  await page.fill('#f-max', '3000');
  const espP = dados.filter((p) => p.preco >= 2000 && p.preco <= 3000).length;
  confere(await qtd() === espP, 'faixa R$ 2.000 a 3.000: ' + espP, await qtd());
  const lidos = await page.$$eval('#grade [data-preco]', (n) => n.map((x) => Number(x.getAttribute('data-preco'))));
  confere(lidos.every((v) => v >= 2000 && v <= 3000), 'preços dentro da faixa');
  confere(lidos.every((v, i) => !i || lidos[i - 1] <= v), 'ordem padrão: menor preço');
  await page.selectOption('#f-ordem', 'preco-desc');
  const desc = await page.$$eval('#grade [data-preco]', (n) => n.map((x) => Number(x.getAttribute('data-preco'))));
  confere(desc.every((v, i) => !i || desc[i - 1] >= v), 'ordenação por maior preço');
  await page.selectOption('#f-ordem', 'btu-desc');
  const bts = await page.$$eval('#grade .plaqueta-btu strong', (n) => n.map((x) => Number(x.textContent.replace(/\D/g, ''))));
  confere(bts.every((v, i) => !i || bts[i - 1] >= v), 'ordenação por maior capacidade');
  await page.fill('#f-min', '9000');
  await page.fill('#f-max', '100');
  confere(await page.locator('#f-preco-erro').isVisible() && await page.locator('#vazio').isVisible(), 'faixa invertida avisa e mostra estado vazio');
  await page.click('#vazio-limpar');
  confere(await qtd() === dados.length, 'limpar filtros volta tudo');
  await foto(page, P, '05-catalogo-topo');
  await foto(page, P, '06-catalogo-inteiro', true);

  // Comparação
  const marcar = (id) => page.locator(`#grade [data-produto="${id}"] .marcar-comparar`).click();
  await marcar('ar-s09'); await marcar('no-i09'); await marcar('ve-j09');
  confere((await page.textContent('#bandeja-texto')).startsWith('3 de 3'), 'bandeja mostra 3 de 3');
  await marcar('ca-p48');
  confere(!(await page.isChecked('#grade [data-produto="ca-p48"] input[type=checkbox]')), 'quarto modelo é recusado');
  confere((await page.textContent('#aviso')).includes('já escolheu 3'), 'aviso sobre o limite de 3');
  await foto(page, P, '07-catalogo-bandeja');
  await page.click('#bandeja-ver');
  await page.waitForSelector('.comp-tabela');
  confere(await page.locator('.comp-tabela thead th').count() === 3, 'tabela com 3 colunas');
  const precoLinha = await page.locator('tr[data-linha="Preço"]').innerText();
  confere(precoLinha.includes('(menor)') && /1\.589,00 \(menor\)/.test(precoLinha.replace(/ /g, ' ')), 'menor preço marcado no modelo certo', precoLinha);
  confere(/32 dB \(menor\)/.test(await page.locator('tr[data-linha="Ruído interno"]').innerText()), 'menor ruído marcado no modelo certo');
  await semRolagemLateral(page, 'comparação');
  await foto(page, P, '08-comparacao', true);
  await page.click('[aria-label="Tirar Ventaro Quadra 9 da comparação"]');
  confere(await page.locator('.comp-tabela thead th').count() === 2, 'remover da comparação funciona');

  // Orçamento: Brisa 9 (R$ 1.899, Split) com 5 m: 450 + 2 × 90 = 630. Mais Forro 18 (R$ 5.799, Cassete) sem instalação.
  await ir(page, '#/catalogo');
  await page.waitForSelector('#grade [data-produto]');
  await page.click('#grade [data-produto="ar-s09"] .botao-escuro');
  await page.click('#grade [data-produto="ar-c18"] .botao-escuro');
  confere((await page.textContent('#contador')) === '(2)', 'contador do orçamento (2)');
  await ir(page, '#/orcamento');
  await page.waitForSelector('#carrinho .linha');
  await page.fill('[data-linha-pid="ar-s09"] input[type=number]', '5');
  await page.locator('[data-linha-pid="ar-s09"] input[type=number]').blur();
  confere((await page.locator('[data-linha-pid="ar-s09"] .linha-conta').innerText()).replace(/ /g, ' ').includes('450,00 de base + 2 m'), 'conta da tubulação aparece');
  await page.locator('[data-linha-pid="ar-c18"] .marcador-linha').click();
  confere(reais(await page.textContent('#r-aparelhos')) === 7698, 'aparelhos: 1.899 + 5.799 = 7.698', await page.textContent('#r-aparelhos'));
  confere(reais(await page.textContent('#r-instalacao')) === 630, 'instalação: 450 + 2 × 90 = 630', await page.textContent('#r-instalacao'));
  confere(reais(await page.textContent('#r-total')) === 8328, 'total: 8.328', await page.textContent('#r-total'));
  await semRolagemLateral(page, 'orçamento');

  // Parcelas de referência calculadas fora do site: PMT = PV × i ÷ (1 − (1 + i)^−n), i = 1,99%.
  await page.selectOption('#p-n', '1');
  confere(reais(await page.textContent('#p-total')) === 8328 && reais(await page.textContent('#p-juros')) === 0, '1x sem juros');
  await page.selectOption('#p-n', '10');
  const p10 = reais(await page.textContent('#p-resultado').then((t) => t.replace(/^10x de /, '')));
  confere(Math.abs(p10 - 926.64) < 0.011, '10x sobre 8.328: parcela de R$ 926,64', p10);
  confere(Math.abs(reais(await page.textContent('#p-total')) - p10 * 10) < 0.011, 'total pago = parcela × 10');
  await page.selectOption('#p-n', '12');
  const p12 = reais(await page.textContent('#p-resultado').then((t) => t.replace(/^12x de /, '')));
  confere(Math.abs(p12 - 787.01) < 0.011, '12x sobre 8.328: parcela de R$ 787,01', p12);
  confere(Math.abs(reais(await page.textContent('#p-juros')) - (p12 * 12 - 8328)) < 0.011, 'juros = total pago menos à vista');

  // Só instalação
  await page.selectOption('#i-tipo', 'janela');
  confere(await page.isDisabled('#i-metros') && (await page.textContent('#i-conta')).includes('não usa tubulação'), 'Janela não usa tubulação');
  await page.selectOption('#i-tipo', 'cassete');
  await page.fill('#i-metros', '8');
  confere((await page.textContent('#i-conta')).replace(/ /g, ' ').includes('R$ 1.580,00'), 'Cassete com 8 m: 980 + 5 × 120 = 1.580', await page.textContent('#i-conta'));
  await page.fill('#i-metros', '99');
  confere(await page.locator('#i-erro').isVisible(), 'distância fora da faixa mostra erro');
  await page.fill('#i-metros', '8');
  await page.click('#inst button[type=submit]');
  confere(reais(await page.textContent('#r-instalacao')) === 2210, 'instalação avulsa somada: 630 + 1.580', await page.textContent('#r-instalacao'));
  await foto(page, P, '09-orcamento', true);

  // Formulário
  await page.click('#visita button[type=submit]');
  confere(await page.locator('#visita .erro:visible').count() === 5, 'formulário vazio mostra 5 erros');
  confere(await page.evaluate(() => document.activeElement.id) === 'v-nome', 'foco vai ao primeiro campo com erro');
  confere(await page.locator('#v-nome').getAttribute('aria-invalid') === 'true', 'aria-invalid marcado');
  await foto(page, P, '10-formulario-erros');
  await page.fill('#v-nome', 'Maria Teste');
  await page.fill('#v-tel', '123');
  await page.fill('#v-bairro', 'Bairro de Teste');
  await page.fill('#v-data', '2020-01-01');
  await page.selectOption('#v-periodo', 'Manhã');
  await page.click('#visita button[type=submit]');
  confere((await page.textContent('#v-tel-erro')).includes('DDD'), 'telefone inválido recusado');
  confere((await page.textContent('#v-data-erro')).includes('amanhã'), 'data no passado recusada');
  await page.fill('#v-tel', '(65) 90000-0000');
  const min = await page.getAttribute('#v-data', 'min');
  await page.fill('#v-data', min);
  await page.click('#visita button[type=submit]');
  confere(await page.locator('#v-ok').isVisible() && (await page.textContent('#v-ok')).includes('Nada foi enviado'), 'confirmação simulada diz que nada foi enviado');
  confere((await page.inputValue('#v-nome')) === '', 'formulário limpo depois do envio simulado');
  await foto(page, P, '11-formulario-simulado');

  // Persistência e dados pessoais
  await ir(page, '#/calculadora');
  await definirCalc(page, { area: '33', pe: '2,7', pessoas: '3', equip: '2', sol: true });
  await page.reload({ waitUntil: 'networkidle' });
  confere((await page.inputValue('#c-area')) === '33' && await page.isChecked('#c-sol'), 'calculadora persiste depois de recarregar');
  confere((await page.textContent('#contador')) === '(3)', 'orçamento persiste depois de recarregar', await page.textContent('#contador'));
  const guardado = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
  confere(!/Maria|90000|Bairro de Teste/.test(guardado), 'nenhum dado pessoal guardado');
  confere(guardado.includes('ar-s09') && guardado.includes('no-i09'), 'carrinho e comparação estão guardados');
  await page.evaluate(() => { location.hash = '#/orcamento'; });
  await page.waitForSelector('#carrinho .linha');
  confere(reais(await page.textContent('#r-total')) === 9908, 'total preservado depois de recarregar: 8.328 + 1.580', await page.textContent('#r-total'));

  // Menu e demais telas
  if (cfg.celular) {
    await page.click('#menu-botao');
    confere(await page.locator('#menu a').first().isVisible(), 'menu do celular abre');
    await foto(page, P, '12-menu');
    await page.locator('#menu a[data-rota="duvidas"]').click();
    confere(!(await page.locator('#menu a').first().isVisible()), 'menu fecha ao navegar');
  } else {
    await ir(page, '#/duvidas');
  }
  await page.waitForSelector('[data-view="duvidas"] h1');
  confere(await page.evaluate(() => document.activeElement.tagName) === 'H1', 'foco vai ao título da tela nova');
  await page.locator('details summary', { hasText: 'O que é BTU?' }).click();
  confere(await page.locator('details p', { hasText: 'calor' }).first().isVisible(), 'dúvida abre');
  await semRolagemLateral(page, 'dúvidas');
  await foto(page, P, '13-duvidas', true);
  await ir(page, '#/como-funciona');
  await semRolagemLateral(page, 'como funciona');
  await foto(page, P, '14-como-funciona', true);
  await ir(page, '#/catalogo?tipo=janela');
  await page.waitForFunction(() => location.hash === '#/catalogo');
  confere(await page.locator('#grade [data-produto]').count() === dados.filter((p) => p.tipo === 'janela').length, 'link do tipo já filtra o catálogo');

  confere(erros.length === 0, 'console sem erros nem avisos', erros);
  confere(externos.length === 0, 'nenhuma requisição externa', externos);
  await ctx.close();
}

async function acessibilidade(browser, base) {
  console.log('\n== Teclado, leitor de tela e armazenamento bloqueado ==');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(base + '#/calculadora', { waitUntil: 'networkidle' });
  await page.evaluate(() => { location.hash = '#/orcamento'; });
  await page.waitForTimeout(40);
  confere(await page.locator('#resumo').isHidden() && await page.locator('#carrinho-vazio').isVisible(), 'orçamento vazio orienta e esconde o resumo');
  await page.evaluate(() => { location.hash = '#/calculadora'; });
  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  confere(await page.evaluate(() => document.activeElement.id) === 'pular', 'Tab inicial chega ao atalho de pular');
  await page.keyboard.press('Enter');
  confere(await page.evaluate(() => document.activeElement.tagName) === 'H1', 'atalho leva ao título da tela');
  await page.focus('#c-area');
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { rotulo: a.getAttribute('aria-label'), estilo: c.outlineStyle, largura: c.outlineWidth }; });
  confere(foco.rotulo === 'Aumentar área' && foco.estilo === 'solid' && foco.largura === '3px', 'foco visível nas teclas', foco);
  await page.keyboard.press('Enter');
  confere((await page.inputValue('#c-area')) === '13', 'tecla + funciona pelo teclado');
  await page.focus('#c-sol');
  await page.keyboard.press('Space');
  confere(await page.isChecked('#c-sol'), 'sol da tarde liga pelo teclado');
  confere(/Estimativa de/.test(await page.textContent('#calc-falado')), 'resultado anunciado na região falada');

  for (const rota of ['#/', '#/catalogo', '#/calculadora', '#/orcamento', '#/duvidas', '#/como-funciona']) {
    await page.evaluate((h) => { location.hash = h; }, rota);
    await page.waitForTimeout(40);
    const a = await page.evaluate(() => {
      const vis = (e) => !e.closest('[hidden]');
      const semRotulo = [...document.querySelectorAll('input,select')].filter((e) => vis(e) && !(e.labels && e.labels.length) && !e.getAttribute('aria-label')).map((e) => e.id);
      const semNome = [...document.querySelectorAll('button,a[href]')].filter((e) => vis(e) && !(e.textContent.trim() || e.getAttribute('aria-label'))).length;
      const h1 = [...document.querySelectorAll('h1')].filter(vis).length;
      const idsTodos = [...document.querySelectorAll('[id]')].map((e) => e.id);
      const idsRepetidos = idsTodos.filter((x, i) => idsTodos.indexOf(x) !== i);
      const niveis = [...document.querySelectorAll('h1,h2,h3')].filter(vis).map((e) => Number(e.tagName[1]));
      const pulou = niveis.some((n, i) => i && n - niveis[i - 1] > 1);
      return { semRotulo, semNome, h1, idsRepetidos, pulou };
    });
    confere(a.semRotulo.length === 0 && a.semNome === 0 && a.h1 === 1 && a.idsRepetidos.length === 0 && !a.pulou, 'estrutura em ' + rota, a);
  }
  // Contraste dos pares de cor usados no site (WCAG AA).
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const con = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  [['#0F3642', '#FFFFFF', 'texto em branco'], ['#0F3642', '#E9F2F5', 'texto na página'], ['#0F3642', '#F7C325', 'texto no ipê'], ['#F7C325', '#0F3642', 'faixa'], ['#3F5C66', '#FFFFFF', 'texto 2 em branco'], ['#3F5C66', '#E9F2F5', 'texto 2 na página'], ['#0A6685', '#FFFFFF', 'link em branco'], ['#0A6685', '#E9F2F5', 'link na página'], ['#FFFFFF', '#0A6685', 'botão em foco'], ['#A5380F', '#FFFFFF', 'erro em branco'], ['#15302A', '#C9DCCB', 'visor'], ['#BFE0EA', '#0F3642', 'LED']].forEach(([a, b, n]) => {
    const r = con(a, b);
    confere(r >= 4.5, 'contraste ' + n + ': ' + r.toFixed(2));
  });
  confere(erros.length === 0, 'sem erros nesta rodada', erros);
  await ctx.close();

  const c2 = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  await c2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  const p2 = await c2.newPage();
  const e2 = [];
  p2.on('pageerror', (e) => e2.push(e.message));
  await p2.goto(base + '#/calculadora', { waitUntil: 'networkidle' });
  confere(soDigitos(await p2.textContent('#conta-total')) === 8400, 'com localStorage bloqueado o site funciona');
  await p2.evaluate(() => { location.hash = '#/catalogo'; });
  await p2.waitForSelector('#grade [data-produto]');
  await p2.click('#grade [data-produto] .botao-escuro');
  confere((await p2.textContent('#contador')) === '(1)' && e2.length === 0, 'carrinho funciona sem localStorage', e2);
  await c2.close();

  const c4 = await browser.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
  const p4 = await c4.newPage();
  await p4.goto(base, { waitUntil: 'networkidle' });
  await p4.waitForFunction(() => document.body.dataset.pronto === '1', null, { timeout: 120000 });
  const anim = await p4.evaluate(() => ({ marca: document.documentElement.classList.contains('is-reduced'), suave: document.documentElement.classList.contains('lenis-smooth'), titulo: getComputedStyle(document.querySelector('.hero__l1 > span')).transform }));
  confere(anim.marca && !anim.suave && (anim.titulo === 'none' || anim.titulo === 'matrix(1, 0, 0, 1, 0, 0)'), 'movimento reduzido: sem rolagem suave e título já no lugar', anim);
  await c4.close();

  const c3 = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  await c3.addInitScript(() => { localStorage.setItem('friagem:v1', '{"carrinho":[{"pid":"inexistente"},{"pid":"ar-s09","qtd":"x"}],"comparar":"lixo","calc":null}'); });
  const p3 = await c3.newPage();
  const e3 = [];
  p3.on('pageerror', (e) => e3.push(e.message));
  await p3.goto(base, { waitUntil: 'networkidle' });
  confere((await p3.textContent('#contador')) === '(1)' && e3.length === 0, 'dados guardados corrompidos são limpos sem quebrar', e3);
  await c3.close();
}

(async () => {
  const s = await servidor();
  const porta = s.address().port;
  const base = `http://127.0.0.1:${porta}/ar-condicionado/`;
  if (SAIDA) fs.mkdirSync(SAIDA, { recursive: true });
  // o início desenha o aparelho em WebGL: sem placa de vídeo, o Chromium usa o desenho por software
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const iPhone = devices['iPhone 13'];
  const android320 = { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' };
  await fluxoCompleto(browser, { nome: 'Computador 1366x800', prefixo: 'computador', contexto: { viewport: { width: 1366, height: 800 }, deviceScaleFactor: 2, locale: 'pt-BR' } }, base);
  await fluxoCompleto(browser, { nome: 'iPhone 13', prefixo: 'celular', celular: true, contexto: { ...iPhone, deviceScaleFactor: 2, defaultBrowserType: undefined, locale: 'pt-BR' } }, base);
  await fluxoCompleto(browser, { nome: 'Tela de 320 px', prefixo: SAIDA ? '320px/320' : '', celular: true, contexto: android320 }, base);
  await acessibilidade(browser, base);
  await browser.close();
  s.close();
  console.log(`\nResultado: ${passou} conferências ok, ${falhas} falhas.`);
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
