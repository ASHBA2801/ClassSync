import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { fetchStudents, submitGrade } from "../../lib/api";

export default function GradesScreen() {
  const router = useRouter();
  const { schoolId } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [subject, setSubject] = useState("Mathematics");
  const [score, setScore] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchStudents(schoolId).then((res) => {
      setStudents(res.students || []);
      setLoading(false);
    });
  }, [schoolId]);

  async function handleSubmit() {
    if (!selected || !score) return;
    const res = await submitGrade({
      schoolId,
      studentId: selected.id,
      studentName: selected.name,
      subject,
      score: Number(score),
      teacher: "Mr. Davis",
    });
    setMessage(res.message || "Grade saved!");
    setScore("");
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
        <Text style={styles.title}>Grade Entry</Text>
      </View>

      <Text style={styles.label}>Select Student</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.studentList}>
        {students.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.studentChip, selected?.id === s.id && styles.studentChipActive]}
            onPress={() => setSelected(s)}
          >
            <Text style={[styles.studentChipText, selected?.id === s.id && styles.studentChipTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.form}>
        <Text style={styles.label}>Subject</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} />

        <Text style={styles.label}>Score (out of 100)</Text>
        <TextInput style={styles.input} value={score} onChangeText={setScore} keyboardType="numeric" placeholder="e.g. 85" />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>Save Grade & Trigger AI Agent</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.success}>{message}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#2E5090", padding: 24, paddingTop: 56 },
  back: { color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  label: { fontSize: 14, fontWeight: "600", paddingHorizontal: 16, paddingTop: 16, color: "#666" },
  studentList: { paddingHorizontal: 16, paddingVertical: 8 },
  studentChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", marginRight: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  studentChipActive: { backgroundColor: "#2E5090", borderColor: "#2E5090" },
  studentChipText: { fontSize: 13, color: "#666" },
  studentChipTextActive: { color: "#fff", fontWeight: "600" },
  form: { padding: 16 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 16 },
  submitBtn: { backgroundColor: "#FF6B35", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  success: { textAlign: "center", color: "#4CAF50", marginTop: 16 },
});
