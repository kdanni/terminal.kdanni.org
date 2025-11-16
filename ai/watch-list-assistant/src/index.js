const fs = require('node:fs');
const path = require('node:path');

const { ConversationOrchestrator } = require('./conversation');
const { persistWatchList } = require('./persistence');
const { buildContextPrompt, buildPopulationPrompt, buildFineTunePrompt } = require('./templates');

const TEMPLATE_BUILDERS = {
  buildContextPrompt,
  buildPopulationPrompt,
  buildFineTunePrompt
};

function applyPromptBuilders(plan) {
  if (!plan || !Array.isArray(plan.phases)) {
    throw new Error('Plan is missing phases to orchestrate.');
  }

  const context = { ...(plan.context || {}) };

  const phases = plan.phases.map((phase) => {
    if (!phase.promptBuilder) {
      if (!phase.promptTemplate) {
        throw new Error(`Phase ${phase.name} is missing both promptBuilder and promptTemplate.`);
      }
      return phase;
    }

    const builder = TEMPLATE_BUILDERS[phase.promptBuilder];
    if (!builder) {
      throw new Error(`Unknown prompt builder: ${phase.promptBuilder}`);
    }

    return {
      ...phase,
      promptTemplate: builder(context, phase)
    };
  });

  return { ...plan, phases };
}

function loadPlan() {
  const planPath = path.resolve(__dirname, 'plan.json');
  const contents = fs.readFileSync(planPath, 'utf-8');
  const plan = JSON.parse(contents);
  return { planPath, data: applyPromptBuilders(plan) };
}

function parseCliOptions(argv = process.argv.slice(2)) {
  const options = {
    writeResolved: false,
    outputDir: path.resolve(process.cwd(), 'ai-output'),
    outputFormat: 'json',
    emitSql: false,
    filenameBase: 'resolved-watch-list'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--write-resolved') {
      options.writeResolved = true;
      continue;
    }
    if (arg === '--emit-sql') {
      options.emitSql = true;
      continue;
    }
    if (arg.startsWith('--output-format=')) {
      options.outputFormat = arg.split('=')[1] || options.outputFormat;
      continue;
    }
    if (arg === '--output-format') {
      options.outputFormat = argv[i + 1] || options.outputFormat;
      i += 1;
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      options.outputDir = path.resolve(arg.split('=')[1] || options.outputDir);
      continue;
    }
    if (arg === '--output-dir') {
      options.outputDir = path.resolve(argv[i + 1] || options.outputDir);
      i += 1;
      continue;
    }
    if (arg.startsWith('--filename-base=')) {
      options.filenameBase = arg.split('=')[1] || options.filenameBase;
      continue;
    }
    if (arg === '--filename-base') {
      options.filenameBase = argv[i + 1] || options.filenameBase;
      i += 1;
    }
  }

  options.outputFormat = options.outputFormat === 'csv' ? 'csv' : 'json';
  return options;
}

async function executePlan(cliOptions = parseCliOptions()) {
  const { planPath, data: plan } = loadPlan();
  const orchestrator = new ConversationOrchestrator({
    systemPrompt: plan.systemPrompt,
    temperature: plan.temperature,
    maxTokens: plan.maxTokens
  });

  const sharedContext = { ...(plan.context || {}) };
  const convergencePhase = plan.convergence?.phase || 'fineTuning';
  const maxIterations = Math.max(1, plan.maxIterations || 1);

  let converged = false;
  let fineTuneOutput = '';

  console.log(`Loaded orchestration plan from ${planPath}`);

  for (let iteration = 0; iteration < maxIterations && !converged; iteration += 1) {
    console.log(`\n=== Plan iteration ${iteration + 1}/${maxIterations} ===`);

    for (const phase of plan.phases) {
      const phaseContext = { ...sharedContext };
      if (sharedContext.lastAssistantMessage) {
        phaseContext.lastAssistantMessage = sharedContext.lastAssistantMessage;
      }
      if (fineTuneOutput) {
        phaseContext.previousFineTuningOutput = fineTuneOutput;
      }

      const result = await orchestrator.runPhase(phase, phaseContext);

      sharedContext[`${phase.name}Output`] = result.output;
      if (result.structuredOutput) {
        sharedContext[`${phase.name}Data`] = result.structuredOutput;
        sharedContext[`${phase.name}Parsed`] = JSON.stringify(result.structuredOutput, null, 2);
      }
      sharedContext.lastAssistantMessage = result.output;

      if (phase.name === convergencePhase) {
        fineTuneOutput = result.output;
        converged = orchestrator.isConverged(fineTuneOutput, plan.convergence);

        if (converged) {
          console.log(`[${phase.name}] convergence criteria satisfied.`);
          break;
        }

        console.log(`[${phase.name}] convergence not yet met; continuing iterations...`);
      }
    }
  }

  if (!converged) {
    console.warn('Convergence criteria were not met after the configured iterations. Latest payload will be returned.');
  }

  const finalPayload = fineTuneOutput || sharedContext.lastAssistantMessage || 'No watch list payload generated.';

  console.log('\n=== Watch List Recommendation ===\n');
  console.log(finalPayload);
  console.log('\nReminder: This is a watch list recommendation, not financial advice.');

  const fineTuneData = sharedContext.fineTuningData;
  if (cliOptions.writeResolved && fineTuneData?.final_watch_list?.length) {
    try {
      const result = persistWatchList({
        fineTuneData,
        outputDir: cliOptions.outputDir,
        filenameBase: cliOptions.filenameBase,
        format: cliOptions.outputFormat,
        emitSql: cliOptions.emitSql
      });
      console.log(`\n[Persistence] Wrote ${result.entryCount} entries to ${result.filePath}`);
      if (result.sqlPath) {
        console.log(`[Persistence] SQL scaffold ready at ${result.sqlPath}`);
      }
    } catch (error) {
      console.warn('[Persistence] Failed to persist resolved watch list:', error.message);
    }
  } else if (cliOptions.writeResolved) {
    console.warn('[Persistence] Fine-tuning output missing final_watch_list entries. Nothing was written.');
  }
}

(async () => {
  try {
    const cliOptions = parseCliOptions();
    await executePlan(cliOptions);
  } catch (error) {
    console.error('Failed to orchestrate watch list conversation:', error.message);
    process.exitCode = 1;
  }
})();
