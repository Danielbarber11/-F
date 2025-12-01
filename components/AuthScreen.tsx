
import React, { useState, useEffect, useRef } from 'react';
import AccessibilityManager from './AccessibilityManager';
import { User } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSignup }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const googleLoginRef = useRef<HTMLDivElement>(null);
  const googleSignupRef = useRef<HTMLDivElement>(null);

  const initializeGoogleButton = (element: HTMLElement | null, context: 'signin' | 'signup') => {
    if (window.google && window.google.accounts && window.google.accounts.id && element) {
      window.google.accounts.id.initialize({
        client_id: "1029411846084-2jidcvnmiumb0ajqdm3fcot1rvmaldr6.apps.googleusercontent.com",
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.renderButton(
        element,
        { 
          theme: "outline", 
          size: "large", 
          width: element.offsetWidth, 
          text: context === 'signup' ? "signup_with" : "signin_with", 
          shape: "pill" 
        }
      );
    }
  };

  useEffect(() => {
    const checkGoogleLoad = setInterval(() => {
      if (window.google?.accounts?.id) {
        if (!isSignup) {
           initializeGoogleButton(googleLoginRef.current, 'signin');
        } else {
           initializeGoogleButton(googleSignupRef.current, 'signup');
        }
        clearInterval(checkGoogleLoad);
      }
    }, 500);

    return () => clearInterval(checkGoogleLoad);
  }, [isSignup]);

  const handleGoogleCallback = (response: any) => {
    try {
      const jwt = response.credential;
      const base64Url = jwt.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      
      const googleUserEmail = payload.email;
      const googleUserName = payload.name;
      const googleUserPicture = payload.picture;

      const usersStr = localStorage.getItem('aivan_users');
      const users: User[] = usersStr ? JSON.parse(usersStr) : [];
      
      const existingUser = users.find(u => u.email === googleUserEmail);

      // Check for Admin via Google (if applicable, though usually manual)
      const isAdmin = googleUserEmail === 'vaxtoponline@gmail.com';

      if (existingUser) {
        onLogin({ ...existingUser, isAdmin, isPremium: isAdmin ? true : existingUser.isPremium });
      } else {
        const newUser: User = { 
          email: googleUserEmail, 
          name: googleUserName, 
          picture: googleUserPicture,
          hasAcceptedTerms: false,
          isAdmin,
          isPremium: isAdmin
        };
        const updatedUsers = [...users, newUser];
        localStorage.setItem('aivan_users', JSON.stringify(updatedUsers));
        onSignup(newUser);
      }

    } catch (e) {
      console.error("Google Auth Error", e);
      setError("שגיאה בהתחברות עם Google.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // ADMIN HARDCODED LOGIN
    if (email === 'vaxtoponline@gmail.com' && password === '0101') {
        const adminUser: User = {
            email,
            name: 'Aivan Admin',
            hasAcceptedTerms: true,
            isAdmin: true,
            isPremium: true,
            preferences: { 
                enterToSend: false, 
                streamCode: true, 
                saveHistory: true, 
                theme: 'midnight' 
            }
        };
        onLogin(adminUser);
        return;
    }

    const usersStr = localStorage.getItem('aivan_users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (isSignup) {
      if (users.find(u => u.email === email)) {
        setError('משתמש זה כבר קיים במערכת.');
        return;
      }
      const newUser: User = { 
        email, 
        password, 
        name: name || email.split('@')[0], 
        hasAcceptedTerms: false 
      };
      const updatedUsers = [...users, newUser];
      localStorage.setItem('aivan_users', JSON.stringify(updatedUsers));
      onSignup(newUser);
    } else {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('אימייל או סיסמה שגויים.');
      }
    }
  };

  const toggleMode = () => {
    setError('');
    setIsSignup(!isSignup);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center animate-gradient p-4 relative overflow-hidden">
      <AccessibilityManager positionClass="fixed top-6 right-6" />

      {/* 3D Flip Container */}
      <div className={`relative w-full max-w-md h-[550px] transition-transform duration-700 transform-style-3d perspective-1000 ${isSignup ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side (Login) */}
        <div className="absolute inset-0 backface-hidden">
          <div className="bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full h-full border border-white/30 flex flex-col justify-center">
            <h1 className="text-5xl font-black text-white text-center mb-4 drop-shadow-md tracking-wide">AIVAN</h1>
            <h2 className="text-lg text-white text-center mb-4 font-light">ברוכים השבים</h2>
            
            {error && !isSignup && (
              <div className="bg-red-500/80 text-white text-center p-2 rounded-lg mb-2 text-sm">{error}</div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-white text-xs block mb-1">אימייל</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-white text-purple-600 font-bold shadow-lg hover:scale-[1.02] transition-transform mt-2">
                התחבר
              </button>
            </form>

            <div className="relative my-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div>
               <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-white">או</span></div>
            </div>
            
            <div ref={googleLoginRef} className="w-full flex justify-center h-[44px]"></div>

            <div className="mt-4 text-center">
              <button onClick={toggleMode} className="text-white hover:text-yellow-200 underline decoration-dotted text-sm">
                אין לך חשבון? הירשם עכשיו
              </button>
            </div>
          </div>
        </div>

        {/* Back Side (Signup) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <div className="bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full h-full border border-white/30 flex flex-col justify-center">
            <h1 className="text-5xl font-black text-white text-center mb-4 drop-shadow-md tracking-wide">AIVAN</h1>
            <h2 className="text-lg text-white text-center mb-4 font-light">יצירת חשבון חדש</h2>
            
            {error && isSignup && (
              <div className="bg-red-500/80 text-white text-center p-2 rounded-lg mb-2 text-sm">{error}</div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-white text-xs block mb-1">שם מלא</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">אימייל</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-white text-purple-600 font-bold shadow-lg hover:scale-[1.02] transition-transform mt-2">
                צור חשבון
              </button>
            </form>

             <div className="relative my-4">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div>
               <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-white">או</span></div>
            </div>

            <div ref={googleSignupRef} className="w-full flex justify-center h-[44px]"></div>

            <div className="mt-4 text-center">
              <button onClick={toggleMode} className="text-white hover:text-yellow-200 underline decoration-dotted text-sm">
                כבר יש לך חשבון? התחבר
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthScreen;
