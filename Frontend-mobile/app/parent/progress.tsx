import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { fetchStudents, fetchGrades } from "../../lib/api";

export default function ProgressScreen() {
  const router = useRouter();
  const { schoolId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStudents(schoolId), fetchGrades(schoolId)]).then(([stu, grd]) => {
      setStudents(stu.students || []);
      setGrades(grd.grades || []);
      setLoading(false);
    });
  }, [schoolId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const child = students[0];
  const childGrades = grades.filter((g) => g.studentId === child?.id);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Progress Overview</Text>
      </View>

      {child && (
        <View style={styles.summary}>
          <Text style={styles.childName}>{child.name}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{child.attendanceRate}%</Text>
              <Text style={styles.summaryLabel}>Attendance</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{child.gpa}</Text>
              <Text style={styles.summaryLabel}>GPA</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Grades</Text>
      {childGrades.length === 0 ? (
        <Text style={styles.empty}>No grades recorded yet.</Text>
      ) : (
        childGrades.map((grade) => (
          <View key={grade.id} style={styles.gradeCard}>
            <View style={styles.gradeHeader}>
              <Text style={styles.subject}>{grade.subject}</Text>
              <Text style={[styles.score, grade.score < 40 && { color: "#FF6B35" }]}>
                {grade.score}/{grade.total}
              </Text>
            </View>
            <Text style={styles.feedback}>{grade.feedback || "No feedback"}</Text>
            <Text style={styles.date}>{grade.date} · {grade.teacher}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#4CAF50", padding: 24, paddingTop: 56 },
  back: { color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  summary: { backgroundColor: "#F3E5F5", margin: 16, borderRadius: 16, padding: 20 },
  childName: { fontSize: 20, fontWeight: "800" },
  summaryRow: { flexDirection: "row", marginTop: 16, gap: 12 },
  summaryItem: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 14, alignItems: "center" },
  summaryVal: { fontSize: 24, fontWeight: "800", color: "#4CAF50" },
  summaryLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", paddingHorizontal: 16, paddingTop: 8 },
  empty: { textAlign: "center", color: "#666", padding: 24 },
  gradeCard: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 8, borderRadius: 10, padding: 14 },
  gradeHeader: { flexDirection: "row", justifyContent: "space-between" },
  subject: { fontWeight: "600", fontSize: 15 },
  score: { fontWeight: "800", fontSize: 16, color: "#4CAF50" },
  feedback: { fontSize: 13, color: "#666", marginTop: 8 },
  date: { fontSize: 11, color: "#999", marginTop: 6 },
});
