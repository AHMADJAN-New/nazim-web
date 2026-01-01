export type NotificationLevel = 'info' | 'warning' | 'critical' | string;

export interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  url?: string | null;
  level: NotificationLevel;
  event_id?: string | null;
  event?: {
    id: string;
    type: string;
  } | null;
  read_at: string | null;
  created_at: string;
  updated_at?: string;
}
