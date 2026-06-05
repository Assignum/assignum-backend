export type TaskStatus = 'Pendiente' | 'En Progreso' | 'Entregado' | 'Verificado';

export interface ActivityTask {
  id: string;
  name: string;
  assignedToEmail: string | null;
  status: TaskStatus;
  comments: string;
  files: string[];
  links: string[];
}

export interface Activity {
  id: string;
  uid: string;
  name: string;
  dueDate: string;
  documentLink: string | null;
  tasks: ActivityTask[];
  invitedEmails: string[];
  acceptedEmails: string[];
  memberNames: Record<string, string>;
  finalized: boolean;
}

export const computeProgress = (tasks: ActivityTask[]): number => {
  if (tasks.length === 0) return 0;
  const verified = tasks.filter((t) => t.status === 'Verificado').length;
  return (verified / tasks.length) * 100;
};
