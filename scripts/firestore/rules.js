/**
 * Publica las reglas de Firestore con la cuenta de servicio del backend (Admin SDK), sin
 * necesidad de instalar firebase-tools ni iniciar sesión.
 *
 *   npm run rules:validate             compila las reglas en Firebase sin publicarlas
 *   npm run rules:backup               guarda las reglas publicadas en scripts/firestore/backups/
 *   npm run rules:deploy               respalda las actuales y publica ../assignum-mobile-app/firestore.rules
 *   npm run rules:deploy -- <archivo>  publica otro archivo (p. ej. un respaldo, para revertir)
 *
 * Lee FIREBASE_SERVICE_ACCOUNT_JSON de config/.env.development (o de DOTENV_CONFIG_PATH).
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '../../config/.env.development'),
  quiet: true,
});
const admin = require('firebase-admin');

const DEFAULT_RULES = path.join(__dirname, '../../../assignum-mobile-app/firestore.rules');
const BACKUPS = path.join(__dirname, 'backups');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (!serviceAccount) {
  console.error('Falta FIREBASE_SERVICE_ACCOUNT_JSON en el .env');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const rules = admin.securityRules();

const backup = async () => {
  const current = await rules.getFirestoreRuleset();
  fs.mkdirSync(BACKUPS, { recursive: true });
  const date = new Date(current.createTime).toISOString().slice(0, 10);
  const file = path.join(BACKUPS, `${date}_${current.name.slice(0, 8)}.rules`);
  fs.writeFileSync(file, current.source[0].content);
  console.log(`Respaldo de las reglas publicadas (${current.name}) en ${path.relative(process.cwd(), file)}`);
};

const readRules = (file) => {
  const source = fs.readFileSync(file, 'utf8');
  console.log(`Reglas: ${path.relative(process.cwd(), file)}`);
  return source;
};

const commands = {
  backup,
  async validate(file = DEFAULT_RULES) {
    const rs = await rules.createRuleset(rules.createRulesFileFromSource('firestore.rules', readRules(file)));
    await rules.deleteRuleset(rs.name);
    console.log('Compilan bien (no se publicó nada).');
  },
  async deploy(file = DEFAULT_RULES) {
    const source = readRules(file);
    await backup();
    const rs = await rules.releaseFirestoreRulesetFromSource(source);
    console.log(`Publicadas en ${serviceAccount.project_id}: ruleset ${rs.name}`);
  },
};

const [cmd, file] = process.argv.slice(2);
if (!commands[cmd]) {
  console.error('Uso: node scripts/firestore/rules.js <validate|backup|deploy> [archivo]');
  process.exit(1);
}
console.log(`Proyecto: ${serviceAccount.project_id}`);
commands[cmd](file && path.resolve(file)).catch((err) => {
  console.error('ERROR:', err.code || '', err.message);
  process.exit(1);
});
