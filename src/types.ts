export interface Student {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  profileImage: string;
  registeredAt: string; // ISO String
  class: "+1" | "+2" | "";
  stream: "Computer Science" | "Biology Science" | "";
  status: "pending" | "approved" | "blocked";
  activeDeviceId?: string;
  superCoins?: number;
  performance?: Array<{
    videoId: string;
    videoTitle: string;
    subject: string;
    watchedFully: boolean;
    marks: number;
    totalQuestions: number;
    completedAt: string;
    examAttended?: boolean;
  }>;
}

export interface PdfAsset {
  id: string;
  title: string;
  class: "+1" | "+2";
  stream: "Computer Science" | "Biology Science" | "Both science";
  subject: string;
  pdfUrl: string;
  fileName: string;
  uploadedAt: string; // ISO String
}

export interface MicrobitAsset {
  id: string;
  title: string;
  class: "+1" | "+2" | "";
  stream: "Computer Science" | "Biology Science" | "Both science" | "";
  subject: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string; // ISO String
}

export interface VideoAsset {
  id: string;
  title: string;
  class: "+1" | "+2";
  stream: "Computer Science" | "Biology Science" | "Both science";
  subject: string;
  chapter: string;
  part: number;
  videoUrl: string;
  uploadedAt: string; // ISO String
}

export interface BannerAsset {
  id: string;
  imageUrl: string;
  active: boolean;
  updatedAt: string; // ISO String
}

export interface Subscription {
  studentId: string;
  status: "active" | "inactive";
  updatedAt: string; // ISO String
}

export type SubjectName = 
  | "Physics" 
  | "Chemistry" 
  | "Mathematics" 
  | "English" 
  | "Malayalam" 
  | "Computer Science" 
  | "Biology"
  | "Hindi";

export interface SubjectConfig {
  name: SubjectName;
  icon: string; // lucide icon name or emoji
  color: string; // Tailwind class
}
