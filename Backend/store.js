// In-memory Multi-tenant Data Store & State Engine for EduSync

const initialSchools = [
  { id: "school-a", name: "Springfield Academy", code: "SPRING-01", studentsCount: 450, location: "North District" },
  { id: "school-b", name: "Oakridge High School", code: "OAK-02", studentsCount: 620, location: "Central Valley" },
  { id: "school-c", name: "St. Jude International", code: "JUDE-03", studentsCount: 380, location: "Westside Bay" }
];

const initialStudents = {
  "school-a": [
    { id: "s101", name: "Raj Patel", grade: "10-A", parentName: "Anil Patel", parentEmail: "anil.patel@example.com", attendanceRate: 74.5, gpa: "3.2", status: "Needs Attention" },
    { id: "s102", name: "Aarav Sharma", grade: "10-A", parentName: "Priya Sharma", parentEmail: "priya.sharma@example.com", attendanceRate: 92.0, gpa: "3.9", status: "Excellent" },
    { id: "s103", name: "Ananya Iyer", grade: "10-A", parentName: "Suresh Iyer", parentEmail: "suresh.iyer@example.com", attendanceRate: 88.0, gpa: "3.6", status: "Good" },
    { id: "s104", name: "Rohan Verma", grade: "10-B", parentName: "Sunita Verma", parentEmail: "sunita.v@example.com", attendanceRate: 65.0, gpa: "2.1", status: "Critical Flag" },
    { id: "s105", name: "Diya Kapoor", grade: "10-B", parentName: "Vikram Kapoor", parentEmail: "vikram.k@example.com", attendanceRate: 95.5, gpa: "4.0", status: "Excellent" }
  ],
  "school-b": [
    { id: "s201", name: "Ethan Hunt", grade: "11-C", parentName: "Sarah Hunt", parentEmail: "sarah.h@example.com", attendanceRate: 91.0, gpa: "3.8", status: "Good" },
    { id: "s202", name: "Maya Lin", grade: "11-C", parentName: "David Lin", parentEmail: "david.l@example.com", attendanceRate: 78.0, gpa: "2.8", status: "Needs Attention" }
  ],
  "school-c": [
    { id: "s301", name: "Lucas Vance", grade: "9-B", parentName: "Elena Vance", parentEmail: "elena.v@example.com", attendanceRate: 96.0, gpa: "3.95", status: "Excellent" }
  ]
};

const initialGrades = {
  "school-a": [
    { id: "g1", studentId: "s101", studentName: "Raj Patel", subject: "Mathematics", score: 35, total: 100, date: "2026-07-24", teacher: "Mr. Davis", feedback: "Struggling with calculus derivatives." },
    { id: "g2", studentId: "s102", studentName: "Aarav Sharma", subject: "Mathematics", score: 95, total: 100, date: "2026-07-24", teacher: "Mr. Davis", feedback: "Outstanding problem solving!" },
    { id: "g3", studentId: "s103", studentName: "Ananya Iyer", subject: "Physics", score: 82, total: 100, date: "2026-07-23", teacher: "Mrs. Curie", feedback: "Good effort in lab work." },
    { id: "g4", studentId: "s104", studentName: "Rohan Verma", subject: "English", score: 38, total: 100, date: "2026-07-22", teacher: "Ms. Austen", feedback: "Incomplete essay response." }
  ]
};

const initialAttendance = {
  "school-a": [
    { id: "att-1", studentId: "s101", studentName: "Raj Patel", date: "2026-07-25", status: "Absent", session: "Morning" },
    { id: "att-2", studentId: "s102", studentName: "Aarav Sharma", date: "2026-07-25", status: "Present", session: "Morning" },
    { id: "att-3", studentId: "s103", studentName: "Ananya Iyer", date: "2026-07-25", status: "Present", session: "Morning" },
    { id: "att-4", studentId: "s104", studentName: "Rohan Verma", date: "2026-07-25", status: "Absent", session: "Morning" },
    { id: "att-5", studentId: "s105", studentName: "Diya Kapoor", date: "2026-07-25", status: "Present", session: "Morning" }
  ]
};

const initialHomework = {
  "school-a": [
    { id: "hw1", title: "Calculus Problem Set #4", subject: "Mathematics", dueDate: "2026-07-22", status: "Overdue", assignedTo: "10-A", overdueDays: 3, pendingStudents: ["Raj Patel", "Rohan Verma"] },
    { id: "hw2", title: "Optics Lab Report", subject: "Physics", dueDate: "2026-07-26", status: "Active", assignedTo: "10-A", overdueDays: 0, pendingStudents: ["Raj Patel", "Aarav Sharma"] }
  ]
};

const initialFees = {
  "school-a": [
    { id: "fee1", studentId: "s101", studentName: "Raj Patel", amount: 450, dueDate: "2026-08-04", status: "Pending", daysRemaining: 10, parentContact: "anil.patel@example.com" },
    { id: "fee2", studentId: "s104", studentName: "Rohan Verma", amount: 450, dueDate: "2026-08-01", status: "Overdue", daysRemaining: -2, parentContact: "sunita.v@example.com" }
  ]
};

const initialBehavioralNotes = {
  "school-a": [
    { id: "b1", studentId: "s101", studentName: "Raj Patel", note: "Showed frustration during math quiz and left room early.", date: "2026-07-23", author: "Mr. Davis", sentiment: "Negative" },
    { id: "b2", studentId: "s104", studentName: "Rohan Verma", note: "Unresponsive during morning roll call three days in a row.", date: "2026-07-24", author: "Ms. Austen", sentiment: "Negative" }
  ]
};

const initialAlerts = [
  {
    id: "alt-101",
    schoolId: "school-a",
    agentName: "Attendance Monitor",
    agentIcon: "📊",
    title: "Low Attendance Alert: Raj Patel (74.5%)",
    message: "Raj Patel's attendance dropped below the 80% mandatory threshold. Auto notification sent to Anil Patel.",
    severity: "High",
    timestamp: "2026-07-25 09:15 AM",
    status: "Active",
    actionTaken: "Parent Alert Dispatched (SMS/Push)"
  },
  {
    id: "alt-102",
    schoolId: "school-a",
    agentName: "Grade Alert Agent",
    agentIcon: "⭐",
    title: "Intervention Signal: Raj Patel (35/100 Math)",
    message: "Mathematics test score < 40% detected. Teacher & Parent intervention notification queued.",
    severity: "High",
    timestamp: "2026-07-24 02:40 PM",
    status: "Active",
    actionTaken: "Remedial Plan Suggested"
  },
  {
    id: "alt-103",
    schoolId: "school-a",
    agentName: "Homework Tracker",
    agentIcon: "📝",
    title: "Overdue Assignment: Calculus Problem Set #4",
    message: "Assignment is 3 days overdue for 2 students. Auto-reminders sent to parent apps.",
    severity: "Medium",
    timestamp: "2026-07-25 08:00 AM",
    status: "Active",
    actionTaken: "Automated Push Notification Sent"
  }
];

const agentConfigs = [
  { id: "attendance_monitor", name: "Attendance Monitor", icon: "📊", trigger: "Daily end-of-school", action: "Flags <80% attendance → Parent alert", active: true, executionCount: 142, lastRun: "10 mins ago" },
  { id: "grade_alert", name: "Grade Alert Agent", icon: "⭐", trigger: "Grade entered (real-time)", action: "<40% marks → Intervention signal", active: true, executionCount: 89, lastRun: "1 hour ago" },
  { id: "homework_tracker", name: "Homework Tracker", icon: "📝", trigger: "Scheduled daily", action: "2 days overdue → Reminders sent", active: true, executionCount: 210, lastRun: "3 hours ago" },
  { id: "fee_reminder", name: "Fee Reminder Agent", icon: "💰", trigger: "Scheduled daily", action: "10 days before → Escalating reminders", active: true, executionCount: 56, lastRun: "Today at 06:00 AM" },
  { id: "behavioral_insight", name: "Behavioral Insight Agent", icon: "📈", trigger: "Weekly analysis", action: "Negative pattern → Counselor flag", active: true, executionCount: 28, lastRun: "Yesterday" },
  { id: "report_generator", name: "Report Generator", icon: "📋", trigger: "Monthly (end of month)", action: "Auto-generate progress reports", active: true, executionCount: 12, lastRun: "Jul 1, 2026" }
];

const agentLogs = [
  { id: "log-1", timestamp: new Date().toISOString(), agent: "Attendance Monitor", message: "Scanned 5 students for Springfield Academy. Flagged Raj Patel (74.5%).", status: "Success" },
  { id: "log-2", timestamp: new Date(Date.now() - 3600000).toISOString(), agent: "Grade Alert Agent", message: "Evaluated grade entry g1 (35%). Triggered intervention signal.", status: "Success" }
];

// Data state store
const store = {
  schools: [...initialSchools],
  students: { ...initialStudents },
  grades: { ...initialGrades },
  attendance: { ...initialAttendance },
  homework: { ...initialHomework },
  fees: { ...initialFees },
  behavioralNotes: { ...initialBehavioralNotes },
  alerts: [...initialAlerts],
  agentConfigs: [...agentConfigs],
  agentLogs: [...agentLogs],
  subscribers: [] // SSE Client res streams
};

module.exports = store;
