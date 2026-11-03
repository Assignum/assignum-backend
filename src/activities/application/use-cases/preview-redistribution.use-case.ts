import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';

import { groupEmails, isCompleted } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';
import { computeLoads, totalHours } from '../../domain/services/workload';
import {
  fetchMemberProfiles,
  proposeBalancedAssignments,
  BalancedProposal,
} from '../services/balanced-assignment';

export interface RedistributionPreviewDto {
  taskIds: string[];
  memberEmails: string[];
}

/**
 * Calcula (sin guardar) cómo quedarían repartidas las tareas elegidas entre los estudiantes
 * elegidos. El líder revisa la propuesta, la ajusta a mano si quiere y la confirma con
 * `applyAssignments`.
 */
export const previewRedistribution = async (
  repo: IActivityRepository,
  profileRepo: IUserProfileRepository,
  activityId: string,
  uid: string,
  leaderEmail: string,
  dto: RedistributionPreviewDto,
): Promise<BalancedProposal> => {
  const activity = await repo.findById(activityId);
  if (!activity) throw new AppError('Activity not found', 404, 'NOT_FOUND');
  if (activity.uid !== uid) throw new AppError('Only the leader can redistribute tasks', 403, 'FORBIDDEN');
  if (activity.finalized) throw new AppError('Activity is already finalized', 400, 'ACTIVITY_FINALIZED');

  const group = new Set(groupEmails(activity, leaderEmail));
  const members = [...new Set(dto.memberEmails)];
  const notInGroup = members.filter((e) => !group.has(e));
  if (notInGroup.length) {
    throw new AppError(`Not members of this activity: ${notInGroup.join(', ')}`, 400, 'NOT_A_MEMBER');
  }

  const wanted = new Set(dto.taskIds);
  const tasks = activity.tasks.filter((t) => wanted.has(t.id));
  if (tasks.length !== wanted.size) throw new AppError('Task not found', 404, 'NOT_FOUND');
  if (tasks.some(isCompleted)) {
    throw new AppError('Completed tasks cannot be redistributed', 400, 'TASK_COMPLETED');
  }

  // Carga previa de cada estudiante sin contar las tareas que se van a repartir
  const loads = computeLoads(activity.tasks, members, wanted);
  const baseHours = new Map(members.map((e) => [e, totalHours(loads.get(e)!)]));
  const profiles = await fetchMemberProfiles(profileRepo, members);

  return proposeBalancedAssignments(tasks, members, baseHours, profiles);
};
