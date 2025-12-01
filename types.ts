
export enum Screen {
  AUTH = 'AUTH',
  TERMS = 'TERMS',
  HOME = 'HOME',
  WORKSPACE = 'WORKSPACE',
  PREMIUM = 'PREMIUM',
  ADVERTISE = 'ADVERTISE',
  AD_MANAGEMENT = 'AD_MANAGEMENT'
}

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum SettingsTab {
  ACCOUNT = 'ACCOUNT',
  INTERFACE = 'INTERFACE',
  HISTORY = 'HISTORY',
  ACCESSIBILITY = 'ACCESSIBILITY',
  HELP = 'HELP',
  ABOUT = 'ABOUT',
  TERMS = 'TERMS'
}

export enum ChatMode {
  CREATOR = 'CREATOR',
  QUESTION = 'QUESTION'
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface ProjectSession {
  id: string;
  name: string; // The prompt or custom name
  config: ProjectConfig;
  code: string;
  creatorMessages: ChatMessage[];
  questionMessages: ChatMessage[];
  lastModified: number;
}

export interface ProjectConfig {
  prompt: string;
  language: string;
  model: string;
  chatMode: ChatMode;
  files?: FileList | null;
}

export interface GeneratedCode {
  language: string;
  code: string;
}

export interface UserPreferences {
  enterToSend: boolean;
  streamCode: boolean;
  saveHistory: boolean;
  appLanguage?: 'he' | 'en';
  theme?: 'light' | 'dark' | 'midnight' | 'sunset' | 'ocean' | 'forest' | 'cherry';
  dailyRequestsCount?: number;
  lastRequestDate?: string;
}

export interface User {
  email: string;
  password?: string; // Optional for Google Auth
  name?: string;
  picture?: string;
  hasAcceptedTerms: boolean;
  preferences?: UserPreferences;
  isAdmin?: boolean;
  isPremium?: boolean;
}

export interface AdRequest {
  id: string;
  userId: string;
  userEmail: string;
  description: string;
  budget: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
  mediaName?: string; // Simulation of file
  targetUrl?: string;
}
