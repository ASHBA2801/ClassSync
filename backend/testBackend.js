const store = require('./store');
const agentEngine = require('./agents/agentEngine');

console.log("=== Testing EduSync Backend Data Store & AI Agents ===");
console.log("Schools:", store.schools.length);
console.log("Initial Alerts:", store.alerts.length);

console.log("\n--- Triggering Attendance Monitor ---");
const attRes = agentEngine.runAttendanceMonitor("school-a");
console.log("Attendance Monitor Result:", attRes);

console.log("\n--- Triggering Grade Alert Agent ---");
const gradeRes = agentEngine.runGradeAlertAgent("school-a");
console.log("Grade Alert Result:", gradeRes);

console.log("\n--- Triggering All Agents ---");
const allRes = agentEngine.runAllAgents("school-a");
console.log("All Agents Result:", allRes);

console.log("\nTotal Alerts in Store after triggers:", store.alerts.length);
console.log("Total Execution Logs:", store.agentLogs.length);
console.log("=== Backend Test Complete! ===");
