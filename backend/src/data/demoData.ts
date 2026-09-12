import { ChatMessage, Expense, Lease, MaintenanceTicket, MessageThread, Payment, Property, Unit, User } from "../types.js";

export const users: User[] = [
  { id: "usr_tenant_1", name: "Amina Otieno", email: "tenant@test.com", phone: "+254700000101", role: "tenant", mfaEnabled: true, verified: true },
  { id: "usr_caretaker_1", name: "Obwanda Lord", email: "caretaker@test.com", phone: "+254700000102", role: "caretaker", mfaEnabled: true, verified: true },
  { id: "usr_owner_1", name: "Naomi Wanjiru", email: "owner@test.com", phone: "+254700000103", role: "owner", mfaEnabled: true, verified: true },
  { id: "usr_admin_1", name: "Amani Core Tech", email: "admin@test.com", phone: "+254700000104", role: "super_admin", mfaEnabled: true, verified: true },
  { id: "usr_personal_owner_1", name: "Obwanda Lord", email: "obwandalordphick14@gmail.com", phone: "+254700000102", role: "caretaker", mfaEnabled: true, verified: true },
  { id: "usr_personal_admin_1", name: "Amani Core Tech", email: "amanicoretech@gmail.com", phone: "+254700000104", role: "super_admin", mfaEnabled: true, verified: true }
];

export const passwordHashByEmail: Record<string, string> = {
  "tenant@test.com": "$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny",
  "caretaker@test.com": "$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny",
  "owner@test.com": "$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny",
  "admin@test.com": "$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny",
  "obwandalordphick14@gmail.com": "$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny",
  "amanicoretech@gmail.com": "$2a$10$bfNgZ6GN9cmD1/ncrl9Rt./1i2jRqc5DZ2eq.wyvHG0mVdCj3y4Ny"
};

export const properties: Property[] = [
  {
    id: "prop_westlands",
    ownerId: "usr_owner_1",
    managerId: "usr_caretaker_1",
    name: "Westlands Heights",
    address: "Waiyaki Way, Nairobi",
    street: "Waiyaki Way",
    location: "Westlands",
    electricityPrice: "KES 25/unit",
    garbagePrice: "KES 4/unit",
    waterPrice: "KES 8/unit",
    contractFee: 2200,
    managementQuote: "10% monthly property management",
    agreementTemplateUrl: "https://rentflow.local/templates/westlands-lease.docx",
    valuation: 4200000,
    occupancyRate: 0.96,
    units: 64
  },
  {
    id: "prop_kilimani",
    ownerId: "usr_owner_1",
    managerId: "usr_caretaker_1",
    name: "Kilimani Court",
    address: "Argwings Kodhek, Nairobi",
    street: "Argwings Kodhek",
    location: "Kilimani",
    electricityPrice: "KES 28/unit",
    garbagePrice: "KES 5/unit",
    waterPrice: "KES 9/unit",
    contractFee: 2400,
    managementQuote: "9% monthly plus service fee",
    agreementTemplateUrl: "https://rentflow.local/templates/kilimani-lease.docx",
    valuation: 3800000,
    occupancyRate: 0.92,
    units: 48
  },
  {
    id: "prop_nyali",
    ownerId: "usr_owner_1",
    managerId: "usr_caretaker_1",
    name: "Nyali Palm",
    address: "Links Road, Mombasa",
    street: "Links Road",
    location: "Nyali",
    electricityPrice: "KES 32/unit",
    garbagePrice: "KES 6/unit",
    waterPrice: "KES 10/unit",
    contractFee: 2700,
    managementQuote: "Premium management plus tenant onboarding",
    agreementTemplateUrl: "https://rentflow.local/templates/nyali-lease.docx",
    valuation: 2800000,
    occupancyRate: 0.98,
    units: 33
  }
];

export const units: Unit[] = [
  { id: "unit_a12", propertyId: "prop_westlands", label: "A-01-12", block: "A", floor: "01", number: "12", status: "occupied", rent: 840, deposit: 840, leaseMonths: 12, tenantId: "usr_tenant_1" },
  { id: "unit_b03", propertyId: "prop_westlands", label: "B-01-03", block: "B", floor: "01", number: "03", status: "occupied", rent: 760, deposit: 760, leaseMonths: 12 },
  { id: "unit_c08", propertyId: "prop_kilimani", label: "C-02-08", block: "C", floor: "02", number: "08", status: "maintenance", rent: 1120, deposit: 1120, leaseMonths: 12 },
  { id: "unit_d15", propertyId: "prop_nyali", label: "D-03-15", block: "D", floor: "03", number: "15", status: "vacant", rent: 690, deposit: 690, leaseMonths: 12 }
];

export const leases: Lease[] = [
  { id: "lease_001", unitId: "unit_a12", tenantId: "usr_tenant_1", startDate: "2026-01-01", endDate: "2026-12-31", deposit: 840, digitalSignatureStatus: "signed" }
];

export const payments: Payment[] = [
  { id: "pay_001", tenantId: "usr_tenant_1", unitId: "unit_a12", amount: 840, method: "mpesa", status: "paid", receiptNumber: "RF-2026-0001", paidAt: "2026-05-02T09:15:00.000Z" },
  { id: "pay_002", tenantId: "usr_tenant_1", unitId: "unit_a12", amount: 420, method: "card", status: "partial", receiptNumber: "RF-2026-0002", paidAt: "2026-04-07T13:30:00.000Z" }
];

export const expenses: Expense[] = [
  { id: "exp_001", propertyId: "prop_westlands", requestedBy: "usr_caretaker_1", approvedBy: "usr_owner_1", category: "Maintenance", description: "Emergency pump replacement", amount: 2200, receiptUrl: "https://rentflow.local/receipts/exp_001.pdf", createdAt: "2026-06-02T10:10:00.000Z" },
  { id: "exp_002", propertyId: "prop_kilimani", requestedBy: "usr_caretaker_1", category: "Utilities", description: "Water meter calibration", amount: 420, createdAt: "2026-06-08T14:45:00.000Z" }
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

export const securityRecords = [
  {
    id: "sec_001",
    propertyName: "Westlands Heights",
    companyName: "Guardian Security Ltd.",
    contactName: "Moses Kamau",
    contactPhone: "+254700111222",
    contactEmail: "moses@guardian.co.ke",
    notes: "Daily night patrols with gate access verification.",
    instructions: "Escalate any unauthorized access to the manager immediately.",
    createdAt: "2026-05-25T14:00:00.000Z"
  }
];

export const visitorRecords = [
  {
    id: "visitor_001",
    visitorName: "John Kariuki",
    phone: "+254700111333",
    email: "john@email.com",
    reason: "Maintenance work",
    checkIn: "2026-05-27T09:00:00.000Z",
    checkOut: "2026-05-27T17:00:00.000Z",
    destination: "Unit A-12",
    propertyId: "prop_westlands",
    propertyName: "Westlands Heights",
    unitId: "unit_001",
    floor: "3",
    houseNumber: "A-12",
    status: "checked-out",
    createdAt: "2026-05-27T08:30:00.000Z"
  }
];

