
import React, { useState, useRef, useEffect } from 'react';
import { User, SettingsTab, Role } from '../types';
import { ai } from '../services/geminiService';

interface SettingsModalProps {
  user: User | null;
  initialTab?: SettingsTab;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  history?: string[];
  onClearHistory?: () => void;
  onDeleteHistoryItem?: (index: number) => void;
  onRenameHistoryItem?: (index: number, newName: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, 
  initialTab = SettingsTab.ACCOUNT, 
  onClose, 
  onLogout, 
  onUpdateUser,
  history = [],
  onClearHistory,
  onDeleteHistoryItem,
  onRenameHistoryItem
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [name, setName] = useState(user?.name || '');
  
  // History preferences
  const [saveHistory, setSaveHistory] = useState(user?.preferences?.saveHistory ?? true);
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(null);
  const [tempHistoryName, setTempHistoryName] = useState('');
  
  // Theme
  const [selectedTheme, setSelectedTheme] = useState(user?.preferences?.theme || 'light');

  // Accessibility State (mirrored for the modal view)
  const [activeA11y, setActiveA11y] = useState<Set<string>>(new Set());

  // Conflicting modes
  const EXCLUSIVE_MODES = ['grayscale', 'high-contrast', 'negative-contrast', 'light-bg'];

  // Help Chat State
  const [helpInput, setHelpInput] = useState('');
  const [helpMessages, setHelpMessages] = useState<{role: string, text: string}[]>([
    { role: 'model', text: 'שלום! אני אייבן, העוזר האישי שלך. כיצד אוכל לעזור לך להשתמש באתר?' }
  ]);
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  const helpEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === SettingsTab.HELP) {
      helpEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [helpMessages, activeTab]);
  
  // Sync active a11y classes on mount
  useEffect(() => {
    const currentClasses = new Set<string>();
    document.body.classList.forEach(cls => {
      if (cls.startsWith('a11y-')) currentClasses.add(cls.replace('a11y-', ''));
    });
    setActiveA11y(currentClasses);
  }, []);

  const handleSaveProfile = () => {
    if (user) {
      onUpdateUser({ 
        ...user, 
        name,
        preferences: { ...user.preferences, saveHistory, theme: selectedTheme as any }
      });
      alert('ההגדרות נשמרו בהצלחה!');
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    if (user) {
        onUpdateUser({
            ...user,
            preferences: { ...user.preferences, theme: theme as any }
        });
    }
  };
  
  // Auto-save history preference toggles specifically
  const handleToggleHistorySave = () => {
    const newVal = !saveHistory;
    setSaveHistory(newVal);
    if (user) {
        onUpdateUser({
            ...user,
            preferences: { ...user.preferences, saveHistory: newVal }
        });
    }
  };

  const startRenameHistory = (index: number, currentName: string) => {
    setEditingHistoryIndex(index);
    setTempHistoryName(currentName);
  };

  const saveRenameHistory = (index: number) => {
    if (tempHistoryName.trim()) {
        onRenameHistoryItem?.(index, tempHistoryName);
    }
    setEditingHistoryIndex(null);
  };

  const toggleA11yOption = (option: string) => {
    const newSet = new Set(activeA11y);
    const className = `a11y-${option}`;
    const element = document.body;

    if (newSet.has(option)) {
      newSet.delete(option);
      element.classList.remove(className);
    } else {
      // If the new option is one of the exclusive visual modes, remove others first
      if (EXCLUSIVE_MODES.includes(option)) {
        EXCLUSIVE_MODES.forEach(mode => {
          if (newSet.has(mode)) {
            newSet.delete(mode);
            element.classList.remove(`a11y-${mode}`);
          }
        });
      }
      
      newSet.add(option);
      element.classList.add(className);
    }
    setActiveA11y(newSet);
  };

  const sendHelpMessage = async () => {
    if (!helpInput.trim()) return;
    
    const userMsg = { role: 'user', text: helpInput };
    setHelpMessages(prev => [...prev, userMsg]);
    setHelpInput('');
    setIsHelpLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: `You are a help support agent for the app "Aivan". Answer briefly in Hebrew. User asked: ${helpInput}` }] }
        ]
      });
      
      const botMsg = { role: 'model', text: response.text || 'מצטער, לא הצלחתי לענות כרגע.' };
      setHelpMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setHelpMessages(prev => [...prev, { role: 'model', text: 'שגיאת תקשורת.' }]);
    } finally {
      setIsHelpLoading(false);
    }
  };

  // REMOVED CONTACT TAB FROM THIS LIST
  const tabs = [
    { id: SettingsTab.ACCOUNT, label: 'חשבון', icon: 'fa-user' },
    { id: SettingsTab.INTERFACE, label: 'עיצוב וממשק', icon: 'fa-palette' },
    { id: SettingsTab.HISTORY, label: 'הגדרות היסטוריה', icon: 'fa-history' },
    { id: SettingsTab.ACCESSIBILITY, label: 'נגישות', icon: 'fa-universal-access' },
    { id: SettingsTab.HELP, label: 'עזרה ותמיכה', icon: 'fa-headset' },
    { id: SettingsTab.ABOUT, label: 'אודות', icon: 'fa-info-circle' },
    { id: SettingsTab.TERMS, label: 'תנאי שימוש', icon: 'fa-file-contract' },
  ];

  const a11yOptions = [
    { id: 'grayscale', label: 'גווני אפור', icon: 'fa-adjust' },
    { id: 'high-contrast', label: 'ניגודיות גבוהה', icon: 'fa-sun' },
    { id: 'negative-contrast', label: 'ניגודיות הפוכה', icon: 'fa-moon' },
    { id: 'light-bg', label: 'רקע בהיר', icon: 'fa-paint-roller' },
    { id: 'highlight-links', label: 'הדגשת קישורים', icon: 'fa-link' },
    { id: 'readable-font', label: 'פונט קריא', icon: 'fa-font' },
    { id: 'big-cursor', label: 'סמן גדול', icon: 'fa-mouse-pointer' },
    { id: 'stop-animations', label: 'עצור אנימציות', icon: 'fa-pause-circle' },
  ];

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex overflow-hidden slide-in-right">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-l border-gray-200 flex flex-col p-4 shadow-xl z-10">
        <div className="flex flex-col items-center mb-6 mt-4">
          <div className="w-20 h-20 rounded-full bg-purple-600 text-white flex items-center justify-center text-3xl font-bold mb-3 shadow-md overflow-hidden">
              {user?.picture ? <img src={user.picture} alt="Profile" className="w-full h-full object-cover" /> : (user?.name?.[0] || 'A')}
          </div>
          <h3 className="font-bold text-gray-800 text-center truncate w-full text-lg">{user?.name || 'אורח'}</h3>
          <p className="text-xs text-gray-500 truncate w-full text-center">{user?.email}</p>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                activeTab === tab.id 
                  ? 'bg-purple-100 text-purple-700 shadow-sm transform scale-105' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className={`fas ${tab.icon} w-8`}></i>
              {tab.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={onLogout}
          className="mt-6 flex items-center px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors font-medium"
        >
          <i className="fas fa-sign-out-alt w-8"></i>
          התנתק
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-gray-50/30 p-10 overflow-y-auto relative">
          <button 
            onClick={onClose} 
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-600 shadow-md hover:shadow-lg transition-all"
            title="סגור הגדרות"
          >
          <i className="fas fa-times text-xl"></i>
        </button>

        <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">
          {activeTab === SettingsTab.ACCOUNT && (
            <div className="fade-in-up">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">פרטי חשבון</h2>
              <div className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">שם מלא</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">אימייל</label>
                  <input 
                    type="text" 
                    value={user?.email || ''}
                    disabled
                    className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <button 
                  onClick={handleSaveProfile}
                  className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-transform hover:-translate-y-1 shadow-md mt-4"
                >
                  שמור שינויים
                </button>
              </div>
            </div>
          )}

          {activeTab === SettingsTab.INTERFACE && (
            <div className="fade-in-up">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">עיצוב וממשק</h2>
              
              <div className="space-y-6">
                
                <div className="mt-8">
                  <h3 className="font-bold text-gray-800 mb-4">ערכת נושא</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    {[
                        { id: 'light', name: 'בהיר', color: 'bg-white border-gray-200', textColor: 'text-gray-800' },
                        { id: 'dark', name: 'כהה', color: 'bg-gray-800 border-gray-700', textColor: 'text-gray-200' },
                        { id: 'midnight', name: 'לילה (Midnight)', color: 'bg-indigo-950 border-indigo-900', textColor: 'text-white' },
                        { id: 'sunset', name: 'שקיעה (Sunset)', color: 'bg-orange-50 border-orange-200', textColor: 'text-gray-800' },
                        { id: 'ocean', name: 'אוקיינוס (Ocean)', color: 'bg-cyan-50 border-cyan-200', textColor: 'text-gray-800' },
                        { id: 'forest', name: 'יער (Forest)', color: 'bg-green-50 border-green-200', textColor: 'text-gray-800' },
                        { id: 'cherry', name: 'דובדבן (Cherry)', color: 'bg-rose-50 border-rose-200', textColor: 'text-gray-800' },
                    ].map(theme => (
                        <div 
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={`p-4 border-2 rounded-2xl cursor-pointer relative shadow-sm hover:scale-105 transition-transform ${selectedTheme === theme.id ? 'border-purple-500' : 'border-transparent'} ${theme.color}`}
                        >
                        {selectedTheme === theme.id && <div className={`absolute top-2 left-2 ${theme.id.includes('dark') || theme.id === 'midnight' ? 'text-white' : 'text-purple-600'}`}><i className="fas fa-check-circle"></i></div>}
                        <div className={`h-12 rounded-lg mb-2 shadow-inner opacity-50 ${theme.id.includes('dark') || theme.id === 'midnight' ? 'bg-white/20' : 'bg-black/10'}`}></div>
                        <p className={`text-center font-bold text-xs ${theme.textColor}`}>{theme.name}</p>
                        </div>
                    ))}

                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === SettingsTab.HISTORY && (
             <div className="fade-in-up">
               <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">הגדרות היסטוריה</h2>
               
               <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100 mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800">שמירת היסטוריה</h3>
                    <p className="text-sm text-gray-500">שמור את הפרויקטים האחרונים שלך בהיסטוריה.</p>
                  </div>
                  <button 
                    onClick={handleToggleHistorySave}
                    className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${saveHistory ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${saveHistory ? '-translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>

               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-700">פריטים אחרונים</h3>
                 {history.length > 0 && (
                   <button 
                    onClick={() => {
                      if (confirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?')) {
                        onClearHistory?.();
                      }
                    }}
                    className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                   >
                     <i className="fas fa-trash-alt ml-1"></i>
                     נקה הכל
                   </button>
                 )}
               </div>

               <div className="space-y-2 max-h-80 overflow-y-auto bg-gray-50 p-2 rounded-xl border border-gray-100">
                  {history.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <i className="fas fa-history text-3xl mb-2"></i>
                      <p>ההיסטוריה ריקה</p>
                    </div>
                  ) : (
                    history.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-all group">
                         {editingHistoryIndex === index ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input 
                                    type="text" 
                                    value={tempHistoryName} 
                                    onChange={(e) => setTempHistoryName(e.target.value)}
                                    className="flex-1 px-2 py-1 border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                                    autoFocus
                                />
                                <button onClick={() => saveRenameHistory(index)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                    <i className="fas fa-check"></i>
                                </button>
                                <button onClick={() => setEditingHistoryIndex(null)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                         ) : (
                            <>
                                <span className="truncate text-gray-700 font-medium max-w-[70%]" title={item}>{item}</span>
                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                    onClick={() => startRenameHistory(index, item)}
                                    className="text-gray-400 hover:text-purple-600 p-2 rounded-full hover:bg-purple-50 transition-colors"
                                    title="שנה שם"
                                    >
                                    <i className="fas fa-pen"></i>
                                    </button>
                                    <button 
                                    onClick={() => onDeleteHistoryItem?.(index)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    title="מחק פריט"
                                    >
                                    <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </>
                         )}
                      </div>
                    ))
                  )}
               </div>
             </div>
          )}

          {activeTab === SettingsTab.ACCESSIBILITY && (
            <div className="fade-in-up">
               <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">הגדרות נגישות</h2>
               <p className="mb-4 text-gray-600">לחץ להפעלה או כיבוי של הגדרות. (פעיל = מואר בסגול)</p>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {a11yOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleA11yOption(opt.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl text-sm transition-all border h-32 ${
                      activeA11y.has(opt.id) 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-105' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <i className={`fas ${opt.icon} mb-3 text-2xl`}></i>
                    <span className="text-center font-bold">{opt.label}</span>
                    {activeA11y.has(opt.id) && <span className="mt-1 text-xs bg-white/20 px-2 rounded-full">פעיל</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === SettingsTab.HELP && (
             <div className="fade-in-up h-[500px] flex flex-col">
               <div className="flex justify-between items-center mb-4 border-b pb-4">
                   <h2 className="text-3xl font-bold text-gray-800">עזרה ותמיכה (AI)</h2>
                   <a 
                    href="mailto:vaxtoponline@gmail.com"
                    className="text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                   >
                       לא מצאת תשובה? צור קשר
                   </a>
               </div>

               <div className="flex-1 bg-gray-50 rounded-2xl p-6 overflow-y-auto mb-4 border border-gray-200 shadow-inner space-y-4">
                 {helpMessages.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                     <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-purple-100 text-purple-900 rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                       {msg.text}
                     </div>
                   </div>
                 ))}
                 {isHelpLoading && (
                   <div className="flex justify-end">
                      <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-400 italic">אייבן מקליד...</div>
                   </div>
                 )}
                 <div ref={helpEndRef} />
               </div>
               <div className="flex gap-3">
                 <input 
                  type="text" 
                  value={helpInput}
                  onChange={e => setHelpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendHelpMessage()}
                  placeholder="איך אפשר לעזור לך?"
                  className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                 />
                 <button onClick={sendHelpMessage} className="bg-purple-600 text-white w-14 rounded-xl shadow-md hover:bg-purple-700 transition-colors flex items-center justify-center">
                   <i className="fas fa-paper-plane text-lg"></i>
                 </button>
               </div>
             </div>
          )}

          {activeTab === SettingsTab.TERMS && (
            <div className="fade-in-up">
              <div className="flex items-center justify-between border-b pb-4 mb-8">
                 <h2 className="text-3xl font-bold text-gray-800">תנאי שימוש וגילוי נאות</h2>
                 <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
                    <i className="fas fa-check-circle ml-1"></i>
                    התנאים אושרו
                 </span>
              </div>
              <div className="h-96 overflow-y-auto bg-gray-50 p-6 rounded-xl border border-gray-200 text-sm leading-relaxed text-gray-700">
                <p className="font-bold mb-2">1. כללי</p>
                <p className="mb-4">השימוש באתר "אייבן" (Aivan) מהווה הסכמה מלאה לתנאים אלו.</p>
                <p className="font-bold mb-2">2. הסרת אחריות</p>
                <p className="mb-4">המשתמש מצהיר ומסכים בזאת כי השימוש באתר ובקוד שנוצר על ידו הוא באחריותו הבלעדית בלבד.</p>
                <p className="font-bold mb-2">3. ויתור על תביעות</p>
                <p className="mb-4">המשתמש מוותר בזאת על כל זכות תביעה כלפי מפעיל האתר.</p>
                <p className="font-bold mb-2">4. גילוי נאות - שותפים (Affiliates)</p>
                <p className="mb-4">אתר זה משתתף בתוכניות שותפים (כגון Amazon Associates) ועשוי להרוויח עמלות מרכישות דרך קישורים המופיעים באתר.</p>
                <p className="font-bold mb-2">5. פרטיות</p>
                <p className="mb-4">צדדים שלישיים עשויים לאסוף מידע ולהשתמש ב-Cookies לצורך התאמת פרסומות.</p>
              </div>
            </div>
          )}
          
          {activeTab === SettingsTab.ABOUT && (
            <div className="fade-in-up text-center pt-10 flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl flex items-center justify-center text-white text-6xl font-bold shadow-lg mb-6 transform rotate-3">A</div>
              <h1 className="text-5xl font-black text-gray-800 mb-4 tracking-tight">AIVAN</h1>
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                פלטפורמת ה-AI המובילה לבניית קוד ואתרים בעברית.
                <br/>
                נבנה באהבה עבור מפתחים.
              </p>
              <div className="mt-12 inline-block px-6 py-2 bg-gray-100 rounded-full text-sm font-mono text-gray-500 border border-gray-200">
                Version 1.0.0 (Beta)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
