export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  lastLogin?: Date;
}

export interface NumberEntry {
  id: string;
  numberRef: string;
  processStage: ProcessStage;
  startDate: Date;
  lastUpdated: Date;
  status: Status;
  priority: Priority;
  assignedTo: string;
  comments: Comment[];
  timeline: TimelineEvent[];
}


export type numberAll = {
  port: string;
  imei: string;
  iccid: string;
  imsi: string;
  sn: string;
}

export type ProcessStage = 
  | 'initial' 
  | 'in-progress' 
  | 'review' 
  | 'approval' 
  | 'completed' 
  | 'rejected';

export type Status = 'active' | 'pending' | 'blocked' | 'completed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
}

export interface TimelineEvent {
  id: string;
  stage: ProcessStage;
  timestamp: Date;
  user: string;
  description: string;
}

export interface DashboardMetrics {
  totalNumbers: number;
  completedNumbers: number;
  pendingNumbers: number;
  avgProcessingTime: number;
}

export interface AddNumberParams {
  phoneNumbers: string[] | number[];
  countryId?: string;
  apiKey?: string;
  endpoint?: string;
  success?: boolean;
  error?: string;
}

export interface SearchNumberParams {
  batch_id: string[];
  countryId?: string;
  apiKey?: string;
  endpoint?: string;
}