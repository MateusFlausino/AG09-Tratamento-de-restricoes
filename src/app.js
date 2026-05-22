import {
  ConstraintGeneticArena,
  DEFAULT_CONFIG,
  KNOWN_OPTIMUM,
  evaluateGenome,
  runBatch,
} from "./ga-core.js";

const dom = {
  arenaCanvas: document.querySelector("#arenaCanvas"),
  autoButton: document.querySelector("#autoButton"),
  averageViolationValue: document.querySelector("#averageViolationValue"),
  batchButton: document.querySelector("#batchButton"),
  batchFeasibleValue: document.querySelector("#batchFeasibleValue"),
  batchStatus: document.querySelector("#batchStatus"),
  bestFxValue: document.querySelector("#bestFxValue"),
  bestXValue: document.querySelector("#bestXValue"),
  feasibilityValue: document.querySelector("#feasibilityValue"),
  generationInput: document.querySelector("#generationInput"),
  generationValue: document.querySelector("#generationValue"),
  leaderboard: document.querySelector("#leaderboard"),
  meanValue: document.querySelector("#meanValue"),
  methodSelect: document.querySelector("#methodSelect"),
  objectiveValue: document.querySelector("#objectiveValue"),
  performanceCanvas: document.querySelector("#performanceCanvas"),
  populationInput: document.querySelector("#populationInput"),
  rangeValue: document.querySelector("#rangeValue"),
  resetButton: document.querySelector("#resetButton"),
  speedSlider: document.querySelector("#speedSlider"),
  speedValue: document.querySelector("#speedValue"),
  statusBanner: document.querySelector("#statusBanner"),
  stdValue: document.querySelector("#stdValue"),
  stepButton: document.querySelector("#stepButton"),
  studyFunctionValue: document.querySelector("#studyFunctionValue"),
};

const ctx = dom.arenaCanvas.getContext("2d");
const performanceCtx = dom.performanceCanvas.getContext("2d");

const state = {
  autoTimer: null,
  speed: Number(dom.speedSlider.value),
  arena: new ConstraintGeneticArena(),
  batch: null,
};

function formatDecimal(value, digits = 4) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function resizeCanvas(canvas, canvasCtx) {
  const dpr = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.floor(bounds.width * dpr);
  canvas.height = Math.floor(bounds.height * dpr);
  canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function readConfig() {
  return {
    ...DEFAULT_CONFIG,
    method: dom.methodSelect.value,
    populationSize: Math.max(10, Math.min(200, Number.parseInt(dom.populationInput.value, 10) || 60)),
    maxGenerations: Math.max(20, Math.min(500, Number.parseInt(dom.generationInput.value, 10) || 180)),
  };
}

function updateHud(snapshot) {
  dom.generationValue.textContent = String(snapshot.generation);
  dom.bestXValue.textContent = `(${snapshot.best.genes.map((gene) => formatDecimal(gene, 3)).join("; ")})`;
  dom.bestFxValue.textContent = formatDecimal(snapshot.best.cost, 6);
  dom.averageViolationValue.textContent = formatDecimal(snapshot.averageViolation, 6);
  dom.feasibilityValue.textContent = formatPercent(snapshot.feasibilityRate);
  dom.objectiveValue.textContent = `Objetivo: ${snapshot.objectiveLabel}`;
  dom.studyFunctionValue.textContent = `${snapshot.objectiveLabel}; ${snapshot.constraintsLabel}`;
  dom.statusBanner.textContent = snapshot.bestEver.feasible
    ? `Melhor global factivel em (${snapshot.bestEver.genes.map((gene) => formatDecimal(gene, 3)).join("; ")}).`
    : `Busca ainda priorizando reducao de violacao: ${formatDecimal(snapshot.bestEver.violation, 5)}.`;
}

function renderLeaderboard(snapshot) {
  dom.leaderboard.innerHTML = snapshot.leaderboard
    .map(
      (entry, index) => `
        <article class="leader-card ${entry.feasible ? "is-feasible" : "is-infeasible"}">
          <div class="leader-rank">${index + 1}</div>
          <div class="leader-meta">
            <strong>Individuo ${entry.id}</strong>
            <span>x1 = ${formatDecimal(entry.genes[0], 3)} | x2 = ${formatDecimal(entry.genes[1], 3)}</span>
            <code>violacao = ${formatDecimal(entry.violation, 5)}</code>
          </div>
          <div class="leader-score">f(x) = ${formatDecimal(entry.cost, 6)}</div>
        </article>
      `,
    )
    .join("");
}

function projectFactory(width, height, padding, config) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const axisMin = config.lowerBound;
  const axisMax = config.upperBound;

  return {
    x: (value) => padding.left + ((value - axisMin) / (axisMax - axisMin)) * chartWidth,
    y: (value) => padding.top + chartHeight - ((value - axisMin) / (axisMax - axisMin)) * chartHeight,
    chartWidth,
    chartHeight,
  };
}

function drawArena(snapshot) {
  resizeCanvas(dom.arenaCanvas, ctx);

  const width = dom.arenaCanvas.clientWidth;
  const height = dom.arenaCanvas.clientHeight;
  const padding = { top: 34, right: 28, bottom: 42, left: 54 };
  const project = projectFactory(width, height, padding, snapshot.config);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#edf5f2";
  ctx.fillRect(0, 0, width, height);

  const grid = 70;
  const cellWidth = project.chartWidth / grid;
  const cellHeight = project.chartHeight / grid;

  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const x1 = snapshot.config.lowerBound + (column / (grid - 1)) * (snapshot.config.upperBound - snapshot.config.lowerBound);
      const x2 = snapshot.config.upperBound - (row / (grid - 1)) * (snapshot.config.upperBound - snapshot.config.lowerBound);
      const evaluation = evaluateGenome([x1, x2], snapshot.config);
      const distance = Math.min(1, evaluation.cost / 18);

      if (evaluation.feasible) {
        ctx.fillStyle = `hsl(${164 - distance * 58} 54% ${76 - distance * 20}%)`;
      } else {
        const penalty = Math.min(1, evaluation.violation / 3);
        ctx.fillStyle = `hsl(${28 - penalty * 12} 74% ${83 - penalty * 22}%)`;
      }

      ctx.fillRect(
        padding.left + column * cellWidth,
        padding.top + row * cellHeight,
        Math.ceil(cellWidth) + 1,
        Math.ceil(cellHeight) + 1,
      );
    }
  }

  ctx.strokeStyle = "rgba(28, 55, 64, 0.18)";
  ctx.lineWidth = 1;
  for (let index = 0; index <= 5; index += 1) {
    const x = padding.left + (project.chartWidth / 5) * index;
    const y = padding.top + (project.chartHeight / 5) * index;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#284b63";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(project.x(0), project.y(4));
  ctx.lineTo(project.x(4), project.y(0));
  ctx.stroke();

  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "rgba(40, 75, 99, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(project.x(2), padding.top);
  ctx.lineTo(project.x(2), height - padding.bottom);
  ctx.moveTo(padding.left, project.y(1));
  ctx.lineTo(width - padding.right, project.y(1));
  ctx.stroke();
  ctx.setLineDash([]);

  const optimumX = project.x(KNOWN_OPTIMUM.genes[0]);
  const optimumY = project.y(KNOWN_OPTIMUM.genes[1]);
  ctx.fillStyle = "#f4d35e";
  ctx.beginPath();
  ctx.arc(optimumX, optimumY, 10, 0, Math.PI * 2);
  ctx.fill();

  snapshot.evaluated.forEach((entry) => {
    ctx.beginPath();
    ctx.fillStyle = entry.feasible ? "rgba(17, 94, 89, 0.74)" : "rgba(155, 62, 35, 0.72)";
    ctx.arc(project.x(entry.genes[0]), project.y(entry.genes[1]), 4.6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.beginPath();
  ctx.fillStyle = "#0b1320";
  ctx.arc(project.x(snapshot.best.genes[0]), project.y(snapshot.best.genes[1]), 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1c3740";
  ctx.font = '700 12px "Trebuchet MS"';
  ctx.fillText("x2", 18, padding.top - 10);
  ctx.fillText("x1", width - padding.right + 8, height - padding.bottom + 4);
  ctx.fillText("x1 + x2 <= 4", project.x(2.75), project.y(1.55));
  ctx.fillText("Otimo restrito: (2; 2)", optimumX + 12, optimumY - 10);
}

function drawPerformance(batch) {
  resizeCanvas(dom.performanceCanvas, performanceCtx);

  const width = dom.performanceCanvas.clientWidth;
  const height = dom.performanceCanvas.clientHeight;
  const padding = { top: 28, right: 22, bottom: 38, left: 58 };

  performanceCtx.clearRect(0, 0, width, height);
  performanceCtx.fillStyle = "#edf5f2";
  performanceCtx.fillRect(0, 0, width, height);

  if (!batch) {
    performanceCtx.fillStyle = "#3e5f67";
    performanceCtx.font = '700 14px "Trebuchet MS"';
    performanceCtx.fillText("Aguardando as 30 execucoes...", padding.left, padding.top + 24);
    return;
  }

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = batch.results.map((entry) => entry.bestCost);
  const minY = Math.max(0, Math.min(...values) - 0.35);
  const maxY = Math.max(...values) + 0.35;
  const projectX = (run) => padding.left + ((run - 1) / (batch.results.length - 1 || 1)) * chartWidth;
  const projectY = (value) => padding.top + chartHeight - ((value - minY) / (maxY - minY || 1)) * chartHeight;

  performanceCtx.strokeStyle = "rgba(28, 55, 64, 0.14)";
  performanceCtx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (chartHeight / 4) * index;
    performanceCtx.beginPath();
    performanceCtx.moveTo(padding.left, y);
    performanceCtx.lineTo(width - padding.right, y);
    performanceCtx.stroke();
  }

  performanceCtx.beginPath();
  batch.results.forEach((entry, index) => {
    const x = projectX(entry.run);
    const y = projectY(entry.bestCost);
    if (index === 0) {
      performanceCtx.moveTo(x, y);
    } else {
      performanceCtx.lineTo(x, y);
    }
  });
  performanceCtx.strokeStyle = "#0f766e";
  performanceCtx.lineWidth = 3;
  performanceCtx.stroke();

  batch.results.forEach((entry) => {
    performanceCtx.beginPath();
    performanceCtx.fillStyle = entry.feasible ? "#0f766e" : "#b45309";
    performanceCtx.arc(projectX(entry.run), projectY(entry.bestCost), 4, 0, Math.PI * 2);
    performanceCtx.fill();
  });

  const meanY = projectY(batch.summary.meanBestCost);
  performanceCtx.setLineDash([10, 8]);
  performanceCtx.strokeStyle = "#284b63";
  performanceCtx.beginPath();
  performanceCtx.moveTo(padding.left, meanY);
  performanceCtx.lineTo(width - padding.right, meanY);
  performanceCtx.stroke();
  performanceCtx.setLineDash([]);

  performanceCtx.fillStyle = "#1c3740";
  performanceCtx.font = '700 12px "Trebuchet MS"';
  performanceCtx.fillText("1", padding.left - 4, height - padding.bottom + 22);
  performanceCtx.fillText("30", width - padding.right - 18, height - padding.bottom + 22);
  performanceCtx.fillText("f(x)", 14, padding.top - 8);
  performanceCtx.fillText(formatDecimal(maxY, 2), padding.left - 48, padding.top + 4);
}

function render(snapshot) {
  updateHud(snapshot);
  renderLeaderboard(snapshot);
  drawArena(snapshot);
  drawPerformance(state.batch);
}

function stopAutoPlay() {
  if (state.autoTimer) {
    window.clearInterval(state.autoTimer);
    state.autoTimer = null;
    dom.autoButton.textContent = "Execucao automatica";
  }
}

function resetArena() {
  stopAutoPlay();
  state.arena = new ConstraintGeneticArena(readConfig());
  render(state.arena.lastSnapshot);
}

function runStep() {
  render(state.arena.step());
}

function startAutoPlay() {
  stopAutoPlay();
  const delay = Math.max(70, Math.round(1000 / state.speed));
  state.autoTimer = window.setInterval(runStep, delay);
  dom.autoButton.textContent = "Pausar";
}

function runThirtyExecutions() {
  stopAutoPlay();
  dom.batchButton.disabled = true;
  dom.batchStatus.textContent = "Executando 30 rodadas...";

  window.setTimeout(() => {
    state.batch = runBatch(readConfig());
    dom.meanValue.textContent = formatDecimal(state.batch.summary.meanBestCost, 6);
    dom.stdValue.textContent = formatDecimal(state.batch.summary.stdBestCost, 6);
    dom.batchFeasibleValue.textContent = formatPercent(state.batch.summary.feasibilityRate);
    dom.rangeValue.textContent = `${formatDecimal(state.batch.summary.bestCost, 4)} / ${formatDecimal(state.batch.summary.worstCost, 4)}`;
    dom.batchStatus.textContent = `${state.batch.summary.runs} execucoes concluidas com ${state.batch.summary.feasibleRuns} solucoes factiveis.`;
    drawPerformance(state.batch);
    dom.batchButton.disabled = false;
  }, 30);
}

dom.stepButton.addEventListener("click", runStep);
dom.resetButton.addEventListener("click", resetArena);
dom.batchButton.addEventListener("click", runThirtyExecutions);

dom.autoButton.addEventListener("click", () => {
  if (state.autoTimer) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
});

dom.speedSlider.addEventListener("input", () => {
  state.speed = Number(dom.speedSlider.value);
  dom.speedValue.textContent = `${state.speed} geracoes/s`;
  if (state.autoTimer) {
    startAutoPlay();
  }
});

dom.methodSelect.addEventListener("change", resetArena);
dom.populationInput.addEventListener("change", resetArena);
dom.generationInput.addEventListener("change", resetArena);

window.addEventListener("resize", () => {
  if (state.arena.lastSnapshot) {
    drawArena(state.arena.lastSnapshot);
    drawPerformance(state.batch);
  }
});

dom.speedValue.textContent = `${state.speed} geracoes/s`;
render(state.arena.lastSnapshot);
