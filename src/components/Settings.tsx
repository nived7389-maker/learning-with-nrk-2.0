import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, CreditCard, Award, Sliders, PhoneCall, 
  LogOut, Pencil, ChevronRight, X, Sparkles, CheckCircle, Moon, Sun, Upload,
  Info, HelpCircle, Trash2
} from "lucide-react";
import { Student, Subscription } from "../types";
import { fetchUserSubscription, updateStudentProfile, fetchAppConfig } from "../firebase";
import Markdown from "react-markdown";

interface SettingsProps {
  student: Student;
  onLogout: () => void;
  onProfileUpdate: (updatedStudent: Student) => void;
}

export default function Settings({ student, onLogout, onProfileUpdate }: SettingsProps) {
  const [editingProfile, setEditingProfile] = useState(!student.name);
  const [newName, setNewName] = useState(student.name);
  const [newProfileImage, setNewProfileImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [appConfig, setAppConfig] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscriptions details
  const [subState, setSubState] = useState<Subscription | null>(null);

  // Modals status
  const [activeTabModal, setActiveTabModal] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const result = await fetchUserSubscription(student.uid);
      setSubState(result);
      const config = await fetchAppConfig();
      setAppConfig(config);
    }
    loadData();
  }, [student]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          setNewProfileImage(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!newName) {
      alert("Please enter a valid student name.");
      return;
    }
    setSaving(true);
    try {
      await updateStudentProfile(student.uid, newName, newProfileImage || undefined);
      // Notify parent
      onProfileUpdate({
        ...student,
        name: newName,
        profileImage: newProfileImage || student.profileImage,
      });
      setNewProfileImage(null);
      setEditingProfile(false);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to update profile due to an unknown error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="settings-portal-container" className="px-5 pb-24 text-slate-900 dark:text-white">
      
      <AnimatePresence>
        {/* MODAL WRAPPERS FOR SETTINGS OPTIONS */}
        {activeTabModal && (
          <motion.div
            id="settings-info-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-indigo-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setActiveTabModal(null)}
                className="absolute top-4 right-4 z-10 p-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="overflow-y-auto pr-2 pb-4 -mr-2 relative" style={{ overflowX: 'hidden' }}>
                {activeTabModal === "My Account" && (
                <div className="text-left space-y-4">
                  <h3 className="font-sans font-bold text-lg border-b border-black/5 dark:border-white/5 pb-2 text-indigo-400 flex items-center gap-1.5">
                    <User className="w-5 h-5" />
                    <span>My Account</span>
                  </h3>
                  <div className="space-y-3 font-sans text-xs">
                    <div>
                      <span className="text-slate-500 block">Universal Registrar UID</span>
                      <span className="font-mono bg-black/5 dark:bg-white/5 px-2 py-1 rounded block text-slate-900 dark:text-white select-all">{student.uid}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Personal Email</span>
                      <span className="font-mono bg-black/5 dark:bg-white/5 px-2 py-1 rounded block text-slate-900 dark:text-white">{student.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Registration date</span>
                      <span className="font-mono text-slate-900 dark:text-white block">{new Date(student.registeredAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Syllabus streams</span>
                      <span className="font-mono text-green-400 block">{student.class} {student.stream}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTabModal === "Subscriptions" && (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <CreditCard className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-indigo-400">Subscription status</h3>
                  <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-sans text-xs text-slate-500 dark:text-slate-400">Billing Profile Type</span>
                      <span className="font-sans text-xs font-bold text-indigo-300">NRK Study Access</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-sans text-xs text-slate-500 dark:text-slate-400">Status Status</span>
                      <span className={`font-mono text-xs font-bold uppercase ${
                        subState?.status === "active" ? "text-green-400" : "text-amber-400"
                      }`}>
                        {subState?.status === "active" ? "Activated" : "Pending/Inactive"}
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-[11px] text-gray-500 leading-normal">
                    Need subscription renewal? Contact Kerala HSE Admission office under Helpline 8848198680 for fast offline payment validation.
                  </p>
                </div>
              )}

              {activeTabModal === "Preferences" && (
                <div className="text-left space-y-4">
                  <h3 className="font-sans font-bold text-lg text-indigo-400 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.55">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    <span>User Preferences</span>
                  </h3>
                  <div className="space-y-3 font-sans text-xs">
                    <div className="flex justify-between items-center">
                      <span>Instant upload alerts</span>
                      <span className="text-green-400 font-semibold font-mono">ON</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Offline PDF compression</span>
                      <span className="text-green-400 font-semibold font-mono">HIGH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Syllabus year alignment</span>
                      <span className="text-indigo-300 font-semibold">2026 SCE</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTabModal === "About Us" && (
                <div className="text-left space-y-4">
                  <h3 className="font-sans font-bold text-lg text-indigo-400 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.5">
                    <Info className="w-5 h-5 text-indigo-400" />
                    <span>About learning with NRK</span>
                  </h3>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap">
                    {appConfig?.aboutText || "Learning with NRK is an online education platform tailored for higher-secondary students. Our mission is to provide free digital accessibility to all textbooks and syllabus documents."}
                  </div>
                </div>
              )}

              {activeTabModal === "Help" && (
                <div className="text-left space-y-4">
                  <h3 className="font-sans font-bold text-lg text-cyan-400 border-b border-black/5 dark:border-white/5 pb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-5 h-5 text-cyan-400" />
                    <span>Help and Support</span>
                  </h3>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap">
                    {appConfig?.helpText || "For any kind of technical doubts or support with subjects, please contact:\n\nEmail: contact@learningwithnrk.com\nPhone: +91 8848198680\nOr create a ticket through the dashboard."}
                  </div>
                </div>
              )}

              {activeTabModal === "Delete Account" && (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Trash2 className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-rose-500">Delete Account Permanently</h3>
                  <p className="font-sans text-[11px] text-gray-500 leading-normal">
                    Are you sure you want to delete your account? This action is irreversible. All your chat history, enrolled streams, and personal data will be erased forever.
                  </p>
                  
                  <button
                    onClick={() => {
                      alert("Due to security reasons, account deletion request has been submitted to the admin for review.");
                      setActiveTabModal(null);
                    }}
                    className="w-full h-11 rounded-xl bg-rose-600 text-white font-sans font-bold text-xs hover:bg-rose-500 transition-colors shadow-lg cursor-pointer"
                  >
                    Confirm Deletion
                  </button>
                  <button
                    onClick={() => setActiveTabModal(null)}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-slate-200 mt-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 pt-4">
        {/* Profile Card Header with edit options (matches Screen 3) */}
        <div id="profile-edit-header" className="relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-600 to-indigo-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg text-center overflow-hidden">
          <div className="absolute top-[10%] right-[5%] w-32 h-32 rounded-full bg-pink-500 opacity-20 blur-3xl" />
          
          {/* Avatar frame exactly like Screen 3 */}
          <div className="relative mb-3.5">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-300 dark:border-white/20 overflow-hidden flex items-center justify-center select-none shadow">
              {(newProfileImage || student.profileImage) ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={newProfileImage || student.profileImage} 
                  alt={student.name}
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-10 h-10 text-slate-500" />
              )}
            </div>
            
            {/* Round floating edit button */}
            <button
              id="edit-profile-avatar-btn"
              onClick={() => {
                if (!student.name) return;
                setEditingProfile(!editingProfile);
              }}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-900 dark:text-white hover:bg-emerald-400 active:scale-95 transition-all outline-none"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>

          <h3 id="profile-student-name" className="font-sans font-bold text-lg text-slate-900 dark:text-white leading-tight mb-1">{student.name || "Set Up Your Profile"}</h3>
          
          {/* Class designation pill from Screen 3 */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-white dark:bg-black/30 backdrop-blur-sm border border-black/5 dark:border-white/5 font-mono text-xs font-semibold text-emerald-300">
            <span>
              {student.class ? `${student.class} Science ` : "Class Unassigned "}
              {student.stream ? `(${student.stream === "Computer Science" ? "CS" : "Biology"})` : ""}
            </span>
            <button
              id="edit-class-stream-badge-btn"
              onClick={() => {
                if (!student.name) return;
                setEditingProfile(true);
              }}
              className="text-slate-600 dark:text-white/60 hover:text-slate-900 dark:text-white transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Profile edit controls */}
        {editingProfile && (
          <motion.div
            id="profile-editor-fields"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-emerald-300">Adjust Student Profile</span>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-1">Profile Photo</label>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {newProfileImage && <span className="text-[10px] text-emerald-400 font-mono">Image selected</span>}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-1">Full Student Name</label>
                <input 
                  id="edit-name-field"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-black/5 dark:border-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                id="save-profile-btn"
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2 text-xs font-semibold bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                id="cancel-profile-btn"
                onClick={() => {
                  if (!student.name) {
                    alert("You must complete your profile first.");
                    return;
                  }
                  setEditingProfile(false);
                }}
                className={`px-4 py-2 text-xs font-semibold bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-black/5 dark:bg-white/10 transition-colors ${!student.name ? "opacity-30 cursor-not-allowed" : ""}`}
                disabled={!student.name}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Primary Settings Menu Cells */}
        <div id="settings-cells-bundle" className="p-3.5 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
          {/* Item 1: My Account */}
          <button
            id="cell-my-account-btn"
            onClick={() => setActiveTabModal("My Account")}
            className="flex items-center justify-between w-full py-4 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <User className="w-4 h-4" />
              </div>
              <span className="font-sans font-semibold text-xs text-slate-900 dark:text-slate-200">My Account</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Item 2: Subscriptions */}
          <button
            id="cell-subscriptions-btn"
            onClick={() => setActiveTabModal("Subscriptions")}
            className="flex items-center justify-between w-full py-4 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="font-sans font-semibold text-xs text-slate-900 dark:text-slate-200">Subscriptions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Item 4: Preferences */}
          <button
            id="cell-preferences-btn"
            onClick={() => setActiveTabModal("Preferences")}
            className="flex items-center justify-between w-full py-4 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="font-sans font-semibold text-xs text-slate-900 dark:text-slate-200">Preferences</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Item 5: About Us */}
          <button
            onClick={() => setActiveTabModal("About Us")}
            className="flex items-center justify-between w-full py-4 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Info className="w-4 h-4" />
              </div>
              <span className="font-sans font-semibold text-xs text-slate-900 dark:text-slate-200">About learning with NRK</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Item 6: Help and Support */}
          <button
            onClick={() => setActiveTabModal("Help")}
            className="flex items-center justify-between w-full py-4 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="font-sans font-semibold text-xs text-slate-900 dark:text-slate-200">Help and Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Delete Account */}
          <button
            onClick={() => setActiveTabModal("Delete Account")}
            className="flex items-center justify-between w-full py-4 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="font-sans font-semibold text-xs text-rose-500/90 dark:text-rose-400">Delete Account Permanent</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Customer Care Section Widget */}
        <div id="settings-cus-care-box" className="p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="text-left font-sans">
              <span className="text-[10px] text-gray-500 font-semibold block leading-none mb-1">Customer Care Contact</span>
              <span className="text-xs font-bold text-teal-300 font-mono">8848198680</span>
            </div>
          </div>
          <a
            href="tel:8848198680"
            className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/20 text-[10.5px] font-sans font-semibold text-teal-300 hover:bg-teal-500/25 active:scale-95 transition-all text-center"
          >
            Call Support
          </a>
        </div>

        {/* Log Out button element */}
        <button
          id="settings-signout-btn"
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer outline-none"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Application</span>
        </button>
      </div>
    </div>
  );
}
