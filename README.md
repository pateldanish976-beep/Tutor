# EasyGrade (EasyGrade) — Tutor website

This repository contains a professional front-end prototype for EasyGrade — a home tutoring site with a Test Portal and Tutor Careers application.

This update integrates optional Firebase backend support (recommended):

What I added
- Firebase example config: assets/js/firebase-config.example.js
- Firebase helper initialization: assets/js/firebase.js (loads Firebase SDKs dynamically and exposes helper functions)
- Admin dashboard page: admin.html (reads results and applications when Firebase is configured and you are an admin)
- Updated index.html, test.html, careers.html to include Firebase scripts and a simple Sign In/Sign Up modal
- Updated assets/js/main.js to use FirebaseHelpers when available; otherwise it falls back to localStorage for demo mode

How to enable Firebase (recommended)
1. Create a Firebase project at https://console.firebase.google.com.
2. Enable Authentication (Email/Password) in the Firebase Console.
3. Enable Firestore and Storage.
4. Copy your Firebase config from Project Settings and create a file `assets/js/firebase-config.js` (do NOT commit your secrets publicly) with the same contents as `assets/js/firebase-config.example.js` but with real values. Alternatively replace the placeholder values in firebase-config.example.js.

Example firebase-config.js (replace placeholders):

```js
window.firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
window.easygradeAdmins = ['UID_OF_ADMIN'];
```

5. (Optional) Add admin UIDs to `window.easygradeAdmins` so the admin dashboard is accessible to those UIDs.

Local demo mode
- If Firebase is not configured or left with placeholders, the site will continue to work in demo/local mode using localStorage to save test results and applications.

Next steps I can implement
- Wire role-based UI (show user name, logout, and tutor/student dashboards)
- Add email verification & password reset flows
- Add server-side admin controls or Cloud Functions to send notification emails on new applications
- Deploy to Firebase Hosting or Vercel — I can add GitHub Actions for CI/CD and a one-click deploy guide.

If you want, I can:
- Finish Firebase setup for you if you provide a config (or I can provide step-by-step and you paste the config into the repo)
- Deploy the site to Firebase Hosting and wire up environment variables

