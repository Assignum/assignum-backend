import { AppError } from '@src/shared/errors/app-error';
import { notifyEmail } from '@src/shared/infrastructure/notifications/notify.service';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

interface UpdateActivityDto {
  name?: string;
  dueDate?: string;
  documentLink?: string | null;
}

export const updateActivity = async (
  repo: IActivityRepository,
  activityId: string,
  uid: string,
  dto: UpdateActivityDto,
): Promise<void> => {
  const { before, after } = await repo.mutate(activityId, (activity) => {
    if (activity.uid !== uid) throw new AppError('Only the leader can update this activity', 403, 'FORBIDDEN');
    if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');

    const updates: UpdateActivityDto = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.dueDate !== undefined) updates.dueDate = dto.dueDate;
    if (dto.documentLink !== undefined) updates.documentLink = dto.documentLink;

    return {
      changes: Object.keys(updates).length ? updates : null,
      result: { before: activity, after: { ...activity, ...updates } },
    };
  });

  // Si cambió la fecha límite, avisar a los miembros (los recordatorios se recalculan solos)
  if (after.dueDate !== before.dueDate) {
    await Promise.all(
      before.acceptedEmails.map((email) =>
        notifyEmail(email, {
          type: 'due_date_changed',
          activityId,
          title: 'Cambió la fecha límite',
          body: `"${after.name}" ahora vence el ${after.dueDate} (antes: ${before.dueDate}).`,
        }),
      ),
    );
  }
};
