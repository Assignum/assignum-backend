import { getRanking } from '@src/shared/infrastructure/ml/ml-recommend.service';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';

import { ActivityTask } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const assignTasks = async (
  repo: IActivityRepository,
  profileRepo: IUserProfileRepository,
  activityId: string,
  uid: string,
  leaderEmail: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can assign tasks', 403, 'FORBIDDEN');
  if (activity.tasks.length === 0) throw new AppError('No tasks to assign', 400, 'NO_TASKS');

  const allEmails = [leaderEmail, ...activity.acceptedEmails, ...activity.invitedEmails];
  const protectedSet = new Set([leaderEmail, ...activity.acceptedEmails]);

  // Fetch all member profiles in parallel
  const memberProfiles = await Promise.all(
    allEmails.map(async (email) => {
      const record = await profileRepo.findByEmail(email);
      const profile = record ? await profileRepo.findByUid(record.uid) : null;
      return { email, profile };
    }),
  );

  // Cupo justo por persona: cada uno recibe como máximo ceil(tareas / miembros)
  const unprotectedTasks = activity.tasks.filter(
    (t) => !(t.assignedToEmail && protectedSet.has(t.assignedToEmail)),
  );
  const quota = Math.ceil(unprotectedTasks.length / allEmails.length);
  const assignedCount = new Map<string, number>(allEmails.map((e) => [e, 0]));

  // Fallback round-robin index
  let fallbackIndex = 0;

  const updatedTasks: ActivityTask[] = [];

  for (const task of activity.tasks) {
    if (task.assignedToEmail && protectedSet.has(task.assignedToEmail)) {
      updatedTasks.push(task);
      continue;
    }

    try {
      const ranking = await getRanking(task, memberProfiles);

      // Recorrer el ranking hasta encontrar alguien con cupo disponible
      let assigned: string | null = null;
      for (const entry of ranking) {
        const count = assignedCount.get(entry.name) ?? 0;
        if (count < quota) {
          assigned = entry.name;
          assignedCount.set(entry.name, count + 1);
          break;
        }
      }

      // Si todos están al límite (tareas no divisibles exactamente), asignar al primero del ranking
      if (!assigned) {
        assigned = ranking[0].name;
        assignedCount.set(assigned, (assignedCount.get(assigned) ?? 0) + 1);
      }

      updatedTasks.push({ ...task, assignedToEmail: assigned });
    } catch {
      // Fallback a round-robin si el ML no responde
      const assignedEmail = allEmails[fallbackIndex % allEmails.length];
      fallbackIndex++;
      updatedTasks.push({ ...task, assignedToEmail: assignedEmail });
    }
  }

  await repo.update(activityId, { tasks: updatedTasks });
};
