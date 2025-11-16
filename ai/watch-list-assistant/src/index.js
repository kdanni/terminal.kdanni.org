const fs = require('node:fs');
const path = require('node:path');

const { ConversationOrchestrator } = require('./conversation');
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

async function executePlan() {
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
}

(async () => {
  try {
    await executePlan();
  } catch (error) {
    console.error('Failed to orchestrate watch list conversation:', error.message);
    process.exitCode = 1;
  }
})();
