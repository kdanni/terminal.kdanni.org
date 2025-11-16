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

const LOG_DIR = path.resolve(__dirname, '../logs');

function ensureLogDirectory() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  return LOG_DIR;
}

function createTranscript(plan, cliOptions) {
  const dir = ensureLogDirectory();
  const startedAt = new Date().toISOString();
  const fileName = `transcript-${startedAt.replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(dir, fileName);

  const transcript = {
    planName: plan.name,
    planPath: path.resolve(__dirname, 'plan.json'),
    startedAt,
    updatedAt: startedAt,
    cliOptions,
    phaseRuns: [],
    currentMessages: [],
    sharedContext: { ...(plan.context || {}) },
    progress: { nextIteration: 0, nextPhaseIndex: 0 },
    converged: false
  };

  fs.writeFileSync(filePath, JSON.stringify(transcript, null, 2));
  return { filePath, transcript };
}

function loadTranscript(resumePath) {
  const resolvedPath = path.resolve(process.cwd(), resumePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Resume file not found at ${resolvedPath}`);
  }

  const contents = fs.readFileSync(resolvedPath, 'utf-8');
  const transcript = JSON.parse(contents);
  const progress = transcript.progress || { nextIteration: 0, nextPhaseIndex: 0 };

  return { filePath: resolvedPath, transcript: { ...transcript, progress } };
}

function saveTranscript(filePath, transcript) {
  fs.writeFileSync(filePath, JSON.stringify(transcript, null, 2));
}

function resolveStartingPoint(transcript, phases) {
  if (!transcript || !Array.isArray(phases)) {
    return { iteration: 0, phaseIndex: 0 };
  }
  const iteration = Math.max(0, transcript.progress?.nextIteration ?? 0);
  const phaseIndex = Math.min(phases.length, Math.max(0, transcript.progress?.nextPhaseIndex ?? 0));
  return { iteration, phaseIndex };
}

function recordPhaseRun({
  transcriptInfo,
  iteration,
  phaseIndex,
  phases,
  phase,
  result,
  sharedContext,
  messages,
  converged
}) {
  if (!transcriptInfo) {
    return;
  }

  const completedAt = new Date().toISOString();
  const entry = {
    iteration,
    phaseName: phase.name,
    completedAt,
    output: result.output,
    structuredOutput: result.structuredOutput || null,
    messages: [
      result.phaseMessages?.system,
      result.phaseMessages?.user,
      result.phaseMessages?.assistant
    ].filter(Boolean)
  };

  transcriptInfo.transcript.phaseRuns.push(entry);
  transcriptInfo.transcript.sharedContext = { ...sharedContext };
  transcriptInfo.transcript.currentMessages = (messages || []).map((message) => ({
    role: message.role,
    content: message.content
  }));

  const hasMorePhases = phaseIndex + 1 < phases.length;
  transcriptInfo.transcript.progress = {
    nextIteration: hasMorePhases ? iteration : iteration + 1,
    nextPhaseIndex: hasMorePhases ? phaseIndex + 1 : 0
  };
  transcriptInfo.transcript.updatedAt = completedAt;
  transcriptInfo.transcript.converged = converged;

  saveTranscript(transcriptInfo.filePath, transcriptInfo.transcript);
}

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
    filenameBase: 'resolved-watch-list',
    resumePath: null
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
      continue;
    }
    if (arg.startsWith('--resume=')) {
      options.resumePath = arg.split('=')[1] || null;
      continue;
    }
    if (arg === '--resume') {
      options.resumePath = argv[i + 1] || null;
      i += 1;
    }
  }

  options.outputFormat = options.outputFormat === 'csv' ? 'csv' : 'json';
  return options;
}

async function executePlan(cliOptions = parseCliOptions()) {
  const { planPath, data: plan } = loadPlan();
  const convergencePhase = plan.convergence?.phase || 'fineTuning';
  const maxIterations = Math.max(1, plan.maxIterations || 1);

  let converged = false;
  let fineTuneOutput = '';

  let transcriptInfo;
  let sharedContext;
  let startIteration = 0;
  let startPhaseIndex = 0;

  const orchestratorOptions = {
    systemPrompt: plan.systemPrompt,
    temperature: plan.temperature,
    maxTokens: plan.maxTokens
  };

  if (cliOptions.resumePath) {
    transcriptInfo = loadTranscript(cliOptions.resumePath);
    ({ iteration: startIteration, phaseIndex: startPhaseIndex } = resolveStartingPoint(
      transcriptInfo.transcript,
      plan.phases
    ));

    sharedContext = { ...(plan.context || {}), ...(transcriptInfo.transcript.sharedContext || {}) };
    fineTuneOutput = sharedContext.fineTuningOutput || '';
    converged = Boolean(transcriptInfo.transcript.converged);

    orchestratorOptions.initialMessages = transcriptInfo.transcript.currentMessages;
    console.log(`Resuming conversation from transcript ${transcriptInfo.filePath}`);
  } else {
    transcriptInfo = createTranscript(plan, cliOptions);
    sharedContext = { ...(plan.context || {}) };
    orchestratorOptions.initialMessages = undefined;
    console.log(`Logging conversation transcript to ${transcriptInfo.filePath}`);
  }

  const orchestrator = new ConversationOrchestrator(orchestratorOptions);

  if (!cliOptions.resumePath) {
    transcriptInfo.transcript.currentMessages = orchestrator.messages.map((message) => ({
      role: message.role,
      content: message.content
    }));
    transcriptInfo.transcript.sharedContext = sharedContext;
    saveTranscript(transcriptInfo.filePath, transcriptInfo.transcript);
  }

  console.log(`Loaded orchestration plan from ${planPath}`);

  for (let iteration = startIteration; iteration < maxIterations && !converged; iteration += 1) {
    console.log(`\n=== Plan iteration ${iteration + 1}/${maxIterations} ===`);

    const phaseStartIndex = iteration === startIteration ? startPhaseIndex : 0;

    for (let phaseIndex = phaseStartIndex; phaseIndex < plan.phases.length && !converged; phaseIndex += 1) {
      const phase = plan.phases[phaseIndex];
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
        sharedContext.fineTuningOutput = fineTuneOutput;
        converged = orchestrator.isConverged(fineTuneOutput, plan.convergence);

        if (result.structuredOutput) {
          sharedContext.fineTuningData = result.structuredOutput;
        }

        if (converged) {
          console.log(`[${phase.name}] convergence criteria satisfied.`);
        } else {
          console.log(`[${phase.name}] convergence not yet met; continuing iterations...`);
        }
      }

      recordPhaseRun({
        transcriptInfo,
        iteration,
        phaseIndex,
        phases: plan.phases,
        phase,
        result,
        sharedContext,
        messages: orchestrator.messages,
        converged
      });

      if (converged) {
        break;
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
