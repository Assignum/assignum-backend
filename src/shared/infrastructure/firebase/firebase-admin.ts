import * as admin from 'firebase-admin';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env variable is required');
}

let serviceAccount: object;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
