const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors")({ origin: true });

// Firebase Secret Manager에 숨겨둔 키를 불러옵니다.
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.askGemini = onRequest({ secrets: [geminiApiKey], cors: true }, async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        try {
            const { prompt } = req.body;
            
            // 보안 금고에서 키드 꺼내기
            const apiKey = geminiApiKey.value();
            const genAI = new GoogleGenerativeAI(apiKey);
            
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // 시스템 프롬프트 (AI 역할 부여)
            const systemPrompt = `당신은 '제로메디컬'의 친절한 온라인 CS 전문가입니다.
사용자는 기존 버튼 트리에서 원하는 것을 찾지 못했거나, 추가적인 질문이 있어서 이곳으로 넘어왔습니다.
제로메디컬은 전동 휠체어, 수동 휠체어, 전동 침대 등 의료기기를 취급합니다.
친절하고 전문적인 말투로, 사용자의 궁금증을 해결해 주세요. 답변은 가급적 짧고 핵심만 간결하게 설명합니다.`;

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
