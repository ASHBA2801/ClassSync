import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { fetchHomework } from "../../lib/api";

export default function HomeworkScreen() {
  const router = useRouter();
  const { schoolId } = useAuth();
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomework(schoolId).then((res) => {
      setHomework(res.homework || []);
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Homework Tracker</Text>
      </View>

      {homework.length === 0 ? (
        <Text style={styles.empty}>No homework assignments.</Text>
      ) : (
        homework.map((hw) => (
          <View key={hw.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title2}>{hw.title}</Text>
              <Text style={[styles.status, hw.status === "Overdue" && styles.overdue]}>{hw.status}</Text>
            </View>
            <Text style={styles.subject}>{hw.subject} · Class {hw.assignedTo}</Text>
            <Text style={styles.due}>Due: {hw.dueDate}</Text>
            {hw.overdueDays > 0 && (
              <Text style={styles.overdueNote}>{hw.overdueDays} days overdue</Text>
            )}
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
  empty: { textAlign: "center", color: "#666", padding: 24 },
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title2: { fontWeight: "700", fontSize: 15, flex: 1 },
  status: { fontSize: 12, fontWeight: "600", color: "#4CAF50", backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  overdue: { color: "#FF6B35", backgroundColor: "#FFF3E0" },
  subject: { fontSize: 13, color: "#666", marginTop: 8 },
  due: { fontSize: 12, color: "#999", marginTop: 4 },
  overdueNote: { fontSize: 12, color: "#FF6B35", fontWeight: "600", marginTop: 6 },
});
