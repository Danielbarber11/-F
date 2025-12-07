
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getDatabase, ref, set, get, child, update, push, remove } from "firebase/database";
import { User, ProjectSession, AdRequest } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDu9xJlDhzA5TfBsakrQj21Ybupjcu7KDo",
  authDomain: "verdantconnect-wp8dj.firebaseapp.com",
  databaseURL: "https://verdantconnect-wp8dj-default-rtdb.firebaseio.com",
  projectId: "verdantconnect-wp8dj",
  storageBucket: "verdantconnect-wp8dj.firebasestorage.app",
  messagingSenderId: "530048230107",
  appId: "1:530048230107:web:e400c941adc4d4f829e2fe"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup }; // Ensure explicit export

// --- User Management ---

export const saveUserToDB = async (user: User) => {
  if (!user.email) return;
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    // Don't await specifically here if we want non-blocking UI, but better to await in logic
    await set(ref(db, 'users/' + currentUser.uid), user);
  } catch (error) {
    console.warn("DB Save Error (Check Firebase Rules):", error);
    // Suppress error to keep app running in "offline/local" mode perception
  }
};

export const getUserFromDB = async (uid: string): Promise<User | null> => {
  try {
    const snapshot = await get(child(ref(db), `users/${uid}`));
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.warn("DB Read Error (Check Firebase Rules):", error);
  }
  return null;
};

// --- Session (History) Management ---

export const saveSessionToDB = async (uid: string, session: ProjectSession) => {
  try {
    await set(ref(db, `sessions/${uid}/${session.id}`), session);
  } catch (error) {
    console.warn("Session Save Error:", error);
  }
};

export const getSessionsFromDB = async (uid: string): Promise<ProjectSession[]> => {
  try {
    const snapshot = await get(child(ref(db), `sessions/${uid}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data);
    }
  } catch (error) {
    console.warn("Session Read Error:", error);
  }
  return [];
};

export const deleteSessionFromDB = async (uid: string, sessionId: string) => {
  try {
    await remove(ref(db, `sessions/${uid}/${sessionId}`));
  } catch (error) {
    console.warn("Session Delete Error:", error);
  }
};

export const clearSessionsFromDB = async (uid: string) => {
  try {
    await remove(ref(db, `sessions/${uid}`));
  } catch (error) {
    console.warn("Session Clear Error:", error);
  }
}

// --- Ads Management ---

export const saveAdRequestToDB = async (ad: AdRequest) => {
  try {
    await set(ref(db, `ads/${ad.id}`), ad);
  } catch (error) {
    console.error("Ad Save Error:", error);
    throw error; // Ads are critical to save, let UI handle this specific error
  }
};

export const getAdsFromDB = async (): Promise<AdRequest[]> => {
  try {
    const snapshot = await get(child(ref(db), `ads`));
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.values(data);
    }
  } catch (error) {
    console.warn("Ad Read Error:", error);
  }
  return [];
}

export const deleteAdFromDB = async (adId: string) => {
  try {
    await remove(ref(db, `ads/${adId}`));
  } catch (error) {
    console.warn("Ad Delete Error:", error);
  }
}
