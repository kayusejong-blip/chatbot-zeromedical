const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Firebase Admin 초기화 (RTDB 접근용)
if (!admin.apps.length) {
    admin.initializeApp();
}
const rtdb = admin.database();

// Firebase Secret Manager에 숨겨둔 키를 불러옵니다.
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.askGemini = onRequest({ secrets: [geminiApiKey], cors: true }, async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        try {
            const { prompt } = req.body;
            
            // ===== 1. 모범답변 DB에서 학습 데이터 가져오기 =====
            let knowledgeContext = "";
            try {
                const snapshot = await rtdb.ref('knowledgeBase').orderByChild('timestamp').limitToLast(100).once('value');
                const data = snapshot.val();
                if (data) {
                    const entries = Object.values(data);
                    knowledgeContext = "\n\n[참고: 아래는 과거 실제 CS 모범 응대 사례입니다. 유사 질문이면 이 내용을 우선 참고하세요]\n";
                    entries.forEach((entry, idx) => {
                        knowledgeContext += `\n사례${idx + 1})\n고객 질문: ${entry.question}\n모범 답변: ${entry.answer}\n`;
                        if (entry.category) knowledgeContext += `카테고리: ${entry.category}\n`;
                    });
                }
            } catch (dbError) {
                logger.warn("knowledgeBase 로딩 실패 (무시하고 계속):", dbError.message);
            }

            // ===== 2. 보안 금고에서 키 꺼내기 =====
            const apiKey = geminiApiKey.value();
            const genAI = new GoogleGenerativeAI(apiKey);
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            // ===== 3. 시스템 프롬프트 (AI 역할 + 학습 데이터 주입) =====
            const systemPrompt = `당신은 '제로메디컬'의 친절한 온라인 CS 전문가입니다.
사용자는 기존 버튼 트리에서 원하는 것을 찾지 못했거나, 추가적인 질문이 있어서 이곳으로 넘어왔습니다.
제로메디컬은 전동 휠체어, 수동 휠체어, 전동 침대 등 의료기기를 취급합니다.
친절하고 전문적인 말투로, 사용자의 궁금증을 해결해 주세요. 답변은 가급적 짧고 핵심만 간결하게 설명합니다.
${knowledgeContext}`;

            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + "\n\n사용자 문의: " + prompt }] }
                ]
            });

            const responseText = result.response.text();
            
            res.status(200).json({ reply: responseText });
        } catch (error) {
            logger.error("Error asking Gemini:", error);
            res.status(500).json({ error: "Failed to get response from Gemini." });
        }
    });
});
