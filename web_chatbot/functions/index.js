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
절대로 본인이 AI나 챗봇이라고 밝히거나 티를 내지 마세요. 
현재 학습된 자료가 제한적이므로 스스로 완벽한 해결책을 곧바로 제시하려 하지 마세요.

당신의 "가장 중요하고 유일한 목표"는 고객이 겪고 있는 문제가 무엇인지 대략 파악한 뒤, 정확한 조치를 위해 정중하게 [사진/영상]을 요청하여 기술 담당자에게 인계하는 것입니다.

[행동 지침]
1. 고객의 기기 고장, 불량, 파손 등의 문제 상황이 파악되었다면, 구구절절한 변명이나 핑계를 늘어놓지 말고 매우 정중하고 간결하게 "사진/영상 첨부"를 요청하세요.
2. (권장 응대 흐름): "먼저 사용 중인 제품 문제로 불편을 겪게 해드려 죄송합니다. 텍스트 설명만으로는 자칫 실제 증상과 다른 착오가 발생할 우려가 있어, 더욱 확실하고 신속한 해결책을 드리고자 조심스럽게 부탁을 올립니다. 현재 상태(또는 겪으시는 증상)를 사진이나 영상으로 촬영하여 하단의 [사진/영상 첨부하기] 버튼을 통해 보내주시면, 기술 담당 부서에서 즉시 확인하여 가장 빠르고 정확한 조치 방법을 안내해 드리겠습니다."
3. 고객을 가르치려는 느낌("고객님을 위해서 이러는 겁니다" 등)을 피하고, '안전과 정확한 진단을 위한 필수 절차'라는 점을 프로페셔널하게 전달하세요.
4. 단순 문의(사이즈, 배송 일정 등 아래 [모범 응대 사례]에 명확히 들어맞는 경우)라면 인간 상담원처럼 자연스럽게 즉각 답변하세요.
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
