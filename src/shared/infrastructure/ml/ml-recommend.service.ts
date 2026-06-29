import axios from 'axios';

import { ActivityTask } from '@src/activities/domain/entities/activity.entity';
import { UserProfile } from '@src/iam/domain/entities/user-profile.entity';

const ML_URL = 'https://assignum-ml-service.onrender.com/recommend';

interface MlResponse {
  recommended_student: string;
  success_probability: number;
  ranking: Array<{ name: string; success_probability: number; prediction: string; rank: number }>;
}

const toMlStudent = (email: string, profile: UserProfile | null) => ({
  name: email,
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
  const students = memberProfiles.map(({ email, profile }) => toMlStudent(email, profile));

  const res = await axios.post<MlResponse>(ML_URL, {
    task: {
      taskType: task.taskType,
      taskComplexity: task.taskComplexity,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
    },
    students,
  });

  return res.data.ranking;
};
