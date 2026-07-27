// In-memory Multi-tenant Data Store & State Engine for ClassSync ERP

const initialSchools = [
  { id: "school-a", name: "Springfield Academy", code: "SPRING-01", studentsCount: 450, location: "North District" },
  { id: "school-b", name: "Oakridge High School", code: "OAK-02", studentsCount: 620, location: "Central Valley" },
  { id: "school-c", name: "St. Jude International", code: "JUDE-03", studentsCount: 380, location: "Westside Bay" }
];

// ─── Staff ────────────────────────────────────────────────────────────────────
const initialStaff = {
  "school-a": [
    {
      id: "t101", schoolId: "school-a", name: "Mr. Davis", email: "davis@spring.edu",
      phone: "+91-9876541001", department: "Mathematics", qualification: "M.Sc Mathematics",
      subjects: ["sub-math", "sub-cs"],
      availability: { Mon: [1,2,3,4,5,6], Tue: [1,2,3,4,5,6], Wed: [1,2,3,4], Thu: [1,2,3,4,5,6], Fri: [1,2,3,4,5] },
      joinDate: "2019-06-01", status: "Active"
    },
    {
      id: "t102", schoolId: "school-a", name: "Mrs. Curie", email: "curie@spring.edu",
      phone: "+91-9876541002", department: "Science", qualification: "M.Sc Physics",
      subjects: ["sub-physics", "sub-chem"],
      availability: { Mon: [1,2,3,4,5,6,7], Tue: [1,2,3,4,5,6,7], Wed: [1,2,3,4,5], Thu: [1,2,3,4,5], Fri: [1,2,3,4] },
      joinDate: "2020-07-15", status: "Active"
    },
    {
      id: "t103", schoolId: "school-a", name: "Ms. Austen", email: "austen@spring.edu",
      phone: "+91-9876541003", department: "Languages", qualification: "M.A English Literature",
      subjects: ["sub-english", "sub-hindi"],
      availability: { Mon: [3,4,5,6,7], Tue: [1,2,3,4,5,6], Wed: [1,2,3,4,5,6], Thu: [3,4,5,6,7], Fri: [1,2,3,4,5,6] },
      joinDate: "2021-03-10", status: "Active"
    },
    {
      id: "t104", schoolId: "school-a", name: "Mr. Gandhi", email: "gandhi@spring.edu",
      phone: "+91-9876541004", department: "Social Sciences", qualification: "M.A History",
      subjects: ["sub-history", "sub-civics"],
      availability: { Mon: [1,2,3,4,5], Tue: [1,2,3,4,5], Wed: [1,2,3,4,5,6,7], Thu: [1,2,3,4,5], Fri: [1,2,3,4,5,6,7] },
      joinDate: "2018-08-01", status: "Active"
    },
    {
      id: "t105", schoolId: "school-a", name: "Ms. Sharma", email: "sharma@spring.edu",
      phone: "+91-9876541005", department: "Physical Education", qualification: "B.P.Ed",
      subjects: ["sub-pe"],
      availability: { Mon: [6,7,8], Tue: [6,7,8], Wed: [6,7,8], Thu: [6,7,8], Fri: [6,7,8] },
      joinDate: "2022-01-20", status: "Active"
    }
  ],
  "school-b": [
    {
      id: "t201", schoolId: "school-b", name: "Dr. Kumar", email: "kumar@oak.edu",
      phone: "+91-9876542001", department: "Mathematics", qualification: "Ph.D Mathematics",
      subjects: ["sub-math", "sub-stats"],
      availability: { Mon: [1,2,3,4,5,6], Tue: [1,2,3,4,5,6], Wed: [1,2,3,4,5,6], Thu: [1,2,3,4,5,6], Fri: [1,2,3,4,5,6] },
      joinDate: "2017-06-01", status: "Active"
    }
  ]
};

// ─── Rooms ────────────────────────────────────────────────────────────────────
const initialRooms = {
  "school-a": [
    { id: "r101", schoolId: "school-a", name: "Room 101", capacity: 40, type: "Classroom", floor: "Ground", facilities: ["Projector", "Whiteboard"], status: "Available" },
    { id: "r102", schoolId: "school-a", name: "Room 102", capacity: 40, type: "Classroom", floor: "Ground", facilities: ["Projector", "Whiteboard"], status: "Available" },
    { id: "r103", schoolId: "school-a", name: "Room 103", capacity: 35, type: "Classroom", floor: "Ground", facilities: ["Whiteboard"], status: "Available" },
    { id: "r201", schoolId: "school-a", name: "Lab 201", capacity: 30, type: "Lab", floor: "First", facilities: ["Computers", "Projector", "AC"], status: "Available" },
    { id: "r202", schoolId: "school-a", name: "Lab 202 (Science)", capacity: 28, type: "Lab", floor: "First", facilities: ["Equipment", "AC"], status: "Available" },
    { id: "r301", schoolId: "school-a", name: "Hall 301", capacity: 200, type: "Auditorium", floor: "Second", facilities: ["Stage", "Projector", "AC", "Sound System"], status: "Available" },
    { id: "r302", schoolId: "school-a", name: "Library", capacity: 60, type: "Library", floor: "Second", facilities: ["Books", "Computers", "AC"], status: "Available" }
  ],
  "school-b": [
    { id: "r401", schoolId: "school-b", name: "Room A1", capacity: 45, type: "Classroom", floor: "Ground", facilities: ["Smart Board", "AC"], status: "Available" },
    { id: "r402", schoolId: "school-b", name: "Room A2", capacity: 45, type: "Classroom", floor: "Ground", facilities: ["Smart Board", "AC"], status: "Available" }
  ]
};

// ─── Subjects ────────────────────────────────────────────────────────────────
const initialSubjects = {
  "school-a": [
    { id: "sub-math",    schoolId: "school-a", name: "Mathematics", code: "MATH10", hoursPerWeek: 6, grade: "10", department: "Mathematics" },
    { id: "sub-physics", schoolId: "school-a", name: "Physics",     code: "PHY10",  hoursPerWeek: 5, grade: "10", department: "Science" },
    { id: "sub-chem",    schoolId: "school-a", name: "Chemistry",   code: "CHEM10", hoursPerWeek: 5, grade: "10", department: "Science" },
    { id: "sub-english", schoolId: "school-a", name: "English",     code: "ENG10",  hoursPerWeek: 5, grade: "10", department: "Languages" },
    { id: "sub-hindi",   schoolId: "school-a", name: "Hindi",       code: "HIN10",  hoursPerWeek: 4, grade: "10", department: "Languages" },
    { id: "sub-history", schoolId: "school-a", name: "History",     code: "HIST10", hoursPerWeek: 4, grade: "10", department: "Social Sciences" },
    { id: "sub-civics",  schoolId: "school-a", name: "Civics",      code: "CIV10",  hoursPerWeek: 3, grade: "10", department: "Social Sciences" },
    { id: "sub-cs",      schoolId: "school-a", name: "Computer Science", code: "CS10", hoursPerWeek: 3, grade: "10", department: "Technology" },
    { id: "sub-pe",      schoolId: "school-a", name: "Physical Education", code: "PE10", hoursPerWeek: 2, grade: "10", department: "Sports" }
  ],
  "school-b": [
    { id: "sub-stats",   schoolId: "school-b", name: "Statistics",  code: "STAT11", hoursPerWeek: 5, grade: "11", department: "Mathematics" },
    { id: "sub-math-b",  schoolId: "school-b", name: "Mathematics", code: "MATH11", hoursPerWeek: 6, grade: "11", department: "Mathematics" }
  ]
};

// ─── Timetable Slots (starts empty — generated by CSP solver) ─────────────────
const initialTimetableSlots = {
  "school-a": [],
  "school-b": [],
  "school-c": []
};

// ─── Documents ───────────────────────────────────────────────────────────────
const initialDocuments = {
  "school-a": [
    {
      id: "doc-001", schoolId: "school-a", fileName: "arjun_mehta_admission.pdf",
      formType: "admission", uploadedBy: "Admin", uploadedAt: "2026-07-25T09:30:00Z",
      status: "Reviewed",
      extractedData: {
        studentName: { value: "Arjun Mehta", confidence: 0.97, requiresReview: false },
        grade:       { value: "10",          confidence: 0.88, requiresReview: false },
        parentName:  { value: "Rakesh Mehta", confidence: 0.94, requiresReview: false },
        parentEmail: { value: "rakesh.mehta@gmail.com", confidence: 0.82, requiresReview: true }
      },
      confidence: 0.91, reviewNotes: "1 field needs review: Parent Email", linkedStudentId: null
    },
    {
      id: "doc-002", schoolId: "school-a", fileName: "priya_nair_marksheet_2025.jpg",
      formType: "marksheet", uploadedBy: "Admin", uploadedAt: "2026-07-26T11:15:00Z",
      status: "Pending",
      extractedData: {
        studentName: { value: "Priya Nair", confidence: 0.96, requiresReview: false },
        percentage:  { value: "87.0%",      confidence: 0.92, requiresReview: false },
        result:      { value: "PASS - First Division", confidence: 0.98, requiresReview: false }
      },
      confidence: 0.78, reviewNotes: "3 fields need review: Subjects & Marks, Roll Number, School Name", linkedStudentId: null
    }
  ]
};


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
  { id: "report_generator", name: "Report Generator", icon: "📋", trigger: "Monthly (end of month)", action: "Auto-generate progress reports", active: true, executionCount: 12, lastRun: "Jul 1, 2026" },
  { id: "resource_predictor", name: "Resource Predictor", icon: "🔮", trigger: "Weekly trend analysis", action: "Forecast staff/room shortages → Proactive alerts", active: true, executionCount: 4, lastRun: "3 days ago" }
];

const agentLogs = [
  { id: "log-1", timestamp: new Date().toISOString(), agent: "Attendance Monitor", message: "Scanned 5 students for Springfield Academy. Flagged Raj Patel (74.5%).", status: "Success" },
  { id: "log-2", timestamp: new Date(Date.now() - 3600000).toISOString(), agent: "Grade Alert Agent", message: "Evaluated grade entry g1 (35%). Triggered intervention signal.", status: "Success" }
];

// ─── School Admins ────────────────────────────────────────────────────────────
const initialSchoolAdmins = [
  { id: "sa-1", name: "Dr. Robert Vance", email: "admin@springfield.edu", schoolId: "school-a", role: "School Admin", status: "Active", phone: "+91-9876500001", appointedDate: "2024-01-15" },
  { id: "sa-2", name: "Sarah Jenkins", email: "admin@oakridge.edu", schoolId: "school-b", role: "School Admin", status: "Active", phone: "+91-9876500002", appointedDate: "2024-03-01" },
  { id: "sa-3", name: "Father Michael", email: "admin@stjude.edu", schoolId: "school-c", role: "School Admin", status: "Active", phone: "+91-9876500003", appointedDate: "2024-06-10" }
];

// Data state store
const store = {
  schools: [...initialSchools],
  schoolAdmins: [...initialSchoolAdmins],
  students: { ...initialStudents },
  grades: { ...initialGrades },
  attendance: { ...initialAttendance },
  homework: { ...initialHomework },
  fees: { ...initialFees },
  behavioralNotes: { ...initialBehavioralNotes },
  alerts: [...initialAlerts],
  agentConfigs: [...agentConfigs],
  agentLogs: [...agentLogs],
  staff: { ...initialStaff },
  rooms: { ...initialRooms },
  subjects: { ...initialSubjects },
  timetableSlots: { ...initialTimetableSlots },
  documents: { ...initialDocuments },
  subscribers: [] // SSE Client res streams
};

module.exports = store;
