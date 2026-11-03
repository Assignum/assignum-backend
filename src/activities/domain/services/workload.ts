import { ActivityTask, isCompleted } from '../entities/activity.entity';

export interface MemberLoad {
  activeHours: number;
  activeTasks: number;
  completedHours: number;
  completedTasks: number;
}

export const totalHours = (load: MemberLoad): number => load.activeHours + load.completedHours;

/**
 * Carga de trabajo (horas estimadas) por estudiante dentro de una actividad.
 * Las tareas ya completadas también cuentan, para que quien terminó antes no reciba más por ello.
 * `excludeTaskIds` permite ignorar las tareas que se van a repartir de nuevo.
 */
export const computeLoads = (
  tasks: ActivityTask[],
  emails: string[],
  excludeTaskIds: Set<string> = new Set(),
): Map<string, MemberLoad> => {
  const loads = new Map<string, MemberLoad>(
    emails.map((e) => [e, { activeHours: 0, activeTasks: 0, completedHours: 0, completedTasks: 0 }]),
  );
  for (const task of tasks) {
    if (!task.assignedToEmail || excludeTaskIds.has(task.id)) continue;
    const load = loads.get(task.assignedToEmail);
    if (!load) continue;
    const hours = task.estimatedHours || 1;
    if (isCompleted(task)) {
      load.completedHours += hours;
      load.completedTasks += 1;
    } else {
      load.activeHours += hours;
      load.activeTasks += 1;
    }
  }
  return loads;
};
