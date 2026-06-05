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

  const emails = activity.acceptedEmails;
  if (emails.length === 0) throw new AppError('No accepted members to assign tasks to', 400, 'NO_MEMBERS');
  if (activity.tasks.length === 0) throw new AppError('No tasks to assign', 400, 'NO_TASKS');

  const updatedTasks = activity.tasks.map((task, index) => ({
    ...task,
    assignedToEmail: emails[index % emails.length],
  }));

  await repo.update(activityId, { tasks: updatedTasks });
};
