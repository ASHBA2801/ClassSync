import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";

export default function Index() {
  const { role } = useAuth();
  if (!role) return <Redirect href="/login" />;
  if (role === "teacher") return <Redirect href="/teacher" />;
  return <Redirect href="/parent" />;
}
