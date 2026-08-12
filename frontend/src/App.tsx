import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Gauge,
  Home,
  Lock,
  Megaphone,
  MessageSquare,
  Moon,
  MoreVertical,
  Paperclip,
  Pin,
  PlugZap,
  Printer,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  User,
  UserCog,
  Users,
  Wrench,
  LogOut
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type UserRole = "tenant" | "caretaker" | "owner" | "super_admin";

interface BackendUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

interface ServerProperty {
  id: string;
  ownerId: string;
  managerId: string;
  name: string;
  address: string;
  street?: string;
  location?: string;
  electricityPrice?: string;
  garbagePrice?: string;
  waterPrice?: string;
  contractFee?: number;
  managementQuote?: string;
  agreementTemplateUrl?: string;
  valuation: number;
  occupancyRate: number;
  units: number;
}

interface ServerUnit {
  id: string;
  propertyId: string;
  label: string;
  status: string;
  rent: number;
  deposit?: number;
  leaseMonths?: number;
  tenantId?: string;
}

interface ServerMaintenanceTicket {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  mediaUrls: string[];
  assignedTo?: string;
  technician?: string;
  vendorName?: string;
  createdAt?: string;
  followUps?: Array<{ author: string; note: string; createdAt: string }>;
}

interface ServerNotification {
  id: string;
  userId?: string;
  channel: string;
  template: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface ServerPayment {
  id: string;
  tenantId: string;
  unitId?: string;
  amount: number;
  method: string;
  status: string;
  receiptNumber: string;
  paidAt: string;
}

interface ServerTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface ServerExpense {
  id: string;
  propertyId: string;
  propertyName?: string;
  requestedBy?: string;
  approvedBy?: string;
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  createdAt: string;
}

interface ServerThread {
  id: string;
  propertyId?: string;
  name: string;
  type: string;
  memberIds: string[];
  pinnedNotice?: string;
  muted: boolean;
  memberCount?: number;
  unreadCount?: number;
  lastMessage?: { senderName: string; body: string; createdAt: string };
}

interface ServerSecurityRecord {
  id: string;
  propertyId?: string;
  propertyName: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  instructions: string;
  location?: string;
  createdAt: string;
}

interface AppChatMessage {
  id: string;
  threadId: string;
  author: string;
  role: string;
  time: string;
  body: string;
  attachmentUrls?: string[];
  mine?: boolean;
  createdAt?: string;
}

function getAuthHeaders(token: string | null): Record<string, string> | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

async function fetchJson<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Role = "Tenant" | "Management" | "Owner" | "Super Admin";
type Tab = "Overview" | "Properties" | "Payments" | "Maintenance" | "Messaging" | "Notices" | "Reports" | "Security" | "Admin" | "Profile" | "Sign Out";
type Currency = "USD" | "KES";

const roles: Role[] = ["Tenant", "Management", "Owner", "Super Admin"];

const tabIcons: Record<Tab, typeof Home> = {
  Overview: Home,
  Properties: Building2,
  Payments: CreditCard,
  Maintenance: Wrench,
  Messaging: MessageSquare,
  Notices: Megaphone,
  Reports: FileText,
  Security: ShieldCheck,
  Admin: UserCog,
  Profile: User,
  "Sign Out": LogOut
};

const navItems: Array<[typeof Home, Tab]> = [
  [tabIcons.Overview, "Overview"],
  [tabIcons.Properties, "Properties"],
  [tabIcons.Payments, "Payments"],
  [tabIcons.Maintenance, "Maintenance"],
  [tabIcons.Messaging, "Messaging"],
  [tabIcons.Notices, "Notices"],
  [tabIcons.Reports, "Reports"],
  [tabIcons.Security, "Security"],
  [tabIcons.Admin, "Admin"],
  [tabIcons.Profile, "Profile"],
  [tabIcons["Sign Out"] ?? LogOut, "Sign Out"]
];

const roleTabs: Record<Role, Tab[]> = {
  Tenant: ["Overview", "Payments", "Maintenance", "Messaging", "Notices", "Reports", "Security", "Profile", "Sign Out"],
  Management: ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Notices", "Reports", "Security", "Profile", "Sign Out"],
  Owner: ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Notices", "Reports", "Security", "Admin", "Profile", "Sign Out"],
  "Super Admin": ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Notices", "Reports", "Security", "Admin", "Profile", "Sign Out"]
};

const rolePrivileges: Record<Role, string[]> = {
  Tenant: ["Pay rent", "Download receipts", "Submit maintenance", "Read notices", "Message management"],
  Management: ["Onboard tenants", "Manage units", "Assign technicians", "Broadcast notices", "Record expenses"],
  Owner: ["Approve expenses", "View management activity", "Export financial reports", "Manage properties", "Monitor satisfaction"],
  "Super Admin": ["Manage all users", "Manage subscriptions", "View global analytics", "Security monitoring", "Platform announcements"]
};

const revenue = [
  { month: "Jan", rent: 82000, expenses: 22000, occupancy: 91 },
  { month: "Feb", rent: 88000, expenses: 24000, occupancy: 92 },
  { month: "Mar", rent: 94000, expenses: 21000, occupancy: 94 },
  { month: "Apr", rent: 91000, expenses: 28000, occupancy: 93 },
  { month: "May", rent: 103000, expenses: 25000, occupancy: 97 },
  { month: "Jun", rent: 112000, expenses: 23000, occupancy: 98 }
];

const mobileTrend = [
  { day: "1", value: 1180 },
  { day: "5", value: 1320 },
  { day: "10", value: 1260 },
  { day: "15", value: 1480 },
  { day: "20", value: 1370 },
  { day: "25", value: 1510 },
  { day: "30", value: 1580 }
];

const occupancy = [
  { name: "Occupied", value: 132, color: "#22c55e" },
  { name: "Vacant", value: 8, color: "#f59e0b" },
  { name: "Maintenance", value: 5, color: "#ef4444" }
];

const arrears = [
  { property: "Westlands Heights", amount: 4200 },
  { property: "Kilimani Court", amount: 12600 },
  { property: "Riverside Lofts", amount: 3200 },
  { property: "Nyali Palm", amount: 8700 }
];

const usdToKes = 129;

function formatMoney(usdAmount: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: usdAmount >= 1000 ? 0 : 2
  }).format(currency === "USD" ? usdAmount : usdAmount * usdToKes);
}

function convertMoneyText(value: string, currency: Currency) {
  if (currency === "USD") return value;
  return value.replace(/\$([\d,.]+)(K?)/g, (match, rawAmount: string, suffix: string) => {
    const parsed = Number(rawAmount.replace(/,/g, ""));
    if (Number.isNaN(parsed)) return match;
    const usd = suffix === "K" ? parsed * 1000 : parsed;
    return formatMoney(usd, "KES");
  });
}

const dueBills = [
  { vendor: "Water", date: "13 Jun", usdAmount: 48, tone: "cyan" },
  { vendor: "Power", date: "18 Jun", usdAmount: 82.5, tone: "gold" },
  { vendor: "Service", date: "20 Jun", usdAmount: 35, tone: "mint" }
];

const payments = [
  { tenant: "Amina Otieno", unit: "A-12", method: "M-Pesa", status: "Paid", amount: "$840" },
  { tenant: "David Mwangi", unit: "B-03", method: "Card", status: "Partial", amount: "$520" },
  { tenant: "Grace Njeri", unit: "C-08", method: "Bank", status: "Overdue", amount: "$1,120" },
  { tenant: "Brian Kiptoo", unit: "D-15", method: "Mobile money", status: "Paid", amount: "$760" }
];

const receipts = [
  { id: "RF-2026-0001", date: "May 2, 2026", amount: "$840", method: "M-Pesa", status: "Ready" },
  { id: "RF-2026-0002", date: "Apr 7, 2026", amount: "$420", method: "Card", status: "Ready" },
  { id: "RF-2026-0003", date: "Mar 4, 2026", amount: "$840", method: "Bank", status: "Ready" }
];

const notices = [
  { title: "Water pump service", body: "Water service is scheduled between 3 PM and 4 PM today.", level: "Property notice" },
  { title: "Security reminder", body: "Visitors must use QR gate passes after 8 PM.", level: "Management" },
  { title: "Lease renewal window", body: "Renewals due within 60 days are now open for digital signing.", level: "Lease" }
];

const maintenance = [
  { title: "Water heater fault", priority: "Emergency", status: "Technician assigned" },
  { title: "Utility meter anomaly", priority: "High", status: "AI review flagged" },
  { title: "Gate access QR issue", priority: "Medium", status: "In progress" },
  { title: "Lease renewal inspection", priority: "Low", status: "Scheduled" }
];

const properties = [
  { name: "Westlands Heights", units: 64, occupancy: "96%", manager: "Joseph Kariuki", revenue: "$48.2K" },
  { name: "Kilimani Court", units: 48, occupancy: "92%", manager: "Joseph Kariuki", revenue: "$39.8K" },
  { name: "Nyali Palm", units: 33, occupancy: "98%", manager: "Mariam Said", revenue: "$24.4K" }
];

const adminUsers = [
  { name: "Amina Otieno", role: "Tenant", status: "Verified", plan: "N/A" },
  { name: "Joseph Kariuki", role: "Management", status: "MFA enabled", plan: "N/A" },
  { name: "Naomi Wanjiru", role: "Owner", status: "Active", plan: "Growth" },
  { name: "RentFlow Admin", role: "Super Admin", status: "Security lead", plan: "Platform" }
];

const chatThreads = [
  { id: "westlands", name: "Westlands Heights Tenants", scope: "Property group", unread: 8, members: 64, preview: "Management: Water interruption update at 4 PM.", active: true },
  { id: "maintenance", name: "Maintenance Desk", scope: "Tenant support", unread: 2, members: 7, preview: "Apex Plumbing shared a repair estimate.", active: false },
  { id: "owners", name: "Owner and Management", scope: "Private channel", unread: 0, members: 5, preview: "Naomi approved the generator service expense.", active: false }
];

const chatMessages = [
  { id: "msg1", threadId: "westlands", author: "Joseph Kariuki", role: "Management", time: "10:12", body: "Team, the water pump service is scheduled between 3 PM and 4 PM. Please store enough water before then.", mine: false },
  { id: "msg2", threadId: "westlands", author: "Amina Otieno", role: "Tenant", time: "10:18", body: "Thanks for the update. Will the B block rooftop tanks be checked too?", mine: false },
  { id: "msg3", threadId: "westlands", author: "Management", role: "Pinned notice", time: "10:21", body: "Yes. B block and C block are both included. Any emergency issue should be marked high priority in maintenance.", mine: true },
  { id: "msg4", threadId: "maintenance", author: "Apex Plumbing", role: "Vendor", time: "11:05", body: "We can inspect the water heater today after 2 PM.", mine: false },
  { id: "msg5", threadId: "owners", author: "Naomi Wanjiru", role: "Owner", time: "12:34", body: "Approved the generator service expense. Please attach the receipt.", mine: false }
];

const roleStats: Record<Role, Array<{ label: string; value: string; hint: string; icon: typeof Gauge }>> = {
  Tenant: [
    { label: "Rent balance", value: "$2,000", hint: "Due in 22 days", icon: CreditCard },
    { label: "Receipts", value: "18", hint: "All downloadable", icon: FileText },
    { label: "Open tickets", value: "2", hint: "1 assigned", icon: Wrench },
    { label: "Lease status", value: "Active", hint: "Expires Dec 31", icon: ShieldCheck }
  ],
  Management: [
    { label: "Collected today", value: "$9.4K", hint: "12 payments", icon: CreditCard },
    { label: "Vacant units", value: "8", hint: "3 ready for viewing", icon: Building2 },
    { label: "Work orders", value: "23", hint: "4 emergency", icon: Wrench },
    { label: "Check-ins", value: "14", hint: "Geo verified", icon: Activity }
  ],
  Owner: [
    { label: "Portfolio revenue", value: "$112.4K", hint: "+18.2% month over month", icon: CreditCard },
    { label: "Occupancy", value: "97.4%", hint: "8 units vacant", icon: Building2 },
    { label: "Expenses pending", value: "$4.8K", hint: "5 approvals", icon: FileText },
    { label: "AI forecast", value: "$126K", hint: "Projected June revenue", icon: Sparkles }
  ],
  "Super Admin": [
    { label: "Active landlords", value: "1,482", hint: "+74 this month", icon: Users },
    { label: "MRR", value: "$84.9K", hint: "Growth plan leads", icon: CreditCard },
    { label: "Fraud alerts", value: "7", hint: "2 high priority", icon: ShieldCheck },
    { label: "API health", value: "99.98%", hint: "All regions stable", icon: Activity }
  ]
};

function StatCard({ label, value, hint, icon: Icon, currency }: { label: string; value: string; hint: string; icon: typeof Gauge; currency: Currency }) {
  return (
    <section className="stat-card">
      <div>
        <p>{label}</p>
        <strong>{convertMoneyText(value, currency)}</strong>
        <span>{convertMoneyText(hint, currency)}</span>
      </div>
      <Icon aria-hidden="true" />
    </section>
  );
}

function MobileRentFlowHome({ role, currency }: { role: Role; currency: Currency }) {
  const isTenant = role === "Tenant";
  return (
    <section className="mobile-command">
      <div className="mobile-hero-card">
        <div className="mobile-profile-row">
          <div className="profile-avatar">{isTenant ? "AO" : role.slice(0, 2).toUpperCase()}</div>
          <button aria-label="Mobile alerts"><Bell /></button>
        </div>
        <span>{isTenant ? "Welcome back, Amina" : `${role} mobile command`}</span>
        <h2>{isTenant ? "Let us see your rent statistics" : "Track property operations in real time"}</h2>
        <div className="rent-card">
          <span>{isTenant ? "Current balance" : "Managed revenue"}</span>
          <strong>{isTenant ? formatMoney(2000, currency) : formatMoney(112400, currency)}</strong>
          <small>{isTenant ? "Due in 22 days" : "Across 145 units"}</small>
        </div>
        <div className="quick-actions">
          <button><Send /> {isTenant ? "Pay rent" : "Broadcast"}</button>
          <button><MessageSquare /> Chat</button>
        </div>
      </div>

      <div className="mobile-analytics-card">
        <div className="mobile-card-header">
          <div>
            <span>{role} dashboard</span>
            <h3>RentFlow</h3>
          </div>
          <button aria-label="Notifications"><Bell /></button>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={mobileTrend}>
            <XAxis dataKey="day" hide />
            <YAxis hide domain={[1100, 1650]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#c7f9ff" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="wallet-strip">
          <span>{isTenant ? "Wallet balance" : "Collection balance"}</span>
          <strong>{formatMoney(1500.5, currency)}</strong>
        </div>
        <div className="bill-heading">
          <h3>{isTenant ? "Bills due" : "Priority queue"}</h3>
          <button>{isTenant ? "Add a bill" : "View all"}</button>
        </div>
        <div className="bill-grid">
          {dueBills.map((bill) => (
            <div className={`bill-card ${bill.tone}`} key={bill.vendor}>
              <i />
              <strong>{bill.vendor}</strong>
              <span>{bill.date}</span>
              <b>{formatMoney(bill.usdAmount, currency)}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MessagingCenter({ role, threads, messages, notifications, onLoadThread, onSendMessage, onSendPushAlert }: { role: Role; threads: ServerThread[]; messages: AppChatMessage[]; notifications: ServerNotification[]; onLoadThread: (threadId: string) => void; onSendMessage: (threadId: string, body: string, attachmentUrls?: string[]) => void; onSendPushAlert: (message: string) => Promise<void> }) {
  const [activeThreadId, setActiveThreadId] = useState(threads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [noticeStatus, setNoticeStatus] = useState("Rent reminder is scheduled for the 1st of every month, due by the 5th.");
  const [threadFilter, setThreadFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredThreads = useMemo(() => {
    if (threadFilter === "all") return threads;
    if (threadFilter === "tenant") return threads.filter((thread) => thread.type === "property_group" || thread.type === "support");
    return threads.filter((thread) => thread.type === "management" || thread.type === "announcement");
  }, [threadFilter, threads]);

  const activeThread = filteredThreads.find((thread) => thread.id === activeThreadId) ?? filteredThreads[0] ?? threads[0] ?? { id: "", name: "General", type: "support", memberIds: [], muted: false };
  const activeMessages = messages.filter((message) => message.threadId === activeThread.id);

  useEffect(() => {
    if (!activeThreadId && activeThread.id) {
      setActiveThreadId(activeThread.id);
    }
  }, [activeThread, activeThreadId]);

  function selectThread(threadId: string) {
    setActiveThreadId(threadId);
    onLoadThread(threadId);
    setAttachmentUrls([]);
  }

  function handleAttachFiles(files: FileList | null) {
    if (!files) return;
    const previews = Array.from(files).map((file) => URL.createObjectURL(file));
    setAttachmentUrls((current) => [...current, ...previews]);
  }

  function removeAttachment(url: string) {
    setAttachmentUrls((current) => current.filter((item) => item !== url));
  }

  function sendMessage() {
    const body = draft.trim();
    if (!body && attachmentUrls.length === 0) {
      setNoticeStatus("Type a message or attach a file before sending.");
      return;
    }
    onSendMessage(activeThread.id, body || "", attachmentUrls);
    setDraft("");
    setAttachmentUrls([]);
    setNoticeStatus(`Message sent to ${activeThread.name}. Push, email, and in-app notifications queued.`);
  }

  return (
    <article className="panel messaging-panel">
      <div className="chat-sidebar">
        <div className="chat-title">
          <div>
            <span>{role === "Tenant" ? "Tenant support" : "Managed communication"}</span>
            <h3>RentFlow Groups</h3>
          </div>
          <button aria-label="Search chats"><Search /></button>
        </div>
        {role !== "Tenant" && (
          <div className="chat-filter">
            <button className={threadFilter === "all" ? "selected" : ""} onClick={() => setThreadFilter("all")}>All</button>
            <button className={threadFilter === "tenant" ? "selected" : ""} onClick={() => setThreadFilter("tenant")}>Tenant</button>
            <button className={threadFilter === "owner" ? "selected" : ""} onClick={() => setThreadFilter("owner")}>Owner</button>
          </div>
        )}
        <div className="thread-list">
          {filteredThreads.map((thread) => (
            <button key={thread.id} className={thread.id === activeThreadId ? "thread active-thread" : "thread"} onClick={() => selectThread(thread.id)}>
              <div className="avatar-stack">{thread.name.slice(0, 2).toUpperCase()}</div>
              <span>
                <strong>{thread.name}</strong>
                <small>{thread.type.replace("_", " ")} • {thread.memberIds.length} members</small>
                <em>{thread.lastMessage?.body ?? "No recent updates"}</em>
              </span>
              {thread.unreadCount ? <b>{thread.unreadCount}</b> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <div>
            <span><Users /> {activeThread.memberIds.length} members in channel</span>
            <h3>{activeThread.name}</h3>
          </div>
          <div className="chat-tools">
            <button aria-label="Pinned notices"><Pin /></button>
            <button aria-label="More chat actions"><MoreVertical /></button>
          </div>
        </div>
        <div className="message-feed">
          {activeMessages.map((message) => (
            <div key={message.id} className={message.mine ? "message-bubble mine" : "message-bubble"}>
              <div>
                <strong>{message.author}</strong>
                <small>{message.role} • {message.time}</small>
              </div>
              <p>{message.body}</p>
              {message.attachmentUrls?.length ? (
                <div className="message-attachments">
                  {message.attachmentUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">Attachment</a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="composer">
          <button aria-label="Attach file" onClick={() => fileInputRef.current?.click()}><Paperclip /></button>
          <input type="file" multiple hidden ref={fileInputRef} onChange={(event) => handleAttachFiles(event.target.files)} />
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} placeholder={role === "Tenant" ? "Message management..." : "Message tenants and management..."} />
          <button className="send-button" aria-label="Send message" onClick={sendMessage}><Send /></button>
        </div>
        {attachmentUrls.length > 0 && (
          <div className="attachment-preview-bar">
            {attachmentUrls.map((url) => (
              <span key={url} className="attachment-chip">
                <a href={url} target="_blank" rel="noreferrer">Preview</a>
                <button type="button" onClick={() => removeAttachment(url)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <aside className="chat-context">
        <span>Channel controls</span>
        <h3>{role === "Tenant" ? "Your access" : "Management tools"}</h3>
        {role === "Tenant" ? (
          <>
            <div><CheckCircle2 /> Read announcements</div>
            <div><MessageSquare /> Reply in assigned property groups</div>
            <div><ShieldCheck /> Private complaints stay restricted</div>
            <div><FileText /> Message history is available</div>
          </>
        ) : (
          <>
            <div><CheckCircle2 /> Tenant replies enabled</div>
            <div><ShieldCheck /> Moderated announcements</div>
            <div><Bell /> SMS fallback for urgent alerts</div>
            <div><FileText /> Chat history stored in audit logs</div>
            <button className="secondary-action" onClick={() => onSendPushAlert("Urgent property alert: check your app for updates.")}>Send push alert</button>
          </>
        )}
        <div className="notification-summary"><Bell /> {noticeStatus}</div>
        <div className="notification-feed">
          <span>Recent alerts</span>
          {notifications.slice(0, 3).map((notice) => (
            <div key={notice.id} className="compact-notice">
              <strong>{notice.channel}</strong>
              <small>{notice.template}</small>
            </div>
          ))}
        </div>
      </aside>
    </article>
  );
}

function PrivilegePanel({ role }: { role: Role }) {
  return (
    <article className="panel privilege-panel">
      <div className="panel-heading">
        <div>
          <span>Role privileges</span>
          <h3>{role} access</h3>
        </div>
        <ShieldCheck />
      </div>
      <div className="module-list">
        {rolePrivileges[role].map((item) => <div key={item}><CheckCircle2 />{item}</div>)}
      </div>
    </article>
  );
}

function DashboardShortcuts({ role, onNavigate }: { role: Role; onNavigate: (tab: Tab) => void }) {
  const shortcuts = roleTabs[role].filter((tab) => tab !== "Overview" && tab !== "Security");

  return (
    <section className="shortcut-grid">
      {shortcuts.map((tab) => {
        const Icon = tabIcons[tab];
        return (
          <button key={tab} onClick={() => onNavigate(tab)}>
            <Icon />
            <span>
              <strong>{tab}</strong>
              <small>
                {tab === "Admin"
                  ? "Controls and access"
                  : tab === "Messaging"
                    ? "Groups and notices"
                    : tab === "Payments"
                      ? role === "Tenant" ? "Pay and receipts" : "Collections"
                      : "Open page"}
              </small>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function DashboardSnapshot({ role }: { role: Role }) {
  const isTenant = role === "Tenant";
  return (
    <section className="dashboard-snapshot">
      <article className="panel snapshot-panel">
        <div>
          <span>{isTenant ? "Next action" : "Today"}</span>
          <h3>{isTenant ? "Pay June rent" : role === "Management" ? "Resolve emergency queue" : "Review portfolio health"}</h3>
          <p>{isTenant ? "Balance is due in 22 days. Receipts are generated immediately after payment." : "Only the most important operational signals stay on this dashboard."}</p>
        </div>
        <button>{isTenant ? "Pay now" : "Open work queue"}</button>
      </article>
      <PrivilegePanel role={role} />
    </section>
  );
}

type OverviewView = "dashboard" | "insights";

function OverviewPage({ role, onNavigate, currency, onSendPushAlert }: { role: Role; onNavigate: (tab: Tab) => void; currency: Currency; onSendPushAlert: (message: string) => void }) {
  const [view, setView] = useState<OverviewView>("dashboard");
  const [visitorQr, setVisitorQr] = useState({ code: "", expiresAt: "" });
  const stats = roleStats[role];
  const isTenant = role === "Tenant";

  function generateVisitorQr() {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const code = `VISITOR-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now()}`;
    setVisitorQr({ code, expiresAt });
  }

  async function downloadVisitorQr() {
    if (!visitorQr.code) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(visitorQr.code)}&size=320x320`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "visitor-qr.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      downloadFile("visitor-code.txt", visitorQr.code);
    }
  }

  function printVisitorQr() {
    if (!visitorQr.code) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(visitorQr.code)}&size=320x320`;
    const printWindow = window.open("", "PRINT", "width=400,height=500");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Print visitor QR</title></head><body style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0;\"><img src=\"${url}\" alt=\"Visitor QR\" style=\"max-width:100%;height:auto;\"/><p style=\"font-family:Arial,sans-serif; margin-top:16px;\">${visitorQr.code}</p></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  const expiresAt = visitorQr.expiresAt ? new Date(visitorQr.expiresAt) : null;
  const isExpired = expiresAt ? Date.now() > expiresAt.getTime() : false;

  return (
    <>
      <div className="page-tabs" role="tablist" aria-label="Overview views">
        <button role="tab" aria-selected={view === "dashboard"} className={view === "dashboard" ? "selected" : ""} onClick={() => setView("dashboard")}>Dashboard</button>
        <button role="tab" aria-selected={view === "insights"} className={view === "insights" ? "selected" : ""} onClick={() => setView("insights")}>{isTenant ? "My unit" : "Portfolio"}</button>
      </div>
      {view === "insights" ? (
        isTenant ? <TenantOverview currency={currency} /> : <PortfolioOverview role={role} />
      ) : (
        <>
      {!isTenant && (
        <section className="hero-band">
          <div>
            <span className="eyebrow"><Sparkles /> {role === "Super Admin" ? "Platform intelligence" : "AI-assisted property intelligence"}</span>
            <h2>{role === "Management" ? "Run every unit, ticket, tenant, and notice from one command center." : "Collect rent faster, predict risk earlier, and keep operations accountable."}</h2>
            <p>RentFlow adapts permissions, analytics, communication, and workflows to the person currently logged in.</p>
            <div className="hero-actions">
              <button><CreditCard /> {role === "Owner" ? "Approve expense" : "Record payment"}</button>
              <button onClick={generateVisitorQr}><QrCode /> {visitorQr.code ? "Regenerate Visitor QR" : "Visitor QR"}</button>
              <button onClick={() => onSendPushAlert("Urgent property alert: visitor access control update.")}><Smartphone /> Push alert</button>
            </div>
            {visitorQr.code && (
              <>
                <div className={`qr-panel ${isExpired ? "expired" : "active"}`}>
                  <strong>Visitor access code</strong>
                  <code>{visitorQr.code}</code>
                  <span>{isExpired ? "Expired" : `Expires ${expiresAt?.toLocaleString()}`}</span>
                </div>
                <div className="qr-actions">
                  <button className="secondary-action" onClick={downloadVisitorQr}><Download /> Download QR</button>
                  <button className="secondary-action" onClick={printVisitorQr}><Printer /> Print QR</button>
                </div>
              </>
            )}
          </div>
          <div className="glass-console">
            <div className="console-line"><CheckCircle2 /> RBAC policy active</div>
            <div className="console-line"><Activity /> Live portfolio events synced</div>
            <div className="console-line"><PlugZap /> Smart integrations healthy</div>
            <div className="risk-score">
              <span>Risk index</span>
              <strong>{role === "Super Admin" ? "3%" : "14%"}</strong>
              <small>{role === "Super Admin" ? "Platform risk is stable" : "Low risk, stable payment pattern"}</small>
            </div>
          </div>
        </section>
      )}
      <MobileRentFlowHome role={role} currency={currency} />
      <section className="stats-grid">
        {stats.slice(0, 2).map((stat) => <StatCard key={stat.label} {...stat} currency={currency} />)}
      </section>
      <DashboardSnapshot role={role} />
      <DashboardShortcuts role={role} onNavigate={onNavigate} />
        </>
      )}
    </>
  );
}

function TenantOverview({ currency }: { currency: Currency }) {
  return (
    <>
      <article className="panel large">
        <div className="panel-heading">
          <div><span>My lease</span><h3>Unit A-12 status</h3></div>
          <button>Download lease</button>
        </div>
        <div className="tenant-summary">
          <div><strong>{formatMoney(2000, currency)}</strong><span>Rent balance</span></div>
          <div><strong>22 days</strong><span>Next due date</span></div>
          <div><strong>2</strong><span>Open tickets</span></div>
          <div><strong>Active</strong><span>Lease agreement</span></div>
        </div>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><span>Utilities</span><h3>Bills due</h3></div></div>
        <div className="bill-grid tenant-bills">
          {dueBills.map((bill) => <div className={`bill-card ${bill.tone}`} key={bill.vendor}><i /><strong>{bill.vendor}</strong><span>{bill.date}</span><b>{formatMoney(bill.usdAmount, currency)}</b></div>)}
        </div>
      </article>
    </>
  );
}

function PortfolioOverview({ role }: { role: Role }) {
  return (
    <>
      <article className="panel large">
        <div className="panel-heading">
          <div><span>{role === "Super Admin" ? "Platform" : "Revenue and cashflow"}</span><h3>{role === "Super Admin" ? "Global performance" : "Portfolio performance"}</h3></div>
          <button>Export</button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenue}>
            <defs>
              <linearGradient id="rent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Area type="monotone" dataKey="rent" stroke="#38bdf8" fill="url(#rent)" />
            <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </article>
      <article className="panel">
        <div className="panel-heading"><div><span>Units</span><h3>Occupancy mix</h3></div></div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={occupancy} dataKey="value" innerRadius={62} outerRadius={94} paddingAngle={4}>
              {occupancy.map((item) => <Cell key={item.name} fill={item.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="legend">{occupancy.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div>
      </article>
    </>
  );
}

function PropertiesPage({
  role,
  currency,
  properties,
  units,
  tenants,
  expenses,
  onCreateListing,
  onCreateUnit,
  onCreateTenant,
  onUpdateUnit,
  onRecordExpense,
  onUploadAgreementTemplate,
  onGenerateLeaseDocuments
}: {
  role: Role;
  currency: Currency;
  properties: ServerProperty[];
  units: ServerUnit[];
  tenants: ServerTenant[];
  expenses: ServerExpense[];
  onCreateListing: (payload: Record<string, unknown>) => Promise<ServerProperty | undefined>;
  onCreateUnit: (payload: Record<string, unknown>) => Promise<ServerUnit | null>;
  onCreateTenant: (payload: { name: string; email: string; phone: string }) => Promise<ServerTenant | null>;
  onUpdateUnit: (payload: { unitId: string; status?: string; tenantId?: string }) => Promise<ServerUnit | null>;
  onRecordExpense: (payload: { propertyId: string; category: string; description: string; amount: number; receiptUrl?: string }) => Promise<ServerExpense | null>;
  onUploadAgreementTemplate: (payload: Record<string, unknown>) => Promise<unknown>;
  onGenerateLeaseDocuments: (payload: { propertyId: string; unitIds?: string[] }) => Promise<Array<{ unitId: string; tenantId?: string; tenantName: string; renderedText: string; fileName: string }>>;
}) {
  const [listingForm, setListingForm] = useState({
    name: "",
    address: "",
    street: "",
    location: "",
    electricityPrice: "",
    garbagePrice: "",
    waterPrice: "",
    propertyType: "Apartments",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contractFee: "",
    managementQuote: "",
    valuation: "",
    templateName: "Standard lease agreement",
    templateFileName: "lease-agreement-template.docx",
    templateText: "This lease agreement is between {{tenantName}} and {{propertyName}} for unit {{unitLabel}} at {{propertyAddress}} with monthly rent of {{rentAmount}}."
  });
  const [unitsForm, setUnitsForm] = useState<Array<{ label: string; rent: string; deposit: string; leaseMonths: string; status: string }>>([
    { label: "", rent: "", deposit: "", leaseMonths: "12", status: "vacant" }
  ]);
  const [listingStatus, setListingStatus] = useState("");
  const [leaseStatus, setLeaseStatus] = useState("");
  const [generatedLeases, setGeneratedLeases] = useState<Array<{ unitId: string; tenantId?: string; tenantName: string; renderedText: string; fileName: string }>>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id ?? "");
  const [selectedUnitId, setSelectedUnitId] = useState(units.find((unit) => unit.propertyId === properties[0]?.id)?.id ?? "");
  const [tenantForm, setTenantForm] = useState({ name: "", email: "", phone: "" });
  const [unitUpdateForm, setUnitUpdateForm] = useState({ propertyId: properties[0]?.id ?? "", unitId: selectedUnitId, tenantId: "", status: "vacant" });
  const [expenseForm, setExpenseForm] = useState({ propertyId: properties[0]?.id ?? "", category: "Maintenance", description: "", amount: "", receiptUrl: "" });
  const [tenantStatus, setTenantStatus] = useState("");
  const [unitStatus, setUnitStatus] = useState("");
  const [expenseStatus, setExpenseStatus] = useState("");

  useEffect(() => {
    const propertyUnits = units.filter((unit) => unit.propertyId === selectedPropertyId);
    if (!propertyUnits.find((unit) => unit.id === selectedUnitId)) {
      setSelectedUnitId(propertyUnits[0]?.id ?? "");
    }
    if (!unitUpdateForm.propertyId) {
      setUnitUpdateForm((current) => ({ ...current, propertyId: selectedPropertyId, unitId: propertyUnits[0]?.id ?? "" }));
    }
  }, [selectedPropertyId, selectedUnitId, units]);

  async function generateLeasePackage() {
    if (!selectedPropertyId) {
      setLeaseStatus("Choose a property before generating leases.");
      return;
    }
    setLeaseStatus("Generating lease documents for occupied units...");
    const leases = await onGenerateLeaseDocuments({ propertyId: selectedPropertyId });
    if (leases.length === 0) {
      setLeaseStatus("No occupied units found for this property, or no template is available.");
      return;
    }
    setGeneratedLeases(leases);
    leases.forEach((lease) => {
      downloadFile(lease.fileName, lease.renderedText);
    });
    setLeaseStatus(`Generated and downloaded ${leases.length} lease document${leases.length === 1 ? "" : "s"}.`);
  }

  async function onboardTenant() {
    if (!tenantForm.name || !tenantForm.email || !tenantForm.phone) {
      setTenantStatus("Enter name, email, and phone to onboard a tenant.");
      return;
    }
    const tenant = await onCreateTenant({ name: tenantForm.name, email: tenantForm.email, phone: tenantForm.phone });
    if (!tenant) {
      setTenantStatus("Tenant onboarding failed. Check the form and try again.");
      return;
    }
    setTenantStatus(`Tenant ${tenant.name} onboarded.`);
    setTenantForm({ name: "", email: "", phone: "" });
  }

  async function assignUnit() {
    if (!unitUpdateForm.unitId) {
      setUnitStatus("Choose a unit before assigning it.");
      return;
    }
    const updated = await onUpdateUnit({ unitId: unitUpdateForm.unitId, status: unitUpdateForm.status, tenantId: unitUpdateForm.tenantId || undefined });
    if (!updated) {
      setUnitStatus("Failed to update unit status or assignment.");
      return;
    }
    setUnitStatus(`Unit ${updated.label} updated successfully.`);
  }

  async function recordExpenseEntry() {
    if (!expenseForm.propertyId || !expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      setExpenseStatus("Complete the expense form before recording it.");
      return;
    }
    const amount = Number(expenseForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setExpenseStatus("Enter a valid numeric expense amount.");
      return;
    }
    const expense = await onRecordExpense({
      propertyId: expenseForm.propertyId,
      category: expenseForm.category,
      description: expenseForm.description,
      amount,
      receiptUrl: expenseForm.receiptUrl || undefined
    });
    if (!expense) {
      setExpenseStatus("Expense recording failed. Try again.");
      return;
    }
    setExpenseStatus(`Recorded ${expense.category.toLowerCase()} expense for ${expense.propertyName || expense.propertyId}.`);
    setExpenseForm({ ...expenseForm, description: "", amount: "", receiptUrl: "" });
  }

  const selectedProperty = properties.find((property) => property.id === selectedPropertyId);
  const selectedPropertyUnits = units.filter((unit) => unit.propertyId === selectedPropertyId);
  const occupiedUnits = selectedPropertyUnits.filter((unit) => unit.status === "occupied").length;
  const maintenanceUnits = selectedPropertyUnits.filter((unit) => unit.status === "maintenance").length;
  const vacantUnits = selectedPropertyUnits.filter((unit) => unit.status === "vacant").length;

  async function addUnitRow() {
    setUnitsForm((current) => [...current, { label: "", rent: "", deposit: "", leaseMonths: "12", status: "vacant" }]);
  }

  async function createListing() {
    if (!listingForm.name || !listingForm.address) {
      setListingStatus("Enter the property name and address first.");
      return;
    }
    try {
      const property = await onCreateListing({
        name: listingForm.name,
        address: listingForm.address,
        street: listingForm.street,
        location: listingForm.location,
        electricityPrice: listingForm.electricityPrice,
        garbagePrice: listingForm.garbagePrice,
        waterPrice: listingForm.waterPrice,
        propertyType: listingForm.propertyType,
        contactName: listingForm.contactName,
        contactPhone: listingForm.contactPhone,
        contactEmail: listingForm.contactEmail,
        contractFee: Number(listingForm.contractFee || 0),
        managementQuote: listingForm.managementQuote,
        valuation: Number(listingForm.valuation || 0),
        agreementTemplateUrl: `https://rentflow.local/templates/${listingForm.templateFileName}`
      });
      if (!property) throw new Error("Could not create listing.");
      await onUploadAgreementTemplate({
        propertyId: property.id,
        name: listingForm.templateName,
        fileName: listingForm.templateFileName,
        templateText: listingForm.templateText
      });
      for (const unit of unitsForm) {
        if (!unit.label || !unit.rent) continue;
        await onCreateUnit({
          propertyId: property.id,
          label: unit.label,
          rent: Number(unit.rent),
          deposit: Number(unit.deposit || 0),
          leaseMonths: Number(unit.leaseMonths || 12),
          status: unit.status
        });
      }
      setListingStatus(`Listing created for ${property.name}. ${unitsForm.length} units added.`);
      setListingForm({ ...listingForm, name: "", address: "", street: "", location: "", electricityPrice: "", garbagePrice: "", waterPrice: "", contractFee: "", managementQuote: "", valuation: "" });
      setUnitsForm([{ label: "", rent: "", deposit: "", leaseMonths: "12", status: "vacant" }]);
    } catch (error) {
      setListingStatus(error instanceof Error ? error.message : "Create listing failed.");
    }
  }

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Tenant" ? "My occupancy" : "Property operations"}</span><h3>{role === "Tenant" ? "Unit overview" : "Properties"}</h3></div>
          {role !== "Tenant" && <button onClick={() => setListingStatus("Start a new property listing below.")}>Add listing</button>}
        </div>
        {role === "Tenant" ? (
          <div className="tenant-selection-panel">
            <div className="selection-row">
              <label>
                Select listing
                <select value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)}>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Select room
                <select value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)}>
                  {units.filter((unit) => unit.propertyId === selectedPropertyId).map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="tenant-room-summary">
              <strong>{units.find((unit) => unit.id === selectedUnitId)?.label ?? "No room selected"}</strong>
              <span>{properties.find((property) => property.id === selectedPropertyId)?.name ?? "No listing selected"}</span>
            </div>
          </div>
        ) : (
          <div className="property-portfolio-grid">
            {properties.map((property) => {
              const propertyUnits = units.filter((unit) => unit.propertyId === property.id);
              const occupied = propertyUnits.filter((unit) => unit.status === "occupied").length;
              const maintenance = propertyUnits.filter((unit) => unit.status === "maintenance").length;
              const vacant = propertyUnits.filter((unit) => unit.status === "vacant").length;
              return (
                <div key={property.id} className="property-stat-card">
                  <strong>{property.name}</strong>
                  <span>{propertyUnits.length} total units</span>
                  <small>{occupied} occupied • {vacant} vacant • {maintenance} in maintenance</small>
                </div>
              );
            })}
          </div>
        )}
        {role !== "Tenant" && selectedProperty && (
          <div className="lease-generation-panel">
            <button className="secondary-action" onClick={generateLeasePackage}>Generate tenant leases</button>
            {leaseStatus && <p className="status-note">{leaseStatus}</p>}
            {generatedLeases.length > 0 && (
              <div className="lease-preview-grid">
                {generatedLeases.slice(0, 3).map((lease) => (
                  <div key={lease.unitId} className="lease-preview-card">
                    <strong>{lease.tenantName}</strong>
                    <span>{lease.fileName}</span>
                    <pre>{lease.renderedText.slice(0, 120)}...</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {role !== "Tenant" && (
          <div className="management-ops-grid">
            <article className="panel form-panel onboard-panel">
              <div className="panel-heading"><div><span>Onboard tenants</span><h3>Quick tenant registration</h3></div></div>
              <label>Name<input value={tenantForm.name} onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })} placeholder="Amina Otieno" /></label>
              <label>Email<input value={tenantForm.email} onChange={(event) => setTenantForm({ ...tenantForm, email: event.target.value })} placeholder="tenant@rentflow.app" /></label>
              <label>Phone<input value={tenantForm.phone} onChange={(event) => setTenantForm({ ...tenantForm, phone: event.target.value })} placeholder="+254700000101" /></label>
              <button className="primary-action" onClick={onboardTenant}>Onboard tenant</button>
              {tenantStatus && <p className="status-note">{tenantStatus}</p>}
            </article>

            <article className="panel form-panel manage-unit-panel">
              <div className="panel-heading"><div><span>Manage units</span><h3>Assign tenant and status</h3></div></div>
              <label>Property<select value={unitUpdateForm.propertyId} onChange={(event) => {
                const propertyId = event.target.value;
                const propertyUnits = units.filter((unit) => unit.propertyId === propertyId);
                setUnitUpdateForm({
                  ...unitUpdateForm,
                  propertyId,
                  unitId: propertyUnits[0]?.id ?? "",
                  tenantId: unitUpdateForm.tenantId
                });
              }}>
                {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </select></label>
              <label>Unit<select value={unitUpdateForm.unitId} onChange={(event) => setUnitUpdateForm({ ...unitUpdateForm, unitId: event.target.value })}>
                {units.filter((unit) => unit.propertyId === unitUpdateForm.propertyId).map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.label}</option>
                ))}
              </select></label>
              <label>Tenant<select value={unitUpdateForm.tenantId} onChange={(event) => setUnitUpdateForm({ ...unitUpdateForm, tenantId: event.target.value })}>
                <option value="">Unassigned</option>
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select></label>
              <label>Status<select value={unitUpdateForm.status} onChange={(event) => setUnitUpdateForm({ ...unitUpdateForm, status: event.target.value })}>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select></label>
              <button className="primary-action" onClick={assignUnit}>Save unit assignment</button>
              {unitStatus && <p className="status-note">{unitStatus}</p>}
            </article>
          </div>
        )}
        {role !== "Tenant" && (
          <article className="panel form-panel expense-panel">
            <div className="panel-heading"><div><span>Record expenses</span><h3>Track property spend</h3></div></div>
            <div className="form-grid">
              <label>Property<select value={expenseForm.propertyId} onChange={(event) => setExpenseForm({ ...expenseForm, propertyId: event.target.value })}>
                {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </select></label>
              <label>Category<select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}>
                <option value="Maintenance">Maintenance</option>
                <option value="Utilities">Utilities</option>
                <option value="Repairs">Repairs</option>
                <option value="Supplies">Supplies</option>
              </select></label>
              <label>Description<textarea value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} placeholder="Repair or vendor expense details." rows={3} /></label>
              <label>Amount<input value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="2200" /></label>
              <label>Receipt URL<input value={expenseForm.receiptUrl} onChange={(event) => setExpenseForm({ ...expenseForm, receiptUrl: event.target.value })} placeholder="https://rentflow.local/receipts/exp_123.pdf" /></label>
            </div>
            <button className="primary-action" onClick={recordExpenseEntry}>Record expense</button>
            {expenseStatus && <p className="status-note">{expenseStatus}</p>}
            <div className="expense-summary">
              <h4>Recent expenses</h4>
              {expenses.length > 0 ? expenses.slice(0, 4).map((expense) => (
                <div key={expense.id} className="expense-row">
                  <span><strong>{expense.category}</strong><small>{expense.propertyName ?? expense.propertyId}</small></span>
                  <b>{formatMoney(expense.amount, currency)}</b>
                </div>
              )) : <p className="status-note">No expenses recorded yet.</p>}
            </div>
          </article>
        )}
        <div className="responsive-table">
          {properties.map((property) => (
            <div className="property-row" key={property.id}>
              <span><strong>{property.name}</strong><small>{property.location ?? property.address}</small></span>
              <b>{units.filter((unit) => unit.propertyId === property.id).length} units</b>
              <em>{property.electricityPrice || "No utility pricing"}</em>
              <div className="property-meta">
                <span>{property.street ? `${property.street},` : ""} {property.location}</span>
                <span>Contract fee: {property.contractFee ? `${formatMoney(property.contractFee, currency)}` : "N/A"}</span>
                <span>Management: {property.managementQuote ?? "TBD"}</span>
              </div>
              <button className={role === "Tenant" ? "locked-action" : ""}>{role === "Tenant" ? "View only" : "Manage"}</button>
            </div>
          ))}
          {role !== "Tenant" && selectedProperty && (
            <div className="unit-status-table">
              <div className="unit-status-header">
                <strong>{selectedProperty.name} units</strong>
                <span>{occupiedUnits} occupied, {vacantUnits} vacant, {maintenanceUnits} in maintenance</span>
              </div>
              {selectedPropertyUnits.map((unit) => (
                <div key={unit.id} className="unit-row">
                  <span>{unit.label}</span>
                  <strong>{unit.status.replace("_", " ")}</strong>
                  <em>{unit.tenantId ? `Tenant: ${unit.tenantId}` : "No tenant assigned"}</em>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      {role !== "Tenant" && (
        <article className="panel form-panel">
          <div className="panel-heading"><div><span>New property listing</span><h3>Professional listing setup</h3></div></div>
          <div className="form-grid">
            <label>Name<input value={listingForm.name} onChange={(event) => setListingForm({ ...listingForm, name: event.target.value })} placeholder="Westlands Heights" /></label>
            <label>Address<input value={listingForm.address} onChange={(event) => setListingForm({ ...listingForm, address: event.target.value })} placeholder="Waiyaki Way, Nairobi" /></label>
            <label>Property type<select value={listingForm.propertyType} onChange={(event) => setListingForm({ ...listingForm, propertyType: event.target.value })}>
              <option value="Apartments">Apartments</option>
              <option value="Business centre">Business centre</option>
              <option value="Stalls">Stalls</option>
              <option value="Mixed use">Mixed use</option>
            </select></label>
            <label>Street<input value={listingForm.street} onChange={(event) => setListingForm({ ...listingForm, street: event.target.value })} placeholder="Waiyaki Way" /></label>
            <label>Location<input value={listingForm.location} onChange={(event) => setListingForm({ ...listingForm, location: event.target.value })} placeholder="Westlands" /></label>
            <label>Contact name<input value={listingForm.contactName} onChange={(event) => setListingForm({ ...listingForm, contactName: event.target.value })} placeholder="Property manager" /></label>
            <label>Contact phone<input value={listingForm.contactPhone} onChange={(event) => setListingForm({ ...listingForm, contactPhone: event.target.value })} placeholder="+254700000102" /></label>
            <label>Contact email<input value={listingForm.contactEmail} onChange={(event) => setListingForm({ ...listingForm, contactEmail: event.target.value })} placeholder="manager@rentflow.app" /></label>
            <label>Electricity price<input value={listingForm.electricityPrice} onChange={(event) => setListingForm({ ...listingForm, electricityPrice: event.target.value })} placeholder="KES 25/unit" /></label>
            <label>Garbage price<input value={listingForm.garbagePrice} onChange={(event) => setListingForm({ ...listingForm, garbagePrice: event.target.value })} placeholder="KES 4/unit" /></label>
            <label>Water price<input value={listingForm.waterPrice} onChange={(event) => setListingForm({ ...listingForm, waterPrice: event.target.value })} placeholder="KES 8/unit" /></label>
            <label>Electricity price<input value={listingForm.electricityPrice} onChange={(event) => setListingForm({ ...listingForm, electricityPrice: event.target.value })} placeholder="KES 25/unit" /></label>
            <label>Garbage price<input value={listingForm.garbagePrice} onChange={(event) => setListingForm({ ...listingForm, garbagePrice: event.target.value })} placeholder="KES 4/unit" /></label>
            <label>Water price<input value={listingForm.waterPrice} onChange={(event) => setListingForm({ ...listingForm, waterPrice: event.target.value })} placeholder="KES 8/unit" /></label>
            <label>Contract fee<input value={listingForm.contractFee} onChange={(event) => setListingForm({ ...listingForm, contractFee: event.target.value })} placeholder="2200" /></label>
            <label>Management quote<input value={listingForm.managementQuote} onChange={(event) => setListingForm({ ...listingForm, managementQuote: event.target.value })} placeholder="10% monthly" /></label>
            <label>Valuation<input value={listingForm.valuation} onChange={(event) => setListingForm({ ...listingForm, valuation: event.target.value })} placeholder="4200000" /></label>
            <label>Template name<input value={listingForm.templateName} onChange={(event) => setListingForm({ ...listingForm, templateName: event.target.value })} /></label>
            <label>Template file name<input value={listingForm.templateFileName} onChange={(event) => setListingForm({ ...listingForm, templateFileName: event.target.value })} /></label>
          </div>
          <label>Agreement template<textarea value={listingForm.templateText} onChange={(event) => setListingForm({ ...listingForm, templateText: event.target.value })} rows={4} /></label>
          <div className="unit-grid">
            {unitsForm.map((unit, index) => (
              <div key={index} className="unit-card">
                <label>Room number<label><input value={unit.label} onChange={(event) => {
                    const next = [...unitsForm];
                    next[index].label = event.target.value;
                    setUnitsForm(next);
                  }} placeholder="A-01" /></label></label>
                <label>Rent amount<input value={unit.rent} onChange={(event) => {
                    const next = [...unitsForm];
                    next[index].rent = event.target.value;
                    setUnitsForm(next);
                  }} placeholder="840" /></label>
                <label>Deposit<input value={unit.deposit} onChange={(event) => {
                    const next = [...unitsForm];
                    next[index].deposit = event.target.value;
                    setUnitsForm(next);
                  }} placeholder="840" /></label>
                <label>Lease months<input value={unit.leaseMonths} onChange={(event) => {
                    const next = [...unitsForm];
                    next[index].leaseMonths = event.target.value;
                    setUnitsForm(next);
                  }} placeholder="12" /></label>
                <label>Status<select value={unit.status} onChange={(event) => {
                    const next = [...unitsForm];
                    next[index].status = event.target.value;
                    setUnitsForm(next);
                  }}>
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select></label>
              </div>
            ))}
          </div>
          <button className="primary-action" onClick={addUnitRow}>Add another unit</button>
          <button className="primary-action" onClick={createListing}>Create listing</button>
          {listingStatus && <p className="status-note">{listingStatus}</p>}
        </article>
      )}

      <PrivilegePanel role={role} />
    </section>
  );
}

function PaymentsPage({ role, currency, payments, onMakePayment, onApprovePayment }: { role: Role; currency: Currency; payments: ServerPayment[]; onMakePayment: (payload: { amount: number; method: "mpesa" | "mobile_money" | "bank" | "card"; accountName?: string; accountNumber?: string; bankName?: string; phoneNumber?: string; cardNumber?: string; expiry?: string; cvc?: string; }) => Promise<ServerPayment | null>; onApprovePayment: (payload: { paymentId: string; status?: string }) => Promise<ServerPayment | null>; }) {
  const [paymentMode, setPaymentMode] = useState<"mpesa" | "mobile_money" | "bank" | "card">("bank");
  const [bankForm, setBankForm] = useState({ bankName: "", accountName: "", accountNumber: "", routingNumber: "" });
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvc: "" });
  const [paymentStatus, setPaymentStatus] = useState("Ready to process rent payment.");
  const [latestReceipt, setLatestReceipt] = useState<string | null>(null);
  const canPay = role === "Tenant";

  async function handlePay() {
    if (!canPay) {
      setPaymentStatus("Only tenants can make payments from this page.");
      return;
    }

    if (paymentMode === "bank") {
      if (!bankForm.bankName || !bankForm.accountName || !bankForm.accountNumber) {
        setPaymentStatus("Add bank name, account name, and account number first.");
        return;
      }
      const payment = await onMakePayment({ amount: 2000, method: "bank", bankName: bankForm.bankName, accountName: bankForm.accountName, accountNumber: bankForm.accountNumber });
      if (payment) {
        setLatestReceipt(payment.receiptNumber);
        setPaymentStatus(`Payment successful. Receipt ${payment.receiptNumber} is available in reports.`);
      } else {
        setPaymentStatus("Failed to submit bank payment. Try again.");
      }
      return;
    }

    if (paymentMode === "mpesa" || paymentMode === "mobile_money") {
      if (!mpesaPhone.trim()) {
        setPaymentStatus("Enter a mobile money phone number first.");
        return;
      }
      const payment = await onMakePayment({ amount: 2000, method: paymentMode === "mpesa" ? "mpesa" : "mobile_money", phoneNumber: mpesaPhone.trim() });
      if (payment) {
        setLatestReceipt(payment.receiptNumber);
        setPaymentStatus(`${paymentMode === "mpesa" ? "M-Pesa" : "Airtel Money"} payment queued. Receipt ${payment.receiptNumber} is available in reports.`);
      } else {
        setPaymentStatus("Failed to request mobile money payment. Try again.");
      }
      return;
    }

    if (paymentMode === "card") {
      if (!cardForm.number || !cardForm.expiry || !cardForm.cvc) {
        setPaymentStatus("Enter card number, expiry, and CVC first.");
        return;
      }
      const payment = await onMakePayment({ amount: 2000, method: "card", cardNumber: cardForm.number, expiry: cardForm.expiry, cvc: cardForm.cvc });
      if (payment) {
        setLatestReceipt(payment.receiptNumber);
        setPaymentStatus(`Card payment authorized. Receipt ${payment.receiptNumber} is available in reports.`);
      } else {
        setPaymentStatus("Card payment authorization failed. Try again.");
      }
      return;
    }
  }

  async function approvePayment(paymentId: string) {
    const payment = await onApprovePayment({ paymentId, status: "approved" });
    if (payment) {
      setPaymentStatus(`Payment ${payment.receiptNumber} approved.`);
    } else {
      setPaymentStatus("Failed to approve payment.");
    }
  }

  function selectPaymentMode(mode: "mpesa" | "mobile_money" | "bank" | "card") {
    setPaymentMode(mode);
    setPaymentStatus(`Switched to ${mode === "mpesa" ? "M-Pesa" : mode === "mobile_money" ? "Airtel Money" : mode === "bank" ? "bank account" : "card"} payment.`);
  }

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Tenant" ? "My payments" : "Collections"}</span><h3>{role === "Tenant" ? "Rent and receipts" : "Rent collection monitor"}</h3></div>
          <button onClick={handlePay}>{role === "Tenant" ? "Pay now" : "Reconcile"}</button>
        </div>
        <div className="table">
          {payments.length > 0 ? payments.map((item) => (
            <div className="table-row" key={item.receiptNumber}>
              <span>{role === "Tenant" ? "My account" : item.tenantId}<small>{item.unitId ?? "Unit"} - {item.method}</small></span>
              <strong>{formatMoney(item.amount, currency)}</strong>
              <em className={item.status.toLowerCase()}>{item.status}</em>
              <div className="row-actions">
                {role !== "Tenant" && item.status !== "approved" ? (
                  <button className="secondary-action" onClick={() => approvePayment(item.id)}>Approve</button>
                ) : null}
                <button className="secondary-action" onClick={() => downloadFile(`receipt-${item.receiptNumber}.txt`, `Receipt: ${item.receiptNumber}\nAmount: ${formatMoney(item.amount, currency)}\nMethod: ${item.method}\nStatus: ${item.status}\nUnit: ${item.unitId ?? "N/A"}\nDate: ${new Date().toLocaleString()}`)}>Download receipt</button>
              </div>
            </div>
          )) : <div className="table-row empty"><span>No payments available yet.</span></div>}
        </div>
      </article>
      <article className="panel payment-method-panel">
        <div className="panel-heading"><div><span>{canPay ? "Pay rent" : "Payment settings"}</span><h3>Payment mode</h3></div></div>
        <div className="payment-mode-grid">
          {[
            ["mpesa", "M-Pesa"],
            ["mobile_money", "Airtel Money"],
            ["bank", "Bank account"],
            ["card", "Card"]
          ].map(([mode, label]) => (
            <button key={mode} className={paymentMode === mode ? "selected" : ""} onClick={() => selectPaymentMode(mode as "mpesa" | "mobile_money" | "bank" | "card") }>
              {label}
            </button>
          ))}
        </div>
        {paymentMode === "bank" && (
          <div className="bank-form">
            <label>Bank name<input placeholder="Equity Bank" value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} /></label>
            <label>Account name<input placeholder="Amina Otieno" value={bankForm.accountName} onChange={(event) => setBankForm({ ...bankForm, accountName: event.target.value })} /></label>
            <label>Account number<input placeholder="0123456789" value={bankForm.accountNumber} onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value })} /></label>
            <label>Branch / routing code<input placeholder="Optional" value={bankForm.routingNumber} onChange={(event) => setBankForm({ ...bankForm, routingNumber: event.target.value })} /></label>
            <button className="primary-action" onClick={handlePay}>{canPay ? `Debit ${formatMoney(2000, currency)}` : "Save bank route"}</button>
          </div>
        )}
        {(paymentMode === "mpesa" || paymentMode === "mobile_money") && (
          <div className="bank-form">
            <div className="method-note"><Smartphone /> Enter the mobile money phone number. A request will be sent for approval.</div>
            <label>Phone number<input placeholder="+254700000101" value={mpesaPhone} onChange={(event) => setMpesaPhone(event.target.value)} /></label>
            <button className="primary-action" onClick={handlePay}>{canPay ? `Pay ${formatMoney(2000, currency)} via ${paymentMode === "mpesa" ? "M-Pesa" : "Airtel Money"}` : `Save ${paymentMode === "mpesa" ? "M-Pesa" : "Airtel Money"} route`}</button>
          </div>
        )}
        {paymentMode === "card" && (
          <div className="bank-form">
            <div className="method-note"><CreditCard /> Card payment opens a secure card form and tokenizes the card.</div>
            <label>Card number<input placeholder="4111 1111 1111 1111" value={cardForm.number} onChange={(event) => setCardForm({ ...cardForm, number: event.target.value })} /></label>
            <label>Expiry<input placeholder="MM/YY" value={cardForm.expiry} onChange={(event) => setCardForm({ ...cardForm, expiry: event.target.value })} /></label>
            <label>CVC<input placeholder="123" value={cardForm.cvc} onChange={(event) => setCardForm({ ...cardForm, cvc: event.target.value })} /></label>
            <button className="primary-action" onClick={handlePay}>{canPay ? `Pay ${formatMoney(2000, currency)} with card` : "Save card route"}</button>
          </div>
        )}
        <p className="status-note">{paymentStatus}{latestReceipt ? ` Receipt: ${latestReceipt}` : ""}</p>
      </article>
    </section>
  );
}

function MaintenancePage({ role, maintenanceData, onSubmitMaintenance, onUpdateMaintenance }: { role: Role; maintenanceData: ServerMaintenanceTicket[]; onSubmitMaintenance: (payload: { title: string; priority: string; description: string }) => Promise<ServerMaintenanceTicket | null>; onUpdateMaintenance: (payload: { ticketId: string; status?: string; assignedTo?: string; vendorName?: string; followUp?: string }) => Promise<ServerMaintenanceTicket | null>; }) {
  const [request, setRequest] = useState({ title: "", priority: "medium", description: "" });
  const [submitted, setSubmitted] = useState("");
  const [tickets, setTickets] = useState<ServerMaintenanceTicket[]>(maintenanceData);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTicketId, setActiveTicketId] = useState(maintenanceData[0]?.id ?? "");
  const [ticketAction, setTicketAction] = useState({ status: "assigned", assignedTo: "", vendorName: "", followUp: "" });

  useEffect(() => {
    setTickets(maintenanceData);
    setActiveTicketId((current) => current || (maintenanceData[0]?.id ?? ""));
  }, [maintenanceData]);

  useEffect(() => {
    const active = tickets.find((ticket) => ticket.id === activeTicketId) ?? tickets[0];
    if (active) {
      setTicketAction({ status: active.status || "assigned", assignedTo: active.assignedTo || active.vendorName || "", vendorName: active.vendorName || "", followUp: "" });
    }
  }, [activeTicketId, tickets]);

  async function submitRequest() {
    if (!request.title) {
      setSubmitted("Add an issue title first.");
      return;
    }
    const created = await onSubmitMaintenance(request);
    if (created) {
      setTickets((current) => [created, ...current]);
      setSubmitted(`Maintenance request submitted: ${request.title}.`);
      setRequest({ title: "", priority: "medium", description: "" });
      setActiveTicketId(created.id);
    } else {
      setSubmitted("Failed to submit maintenance request. Try again.");
    }
  }

  async function applyTicketUpdate() {
    if (!activeTicketId) {
      setSubmitted("Select a ticket to update.");
      return;
    }
    const updated = await onUpdateMaintenance({
      ticketId: activeTicketId,
      status: ticketAction.status,
      assignedTo: ticketAction.assignedTo || undefined,
      vendorName: ticketAction.vendorName || undefined,
      followUp: ticketAction.followUp || undefined
    });
    if (updated) {
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      setSubmitted(`Updated work order ${updated.title} to ${updated.status}.`);
      setTicketAction((current) => ({ ...current, followUp: "" }));
    } else {
      setSubmitted("Updating the ticket failed. Check the fields and try again.");
    }
  }

  const filteredTickets = statusFilter === "all" ? tickets : tickets.filter((ticket) => ticket.status === statusFilter);
  const activeTicket = filteredTickets.find((ticket) => ticket.id === activeTicketId) ?? filteredTickets[0] ?? tickets.find((ticket) => ticket.id === activeTicketId);

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Tenant" ? "My requests" : "Maintenance desk"}</span><h3>{role === "Tenant" ? "Tickets and repairs" : "Work orders"}</h3></div>
          {role !== "Tenant" && (
            <div className="filter-row">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <button onClick={() => setStatusFilter("all")}>Reset filter</button>
            </div>
          )}
        </div>
        <div className="ticket-list">
          {filteredTickets.length > 0 ? filteredTickets.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeTicket?.id ? "ticket active-ticket" : "ticket"}
              onClick={() => setActiveTicketId(item.id)}
            >
              <Wrench />
              <div>
                <strong>{item.title}</strong>
                <span>{item.priority} • {item.status}</span>
                <small>{item.unitId} / {item.propertyId}</small>
                <small>{item.createdAt ? formatDateTime(item.createdAt) : "Recent"}</small>
              </div>
              <div className="ticket-meta">
                <em>{item.assignedTo || item.vendorName ? `Assigned to ${item.assignedTo || item.vendorName}` : "Awaiting assignment"}</em>
                {item.followUps?.length ? <b>{item.followUps.length} follow-up{item.followUps.length > 1 ? "s" : ""}</b> : null}
              </div>
            </button>
          )) : <div className="ticket empty"><p>No maintenance tickets have been reported yet.</p></div>}
        </div>
      </article>

      {role !== "Tenant" ? (
        <article className="panel form-panel">
          <div className="panel-heading"><div><span>Work order details</span><h3>{activeTicket ? activeTicket.title : "Select a ticket"}</h3></div></div>
          {activeTicket ? (
            <>
              <div className="ticket-summary">
                <strong>{activeTicket.title}</strong>
                <div>
                  <span>{activeTicket.priority} priority</span>
                  <span>Status: {activeTicket.status}</span>
                  <span>Unit: {activeTicket.unitId}</span>
                  <span>Tenant: {activeTicket.tenantId}</span>
                </div>
              </div>
              <label>Status<select value={ticketAction.status} onChange={(event) => setTicketAction({ ...ticketAction, status: event.target.value })}>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select></label>
              <label>Assign worker<input value={ticketAction.assignedTo} onChange={(event) => setTicketAction({ ...ticketAction, assignedTo: event.target.value })} placeholder="Field technician or vendor" /></label>
              <label>Vendor name<input value={ticketAction.vendorName} onChange={(event) => setTicketAction({ ...ticketAction, vendorName: event.target.value })} placeholder="Apex Plumbing, SecurePro" /></label>
              <label>Work notes<textarea rows={3} value={ticketAction.followUp} onChange={(event) => setTicketAction({ ...ticketAction, followUp: event.target.value })} placeholder="Add progress updates or completion notes." /></label>
              <button className="primary-action" onClick={applyTicketUpdate}>Save work order</button>
              {submitted && <p className="status-note">{submitted}</p>}
              {activeTicket.mediaUrls.length > 0 && (
                <div className="media-preview">
                  <span>Attachments</span>
                  <div className="media-grid">
                    {activeTicket.mediaUrls.map((url) => (
                      <img key={url} src={url} alt="Issue attachment" />
                    ))}
                  </div>
                </div>
              )}
              {activeTicket.followUps?.length ? (
                <div className="activity-log">
                  <span>Follow-up history</span>
                  {activeTicket.followUps.map((followUp) => (
                    <div key={followUp.createdAt} className="log-entry">
                      <strong>{followUp.author}</strong>
                      <small>{formatDateTime(followUp.createdAt)}</small>
                      <p>{followUp.note}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Select a ticket from the queue to assign a worker and update its status.</p>
          )}
        </article>
      ) : (
        <article className="panel form-panel">
          <div className="panel-heading"><div><span>Submit maintenance</span><h3>New request</h3></div></div>
          <label>Issue title<input placeholder="Kitchen sink leak" value={request.title} onChange={(event) => setRequest({ ...request, title: event.target.value })} /></label>
          <label>Priority<select value={request.priority} onChange={(event) => setRequest({ ...request, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></label>
          <label>Description<textarea placeholder="Describe the problem, location, and urgency." value={request.description} onChange={(event) => setRequest({ ...request, description: event.target.value })} /></label>
          <button className="primary-action" onClick={submitRequest}>Submit maintenance</button>
          {submitted && <p className="status-note">{submitted}</p>}
        </article>
      )}
    </section>
  );
}

function ReportsPage({ role, currency }: { role: Role; currency: Currency }) {
  const [reportStatus, setReportStatus] = useState("");
  const reportItems = role === "Tenant"
    ? ["Receipts", "Lease agreement", "Utility history", "Maintenance history"]
    : ["Monthly financial report", "Tenant report", "Maintenance report", "Vacancy report"];

  function downloadReport(item: string) {
    const title = item.replace(/\s+/g, "-").toLowerCase();
    const content = `RentFlow Report: ${item}\nGenerated: ${new Date().toLocaleString()}\n\n` +
      `Currency: ${currency}\n` +
      `Prepared for: ${role}\n\n` +
      `Summary:\n` +
      `- Payments recorded: ${payments.length}\n` +
      `- Maintenance items: ${maintenance.length}\n` +
      `- Report type: ${item}\n\n` +
      `This export is a downloadable summary of the selected report, suitable for archive or reconciliation.`;
    downloadFile(`${title}-report.txt`, content);
    setReportStatus(`Downloaded ${item} report.`);
  }

  function downloadReceipt(receiptId: string) {
    const receipt = receipts.find((item) => item.id === receiptId);
    const content = receipt
      ? `RentFlow Receipt\nReceipt: ${receipt.id}\nDate: ${receipt.date}\nAmount: ${receipt.amount}\nMethod: ${receipt.method}\nStatus: ${receipt.status}\n\nThank you for your payment.`
      : `Receipt ${receiptId} could not be retrieved.`;
    downloadFile(`receipt-${receiptId}.txt`, content);
    setReportStatus(`Downloaded receipt ${receiptId}.`);
  }

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading"><div><span>Download center</span><h3>{role} reports</h3></div><button onClick={() => downloadReport("full report bundle")}>Export PDF</button></div>
        <div className="report-grid">{reportItems.map((item) => <button key={item} onClick={() => downloadReport(item)}><FileText />{item}<span>PDF / Excel</span></button>)}</div>
        {reportStatus && <p className="status-note">{reportStatus}</p>}
        {role === "Tenant" && (
          <div className="receipt-list">
            {receipts.map((receipt) => (
              <div className="receipt-row" key={receipt.id}>
                <span><strong>{receipt.id}</strong><small>{receipt.date} - {receipt.method}</small></span>
                <b>{convertMoneyText(receipt.amount, currency)}</b>
                <button onClick={() => downloadReceipt(receipt.id)}>Download receipt</button>
              </div>
            ))}
          </div>
        )}
      </article>
      <article className="panel">
        <div className="panel-heading"><div><span>Arrears</span><h3>{role === "Tenant" ? "Balance trend" : "Heatmap"}</h3></div></div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={arrears}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" />
            <XAxis dataKey="property" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="amount" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>
    </section>
  );
}

function NoticesPage({ role, notifications, onSendNotice }: { role: Role; notifications: ServerNotification[]; onSendNotice?: (payload: { template: string; channels?: string[]; payload?: Record<string, unknown> }) => Promise<boolean> }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<{ sms: boolean; email: boolean; push: boolean }>({ sms: false, email: false, push: true });
  const [fileData, setFileData] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const visibleNotices = notifications.filter((n) => {
    if (role === "Tenant") {
      const level = (n.payload?.level as unknown as string) ?? "";
      if (/management|owner/i.test(level)) return false;
      if (/owner|management/i.test(n.template)) return false;
    }
    return true;
  });

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return setFileData(null);
    const reader = new FileReader();
    reader.onload = () => setFileData(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function sendNotice() {
    if (!onSendNotice) return setStatus("Notice sending not enabled.");
    if (!message && !title) return setStatus("Enter a title or message first.");
    setStatus("Sending...");
    const ch = [] as string[];
    if (channels.push) ch.push("push");
    if (channels.sms) ch.push("sms");
    if (channels.email) ch.push("email");
    const payload: Record<string, unknown> = { body: message, title };
    if (fileData) payload.attachment = fileData;
    try {
      const ok = await onSendNotice({ template: title || message.slice(0, 80), channels: ch.length ? ch : undefined, payload });
      setStatus(ok ? "Notice queued." : "Failed to queue notice.");
      if (ok) {
        setTitle(""); setMessage(""); setFileData(null);
      }
    } catch (err) {
      setStatus("Error sending notice.");
    }
  }

  return (
    <article className="panel notices-panel">
      <div className="panel-heading"><div><span>Read notices</span><h3>Management notices</h3></div><Megaphone /></div>
      {role !== "Tenant" && onSendNotice ? (
        <div className="panel form-panel">
          <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short headline" /></label>
          <label>Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Write the notice body" /></label>
          <label>Attach memo<input type="file" onChange={handleFile} /></label>
          <div className="notice-channels">
            <label><input type="checkbox" checked={channels.push} onChange={(e) => setChannels((c) => ({ ...c, push: e.target.checked }))} /> Push</label>
            <label><input type="checkbox" checked={channels.sms} onChange={(e) => setChannels((c) => ({ ...c, sms: e.target.checked }))} /> SMS</label>
            <label><input type="checkbox" checked={channels.email} onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))} /> Email</label>
          </div>
          <button className="primary-action" onClick={sendNotice}>Send notice</button>
          {status && <p className="status-note">{status}</p>}
        </div>
      ) : null}
      <div className="notice-list">
        {visibleNotices.length > 0 ? visibleNotices.map((notice) => (
          <div key={notice.id}>
            <span>{notice.channel}</span>
            <strong>{notice.template}</strong>
            {notice.createdAt && <small>{formatDateTime(notice.createdAt)}</small>}
            {notice.payload?.attachment ? <div className="notice-attachment"><a href={String(notice.payload.attachment)} target="_blank" rel="noreferrer">Open memo</a></div> : null}
          </div>
        )) : (
          <div className="notice-empty"><p>No push alerts or operational notices are available.</p></div>
        )}
      </div>
    </article>
  );
}

function SecurityPage({ role, securityRecords, onAddSecurityRecord }: { role: Role; securityRecords: ServerSecurityRecord[]; onAddSecurityRecord: (payload: { propertyName: string; companyName: string; contactName: string; contactPhone: string; contactEmail: string; notes: string; instructions: string; location?: string }) => Promise<ServerSecurityRecord | null> }) {
  const [form, setForm] = useState({ propertyName: "", companyName: "", contactName: "", contactPhone: "", contactEmail: "", location: "", notes: "", instructions: "" });
  const [status, setStatus] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ agent: string; author: string; time: string; body: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>(securityRecords[0]?.contactName ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedAgent && securityRecords.length > 0) {
      setSelectedAgent(securityRecords[0].contactName);
    }
  }, [securityRecords, selectedAgent]);

  async function saveRecord() {
    if (!form.propertyName || !form.companyName || !form.contactName || !form.contactPhone || !form.contactEmail) {
      setStatus("Fill property, company, contact, and location before saving.");
      return;
    }
    const record = await onAddSecurityRecord({ ...form });
    if (record) {
      setStatus(`Security contact ${record.contactName} registered for ${record.propertyName}.`);
      setForm({ propertyName: "", companyName: "", contactName: "", contactPhone: "", contactEmail: "", location: "", notes: "", instructions: "" });
    } else {
      setStatus("Failed to save security contact. Please try again.");
    }
  }

  function sendSecurityMessage() {
    if (!selectedAgent || !message.trim()) {
      setStatus("Select a security agent and type a message first.");
      return;
    }
    setChatHistory((current) => [...current, { agent: selectedAgent, author: "You", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), body: message.trim() }]);
    setMessage("");
    setStatus(`Message sent to ${selectedAgent}.`);
  }

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading"><div><span>Security control</span><h3>{role === "Tenant" ? "Contact on-duty security" : "Register gate security and response teams"}</h3></div><ShieldCheck /></div>
        <div className="security-grid">
          {['Guard assignments', 'Incident logging', 'Mobile patrol tracking', 'Gate communications', 'Emergency alerts', role === 'Super Admin' ? 'Platform security audit' : 'Property security audit'].map((item) => (
            <div key={item}><CheckCircle2 />{item}<small>Active</small></div>
          ))}
        </div>
      </article>
      {role === "Tenant" ? (
        <article className="panel form-panel">
          <div className="panel-heading"><div><span>Contact security</span><h3>Message gate staff</h3></div></div>
          <label>Choose a security agent<select value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>
            {securityRecords.map((record) => (
              <option key={record.id} value={record.contactName}>{record.contactName} — {record.companyName} ({record.location || record.propertyName})</option>
            ))}
          </select></label>
          <label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the issue or request assistance at the gate." /></label>
          <button className="primary-action" onClick={sendSecurityMessage}>Send to security</button>
          {status && <p className="status-note">{status}</p>}
          <div className="message-feed">
            <h4>Conversation with {selectedAgent || "security"}</h4>
            {chatHistory.length > 0 ? chatHistory.map((chat, index) => (
              <div key={`${chat.agent}-${index}`} className="message-bubble">
                <div><strong>{chat.author}</strong><small>{chat.time}</small></div>
                <p>{chat.body}</p>
              </div>
            )) : <p className="status-note">No security messages yet. Use the form above to contact gate staff.</p>}
          </div>
        </article>
      ) : (
        <article className="panel form-panel">
          <div className="panel-heading"><div><span>Add security contact</span><h3>Register agents and points</h3></div></div>
          <label>Property name<input value={form.propertyName} onChange={(event) => setForm({ ...form, propertyName: event.target.value })} placeholder="Westlands Heights" /></label>
          <label>Security company<input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} placeholder="Guardian Security Ltd." /></label>
          <label>Agent name<input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} placeholder="Moses Kamau" /></label>
          <label>Agent phone<input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} placeholder="+254700111222" /></label>
          <label>Agent email<input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} placeholder="moses@guardian.co.ke" /></label>
          <label>Location or gate point<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Main gate" /></label>
          <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Night patrols, emergency access details." /></label>
          <label>Instructions<textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Escalate unauthorized visitors immediately." /></label>
          <button className="primary-action" onClick={saveRecord}>Save security contact</button>
          {status && <p className="status-note">{status}</p>}
        </article>
      )}
    </section>
  );
}

function ProfilePage({ role }: { role: Role }) {
  const profile = role === "Tenant"
    ? { name: "Amina Otieno", email: "tenant@rentflow.app", phone: "+254700000101", unit: "A-12", plan: "Tenant account" }
    : role === "Management"
      ? { name: "Joseph Kariuki", email: "caretaker@rentflow.app", phone: "+254700000102", unit: "Westlands Heights", plan: "Management account" }
      : role === "Owner"
        ? { name: "Naomi Wanjiru", email: "owner@rentflow.app", phone: "+254700000103", unit: "3 properties", plan: "Growth plan" }
        : { name: "RentFlow Admin", email: "admin@rentflow.app", phone: "+254700000104", unit: "Platform", plan: "Super admin" };

  return (
    <section className="content-grid">
      <article className="panel profile-card">
        <div className="profile-large-avatar">{profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
        <h3>{profile.name}</h3>
        <span>{role}</span>
        <div className="profile-details">
          <div><strong>Email</strong><small>{profile.email}</small></div>
          <div><strong>Phone</strong><small>{profile.phone}</small></div>
          <div><strong>Scope</strong><small>{profile.unit}</small></div>
          <div><strong>Plan</strong><small>{profile.plan}</small></div>
        </div>
      </article>
      <PrivilegePanel role={role} />
    </section>
  );
}

function AdminPage({ role }: { role: Role }) {
  const allowed = role === "Owner" || role === "Super Admin";
  const [paymentAccount, setPaymentAccount] = useState({
    type: "mpesa",
    label: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    mpesaPaybill: ""
  });
  const [adminStatus, setAdminStatus] = useState("");

  function savePaymentAccount() {
    if (!paymentAccount.label) {
      setAdminStatus("Add a label for this payment method first.");
      return;
    }
    setAdminStatus(`${paymentAccount.type === "mpesa" ? "M-Pesa" : "Bank"} payment method saved: ${paymentAccount.label}.`);
  }

  if (!allowed) {
    return (
      <section className="content-grid">
        <article className="panel denied-panel">
          <Lock />
          <h3>Admin access is restricted</h3>
          <p>{role}s can use their operational tabs, but user management, subscriptions, and platform controls require owner or super admin privileges.</p>
        </article>
        <PrivilegePanel role={role} />
      </section>
    );
  }
  return (
    <section className="admin-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Super Admin" ? "Platform control" : "Owner controls"}</span><h3>Admin dashboard</h3></div>
          <button>{role === "Super Admin" ? "Create plan" : "Invite manager"}</button>
        </div>
        <div className="admin-actions">
          {(role === "Super Admin"
            ? ["Manage users", "Subscriptions", "Fraud detection", "System monitoring", "Platform announcements", "Audit logs"]
            : ["Management activity", "Expense approvals", "Tenant satisfaction", "Property access", "Owner reports", "Audit logs"]
          ).map((item) => <button key={item}><UserCog />{item}</button>)}
        </div>
      </article>
      <article className="panel wide-panel form-panel">
        <div className="panel-heading"><div><span>Payment modes</span><h3>Add bank account or M-Pesa</h3></div><CreditCard /></div>
        <div className="payment-mode-grid">
          <button className={paymentAccount.type === "mpesa" ? "selected" : ""} onClick={() => setPaymentAccount({ ...paymentAccount, type: "mpesa" })}>M-Pesa</button>
          <button className={paymentAccount.type === "bank" ? "selected" : ""} onClick={() => setPaymentAccount({ ...paymentAccount, type: "bank" })}>Bank account</button>
        </div>
        <label>Label<input placeholder="Main rent collection" value={paymentAccount.label} onChange={(event) => setPaymentAccount({ ...paymentAccount, label: event.target.value })} /></label>
        {paymentAccount.type === "mpesa" ? (
          <label>M-Pesa paybill or till<input placeholder="123456" value={paymentAccount.mpesaPaybill} onChange={(event) => setPaymentAccount({ ...paymentAccount, mpesaPaybill: event.target.value })} /></label>
        ) : (
          <>
            <label>Bank name<input placeholder="Equity Bank" value={paymentAccount.bankName} onChange={(event) => setPaymentAccount({ ...paymentAccount, bankName: event.target.value })} /></label>
            <label>Account name<input placeholder="RentFlow Holdings" value={paymentAccount.accountName} onChange={(event) => setPaymentAccount({ ...paymentAccount, accountName: event.target.value })} /></label>
            <label>Account number<input placeholder="0123456789" value={paymentAccount.accountNumber} onChange={(event) => setPaymentAccount({ ...paymentAccount, accountNumber: event.target.value })} /></label>
          </>
        )}
        <button className="primary-action" onClick={savePaymentAccount}>Save payment method</button>
        {adminStatus && <p className="status-note">{adminStatus}</p>}
      </article>
      <article className="panel wide-panel">
        <div className="panel-heading"><div><span>Directory</span><h3>Users and access</h3></div></div>
        <div className="responsive-table">
          {adminUsers.map((user) => (
            <div className="property-row" key={user.name}>
              <span><strong>{user.name}</strong><small>{user.role}</small></span>
              <b>{user.status}</b>
              <em>{user.plan}</em>
              <button>{role === "Super Admin" ? "Edit" : user.role === "Tenant" ? "View" : "Review"}</button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function TabContent({
  role,
  activeTab,
  onNavigate,
  currency,
  properties,
  units,
  tenants,
  expenses,
  maintenanceData,
  threads,
  messages,
  notifications,
  onLoadThread,
  onSendMessage,
  onSendPushAlert,
  onCreateListing,
  onCreateUnit,
  onCreateTenant,
  onUpdateUnit,
  onRecordExpense,
  onUploadAgreementTemplate,
  onGenerateLeaseDocuments,
  onSubmitMaintenance,
  onUpdateMaintenance,
  payments,
  onMakePayment,
  onApprovePayment,
  securityRecords,
  onAddSecurityRecord,
  onSignOut,
  onSendNotice
}: {
  role: Role;
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  currency: Currency;
  properties: ServerProperty[];
  units: ServerUnit[];
  tenants: ServerTenant[];
  expenses: ServerExpense[];
  maintenanceData: ServerMaintenanceTicket[];
  threads: ServerThread[];
  messages: AppChatMessage[];
  notifications: ServerNotification[];
  onLoadThread: (threadId: string) => Promise<void>;
  onSendMessage: (threadId: string, body: string, attachmentUrls?: string[]) => Promise<void>;
  onSendPushAlert: (message: string) => Promise<void>;
  onCreateListing: (payload: Record<string, unknown>) => Promise<ServerProperty | undefined>;
  onCreateUnit: (payload: Record<string, unknown>) => Promise<ServerUnit | null>;
  onCreateTenant: (payload: { name: string; email: string; phone: string }) => Promise<ServerTenant | null>;
  onUpdateUnit: (payload: { unitId: string; status?: string; tenantId?: string }) => Promise<ServerUnit | null>;
  onRecordExpense: (payload: { propertyId: string; category: string; description: string; amount: number; receiptUrl?: string }) => Promise<ServerExpense | null>;
  onUploadAgreementTemplate: (payload: Record<string, unknown>) => Promise<unknown>;
  onGenerateLeaseDocuments: (payload: { propertyId: string; unitIds?: string[] }) => Promise<Array<{ unitId: string; tenantId?: string; tenantName: string; renderedText: string; fileName: string }>>;
  onSubmitMaintenance: (payload: { title: string; priority: string; description: string }) => Promise<ServerMaintenanceTicket | null>;
  onUpdateMaintenance: (payload: { ticketId: string; status?: string; assignedTo?: string; vendorName?: string; followUp?: string }) => Promise<ServerMaintenanceTicket | null>;
  payments: ServerPayment[];
  onMakePayment: (payload: { amount: number; method: "mpesa" | "mobile_money" | "bank" | "card"; accountName?: string; accountNumber?: string; bankName?: string; phoneNumber?: string; cardNumber?: string; expiry?: string; cvc?: string; }) => Promise<ServerPayment | null>;
  onApprovePayment: (payload: { paymentId: string; status?: string }) => Promise<ServerPayment | null>;
  securityRecords: ServerSecurityRecord[];
  onAddSecurityRecord: (payload: { propertyName: string; companyName: string; contactName: string; contactPhone: string; contactEmail: string; notes: string; instructions: string; location?: string }) => Promise<ServerSecurityRecord | null>;
  onSignOut: () => void;
  onSendNotice: (payload: { template: string; channels?: string[]; payload?: Record<string, unknown> }) => Promise<boolean>;
}) {
  if (activeTab === "Overview") return <OverviewPage role={role} onNavigate={onNavigate} currency={currency} onSendPushAlert={onSendPushAlert} />;
  if (activeTab === "Properties") return <PropertiesPage role={role} currency={currency} properties={properties} units={units} tenants={tenants} expenses={expenses} onCreateListing={onCreateListing} onCreateUnit={onCreateUnit} onCreateTenant={onCreateTenant} onUpdateUnit={onUpdateUnit} onRecordExpense={onRecordExpense} onUploadAgreementTemplate={onUploadAgreementTemplate} onGenerateLeaseDocuments={onGenerateLeaseDocuments} />;
  if (activeTab === "Payments") return <PaymentsPage role={role} currency={currency} payments={payments} onMakePayment={onMakePayment} onApprovePayment={onApprovePayment} />;
  if (activeTab === "Maintenance") return <MaintenancePage role={role} maintenanceData={maintenanceData} onSubmitMaintenance={onSubmitMaintenance} onUpdateMaintenance={onUpdateMaintenance} />;
  if (activeTab === "Messaging") return <section className="messaging-grid"><MessagingCenter role={role} threads={threads} messages={messages} notifications={notifications} onLoadThread={onLoadThread} onSendMessage={onSendMessage} onSendPushAlert={onSendPushAlert} /><NoticesPage role={role} notifications={notifications} onSendNotice={sendNotice} /></section>;
  if (activeTab === "Notices") return <NoticesPage role={role} notifications={notifications} onSendNotice={sendNotice} />;
  if (activeTab === "Reports") return <ReportsPage role={role} currency={currency} />;
  if (activeTab === "Security") return <SecurityPage role={role} securityRecords={securityRecords} onAddSecurityRecord={onAddSecurityRecord} />;
  if (activeTab === "Profile") return <ProfilePage role={role} />;
  if (activeTab === "Sign Out") return <SignOutPage onSignOut={onSignOut} />;
  return <AdminPage role={role} />;
}

function SignOutPage({ onSignOut }: { onSignOut: () => void }) {
  return (
    <section className="content-grid">
      <article className="panel signout-panel">
        <div className="panel-heading"><div><span>Sign out</span><h3>Leave RentFlow securely</h3></div></div>
        <p>Use this option to safely end your session and clear your access token from the app.</p>
        <button className="secondary-action" onClick={onSignOut}>Sign out now</button>
      </article>
    </section>
  );
}

function LandingPage({ onSelectMode }: { onSelectMode: (mode: "login" | "signup") => void }) {
  return (
    <main className="landing-screen auth-chooser-screen">
      <section className="landing-card">
        <div className="landing-brand">
          <div className="brand-mark">R</div>
          <span>RentFlow</span>
        </div>
        <h1>Welcome to RentFlow</h1>
        <p>Access your tenant dashboard, guest passes, and property operations from one place.</p>
        <div className="auth-choice-grid">
          <article className="choice-card">
            <div className="choice-icon"><Lock /></div>
            <h2>Sign in</h2>
            <p>Already registered? Use your email and password to access your dashboard.</p>
            <button className="primary-action" onClick={() => onSelectMode("login")}>Sign in</button>
          </article>
          <article className="choice-card highlighted">
            <div className="choice-icon"><User /></div>
            <h2>Sign up</h2>
            <p>Create a tenant account for your apartment listing and connect to management instantly.</p>
            <button className="primary-action" onClick={() => onSelectMode("signup")}>Sign up</button>
          </article>
        </div>
        <p className="small-copy">Tenant accounts may self-register. Management, owner, and admin accounts are created by the administrator.</p>
      </section>
    </main>
  );
}

function AuthPage({ mode, onMode, onLogin, onSignup, error, loading }: { mode: "login" | "signup"; onMode: (mode: "login" | "signup") => void; onLogin: (payload: { email: string; password: string }) => void; onSignup: (payload: { name: string; email: string; phone: string; password: string; apartment: string; houseNumber: string }) => void; error?: string; loading: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [apartment, setApartment] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [status, setStatus] = useState("");

  function submit() {
    if (mode === "login") {
      if (!email || !password) {
        setStatus("Provide both email and password to sign in.");
        return;
      }
      setStatus("");
      onLogin({ email, password });
      return;
    }

    if (!name || !email || !phone || !password || !apartment || !houseNumber) {
      setStatus("Fill in all tenant signup fields before continuing.");
      return;
    }
    setStatus("");
    onSignup({ name, email, phone, password, apartment, houseNumber });
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="landing-brand">
          <div className="brand-mark">R</div>
          <span>RentFlow</span>
        </div>
        <h1>{mode === "login" ? "Sign in to your account" : "Create tenant account"}</h1>
        <p>{mode === "login" ? "Enter your email and password to access your workspace." : "Enter tenant details and link your room to begin using RentFlow."}</p>
        <div className="auth-toggle">
          <button className={mode === "login" ? "selected" : ""} onClick={() => onMode("login")}>Sign in</button>
          <button className={mode === "signup" ? "selected" : ""} onClick={() => onMode("signup")}>Sign up</button>
        </div>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Enter password" />
        </label>
        {mode === "signup" && (
          <>
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Amina Otieno" />
            </label>
            <label>
              Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254700000101" />
            </label>
            <label>
              Apartment or listing name
              <input value={apartment} onChange={(event) => setApartment(event.target.value)} placeholder="Westlands Heights" />
            </label>
            <label>
              House/room number
              <input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} placeholder="A-12" />
            </label>
            <p className="small-copy">Tenant signup is only available for rental occupants. Management and owner accounts are created by admin.</p>
          </>
        )}
        {status && <p className="status-note error">{status}</p>}
        {error && <p className="status-note error">{error}</p>}
        <button className="primary-cta" onClick={submit} disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Open dashboard" : "Create account"}
        </button>
      </section>
    </main>
  );
}

function AppShell() {
  const [role, setRole] = useState<Role>("Tenant");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [dark, setDark] = useState(true);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [screen, setScreen] = useState<"landing" | "login" | "signup" | "app">("landing");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
  const [propertiesData, setPropertiesData] = useState<ServerProperty[]>([]);
  const [unitsData, setUnitsData] = useState<ServerUnit[]>([]);
  const [tenantsData, setTenantsData] = useState<ServerTenant[]>([]);
  const [expensesData, setExpensesData] = useState<ServerExpense[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<ServerMaintenanceTicket[]>([]);
  const [paymentsData, setPaymentsData] = useState<ServerPayment[]>([]);
  const [threads, setThreads] = useState<ServerThread[]>([]);
  const [messages, setMessages] = useState<AppChatMessage[]>([]);
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [securityRecords, setSecurityRecords] = useState<ServerSecurityRecord[]>([]);
  const [securityChatMessages, setSecurityChatMessages] = useState<Array<{ id: string; agent: string; author: string; time: string; body: string }>>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const availableTabs = useMemo(() => roleTabs[role], [role]);

  const defaultCredential: Record<Role, { email: string; password: string }> = {
    Tenant: { email: "tenant@rentflow.app", password: "RentFlow@2026" },
    Management: { email: "obwandalordphick14@gmail.com", password: "Lord9632@@" },
    Owner: { email: "owner@rentflow.app", password: "RentFlow@2026" },
    "Super Admin": { email: "amanicoretech@gmail.com", password: "Lord9632@@" }
  };

  useEffect(() => {
    if (!accessToken) return;
    const ws = new WebSocket(`${apiBaseUrl.replace(/^http/, "ws")}/realtime`);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "chat.message") {
          const message = payload.message as AppChatMessage;
          setMessages((current) => [...current, { ...message, time: formatDateTime(message.createdAt || new Date().toISOString()) }]);
        }
        if (payload.type === "notification.sent") {
          const items = payload.notifications as ServerNotification[];
          setNotifications((current) => [...items, ...current]);
        }
        if (payload.type === "maintenance.ticket.created") {
          const ticket = payload.ticket as ServerMaintenanceTicket;
          setMaintenanceData((current) => [ticket, ...current]);
        }
      } catch {
        // ignore invalid realtime payload
      }
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    fetchAppData(accessToken);
  }, [accessToken]);

  async function fetchAppData(token: string) {
    try {
      const [propertiesRes, unitsRes, maintenanceRes, paymentsRes, threadsRes, notificationsRes, securityRes] = await Promise.all([
        fetchJson<{ data: ServerProperty[] }>("/api/properties", { headers: getAuthHeaders(token) }),
        fetchJson<{ data: ServerUnit[] }>("/api/units", { headers: getAuthHeaders(token) }),
        fetchJson<{ data: ServerMaintenanceTicket[] }>("/api/maintenance", { headers: getAuthHeaders(token) }),
        fetchJson<{ data: ServerPayment[] }>("/api/payments", { headers: getAuthHeaders(token) }),
        fetchJson<{ data: ServerThread[] }>("/api/messages/threads", { headers: getAuthHeaders(token) }),
        fetchJson<{ data: ServerNotification[] }>("/api/notifications", { headers: getAuthHeaders(token) }),
        fetchJson<{ data: ServerSecurityRecord[] }>("/api/security", { headers: getAuthHeaders(token) })
      ]);
      setPropertiesData(propertiesRes.data);
      setUnitsData(unitsRes.data);
      setMaintenanceData(maintenanceRes.data);
      setPaymentsData(paymentsRes.data);
      // hide owner/management private threads from tenants
      const threadItems = role === "Tenant" ? threadsRes.data.filter((t) => !/owner|management/i.test(t.name) && (t.scope ?? "") !== "Private channel") : threadsRes.data;
      setThreads(threadItems);
      setNotifications(notificationsRes.data);
      setSecurityRecords(securityRes.data);
    } catch (error) {
      console.error(error);
    }
  }

  function mapBackendRole(role: UserRole): Role {
    if (role === "tenant") return "Tenant";
    if (role === "caretaker") return "Management";
    if (role === "owner") return "Owner";
    return "Super Admin";
  }

  async function login(payload: { email: string; password: string }) {
    setAuthError("");
    setAuthLoading(true);
    try {
      const result = await fetchJson<{ accessToken: string; user: BackendUser }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: payload.email.trim(), password: payload.password.trim(), device: "RentFlow dashboard" })
      });
      setAccessToken(result.accessToken);
      setCurrentUser(result.user);
      setRole(mapBackendRole(result.user.role));
      setActiveTab("Overview");
      setScreen("app");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function signupTenant(payload: { name: string; email: string; phone: string; password: string; apartment: string; houseNumber: string }) {
    setAuthError("");
    setAuthLoading(true);
    try {
      const result = await fetchJson<{ accessToken: string; user: BackendUser }>("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          password: payload.password,
          role: "tenant",
          apartment: payload.apartment,
          houseNumber: payload.houseNumber
        })
      });
      setAccessToken(result.accessToken);
      setCurrentUser(result.user);
      setRole("Tenant");
      setActiveTab("Overview");
      setScreen("app");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadThread(threadId: string) {
    try {
      const result = await fetchJson<{ thread: ServerThread; messages: AppChatMessage[] }>(`/api/messages/threads/${threadId}`, {
        headers: getAuthHeaders(accessToken)
      });
      setMessages(result.messages.map((message) => ({ ...message, time: formatDateTime(message.createdAt || new Date().toISOString()) })));
      setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, unreadCount: 0 } : thread));
    } catch (error) {
      console.error(error);
    }
  }

  async function sendThreadMessage(threadId: string, body: string, attachmentUrls: string[] = []) {
    if (!accessToken) return;
    try {
      const result = await fetchJson<{ data: AppChatMessage }>("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ threadId, body, attachmentUrls })
      });
      const message = {
        ...result.data,
        author: currentUser?.name ?? "You",
        role: role,
        time: formatDateTime(result.data.createdAt || new Date().toISOString())
      };
      setMessages((current) => [...current, message]);
      setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, lastMessage: { senderName: message.author, body: message.body, createdAt: result.data.createdAt ?? new Date().toISOString() } } : thread));
    } catch (error) {
      console.error(error);
    }
  }

  async function sendPushAlert(message: string) {
    if (!accessToken) return;
    try {
      const result = await fetchJson<{ data: unknown }>("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ message, channels: ["push", "email"], userId: null })
      });
      console.log("Push alert queued", result);
    } catch (error) {
      console.error(error);
    }
  }

  async function createListing(payload: Record<string, unknown>) {
    if (!accessToken) return;
    try {
      const result = await fetchJson<{ data: ServerProperty }>("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify(payload)
      });
      setPropertiesData((current) => [result.data, ...current]);
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async function createTenant(payload: { name: string; email: string; phone: string; }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerTenant }>("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify(payload)
      });
      setTenantsData((current) => [result.data, ...current]);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function updateUnit(payload: { unitId: string; status?: string; tenantId?: string; }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerUnit }>(`/api/units/${payload.unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ status: payload.status, tenantId: payload.tenantId })
      });
      setUnitsData((current) => current.map((unit) => unit.id === payload.unitId ? result.data : unit));
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function recordExpense(payload: { propertyId: string; category: string; description: string; amount: number; receiptUrl?: string }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerExpense }>("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify(payload)
      });
      setExpensesData((current) => [result.data, ...current]);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function createUnit(payload: Record<string, unknown>) {
    if (!accessToken) return null;
    const result = await fetchJson<{ data: ServerUnit }>("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
      body: JSON.stringify(payload)
    });
    setUnitsData((current) => [result.data, ...current]);
    return result.data;
  }

  async function uploadAgreementTemplate(payload: Record<string, unknown>) {
    if (!accessToken) return null;
    const result = await fetchJson<{ data: { id: string; name: string; templateText: string; fileName?: string } }>("/api/agreements/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
      body: JSON.stringify(payload)
    });
    return result.data;
  }

  async function generateLeaseDocuments(payload: { propertyId: string; unitIds?: string[] }) {
    if (!accessToken) return [];
    try {
      const result = await fetchJson<{ data: Array<{ unitId: string; tenantId?: string; tenantName: string; renderedText: string; fileName: string }> }>("/api/agreements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify(payload)
      });
      return result.data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async function approvePayment(payload: { paymentId: string; status?: string }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerPayment }>(`/api/payments/${payload.paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ status: payload.status ?? "approved" })
      });
      setPaymentsData((current) => current.map((payment) => payment.id === payload.paymentId ? result.data : payment));
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function submitMaintenanceTicket(payload: { title: string; priority: string; description: string }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerMaintenanceTicket }>("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ title: payload.title, priority: payload.priority, description: payload.description })
      });
      setMaintenanceData((current) => [result.data, ...current]);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function updateMaintenanceTicket(payload: { ticketId: string; status?: string; assignedTo?: string; vendorName?: string; followUp?: string }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerMaintenanceTicket }>(`/api/maintenance/${payload.ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ status: payload.status, assignedTo: payload.assignedTo, vendorName: payload.vendorName, followUp: payload.followUp })
      });
      setMaintenanceData((current) => current.map((ticket) => ticket.id === payload.ticketId ? result.data : ticket));
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function makePayment(payload: { amount: number; method: "mpesa" | "bank" | "card"; accountName?: string; accountNumber?: string; bankName?: string; phoneNumber?: string; cardNumber?: string; expiry?: string; cvc?: string; }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerPayment }>("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify({ amount: payload.amount, method: payload.method, accountName: payload.accountName, accountNumber: payload.accountNumber, bankName: payload.bankName, phoneNumber: payload.phoneNumber, cardNumber: payload.cardNumber, expiry: payload.expiry, cvc: payload.cvc })
      });
      setPaymentsData((current) => [result.data, ...current]);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function addSecurityRecord(payload: { propertyName: string; companyName: string; contactName: string; contactPhone: string; contactEmail: string; notes: string; instructions: string; location?: string }) {
    if (!accessToken) return null;
    try {
      const result = await fetchJson<{ data: ServerSecurityRecord }>("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify(payload)
      });
      setSecurityRecords((current) => [result.data, ...current]);
      return result.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function sendNotice(payload: { template: string; channels?: string[]; payload?: Record<string, unknown> }) {
    if (!accessToken) return false;
    try {
      const body = { template: payload.template, channels: payload.channels, payload: payload.payload };
      const result = await fetchJson<{ data: unknown }>("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders(accessToken) },
        body: JSON.stringify(body)
      });
      // optimistic: push a lightweight notice into state for immediate visibility
      setNotifications((current) => [{ id: `local_${Date.now()}`, userId: current[0]?.userId, channel: (payload.channels?.[0] ?? "push"), template: payload.template, payload: payload.payload ?? {}, createdAt: new Date().toISOString() }, ...current]);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function signOut() {
    setAccessToken(null);
    setCurrentUser(null);
    setRole("Tenant");
    setActiveTab("Overview");
    setScreen("login");
    setThreads([]);
    setMessages([]);
    setNotifications([]);
    setSecurityRecords([]);
    setMaintenanceData([]);
  }

  function switchRole(nextRole: Role) {
    setRole(nextRole);
    if (!roleTabs[nextRole].includes(activeTab)) setActiveTab("Overview");
  }

  function switchTab(nextTab: Tab) {
    setActiveTab(availableTabs.includes(nextTab) ? nextTab : "Overview");
  }

  if (screen === "landing") return <LandingPage onSelectMode={(mode) => setScreen(mode)} />;

  if (screen === "login" || screen === "signup") {
    return (
      <AuthPage
        mode={screen}
        onMode={(nextMode) => setScreen(nextMode)}
        onLogin={login}
        onSignup={signupTenant}
        error={authError}
        loading={authLoading}
      />
    );
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">R</div><div><strong>RentFlow</strong><span>{role} workspace</span></div></div>
        <nav>
          {availableTabs.map((label) => {
            const Icon = tabIcons[label];
            return (
              <button
                key={label}
                type="button"
                className={label === activeTab ? "active" : ""}
                onClick={() => switchTab(label)}
                aria-current={label === activeTab ? "page" : undefined}
                aria-label={label}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="security-panel"><Lock /><strong>Role-based access</strong><span>Each workspace exposes only the actions and data allowed for that user type.</span></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Digital rental operations</p>
            <h1>{role} {activeTab}</h1>
          </div>
          <div className="top-actions">
            <div className="currency-switcher" aria-label="Currency selector">
              {(["USD", "KES"] as Currency[]).map((option) => (
                <button key={option} className={currency === option ? "selected" : ""} onClick={() => setCurrency(option)}>{option}</button>
              ))}
            </div>
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
            <button className="icon-button" aria-label="Notifications"><Bell /></button>
          </div>
        </header>

        <TabContent
          role={role}
          activeTab={activeTab}
          onNavigate={switchTab}
          currency={currency}
          properties={propertiesData}
          units={unitsData}
          maintenanceData={maintenanceData}
          threads={threads}
          messages={messages}
          notifications={notifications}
          onLoadThread={loadThread}
          onSendMessage={sendThreadMessage}
          onSendPushAlert={sendPushAlert}
          onCreateListing={createListing}
          onCreateUnit={createUnit}
          onUploadAgreementTemplate={uploadAgreementTemplate}
          onGenerateLeaseDocuments={generateLeaseDocuments}
          onSubmitMaintenance={submitMaintenanceTicket}
          onUpdateMaintenance={updateMaintenanceTicket}
          securityRecords={securityRecords}
          onAddSecurityRecord={addSecurityRecord}
          payments={paymentsData}
          onMakePayment={makePayment}
          onApprovePayment={approvePayment}
          onSignOut={signOut}
          onSendNotice={sendNotice}
        />
      </section>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {availableTabs.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "selected" : ""}
              onClick={() => switchTab(tab)}
              aria-label={tab}
              aria-current={activeTab === tab ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        })}
      </nav>
    </main>
  );
}

export function App() {
  return <AppShell />;
}
