import { z } from 'zod';

const disponibilidadEnum = z.enum(['Mañana', 'Tarde', 'Noche', 'Fin de semana']);
const cargaAcademicaEnum = z.enum(['Ligera', 'Media', 'Alta']);

export const createProfileSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  birthDate: z.string().nullable().optional(),
  disponibilidad: disponibilidadEnum,
  cargaAcademica: cargaAcademicaEnum,
  trabajoEnEquipo: z.number().int().min(1).max(5),
  comunicacion: z.number().int().min(1).max(5),
  horasEstudio: z.number().min(0).max(60),
});

export const updateProfileSchema = createProfileSchema.partial();
