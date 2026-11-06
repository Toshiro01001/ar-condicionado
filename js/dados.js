/* Catálogo fictício. Marcas, modelos, preços e especificações são inventados. */
(function () {
  'use strict';
  var TIPOS = {
    split: { nome: 'Split', simbolo: 'il-split', base: 450, metro: 90, uso: 'Vai na parede, com uma unidade fora do ambiente. Serve bem a quartos e salas de uso comum.' },
    inverter: { nome: 'Split Inverter', simbolo: 'il-inverter', base: 520, metro: 90, uso: 'Mesmo formato do Split, com compressor de velocidade variável. Faz mais sentido em ambientes que ficam muitas horas ligados.' },
    janela: { nome: 'Janela', simbolo: 'il-janela', base: 180, metro: 0, uso: 'Uma peça só, encaixada em uma abertura na parede. A instalação é mais simples e não usa tubulação, mas costuma fazer mais barulho.' },
    pisoteto: { nome: 'Piso-teto', simbolo: 'il-pisoteto', base: 780, metro: 110, uso: 'Fica junto ao piso ou ao teto e joga o ar longe. Comum em salas grandes e comércios sem forro.' },
    cassete: { nome: 'Cassete', simbolo: 'il-cassete', base: 980, metro: 120, uso: 'Fica embutido no forro e distribui o ar para os lados. Precisa de forro com espaço para a peça.' }
  };
  /* id, marca, modelo, tipo, BTU, tensão, preço, ruído interno (dB), gás, ciclo, recursos */
  var L = [
    ['ar-j07', 'Aragem', 'Janela J7', 'janela', 7500, 127, 1399, 54, 'R-32', 'Só frio', ['Timer']],
    ['ve-j09', 'Ventaro', 'Quadra 9', 'janela', 9000, 127, 1589, 55, 'R-32', 'Só frio', ['Timer', 'Filtro lavável']],
    ['ca-j10', 'Caliandra', 'Jane 10', 'janela', 10000, 220, 1749, 55, 'R-32', 'Só frio', ['Filtro lavável']],
    ['ar-j12', 'Aragem', 'Janela J12', 'janela', 12000, 220, 2099, 56, 'R-32', 'Só frio', ['Timer', 'Controle remoto']],
    ['no-j18', 'Nórdia', 'Frente 18', 'janela', 18000, 220, 2999, 58, 'R-410A', 'Quente e frio', ['Timer', 'Controle remoto']],
    ['ve-s07', 'Ventaro', 'Parede 7', 'split', 7500, 127, 1699, 38, 'R-32', 'Só frio', ['Filtro lavável']],
    ['ar-s09', 'Aragem', 'Brisa 9', 'split', 9000, 127, 1899, 37, 'R-32', 'Só frio', ['Modo noturno', 'Filtro lavável']],
    ['ca-s09', 'Caliandra', 'Cerrado 9', 'split', 9000, 220, 1949, 36, 'R-32', 'Só frio', ['Modo noturno', 'Timer']],
    ['ar-s12', 'Aragem', 'Brisa 12', 'split', 12000, 220, 2299, 39, 'R-32', 'Só frio', ['Modo noturno', 'Filtro lavável']],
    ['no-s12', 'Nórdia', 'Polo 12', 'split', 12000, 127, 2399, 38, 'R-410A', 'Quente e frio', ['Timer', 'Filtro lavável']],
    ['ve-s18', 'Ventaro', 'Parede 18', 'split', 18000, 220, 3299, 42, 'R-32', 'Só frio', ['Timer']],
    ['ca-s24', 'Caliandra', 'Cerrado 24', 'split', 24000, 220, 4399, 45, 'R-410A', 'Quente e frio', ['Modo noturno', 'Timer']],
    ['no-i09', 'Nórdia', 'Polo Inverter 9', 'inverter', 9000, 220, 2349, 32, 'R-32', 'Só frio', ['Wi-Fi', 'Modo noturno']],
    ['ar-i09', 'Aragem', 'Brisa Inverter 9', 'inverter', 9000, 127, 2449, 33, 'R-32', 'Quente e frio', ['Modo noturno', 'Filtro lavável']],
    ['ca-i12', 'Caliandra', 'Cerrado Inverter 12', 'inverter', 12000, 220, 2789, 34, 'R-32', 'Só frio', ['Wi-Fi', 'Filtro lavável']],
    ['no-i12', 'Nórdia', 'Polo Inverter 12', 'inverter', 12000, 127, 2899, 33, 'R-32', 'Quente e frio', ['Wi-Fi', 'Modo noturno']],
    ['ve-i18', 'Ventaro', 'Fluxo 18', 'inverter', 18000, 220, 3999, 38, 'R-32', 'Só frio', ['Wi-Fi', 'Timer']],
    ['ar-i24', 'Aragem', 'Brisa Inverter 24', 'inverter', 24000, 220, 5199, 41, 'R-32', 'Quente e frio', ['Wi-Fi', 'Modo noturno']],
    ['no-i30', 'Nórdia', 'Polo Inverter 30', 'inverter', 30000, 220, 6699, 44, 'R-32', 'Quente e frio', ['Wi-Fi', 'Filtro lavável']],
    ['ve-p24', 'Ventaro', 'Vão 24', 'pisoteto', 24000, 220, 5899, 47, 'R-410A', 'Só frio', ['Timer', 'Direcionamento de ar']],
    ['no-p36', 'Nórdia', 'Salão 36', 'pisoteto', 36000, 220, 7999, 50, 'R-410A', 'Só frio', ['Timer', 'Direcionamento de ar']],
    ['ca-p48', 'Caliandra', 'Galpão 48', 'pisoteto', 48000, 220, 10499, 53, 'R-410A', 'Quente e frio', ['Direcionamento de ar']],
    ['ve-p60', 'Ventaro', 'Vão 60', 'pisoteto', 60000, 220, 12899, 55, 'R-410A', 'Só frio', ['Timer']],
    ['ar-c18', 'Aragem', 'Forro 18', 'cassete', 18000, 220, 5799, 40, 'R-32', 'Só frio', ['Saída em 4 direções']],
    ['no-c24', 'Nórdia', 'Teto 24', 'cassete', 24000, 220, 6899, 42, 'R-32', 'Só frio', ['Saída em 4 direções', 'Timer']],
    ['ca-c36', 'Caliandra', 'Forro Alto 36', 'cassete', 36000, 220, 9299, 46, 'R-410A', 'Quente e frio', ['Saída em 4 direções']],
    ['ar-c48', 'Aragem', 'Forro 48', 'cassete', 48000, 220, 11799, 49, 'R-410A', 'Só frio', ['Saída em 4 direções', 'Timer']],
    ['no-c60', 'Nórdia', 'Teto 60', 'cassete', 60000, 220, 14299, 52, 'R-410A', 'Quente e frio', ['Saída em 4 direções']]
  ];
  var PRODUTOS = L.map(function (x) {
    return { id: x[0], marca: x[1], modelo: x[2], tipo: x[3], btu: x[4], tensao: x[5], preco: x[6], ruido: x[7], gas: x[8], ciclo: x[9], recursos: x[10] };
  });
  window.FRIAGEM = { TIPOS: TIPOS, PRODUTOS: PRODUTOS, JUROS_MES: 0.0199, METROS_INCLUIDOS: 3, BTU_SEM_SOL: 600, BTU_COM_SOL: 800, BTU_EXTRA: 600, PE_REF: 2.7 };
})();
