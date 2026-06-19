export type LastRole =
  | 'Backend'
  | 'Frontend'
  | 'Testing'
  | 'Database'
  | 'Documentation'
  | 'Management';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  birthDate: string | null;
  disponibilidad: 'Mañana' | 'Tarde' | 'Noche' | 'Fin de semana';
  // Competencias Técnicas (1–5)
  backendSkill: number;
  frontendSkill: number;
  databaseSkill: number;
  testingSkill: number;
  documentationSkill: number;
  gitGithubSkill: number;
  agileMethodologiesSkill: number;
  // Competencias Colaborativas (1–5)
  teamworkSkill: number;
  communicationSkill: number;
  leadershipSkill: number;
  organizationSkill: number;
  // Experiencia y Disponibilidad
  projectsCompleted: number;
  availableHoursPerWeek: number;
  lastRole: LastRole;
  lastRolePerformance: number;
  peerEvaluation: number;
}

export type PartialUserProfile = Partial<Omit<UserProfile, 'uid' | 'email'>>;
