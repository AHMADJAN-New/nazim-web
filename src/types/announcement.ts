export interface Announcement {
  id: string;
  title: string;
  content: string;
  type?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: string[];
  publishDate: string;
  expiryDate?: string;
  author: string;
  status: 'draft' | 'published' | 'expired';
  notificationSent: boolean;
  createdBy?: string;
  createdDate?: string;
  sendVia?: string[];
  views?: number;
}
