const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

/** @type {import("expo/config").ExpoConfig} */
module.exports = {
  expo: {
    name: "ClassSync",
    slug: "classsync-mobile",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "classsync",
    userInterfaceStyle: "light",
    splash: {
      backgroundColor: "#2E5090",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.classsync.mobile",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#2E5090",
      },
      package: "com.classsync.mobile",
    },
    plugins: ["expo-router", "expo-asset"],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      enabled: false,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api",
    },
  },
};
