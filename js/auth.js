/**
 * Lunchbox Firebase Auth Engine — Authentication & User Profile Management
 * Connects directly to real Firebase Authentication and Cloud Firestore for multi-device sync.
 */

class AuthEngine {
  constructor() {
    this.user = null;
    this.auth = null;
    this.init();
  }

  init() {
    this.loadLocalState();
    this.initFirebase();
  }

  loadLocalState() {
    const saved = localStorage.getItem('lunchbox_auth_user');
    if (saved) {
      try {
        this.user = JSON.parse(saved);
      } catch (e) {
        this.user = { isGuest: true, displayName: 'Guest', email: null };
      }
    } else {
      this.user = { isGuest: true, displayName: 'Guest', email: null };
    }
  }

  saveUserState(userObj) {
    this.user = userObj;
    localStorage.setItem('lunchbox_auth_user', JSON.stringify(userObj));
    if (window.app) window.app.updateAuthUI();
  }

  initFirebase() {
    if (window.firebaseAuth) {
      this.auth = window.firebaseAuth;
      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userObj = {
            isGuest: false,
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL || null
          };
          this.saveUserState(userObj);

          // Real Cloud Firestore Data Sync: Fetch user's saved vault from Firestore
          if (window.firebaseDb && window.store) {
            try {
              const docRef = window.firebaseDb.collection('users').doc(user.uid);
              const docSnap = await docRef.get();
              if (docSnap.exists) {
                console.log("🔥 Loaded user vault from Cloud Firestore");
                window.store.setState(docSnap.data());
              } else {
                // First login for brand new account: initialize with clean DEFAULT_DATA (1 sample notebook)
                console.log("✨ Initializing fresh vault for new account");
                window.store.resetToDefault();
                await docRef.set(window.store.data);
              }
              
              if (window.stickyManager && Notification.permission === 'granted') {
                window.stickyManager.subscribeToFCM();
              }
            } catch (dbErr) {
              console.error("Firestore sync error:", dbErr);
            }
          }

          // Unlocks the main app interface once logged in!
          if (window.app) {
            window.app.viewMode = 'shelf';
            window.app.render();
          }
        } else {
          // User logged out: lock them to the forefront Landing Page
          this.saveUserState({ isGuest: true, displayName: 'Guest', email: null });
          if (window.app) {
            window.app.viewMode = 'landing';
            window.app.render();
          }
        }
      });
    }
  }

  async signUp(email, password, displayName) {
    if (this.auth) {
      try {
        const res = await this.auth.createUserWithEmailAndPassword(email, password);
        if (displayName && res.user.updateProfile) {
          await res.user.updateProfile({ displayName: displayName });
        }
        const userObj = {
          isGuest: false,
          uid: res.user.uid,
          displayName: displayName || email.split('@')[0],
          email: email
        };
        this.saveUserState(userObj);
        if (window.app) {
          window.app.viewMode = 'shelf';
          window.app.render();
        }
        return { success: true, user: userObj };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      // Offline / Local Demo Mode Sign Up
      const userObj = {
        isGuest: false,
        uid: 'user_' + Date.now(),
        displayName: displayName || email.split('@')[0],
        email: email
      };
      this.saveUserState(userObj);
      if (window.app) {
        window.app.viewMode = 'shelf';
        window.app.render();
      }
      return { success: true, user: userObj };
    }
  }

  async signIn(email, password) {
    if (this.auth) {
      try {
        const res = await this.auth.signInWithEmailAndPassword(email, password);
        const userObj = {
          isGuest: false,
          uid: res.user.uid,
          displayName: res.user.displayName || email.split('@')[0],
          email: res.user.email
        };
        this.saveUserState(userObj);
        if (window.app) {
          window.app.viewMode = 'shelf';
          window.app.render();
        }
        return { success: true, user: userObj };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      // Offline / Local Demo Mode Sign In
      const userObj = {
        isGuest: false,
        uid: 'user_' + Date.now(),
        displayName: email.split('@')[0],
        email: email
      };
      this.saveUserState(userObj);
      if (window.app) {
        window.app.viewMode = 'shelf';
        window.app.render();
      }
      return { success: true, user: userObj };
    }
  }

  async signInWithGoogle() {
    if (this.auth && typeof firebase !== 'undefined' && firebase.auth.GoogleAuthProvider) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const res = await this.auth.signInWithPopup(provider);
        const userObj = {
          isGuest: false,
          uid: res.user.uid,
          displayName: res.user.displayName,
          email: res.user.email,
          photoURL: res.user.photoURL
        };
        this.saveUserState(userObj);
        if (window.app) {
          window.app.viewMode = 'shelf';
          window.app.render();
        }
        return { success: true, user: userObj };
      } catch (err) {
        return { success: false, error: err.message };
      }
    } else {
      // Offline / Local Demo Mode Google Auth
      const userObj = {
        isGuest: false,
        uid: 'google_user_' + Date.now(),
        displayName: 'Google Member',
        email: 'member@gmail.com'
      };
      this.saveUserState(userObj);
      if (window.app) {
        window.app.viewMode = 'shelf';
        window.app.render();
      }
      return { success: true, user: userObj };
    }
  }

  signOut() {
    if (this.auth) {
      try { this.auth.signOut(); } catch(e){}
    }
    const guestUser = { isGuest: true, displayName: 'Guest', email: null };
    this.saveUserState(guestUser);
    if (window.store) {
      window.store.resetToDefault();
    }
    if (window.app) {
      window.app.viewMode = 'landing';
      window.app.render();
    }
  }

  getCurrentUser() {
    return this.user || { isGuest: true, displayName: 'Guest', email: null };
  }
  
  isAuthenticated() {
    return this.user && !this.user.isGuest && this.user.email;
  }
}

window.authEngine = new AuthEngine();
