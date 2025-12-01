
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';

interface PremiumScreenProps {
  onBack: () => void;
  onActivate: () => void;
}

const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack, onActivate }) => {
  const [coupon, setCoupon] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = () => {
    setIsProcessing(true);
    setError('');
    // Simulate payment error logic
    setTimeout(() => {
        setIsProcessing(false);
        setError("שירות הסליקה אינו זמין כרגע. אנא השתמש בקוד גישה מוקדמת.");
    }, 2000);
  };

  const handleCouponApply = () => {
    if (coupon === '0101') {
        alert("קוד גישה התקבל! המנוי הופעל בחינם.");
        onActivate();
    } else {
        alert("קוד גישה שגוי.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient p-4 relative">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-5xl border border-white/40 fade-in-up relative overflow-hidden flex flex-col md:flex-row gap-8">
        
        <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors z-20"
        >
            <i className="fas fa-times text-2xl"></i>
        </button>

        {/* Left Side: Features */}
        <div className="w-full md:w-1/2 space-y-6 pt-10">
            <div>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-purple-200">
                    בקרוב
                </span>
                <h1 className="text-4xl font-black text-gray-800 mt-4 mb-2">Aivan Premium</h1>
                <p className="text-gray-500 text-lg">הצטרפו למהפכת הקוד עם יכולות AI מתקדמות.</p>
            </div>

            <ul className="space-y-4">
                {[
                    { icon: 'fa-ban', color: 'text-red-500', bg: 'bg-red-50', title: 'ללא פרסומות', desc: 'חווית שימוש נקייה, ללא שטחי פרסום באתרים או במערכת.' },
                    { icon: 'fa-code', color: 'text-green-500', bg: 'bg-green-50', title: 'כל השפות', desc: 'גישה ל-Python, React, Node.js ועוד.' },
                    { icon: 'fa-bolt', color: 'text-yellow-500', bg: 'bg-yellow-50', title: 'ללא הגבלה', desc: 'שימוש חופשי במודל החכם ללא מגבלה יומית.' },
                    { icon: 'fa-edit', color: 'text-purple-500', bg: 'bg-purple-50', title: 'עורך קוד', desc: 'גישה מלאה לעריכת קוד ידנית בזמן אמת.' }
                ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${item.bg} ${item.color}`}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{item.title}</h3>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>

        {/* Right Side: Pricing Card */}
        <div className="w-full md:w-1/2 bg-gray-900 rounded-3xl p-8 text-white relative shadow-2xl flex flex-col justify-between overflow-hidden">
             {/* Background Effects */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[80px] opacity-20"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600 rounded-full blur-[80px] opacity-20"></div>

             <div className="relative z-10 text-center w-full">
                 <h2 className="text-gray-300 font-medium mb-4">הרשמה מוקדמת</h2>
                 <div className="flex items-center justify-center gap-1 mb-2">
                     <span className="text-6xl font-black">30</span>
                     <span className="text-4xl font-bold">₪</span>
                 </div>
                 <p className="text-gray-400 text-sm mb-8">לחודש בלבד. יפתח לקהל הרחב בקרוב.</p>

                 {error && (
                     <div className="mb-4 bg-red-500/80 border border-red-500 text-white p-3 rounded-xl text-sm animate-pulse">
                         <i className="fas fa-exclamation-circle ml-2"></i>
                         {error}
                     </div>
                 )}

                 <button 
                    onClick={handlePurchase}
                    disabled={isProcessing}
                    className="w-full py-4 bg-gray-700 text-gray-300 font-bold text-xl rounded-xl shadow-lg cursor-not-allowed opacity-80"
                 >
                    {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                            <i className="fas fa-circle-notch animate-spin"></i> בודק זמינות...
                        </div>
                    ) : (
                        <>
                            הצטרף לרשימת המתנה
                        </>
                    )}
                 </button>
                 
                 <p className="text-xs text-gray-500 mt-4">השירות עדיין לא זמין לרכישה באשראי</p>
             </div>

             <div className="relative z-10 mt-8 pt-8 border-t border-gray-700">
                 <label className="text-xs text-yellow-400 block mb-2 font-bold">יש לך קוד גישה מוקדמת?</label>
                 <div className="flex gap-2">
                     <input 
                        type="text" 
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        placeholder="הכנס קוד גישה" 
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                     />
                     <button 
                        onClick={handleCouponApply}
                        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                     >
                         הפעל
                     </button>
                 </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default PremiumScreen;
