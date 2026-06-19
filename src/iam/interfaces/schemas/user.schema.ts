import { z } from 'zod';

const disponibilidadEnum = z.enum(['Mañana', 'Tarde', 'Noche', 'Fin de semana']);
const lastRoleEnum = z.enum([
  'Backend',
  'Frontend',
  'Testing',
  'Database',
  'Documentation',
  'Management',
]);
const skill = () => z.number().int().min(1).max(5);

export const createProfileSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  birthDate: z.string().nullable().optional(),
  disponibilidad: disponibilidadEnum,
  // Competencias Técnicas
  backendSkill: skill(),
  frontendSkill: skill(),
  databaseSkill: skill(),
  testingSkill: skill(),
  documentationSkill: skill(),
  gitGithubSkill: skill(),
  agileMethodologiesSkill: skill(),
  // Competencias Colaborativas
  teamworkSkill: skill(),
  communicationSkill: skill(),
  leadershipSkill: skill(),
  organizationSkill: skill(),
  // Experiencia y Disponibilidad
  projectsCompleted: z.number().int().min(0).max(50),
  availableHoursPerWeek: z.number().int().min(1).max(40),
  lastRole: lastRoleEnum,
  lastRolePerformance: skill(),
  peerEvaluation: skill(),
});

export const updateProfileSchema = createProfileSchema.partial();
