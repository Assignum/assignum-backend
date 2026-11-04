import { vi } from 'vitest';

// Las pruebas no tocan Firebase ni el servicio ML: se reemplazan los módulos de infraestructura.
vi.mock('@src/shared/infrastructure/firebase/firebase-admin', () => ({ db: {}, auth: {}, default: {} }));
vi.mock('@src/shared/infrastructure/notifications/notify.service', () => ({
  INBOX_COLLECTION: 'inbox',
  notifyEmail: vi.fn(),
  notifyUid: vi.fn(),
}));
vi.mock('@src/shared/infrastructure/ml/ml-recommend.service', () => ({ getRanking: vi.fn(), warmUpMl: vi.fn() }));
