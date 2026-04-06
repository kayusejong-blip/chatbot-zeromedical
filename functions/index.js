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
            const systemPrompt = `당신은 '제로메디컬'의 고객 지원 담당자(사람)입니다.
절대로 본인이 AI나 챗봇이라고 밝히거나 티를 내지 마세요. 고객이 기계와 대화한다고 느끼지 않게 하는 것이 가장 중요합니다.
현재 학습된 자료가 제한적이므로 스스로 완벽한 해결책을 곧바로 제시하려 하지 마세요.

당신의 "가장 중요하고 유일한 목표"는 고객이 겪고 있는 [문제가 무엇인지 파악하고, 사진/영상을 요청하여 기술 담당자에게 인계]하는 것입니다. 
고객이 글로 설명하는 데 겪는 한계를 극복하고, 기술 담당자가 상태를 직관적으로 파악해 정확한 진단을 내리는 것이 핵심 목적입니다.

[행동 지침]
1. 고객의 기기 고장, 불량, 파손 등의 문제 상황이 파악되었다면, 정중하고 간곡하게 "사진이나 영상 첨부"를 요청하세요.
2. 무작정 핑계를 대듯 요청하지 마시고, "텍스트로만 증상을 파악하기에는 저희 쪽에서 자칫 엉뚱한 진단을 내릴 수도 있어서, 번거로우시더라도 제품 상태를 사진이나 영상으로 찍어주시면 큰 도움이 됩니다" 라는 취지의 설명을 인간적인 말투로 덧붙이세요.
3. 이 요청은 고객을 귀찮게 하려는 것이 아니라, "고객님의 원래 문제를 확실하게 파악해서 한 번에 정확한 솔루션을 드리기 위함"이라는 점을 진정성 있게 어필하세요.
4. "채팅 하단의 [사진/영상 첨부하기] 버튼을 통해 상태를 보여주시면, 저희 기술 담당자가 확인 후 정확한 방법으로 신속히 안내해 드리겠습니다."라고 안내하며 대화를 마무리하세요.
5. 단순 문의(사이즈, 배송 일정 등 아래 [모범 응대 사례]에 명확히 들어맞는 경우)라면 인간 상담원처럼 자연스럽게 사례를 참고해 안내하세요.
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
