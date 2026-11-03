export type TaskStatus = 'Pendiente' | 'En Progreso' | 'Entregado' | 'Verificado';
export type TaskType = 'Backend' | 'Frontend' | 'Testing' | 'Database' | 'Documentation' | 'Management';
export type TaskComplexity = 'Low' | 'Medium' | 'High';
export type TaskPriority = 'Low' | 'Medium' | 'High';
/**
 * Cómo se hizo el último reparto: con el ranking del servicio ML, con el criterio de
 * contingencia porque el ML no respondió (round-robin o menor carga), o a mano por el líder.
 */
export type AssignmentMode = 'ml' | 'fallback' | 'manual';

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
  /** Recordatorios de fecha límite ya enviados, como `${dueDate}:${email}` (evita repetirlos). */
  dueRemindersSent?: string[];
  /** Ver `AssignmentMode`. Con 'fallback' la app avisa al líder que puede redistribuir con el ML. */
  assignmentMode?: AssignmentMode;
  assignmentModeAt?: string;
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

/** Tareas cuyo trabajo ya está hecho: no se redistribuyen ni se reasignan, pero cuentan como carga previa. */
export const COMPLETED_STATUSES: TaskStatus[] = ['Entregado', 'Verificado'];

export const isCompleted = (task: ActivityTask): boolean => COMPLETED_STATUSES.includes(task.status);

/** Líder + miembros aceptados + invitaciones pendientes. */
export const groupEmails = (activity: Activity, leaderEmail: string): string[] => [
  leaderEmail,
  ...activity.acceptedEmails,
  ...activity.invitedEmails,
];

/**
 * Deja sin asignar las tareas no completadas de `email` (cuando sale del grupo o rechaza la
 * invitación). Las completadas se conservan a su nombre como historial.
 */
export const unassignOpenTasks = (
  tasks: ActivityTask[],
  email: string,
): { tasks: ActivityTask[]; unassigned: ActivityTask[] } => {
  const unassigned: ActivityTask[] = [];
  const updated = tasks.map((t) => {
    if (t.assignedToEmail !== email || isCompleted(t)) return t;
    const task: ActivityTask = { ...t, assignedToEmail: null, status: 'Pendiente' };
    unassigned.push(task);
    return task;
  });
  return { tasks: updated, unassigned };
};
