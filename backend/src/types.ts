export type Role = "tenant" | "caretaker" | "owner" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  mfaEnabled: boolean;
  verified: boolean;
}

export interface Property {
  id: string;
  ownerId: string;
  managerId: string;
  name: string;
  address: string;
  valuation: number;
  occupancyRate: number;
  units: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  label: string;
  status: "occupied" | "vacant" | "maintenance";
  rent: number;
  tenantId?: string;
}

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  deposit: number;
  digitalSignatureStatus: "pending" | "signed" | "expired";
}

export interface Payment {
  id: string;
  tenantId: string;
  unitId: string;
  amount: number;
  method: "mpesa" | "bank" | "card" | "mobile_money" | "paypal";
  status: "paid" | "partial" | "overdue" | "failed";
  receiptNumber: string;
  paidAt: string;
}

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  title: string;
  priority: "low" | "medium" | "high" | "emergency";
  status: "submitted" | "assigned" | "in_progress" | "resolved";
  mediaUrls: string[];
  technician?: string;
}

export interface MessageThread {
  id: string;
  propertyId?: string;
  name: string;
  type: "property_group" | "support" | "management" | "announcement";
  memberIds: string[];
  pinnedNotice?: string;
  muted: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  body: string;
  attachmentUrls: string[];
  createdAt: string;
  readBy: string[];
}
