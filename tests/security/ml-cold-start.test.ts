import axios, { AxiosError, AxiosResponse } from 'axios';
import { afterEach, beforeEach, vi } from 'vitest';

// setup-mocks reemplaza este módulo para el resto de pruebas; aquí se prueba el real
type MlModule = typeof import('@src/shared/infrastructure/ml/ml-recommend.service');
const ml = await vi.importActual<MlModule>('@src/shared/infrastructure/ml/ml-recommend.service');

const task = { taskType: 'Database', taskComplexity: 'High', priority: 'High', estimatedHours: 10 } as const;
const members = [{ email: 'kevin@test.com', profile: null }];
const ok = { data: { ranking: [{ name: 's1', success_probability: 0.9, prediction: 'Exitoso', rank: 1 }] } } as AxiosResponse;
const httpError = (status: number) =>
  new AxiosError('fallo', 'ERR_BAD_RESPONSE', undefined, undefined, { status } as AxiosResponse);

/** Ejecuta getRanking avanzando los temporizadores de los reintentos. */
const run = async () => {
  const result = ml.getRanking(task, members).then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return result;
};

beforeEach(() => {
  vi.useFakeTimers();
  ml.resetMlState();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('getRanking con el ML arrancando', () => {
  it('reintenta mientras el ML responde 503 y devuelve el ranking cuando arranca', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(ok);
    const result = await run();
    expect(post).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ value: [{ ...ok.data.ranking[0], name: 'kevin@test.com' }] });
  });

  it('no reintenta un error de validación (4xx)', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValue(httpError(422));
    const result = await run();
    expect(post).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('error');
  });

  it('tras agotar los reintentos no vuelve a esperar al ML durante el enfriamiento', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
    expect(await run()).toHaveProperty('error');
    expect(post).toHaveBeenCalledTimes(ml.ML_TIMING.RETRY_DELAYS_MS.length + 1);

    // Otra tarea del mismo reparto: falla al instante, sin llamar al ML
    expect(await run()).toHaveProperty('error');
    expect(post).toHaveBeenCalledTimes(ml.ML_TIMING.RETRY_DELAYS_MS.length + 1);

    // Pasado el enfriamiento se vuelve a intentar
    vi.advanceTimersByTime(ml.ML_TIMING.DOWN_COOLDOWN_MS);
    post.mockResolvedValueOnce(ok);
    expect(await run()).toHaveProperty('value');
  });
});

describe('warmUpMl', () => {
  it('despierta al ML como mucho una vez por intervalo', () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({});
    ml.warmUpMl();
    ml.warmUpMl();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toMatch(/\/info$/);

    vi.advanceTimersByTime(ml.ML_TIMING.WARM_UP_INTERVAL_MS);
    ml.warmUpMl();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
