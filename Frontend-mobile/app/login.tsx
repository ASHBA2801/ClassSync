import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  function handleLogin(role: "teacher" | "parent") {
    login(role);
    router.replace(role === "teacher" ? "/teacher" : "/parent");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ClassSync</Text>
      <Text style={styles.subtitle}>AI-Powered School Management</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select your role</Text>
        <TouchableOpacity style={[styles.btn, styles.teacherBtn]} onPress={() => handleLogin("teacher")}>
          <Text style={styles.btnIcon}>👨‍🏫</Text>
          <Text style={styles.btnText}>Teacher</Text>
          <Text style={styles.btnDesc}>Attendance, grades, behavioral notes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.parentBtn]} onPress={() => handleLogin("parent")}>
          <Text style={styles.btnIcon}>👨‍👩‍👧</Text>
          <Text style={styles.btnText}>Parent</Text>
          <Text style={styles.btnDesc}>Progress, homework, alerts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E5090",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  btn: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  teacherBtn: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2E5090",
  },
  parentBtn: {
    backgroundColor: "#F3E5F5",
    borderColor: "#4CAF50",
  },
  btnIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  btnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  btnDesc: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
});
