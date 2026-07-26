/**
 * Lunchbox Firebase Configuration & Initialization
 *
 * PASTE YOUR FIREBASE PROJECT KEYS BELOW or enter them via the "Connect Firebase DB" button in the app!
 * When shipping on the internet, replacing these keys connects your app to your Firebase project.
 */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: ""
};

function initFirebaseServices() {
  if (typeof firebase === 'undefined') {
    console.warn("Firebase CDN scripts not loaded.");
    return;
  }

  // Check if user saved custom config in localStorage, otherwise use DEFAULT_FIREBASE_CONFIG above
  let savedConfig = {};
  try {
    savedConfig = JSON.parse(localStorage.getItem('lunchbox_firebase_config') || '{}');
  } catch(e) {}

  const activeConfig = {
    apiKey: savedConfig.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: savedConfig.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: savedConfig.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: savedConfig.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: savedConfig.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: savedConfig.appId || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId: savedConfig.measurementId || DEFAULT_FIREBASE_CONFIG.measurementId
  };

  const isPlaceholder = !activeConfig.apiKey || 
    activeConfig.apiKey === "YOUR_FIREBASE_API_KEY" || 
    !activeConfig.projectId || 
    activeConfig.projectId === "your-project-id";

  if (isPlaceholder) {
    console.info("⚡ Running in Local Vault Mode. Click 'Connect Firebase DB' in the app to link your Cloud project!");
    window.firebaseApp = null;
    window.firebaseAuth = null;
    window.firebaseDb = null;
    return;
  }

  try {
    if (!firebase.apps.length) {
      window.firebaseApp = firebase.initializeApp(activeConfig);
    } else {
      window.firebaseApp = firebase.app();
    }
    window.firebaseAuth = firebase.auth();
    window.firebaseDb = firebase.firestore();
    
    // Automatically persist active config so UI status badges reflect live connection
    try {
      localStorage.setItem('lunchbox_firebase_config', JSON.stringify(activeConfig));
    } catch(e) {}

    console.log("🔥 Successfully connected to Firebase Project:", activeConfig.projectId);
  } catch (err) {
    console.error("Error initializing Firebase:", err);
  }
}

// Initialize on load
initFirebaseServices();
