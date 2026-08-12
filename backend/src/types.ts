export type Role = "tenant" | "caretaker" | "owner" | "super_admin" | "worker";

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
  street?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  electricityPrice?: string;
  garbagePrice?: string;
  waterPrice?: string;
  propertyType?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contractFee?: number;
  managementQuote?: string;
  agreementTemplateUrl?: string;
  defaultLeaseMonths?: number;
  defaultUnitRent?: string;
  valuation: number;
  occupancyRate: number;
  units: number;
}

export interface AgreementTemplate {
  id: string;
  propertyId?: string;
  name: string;
  templateText: string;
  uploadedBy?: string;
  fileName?: string;
  createdAt?: string;
}

export interface Agreement {
  id: string;
  templateId?: string;
  leaseId?: string;
  tenantId?: string;
  propertyId?: string;
  fileUrl?: string;
  signatureStatus?: "pending" | "signed" | "expired";
  signedAt?: string;
  createdAt?: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  label: string;
  status: "occupied" | "vacant" | "maintenance";
  rent: number;
  deposit?: number;
  leaseMonths?: number;
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
  status: "paid" | "partial" | "overdue" | "failed" | "approved" | "reconciled";
  receiptNumber: string;
  paidAt: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  requestedBy?: string;
  approvedBy?: string;
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  createdAt: string;
}

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "emergency";
  status: "submitted" | "assigned" | "in_progress" | "resolved";
  mediaUrls: string[];
  assignedTo?: string;
  vendorName?: string;
  technician?: string;
  createdAt?: string;
  followUps?: Array<{ author: string; note: string; createdAt: string }>;
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

export interface SecurityRecord {
  id: string;
  propertyName: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  instructions: string;
  createdAt: string;
}
