import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
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
  Wrench
} from "lucide-react";
import { useMemo, useState } from "react";
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

type Role = "Tenant" | "Management" | "Owner" | "Super Admin";
type Tab = "Overview" | "Properties" | "Payments" | "Maintenance" | "Messaging" | "Reports" | "Security" | "Admin" | "Profile";
type Currency = "USD" | "KES";

const roles: Role[] = ["Tenant", "Management", "Owner", "Super Admin"];

const tabIcons: Record<Tab, typeof Home> = {
  Overview: Home,
  Properties: Building2,
  Payments: CreditCard,
  Maintenance: Wrench,
  Messaging: MessageSquare,
  Reports: FileText,
  Security: ShieldCheck,
  Admin: UserCog,
  Profile: User
};

const navItems: Array<[typeof Home, Tab]> = [
  [tabIcons.Overview, "Overview"],
  [tabIcons.Properties, "Properties"],
  [tabIcons.Payments, "Payments"],
  [tabIcons.Maintenance, "Maintenance"],
  [tabIcons.Messaging, "Messaging"],
  [tabIcons.Reports, "Reports"],
  [tabIcons.Security, "Security"],
  [tabIcons.Admin, "Admin"],
  [tabIcons.Profile, "Profile"]
];

const roleTabs: Record<Role, Tab[]> = {
  Tenant: ["Overview", "Payments", "Maintenance", "Messaging", "Reports", "Security", "Profile"],
  Management: ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Reports", "Security", "Profile"],
  Owner: ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Reports", "Security", "Admin", "Profile"],
  "Super Admin": ["Overview", "Properties", "Payments", "Maintenance", "Messaging", "Reports", "Security", "Admin", "Profile"]
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

function MessagingCenter({ role }: { role: Role }) {
  const [activeThreadId, setActiveThreadId] = useState(chatThreads[0].id);
  const [messages, setMessages] = useState(chatMessages);
  const [draft, setDraft] = useState("");
  const [noticeStatus, setNoticeStatus] = useState("Rent reminder is scheduled for the 1st of every month, due by the 5th.");
  const activeThread = chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0];
  const activeMessages = messages.filter((message) => message.threadId === activeThread.id);

  function sendMessage() {
    const body = draft.trim();
    if (!body) {
      setNoticeStatus("Type a message before sending.");
      return;
    }
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        threadId: activeThread.id,
        author: role === "Tenant" ? "Amina Otieno" : role,
        role,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        body,
        mine: true
      }
    ]);
    setDraft("");
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
        <div className="notice-card">
          <Megaphone />
          <div>
            <strong>Pinned management notice</strong>
            <span>Quiet hours start at 10 PM. Emergency alerts remain enabled.</span>
          </div>
        </div>
        <div className="thread-list">
          {chatThreads.map((thread) => (
            <button key={thread.id} className={thread.id === activeThreadId ? "thread active-thread" : "thread"} onClick={() => setActiveThreadId(thread.id)}>
              <div className="avatar-stack">{thread.name.slice(0, 2).toUpperCase()}</div>
              <span>
                <strong>{thread.name}</strong>
                <small>{thread.scope} - {thread.members} members</small>
                <em>{thread.preview}</em>
              </span>
              {thread.unread > 0 && <b>{thread.unread}</b>}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <div>
            <span><Users /> {activeThread.members} members online across property channels</span>
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
                <small>{message.role} - {message.time}</small>
              </div>
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <div className="composer">
          <button aria-label="Attach file"><Paperclip /></button>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} placeholder={role === "Tenant" ? "Message management..." : "Message tenants and management..."} />
          <button className="send-button" aria-label="Send message" onClick={sendMessage}><Send /></button>
        </div>
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
          </>
        )}
        <div><Bell /> {noticeStatus}</div>
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

function OverviewPage({ role, onNavigate, currency }: { role: Role; onNavigate: (tab: Tab) => void; currency: Currency }) {
  const [view, setView] = useState<OverviewView>("dashboard");
  const stats = roleStats[role];
  const isTenant = role === "Tenant";
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
              <button><QrCode /> Visitor QR</button>
              <button><Smartphone /> Push alert</button>
            </div>
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

function PropertiesPage({ role, currency }: { role: Role; currency: Currency }) {
  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Tenant" ? "My occupancy" : "Property operations"}</span><h3>{role === "Tenant" ? "Unit A-12" : "Properties"}</h3></div>
          {role !== "Tenant" && <button>Add property</button>}
        </div>
        <div className="responsive-table">
          {properties.map((property) => (
            <div className="property-row" key={property.name}>
              <span><strong>{property.name}</strong><small>{property.units} units - {property.manager}</small></span>
              <b>{property.occupancy}</b>
              <em>{convertMoneyText(property.revenue, currency)}</em>
              <button className={role === "Tenant" ? "locked-action" : ""}>{role === "Tenant" ? "View only" : "Manage"}</button>
            </div>
          ))}
        </div>
      </article>
      <PrivilegePanel role={role} />
    </section>
  );
}

function PaymentsPage({ role, currency }: { role: Role; currency: Currency }) {
  const [paymentMode, setPaymentMode] = useState<"mpesa" | "bank" | "card">("bank");
  const [bankForm, setBankForm] = useState({ bankName: "", accountName: "", accountNumber: "", routingNumber: "" });
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvc: "" });
  const [paymentStatus, setPaymentStatus] = useState("Ready to process rent payment.");
  const canPay = role === "Tenant";

  function processBankPayment() {
    if (!bankForm.bankName || !bankForm.accountName || !bankForm.accountNumber) {
      setPaymentStatus("Add bank name, account name, and account number first.");
      return;
    }
    setPaymentStatus(`Bank debit initiated from ${bankForm.bankName} account ending ${bankForm.accountNumber.slice(-4)}.`);
  }

  function processMpesaPayment() {
    if (!mpesaPhone.trim()) {
      setPaymentStatus("Enter an M-Pesa phone number first.");
      return;
    }
    setPaymentStatus(`STK push sent to ${mpesaPhone.trim()}. Approve on your phone to complete payment.`);
  }

  function processCardPayment() {
    if (!cardForm.number || !cardForm.expiry || !cardForm.cvc) {
      setPaymentStatus("Enter card number, expiry, and CVC first.");
      return;
    }
    setPaymentStatus(`Card payment authorized for ${formatMoney(2000, currency)}. Receipt will be ready shortly.`);
  }

  function selectPaymentMode(mode: "mpesa" | "bank" | "card") {
    setPaymentMode(mode);
    setPaymentStatus(`Switched to ${mode === "mpesa" ? "M-Pesa" : mode === "bank" ? "bank account" : "card"} payment.`);
  }

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Tenant" ? "My payments" : "Collections"}</span><h3>{role === "Tenant" ? "Rent and receipts" : "Rent collection monitor"}</h3></div>
          <button>{role === "Tenant" ? "Pay now" : "Reconcile"}</button>
        </div>
        <div className="table">
          {payments.map((item) => (
            <div className="table-row" key={item.tenant}>
              <span>{role === "Tenant" ? "Amina Otieno" : item.tenant}<small>{item.unit} - {item.method}</small></span>
              <strong>{convertMoneyText(item.amount, currency)}</strong>
              <em className={item.status.toLowerCase()}>{item.status}</em>
            </div>
          ))}
        </div>
      </article>
      <article className="panel payment-method-panel">
        <div className="panel-heading"><div><span>{canPay ? "Pay rent" : "Payment settings"}</span><h3>Payment mode</h3></div></div>
        <div className="payment-mode-grid">
          {[
            ["mpesa", "M-Pesa"],
            ["bank", "Bank account"],
            ["card", "Card"]
          ].map(([mode, label]) => (
            <button key={mode} className={paymentMode === mode ? "selected" : ""} onClick={() => selectPaymentMode(mode as "mpesa" | "bank" | "card")}>
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
            <button className="primary-action" onClick={processBankPayment}>{canPay ? `Debit ${formatMoney(2000, currency)}` : "Save bank route"}</button>
          </div>
        )}
        {paymentMode === "mpesa" && (
          <div className="bank-form">
            <div className="method-note"><Smartphone /> Enter phone number at checkout. STK push will be sent for approval.</div>
            <label>Phone number<input placeholder="+254700000101" value={mpesaPhone} onChange={(event) => setMpesaPhone(event.target.value)} /></label>
            <button className="primary-action" onClick={processMpesaPayment}>{canPay ? `Pay ${formatMoney(2000, currency)} via M-Pesa` : "Save M-Pesa route"}</button>
          </div>
        )}
        {paymentMode === "card" && (
          <div className="bank-form">
            <div className="method-note"><CreditCard /> Card payment opens a secure card form and tokenizes the card.</div>
            <label>Card number<input placeholder="4111 1111 1111 1111" value={cardForm.number} onChange={(event) => setCardForm({ ...cardForm, number: event.target.value })} /></label>
            <label>Expiry<input placeholder="MM/YY" value={cardForm.expiry} onChange={(event) => setCardForm({ ...cardForm, expiry: event.target.value })} /></label>
            <label>CVC<input placeholder="123" value={cardForm.cvc} onChange={(event) => setCardForm({ ...cardForm, cvc: event.target.value })} /></label>
            <button className="primary-action" onClick={processCardPayment}>{canPay ? `Pay ${formatMoney(2000, currency)} with card` : "Save card route"}</button>
          </div>
        )}
        <p className="status-note">{paymentStatus}</p>
      </article>
    </section>
  );
}

function MaintenancePage({ role }: { role: Role }) {
  const [request, setRequest] = useState({ title: "", priority: "medium", description: "" });
  const [submitted, setSubmitted] = useState("");

  function submitRequest() {
    if (!request.title) {
      setSubmitted("Add an issue title first.");
      return;
    }
    setSubmitted(`Maintenance request submitted: ${request.title}.`);
    setRequest({ title: "", priority: "medium", description: "" });
  }

  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading">
          <div><span>{role === "Tenant" ? "My requests" : "Maintenance desk"}</span><h3>{role === "Tenant" ? "Tickets and repairs" : "Work orders"}</h3></div>
          <button>{role === "Tenant" ? "New request" : "Assign technician"}</button>
        </div>
        <div className="ticket-list">
          {maintenance.map((item) => (
            <div className="ticket" key={item.title}><Wrench /><div><strong>{item.title}</strong><span>{item.priority} - {item.status}</span></div></div>
          ))}
        </div>
      </article>
      <article className="panel form-panel">
        <div className="panel-heading"><div><span>{role === "Tenant" ? "Submit maintenance" : "Create work order"}</span><h3>New request</h3></div></div>
        <label>Issue title<input placeholder="Kitchen sink leak" value={request.title} onChange={(event) => setRequest({ ...request, title: event.target.value })} /></label>
        <label>Priority<select value={request.priority} onChange={(event) => setRequest({ ...request, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></label>
        <label>Description<textarea placeholder="Describe the problem, location, and urgency." value={request.description} onChange={(event) => setRequest({ ...request, description: event.target.value })} /></label>
        <button className="primary-action" onClick={submitRequest}>Submit maintenance</button>
        {submitted && <p className="status-note">{submitted}</p>}
      </article>
    </section>
  );
}

function ReportsPage({ role, currency }: { role: Role; currency: Currency }) {
  const [reportStatus, setReportStatus] = useState("");
  const reportItems = role === "Tenant"
    ? ["Receipts", "Lease agreement", "Utility history", "Maintenance history"]
    : ["Monthly financial report", "Tenant report", "Maintenance report", "Vacancy report"];

  function downloadReport(item: string) {
    setReportStatus(`Preparing ${item.toLowerCase()} export as PDF and Excel...`);
  }

  function downloadReceipt(receiptId: string) {
    setReportStatus(`Downloading receipt ${receiptId}...`);
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

function NoticesPage() {
  return (
    <article className="panel notices-panel">
      <div className="panel-heading"><div><span>Read notices</span><h3>Management notices</h3></div><Megaphone /></div>
      <div className="notice-list">
        {notices.map((notice) => (
          <div key={notice.title}>
            <span>{notice.level}</span>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SecurityPage({ role }: { role: Role }) {
  return (
    <section className="content-grid">
      <article className="panel wide-panel">
        <div className="panel-heading"><div><span>Security center</span><h3>{role} protection</h3></div><ShieldCheck /></div>
        <div className="security-grid">
          {["MFA enabled", "Email verified", "SMS verified", "Device tracking", "Session controls", role === "Super Admin" ? "Fraud monitoring" : "Audit trail"].map((item) => (
            <div key={item}><CheckCircle2 />{item}<small>Active</small></div>
          ))}
        </div>
      </article>
      <PrivilegePanel role={role} />
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

function TabContent({ role, activeTab, onNavigate, currency }: { role: Role; activeTab: Tab; onNavigate: (tab: Tab) => void; currency: Currency }) {
  if (activeTab === "Overview") return <OverviewPage role={role} onNavigate={onNavigate} currency={currency} />;
  if (activeTab === "Properties") return <PropertiesPage role={role} currency={currency} />;
  if (activeTab === "Payments") return <PaymentsPage role={role} currency={currency} />;
  if (activeTab === "Maintenance") return <MaintenancePage role={role} />;
  if (activeTab === "Messaging") return <section className="messaging-grid"><MessagingCenter role={role} /><NoticesPage /></section>;
  if (activeTab === "Reports") return <ReportsPage role={role} currency={currency} />;
  if (activeTab === "Security") return <SecurityPage role={role} />;
  if (activeTab === "Profile") return <ProfilePage role={role} />;
  return <AdminPage role={role} />;
}

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <main className="landing-screen">
      <section className="landing-card">
        <div className="landing-brand">
          <div className="brand-mark">R</div>
          <span>RentFlow</span>
        </div>
        <div className="landing-copy">
          <span>Digital rental operations</span>
          <h1>Run rent, tenants, payments, and maintenance from one secure place.</h1>
          <p>Built for tenants, management teams, owners, and platform admins with clean role-based access.</p>
        </div>
        <div className="landing-preview">
          <div><strong>$112.4K</strong><span>Collected</span></div>
          <div><strong>97%</strong><span>Occupancy</span></div>
          <div><strong>23</strong><span>Open tickets</span></div>
        </div>
        <button className="primary-cta" onClick={onGetStarted}>Get started</button>
      </section>
    </main>
  );
}

function AuthPage({ mode, onMode, onEnter }: { mode: "login" | "signup"; onMode: (mode: "login" | "signup") => void; onEnter: (role: Role) => void }) {
  const [selectedRole, setSelectedRole] = useState<Role>("Tenant");
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="landing-brand">
          <div className="brand-mark">R</div>
          <span>RentFlow</span>
        </div>
        <h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
        <p>{mode === "login" ? "Choose your role to open the right dashboard." : "Start with the role that matches your responsibility."}</p>
        <div className="auth-toggle">
          <button className={mode === "login" ? "selected" : ""} onClick={() => onMode("login")}>Log in</button>
          <button className={mode === "signup" ? "selected" : ""} onClick={() => onMode("signup")}>Sign up</button>
        </div>
        <label>
          Email
          <input defaultValue={mode === "login" ? "tenant@rentflow.app" : ""} placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input defaultValue={mode === "login" ? "RentFlow@2026" : ""} type="password" placeholder="Enter password" />
        </label>
        <div className="role-choice">
          {roles.map((item) => (
            <button key={item} className={item === selectedRole ? "selected" : ""} onClick={() => setSelectedRole(item)}>
              {item}
            </button>
          ))}
        </div>
        <button className="primary-cta" onClick={() => onEnter(selectedRole)}>
          {mode === "login" ? "Open dashboard" : "Create account"}
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
  const availableTabs = useMemo(() => roleTabs[role], [role]);

  function switchRole(nextRole: Role) {
    setRole(nextRole);
    if (!roleTabs[nextRole].includes(activeTab)) setActiveTab("Overview");
  }

  function switchTab(nextTab: Tab) {
    setActiveTab(availableTabs.includes(nextTab) ? nextTab : "Overview");
  }

  if (screen === "landing") return <LandingPage onGetStarted={() => setScreen("login")} />;

  if (screen === "login" || screen === "signup") {
    return (
      <AuthPage
        mode={screen}
        onMode={(nextMode) => setScreen(nextMode)}
        onEnter={(nextRole) => {
          switchRole(nextRole);
          setScreen("app");
        }}
      />
    );
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">R</div><div><strong>RentFlow</strong><span>{role} workspace</span></div></div>
        <nav>
          {navItems.map(([Icon, label]) => {
            const allowed = availableTabs.includes(label);
            return (
              <button
                key={label}
                type="button"
                className={label === activeTab ? "active" : allowed ? "" : "locked"}
                onClick={() => allowed && switchTab(label)}
                disabled={!allowed}
                aria-current={label === activeTab ? "page" : undefined}
                aria-label={allowed ? label : `${label} (locked for ${role})`}
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
          <div><p>Digital rental operations</p><h1>{role} {activeTab}</h1></div>
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

        <TabContent role={role} activeTab={activeTab} onNavigate={switchTab} currency={currency} />
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
