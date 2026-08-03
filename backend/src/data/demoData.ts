import { ChatMessage, Lease, MaintenanceTicket, MessageThread, Payment, Property, Unit, User } from "../types.js";

export const users: User[] = [
  { id: "usr_tenant_1", name: "Amina Otieno", email: "tenant@rentflow.app", phone: "+254700000101", role: "tenant", mfaEnabled: true, verified: true },
  { id: "usr_caretaker_1", name: "Joseph Kariuki", email: "caretaker@rentflow.app", phone: "+254700000102", role: "caretaker", mfaEnabled: true, verified: true },
  { id: "usr_owner_1", name: "Naomi Wanjiru", email: "owner@rentflow.app", phone: "+254700000103", role: "owner", mfaEnabled: true, verified: true },
  { id: "usr_admin_1", name: "RentFlow Admin", email: "admin@rentflow.app", phone: "+254700000104", role: "super_admin", mfaEnabled: true, verified: true }
];

export const passwordHashByEmail: Record<string, string> = {
  "tenant@rentflow.app": "$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW",
  "caretaker@rentflow.app": "$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW",
  "owner@rentflow.app": "$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW",
  "admin@rentflow.app": "$2a$10$BzADq5xZJyW.Rzsavp/3yeE7qDvgimN0OADyM6lZmbW9PpyuLJvGW"
};

export const properties: Property[] = [
  { id: "prop_westlands", ownerId: "usr_owner_1", managerId: "usr_caretaker_1", name: "Westlands Heights", address: "Waiyaki Way, Nairobi", valuation: 4200000, occupancyRate: 0.96, units: 64 },
  { id: "prop_kilimani", ownerId: "usr_owner_1", managerId: "usr_caretaker_1", name: "Kilimani Court", address: "Argwings Kodhek, Nairobi", valuation: 3800000, occupancyRate: 0.92, units: 48 },
  { id: "prop_nyali", ownerId: "usr_owner_1", managerId: "usr_caretaker_1", name: "Nyali Palm", address: "Links Road, Mombasa", valuation: 2800000, occupancyRate: 0.98, units: 33 }
];

export const units: Unit[] = [
  { id: "unit_a12", propertyId: "prop_westlands", label: "A-12", status: "occupied", rent: 840, tenantId: "usr_tenant_1" },
  { id: "unit_b03", propertyId: "prop_westlands", label: "B-03", status: "occupied", rent: 760 },
  { id: "unit_c08", propertyId: "prop_kilimani", label: "C-08", status: "maintenance", rent: 1120 },
  { id: "unit_d15", propertyId: "prop_nyali", label: "D-15", status: "vacant", rent: 690 }
];

export const leases: Lease[] = [
  { id: "lease_001", unitId: "unit_a12", tenantId: "usr_tenant_1", startDate: "2026-01-01", endDate: "2026-12-31", deposit: 840, digitalSignatureStatus: "signed" }
];

export const payments: Payment[] = [
  { id: "pay_001", tenantId: "usr_tenant_1", unitId: "unit_a12", amount: 840, method: "mpesa", status: "paid", receiptNumber: "RF-2026-0001", paidAt: "2026-05-02T09:15:00.000Z" },
  { id: "pay_002", tenantId: "usr_tenant_1", unitId: "unit_a12", amount: 420, method: "card", status: "partial", receiptNumber: "RF-2026-0002", paidAt: "2026-04-07T13:30:00.000Z" }
];

export const maintenanceTickets: MaintenanceTicket[] = [
  { id: "mnt_001", propertyId: "prop_westlands", unitId: "unit_a12", tenantId: "usr_tenant_1", title: "Water heater fault", priority: "emergency", status: "assigned", mediaUrls: ["/uploads/water-heater.jpg"], technician: "Apex Plumbing" },
  { id: "mnt_002", propertyId: "prop_kilimani", unitId: "unit_c08", tenantId: "usr_tenant_1", title: "Utility meter anomaly", priority: "high", status: "in_progress", mediaUrls: [] }
];

export const messageThreads: MessageThread[] = [
  {
    id: "thread_westlands",
    propertyId: "prop_westlands",
    name: "Westlands Heights Tenants",
    type: "property_group",
    memberIds: ["usr_tenant_1", "usr_caretaker_1", "usr_owner_1"],
    pinnedNotice: "Quiet hours start at 10 PM. Emergency alerts remain enabled.",
    muted: false
  },
  {
    id: "thread_maintenance",
    propertyId: "prop_westlands",
    name: "Maintenance Desk",
    type: "support",
    memberIds: ["usr_tenant_1", "usr_caretaker_1"],
    pinnedNotice: "Upload a clear image or video when reporting repair issues.",
    muted: false
  },
  {
    id: "thread_management",
    name: "Owner and Management",
    type: "management",
    memberIds: ["usr_caretaker_1", "usr_owner_1", "usr_admin_1"],
    pinnedNotice: "Expense approvals above $500 require owner confirmation.",
    muted: false
  }
];

export const chatMessages: ChatMessage[] = [
  {
    id: "msg_001",
    threadId: "thread_westlands",
    senderId: "usr_caretaker_1",
    senderName: "Joseph Kariuki",
    senderRole: "caretaker",
    body: "Team, the water pump service is scheduled between 3 PM and 4 PM. Please store enough water before then.",
    attachmentUrls: [],
    createdAt: "2026-05-28T07:12:00.000Z",
    readBy: ["usr_owner_1"]
  },
  {
    id: "msg_002",
    threadId: "thread_westlands",
    senderId: "usr_tenant_1",
    senderName: "Amina Otieno",
    senderRole: "tenant",
    body: "Thanks for the update. Will the B block rooftop tanks be checked too?",
    attachmentUrls: [],
    createdAt: "2026-05-28T07:18:00.000Z",
    readBy: ["usr_caretaker_1"]
  },
  {
    id: "msg_003",
    threadId: "thread_westlands",
    senderId: "usr_caretaker_1",
    senderName: "Joseph Kariuki",
    senderRole: "caretaker",
    body: "Yes. B block and C block are both included.",
    attachmentUrls: [],
    createdAt: "2026-05-28T07:21:00.000Z",
    readBy: ["usr_tenant_1", "usr_owner_1"]
  }
];

export const auditLogs = [
  { id: "aud_001", actorId: "usr_admin_1", action: "SECURITY_SCAN", target: "platform", createdAt: "2026-05-27T08:30:00.000Z" },
  { id: "aud_002", actorId: "usr_caretaker_1", action: "EXPENSE_APPROVAL_REQUESTED", target: "prop_westlands", createdAt: "2026-05-27T09:10:00.000Z" }
];
