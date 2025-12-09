
import React, { useState, useEffect } from 'react';
import AccessibilityManager from './AccessibilityManager';
import { User } from '../types';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onSignup: (user: User) => void;
}

declare const google: any;

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSignup }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Google Sign-In (GIS)
  useEffect(() => {
    const handleCredentialResponse = async (response: any) => {
      setIsLoading(true);
      setError('');
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(auth, credential);
        // App.tsx listener handles the success transition
      } catch (e: any) {
        console.error("GIS Login Error:", e);
        setError("שגיאה בהתחברות לגוגל: " + e.message);
        setIsLoading(false);
      }
    };

    const initGoogle = () => {
      if (typeof google !== 'undefined' && google.accounts) {
        try {
            google.accounts.id.initialize({
            client_id: "1029411846084-2jidcvnmiumb0ajqdm3fcot1rvmaldr6.apps.googleusercontent.com",
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
            });

            // Render buttons for both sides
            const loginBtn = document.getElementById('google-btn-login');
            if (loginBtn) {
            google.accounts.id.renderButton(loginBtn, {
                theme: 'filled_blue',
                size: 'large',
                width: '100%', // Responsive width
                text: 'signin_with',
                shape: 'pill'
            });
            }

            const signupBtn = document.getElementById('google-btn-signup');
            if (signupBtn) {
            google.accounts.id.renderButton(signupBtn, {
                theme: 'filled_blue',
                size: 'large',
                width: '100%', // Responsive width
                text: 'signup_with',
                shape: 'pill'
            });
            }
        } catch (err) {
            console.error("Google Init Error", err);
        }
      }
    };

    // Retry loop to ensure google script is loaded
    const interval = setInterval(() => {
      if (typeof google !== 'undefined') {
        initGoogle();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isSignup]); // Re-run when flipping to ensure buttons render if needed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
        if (isSignup) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (e: any) {
        console.error(e);
        if (e.code === 'auth/email-already-in-use') {
            setError('אימייל זה כבר רשום במערכת.');
        } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
            setError('אימייל או סיסמה שגויים.');
        } else if (e.code === 'auth/weak-password') {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
        } else {
            setError('שגיאה: ' + e.message);
        }
        setIsLoading(false);
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
      <div className={`relative w-full max-w-md h-[650px] transition-transform duration-700 transform-style-3d perspective-1000 ${isSignup ? 'rotate-y-180' : ''}`}>
        
        {/* Front Side (Login) */}
        <div className="absolute inset-0 backface-hidden">
          <div className="bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full h-full border border-white/30 flex flex-col justify-center">
            <h1 className="text-5xl font-black text-white text-center mb-4 drop-shadow-md tracking-wide">AIVAN</h1>
            <h2 className="text-lg text-white text-center mb-4 font-light">ברוכים השבים</h2>
            
            {error && !isSignup && (
              <div className="bg-red-500/80 text-white text-center p-2 rounded-lg mb-4 text-sm font-medium">{error}</div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white text-xs block mb-1">אימייל</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-white text-purple-600 font-bold shadow-lg hover:scale-[1.02] transition-transform mt-2 disabled:opacity-70">
                {isLoading ? <i className="fas fa-spinner animate-spin"></i> : 'התחבר'}
              </button>
            </form>

            <div className="relative my-6">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div>
               <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-white">או</span></div>
            </div>
            
            {/* Google Button Container - GIS */}
            <div className="w-full flex justify-center min-h-[44px]">
                <div id="google-btn-login" className="w-full"></div>
            </div>

            <div className="mt-6 text-center">
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
              <div className="bg-red-500/80 text-white text-center p-2 rounded-lg mb-4 text-sm font-medium">{error}</div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white text-xs block mb-1">שם מלא</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">אימייל</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <div>
                <label className="text-white text-xs block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-white/70 text-gray-900" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-white text-purple-600 font-bold shadow-lg hover:scale-[1.02] transition-transform mt-2 disabled:opacity-70">
                {isLoading ? <i className="fas fa-spinner animate-spin"></i> : 'צור חשבון'}
              </button>
            </form>

             <div className="relative my-6">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/30"></div></div>
               <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-white">או</span></div>
            </div>

            {/* Google Button Container - GIS */}
            <div className="w-full flex justify-center min-h-[44px]">
                <div id="google-btn-signup" className="w-full"></div>
            </div>

            <div className="mt-6 text-center">
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
