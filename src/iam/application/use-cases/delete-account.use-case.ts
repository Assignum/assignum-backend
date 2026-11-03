import { unassignOpenTasks } from '@src/activities/domain/entities/activity.entity';
import { IActivityRepository } from '@src/activities/domain/repositories/activity.repository';
import { AppError } from '@src/shared/errors/app-error';

import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';

/**
 * Derecho de cancelación: elimina la cuenta del usuario y sus datos personales.
 *
 * - Si lidera actividades sin finalizar, no se borra nada: debe finalizarlas o eliminarlas
 *   antes (la app aún no permite transferir el liderazgo). Las actividades finalizadas que
 *   lideró se conservan para el historial de los demás miembros; solo guardan su uid.
 * - En las actividades donde es miembro o invitado se le quita del grupo y se borra su
 *   nombre. Sus tareas pendientes quedan sin asignar para que el líder las redistribuya y
 *   las completadas dejan de estar a su nombre.
 * - Por último se borran su perfil, historial de chat, avisos y la cuenta de Firebase Auth.
 */
export const deleteAccount = async (
  activityRepo: IActivityRepository,
  profileRepo: IUserProfileRepository,
  uid: string,
  email: string,
): Promise<void> => {
  const [ownActivities, invitations] = await Promise.all([
    activityRepo.findByUserContext(uid, email),
    activityRepo.findByInvitedEmail(email),
  ]);

  const activeLed = ownActivities.filter((a) => a.uid === uid && !a.finalized);
  if (activeLed.length) {
    throw new AppError(
      `Finalize or delete the activities you lead before deleting your account: ${activeLed
        .map((a) => a.name)
        .join(', ')}`,
      409,
      'LEADS_ACTIVE_ACTIVITIES',
    );
  }

  const memberships = new Map(
    [...ownActivities, ...invitations].filter((a) => a.uid !== uid).map((a) => [a.id, a]),
  );

  for (const activityId of memberships.keys()) {
    await activityRepo.mutate(activityId, (activity) => {
      const { tasks } = unassignOpenTasks(activity.tasks, email);
      const memberNames = { ...activity.memberNames };
      delete memberNames[email];
      return {
        changes: {
          acceptedEmails: activity.acceptedEmails.filter((e) => e !== email),
          invitedEmails: activity.invitedEmails.filter((e) => e !== email),
          memberNames,
          tasks: tasks.map((t) => (t.assignedToEmail === email ? { ...t, assignedToEmail: null } : t)),
        },
        result: undefined,
      };
    });
  }

  await profileRepo.deleteAccount(uid, email);
};
