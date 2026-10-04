// Sends phrases to the deployed CLU model and prints the detected intent and entities.
// Usage: node scripts/clu/test.js "qué tareas tengo pendientes" "cómo va Proyecto de Física"

const { loadEnv } = require('./env');

const { endpoint, key, projectName, deploymentName } = loadEnv();

const DEFAULT_PHRASES = [
  'hola',
  'qué tareas tengo pendientes',
  'cómo va el proyecto de Física',
  'agrega la tarea hacer el informe a Proyecto de Física',
  'cómo meto a un compañero a mi grupo',
  'cuál es la capital de Perú',
];

const analyze = async (text) => {
  const res = await fetch(`${endpoint}/language/:analyze-conversations?api-version=2023-04-01`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'Conversation',
      analysisInput: { conversationItem: { id: '1', participantId: 'user', text } },
      parameters: { projectName, deploymentName, stringIndexType: 'TextElement_V8' },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()).result.prediction;
};

const main = async () => {
  const phrases = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PHRASES;
  for (const text of phrases) {
    const prediction = await analyze(text);
    const top = prediction.intents.find((i) => i.category === prediction.topIntent);
    const entities = prediction.entities.map((e) => `${e.category}="${e.text}"`).join(', ');
    console.log(`"${text}"\n  -> ${prediction.topIntent} (${top?.confidenceScore.toFixed(2)})${entities ? `  ${entities}` : ''}`);
  }
};

main().catch((err) => {
  console.error(`[clu] Error: ${err.message}`);
  process.exit(1);
});
