# Vybeora Android Application Guide

This guide explains how to open, build, test, and generate the Android `.apk` for **Vybeora**.

---

## 📱 Project Details

* **App Name:** Vybeora
* **Package Identifier:** `com.vybeora.app`
* **Android Project Directory:** `frontend/android/`
* **Backend API & WebSocket IP:** `http://192.168.1.16:8000` (Your machine's local Wi-Fi IP)

---

## 🚀 Step 1: Open in Android Studio

1. Open **Android Studio** on your PC.
2. Select **Open** (or **File > Open**).
3. Navigate to and select this folder:
   ```
   c:\Users\ds445\OneDrive\Documents\vybeora\frontend\android
   ```
4. Let Android Studio sync the Gradle project automatically.

---

## 🛠️ Step 2: Build & Run on an Android Phone or Emulator

### Option A: Direct Run via Android Studio
1. Plug in your Android phone via USB and enable **USB Debugging** (Developer Options), OR start an Android Studio **Virtual Device (Emulator)**.
2. Click the green **▶ Run** button at the top of Android Studio.
3. The Vybeora Android App will install and launch on your phone/emulator!

### Option B: Generate Debug APK (to send/share directly to phone)
In Android Studio:
1. Go to the menu: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. When the build finishes, click **locate** in the notification.
3. Your generated `.apk` file will be at:
   ```
   frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. You can transfer this `app-debug.apk` directly to your phone via WhatsApp, Google Drive, or USB cable, and tap to install!

---

## 🔄 Synchronizing Code Changes

Whenever you modify any React code or design in `frontend/src`:
1. Run this single command inside `frontend/`:
   ```bash
   npm run android:sync
   ```
   *(This builds Vite and updates `android/app/src/main/assets/public` automatically).*
2. In Android Studio, click **Run** (or **Build APK**) to apply the changes.

---

## 🌐 Network Configuration for Android

* When running on your phone, ensure your phone is connected to the **same Wi-Fi network** as your PC.
* Your Django backend is running on `0.0.0.0:8000` so your phone can reach:
  * API: `http://192.168.1.16:8000/api/`
  * WebSockets: `ws://192.168.1.16:8000/ws/`
