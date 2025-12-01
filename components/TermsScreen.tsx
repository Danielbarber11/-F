
import React, { useState } from 'react';
import AccessibilityManager from './AccessibilityManager';

interface TermsScreenProps {
  onAccept: () => void;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ onAccept }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    setIsAccepted(true);
    setTimeout(() => {
       onAccept();
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient p-4 relative">
       {/* Accessibility Button - Top Right for Terms Screen */}
       <AccessibilityManager positionClass="fixed top-6 right-6" />

      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-2xl fade-in-up border border-white/40">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">תנאי שימוש וגילוי נאות</h2>
        
        <div 
          className="bg-gray-50 border rounded-lg p-6 h-64 overflow-y-auto mb-6 text-gray-700 text-sm leading-relaxed"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollHeight - target.scrollTop === target.clientHeight) {
              setScrolled(true);
            }
          }}
        >
          <p className="font-bold mb-2">1. כללי</p>
          <p className="mb-4">השימוש באתר "אייבן" (Aivan) מהווה הסכמה מלאה לתנאים אלו.</p>
          
          <p className="font-bold mb-2">2. הסרת אחריות (Waiver of Liability)</p>
          <p className="mb-4">
            המשתמש מצהיר ומסכים בזאת כי השימוש באתר ובקוד שנוצר על ידו הוא באחריותו הבלעדית בלבד.
            מפעיל האתר אינו נושא בשום אחריות, ישירה או עקיפה, לכל נזק, הפסד, תקלה, באג, שגיאה, או בעיית אבטחה שתיגרם כתוצאה משימוש בקוד שנוצר באתר.
          </p>
          
          <p className="font-bold mb-2">3. קניין רוחני</p>
          <p className="mb-4">הקוד הנוצר שייך למשתמש, אך המערכת אינה מבטיחה מקוריות מלאה.</p>

          <p className="font-bold mb-2">4. אי תביעה</p>
          <p className="mb-4">
            המשתמש מוותר בזאת באופן סופי ומוחלט על כל זכות תביעה, דרישה או טענה מכל סוג שהוא כלפי מפעיל האתר, מפתחיו, או מי מטעמם, בגין כל עניין הקשור לשימוש באתר.
          </p>

          <p className="font-bold mb-2">5. גילוי נאות - תוכנית שותפים (Amazon Associates)</p>
          <p className="mb-4">
            אתר זה משתתף בתוכנית השותפים של אמזון (Amazon Services LLC Associates Program), תוכנית פרסום שותפים שנועדה לספק אמצעי לאתרים להרוויח עמלות פרסום על ידי פרסום וקישור ל-Amazon.com.
            כחלק מתוכנית זו, האתר עשוי להציג קישורים למוצרים באמזון. רכישה דרך קישורים אלו עשויה לזכות את בעלי האתר בעמלה, ללא עלות נוספת עבור הרוכש.
          </p>

          <p className="font-bold mb-2">6. פרטיות ואיסוף נתונים ע"י צד ג'</p>
          <p className="mb-4">
            צדדים שלישיים (כולל אמזון ומפרסמים אחרים) עשויים לאסוף תוכן ומידע, לאסוף מידע ממשתמשים ולהציב קבצי Cookie (עוגיות) בדפדפנים של המבקרים לצורך מעקב אחר ביצועי הפרסומות והתאמת תכנים.
          </p>
          
          <p className="mb-4 text-red-500 font-bold">
            בלחיצה על הלחצן למטה, את/ה מאשר/ת כי קראת, הבנת והסכמת לכל האמור לעיל.
          </p>
        </div>

        <div className="flex flex-col items-center justify-end gap-2">
          <button 
            onClick={handleAccept}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all text-sm md:text-base"
          >
            אני מאשר/ת שקראתי את כל תנאי השימוש ואני מסכימ/ה להם
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsScreen;
