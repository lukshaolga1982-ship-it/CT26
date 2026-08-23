import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, where, addDoc, setDoc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseApp = initializeApp(window.FIREBASE_CONFIG);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export async function loginWithStudentLogin(login, password) {
  return signInWithEmailAndPassword(auth, `${login.trim().toLowerCase()}@students.local`, password);
}
export async function loginWithTeacherEmail(email, password) {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}
export function watchAuth(callback) { return onAuthStateChanged(auth, callback); }
export function logout() { return signOut(auth); }
export async function createStudent(profile) {
  if (!auth.currentUser) throw new Error("Сначала войдите как учитель");
  const login = String(profile.login || "").trim().toLowerCase();
  const password = String(profile.password || "");
  const displayName = String(profile.displayName || "").trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(login)) throw new Error("Логин: 3–30 латинских букв, цифр, точек, дефисов или подчёркиваний");
  if (password.length < 8) throw new Error("Пароль должен содержать не менее 8 символов");
  if (!displayName) throw new Error("Укажите имя ученика");
  const teacherId = auth.currentUser.uid;
  const secondaryApp = initializeApp(window.FIREBASE_CONFIG, `student-creator-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(secondaryAuth, `${login}@students.local`, password);
    await setDoc(doc(db, "users", credential.user.uid), {
      role: "student", displayName, login,
      groupId: profile.groupId || "Без группы",
      active: true, createdBy: teacherId,
      totalErrors: 0, completedTests: 0, progressPercent: 0,
      createdAt: serverTimestamp()
    });
    return { uid: credential.user.uid, login };
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}
export { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, setDoc, updateDoc, serverTimestamp };
