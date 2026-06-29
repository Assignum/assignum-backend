import { recommendStudent } from '@src/shared/infrastructure/ml/ml-recommend.service';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';

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

  // Fetch all member profiles in parallel (email → uid → profile)
  const memberProfiles = await Promise.all(
    allEmails.map(async (email) => {
      const record = await profileRepo.findByEmail(email);
      const profile = record ? await profileRepo.findByUid(record.uid) : null;
      return { email, profile };
    }),
  );

  // Round-robin index used only as fallback if ML service fails
  let fallbackIndex = 0;

  const updatedTasks = await Promise.all(
    activity.tasks.map(async (task) => {
      if (task.assignedToEmail && protectedSet.has(task.assignedToEmail)) {
        return task;
      }

      try {
        const recommendedEmail = await recommendStudent(task, memberProfiles);
        return { ...task, assignedToEmail: recommendedEmail };
      } catch {
        // Fallback to round-robin if ML service is unreachable
        const assignedEmail = allEmails[fallbackIndex % allEmails.length];
        fallbackIndex++;
        return { ...task, assignedToEmail: assignedEmail };
      }
    }),
  );

  await repo.update(activityId, { tasks: updatedTasks });
};
