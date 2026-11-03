import { beforeEach, describe, expect, it, vi } from 'vitest';

import { proposeBalancedAssignments } from '@src/activities/application/services/balanced-assignment';
import { editTask } from '@src/activities/application/use-cases/edit-task.use-case';
import { leaveActivity } from '@src/activities/application/use-cases/leave-activity.use-case';
import { sendDueReminders } from '@src/activities/application/use-cases/send-due-reminders.use-case';
import { transferLeadership } from '@src/activities/application/use-cases/transfer-leadership.use-case';
import { updateActivity } from '@src/activities/application/use-cases/update-activity.use-case';
import { getRanking } from '@src/shared/infrastructure/ml/ml-recommend.service';
import { notifyEmail, notifyUid } from '@src/shared/infrastructure/notifications/notify.service';
import { rateLimit } from '@src/shared/middleware/rate-limit.middleware';

import {
  InMemoryActivityRepository,
  InMemoryUserProfileRepository,
  LEADER,
  makeActivity,
  makeTask,
  MEMBER,
  OUTSIDER,
} from './fakes';

const mockedRanking = vi.mocked(getRanking);

let repo: InMemoryActivityRepository;
let profiles: InMemoryUserProfileRepository;

beforeEach(() => {
  vi.clearAllMocks();
  repo = new InMemoryActivityRepository(makeActivity());
  profiles = new InMemoryUserProfileRepository();
});

describe('Reparto equilibrado por carga', () => {
  const ranking = (names: string[]) =>
    names.map((name, i) => ({ name, success_probability: 1 - i / 10, prediction: '', rank: i + 1 }));

  it('no carga más a quien ya completó trabajo aunque el ML lo prefiera', async () => {
    // El ML siempre prefiere a "ana", que ya hizo 10 h
    mockedRanking.mockResolvedValue(ranking(['ana', 'beto', 'caro']));
    const tasks = [makeTask('n1', { estimatedHours: 5 }), makeTask('n2', { estimatedHours: 2 }),
      makeTask('d1', { estimatedHours: 3 }), makeTask('d2', { estimatedHours: 3 })];
    const base = new Map([['ana', 10], ['beto', 4], ['caro', 0]]);

    const { assignments, mode } = await proposeBalancedAssignments(tasks, ['ana', 'beto', 'caro'], base,
      [{ email: 'ana', profile: null }, { email: 'beto', profile: null }, { email: 'caro', profile: null }]);

    expect(mode).toBe('ml');
    expect(assignments.map((a) => a.assignedToEmail)).not.toContain('ana');
    const final = new Map(base);
    for (const a of assignments) {
      const hours = tasks.find((t) => t.id === a.taskId)!.estimatedHours;
      final.set(a.assignedToEmail, final.get(a.assignedToEmail)! + hours);
    }
    // Objetivo = (14 + 13) / 3 = 9 h: nadie queda muy por encima
    expect(Math.max(...final.values()) - Math.min(...final.values())).toBeLessThanOrEqual(2);
  });

  it('solo asigna a los candidatos elegidos y sin ML reparte por menor carga', async () => {
    mockedRanking.mockRejectedValue(new Error('ML down'));
    const tasks = [makeTask('a', { estimatedHours: 4 }), makeTask('b', { estimatedHours: 4 })];

    const { assignments, mode } = await proposeBalancedAssignments(tasks, ['beto', 'caro'],
      new Map([['beto', 0], ['caro', 0]]), []);

    expect(mode).toBe('fallback');
    expect(new Set(assignments.map((a) => a.assignedToEmail))).toEqual(new Set(['beto', 'caro']));
  });
});

describe('Editar la actividad', () => {
  it('cambiar la fecha límite avisa a los miembros', async () => {
    await updateActivity(repo, 'act-1', LEADER.uid, { dueDate: '2026-12-15' });
    expect((await repo.findById('act-1'))!.dueDate).toBe('2026-12-15');
    expect(notifyEmail).toHaveBeenCalledWith(MEMBER.email, expect.objectContaining({ type: 'due_date_changed' }));
  });

  it('cambiar solo el nombre no avisa', async () => {
    await updateActivity(repo, 'act-1', LEADER.uid, { name: 'Nuevo nombre' });
    expect(notifyEmail).not.toHaveBeenCalled();
  });

  it('un miembro no puede editarla', async () => {
    await expect(updateActivity(repo, 'act-1', MEMBER.uid, { name: 'x' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('no se edita una actividad finalizada', async () => {
    repo = new InMemoryActivityRepository(makeActivity({ finalized: true }));
    await expect(updateActivity(repo, 'act-1', LEADER.uid, { name: 'x' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Editar la definición de una tarea', () => {
  it('el líder cambia nombre y horas sin tocar el avance', async () => {
    repo = new InMemoryActivityRepository(makeActivity({
      tasks: [makeTask('t1', { status: 'En Progreso', assignedToEmail: MEMBER.email, comments: 'avance' })],
    }));
    await editTask(repo, 'act-1', 't1', LEADER.uid, { name: 'Renombrada', estimatedHours: 8 });
    const task = (await repo.findById('act-1'))!.tasks[0];
    expect(task).toMatchObject({ name: 'Renombrada', estimatedHours: 8, status: 'En Progreso', comments: 'avance' });
  });

  it('un miembro recibe 403', async () => {
    await expect(editTask(repo, 'act-1', 't1', MEMBER.uid, { name: 'x' })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('Salir de una actividad', () => {
  it('el miembro sale, sus tareas abiertas quedan sin asignar y se avisa al líder', async () => {
    repo = new InMemoryActivityRepository(makeActivity({
      tasks: [
        makeTask('t1', { assignedToEmail: MEMBER.email }),
        makeTask('t2', { assignedToEmail: MEMBER.email, status: 'Verificado' }),
      ],
    }));
    await leaveActivity(repo, 'act-1', MEMBER.uid, MEMBER.email);

    const activity = (await repo.findById('act-1'))!;
    expect(activity.acceptedEmails).not.toContain(MEMBER.email);
    expect(activity.tasks[0].assignedToEmail).toBeNull();
    expect(activity.tasks[1].assignedToEmail).toBe(MEMBER.email);
    expect(notifyUid).toHaveBeenCalledWith(LEADER.uid, expect.objectContaining({ type: 'member_left' }));
  });

  it('el líder no puede salir sin ceder el liderazgo', async () => {
    await expect(leaveActivity(repo, 'act-1', LEADER.uid, LEADER.email)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('alguien que no es miembro recibe 404', async () => {
    await expect(leaveActivity(repo, 'act-1', OUTSIDER.uid, OUTSIDER.email)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('Transferir el liderazgo', () => {
  it('el miembro pasa a ser líder y el líder anterior queda como miembro', async () => {
    profiles.profiles.set(LEADER.uid, { fullName: 'Líder Original' });
    await transferLeadership(repo, profiles, 'act-1', LEADER.uid, LEADER.email, MEMBER.email);

    const activity = (await repo.findById('act-1'))!;
    // El fake de perfiles usa el correo como uid
    expect(activity.uid).toBe(MEMBER.email);
    expect(activity.acceptedEmails).toEqual([LEADER.email]);
    expect(activity.memberNames[LEADER.email]).toBe('Líder Original');
    // El nuevo líder sale de memberNames (si no, la app lo mostraría como "ya no está")
    expect(activity.memberNames[MEMBER.email]).toBeUndefined();
    expect(notifyEmail).toHaveBeenCalledWith(MEMBER.email, expect.objectContaining({ type: 'leadership_transferred' }));
  });

  it('solo se puede ceder a un miembro aceptado', async () => {
    await expect(transferLeadership(repo, profiles, 'act-1', LEADER.uid, LEADER.email, OUTSIDER.email))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('un miembro no puede transferir el liderazgo', async () => {
    await expect(transferLeadership(repo, profiles, 'act-1', MEMBER.uid, MEMBER.email, MEMBER.email))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('Recordatorio de fecha límite', () => {
  const remind = async (dueDate: string, nowIso: string) => {
    repo = new InMemoryActivityRepository(makeActivity({
      dueDate,
      tasks: [makeTask('t1', { assignedToEmail: MEMBER.email })],
    }));
    await sendDueReminders(repo, new Date(nowIso));
    return vi.mocked(notifyEmail).mock.calls.map(([, payload]) => payload.title);
  };

  it('dice "vence mañana" según el día en Perú, aunque en UTC ya sea otro día', async () => {
    // 3 nov 19:28 en Lima = 4 nov 00:28 UTC
    expect(await remind('2026-11-04', '2026-11-04T00:28:00Z')).toEqual(['"Proyecto final" vence mañana']);
  });

  it('dice "vence en 2 días" y "vence hoy" en los extremos de la ventana', async () => {
    expect(await remind('2026-11-05', '2026-11-03T15:00:00Z')).toEqual(['"Proyecto final" vence en 2 días']);
    vi.clearAllMocks();
    expect(await remind('2026-11-03', '2026-11-03T15:00:00Z')).toEqual(['"Proyecto final" vence hoy']);
  });

  it('no avisa con más de 2 días de anticipación ni si la fecha ya pasó', async () => {
    expect(await remind('2026-11-06', '2026-11-03T15:00:00Z')).toEqual([]);
    expect(await remind('2026-11-02', '2026-11-03T15:00:00Z')).toEqual([]);
  });
});

describe('Límite de solicitudes', () => {
  it('responde 429 al superar el máximo dentro de la ventana', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2, key: () => 'mismo-usuario' });
    const res = { setHeader: vi.fn() };
    const results: unknown[] = [];
    for (let i = 0; i < 3; i++) limiter({} as never, res as never, (err?: unknown) => results.push(err));

    expect(results[0]).toBeUndefined();
    expect(results[1]).toBeUndefined();
    expect(results[2]).toMatchObject({ statusCode: 429 });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});
