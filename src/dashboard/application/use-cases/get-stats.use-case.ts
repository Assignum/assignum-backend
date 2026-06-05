import { DashboardStats, IDashboardRepository } from '../../domain/repositories/dashboard.repository';

export const getStats = async (
  repo: IDashboardRepository,
  uid: string,
  email: string,
): Promise<DashboardStats> => {
  return repo.getStats(uid, email);
};
