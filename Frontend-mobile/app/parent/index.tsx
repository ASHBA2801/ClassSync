import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { fetchStudents, fetchAlerts, fetchHomework } from "../../lib/api";

export default function ParentHome() {
  const router = useRouter();
  const { logout, schoolId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStudents(schoolId), fetchAlerts(schoolId), fetchHomework(schoolId)]).then(
      ([stu, alt, hw]) => {
        setStudents(stu.students || []);
        setAlerts(alt.alerts || []);
        setHomework(hw.homework || []);
        setLoading(false);
      }
    );
  }, [schoolId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const child = students[0];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parent Dashboard</Text>
        <TouchableOpacity onPress={() => { logout(); router.replace("/login"); }}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {child && (
        <View style={styles.childCard}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childGrade}>{child.grade}</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{child.attendanceRate}%</Text>
              <Text style={styles.metricLabel}>Attendance</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{child.gpa}</Text>
              <Text style={styles.metricLabel}>GPA</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricVal, child.status === "Critical Flag" && { color: "#FF6B35" }]}>
                {child.status}
              </Text>
              <Text style={styles.metricLabel}>Status</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/parent/progress")}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/parent/homework")}>
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionText}>Homework</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Alerts</Text>
      {alerts.slice(0, 4).map((alert) => (
        <View key={alert.id} style={styles.alertCard}>
          <Text style={styles.alertAgent}>{alert.agentIcon} {alert.agentName}</Text>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertMsg}>{alert.message}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Homework ({homework.length})</Text>
      {homework.slice(0, 2).map((hw) => (
        <View key={hw.id} style={styles.hwCard}>
          <Text style={styles.hwTitle}>{hw.title}</Text>
          <Text style={styles.hwMeta}>{hw.subject} · Due {hw.dueDate}</Text>
          <Text style={[styles.hwStatus, hw.status === "Overdue" && { color: "#FF6B35" }]}>{hw.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#4CAF50", padding: 24, paddingTop: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  logout: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  childCard: { backgroundColor: "#F3E5F5", margin: 16, borderRadius: 16, padding: 20 },
  childName: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  childGrade: { fontSize: 14, color: "#666", marginTop: 4 },
  metrics: { flexDirection: "row", marginTop: 16, gap: 12 },
  metric: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 12, alignItems: "center" },
  metricVal: { fontSize: 18, fontWeight: "800", color: "#4CAF50" },
  metricLabel: { fontSize: 11, color: "#666", marginTop: 4 },
  actions: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  actionBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionText: { fontWeight: "600", color: "#1a1a1a" },
  sectionTitle: { fontSize: 16, fontWeight: "700", padding: 16, paddingBottom: 8 },
  alertCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: "#4CAF50" },
  alertAgent: { fontSize: 12, color: "#666" },
  alertTitle: { fontWeight: "600", fontSize: 14, marginTop: 4 },
  alertMsg: { fontSize: 12, color: "#666", marginTop: 4 },
  hwCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14 },
  hwTitle: { fontWeight: "600", fontSize: 14 },
  hwMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  hwStatus: { fontSize: 12, fontWeight: "600", color: "#4CAF50", marginTop: 4 },
});
