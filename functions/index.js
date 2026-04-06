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
            const systemPrompt = `당신은 '제로메디컬'의 고객 지원 챗봇입니다.
현재 학습된 자료가 제한적이므로 무리하게 완벽한 해결책을 제시하려 하지 마세요.

당신의 "가장 중요하고 유일한 목표"는 고객이 겪고 있는 [문제가 정확히 무엇인지 파악하고 필터링]하는 것입니다. 
이를 통해 담당자가 전화 상담으로 문제를 진단하는 시간을 단축하는 것이 핵심 목적입니다.

[행동 지침]
1. 고객의 문의를 확인하세요. 증상이나 문제가 모호하다면 간단한 추가 질문을 통해 '문제가 무엇인지'만 정확하게 확인하세요.
2. 문제가 파악되었다면, "해당 부분은 제로메디컬 담당자가 직접 확인 후 자세하게 안내해 드리겠습니다."라고 답변하며 마무리지으세요.
3. 아래의 [모범 응대 사례]에 완벽하게 들어맞는 단순 문의가 있다면 해당 사례를 참고하여 안내하되, 그 외에는 무조건 문제 상황을 정리한 후 담당자 인계로 유도하세요.
친절하고 긍정적인 말투를 유지하세요.
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
