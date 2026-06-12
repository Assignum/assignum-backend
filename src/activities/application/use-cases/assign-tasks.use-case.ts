import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const assignTasks = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can assign tasks', 403, 'FORBIDDEN');
  if (activity.tasks.length === 0) throw new AppError('No tasks to assign', 400, 'NO_TASKS');

  const allEmails = [...activity.acceptedEmails, ...activity.invitedEmails];
  if (allEmails.length === 0) throw new AppError('No members (accepted or invited) to assign tasks to', 400, 'NO_MEMBERS');

  const acceptedSet = new Set(activity.acceptedEmails);

  // Tasks already owned by an accepted member are preserved.
  // Unassigned tasks and tasks pre-assigned to invited-only members
  // are redistributed round-robin over the full pool.
  let roundRobinIndex = 0;
  const updatedTasks = activity.tasks.map((task) => {
    if (task.assignedToEmail && acceptedSet.has(task.assignedToEmail)) {
      return task;
    }
    const assignedEmail = allEmails[roundRobinIndex % allEmails.length];
    roundRobinIndex++;
    return { ...task, assignedToEmail: assignedEmail };
  });

  await repo.update(activityId, { tasks: updatedTasks });
};
