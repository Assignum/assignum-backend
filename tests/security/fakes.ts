import { Activity, ActivityTask } from '@src/activities/domain/entities/activity.entity';
import { ActivityMutation, IActivityRepository } from '@src/activities/domain/repositories/activity.repository';
import { PartialUserProfile, UserProfile } from '@src/iam/domain/entities/user-profile.entity';
import { IUserProfileRepository } from '@src/iam/domain/repositories/user-profile.repository';
import { AppError } from '@src/shared/errors/app-error';

export const LEADER = { uid: 'leader-uid', email: 'leader@upc.edu.pe' };
export const MEMBER = { uid: 'member-uid', email: 'member@upc.edu.pe' };
export const OUTSIDER = { uid: 'outsider-uid', email: 'outsider@upc.edu.pe' };

export const makeTask = (id: string, overrides: Partial<ActivityTask> = {}): ActivityTask => ({
  id,
  name: `Tarea ${id}`,
  assignedToEmail: null,
  status: 'Pendiente',
  comments: '',
  files: [],
  links: [],
  taskType: 'Backend',
  taskComplexity: 'Medium',
  priority: 'Medium',
  estimatedHours: 4,
  ...overrides,
});

export const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'act-1',
  uid: LEADER.uid,
  name: 'Proyecto final',
  dueDate: '2026-12-01',
  documentLink: null,
  tasks: [makeTask('t1'), makeTask('t2'), makeTask('t3')],
  invitedEmails: [],
  acceptedEmails: [MEMBER.email],
  memberNames: { [MEMBER.email]: 'Miembro' },
  finalized: false,
  ...overrides,
});

/** Repositorio en memoria con la misma semántica que el de Firestore (incluida `mutate`). */
export class InMemoryActivityRepository implements IActivityRepository {
  readonly store = new Map<string, Activity>();

  constructor(...activities: Activity[]) {
    activities.forEach((a) => this.store.set(a.id, structuredClone(a)));
  }

  async findById(id: string) {
    const a = this.store.get(id);
    return a ? structuredClone(a) : null;
  }
  async findByUserContext(uid: string, email: string) {
    return [...this.store.values()].filter((a) => a.uid === uid || a.acceptedEmails.includes(email));
  }
  async findByInvitedEmail(email: string) {
    return [...this.store.values()].filter((a) => a.invitedEmails.includes(email));
  }
  async findOpen() {
    return [...this.store.values()].filter((a) => !a.finalized);
  }
  async create(activity: Activity) {
    this.store.set(activity.id, structuredClone(activity));
  }
  async update(id: string, data: Partial<Activity>) {
    this.store.set(id, { ...this.store.get(id)!, ...data });
  }
  async mutate<T>(id: string, fn: ActivityMutation<T>): Promise<T> {
    const current = this.store.get(id);
    if (!current) throw new AppError('Activity not found', 404, 'NOT_FOUND');
    const { changes, result } = fn(structuredClone(current));
    if (changes) this.store.set(id, { ...current, ...changes });
    return result;
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  readonly profiles = new Map<string, Partial<UserProfile>>();
  readonly deleted: string[] = [];

  async findByUid(uid: string) {
    const p = this.profiles.get(uid);
    return p ? ({ uid, ...p } as UserProfile) : null;
  }
  async findByEmail(email: string) {
    return { uid: email, email };
  }
  async createEmpty(uid: string, email: string) {
    this.profiles.set(uid, { email });
  }
  async save(uid: string, data: PartialUserProfile) {
    this.profiles.set(uid, { ...data });
  }
  async merge(uid: string, data: PartialUserProfile) {
    this.profiles.set(uid, { ...this.profiles.get(uid), ...data });
  }
  async deleteAccount(uid: string) {
    this.profiles.delete(uid);
    this.deleted.push(uid);
  }
}
