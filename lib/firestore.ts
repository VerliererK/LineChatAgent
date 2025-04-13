import { CONFIG } from "../utils/config";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore/lite';

const config = JSON.parse(atob(CONFIG.FIREBASE_CONFIG));
const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

let authInitialized = false;
async function initializeAuth() {
  if (!authInitialized) {
    await signInAnonymously(auth);
    authInitialized = true;
  }
}

export const getUserRef = async (id: string) => {
  await initializeAuth();
  return doc(db, "users", id);
}

export const deleteUser = async (id: string) => {
  const userRef = await getUserRef(id);
  return deleteDoc(userRef);
};

export const getMessages = async (id: string) => {
  const userRef = await getUserRef(id);
  const user = await getDoc(userRef);
  return user.exists() ? (user.data()?.messages || []) : [] as { role: string; content: string; }[];
};

export const setMessages = async (id: string, messages: { role: string; content: string }[]) => {
  if (!Array.isArray(messages)) return;
  const userRef = await getUserRef(id);
  return setDoc(userRef, { messages: messages });
};

export const clearMessages = async (id: string) => {
  return setMessages(id, []);
};
