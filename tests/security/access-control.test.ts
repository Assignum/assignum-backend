import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyAssignments } from '@src/activities/application/use-cases/apply-assignments.use-case';
import { assignTasks } from '@src/activities/application/use-cases/assign-tasks.use-case';
import { getActivity } from '@src/activities/application/use-cases/get-activity.use-case';
import { previewRedistribution } from '@src/activities/application/use-cases/preview-redistribution.use-case';
import { updateTask } from '@src/activities/application/use-cases/update-task.use-case';
import { deleteAccount } from '@src/iam/application/use-cases/delete-account.use-case';
import { createProfile, updateProfile } from '@src/iam/application/use-cases/upsert-profile.use-case';
import { CURRENT_PRIVACY_POLICY_VERSION } from '@src/iam/domain/entities/privacy-policy';
import { getRanking } from '@src/shared/infrastructure/ml/ml-recommend.service';
import { maskEmail, maskEmailsIn } from '@src/shared/privacy/mask';

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

describe('Acceso a actividades', () => {
  it('un usuario que no es miembro recibe 403 al consultar la actividad', async () => {
    await expect(getActivity(repo, profiles, 'act-1', OUTSIDER.uid, OUTSIDER.email)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('un miembro solo ve sus propias tareas', async () => {
    await repo.update('act-1', {
      tasks: [makeTask('t1', { assignedToEmail: MEMBER.email }), makeTask('t2', { assignedToEmail: LEADER.email })],
    });
    const activity = await getActivity(repo, profiles, 'act-1', MEMBER.uid, MEMBER.email);
    expect(activity.tasks.map((t) => t.id)).toEqual(['t1']);
  });
});

describe('Acciones reservadas al líder', () => {
  it('un miembro que no es líder recibe 403 al pedir una redistribución', async () => {
    await expect(
      previewRedistribution(repo, profiles, 'act-1', MEMBER.uid, MEMBER.email, {
        taskIds: ['t1'],
        memberEmails: [MEMBER.email],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('un miembro que no es líder recibe 403 al reasignar tareas', async () => {
    await expect(
      applyAssignments(repo, 'act-1', MEMBER.uid, MEMBER.email, [{ taskId: 't1', assignedToEmail: MEMBER.email }]),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect((await repo.findById('act-1'))!.tasks[0].assignedToEmail).toBeNull();
  });

  it('un miembro que no es líder recibe 403 al ejecutar el reparto automático', async () => {
    await expect(assignTasks(repo, profiles, 'act-1', MEMBER.uid, MEMBER.email)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('un miembro recibe 403 al editar una tarea que no es suya', async () => {
    await repo.update('act-1', { tasks: [makeTask('t1', { assignedToEmail: LEADER.email })] });
    await expect(
      updateTask(repo, 'act-1', 't1', MEMBER.uid, MEMBER.email, { comments: 'cambio' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('Contingencia cuando el servicio ML no responde', () => {
  it('el reparto usa round-robin, no falla y queda marcado como fallback', async () => {
    mockedRanking.mockRejectedValue(new Error('ML service unavailable'));

    const mode = await assignTasks(repo, profiles, 'act-1', LEADER.uid, LEADER.email);

    const activity = (await repo.findById('act-1'))!;
    expect(mode).toBe('fallback');
    expect(activity.assignmentMode).toBe('fallback');
    // Round-robin sobre [líder, miembro]: t1 → líder, t2 → miembro, t3 → líder
    expect(activity.tasks.map((t) => t.assignedToEmail)).toEqual([LEADER.email, MEMBER.email, LEADER.email]);
  });

  it('con el ML disponible el reparto queda marcado como ml', async () => {
    mockedRanking.mockImplementation(async (_task, members) =>
      members.map((m, i) => ({ name: m.email, success_probability: 0.9 - i * 0.1, prediction: 'success', rank: i + 1 })),
    );

    const mode = await assignTasks(repo, profiles, 'act-1', LEADER.uid, LEADER.email);

    expect(mode).toBe('ml');
    expect((await repo.findById('act-1'))!.assignmentMode).toBe('ml');
  });

  it('la vista previa de redistribución informa el modo fallback', async () => {
    mockedRanking.mockRejectedValue(new Error('timeout'));
    const preview = await previewRedistribution(repo, profiles, 'act-1', LEADER.uid, LEADER.email, {
      taskIds: ['t1', 't2'],
      memberEmails: [LEADER.email, MEMBER.email],
    });
    expect(preview.mode).toBe('fallback');
    expect(preview.assignments).toHaveLength(2);
  });
});

describe('Consentimiento del aviso de privacidad', () => {
  const consent = { accepted: true as const, version: CURRENT_PRIVACY_POLICY_VERSION };

  it('no se puede crear el perfil sin aceptar el aviso', async () => {
    await expect(createProfile(profiles, MEMBER.uid, { fullName: 'Ana' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'CONSENT_REQUIRED',
    });
  });

  it('se rechaza una versión desactualizada del aviso', async () => {
    await expect(
      createProfile(profiles, MEMBER.uid, { fullName: 'Ana', privacyConsent: { accepted: true, version: '0.1' } }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'PRIVACY_POLICY_OUTDATED' });
  });

  it('al aceptar se guardan la fecha y la versión', async () => {
    await createProfile(profiles, MEMBER.uid, { fullName: 'Ana', privacyConsent: consent });
    const saved = await profiles.findByUid(MEMBER.uid);
    expect(saved?.privacyPolicyVersion).toBe(CURRENT_PRIVACY_POLICY_VERSION);
    expect(Date.parse(saved!.consentAcceptedAt!)).not.toBeNaN();
  });

  it('editar el perfil responde 400 si el usuario no aceptó el aviso vigente', async () => {
    await profiles.createEmpty(MEMBER.uid, MEMBER.email);
    await expect(updateProfile(profiles, MEMBER.uid, { availableHoursPerWeek: 12 })).rejects.toMatchObject({
      statusCode: 400,
      code: 'CONSENT_REQUIRED',
    });
  });

  it('editar el perfil funciona tras aceptar el aviso', async () => {
    await createProfile(profiles, MEMBER.uid, { fullName: 'Ana', privacyConsent: consent });
    await updateProfile(profiles, MEMBER.uid, { availableHoursPerWeek: 12 });
    expect((await profiles.findByUid(MEMBER.uid))?.availableHoursPerWeek).toBe(12);
  });
});

describe('Eliminación de cuenta', () => {
  it('se impide si el usuario lidera actividades sin finalizar', async () => {
    await expect(deleteAccount(repo, profiles, LEADER.uid, LEADER.email)).rejects.toMatchObject({
      statusCode: 409,
      code: 'LEADS_ACTIVE_ACTIVITIES',
    });
    expect(profiles.deleted).toEqual([]);
  });

  it('saca al miembro del grupo, libera sus tareas y borra su cuenta', async () => {
    await repo.update('act-1', {
      tasks: [
        makeTask('t1', { assignedToEmail: MEMBER.email, status: 'En Progreso' }),
        makeTask('t2', { assignedToEmail: MEMBER.email, status: 'Verificado' }),
        makeTask('t3', { assignedToEmail: LEADER.email }),
      ],
    });

    await deleteAccount(repo, profiles, MEMBER.uid, MEMBER.email);

    const activity = (await repo.findById('act-1'))!;
    expect(activity.acceptedEmails).not.toContain(MEMBER.email);
    expect(activity.memberNames[MEMBER.email]).toBeUndefined();
    expect(activity.tasks.map((t) => t.assignedToEmail)).toEqual([null, null, LEADER.email]);
    expect(activity.tasks[0].status).toBe('Pendiente');
    expect(profiles.deleted).toEqual([MEMBER.uid]);
  });

  it('también lo quita de las invitaciones pendientes', async () => {
    await repo.update('act-1', { invitedEmails: [OUTSIDER.email] });
    await deleteAccount(repo, profiles, OUTSIDER.uid, OUTSIDER.email);
    expect((await repo.findById('act-1'))!.invitedEmails).toEqual([]);
  });
});

describe('Enmascarado de correos en logs', () => {
  it('oculta la parte local del correo', () => {
    expect(maskEmail('juan.perez@upc.edu.pe')).toBe('ju***@upc.edu.pe');
  });

  it('enmascara correos dentro de una URL, también codificados', () => {
    expect(maskEmailsIn('DELETE /api/activities/a1/invitations/ana.lopez%40upc.edu.pe')).toBe(
      'DELETE /api/activities/a1/invitations/an***@upc.edu.pe',
    );
  });
});
