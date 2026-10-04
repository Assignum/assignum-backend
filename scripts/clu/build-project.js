// Generates the CLU import file (assignum-assistant.json) from utterances.js.
// Usage: node scripts/clu/build-project.js

const fs = require('fs');
const path = require('path');

const { ENTITIES, INTENTS } = require('./utterances');

const PROJECT_NAME = process.env.CLU_PROJECT_NAME || 'assignum-assistant';
const LANGUAGE = 'es';
const OUTPUT = path.join(__dirname, 'assignum-assistant.json');

const ENTITY_MARK = /\[([^\]]+)\]\(([^)]+)\)/g;

// "agrega [x](NombreTarea)" -> { text: "agrega x", entities: [{ category, offset, length }] }
const parseUtterance = (raw) => {
  let text = '';
  let last = 0;
  const entities = [];
  for (const match of raw.matchAll(ENTITY_MARK)) {
    const [full, value, category] = match;
    if (!ENTITIES.includes(category)) throw new Error(`Unknown entity "${category}" in: ${raw}`);
    text += raw.slice(last, match.index);
    entities.push({ category, offset: text.length, length: value.length });
    text += value;
    last = match.index + full.length;
  }
  text += raw.slice(last);
  return { text, entities };
};

const buildProject = () => {
  const utterances = Object.entries(INTENTS).flatMap(([intent, examples]) =>
    examples.map((raw) => ({ ...parseUtterance(raw), language: LANGUAGE, intent, dataset: 'Train' })),
  );

  return {
    projectFileVersion: '2023-04-01',
    stringIndexType: 'Utf16CodeUnit',
    metadata: {
      projectKind: 'Conversation',
      projectName: PROJECT_NAME,
      language: LANGUAGE,
      multilingual: false,
      description: 'Asistente de Assignum: ayuda sobre la app y acciones sobre tareas y actividades',
      settings: { confidenceThreshold: 0 },
    },
    assets: {
      projectKind: 'Conversation',
      intents: Object.keys(INTENTS).map((category) => ({ category })),
      entities: ENTITIES.map((category) => ({ category, compositionSetting: 'combineComponents' })),
      utterances,
    },
  };
};

if (require.main === module) {
  const project = buildProject();
  fs.writeFileSync(OUTPUT, JSON.stringify(project, null, 2) + '\n');
  console.log(
    `[clu] ${project.assets.intents.length} intents, ${project.assets.utterances.length} utterances -> ${OUTPUT}`,
  );
}

module.exports = { buildProject };
