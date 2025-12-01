
import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import TermsScreen from './components/TermsScreen';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import PremiumScreen from './components/PremiumScreen';
import AdvertiseScreen from './components/AdvertiseScreen';
import AdManagementScreen from './components/AdManagementScreen';
import { Screen, ProjectConfig, User, AdRequest, ProjectSession, ChatMessage } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.AUTH);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  
  // New State for Sessions (Resume Capability)
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);

  useEffect(() => {
    // Load Sessions
    const savedSessions = localStorage.getItem('aivan_sessions');
    if (savedSessions) {
        try {
            setSessions(JSON.parse(savedSessions));
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    } else {
        // Migration from old history (strings) to new sessions if needed
        const oldHistory = localStorage.getItem('aivan_history');
        if (oldHistory) {
            const prompts: string[] = JSON.parse(oldHistory);
            const migratedSessions: ProjectSession[] = prompts.map((p, i) => ({
                id: `legacy_${i}`,
                name: p,
                config: { prompt: p, language: 'HTML/CSS/JS', model: 'gemini-2.5-flash', chatMode: 'CREATOR' as any },
                code: '',
                creatorMessages: [],
                questionMessages: [],
                lastModified: Date.now()
            }));
            setSessions(migratedSessions);
            localStorage.setItem('aivan_sessions', JSON.stringify(migratedSessions));
        }
    }
    
    // Load ads from system storage
    const savedAds = localStorage.getItem('aivan_ads');
    if (savedAds && JSON.parse(savedAds).length > 0) {
      setAdRequests(JSON.parse(savedAds));
    } else {
      // Inject Specific Amazon Ads (Logitech, Sceptre, Samsung)
      const defaultAds: AdRequest[] = [
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
      ];
      setAdRequests(defaultAds);
      localStorage.setItem('aivan_ads', JSON.stringify(defaultAds));
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.hasAcceptedTerms) setCurrentScreen(Screen.HOME);
    else setCurrentScreen(Screen.TERMS);
  };

  const handleTermsAccepted = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, hasAcceptedTerms: true };
    setCurrentUser(updatedUser);
    updateLocalStorage(updatedUser);
    setCurrentScreen(Screen.HOME);
  };

  const updateLocalStorage = (user: User) => {
    const usersStr = localStorage.getItem('aivan_users');
    if (usersStr) {
      const users: User[] = JSON.parse(usersStr);
      const updatedUsers = users.map(u => u.email === user.email ? user : u);
      localStorage.setItem('aivan_users', JSON.stringify(updatedUsers));
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    updateLocalStorage(updatedUser);
  };

  const handleActivatePremium = () => {
      if (!currentUser) return;
      const updatedUser: User = { ...currentUser, isPremium: true };
      handleUpdateUser(updatedUser);
      alert("ברכות! מנוי הפרימיום הופעל בהצלחה. כל המגבלות הוסרו.");
      setCurrentScreen(Screen.HOME);
  };

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
    
    if (updatedUser.preferences?.saveHistory) {
      setSessions(prev => {
          const newSessions = [newSession, ...prev];
          const limited = newSessions.slice(0, 20);
          localStorage.setItem('aivan_sessions', JSON.stringify(limited));
          return limited;
      });
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

  const handleSaveSession = (code: string, creatorMessages: ChatMessage[], questionMessages: ChatMessage[]) => {
      if (!currentSessionId || !currentUser?.preferences?.saveHistory) return;

      setSessions(prev => {
          const updated = prev.map(s => {
              if (s.id === currentSessionId) {
                  return { ...s, code, creatorMessages, questionMessages, lastModified: Date.now() };
              }
              return s;
          });
          localStorage.setItem('aivan_sessions', JSON.stringify(updated));
          return updated;
      });
  };

  const handleBackToDashboard = () => {
    setProjectConfig(null);
    setCurrentSessionId(null);
    setCurrentScreen(Screen.HOME);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setProjectConfig(null);
    setCurrentSessionId(null);
    setCurrentScreen(Screen.AUTH);
  };

  const handleClearHistory = () => {
    setSessions([]);
    localStorage.removeItem('aivan_sessions');
    localStorage.removeItem('aivan_history'); // clear legacy
  };

  const handleDeleteHistoryItem = (index: number) => {
    setSessions(prev => {
      const newSessions = prev.filter((_, i) => i !== index);
      localStorage.setItem('aivan_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleRenameHistoryItem = (index: number, newName: string) => {
    setSessions(prev => {
      const newSessions = [...prev];
      if (newSessions[index]) newSessions[index].name = newName;
      localStorage.setItem('aivan_sessions', JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleCreateAd = (requestData: Omit<AdRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userEmail'>) => {
      if (!currentUser) return;
      const newAd: AdRequest = {
          ...requestData,
          id: Date.now().toString(),
          userId: currentUser.email,
          userEmail: currentUser.email,
          status: 'PENDING',
          timestamp: Date.now()
      };
      const updatedAds = [...adRequests, newAd];
      setAdRequests(updatedAds);
      localStorage.setItem('aivan_ads', JSON.stringify(updatedAds));
      alert('הבקשה נשלחה לאישור בהצלחה!');
      setCurrentScreen(Screen.AD_MANAGEMENT);
  };

  const handleAdAction = (id: string, action: 'APPROVE' | 'REJECT' | 'DELETE') => {
      let updatedAds = [...adRequests];
      if (action === 'DELETE') {
          updatedAds = updatedAds.filter(ad => ad.id !== id);
      } else {
          updatedAds = updatedAds.map(ad => ad.id === id ? { ...ad, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : ad);
      }
      setAdRequests(updatedAds);
      localStorage.setItem('aivan_ads', JSON.stringify(updatedAds));
  };

  const approvedAds = adRequests.filter(ad => ad.status === 'APPROVED');
  const userPendingAdsCount = adRequests.filter(ad => ad.status === 'PENDING').length;
  const hasUserAds = adRequests.some(ad => ad.userId === currentUser?.email);

  // Find current session data for Workspace props
  const activeSession = sessions.find(s => s.id === currentSessionId);

  const themeClass = currentUser?.preferences?.theme ? `theme-${currentUser.preferences.theme}` : '';

  return (
    <div className={themeClass}>
      {currentScreen === Screen.AUTH && (
        <AuthScreen onLogin={handleAuthSuccess} onSignup={handleAuthSuccess} />
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
          approvedAds={approvedAds}
          onActivateAdSupportedPremium={() => {}}
        />
      )}
    </div>
  );
};

export default App;
