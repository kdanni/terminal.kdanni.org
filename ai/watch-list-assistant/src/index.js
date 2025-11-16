const fs = require('node:fs');
const path = require('node:path');

const { ConversationOrchestrator } = require('./conversation');

function loadPlan() {
  const planPath = path.resolve(__dirname, 'plan.json');
  const contents = fs.readFileSync(planPath, 'utf-8');
  return { planPath, data: JSON.parse(contents) };
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
