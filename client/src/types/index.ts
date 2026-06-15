export type UserRole = "dev-admin" | "college-admin" | "warden" | "student" | "parent" | "watchman";

export type OutingStatus =
  | "pending-parent"
  | "parent-approved"
  | "parent-declined"
  | "pending-warden"
  | "approved"
  | "rejected"
  | "out"
  | "returned"
  | "expired"
  | "cancelled";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  collegeId?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  city: string;
  status: "active" | "suspended";
  adminId: string;
  adminName: string;
  studentCount: number;
  wardenCount: number;
  createdAt: string;
}

export interface Student {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  rollNumber: string;
  department: string;
  year: number;
  collegeId: string;
  wardenId?: string | { id: string; name: string };
  wardenName?: string;
  parentPhone: string;
  parentName: string;
}

export interface Warden {
  id: string;
  name: string;
  email: string;
  phone: string;
  collegeId: string;
  assignedStudents: number;
}

export interface OutingRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll?: string;
  rollNumber: string;
  department: string;
  collegeId: string;
  wardenId: string;
  wardenName: string;
  parentPhone: string;
  parentName: string;
  purpose: string;
  destination: string;
  outDate: string;
  returnDate: string;
  status: OutingStatus;
  parentDecisionAt?: string;
  wardenDecisionAt?: string;
  outAt?: string;
  returnedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  details?: Record<string, unknown>;
  ip?: string;
  userId?: { _id: string; name: string; email: string; role: string } | string | null;
  collegeId?: { _id: string; name: string; code: string } | string | null;
  createdAt: string;
}

export type SecurityEventType =
  | "login_failed"
  | "otp_failed"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "injection_blocked"
  | "other";

export interface SecurityEvent {
  _id: string;
  type: SecurityEventType;
  severity: "low" | "medium" | "high";
  ip?: string;
  identifier?: string;
  method?: string;
  path?: string;
  userAgent?: string;
  userId?: { _id: string; name: string; email: string; role: string } | string | null;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface SecurityTopIp {
  ip: string;
  count: number;
  types: SecurityEventType[];
  highSeverity: number;
  lastSeen: string;
}

export interface SecurityTimelinePoint {
  date: string;
  total: number;
  [type: string]: number | string;
}

export interface SecurityOverview {
  summary: {
    last24h: { byType: Partial<Record<SecurityEventType, number>>; total: number };
    last7d: { byType: Partial<Record<SecurityEventType, number>>; total: number };
    uniqueIps7d: number;
  };
  timeline: SecurityTimelinePoint[];
  topIps: SecurityTopIp[];
  recent: SecurityEvent[];
  platform: { totalUsers: number; colleges: number; totalRequests: number; requestsToday: number };
}

export interface StatCardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}
