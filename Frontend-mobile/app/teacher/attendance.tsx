import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { fetchStudents, submitBulkAttendance } from "../../lib/api";

export default function AttendanceScreen() {
  const router = useRouter();
  const { schoolId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchStudents(schoolId).then((res) => {
      const list = res.students || [];
      setStudents(list);
      const initial: Record<string, string> = {};
      list.forEach((s: any) => { initial[s.id] = "Present"; });
      setStatuses(initial);
      setLoading(false);
    });
  }, [schoolId]);

  async function handleSubmit() {
    setSubmitting(true);
    const records = students.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      status: statuses[s.id] || "Present",
    }));
    const res = await submitBulkAttendance(schoolId, records);
    setMessage(res.message || "Attendance submitted!");
    setSubmitting(false);
  }

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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bulk Attendance</Text>
      </View>

      {students.map((student) => (
        <View key={student.id} style={styles.row}>
          <View>
            <Text style={styles.name}>{student.name}</Text>
            <Text style={styles.grade}>{student.grade}</Text>
          </View>
          <View style={styles.toggle}>
            {["Present", "Absent", "Late"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.chip, statuses[student.id] === status && styles.chipActive]}
                onPress={() => setStatuses({ ...statuses, [student.id]: status })}
              >
                <Text style={[styles.chipText, statuses[student.id] === status && styles.chipTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit Attendance (< 2 min)"}</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.success}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#2E5090", padding: 24, paddingTop: 56 },
  back: { color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  row: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 14 },
  name: { fontWeight: "600", fontSize: 15 },
  grade: { fontSize: 12, color: "#666", marginTop: 2 },
  toggle: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f1f5f9" },
  chipActive: { backgroundColor: "#2E5090" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  submitBtn: { backgroundColor: "#4CAF50", margin: 16, borderRadius: 12, padding: 16, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  success: { textAlign: "center", color: "#4CAF50", marginBottom: 24, paddingHorizontal: 16 },
});
