import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  deleteUser
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  updateDoc as fsUpdateDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Student, PdfAsset, BannerAsset, Subscription } from "./types";

// User's provided Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOWsMWaPQ6Bc-4VHF7v_srTBsctmXCyk0",
  authDomain: "bright-future-tuition-89f4b.firebaseapp.com",
  projectId: "bright-future-tuition-89f4b",
  storageBucket: "bright-future-tuition-89f4b.firebasestorage.app",
  messagingSenderId: "103650923337",
  appId: "1:103650923337:web:e20d6658a53dcf3e048098",
};

// Initialize Firebase with safety check
export let app: any;
export let auth: any = null;
export let db: any = null;
export let storage: any = null;
const useLocalMock = false;

function getLocalData<T>(key: string, defaultValue: T): T {
  return defaultValue;
}

function setLocalData<T>(key: string, value: T): void {
  // no-op
}

const DEFAULT_BANNERS: BannerAsset[] = [];

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch((err) => console.error("Persistence error", err));
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Real database status trigger
export function isUsingLocalMock(): boolean {
  return false;
}

// ---------------------------------
// AUTH SERVICE WRAPPERS
// ---------------------------------

export async function loginWithGoogle(): Promise<Student | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if the student document exists
    const studentDocRef = doc(db, "students", user.uid);
    const studentDocSnap = await getDoc(studentDocRef);

    if (studentDocSnap.exists()) {
      const studentData = studentDocSnap.data() as Student;
      const deviceId = getOrCreateDeviceId();
      try {
        await updateDoc(studentDocRef, { activeDeviceId: deviceId });
        studentData.activeDeviceId = deviceId;
      } catch (e) {
        console.warn("Could not update device ID", e);
      }
      return studentData;
    } else {
      // Create a brand new approved profile so they go directly to the home page but must set up their details
      const newStudent: Student = {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        profileImage: user.photoURL || "",
        registeredAt: new Date().toISOString(),
        class: "",
        stream: "",
        status: "pending",
        activeDeviceId: getOrCreateDeviceId(),
      };

      try {
        await setDoc(studentDocRef, newStudent);
      } catch (err: any) {
        if (err.message && err.message.includes("permission")) {
          console.error(
            "Permission denied when creating student. Please update Firestore rules.",
            err,
          );
          throw new Error(
            "Missing or insufficient permissions to create student profile. Please update Firestore security rules in your Firebase Console.",
          );
        }
        throw err;
      }

      // Also provision an inactive subscription skeleton doc
      const subDocRef = doc(db, "subscriptions", user.uid);
      try {
        await setDoc(subDocRef, {
          studentId: user.uid,
          status: "inactive",
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn(
          "Could not create subscription doc - permissions issue. This can be ignored if the app rules are intentionally restricting it.",
          err,
        );
      }

      return newStudent;
    }
  } catch (error) {
    console.error("Google login failed", error);
    throw error;
  }
}

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem("lrnk_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem("lrnk_device_id", deviceId);
  }
  return deviceId;
}

export async function signUpWithEmail(
  email: string,
  pass: string,
  phone: string = "",
  name: string = "",
): Promise<Student> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const user = result.user;

  const studentDocRef = doc(db, "students", user.uid);
  const newStudent: Student = {
    uid: user.uid,
    name: name || email.split("@")[0], // Default name
    email: user.email || "",
    phone: phone,
    profileImage: "",
    registeredAt: new Date().toISOString(),
    class: "",
    stream: "",
    status: "pending",
    activeDeviceId: getOrCreateDeviceId(),
  };

  try {
    await setDoc(studentDocRef, newStudent);
  } catch (err: any) {
    if (err.message && err.message.includes("permission")) {
      console.error("Permission denied when creating student", err);
      throw new Error(
        "Missing or insufficient permissions. Please update your Firestore rules.",
      );
    }
    throw err;
  }

  const subDocRef = doc(db, "subscriptions", user.uid);
  try {
    await setDoc(subDocRef, {
      studentId: user.uid,
      status: "inactive",
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn("Could not create subscription doc due to permissions.", err);
  }

  return newStudent;
}

export async function loginWithEmail(
  email: string,
  pass: string,
): Promise<Student> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  const user = result.user;

  const studentDocRef = doc(db, "students", user.uid);
  const studentDocSnap = await getDoc(studentDocRef);

  if (studentDocSnap.exists()) {
    const studentData = studentDocSnap.data() as Student;
    const deviceId = getOrCreateDeviceId();
    try {
      await updateDoc(studentDocRef, { activeDeviceId: deviceId });
      studentData.activeDeviceId = deviceId;
    } catch (e) {
      console.warn("Could not update device ID", e);
    }
    return studentData;
  } else {
    throw new Error("Student profile not found.");
  }
}

export async function logoutUser() {
  if (auth) {
    await signOut(auth);
  }
}


// ---------------------------------
// FIRESTORE QUERIES & LIVE SYNC WRAPPERS
// ---------------------------------

// Fetch single student
export async function fetchStudentProfile(
  uid: string,
): Promise<Student | null> {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    return students.find((s) => s.uid === uid) || null;
  }

  try {
    const studentDocRef = doc(db, "students", uid);
    const snap = await getDoc(studentDocRef);
    if (snap.exists()) {
      return snap.data() as Student;
    }
  } catch (err) {
    console.error("fetchStudentProfile failed:", err);
  }
  return null;
}

export function listenStudentProfile(
  uid: string,
  onUpdate: (student: Student | null) => void,
) {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    const student = students.find((s) => s.uid === uid) || null;
    onUpdate(student);
    return () => {}; // No-op unsubscribe for local mock
  }

  const studentDocRef = doc(db, "students", uid);
  return onSnapshot(
    studentDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Student);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error("listenStudentProfile error:", err);
    },
  );
}

// For Student: Profile Edit
export async function updateStudentProfile(
  uid: string,
  name: string,
  profileImage?: string
): Promise<void> {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    const idx = students.findIndex((s) => s.uid === uid);
    if (idx !== -1) {
      students[idx].name = name;
      if (profileImage !== undefined) {
        students[idx].profileImage = profileImage;
      }
      setLocalData("students", students);
    }
    return;
  }

  try {
    const studentDocRef = doc(db, "students", uid);
    const updateData: any = { name };
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }
    await updateDoc(studentDocRef, updateData);
  } catch (err: any) {
    console.error("updateStudentProfile failed:", err);
    if (err.message && err.message.includes("permission")) {
      throw new Error(
        "Missing permissions to update profile. Please deploy the updated firestore.rules.",
      );
    }
    throw err;
  }
}

// Fetch Subscription
export async function fetchUserSubscription(
  uid: string,
): Promise<Subscription | null> {
  if (useLocalMock) {
    const subs = getLocalData<Subscription[]>("subscriptions", []);
    return (
      subs.find((s) => s.studentId === uid) || {
        studentId: uid,
        status: "inactive",
        updatedAt: new Date().toISOString(),
      }
    );
  }

  try {
    const subDocRef = doc(db, "subscriptions", uid);
    const snap = await getDoc(subDocRef);
    if (snap.exists()) {
      return snap.data() as Subscription;
    }
  } catch (err) {
    console.error("fetchUserSubscription failed:", err);
  }
  return {
    studentId: uid,
    status: "inactive",
    updatedAt: new Date().toISOString(),
  };
}

export function listenToUserSubscription(
  uid: string,
  callback: (sub: Subscription) => void,
): () => void {
  if (useLocalMock) {
    let lastStatus = "";
    const interval = setInterval(() => {
      const subs = getLocalData<Subscription[]>("subscriptions", []);
      const currentSub = subs.find((s) => s.studentId === uid) || {
        studentId: uid,
        status: "inactive",
        updatedAt: new Date().toISOString(),
      };
      if (currentSub.status !== lastStatus) {
        lastStatus = currentSub.status;
        callback(currentSub);
      }
    }, 1000);
    return () => clearInterval(interval);
  }

  const subDocRef = doc(db, "subscriptions", uid);
  return onSnapshot(subDocRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as Subscription);
    } else {
      callback({
        studentId: uid,
        status: "inactive",
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

// List Dynamic Banners
export async function fetchBanners(): Promise<BannerAsset[]> {
  if (useLocalMock) {
    const banners = getLocalData<BannerAsset[]>("banners", []);
    return banners.filter((b) => b.active);
  }

  try {
    const bannersCol = collection(db, "banners");
    const snap = await getDocs(bannersCol);
    const results: BannerAsset[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.active) {
        results.push(data as BannerAsset);
      }
    });
    return results;
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      console.warn("fetchBanners query denied.");
      return DEFAULT_BANNERS;
    }
    console.error("fetchBanners failed:", err);
    return DEFAULT_BANNERS;
  }
}

// List PDFs matching class, stream, subject
export async function fetchPDFs(
  classRoom: string,
  stream: string,
  subject: string,
): Promise<PdfAsset[]> {
  if (useLocalMock) {
    const pdfs = getLocalData<PdfAsset[]>("pdfs", []);
    return pdfs.filter(
      (pdf) =>
        pdf.class === classRoom &&
        pdf.stream === stream &&
        pdf.subject.toLowerCase() === subject.toLowerCase(),
    );
  }

  try {
    const q = query(
      collection(db, "pdfs"),
      where("class", "==", classRoom),
      where("stream", "==", stream),
      where("subject", "==", subject),
    );
    const snap = await getDocs(q);
    const results: PdfAsset[] = [];
    snap.forEach((doc) => {
      results.push(doc.data() as PdfAsset);
    });
    return results;
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      console.warn("fetchPDFs query denied.");
      return [];
    }
    console.error("fetchPDFs failed:", err);
    return [];
  }
}

export async function fetchLibraryPDFs(
  classRoom: string,
  stream: string,
): Promise<PdfAsset[]> {
  if (useLocalMock) {
    const pdfs = getLocalData<PdfAsset[]>("pdfs", []);
    return pdfs.filter(
      (pdf) => pdf.class === classRoom && pdf.stream === stream,
    );
  }

  try {
    const q = query(
      collection(db, "pdfs"),
      where("class", "==", classRoom),
      where("stream", "==", stream),
    );
    const snap = await getDocs(q);
    const results: PdfAsset[] = [];
    snap.forEach((doc) => {
      results.push(doc.data() as PdfAsset);
    });
    return results;
  } catch (err) {
    console.error("fetchLibraryPDFs failed:", err);
    return [];
  }
}

// ---------------------------------
// ADMIN DASHBOARD WRITE OPERATIONS
// ---------------------------------

// Admin Dashboard stats
export async function getAdminDashboardStats() {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    const subs = getLocalData<Subscription[]>("subscriptions", []);

    return {
      total: students.length,
      approved: students.filter((s) => s.status === "approved").length,
      pending: students.filter((s) => s.status === "pending" || s.status === "blocked").length,
      activeSubs: subs.filter((sub) => sub.status === "active").length,
    };
  }

  try {
    const studentsSnap = await getDocs(collection(db, "students"));
    const subsSnap = await getDocs(collection(db, "subscriptions"));
    const students: Student[] = [];
    studentsSnap.forEach((doc) => students.push(doc.data() as Student));
    const subscriptions: Subscription[] = [];
    subsSnap.forEach((doc) => subscriptions.push(doc.data() as Subscription));

    return {
      total: students.length,
      approved: students.filter((s) => s.status === "approved").length,
      pending: students.filter((s) => s.status === "pending" || s.status === "blocked").length,
      activeSubs: subscriptions.filter((s) => s.status === "active").length,
    };
  } catch (err: any) {
    if (err.message && err.message.includes("permission")) {
      console.warn("Admin query denied. User is not an admin.");
      throw new Error(
        "Missing Firebase permissions! You must add your UID to the 'admins' collection in your Firestore Database.",
      );
    }
    console.error("getAdminDashboardStats failed:", err);
    throw err;
  }
}

// Fetch all students for management list
export async function fetchAllStudents(): Promise<Student[]> {
  if (useLocalMock) {
    return getLocalData<Student[]>("students", []);
  }

  try {
    const snap = await getDocs(collection(db, "students"));
    const list: Student[] = [];
    snap.forEach((doc) => list.push(doc.data() as Student));
    return list.sort(
      (a, b) =>
        new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      console.warn("Admin query denied. User is not an admin.");
      return [];
    }
    console.error("fetchAllStudents failed:", err);
    return [];
  }
}

// Update student verification and stream allocation
export async function adminApproveStudent(
  uid: string,
): Promise<void> {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    const idx = students.findIndex((s) => s.uid === uid);
    if (idx !== -1) {
      students[idx].status = "approved";
      setLocalData("students", students);

      const subs = getLocalData<Subscription[]>("subscriptions", []);
      const subIdx = subs.findIndex((s) => s.studentId === uid);
      if (subIdx !== -1) {
        subs[subIdx].status = "active";
        subs[subIdx].updatedAt = new Date().toISOString();
      } else {
        subs.push({
          studentId: uid,
          status: "active",
          updatedAt: new Date().toISOString(),
        });
      }
      setLocalData("subscriptions", subs);
    }
    return;
  }

  try {
    const docRef = doc(db, "students", uid);
    await updateDoc(docRef, {
      status: "approved",
    });

    // Automatically activate the subscription upon approval
    const subDocRef = doc(db, "subscriptions", uid);
    await setDoc(
      subDocRef,
      {
        studentId: uid,
        status: "active",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (err: any) {
    console.error("adminApproveStudent failed:", err);
    if (err.message && err.message.includes("permission"))
      throw new Error("Approval Denied: Missing Admin Privileges.");
    throw err;
  }
}

export async function adminUpdateStudentCourse(
  uid: string,
  classRoom: "+1" | "+2",
  streamRoom: "Computer Science" | "Biology Science",
): Promise<void> {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    const idx = students.findIndex((s) => s.uid === uid);
    if (idx !== -1) {
      students[idx].class = classRoom;
      students[idx].stream = streamRoom;
      setLocalData("students", students);
    }
    return;
  }

  try {
    const docRef = doc(db, "students", uid);
    await updateDoc(docRef, {
      class: classRoom,
      stream: streamRoom,
    });
  } catch (err: any) {
    console.error("adminUpdateStudentCourse failed:", err);
    if (err.message && err.message.includes("permission"))
      throw new Error("Update Denied: Missing Admin Privileges.");
    throw err;
  }
}

export async function adminRejectStudent(uid: string): Promise<void> {
  if (useLocalMock) {
    const students = getLocalData<Student[]>("students", []);
    const idx = students.findIndex((s) => s.uid === uid);
    if (idx !== -1) {
      students[idx].status = "blocked";
      setLocalData("students", students);
    }
    return;
  }

  try {
    const docRef = doc(db, "students", uid);
    await updateDoc(docRef, {
      status: "blocked",
    });
  } catch (err: any) {
    console.error("adminRejectStudent failed:", err);
    if (err.message && err.message.includes("permission"))
      throw new Error("Rejection Denied: Missing Admin Privileges.");
    throw err;
  }
}

// Upload study material PDF

export async function adminUploadPDFFile(
  title: string,
  classRoom: "+1" | "+2",
  stream: "Computer Science" | "Biology Science",
  subject: string,
  pdfFile: File
): Promise<void> {
  const newId = "pdf_" + Date.now();
  if (useLocalMock) return;

  try {
    const storageRefPath = `pdfs/${newId}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const fileRef = ref(storage, storageRefPath);
    await uploadBytes(fileRef, pdfFile);
    const pdfUrl = await getDownloadURL(fileRef);

    const pdfDocRef = doc(db, "pdfs", newId);
    await setDoc(pdfDocRef, {
      id: newId,
      title,
      class: classRoom,
      stream,
      subject,
      pdfUrl: pdfUrl,
      fileName: pdfFile.name,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("adminUploadPDFFile failed:", err);
    throw err;
  }
}

export async function adminUploadPDF(
  title: string,
  classRoom: "+1" | "+2",
  stream: "Computer Science" | "Biology Science",
  subject: string,
  pdfLink: string,
): Promise<void> {
  const newId = "pdf_" + Date.now();

  if (useLocalMock) {
    const pdfs = getLocalData<PdfAsset[]>("pdfs", []);
    pdfs.push({
      id: newId,
      title,
      class: classRoom,
      stream,
      subject,
      pdfUrl: pdfLink,
      fileName: title,
      uploadedAt: new Date().toISOString(),
    });
    setLocalData("pdfs", pdfs);
    return;
  }

  try {
    // 2. Add to firestore
    const pdfDocRef = doc(db, "pdfs", newId);
    await setDoc(pdfDocRef, {
      id: newId,
      title,
      class: classRoom,
      stream,
      subject,
      pdfUrl: pdfLink,
      fileName: title,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("adminUploadPDF failed:", err);
    if (
      err.message &&
      (err.message.includes("permission") ||
        err.message.includes("unauthorized"))
    ) {
      throw new Error(
        "Upload Failed: Missing admin permissions. Check your Firebase security rules.",
      );
    }
    throw err;
  }
}

// Edit PDF
export async function adminEditPDF(
  id: string,
  newTitle: string,
  newLink: string,
): Promise<void> {
  if (useLocalMock) {
    const pdfs = getLocalData<PdfAsset[]>("pdfs", []);
    const index = pdfs.findIndex((p) => p.id === id);
    if (index > -1) {
      pdfs[index] = {
        ...pdfs[index],
        title: newTitle,
        pdfUrl: newLink,
        fileName: newTitle,
      };
      setLocalData("pdfs", pdfs);
    }
    return;
  }

  try {
    const docRef = doc(db, "pdfs", id);
    await updateDoc(docRef, {
      title: newTitle,
      pdfUrl: newLink,
      fileName: newTitle,
    });
  } catch (err) {
    console.error("adminEditPDF error:", err);
    throw err;
  }
}

// Delete PDf
export async function adminDeletePDF(
  id: string,
  fileName: string,
): Promise<void> {
  if (useLocalMock) {
    const pdfs = getLocalData<PdfAsset[]>("pdfs", []);
    const filtered = pdfs.filter((p) => p.id !== id);
    setLocalData("pdfs", filtered);
    return;
  }

  try {
    // Delete document
    const docRef = doc(db, "pdfs", id);
    await deleteDoc(docRef);

    // Try to delete file from Storage
    try {
      const storageRef = ref(storage, `pdfs/${id}_${fileName}`);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn(
        "Storage deletion warning (might already be deleted or missing ref):",
        e,
      );
    }
  } catch (err) {
    console.error("adminDeletePDF error:", err);
    throw err;
  }
}

// Update Banner list with actual image upload
export async function adminUpdateBanner(linkUrl: string): Promise<void> {
  const newId = "banner_" + Date.now();
  let imgUrl =
    linkUrl ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80";

  if (useLocalMock) {
    const banners = getLocalData<BannerAsset[]>("banners", []);
    // Disable previous banners
    banners.forEach((b) => (b.active = false));
    banners.push({
      id: newId,
      imageUrl: imgUrl,
      active: true,
      updatedAt: new Date().toISOString(),
    });
    setLocalData("banners", banners);
    return;
  }

  try {
    // Put to banners
    const bannersCol = collection(db, "banners");
    // Simple overwrite with one active promo banner
    const queryActive = query(bannersCol, where("active", "==", true));
    const activeSnaps = await getDocs(queryActive);
    for (const snap of activeSnaps.docs) {
      await updateDoc(doc(db, "banners", snap.id), { active: false });
    }

    const docRef = doc(db, "banners", newId);
    await setDoc(docRef, {
      id: newId,
      imageUrl: imgUrl,
      active: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("adminUpdateBanner failed:", err);
    throw err;
  }
}

export async function adminDeleteBanner(id: string): Promise<void> {
  if (useLocalMock) {
    const banners = getLocalData<BannerAsset[]>("banners", []);
    const newBanners = banners.filter((b) => b.id !== id);
    setLocalData("banners", newBanners);
    return;
  }

  try {
    const docRef = doc(db, "banners", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("adminDeleteBanner error:", err);
    throw err;
  }
}

// Subscription management
export async function makeMeAdmin(uid: string): Promise<void> {
  try {
    const adminRef = doc(db, "admins", uid);
    await setDoc(adminRef, {
      createdAt: new Date().toISOString(),
      role: "admin",
    });
  } catch (err: any) {
    console.error("makeMeAdmin failed:", err);
    throw new Error(
      "Failed to make you an admin! Make sure you updated your firestore.rules to allow writing to the admins collection, as shown in the updated rules file.",
    );
  }
}

export async function adminToggleSubscription(
  uid: string,
  status: "active" | "inactive",
): Promise<void> {
  if (useLocalMock) {
    const subs = getLocalData<Subscription[]>("subscriptions", []);
    const idx = subs.findIndex((s) => s.studentId === uid);
    if (idx !== -1) {
      subs[idx].status = status;
      subs[idx].updatedAt = new Date().toISOString();
    } else {
      subs.push({
        studentId: uid,
        status,
        updatedAt: new Date().toISOString(),
      });
    }
    setLocalData("subscriptions", subs);
    return;
  }

  try {
    const subDocRef = doc(db, "subscriptions", uid);
    await setDoc(
      subDocRef,
      {
        studentId: uid,
        status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (err: any) {
    console.error("adminToggleSubscription failed:", err);
    if (err.message && err.message.includes("permission"))
      throw new Error("Toggle Denied: Missing Admin Privileges.");
    throw err;
  }
}

export async function updateAppConfig(config: any): Promise<void> {
  if (useLocalMock) {
    setLocalData("astr_app_config", config);
    return;
  }
  try {
    const docRef = doc(db, "settings", "global");
    await setDoc(docRef, config, { merge: true });
  } catch (err) {
    console.warn("Could not save config", err);
  }
}

export async function fetchAppConfig(): Promise<any> {
  if (useLocalMock) {
    return getLocalData("astr_app_config", {});
  }
  try {
    const docRef = doc(db, "settings", "global");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn("Could not fetch config", err);
  }
  return {};
}

export function listenAppConfig(callback: (config: any) => void): () => void {
  if (useLocalMock) {
    callback(getLocalData("astr_app_config", {}));
    // Poll for mock environment updates occasionally
    const intervalId = setInterval(() => {
      callback(getLocalData("astr_app_config", {}));
    }, 2000);
    return () => clearInterval(intervalId);
  }
  
  const docRef = doc(db, "settings", "global");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({});
    }
  }, (err) => {
    console.warn("Could not listen to config", err);
  });
}

export async function saveAIChatHistory(uid: string, histories: any[]) {
  if (useLocalMock) {
    setLocalData(`astr_ai_history_${uid}`, histories);
    return;
  }
  try {
    const docRef = doc(db, "students", uid);
    await updateDoc(docRef, { aiChatHistories: histories });
  } catch (err: any) {
    if (err.code === "not-found") {
      const docRef = doc(db, "students", uid);
      await setDoc(docRef, { aiChatHistories: histories }, { merge: true });
    } else {
      console.warn("Error saving AI history", err);
    }
  }
}

export async function fetchAIChatHistory(uid: string): Promise<any[]> {
  if (useLocalMock) {
    return getLocalData(`astr_ai_history_${uid}`, []);
  }
  try {
    const docRef = doc(db, "students", uid);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().aiChatHistories) {
      return snap.data().aiChatHistories;
    }
  } catch (e) {
    console.warn("Could not fetch AI history", e);
  }
  return [];
}
