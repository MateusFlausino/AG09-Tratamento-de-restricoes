# Relatorio - Trabalho 09: Tratamento de Restricoes

**Aluno:** Mateus Flausino Conceicao  
**Disciplina:** 12612EEL011  
**Tema:** Algoritmo Genetico com tratamento de restricoes

## 1. Objetivo

Este trabalho desenvolve uma aplicacao interativa para demonstrar o uso de Algoritmo Genetico em um problema de otimizacao restrita. O desafio indicado no material de apoio consiste em realizar 30 execucoes do AG e obter a media e o desvio padrao dos resultados.

## 2. Problema de otimizacao

O problema implementado busca minimizar:

```text
f(x) = (x1 - 1)^2 + (x2 - 2)^2 + 1
```

sujeito as restricoes:

```text
x1 + x2 <= 4
x1 >= 2
x2 >= 1
0 <= x1, x2 <= 5
```

O otimo factivel esperado esta em `x = (2, 2)`, com valor `f(x) = 2`.

## 3. Metodo

Foram implementados dois modos de tratamento de restricoes:

- **Factivel primeiro (Deb):** prioriza individuos factiveis; se ambos forem factiveis, vence o menor valor da funcao objetivo; se ambos forem infactiveis, vence a menor violacao.
- **Penalizacao estatica:** soma uma penalidade ao valor objetivo, proporcional a violacao das restricoes.

O AG utiliza representacao real, selecao por roleta ponderada por ranking, crossover aritmetico e mutacao gaussiana com limites no dominio.

## 4. Parametros utilizados

| Parametro | Valor |
| --- | ---: |
| Tamanho da populacao | 60 |
| Taxa de crossover | 0.78 |
| Taxa de mutacao | 0.16 |
| Escala da mutacao | 0.35 |
| Numero de geracoes | 180 |
| Numero de execucoes | 30 |

## 5. Prints do aplicativo

### Print 1 - Tela inicial do app

> Inserir aqui o print da tela inicial.

![Espaco para print da tela inicial](prints/print-01-tela-inicial.png)

### Print 2 - Evolucao da populacao no espaco restrito

> Inserir aqui o print apos algumas geracoes executadas.

![Espaco para print da evolucao](prints/print-02-evolucao.png)

### Print 3 - Resultado das 30 execucoes

> Inserir aqui o print apos clicar em "Rodar 30 execucoes".

![Espaco para print das 30 execucoes](prints/print-03-trinta-execucoes.png)

## 6. Resultados

Preencher apos executar o aplicativo:

| Indicador | Valor observado |
| --- | ---: |
| Media dos melhores valores de f(x) | |
| Desvio padrao dos melhores valores de f(x) | |
| Taxa de execucoes factiveis | |
| Melhor valor obtido | |
| Pior valor obtido | |

## 7. Discussao

O criterio factivel primeiro tende a conduzir a populacao para a regiao valida antes de intensificar a busca no valor da funcao objetivo. A penalizacao estatica tambem pode funcionar, mas depende mais diretamente do peso de penalidade escolhido. Ao comparar os dois metodos no aplicativo, e possivel observar como a taxa de individuos factiveis e a estabilidade estatistica variam ao longo das execucoes.

## 8. Conclusao

A aplicacao permite visualizar o efeito das restricoes no processo evolutivo e cumpre o desafio de executar o AG 30 vezes, calculando media e desvio padrao dos resultados. O espaco visual do app facilita a interpretacao da regiao factivel, das violacoes e da convergencia para o otimo restrito.
