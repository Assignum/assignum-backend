export interface DashboardStats {
  totalActivities: number;
  pendingTasks: number;
  upcomingActivities: number;
}

export interface IDashboardRepository {
  getStats(uid: string, email: string): Promise<DashboardStats>;
}
