export type TaskStatus = 'Pendiente' | 'En Progreso' | 'Entregado' | 'Verificado';
export type TaskType = 'Backend' | 'Frontend' | 'Testing' | 'Database' | 'Documentation' | 'Management';
export type TaskComplexity = 'Low' | 'Medium' | 'High';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface ActivityTask {
  id: string;
  name: string;
  assignedToEmail: string | null;
  status: TaskStatus;
  comments: string;
  files: string[];
  links: string[];
  taskType: TaskType;
  taskComplexity: TaskComplexity;
  priority: TaskPriority;
  estimatedHours: number;
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

export interface ActivityResponse extends Activity {
  leaderName: string;
  memberNames: Record<string, string>;
}

export const computeProgress = (tasks: ActivityTask[]): number => {
  if (tasks.length === 0) return 0;
  const verified = tasks.filter((t) => t.status === 'Verificado').length;
  return (verified / tasks.length) * 100;
};
