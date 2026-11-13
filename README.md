# Friagem Ar-condicionado (loja de demonstração)

![Tela inicial da loja Friagem, com o Split em 3D na frente do título](docs/tela.webp)

Fiz este site demonstrativo de vendas de ar-condicionado, de uma loja fictícia em Cuiabá. Ele mostra como uma loja pode ajudar o cliente a descobrir o tamanho certo de aparelho, comparar modelos e ver o preço já com a instalação. A Friagem, as marcas, os modelos e os preços são inventados. Nada é vendido, enviado ou cobrado.

Publicado em: https://toshiro01001.github.io/ar-condicionado/

## Como usar

1. Na página inicial, role para ver o Split em 3D abrir em peças e aperte "Calcular meu BTU" (BTU é a medida da potência de um ar-condicionado). No fim da página há uma calculadora rápida.
2. Na calculadora, aperte + e − ou digite o tamanho do cômodo, quantas pessoas ficam nele e se bate sol da tarde. O visor mostra o resultado na hora e, no fim da página, aparecem os modelos que servem.
3. No catálogo, aperte "Adicionar ao orçamento" no modelo que quiser, ou marque "Comparar" em até 3 modelos para vê-los lado a lado.
4. Na tela Orçamento, inclua a instalação, escolha em quantas vezes pagar e, se quiser, teste o pedido de visita técnica. Nada é enviado de verdade.

Quem quiser saber o que roda por trás encontra a explicação na tela "Como isto funciona", com um bloco "Detalhes técnicos" para quem programa, e nas seções abaixo.

## O que tem no site

- **Tela inicial em 3D**: modelei um Split que acompanha a rolagem, abre em quatro peças (tampa, filtros, serpentina e ventilador), passa por um scanner, vira vidro e pousa no rodapé. Quem pede menos movimento no sistema vê a página parada.
- **Calculadora de BTU**, em forma de controle remoto: área, pé-direito, pessoas, equipamentos e sol da tarde. Mostra a conta linha por linha, avisa que é uma estimativa e recomenda modelos do catálogo.
- **Catálogo** com Split, Split Inverter, Janela, Piso-teto e Cassete: filtros por BTU, tipo, tensão e faixa de preço, ordenação e comparação de até 3 modelos, com fotos dos cinco aparelhos que modelei em 3D.
- **Orçamento e instalação**: valores de exemplo por tipo e distância de tubulação, carrinho, simulação de parcelas com juros de exemplo e pedido de visita com validação.
- **Dúvidas frequentes** sobre BTU, Inverter, instalação e manutenção.
- **Como isto funciona**: o que dá para adaptar e o que a versão real precisaria a mais.

## Como funciona (parte técnica)

É um site estático de uma página só. As telas ficam em `index.html` e o JavaScript mostra uma de cada vez conforme o endereço (`#/catalogo`, `#/calculadora` e assim por diante). Não há servidor nem serviços de terceiros. A tela inicial vem pronta em `assets/pagina.js` e `assets/index.css`; o código-fonte dela fica fora deste repositório.

| Arquivo | Para que serve |
| --- | --- |
| `js/dados.js` | Catálogo, valores de instalação, juros e constantes da regra |
| `js/logica.js` | As contas, sem nada de tela |
| `js/app.js` | Telas, filtros, carrinho, formulário e rotas |
| `css/estilo.css` | Aparência da loja (catálogo, calculadora, orçamento e demais telas) |
| `assets/` | Tela inicial já compilada: o aparelho em 3D, a rolagem, o estilo e a fonte Albert Sans, servida pelo próprio site |
| `img/` | Fotos dos cinco aparelhos modelados em 3D |
| `fontes/` | Fontes da versão anterior, que o site não usa mais |
| `tests/fluxos.js` | Testes de ponta a ponta |

Carrinho, comparação, filtros e valores da calculadora ficam no `localStorage` do navegador. O formulário de visita não guarda nem envia nada.

A regra da calculadora: 600 BTU por m² (800 com sol da tarde), parte da área proporcional ao pé-direito acima de 2,70 m, mais 600 BTU por pessoa além da primeira e mais 600 BTU por equipamento. É uma estimativa e não substitui a avaliação de um técnico.

## Como rodar

Precisa de um servidor local simples, a partir da pasta do projeto:

```
python3 -m http.server 8000
```

Depois abra http://localhost:8000/.

Para rodar os testes, com Playwright e Chromium já instalados:

```
NODE_PATH=$(npm root -g) node tests/fluxos.js
```

Passe uma pasta como argumento para salvar as capturas de tela.

## Tecnologias

A loja (catálogo, calculadora, orçamento) é HTML, CSS e JavaScript puros. A tela inicial usa three.js para o 3D, GSAP e Lenis para a rolagem, compilados com Vite em `assets/`; tudo é servido pelo próprio site, sem pedidos a terceiros. SVG próprio no visor da calculadora. Playwright apenas nos testes.

Desenvolvi este projeto e usei o Claude, da Anthropic, como ferramenta durante o desenvolvimento.
