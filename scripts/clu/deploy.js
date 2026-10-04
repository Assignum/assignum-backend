// Imports the CLU project into Azure, trains it and deploys it.
// Usage: node scripts/clu/deploy.js   (reads config/.env.development)

const { loadEnv } = require('./env');
const { buildProject } = require('./build-project');

const API_VERSION = '2023-04-01';
const MODEL_LABEL = 'v1';

const { endpoint, key, projectName, deploymentName } = loadEnv();
const projectUrl = `${endpoint}/language/authoring/analyze-conversations/projects/${projectName}`;

const request = async (method, url, body) => {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url.includes('api-version=') ? url : `${url}${sep}api-version=${API_VERSION}`, {
    method,
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  }
  return res;
};

const MAX_POLL_ERRORS = 5;

// Long-running authoring calls return an operation-location header to poll.
const waitForJob = async (label, res) => {
  const jobUrl = res.headers.get('operation-location');
  if (!jobUrl) return;
  process.stdout.write(`[clu] ${label}`);
  let pollErrors = 0;
  for (;;) {
    let job;
    try {
      job = await (await request('GET', jobUrl)).json();
      pollErrors = 0;
    } catch (err) {
      // A dropped connection doesn't stop the job in Azure; keep polling.
      if (++pollErrors > MAX_POLL_ERRORS) throw err;
      process.stdout.write('x');
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (job.status === 'succeeded') {
      process.stdout.write(' listo\n');
      return job;
    }
    if (['failed', 'cancelled', 'cancelling'].includes(job.status)) {
      process.stdout.write('\n');
      throw new Error(`${label} terminó con estado "${job.status}": ${JSON.stringify(job.errors ?? job)}`);
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 5000));
  }
};

const main = async () => {
  // --deploy-only re-deploys the already trained model without spending training time.
  if (!process.argv.includes('--deploy-only')) {
    const project = buildProject();
    project.metadata.projectName = projectName;

    await waitForJob('Importando proyecto', await request('POST', `${projectUrl}/:import`, project));

    // Spanish requires advanced training (standard is English-only). F0 includes 1 free hour/month.
    const trainJob = await waitForJob(
      'Entrenando modelo (puede tardar 20 minutos o más)',
      await request('POST', `${projectUrl}/:train`, {
        modelLabel: MODEL_LABEL,
        trainingMode: 'advanced',
        evaluationOptions: { kind: 'percentage', trainingSplitPercentage: 80, testingSplitPercentage: 20 },
      }),
    );
    if (trainJob?.warnings?.length) console.warn('[clu] Advertencias:', JSON.stringify(trainJob.warnings));
  }

  await waitForJob(
    `Desplegando "${deploymentName}"`,
    await request('PUT', `${projectUrl}/deployments/${deploymentName}`, { trainedModelLabel: MODEL_LABEL }),
  );

  console.log(`[clu] Proyecto "${projectName}" desplegado. Pruébalo con: npm run clu:test -- "qué tareas tengo pendientes"`);
};

main().catch((err) => {
  console.error(`[clu] Error: ${err.message}`);
  process.exit(1);
});
