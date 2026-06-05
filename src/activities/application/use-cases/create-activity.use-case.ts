import { v4 as uuidv4 } from 'uuid';

import { Activity, ActivityTask } from '../../domain/entities/activity.entity';
import { IActivityRepository } from '../../domain/repositories/activity.repository';

interface CreateActivityDto {
  name: string;
  dueDate: string;
  documentLink?: string | null;
  tasks?: { name: string }[];
}

export const createActivity = async (
  repo: IActivityRepository,
  uid: string,
  dto: CreateActivityDto,
): Promise<Activity> => {
  const tasks: ActivityTask[] = (dto.tasks ?? []).map((t) => ({
    id: uuidv4(),
    name: t.name,
    assignedToEmail: null,
    status: 'Pendiente',
    comments: '',
    files: [],
    links: [],
  }));

  const activity: Activity = {
    id: uuidv4(),
    uid,
    name: dto.name,
    dueDate: dto.dueDate,
    documentLink: dto.documentLink ?? null,
    tasks,
    invitedEmails: [],
    acceptedEmails: [],
    memberNames: {},
    finalized: false,
  };

  await repo.create(activity);
  return activity;
};
