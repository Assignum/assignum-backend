export interface Notification {
  activityId: string;
  activityName: string;
  leaderName: string;
  dueDate: string;
}

/** Aviso guardado en la bandeja de la app (aceptaciones, reasignaciones, recordatorios…). */
export interface InboxItem {
  id: string;
  type: string;
  title: string;
  body: string;
  activityId: string;
  read: boolean;
  createdAt: string;
}
