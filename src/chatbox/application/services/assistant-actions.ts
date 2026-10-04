import { addTasks } from '@src/activities/application/use-cases/add-tasks.use-case';
import { Activity, ActivityTask, computeProgress } from '@src/activities/domain/entities/activity.entity';
import { IActivityRepository } from '@src/activities/domain/repositories/activity.repository';

import { CluEntity } from '../../infrastructure/services/clu.service';

export interface AssistantContext {
  activityRepo: IActivityRepository;
  uid: string;
  email: string;
}

type ActionHandler = (ctx: AssistantContext, entities: CluEntity[], message: string) => Promise<string>;

// Defaults for tasks created from chat; the leader can edit them later in the app.
const CHAT_TASK_DEFAULTS = {
  taskType: 'Management',
  taskComplexity: 'Medium',
  priority: 'Medium',
  estimatedHours: 2,
} as const;

// CLU sometimes reads "ayúdame con mi tarea de X" as CrearTarea; only write data on an explicit verb.
const CREATE_VERB = /\b(agreg|anad|crea|cree|crear|nuev|registr|pon|met[ae]|inclu|sum[ae])/;

const OPEN_STATUSES: ActivityTask['status'][] = ['Pendiente', 'En Progreso'];

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,"']/g, '')
    .trim();

const entityText = (entities: CluEntity[], category: string): string | undefined =>
  entities.find((e) => e.category === category)?.text.trim() || undefined;

const listNames = (activities: Activity[]): string => activities.map((a) => `"${a.name}"`).join(', ');

/** Exact match first, then partial match in either direction ("física" ~ "Proyecto de Física"). */
const matchActivities = (activities: Activity[], name: string): Activity[] => {
  const wanted = normalize(name);
  const exact = activities.filter((a) => normalize(a.name) === wanted);
  if (exact.length) return exact;
  return activities.filter((a) => {
    const current = normalize(a.name);
    return current.includes(wanted) || wanted.includes(current);
  });
};

const getActiveActivities = async (ctx: AssistantContext): Promise<Activity[]> => {
  const activities = await ctx.activityRepo.findByUserContext(ctx.uid, ctx.email);
  return activities.filter((a) => !a.finalized);
};

const describeActivity = (activity: Activity): string => {
  const { tasks } = activity;
  const count = (status: ActivityTask['status']) => tasks.filter((t) => t.status === status).length;
  const progress = Math.round(computeProgress(tasks));
  return [
    `"${activity.name}" lleva ${progress}% de avance (${count('Verificado')} de ${tasks.length} tareas verificadas).`,
    `Pendientes: ${count('Pendiente')} · En progreso: ${count('En Progreso')} · Entregadas: ${count('Entregado')}.`,
    `Fecha de entrega: ${activity.dueDate}.`,
  ].join('\n');
};

const pendingTasks: ActionHandler = async (ctx, entities) => {
  let activities = await getActiveActivities(ctx);
  const activityName = entityText(entities, 'NombreActividad');
  if (activityName) {
    activities = matchActivities(activities, activityName);
    if (!activities.length) return `No encontré una actividad activa llamada "${activityName}".`;
  }

  const email = ctx.email.toLowerCase();
  const lines = activities.flatMap((activity) =>
    activity.tasks
      .filter((t) => t.assignedToEmail?.toLowerCase() === email && OPEN_STATUSES.includes(t.status))
      .map((t) => `• ${t.name} (${t.status}) — ${activity.name}, entrega ${activity.dueDate}`),
  );

  if (!lines.length) {
    return activityName
      ? `No tienes tareas pendientes en "${activities[0].name}".`
      : 'No tienes tareas pendientes. ¡Buen trabajo!';
  }
  return `Tienes ${lines.length} tarea(s) pendiente(s):\n${lines.join('\n')}`;
};

const activityStatus: ActionHandler = async (ctx, entities) => {
  const activities = await getActiveActivities(ctx);
  if (!activities.length) return 'No tienes actividades activas en este momento.';

  const activityName = entityText(entities, 'NombreActividad');
  if (!activityName) {
    if (activities.length === 1) return describeActivity(activities[0]);
    const summary = activities.map(
      (a) => `• ${a.name}: ${Math.round(computeProgress(a.tasks))}% — entrega ${a.dueDate}`,
    );
    return `Estas son tus actividades activas:\n${summary.join('\n')}\nPregúntame por una en particular para ver más detalle.`;
  }

  const matches = matchActivities(activities, activityName);
  if (!matches.length) {
    return `No encontré una actividad activa llamada "${activityName}". Tus actividades son: ${listNames(activities)}.`;
  }
  if (matches.length > 1) return `Encontré varias actividades parecidas: ${listNames(matches)}. ¿Cuál de ellas?`;
  return describeActivity(matches[0]);
};

const createTask: ActionHandler = async (ctx, entities, message) => {
  if (!CREATE_VERB.test(normalize(message))) {
    return 'Si quieres que cree una tarea, pídemelo así: "agrega la tarea hacer diapositivas a Proyecto de Física".';
  }

  const taskName = entityText(entities, 'NombreTarea');
  if (!taskName) {
    return 'No entendí el nombre de la tarea. Escríbelo así: "agrega la tarea hacer diapositivas a Proyecto de Física".';
  }

  const activities = await getActiveActivities(ctx);
  const led = activities.filter((a) => a.uid === ctx.uid);
  const activityName = entityText(entities, 'NombreActividad');

  let target: Activity;
  if (!activityName) {
    if (!led.length) return 'Solo el líder de una actividad puede agregar tareas, y no lideras ninguna actividad activa.';
    if (led.length > 1) {
      return `¿En qué actividad agrego "${taskName}"? Lideras: ${listNames(led)}. Por ejemplo: "agrega la tarea ${taskName} a ${led[0].name}".`;
    }
    target = led[0];
  } else {
    const matches = matchActivities(activities, activityName);
    if (!matches.length) {
      return `No encontré una actividad activa llamada "${activityName}".${activities.length ? ` Tus actividades son: ${listNames(activities)}.` : ''}`;
    }
    if (matches.length > 1) return `Encontré varias actividades parecidas: ${listNames(matches)}. ¿En cuál agrego la tarea?`;
    target = matches[0];
    if (target.uid !== ctx.uid) return `Solo el líder de "${target.name}" puede agregar tareas.`;
  }

  await addTasks(ctx.activityRepo, target.id, ctx.uid, [{ name: taskName, ...CHAT_TASK_DEFAULTS }]);
  return `Listo, agregué la tarea "${taskName}" a "${target.name}" (sin asignar, prioridad media, 2 h estimadas). Puedes editarla o asignarla desde la actividad.`;
};

const actions: Record<string, ActionHandler> = {
  CrearTarea: createTask,
  TareasPendientes: pendingTasks,
  EstadoActividad: activityStatus,
};

/** Runs the action for an intent, or returns null if the intent is not an action. */
export const runAssistantAction = async (
  intent: string,
  ctx: AssistantContext,
  entities: CluEntity[],
  message: string,
): Promise<string | null> => {
  const handler = actions[intent];
  return handler ? handler(ctx, entities, message) : null;
};
