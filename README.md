# Trabalho 09 - Tratamento de Restricoes

Aplicacao interativa para demonstrar o tratamento de restricoes em Algoritmos Geneticos.

## Problema

O AG minimiza:

```text
f(x) = (x1 - 1)^2 + (x2 - 2)^2 + 1
```

sujeito a:

```text
x1 + x2 <= 4
x1 >= 2
x2 >= 1
0 <= x1, x2 <= 5
```

O otimo factivel esperado esta em `x = (2, 2)`, com `f(x) = 2`.

## Tratamento das restricoes

A interface permite comparar duas abordagens:

- **Factivel primeiro (Deb)**: solucoes factiveis vencem solucoes infactiveis; entre factiveis, vence o menor custo; entre infactiveis, vence a menor violacao.
- **Penalizacao estatica**: a funcao objetivo recebe uma penalidade proporcional a soma das violacoes.

## Parametros padrao

| Parametro | Valor |
| --- | ---: |
| Tamanho da populacao | 60 |
| Taxa de crossover | 0.78 |
| Taxa de mutacao | 0.16 |
| Escala da mutacao | 0.35 |
| Geracoes | 180 |
| Execucoes estatisticas | 30 |

## Como executar

Instale as dependencias, se quiser usar o modo desktop:

```bash
npm install
```

Execute no navegador:

```bash
npm start
```

Depois acesse o endereco exibido no terminal, normalmente `http://127.0.0.1:4173`.

Para abrir como aplicativo desktop:

```bash
npm run desktop
```

Para gerar uma versao portatil para Windows:

```bash
npm run dist
```

## Verificacao

```bash
npm run verify
```

A verificacao executa 30 rodadas deterministicas e valida se o resultado medio fica proximo do otimo conhecido, com alta taxa de solucoes factiveis.

## Estrutura

- `src/ga-core.js`: algoritmo genetico, avaliacao das restricoes e rotina das 30 execucoes.
- `src/app.js`: integracao da simulacao com a interface web.
- `index.html`: estrutura da tela.
- `styles.css`: estilos da aplicacao.
- `server.js`: servidor estatico local.
- `electron/main.js`: inicializacao da aplicacao desktop.
- `verify.js`: verificacao automatizada.
- `Relatorio.md`: relatorio com espacos para inserir prints do app.
