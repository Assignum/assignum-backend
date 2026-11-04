import axios from 'axios';

import { ActivityTask } from '@src/activities/domain/entities/activity.entity';
import { UserProfile } from '@src/iam/domain/entities/user-profile.entity';

// ML_SERVICE_URL permite apuntar a un servicio local (o a uno inexistente para probar la contingencia)
const ML_URL = process.env.ML_SERVICE_URL ?? 'https://assignum-ml-service.onrender.com/recommend';
const ML_INFO_URL = ML_URL.replace(/\/recommend\/?$/, '/info');

/**
 * En Render gratis el servicio ML se duerme tras ~15 min sin uso y tarda 30–60 s en arrancar.
 * - Cada intento espera hasta REQUEST_TIMEOUT_MS; si falla por algo propio del arranque
 *   (timeout, red, 502/503/504) se reintenta tras RETRY_DELAYS_MS.
 * - Si aun así no responde, se considera caído por DOWN_COOLDOWN_MS: el resto de tareas del
 *   mismo reparto va directo a la contingencia en vez de esperar otra vez cada una.
 */
export const ML_TIMING = {
  REQUEST_TIMEOUT_MS: 45_000,
  RETRY_DELAYS_MS: [5_000, 10_000],
  DOWN_COOLDOWN_MS: 60_000,
  WARM_UP_INTERVAL_MS: 5 * 60_000,
};

let mlDownUntil = 0;
let lastWarmUp = 0;

/** Solo para pruebas: olvida el estado de "caído" y del último despertar. */
export const resetMlState = (): void => {
  mlDownUntil = 0;
  lastWarmUp = 0;
};

/**
 * Despierta al ML sin esperar la respuesta, como mucho una vez cada WARM_UP_INTERVAL_MS.
 * Se llama al arrancar el backend y con cada petición de la app: cuando un estudiante abre
 * la app el ML arranca mientras crea su actividad, y sigue despierto mientras haya uso.
 */
export const warmUpMl = (): void => {
  const now = Date.now();
  if (now - lastWarmUp < ML_TIMING.WARM_UP_INTERVAL_MS) return;
  lastWarmUp = now;
  axios.get(ML_INFO_URL, { timeout: 90_000 }).catch((err) => {
    console.warn(`[ml] No se pudo despertar ${ML_INFO_URL}:`, (err as Error).message);
  });
};

interface MlResponse {
  recommended_student: string;
  success_probability: number;
  ranking: Array<{ name: string; success_probability: number; prediction: string; rank: number }>;
}

/**
 * El servicio ML solo recibe el vector de características. En lugar del correo cada estudiante
 * va con un alias por petición (`s1`, `s2`, …) que se traduce de vuelta al recibir el ranking.
 */
const toMlStudent = (alias: string, profile: UserProfile | null) => ({
  name: alias,
  backendSkill: profile?.backendSkill || 1,
  frontendSkill: profile?.frontendSkill || 1,
  databaseSkill: profile?.databaseSkill || 1,
  testingSkill: profile?.testingSkill || 1,
  documentationSkill: profile?.documentationSkill || 1,
  gitGithubSkill: profile?.gitGithubSkill || 1,
  agileMethodologiesSkill: profile?.agileMethodologiesSkill || 1,
  teamworkSkill: profile?.teamworkSkill || 1,
  communicationSkill: profile?.communicationSkill || 1,
  leadershipSkill: profile?.leadershipSkill || 1,
  organizationSkill: profile?.organizationSkill || 1,
  projectsCompleted: profile?.projectsCompleted ?? 0,
  availableHoursPerWeek: profile?.availableHoursPerWeek || 8,
  lastRole: profile?.lastRole ?? 'Backend',
  lastRolePerformance: profile?.lastRolePerformance || 1,
  peerEvaluation: profile?.peerEvaluation || 1,
});

/** Errores típicos de un servicio que está arrancando; un 4xx (p. ej. 422) no se arregla esperando. */
const isTransient = (err: unknown): boolean => {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return status === undefined || status === 502 || status === 503 || status === 504;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface MlRankingEntry {
  name: string;
  success_probability: number;
  prediction: string;
  rank: number;
}

export const getRanking = async (
  task: Pick<ActivityTask, 'taskType' | 'taskComplexity' | 'priority' | 'estimatedHours'>,
  memberProfiles: Array<{ email: string; profile: UserProfile | null }>,
): Promise<MlRankingEntry[]> => {
  if (Date.now() < mlDownUntil) throw new Error('El servicio ML no respondió hace poco');

  const aliasToEmail = new Map(memberProfiles.map(({ email }, i) => [`s${i + 1}`, email]));
  const students = [...aliasToEmail].map(([alias], i) => toMlStudent(alias, memberProfiles[i].profile));
  const body = {
    task: {
      taskType: task.taskType,
      taskComplexity: task.taskComplexity,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
    },
    students,
  };

  const attempts = ML_TIMING.RETRY_DELAYS_MS.length + 1;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await axios.post<MlResponse>(ML_URL, body, { timeout: ML_TIMING.REQUEST_TIMEOUT_MS });
      return res.data.ranking
        .filter((entry) => aliasToEmail.has(entry.name))
        .map((entry) => ({ ...entry, name: aliasToEmail.get(entry.name)! }));
    } catch (err) {
      // Quien llama cae al reparto de contingencia; sin este aviso el motivo no queda en los logs
      const status = axios.isAxiosError(err) ? (err.response?.status ?? err.code) : undefined;
      console.warn(`[ml] ${ML_URL} falló (${status ?? 'sin estado'}), intento ${attempt}/${attempts}:`, (err as Error).message);
      if (!isTransient(err)) throw err;
      if (attempt === attempts) {
        mlDownUntil = Date.now() + ML_TIMING.DOWN_COOLDOWN_MS;
        throw err;
      }
      await sleep(ML_TIMING.RETRY_DELAYS_MS[attempt - 1]);
    }
  }
};
