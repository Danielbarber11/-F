
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role, ChatMode, User, AdRequest } from '../types';
import { sendMessageToGemini, sendMessageToGeminiStream } from '../services/geminiService';
import AccessibilityManager from './AccessibilityManager';

interface WorkspaceProps {
  initialPrompt: string;
  initialLanguage: string;
  initialFiles: FileList | null;
  initialChatMode: ChatMode;
  modelId: string;
  
  // New Props for Resume
  initialCode?: string;
  initialCreatorMessages?: ChatMessage[];
  initialQuestionMessages?: ChatMessage[];

  onBack: () => void;
  onSave: (code: string, creatorMessages: ChatMessage[], questionMessages: ChatMessage[]) => void;
  user: User | null;
  approvedAds?: AdRequest[];
  onActivateAdSupportedPremium: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
    initialPrompt, 
    initialLanguage, 
    initialFiles, 
    initialChatMode, 
    modelId,
    initialCode = '',
    initialCreatorMessages = [],
    initialQuestionMessages = [],
    onBack, 
    onSave,
    user,
    approvedAds = [],
    onActivateAdSupportedPremium
}) => {
  const [creatorMessages, setCreatorMessages] = useState<ChatMessage[]>(initialCreatorMessages);
  const [questionMessages, setQuestionMessages] = useState<ChatMessage[]>(initialQuestionMessages);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [code, setCode] = useState(initialCode);
  const [codeHistory, setCodeHistory] = useState<string[]>(initialCode ? [initialCode] : []);
  const [historyIndex, setHistoryIndex] = useState(initialCode ? 0 : -1);
  const [isEditing, setIsEditing] = useState(false);
  
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  
  // Current Ad for display
  const [currentAd, setCurrentAd] = useState<AdRequest | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isWebLanguage = initialLanguage === 'HTML/CSS/JS' || initialLanguage === 'React';
  const currentMessages = chatMode === ChatMode.CREATOR ? creatorMessages : questionMessages;
  const isPremium = !!(user?.isPremium || user?.isAdmin);

  const pushNewVersion = (newCode: string) => {
    if (!newCode) return;
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
       const newIndex = historyIndex - 1;
       setHistoryIndex(newIndex);
       setCode(codeHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < codeHistory.length - 1) {
       const newIndex = historyIndex + 1;
       setHistoryIndex(newIndex);
       setCode(codeHistory[newIndex]);
    }
  };

  const handleBack = () => {
      // Save before exiting
      onSave(code, creatorMessages, questionMessages);
      onBack();
  };

  // Logic to pick a random ad ONLY when loading starts
  useEffect(() => {
      if (isLoading && approvedAds.length > 0 && !isPremium) {
          const randomIndex = Math.floor(Math.random() * approvedAds.length);
          setCurrentAd(approvedAds[randomIndex]);
      }
  }, [isLoading, isPremium, approvedAds]);

  // Logic to handle empty state ads
  useEffect(() => {
      if (!isLoading && !code && !isPremium && approvedAds.length > 0 && !currentAd) {
          const randomIndex = Math.floor(Math.random() * approvedAds.length);
          setCurrentAd(approvedAds[randomIndex]);
      } else if (!isLoading && code) {
          setCurrentAd(null);
      }
  }, [isLoading, code, isPremium, approvedAds, currentAd]);

  useEffect(() => {
    // Only init chat if there are no existing messages (New Project)
    // If it's a resume, we already have messages from props
    if (creatorMessages.length === 0 && questionMessages.length === 0 && !initialCode) {
        const initChat = async () => {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: Role.USER,
            text: `אני רוצה לבנות: ${initialPrompt}. שפה: ${initialLanguage}`,
            timestamp: Date.now(),
        };
        setCreatorMessages([userMsg]);
        
        if (initialChatMode === ChatMode.CREATOR) {
            setIsLoading(true);
            try {
                await handleStreamingResponse(userMsg.text, [], initialFiles, ChatMode.CREATOR, "");
            } catch (error) {
                console.error("Init Chat Error:", error);
            } finally {
                setIsLoading(false);
            }
        }
        };
        initChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (currentMessages.length > lastMsgCount.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        lastMsgCount.current = currentMessages.length;
    }
  }, [currentMessages.length, chatMode]);

  const handleQuickAction = (type: 'BUGS' | 'SECURITY' | 'DEPLOY') => {
      let prompt = "";
      switch(type) {
          case 'BUGS': prompt = "אנא סרוק את הקוד ומצא שגיאות."; break;
          case 'SECURITY': prompt = "אנא הוסף שכבות אבטחה."; break;
          case 'DEPLOY': prompt = "אנא הכן את הקוד לפרסום."; break;
      }
      triggerRequest(prompt);
  };

  const triggerRequest = async (promptText: string) => {
    if (isLoading) return;
    
    // Check Daily Limit
    const today = new Date().toISOString().split('T')[0];
    const dailyCount = user?.preferences?.dailyRequestsCount || 0;
    if (!isPremium && dailyCount >= 20) {
        alert("הגעת למגבלת הבקשות היומית (20). שדרג לפרימיום!");
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: Role.USER,
      text: promptText,
      timestamp: Date.now(),
    };

    if (chatMode === ChatMode.CREATOR) {
        setCreatorMessages(prev => [...prev, userMsg]);
        pushNewVersion(code);
    } else {
        setQuestionMessages(prev => [...prev, userMsg]);
    }

    setInput('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const historyToUse = chatMode === ChatMode.CREATOR ? creatorMessages : questionMessages;
    try {
        await handleStreamingResponse(promptText, historyToUse, null, chatMode, code);
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        // Auto Save after generation
        onSave(code, creatorMessages, questionMessages); // Note: We might miss the very last updated msg state here due to closure, usually safe enough for now
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = () => {
      if (!input.trim()) return;
      triggerRequest(input);
  };

  const handleStreamingResponse = async (prompt: string, history: ChatMessage[], files: FileList | null, mode: ChatMode, currentCodeContext: string) => {
    let fullText = "";
    const botMsgId = (Date.now() + 1).toString();
    let isFirstChunk = true;

    const stream = sendMessageToGeminiStream(prompt, history, files, modelId, mode, currentCodeContext, abortControllerRef.current?.signal, isPremium);

    for await (const chunk of stream) {
      fullText += chunk;
      if (isFirstChunk) {
          const newMsg = { id: botMsgId, role: Role.MODEL, text: fullText, timestamp: Date.now() };
          const updateFn = mode === ChatMode.CREATOR ? setCreatorMessages : setQuestionMessages;
          updateFn(prev => [...prev, newMsg]);
          isFirstChunk = false;
      } else {
          const updateFn = mode === ChatMode.CREATOR ? setCreatorMessages : setQuestionMessages;
          updateFn(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullText } : msg));
      }

      if (mode === ChatMode.CREATOR) {
          extractCode(fullText);
      }
    }
  };

  const extractCode = (text: string) => {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    let match;
    let foundCode = '';
    while ((match = codeBlockRegex.exec(text)) !== null) foundCode += match[1] + '\n\n';
    
    const openBlockMatch = text.match(/```(?:\w+)?\n([\s\S]*?)$/);
    if (openBlockMatch && !text.endsWith('```')) foundCode += openBlockMatch[1];

    if (foundCode.trim()) setCode(foundCode);
  };

  const cleanMessage = (text: string) => {
    if (!text) return '';
    let cleaned = text.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/```[\s\S]*$/, '');
    return cleaned.trim();
  };

  const handleDownload = () => {
    const blob = new Blob([getCodeWithFooter(code)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    alert('הקוד הועתק ללוח!');
  };

  const handleEditToggle = () => {
      if (!isPremium) {
          alert("עריכת קוד ידנית זמינה למנויי פרימיום בלבד.");
          return;
      }
      setIsEditing(!isEditing);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  const getCodeWithFooter = (originalCode: string) => {
      if (!originalCode) return "";
      
      let footerContent = `נבנה בעזרת בינה מלאכותית ע"י <strong style="color: #9333ea;">AIVAN</strong>`;
      
      if (!isPremium) {
          footerContent += `<br/><span style="font-size: 10px; color: #999;">אתר זה מכיל תוכן שיווקי וקישורי שותפים (Amazon Associates).</span>`;
      }

      const footerHTML = `<footer style="width: 100%; padding: 20px; text-align: center; background: #f8f9fa; color: #6c757d; font-family: sans-serif; font-size: 12px; border-top: 1px solid #e9ecef; margin-top: auto;">${footerContent}</footer>`;
      
      return originalCode.includes('</body>') ? originalCode.replace('</body>', `${footerHTML}</body>`) : originalCode + footerHTML;
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden fade-in-up text-gray-900 font-sans relative">
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 relative flex-shrink-0 z-20">
             <div className="flex items-center gap-2 z-10">
                <button onClick={handleBack} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors shadow-sm border border-gray-200"><i className="fas fa-arrow-right text-lg"></i></button>
                <AccessibilityManager positionClass="relative" buttonClass="bg-gray-50 hover:bg-gray-100 text-gray-600 shadow-sm border border-gray-200" />
             </div>
             <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-100 p-1 rounded-full flex items-center shadow-inner w-[200px] z-0">
                <button onClick={() => setActiveView('preview')} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all ${activeView === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><i className="fas fa-desktop mr-2"></i>תצוגה</button>
                <button onClick={() => setActiveView('code')} className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all ${activeView === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><i className="fas fa-code mr-2"></i>קוד</button>
             </div>
             <div className="w-20"></div>
         </header>

         <div className="flex-1 relative bg-gray-50 overflow-hidden">
            <div className={`absolute inset-0 w-full h-full ${activeView === 'preview' ? 'block' : 'hidden'}`}>
                {(isLoading || (!code && !isPremium)) ? (
                    <div className={`absolute inset-0 z-50 flex items-center justify-center ${isPremium && code ? 'bg-transparent pointer-events-none' : 'bg-gray-900/40 backdrop-blur-sm'}`}>
                         
                         {/* AD DISPLAY - BILLBOARD STYLE */}
                         {!isPremium && currentAd ? (
                            <div className="relative w-full max-w-5xl mx-4 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row transform transition-all duration-700 border-4 border-transparent animate-gradient p-1 ad-entrance">
                                <div className="absolute inset-0 bg-white z-0 rounded-2xl"></div>
                                <div className="relative z-10 w-full h-full flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden">
                                  
                                  <a 
                                      href={currentAd.targetUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="w-full md:w-3/5 bg-gradient-to-br from-gray-50 to-gray-100 relative p-8 flex items-center justify-center overflow-hidden group cursor-pointer"
                                  >
                                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                                      
                                      <div className="absolute top-4 right-4 z-20 bg-black/80 text-white px-3 py-1 rounded-full border border-gray-600 shadow-sm">
                                          <span className="text-[10px] font-bold tracking-wider uppercase">ממומן</span>
                                      </div>

                                      {currentAd.mediaName ? (
                                          <img 
                                              src={currentAd.mediaName} 
                                              alt="Product" 
                                              className="relative w-full h-full object-contain z-10 transition-transform duration-700 group-hover:scale-105 drop-shadow-2xl" 
                                          />
                                      ) : (
                                          <div className="w-40 h-40 bg-gray-200 rounded-full flex items-center justify-center z-10"><i className="fas fa-image text-6xl text-gray-400"></i></div>
                                      )}
                                  </a>

                                  <div className="w-full md:w-2/5 p-8 flex flex-col justify-center bg-white relative z-10">
                                      <div className="mb-4">
                                          <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-md uppercase tracking-wide">
                                              Amazon
                                          </span>
                                      </div>
                                      <h2 className="text-2xl font-black text-gray-900 mb-4 leading-tight" dir="ltr">{currentAd.description}</h2>
                                      <p className="text-gray-500 text-sm mb-8 leading-relaxed">המוצר הנמכר ביותר בקטגוריה. אל תפספסו את ההזדמנות לשדרג.</p>
                                      
                                      {currentAd.targetUrl && (
                                          <a 
                                          href={currentAd.targetUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="w-full py-4 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 group"
                                          >
                                              <span>לרכישה באמזון</span>
                                              <i className="fas fa-arrow-left transform group-hover:-translate-x-1 transition-transform"></i>
                                          </a>
                                      )}
                                      <p className="mt-4 text-[10px] text-gray-400 text-center">כחלק מתוכנית שותפים, אנו עשויים להרוויח מרכישה זו.</p>
                                  </div>
                                </div>
                            </div>
                         ) : (!isPremium && !currentAd) ? (
                            <div className="w-64 h-64 border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center text-gray-400 opacity-50">
                                <i className="fas fa-ad text-4xl mb-2"></i>
                                <span className="font-bold">שטח פרסום</span>
                            </div>
                         ) : null}
                         
                         {/* Floating Loader */}
                         {isLoading && (
                           <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${isPremium ? 'top-1/2 bottom-auto' : ''}`}>
                               <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/50 animate-bounce">
                                   <div className="relative">
                                       <div className="w-3 h-3 bg-purple-600 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                                       <div className="w-3 h-3 bg-purple-600 rounded-full relative"></div>
                                   </div>
                                   <span className="text-sm font-bold text-gray-800 tracking-wide">Aivan בונה את האתר...</span>
                               </div>
                           </div>
                         )}
                    </div>
                ) : !isWebLanguage ? (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-100">
                         <div className="text-center">
                             <i className="fas fa-eye-slash text-4xl text-gray-400 mb-4"></i>
                             <h2 className="text-2xl font-bold text-gray-600">תצוגה מקדימה לא זמינה</h2>
                         </div>
                    </div>
                ) : (
                    <iframe title="Preview" srcDoc={getCodeWithFooter(code)} className="w-full h-full border-none bg-white" sandbox="allow-scripts allow-modals allow-forms allow-same-origin" />
                )}
            </div>

            <div className={`absolute inset-0 w-full h-full bg-white flex flex-col ${activeView === 'code' ? 'flex' : 'hidden'}`}>
                {!isLoading && (
                  <div className="h-16 bg-gray-50 border-b border-gray-200 flex items-center px-4 flex-shrink-0 relative overflow-x-auto no-scrollbar slide-in-right">
                      <div className="mx-auto bg-white border border-gray-300 rounded-full flex items-center p-1.5 shadow-sm gap-1 whitespace-nowrap min-w-max">
                          {codeHistory.length > 1 && (
                            <>
                              <div className="flex items-center gap-1">
                                  <button onClick={handleUndo} disabled={historyIndex <= 0} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><i className="fas fa-arrow-right"></i></button>
                                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 cursor-default">גרסה {historyIndex + 1}</span>
                                  <button onClick={handleRedo} disabled={historyIndex >= codeHistory.length - 1} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"><i className="fas fa-arrow-left"></i></button>
                              </div>
                              <div className="w-px h-5 bg-gray-300 mx-2"></div>
                            </>
                          )}
                          <div className="flex items-center gap-1">
                              <button onClick={() => handleQuickAction('BUGS')} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-red-50 text-red-600"><i className="fas fa-bug"></i> תיקון</button>
                              <button onClick={() => handleQuickAction('SECURITY')} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-50 text-blue-600"><i className="fas fa-shield-alt"></i> אבטחה</button>
                              <button onClick={() => handleQuickAction('DEPLOY')} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-green-50 text-green-600"><i className="fas fa-cloud-upload-alt"></i> פרסום</button>
                          </div>
                          <div className="w-px h-5 bg-gray-300 mx-2"></div>
                          <div className="flex items-center gap-1">
                              <button onClick={handleEditToggle} className={`px-3 py-1.5 rounded-full text-xs font-medium ${isEditing ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><i className={`fas ${isEditing ? 'fa-save' : 'fa-edit'}`}></i> {isEditing ? 'שמור' : 'ערוך'}</button>
                              <button onClick={handleCopy} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-600"><i className="fas fa-copy"></i></button>
                              <button onClick={handleDownload} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-600"><i className="fas fa-download"></i></button>
                          </div>
                      </div>
                  </div>
                )}
                <div className="flex-1 overflow-auto p-4" dir="ltr">
                   {isEditing ? (
                       <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-full font-mono text-sm p-4 outline-none resize-none bg-gray-50 rounded-xl border" />
                   ) : (
                       <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap">{code}</pre>
                   )}
                </div>
            </div>
         </div>
      </div>
      <div className="w-px bg-gray-200 h-full flex-shrink-0 shadow-sm z-20"></div>
      <div className="w-full md:w-[400px] bg-white flex flex-col h-full z-10 relative shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.1)]">
            <header className="h-16 bg-white border-b border-gray-200 flex flex-col items-center justify-center px-4 flex-shrink-0 relative">
                 <span className="text-[10px] font-black tracking-widest text-gray-300 mb-1">AIVAN</span>
                 <div className="flex items-center gap-3 w-full justify-center">
                    <div className="bg-gray-100 p-1 rounded-full flex items-center shadow-inner w-[180px]">
                        <button onClick={() => !isLoading && setChatMode(ChatMode.CREATOR)} disabled={isLoading} className={`flex-1 rounded-full py-1 text-xs font-bold transition-all ${chatMode === ChatMode.CREATOR ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'} ${isLoading ? 'opacity-50' : ''}`}><i className="fas fa-magic mr-1"></i>סוכן</button>
                        <button onClick={() => !isLoading && setChatMode(ChatMode.QUESTION)} disabled={isLoading} className={`flex-1 rounded-full py-1 text-xs font-bold transition-all ${chatMode === ChatMode.QUESTION ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'} ${isLoading ? 'opacity-50' : ''}`}><i className="fas fa-question-circle mr-1"></i>שאלה</button>
                    </div>
                 </div>
            </header>
            <div className={`py-2 text-center text-[10px] font-bold border-b tracking-wide ${chatMode === ChatMode.CREATOR ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {chatMode === ChatMode.CREATOR ? 'מצב סוכן / יוצר (Creator)' : 'מצב שאלה (Question)'}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {currentMessages.length === 0 && (
                 <div className="text-center text-gray-400 mt-20 flex flex-col items-center"><div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${chatMode === ChatMode.CREATOR ? 'bg-purple-100 text-purple-400' : 'bg-blue-100 text-blue-400'}`}><i className={`fas ${chatMode === ChatMode.CREATOR ? 'fa-magic' : 'fa-comment'} text-2xl`}></i></div><p className="font-medium text-gray-500">{chatMode === ChatMode.CREATOR ? 'אייבן מוכן ליצור...' : 'שאל שאלה על הקוד...'}</p></div>
              )}
              {currentMessages.map((msg, idx) => (
                <div key={msg.id} className={`flex flex-col w-full ${msg.role === Role.USER ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === Role.USER ? 'bg-white text-gray-800 border border-gray-200 rounded-tr-none' : (chatMode === ChatMode.CREATOR ? 'bg-purple-600 text-white rounded-tl-none' : 'bg-blue-600 text-white rounded-tl-none')}`}>
                     <div style={{ whiteSpace: 'pre-wrap' }}>{msg.role === Role.MODEL ? cleanMessage(msg.text) : msg.text}</div>
                  </div>
                  {/* Message Counter for Free Users (Bot Only) */}
                  {!isPremium && msg.role === Role.MODEL && (
                       <span className="text-[9px] text-gray-400 mt-1 px-1">בקשה {Math.min((idx / 2) + 1, 20).toFixed(0)}/20</span>
                  )}
                </div>
              ))}
              {isLoading && <div className="flex justify-end items-center px-2 fade-in-up"><div className="bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm flex items-center gap-2"><div className="loader w-4 h-4 border-2"></div><span className="text-xs text-gray-500 font-medium">אייבן חושב...</span></div></div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white border-t border-gray-200 z-20">
               <div className="relative shadow-sm rounded-xl">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isLoading} placeholder={isLoading ? "ממתין לתשובה..." : (chatMode === ChatMode.CREATOR ? "תן הוראות לשינוי הקוד..." : "שאל שאלה על הקוד...")} className={`w-full bg-gray-50 text-gray-800 pl-4 pr-12 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-14 text-sm transition-all ${isLoading ? 'opacity-60 cursor-wait' : 'focus:bg-white'}`} />
                  {isLoading ? (
                    <button onClick={handleStopGeneration} className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white border border-gray-200 hover:bg-red-50 group">
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 border-r-red-500 animate-spin opacity-50"></div>
                      <i className="fas fa-square text-red-500 z-10 text-xs"></i>
                    </button>
                  ) : (
                    <button onClick={handleSendMessage} disabled={!input.trim()} className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors shadow-sm">
                       <i className="fas fa-arrow-up"></i>
                    </button>
                  )}
               </div>
            </div>
      </div>
    </div>
  );
};

export default Workspace;
