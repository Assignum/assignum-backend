import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';
import { notifyEmail } from '@src/shared/infrastructure/notifications/notify.service';

import { IActivityRepository } from '../../domain/repositories/activity.repository';

/**
 * El líder cede el liderazgo a un miembro aceptado y pasa a ser miembro. Las tareas no
 * cambian de responsable. Permite, por ejemplo, que el líder elimine su cuenta.
 */
export const transferLeadership = async (
  repo: IActivityRepository,
  userRepo: IUserProfileRepository,
  activityId: string,
  leaderUid: string,
  leaderEmail: string,
  newLeaderEmail: string,
): Promise<void> => {
  const target = await userRepo.findByEmail(newLeaderEmail);
  if (!target) throw new AppError('User with that email does not exist', 404, 'USER_NOT_FOUND');
  const leaderProfile = await userRepo.findByUid(leaderUid);
  const leaderName = leaderProfile?.fullName || leaderEmail;

  const activityName = await repo.mutate(activityId, (activity) => {
    if (activity.uid !== leaderUid) throw new AppError('Only the leader can transfer the leadership', 403, 'FORBIDDEN');
    if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');
    if (!activity.acceptedEmails.includes(newLeaderEmail)) {
      throw new AppError('The new leader must be an accepted member', 400, 'NOT_A_MEMBER');
    }

    // El líder no va en memberNames: la app usa esa lista para reconocer a los miembros (y a
    // quienes ya salieron), así que si el nuevo líder quedara ahí se mostraría como "ya no está".
    const memberNames = { ...activity.memberNames, [leaderEmail]: leaderName };
    delete memberNames[newLeaderEmail];

    return {
      changes: {
        uid: target.uid,
        acceptedEmails: [...activity.acceptedEmails.filter((e) => e !== newLeaderEmail), leaderEmail],
        memberNames,
      },
      result: activity.name,
    };
  });

  await notifyEmail(newLeaderEmail, {
    type: 'leadership_transferred',
    activityId,
    title: 'Ahora eres líder',
    body: `${leaderName} te cedió el liderazgo de "${activityName}".`,
  });
};
