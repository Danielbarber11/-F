
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';
import { AdRequest } from '../types';

interface AdvertiseScreenProps {
  onBack: () => void;
  onSubmit: (request: Omit<AdRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userEmail'>) => void;
}

const AdvertiseScreen: React.FC<AdvertiseScreenProps> = ({ onBack, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(1000);
  const [targetUrl, setTargetUrl] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  const handleSend = () => {
    if (!description.trim()) {
        alert('אנא מלא תיאור');
        return;
    }
    
    onSubmit({
        description,
        budget,
        mediaName: files && files.length > 0 ? files[0].name : undefined,
        targetUrl
    });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 0;
      if (val > 100000) val = 100000;
      setBudget(val);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient p-4 relative">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-3xl border border-white/40 fade-in-up relative">
        
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
            <i className="fas fa-times text-2xl"></i>
        </button>

        <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-gray-800 tracking-tight mb-2">פרסום באתר</h1>
            <p className="text-gray-500">הגיעו לאלפי מפתחים ויוצרים המשתמשים ב-Aivan מדי יום.</p>
        </div>

        <div className="space-y-6 max-w-xl mx-auto">
            
            {/* Description */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">מה ברצונך לפרסם?</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="תאר את המוצר או השירות, קהל היעד והמטרות..."
                    className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 resize-none text-gray-900 placeholder-gray-400"
                />
            </div>
            
            {/* Website URL */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">קישור לאתר (אופציונלי)</label>
                <input 
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900 placeholder-gray-400"
                />
            </div>

            {/* Budget Slider + Input */}
            <div>
                <div className="flex justify-between items-end mb-4">
                     <label className="text-sm font-bold text-gray-700">תקציב חודשי משוער</label>
                     <div className="flex items-center gap-2">
                         <input 
                            type="number" 
                            value={budget} 
                            onChange={handleBudgetChange}
                            className="w-24 px-2 py-1 text-lg font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded text-center outline-none focus:ring-1 focus:ring-purple-500"
                         />
                         <span className="text-purple-600 font-bold">₪</span>
                     </div>
                </div>
                
                <input 
                    type="range" 
                    min="0" 
                    max="100000" 
                    step="500"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>₪0</span>
                    <span>₪100,000+</span>
                </div>
                
                <p className="mt-3 text-center text-blue-600 font-bold text-sm bg-blue-50 py-2 rounded-lg border border-blue-100">
                    <i className="fas fa-info-circle ml-1"></i>
                    ככל שהתקציב גבוה יותר, החשיפה גדולה יותר!
                </p>
            </div>

            {/* File Upload */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">העלאת מדיה (תמונה/וידאו)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                    <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,video/*"
                        onChange={(e) => setFiles(e.target.files)}
                    />
                    <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                    <p className="text-gray-500 text-sm">
                        {files && files.length > 0 
                            ? `נבחר קובץ: ${files[0].name}` 
                            : 'גרור קובץ לכאן או לחץ לבחירה'}
                    </p>
                </div>
            </div>

            {/* Submit */}
            <button 
                onClick={handleSend}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
                שלח למערכת לאישור
                <i className="fas fa-paper-plane mr-2"></i>
            </button>
            <p className="text-center text-xs text-gray-400">הבקשה תועבר למנהל המערכת לאישור לפני פרסום.</p>

        </div>
      </div>
    </div>
  );
};

export default AdvertiseScreen;
