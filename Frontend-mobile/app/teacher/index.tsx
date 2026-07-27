import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { fetchStudents, fetchAlerts } from "../../lib/api";

export default function TeacherHome() {
  const router = useRouter();
  const { logout, schoolId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStudents(schoolId), fetchAlerts(schoolId)]).then(([stu, alt]) => {
      setStudents(stu.students || []);
      setAlerts(alt.alerts || []);
      setLoading(false);
    });
  }, [schoolId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E5090" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <TouchableOpacity onPress={() => { logout(); router.replace("/login"); }}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: "#E3F2FD" }]}>
          <Text style={styles.statNum}>{students.length}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: "#FFF3E0" }]}>
          <Text style={styles.statNum}>{alerts.filter((a) => a.status === "Active").length}</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/teacher/attendance")}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Bulk Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/teacher/grades")}>
          <Text style={styles.actionIcon}>⭐</Text>
          <Text style={styles.actionText}>Grade Entry</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Alerts</Text>
      {alerts.slice(0, 3).map((alert) => (
        <View key={alert.id} style={styles.alertCard}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertMsg}>{alert.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#2E5090", padding: 24, paddingTop: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  logout: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  statsRow: { flexDirection: "row", padding: 16, gap: 12 },
  stat: { flex: 1, borderRadius: 12, padding: 16, alignItems: "center" },
  statNum: { fontSize: 28, fontWeight: "800", color: "#2E5090" },
  statLabel: { fontSize: 13, color: "#666", marginTop: 4 },
  actions: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  actionBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionText: { fontWeight: "600", color: "#1a1a1a" },
  sectionTitle: { fontSize: 16, fontWeight: "700", padding: 16, paddingBottom: 8 },
  alertCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14, borderLeftWidth: 4, borderLeftColor: "#FF6B35" },
  alertTitle: { fontWeight: "600", fontSize: 14 },
  alertMsg: { fontSize: 12, color: "#666", marginTop: 4 },
});
