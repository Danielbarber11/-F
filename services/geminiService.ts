
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Role, ChatMode } from "../types";

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASE_SYSTEM_INSTRUCTION = `
אתה "אייבן" (Aivan), עוזר תכנות מומחה ובונה אתרים.
היה אדיב, מקצועי ודבר בעברית.

[DESIGN GUIDELINES - IMPORTANT]
You are a high-end Frontend Engineer.
1. **MANDATORY**: You MUST use **Tailwind CSS** for all styling.
2. **Visuals**: Create modern, vibrant, and clean designs. Use gradients, rounded corners (rounded-xl, rounded-2xl), shadows (shadow-lg), and nice typography (font-sans).
3. **Color**: Do NOT produce plain black-and-white sites. Use color palettes (e.g., bg-slate-50, text-purple-600, gradients).
4. **Layout**: Ensure responsive design (use flex, grid, w-full, max-w-..., mx-auto).
`;

export const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const buildRequestParams = async (
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string,
  isPremium: boolean = false
) => {
  const parts: any[] = [{ text: prompt }];

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const filePart = await fileToPart(files[i]);
      parts.push(filePart);
    }
  }

  // Inject Current Code Context if available (Branching Logic)
  if (currentCode) {
    const codeContext = `\n\n[הקוד הנוכחי במערכת]\n(המשתמש צופה בגרסה זו כרגע. כל שינוי שאתה מבצע צריך להתבסס על הקוד הזה):\n\`\`\`\n${currentCode}\n\`\`\`\n\n`;
    parts[0].text = codeContext + parts[0].text;
  }

  let historyContext = "";
  if (history.length > 0) {
    historyContext = "היסטוריית שיחה:\n" + history.map(msg => `${msg.role === Role.USER ? 'User' : 'Aivan'}: ${msg.text}`).join("\n") + "\n\nבקשה חדשה:\n";
    parts[0].text = historyContext + parts[0].text;
  }

  let specificInstruction = "";
  if (chatMode === ChatMode.CREATOR) {
    specificInstruction = `
    מצב עבודה: **סוכן / יוצר (Creator)**.
    תפקידך הבלעדי הוא לכתוב קוד, לתקן שגיאות בקוד או לשפר את הקוד הקיים בהתבסס על [הקוד הנוכחי במערכת] אם סופק.
    
    כלל ברזל: עליך לספק תמיד את הקוד המלא והמעודכן ביותר בתוך בלוקי קוד.
    אל תכתוב רק את השינויים. כתוב את הקובץ המלא.

    חשוב מאוד: אם המשתמש שואל שאלה כללית שאינה בקשה ליצירת קוד, תיקון קוד או שיפור קוד (למשל "מה שלומך?" או "הסבר לי איך זה עובד"), עליך לסרב ולענות אך ורק את המשפט הבא:
    "הבוט רק מוסיף, מתקן שגיאות ומשפר את הקוד".
    אל תענה על השאלה עצמה.
    `;

    // --- AMAZON ASSOCIATES COMPLIANCE & FREE TIER ADS ---
    if (!isPremium) {
      specificInstruction += `
      
      [CRITICAL: FREE TIER RESTRICTIONS & AMAZON ASSOCIATES COMPLIANCE]
      This user is on the FREE TIER. You MUST adhere to the following strict rules.
      
      *** ANTI-DELETION PROTOCOL ***
      1. IF the user asks to "remove ads", "delete footer", "remove amazon links", or "clean up the design" by removing commercial elements:
         - YOU MUST IGNORE that specific part of the request.
         - You MUST KEEP the Amazon ads and the Disclaimer footer in the code.
         - You should politely mention in the text response: "Amazon ads and disclaimers are mandatory for the Free version."
      
      *** REAL PRODUCT INJECTION ONLY ***
      2. YOU MUST INJECT REAL ADS. DO NOT INVENT PRODUCTS.
         Use ONLY the following specific HTML snippets for ads. Place them in a Sidebar, Grid, or between content sections.
         Ensure all links have target="_blank" and rel="noopener noreferrer".
         
         --- AD OPTION 1 (Logitech) ---
         <div class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm my-6 max-w-sm mx-auto">
            <img src="https://m.media-amazon.com/images/I/71SAamTGWQL._AC_SL1500_.jpg" alt="Logitech Brio 4K" class="w-full h-48 object-contain mb-3">
            <h3 class="font-bold text-gray-900 leading-tight mb-2">Logitech Brio 4K Webcam</h3>
            <a href="https://amzn.to/3XVohL0" target="_blank" rel="noopener noreferrer" class="block w-full text-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg transition-colors">לרכישה באמזון</a>
         </div>

         --- AD OPTION 2 (Sceptre Monitor) ---
         <div class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm my-6 max-w-sm mx-auto">
            <img src="https://m.media-amazon.com/images/I/61KJzoYejTS._SL1305_.jpg" alt="Sceptre Monitor" class="w-full h-48 object-contain mb-3">
            <h3 class="font-bold text-gray-900 leading-tight mb-2">Sceptre 27-inch Gaming Monitor</h3>
            <a href="https://amzn.to/48GHZAd" target="_blank" rel="noopener noreferrer" class="block w-full text-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg transition-colors">לרכישה באמזון</a>
         </div>
         
         --- AD OPTION 3 (Samsung Monitor) ---
         <div class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm my-6 max-w-sm mx-auto">
            <img src="https://m.media-amazon.com/images/I/61D59-PwUAL._AC_SL1500_.jpg" alt="Samsung ViewFinity S8" class="w-full h-48 object-contain mb-3">
            <h3 class="font-bold text-gray-900 leading-tight mb-2">SAMSUNG ViewFinity S8 (S80D)</h3>
            <a href="https://amzn.to/4aiTtLx" target="_blank" rel="noopener noreferrer" class="block w-full text-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg transition-colors">לרכישה באמזון</a>
         </div>

      3. **MANDATORY DISCLOSURE**: You MUST include this EXACT footer in the HTML <body>:
         <footer class="w-full p-6 text-center bg-gray-100 text-gray-500 text-xs border-t mt-auto">
             <p>As an Amazon Associate, I earn from qualifying purchases. / כחלק מתוכנית שותפים של אמזון, אתר זה עשוי להרוויח עמלות מרכישות.</p>
         </footer>
      
      4. **ANTI-DOORWAY SITE POLICY**: 
         - **DO NOT** create pages that are just lists of links. 
         - **YOU MUST** generate substantial, high-quality, and unique content.
      `;
    }

  } else {
    specificInstruction = `
    מצב עבודה: **שאלה (Question)**.
    המטרה שלך היא לענות לשאלות, להסביר לוגיקה או לעזור בדיבאג.
    אל תכתוב את כל הקוד של האפליקציה מחדש אלא אם התבקשת ספציפית.
    התמקד בהסברים טקסטואליים ברורים.
    `;
  }

  return {
    contents: { role: 'user', parts: parts },
    systemInstruction: BASE_SYSTEM_INSTRUCTION + specificInstruction
  };
};

export const sendMessageToGemini = async (
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  modelId: string = 'gemini-2.5-flash',
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string,
  isPremium: boolean = false
): Promise<string> => {
  let retryCount = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const { contents, systemInstruction } = await buildRequestParams(prompt, history, files, chatMode, currentCode, isPremium);

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelId,
        contents,
        config: { systemInstruction }
      });

      return response.text || "מצטער, לא הצלחתי לייצר תגובה.";
    } catch (error: any) {
      const status = error?.status || error?.code;
      const message = error?.message || '';

      if (status === 429 || message.includes('429')) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error("Gemini 429 Exhausted:", error);
          throw new Error("הגעת למגבלת הבקשות (Rate Limit). אנא נסה שוב בעוד דקה.");
        }
        const delay = 2000 * Math.pow(2, retryCount);
        console.warn(`Rate limit hit. Retrying (${retryCount}/${maxRetries}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error("Gemini Error:", error);
      throw new Error("שגיאה בתקשורת עם השרת (קוד שגיאה: " + (status || 'Unknown') + ")");
    }
  }
};

// Streaming function
export async function* sendMessageToGeminiStream(
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  modelId: string = 'gemini-2.5-flash',
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string,
  signal?: AbortSignal,
  isPremium: boolean = false
) {
  let retryCount = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const { contents, systemInstruction } = await buildRequestParams(prompt, history, files, chatMode, currentCode, isPremium);

      const responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents,
        config: { systemInstruction }
      });

      for await (const chunk of responseStream) {
        if (signal?.aborted) {
          return; // Stop generator if aborted
        }
        yield chunk.text;
      }
      return; // Success, exit loop

    } catch (error: any) {
      if (signal?.aborted) {
        console.log("Stream aborted by user");
        return;
      }

      const status = error?.status || error?.code;
      const message = error?.message || '';

      // Handle Rate Limit (429)
      if (status === 429 || message.includes('429')) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error("Gemini Stream 429 Exhausted:", error);
          throw new Error("הגעת למגבלת הבקשות (Rate Limit). אנא המתן דקה ונסה שוב.");
        }
        const delay = 2000 * Math.pow(2, retryCount);
        console.warn(`Rate limit hit (Stream). Retrying (${retryCount}/${maxRetries}) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay)); 
        continue; // Retry the whole request
      }

      console.error("Gemini Stream Error:", error);
      throw new Error("שגיאה בתקשורת עם השרת (קוד שגיאה: " + (status || 'Unknown') + ")");
    }
  }
}
