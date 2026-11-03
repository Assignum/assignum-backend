import axios from 'axios';

import { ActivityTask } from '@src/activities/domain/entities/activity.entity';
import { UserProfile } from '@src/iam/domain/entities/user-profile.entity';

// ML_SERVICE_URL permite apuntar a un servicio local (o a uno inexistente para probar la contingencia)
const ML_URL = process.env.ML_SERVICE_URL ?? 'https://assignum-ml-service.onrender.com/recommend';

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
  const aliasToEmail = new Map(memberProfiles.map(({ email }, i) => [`s${i + 1}`, email]));
  const students = [...aliasToEmail].map(([alias], i) => toMlStudent(alias, memberProfiles[i].profile));

  const res = await axios.post<MlResponse>(ML_URL, {
    task: {
      taskType: task.taskType,
      taskComplexity: task.taskComplexity,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
    },
    students,
  });

  return res.data.ranking
    .filter((entry) => aliasToEmail.has(entry.name))
    .map((entry) => ({ ...entry, name: aliasToEmail.get(entry.name)! }));
};
