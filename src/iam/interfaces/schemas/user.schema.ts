import { z } from 'zod';

const lastRoleEnum = z.enum([
  'Backend',
  'Frontend',
  'Testing',
  'Database',
  'Documentation',
  'Management',
]);
const skill = () => z.number().int().min(1).max(5);

const privacyConsentSchema = z.object({
  accepted: z.literal(true, { errorMap: () => ({ message: 'The privacy policy must be accepted' }) }),
  version: z.string().min(1),
});

export const createProfileSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  birthDate: z.string().nullable().optional(),
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
  // Aceptación del aviso de privacidad: obligatoria al crear el perfil y al reaceptar una
  // versión nueva del aviso.
  privacyConsent: privacyConsentSchema,
});

export const updateProfileSchema = createProfileSchema.partial();
