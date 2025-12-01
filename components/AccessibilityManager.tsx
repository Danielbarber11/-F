
import React, { useState, useEffect } from 'react';

interface AccessibilityManagerProps {
  positionClass?: string;
  buttonClass?: string;
}

const AccessibilityManager: React.FC<AccessibilityManagerProps> = ({ 
  positionClass = "fixed top-6 left-6", 
  buttonClass = "bg-white/20 hover:bg-white/30"
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [activeA11y, setActiveA11y] = useState<Set<string>>(new Set());
  const [textSizePercent, setTextSizePercent] = useState(100);

  // Conflicting modes that should not be active together
  const EXCLUSIVE_MODES = ['grayscale', 'high-contrast', 'negative-contrast', 'light-bg'];

  // Restore state on mount
  useEffect(() => {
    const currentClasses = new Set<string>();
    document.body.classList.forEach(cls => {
      if (cls.startsWith('a11y-')) currentClasses.add(cls.replace('a11y-', ''));
    });
    setActiveA11y(currentClasses);
  }, []);

  // Handle Text Size changes
  useEffect(() => {
    document.documentElement.style.fontSize = `${textSizePercent}%`;
  }, [textSizePercent]);

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

  const handleManualSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
          // Allow typing freely, clamp only on blur or submit logic if needed, 
          // but for instant feedback let's clamp logic in useEffect or here.
          // Better to limit visual updates
          if (val > 500) setTextSizePercent(500);
          else setTextSizePercent(val);
      }
  };

  const changeTextSize = (amount: number) => {
    setTextSizePercent(prev => {
      const newValue = prev + amount;
      if (newValue < 25) return 25;
      if (newValue > 500) return 500;
      return newValue;
    });
  };

  const resetA11y = () => {
    activeA11y.forEach(opt => {
      document.body.classList.remove(`a11y-${opt}`);
    });
    setActiveA11y(new Set());
    setTextSizePercent(100);
  };

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
    <>
      <div className={`${positionClass} z-[9999]`}>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/30 transition-all flex items-center justify-center shadow-lg text-white ${buttonClass} ${showMenu ? 'ring-2 ring-purple-400' : ''}`}
            title="נגישות"
            aria-label="תפריט נגישות"
            aria-expanded={showMenu}
          >
            <i className="fas fa-universal-access text-lg"></i>
          </button>

          {showMenu && (
            <div className="absolute top-12 ltr:left-0 rtl:right-0 w-80 bg-white rounded-xl shadow-2xl p-5 border border-gray-200 fade-in-up text-gray-800 transform ltr:origin-top-left rtl:origin-top-right">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg">כלי נגישות</h3>
                <button onClick={resetA11y} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">
                  <i className="fas fa-redo ml-1"></i> איפוס
                </button>
              </div>

              {/* Text Sizing Controls - UPDATED UI */}
              <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center">
                <span className="text-sm font-semibold mb-3">גודל טקסט</span>
                <div className="flex items-center gap-3 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                  <button 
                    onClick={() => changeTextSize(-5)} 
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
                    disabled={textSizePercent <= 25}
                  >
                    <i className="fas fa-minus text-xs"></i>
                  </button>
                  
                  <div className="relative flex items-center">
                      <input 
                        type="number" 
                        value={textSizePercent}
                        onChange={handleManualSizeChange}
                        className="w-12 text-center font-bold text-gray-800 outline-none bg-transparent appearance-none"
                      />
                      <span className="text-xs font-bold text-gray-400 absolute right-full">%</span>
                  </div>

                  <button 
                    onClick={() => changeTextSize(5)} 
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600"
                    disabled={textSizePercent >= 500}
                  >
                    <i className="fas fa-plus text-xs"></i>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {a11yOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleA11yOption(opt.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg text-sm transition-all border ${
                      activeA11y.has(opt.id) 
                        ? 'bg-purple-600 text-white border-purple-600' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100'
                    }`}
                  >
                    <i className={`fas ${opt.icon} mb-2 text-lg`}></i>
                    <span className="text-xs text-center">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-2 border-t text-center">
                <button 
                  onClick={() => setShowStatement(true)}
                  className="text-purple-600 text-xs underline font-medium"
                >
                  הצהרת נגישות
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showStatement && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowStatement(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowStatement(false)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
              <i className="fas fa-times text-xl"></i>
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">הצהרת נגישות</h2>
            <div className="h-64 overflow-y-auto text-gray-600 text-sm leading-relaxed space-y-3">
              <p>אנו ב-"אייבן" (Aivan) רואים חשיבות עליונה בהנגשת שירותינו לכלל האוכלוסייה.</p>
              <p>אתר זה נבנה בהתאם להוראות נגישות תכנים באינטרנט.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>האתר מותאם לניווט באמצעות מקלדת.</li>
                <li>קיימת אפשרות לשינוי גודל טקסט בין 25% ל-500%.</li>
                <li>קיימת תמיכה בניגודיות גבוהה והפסקת אנימציות.</li>
              </ul>
              <p>אם נתקלתם בבעיה, אנא פנו אלינו:</p>
              <a href="mailto:vaxtoponline@gmail.com" className="text-purple-600 font-bold block mt-2">vaxtoponline@gmail.com</a>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => setShowStatement(false)} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">סגור</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccessibilityManager;
