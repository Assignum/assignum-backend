// Minimal .env reader for the CLU scripts (they run with plain node, no dotenv needed).

const fs = require('fs');
const path = require('path');

const DEFAULT_ENV = path.join(__dirname, '..', '..', 'config', '.env.development');

const loadEnv = (file = process.env.DOTENV_CONFIG_PATH || DEFAULT_ENV) => {
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const eq = line.indexOf('=');
      if (eq <= 0 || line.trimStart().startsWith('#')) continue;
      const key = line.slice(0, eq).trim();
      if (!(key in process.env)) process.env[key] = line.slice(eq + 1).trim();
    }
  }

  const missing = ['AZURE_LANGUAGE_ENDPOINT', 'AZURE_LANGUAGE_KEY'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[clu] Falta configurar ${missing.join(', ')} en ${file}`);
    process.exit(1);
  }

  return {
    endpoint: process.env.AZURE_LANGUAGE_ENDPOINT.replace(/\/+$/, ''),
    key: process.env.AZURE_LANGUAGE_KEY,
    projectName: process.env.CLU_PROJECT_NAME || 'assignum-assistant',
    deploymentName: process.env.CLU_DEPLOYMENT_NAME || 'production',
  };
};

module.exports = { loadEnv };
