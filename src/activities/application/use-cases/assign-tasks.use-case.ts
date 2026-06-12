import { AppError } from '@src/shared/errors/app-error';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

export const assignTasks = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  leaderEmail: string,
): Promise<void> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can assign tasks', 403, 'FORBIDDEN');
  if (activity.tasks.length === 0) throw new AppError('No tasks to assign', 400, 'NO_TASKS');

  // Leader is not in acceptedEmails/invitedEmails — add them first in the pool
  const allEmails = [leaderEmail, ...activity.acceptedEmails, ...activity.invitedEmails];

  // Protected set: tasks assigned to these emails are kept as-is
  const protectedSet = new Set([leaderEmail, ...activity.acceptedEmails]);

  let roundRobinIndex = 0;
  const updatedTasks = activity.tasks.map((task) => {
    if (task.assignedToEmail && protectedSet.has(task.assignedToEmail)) {
      return task;
    }
    const assignedEmail = allEmails[roundRobinIndex % allEmails.length];
    roundRobinIndex++;
    return { ...task, assignedToEmail: assignedEmail };
  });

  await repo.update(activityId, { tasks: updatedTasks });
};
