
import React, { useState, useRef, useEffect } from 'react';
import { ProjectConfig, User, SettingsTab, ChatMode, ProjectSession } from '../types';
import AccessibilityManager from './AccessibilityManager';
import SettingsModal from './SettingsModal';

interface DashboardProps {
  onStartProject: (config: ProjectConfig) => void;
  sessions: ProjectSession[];
  onResumeSession: (id: string) => void;
  onLogout: () => void;
  user: User | null;
  onUpdateUser: (user: User) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (index: number) => void;
  onRenameHistoryItem: (index: number, newName: string) => void;
  onShowPremium: () => void;
  onShowAdvertise: () => void;
  onShowAdManagement: () => void;
  pendingAdsCount?: number;
  hasUserAds?: boolean;
}

// Helper Component for Custom Expanding Dropdown
const AnimatedSelect = ({ 
  options, 
  value, 
  onChange, 
  icon 
}: { 
  options: {value: string, label: string}[], 
  value: string, 
  onChange: (val: any) => void,
  icon: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label;
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 5000);
  };

  return (
    <div 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all duration-300 ease-out bg-white/10 backdrop-blur-md border border-white/20 rounded-xl cursor-pointer hover:bg-white/20 z-20 h-[42px] hover:scale-105`}
      style={{ minWidth: '180px' }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between px-3 py-2 h-full text-white">
        <div className="flex items-center gap-2">
          <i className={`fas ${icon}`}></i>
          <span className="text-sm font-medium truncate">{selectedLabel}</span>
        </div>
        <i className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-2xl overflow-hidden z-[100] border border-gray-200 fade-in-up origin-top">
          {options.map(opt => (
            <div 
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-3 text-sm hover:bg-purple-50 transition-colors border-b last:border-0 border-gray-100 flex items-center justify-between text-gray-800 ${value === opt.value ? 'font-bold text-purple-700 bg-purple-50' : ''}`}
            >
              {opt.label}
              {value === opt.value && <i className="fas fa-check"></i>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  onStartProject, 
  sessions, 
  onResumeSession,
  onLogout, 
  user, 
  onUpdateUser,
  onClearHistory,
  onDeleteHistoryItem,
  onRenameHistoryItem,
  onShowPremium,
  onShowAdvertise,
  onShowAdManagement,
  pendingAdsCount = 0,
  hasUserAds = false
}) => {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('HTML/CSS/JS');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.CREATOR);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState(SettingsTab.ACCOUNT);

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
      const handleClickOutsideProfile = (event: MouseEvent) => {
        if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
          setShowProfileMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutsideProfile);
      return () => document.removeEventListener('mousedown', handleClickOutsideProfile);
  }, []);

  const handleSend = () => {
    if (!prompt.trim()) return;
    onStartProject({ prompt, language, model, chatMode, files: selectedFiles });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };

  const openSettings = (tab: SettingsTab) => {
    setInitialSettingsTab(tab);
    setShowSettingsModal(true);
    setShowProfileMenu(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center animate-gradient p-4 relative">
      
      {/* Top Left - Swapped Buttons */}
      <div className="fixed top-6 left-6 z-50 flex items-center gap-3">
        
        {/* Premium Button */}
        {!user?.isPremium && (
            <button 
                onClick={onShowPremium}
                className="h-12 px-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 border border-white/20 flex items-center gap-2 text-white shadow-lg transition-transform hover:scale-105"
            >
                <i className="fas fa-crown text-yellow-100 animate-pulse"></i>
                <span className="font-bold text-sm">פרימיום</span>
            </button>
        )}

        {/* Profile Button */}
        <div className="relative" ref={profileDropdownRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur border border-white/40 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 relative"
          >
             {user?.picture ? (
               <img src={user.picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
             ) : (
               <i className="fas fa-user text-xl"></i>
             )}
             {user?.isAdmin && pendingAdsCount > 0 && (
                 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce border border-white">{pendingAdsCount}</span>
             )}
          </button>

          {showProfileMenu && (
            <div className="absolute top-14 left-0 w-64 bg-white rounded-2xl shadow-2xl p-4 fade-in-up origin-top-left z-[60]">
              <div className="flex flex-col items-center border-b border-gray-100 pb-4 mb-2">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl font-bold mb-2 overflow-hidden relative">
                  {user?.picture ? (
                    <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                  {user?.isAdmin && <div className="absolute bottom-0 w-full bg-black/50 text-white text-[10px] text-center">ADMIN</div>}
                </div>
                <span className="font-bold text-gray-800">{user?.name || 'משתמש'}</span>
                <span className="text-xs text-gray-500 truncate w-full text-center">{user?.email}</span>
              </div>
              
              <div className="space-y-1">
                 {/* Admin or User Ad Management */}
                 {user?.isAdmin ? (
                     <button onClick={onShowAdManagement} className="w-full text-right px-3 py-2 rounded-lg hover:bg-yellow-50 text-yellow-700 text-sm font-medium flex items-center justify-between transition-colors">
                        <span>בקשות פרסום ({pendingAdsCount})</span>
                        <i className="fas fa-tasks"></i>
                     </button>
                 ) : hasUserAds ? (
                     <button onClick={onShowAdManagement} className="w-full text-right px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 text-sm font-medium flex items-center justify-between transition-colors">
                        <span>ניהול מודעות</span>
                        <i className="fas fa-ad"></i>
                     </button>
                 ) : (
                     <button onClick={onShowAdvertise} className="w-full text-right px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 text-sm font-medium flex items-center justify-between transition-colors">
                        <span>פרסם באתר</span>
                        <i className="fas fa-bullhorn"></i>
                     </button>
                 )}

                 <button onClick={() => openSettings(SettingsTab.ACCOUNT)} className="w-full text-right px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium flex items-center justify-between">
                   <span>הגדרות</span>
                   <i className="fas fa-cog text-gray-400"></i>
                 </button>
                 <button onClick={onLogout} className="w-full text-right px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 text-sm font-medium flex items-center justify-between">
                   <span>התנתק</span>
                   <i className="fas fa-sign-out-alt"></i>
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="fixed top-6 right-6 flex items-center gap-3 z-50">
        <AccessibilityManager positionClass="relative" buttonClass="bg-white/20 hover:bg-white/30" />
        
        <button 
          onClick={onLogout}
          className="group relative flex items-center h-10 w-10 hover:w-32 bg-red-500 rounded-full text-white shadow-lg transition-all duration-300 ease-out overflow-hidden"
          title="התנתק"
        >
          <div className="absolute right-0 top-0 w-10 h-10 flex items-center justify-center z-10">
             <i className="fas fa-sign-out-alt text-lg"></i>
          </div>
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-bold pr-10 pl-3 w-full text-center">
            התנתק
          </span>
        </button>
      </div>

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-center py-8 fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="text-center">
          <h1 className="text-7xl font-black text-white drop-shadow-lg tracking-wide">AIVAN</h1>
          <p className="text-white/90 mt-2 text-xl font-light">המומחה שלך לבניית קוד</p>
        </div>
      </header>

      {/* Main Input */}
      <div className="w-full max-w-4xl mt-10 fade-in-up z-40" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl p-2 border border-white/30 relative">
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="מה תרצה לבנות היום? (לדוגמה: דף נחיתה למספרה עם גלריה)"
            className="w-full h-32 bg-transparent text-white placeholder-white/70 p-4 text-lg resize-none focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between px-4 pb-2 mt-2 gap-3 relative">
            <div className="flex gap-3 items-start relative flex-wrap">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-white/80 hover:text-white hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-colors relative mt-1"
                title="הוסף קובץ או תמונה"
              >
                <i className="fas fa-paperclip text-xl"></i>
                {selectedFiles && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-bounce">
                    {selectedFiles.length}
                  </span>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple
                accept="image/*, .txt, .js, .html, .css, .json"
              />

              <AnimatedSelect 
                icon="fa-code"
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "HTML/CSS/JS", label: "HTML/Web" },
                  { value: "Python", label: "Python" },
                  { value: "React", label: "React" },
                  { value: "NodeJS", label: "Node.js" }
                ]}
              />

               <AnimatedSelect 
                icon="fa-robot"
                value={chatMode}
                onChange={setChatMode}
                options={[
                  { value: ChatMode.CREATOR, label: "סוכן (יוצר)" },
                  { value: ChatMode.QUESTION, label: "שאלה" }
                ]}
              />

              <AnimatedSelect 
                icon="fa-brain"
                value={model}
                onChange={setModel}
                options={[
                  { value: "gemini-2.5-flash", label: "⚡ Aivan Flash (מהיר)" },
                  { value: "gemini-3-pro-preview", label: "🧠 Aivan Pro (חכם)" }
                ]}
              />
            </div>

            <button 
              onClick={handleSend}
              disabled={!prompt.trim()}
              className="bg-white text-purple-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 disabled:opacity-50 disabled:scale-100 transition-all duration-300 z-10"
            >
              <i className="fas fa-paper-plane text-2xl transform translate-x-[-2px] translate-y-[2px]"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl mt-12 fade-in-up z-0" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-white font-bold text-lg mb-4 px-2 opacity-90">היסטוריה אחרונה</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.length === 0 ? (
            <div className="text-white/50 text-center col-span-2 py-8">אין היסטוריה עדיין. התחל ליצור!</div>
          ) : (
            sessions.slice(0, 4).map((session, idx) => (
              <div 
                key={session.id || idx} 
                onClick={() => onResumeSession(session.id)}
                className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white hover:bg-white/20 hover:scale-[1.02] transition-all cursor-pointer shadow-sm active:scale-95 group"
              >
                <div className="flex items-center justify-between">
                  <p className="truncate w-full font-medium">{session.name}</p>
                  <i className="fas fa-arrow-left opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
                <div className="text-xs text-white/60 mt-2 flex justify-between">
                    <span>לחץ לשחזור שיחה</span>
                    <span>{new Date(session.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showSettingsModal && (
        <SettingsModal 
          user={user} 
          initialTab={initialSettingsTab}
          onClose={() => setShowSettingsModal(false)}
          onLogout={onLogout}
          onUpdateUser={onUpdateUser}
          history={sessions.map(s => s.name)}
          onClearHistory={onClearHistory}
          onDeleteHistoryItem={onDeleteHistoryItem}
          onRenameHistoryItem={onRenameHistoryItem}
        />
      )}
    </div>
  );
};

export default Dashboard;
