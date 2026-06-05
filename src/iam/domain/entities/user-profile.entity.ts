export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  birthDate: string | null;
  disponibilidad: 'Mañana' | 'Tarde' | 'Noche' | 'Fin de semana';
  cargaAcademica: 'Ligera' | 'Media' | 'Alta';
  trabajoEnEquipo: number;
  comunicacion: number;
  horasEstudio: number;
}

export type PartialUserProfile = Partial<Omit<UserProfile, 'uid' | 'email'>>;
