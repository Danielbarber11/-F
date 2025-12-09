
import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TermsScreen from './components/TermsScreen';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import PremiumScreen from './components/PremiumScreen';
import AdvertiseScreen from './components/AdvertiseScreen';
import AdManagementScreen from './components/AdManagementScreen';
import { Screen, ProjectConfig, User, AdRequest, ProjectSession, ChatMessage } from './types';
import { auth, saveUserToDB, getUserFromDB, getSessionsFromDB, saveSessionToDB, deleteSessionFromDB, clearSessionsFromDB, getAdsFromDB, saveAdRequestToDB, deleteAdFromDB } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.AUTH);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  
  // New State for Sessions (Resume Capability)
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Auth Listener (Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in via Firebase
            let dbUser: User | null = null;
            try {
                dbUser = await getUserFromDB(firebaseUser.uid);
            } catch (e) {
                console.warn("Could not load user data from DB", e);
            }

            const isAdmin = firebaseUser.email === 'vaxtoponline@gmail.com';
            
            if (dbUser) {
                // Existing user
                const effectiveUser = { ...dbUser, isAdmin, isPremium: isAdmin ? true : dbUser.isPremium };
                setCurrentUser(effectiveUser);
                loadUserData(firebaseUser.uid);
                
                // CRITICAL FIX: Only show terms if user hasn't accepted them yet.
                if (effectiveUser.hasAcceptedTerms) {
                    setCurrentScreen(Screen.HOME);
                } else {
                    setCurrentScreen(Screen.TERMS);
                }
            } else {
                 // New User (First time login or Google login first time)
                 const newUser: User = {
                     email: firebaseUser.email || '',
                     name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                     picture: firebaseUser.photoURL || undefined,
                     hasAcceptedTerms: false,
                     isAdmin,
                     isPremium: isAdmin
                 };
                 
                 // Save the new user to DB immediately
                 await saveUserToDB(newUser).catch(e => console.warn("Initial DB Save failed", e));
                 
                 setCurrentUser(newUser);
                 // Force Terms for new users
                 setCurrentScreen(Screen.TERMS);
            }
        } else {
            // User signed out
            setCurrentUser(null);
            setCurrentScreen(Screen.AUTH);
        }
        setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []); 

  const loadUserData = async (uid: string) => {
      // Load Sessions
      try {
        const userSessions = await getSessionsFromDB(uid);
        if (userSessions) {
            setSessions(userSessions.sort((a, b) => b.lastModified - a.lastModified));
        }
      } catch (e) {
          console.error("Failed loading sessions", e);
      }
      
      // Load Ads
      try {
          const ads = await getAdsFromDB();
          if (ads) {
              setAdRequests(ads);
          }
      } catch (e) {
          console.error("Failed loading ads", e);
      }
  };

  const handleTermsAccepted = async () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, hasAcceptedTerms: true };
    setCurrentUser(updatedUser);
    
    // Save to DB immediately so next time they skip terms
    if (auth.currentUser) {
        await saveUserToDB(updatedUser).catch(e => console.warn("Failed to save terms acceptance", e));
    }
    setCurrentScreen(Screen.HOME);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    if (auth.currentUser) {
        await saveUserToDB(updatedUser).catch(e => console.warn("Failed to update user", e));
    }
  };

  const handleActivatePremium = () => {
      if (!currentUser) return;
      const updatedUser: User = { ...currentUser, isPremium: true };
      handleUpdateUser(updatedUser);
      alert("ברכות! מנוי הפרימיום הופעל בהצלחה. כל המגבלות הוסרו.");
      setCurrentScreen(Screen.HOME);
  };
  
  const handleCancelSubscription = () => {
      if (!currentUser) return;
      const updatedUser: User = { ...currentUser, isPremium: false };
      handleUpdateUser(updatedUser);
      alert("המנוי בוטל בהצלחה.");
  }

  const handleStartProject = (config: ProjectConfig) => {
    if (!currentUser) return;

    // --- ENFORCE PREMIUM LIMITS ---
    if (config.language !== 'HTML/CSS/JS' && !currentUser.isPremium && !currentUser.isAdmin) {
        alert("יצירת קוד בשפות מתקדמות (Python/React/Node) זמינה למנויי פרימיום בלבד.");
        setCurrentScreen(Screen.PREMIUM);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const lastRequestDate = currentUser.preferences?.lastRequestDate;
    let dailyCount = currentUser.preferences?.dailyRequestsCount || 0;

    if (lastRequestDate !== today) {
        dailyCount = 0; // Reset for new day
    }

    if (!currentUser.isPremium && !currentUser.isAdmin && dailyCount >= 20) {
        alert("הגעת למגבלת הבקשות היומית (20). שדרג לפרימיום להמשך עבודה ללא הגבלה!");
        setCurrentScreen(Screen.PREMIUM);
        return;
    }

    // Increment Usage
    const updatedUser = {
        ...currentUser,
        preferences: {
            ...currentUser.preferences,
            dailyRequestsCount: dailyCount + 1,
            lastRequestDate: today,
            enterToSend: currentUser.preferences?.enterToSend || false,
            streamCode: true,
            saveHistory: currentUser.preferences?.saveHistory ?? true
        }
    };
    handleUpdateUser(updatedUser);

    // Create New Session
    const newSessionId = Date.now().toString();
    const newSession: ProjectSession = {
        id: newSessionId,
        name: config.prompt,
        config: config,
        code: '',
        creatorMessages: [],
        questionMessages: [],
        lastModified: Date.now()
    };

    setProjectConfig(config);
    setCurrentSessionId(newSessionId);
    
    // Optimistic Update
    if (updatedUser.preferences?.saveHistory) {
         setSessions(prev => [newSession, ...prev]);
         if (auth.currentUser) {
            saveSessionToDB(auth.currentUser.uid, newSession).catch(e => console.warn("Failed to save session", e));
         }
    }

    setCurrentScreen(Screen.WORKSPACE);
  };

  const handleResumeSession = (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
          setProjectConfig(session.config);
          setCurrentSessionId(session.id);
          setCurrentScreen(Screen.WORKSPACE);
      }
  };

  const handleSaveSession = async (code: string, creatorMessages: ChatMessage[], questionMessages: ChatMessage[]) => {
      if (!currentSessionId || !currentUser?.preferences?.saveHistory || !auth.currentUser) return;

      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession) {
          const updatedSession = { ...currentSession, code, creatorMessages, questionMessages, lastModified: Date.now() };
          
          setSessions(prev => prev.map(s => s.id === currentSessionId ? updatedSession : s));
          
          await saveSessionToDB(auth.currentUser.uid, updatedSession).catch(e => console.warn("Session save failed", e));
      }
  };

  const handleBackToDashboard = () => {
    setProjectConfig(null);
    setCurrentSessionId(null);
    setCurrentScreen(Screen.HOME);
  };

  const handleLogout = async () => {
    await signOut(auth);
    // State clear is handled by onAuthStateChanged
  };

  const handleClearHistory = async () => {
    if (!auth.currentUser) return;
    await clearSessionsFromDB(auth.currentUser.uid).catch(e => console.warn("Clear failed", e));
    setSessions([]);
  };

  const handleDeleteHistoryItem = async (index: number) => {
     if (!auth.currentUser) return;
     const sessionToDelete = sessions[index];
     if (sessionToDelete) {
         setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
         await deleteSessionFromDB(auth.currentUser.uid, sessionToDelete.id).catch(e => console.warn("Delete failed", e));
     }
  };

  const handleRenameHistoryItem = async (index: number, newName: string) => {
    if (!auth.currentUser) return;
    const sessionToRename = sessions[index];
    if (sessionToRename) {
        const updatedSession = { ...sessionToRename, name: newName };
        setSessions(prev => prev.map(s => s.id === sessionToRename.id ? updatedSession : s));
        await saveSessionToDB(auth.currentUser.uid, updatedSession).catch(e => console.warn("Rename failed", e));
    }
  };

  const handleCreateAd = async (requestData: Omit<AdRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userEmail'>) => {
      if (!currentUser) return;
      const uid = auth.currentUser ? auth.currentUser.uid : 'temp-uid';
      const newAd: AdRequest = {
          ...requestData,
          id: Date.now().toString(),
          userId: uid,
          userEmail: currentUser.email,
          status: 'PENDING',
          timestamp: Date.now()
      };
      
      try {
        await saveAdRequestToDB(newAd);
        setAdRequests(prev => [...prev, newAd]);
        alert('הבקשה נשלחה לאישור בהצלחה!');
        setCurrentScreen(Screen.AD_MANAGEMENT);
      } catch (e) {
          alert('שגיאה בשליחת הבקשה. (ייתכן ונדרשת התחברות מלאה)');
      }
  };

  const handleAdAction = async (id: string, action: 'APPROVE' | 'REJECT' | 'DELETE') => {
      if (action === 'DELETE') {
          await deleteAdFromDB(id);
          setAdRequests(prev => prev.filter(ad => ad.id !== id));
      } else {
          const adToUpdate = adRequests.find(ad => ad.id === id);
          if (adToUpdate) {
              const updatedAd = { ...adToUpdate, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } as AdRequest;
              await saveAdRequestToDB(updatedAd);
              setAdRequests(prev => prev.map(ad => ad.id === id ? updatedAd : ad));
          }
      }
  };

  const approvedAds = adRequests.filter(ad => ad.status === 'APPROVED');
  const effectiveApprovedAds = approvedAds.length > 0 ? approvedAds : [
      { 
            id: 'amz_logitech', 
            userId: 'system', 
            userEmail: 'Amazon Affiliate', 
            description: 'מצלמת אינטרנט Logitech Brio 4K Ultra HD - איכות תמונה מדהימה.', 
            budget: 50000, 
            status: 'APPROVED', 
            timestamp: Date.now(), 
            targetUrl: 'https://amzn.to/3XVohL0',
            mediaName: 'https://m.media-amazon.com/images/I/71SAamTGWQL._AC_SL1500_.jpg'
        },
        { 
            id: 'amz_sceptre', 
            userId: 'system', 
            userEmail: 'Amazon Affiliate', 
            description: 'מסך גיימינג Sceptre בגודל 27 אינץ\' - קצב רענון גבוה.', 
            budget: 50000, 
            status: 'APPROVED', 
            timestamp: Date.now(), 
            targetUrl: 'https://amzn.to/48GHZAd', 
            mediaName: 'https://m.media-amazon.com/images/I/61KJzoYejTS._SL1305_.jpg'
        },
        { 
            id: 'amz_samsung', 
            userId: 'system', 
            userEmail: 'Amazon Affiliate', 
            description: 'מסך מחשב SAMSUNG ViewFinity S8 (S80D) - רזולוציה גבוהה.', 
            budget: 50000, 
            status: 'APPROVED', 
            timestamp: Date.now(), 
            targetUrl: 'https://amzn.to/4aiTtLx', 
            mediaName: 'https://m.media-amazon.com/images/I/61D59-PwUAL._AC_SL1500_.jpg'
        }
  ] as AdRequest[];

  const userPendingAdsCount = adRequests.filter(ad => ad.status === 'PENDING').length;
  const hasUserAds = currentUser ? adRequests.some(ad => ad.userEmail === currentUser.email) : false;

  const activeSession = sessions.find(s => s.id === currentSessionId);
  const themeClass = currentUser?.preferences?.theme ? `theme-${currentUser.preferences.theme}` : '';

  if (loadingAuth) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">
              <div className="flex flex-col items-center">
                  <div className="loader w-10 h-10 border-4 border-white/20 border-t-purple-500 mb-4"></div>
                  <h1 className="text-xl font-bold tracking-widest">AIVAN</h1>
                  <p className="text-xs text-gray-400 mt-2">מתחבר...</p>
              </div>
          </div>
      );
  }

  return (
    <div className={themeClass}>
      {currentScreen === Screen.AUTH && (
        <AuthScreen onLogin={() => {}} onSignup={() => {}} /> 
        // Note: AuthScreen now triggers auth state change, which App listens to. 
        // Callbacks passed here are mostly redundant but kept for type safety if AuthScreen used hybrid approach.
      )}
      {currentScreen === Screen.TERMS && (
        <TermsScreen onAccept={handleTermsAccepted} />
      )}
      {currentScreen === Screen.HOME && (
        <Dashboard 
          onStartProject={handleStartProject} 
          sessions={sessions}
          onResumeSession={handleResumeSession}
          onLogout={handleLogout}
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          onClearHistory={handleClearHistory}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          onRenameHistoryItem={handleRenameHistoryItem}
          onShowPremium={() => setCurrentScreen(Screen.PREMIUM)}
          onShowAdvertise={() => setCurrentScreen(Screen.ADVERTISE)}
          onShowAdManagement={() => setCurrentScreen(Screen.AD_MANAGEMENT)}
          pendingAdsCount={currentUser?.isAdmin ? userPendingAdsCount : 0}
          hasUserAds={hasUserAds}
        />
      )}
      {currentScreen === Screen.PREMIUM && (
          <PremiumScreen 
            onBack={() => setCurrentScreen(Screen.HOME)} 
            onActivate={handleActivatePremium}
          />
      )}
      {currentScreen === Screen.ADVERTISE && <AdvertiseScreen onBack={() => setCurrentScreen(Screen.HOME)} onSubmit={handleCreateAd} />}
      {currentScreen === Screen.AD_MANAGEMENT && (
          <AdManagementScreen 
             user={currentUser}
             adRequests={adRequests}
             onApprove={(id) => handleAdAction(id, 'APPROVE')}
             onReject={(id) => handleAdAction(id, 'REJECT')}
             onDelete={(id) => handleAdAction(id, 'DELETE')}
             onBack={() => setCurrentScreen(Screen.HOME)}
             onCreateNew={() => setCurrentScreen(Screen.ADVERTISE)}
          />
      )}
      {currentScreen === Screen.WORKSPACE && projectConfig && (
        <Workspace 
          initialPrompt={projectConfig.prompt}
          initialLanguage={projectConfig.language}
          initialFiles={projectConfig.files || null}
          initialChatMode={projectConfig.chatMode}
          initialCode={activeSession?.code || ''}
          initialCreatorMessages={activeSession?.creatorMessages || []}
          initialQuestionMessages={activeSession?.questionMessages || []}
          modelId={projectConfig.model}
          onBack={handleBackToDashboard}
          onSave={handleSaveSession}
          user={currentUser}
          approvedAds={effectiveApprovedAds}
          onActivateAdSupportedPremium={() => {}}
        />
      )}
    </div>
  );
};

export default App;
