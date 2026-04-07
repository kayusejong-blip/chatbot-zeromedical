let chatData = null;
let currentSessionId = 'CS-' + Date.now(); // 현재 세션 ID 생성
let chatHistory = []; // 현재 채팅 내역 저장 배열
let nodeHistory = []; // 뒤로 가기 추적 배열
let currentNode = null; // 현재 노드 추적 변수
let nextTimeout = null; // 자동 이동 타이머 추적
let currentSessionStatus = ""; // 서버(Firebase)와 동기화되는 상태
let treeResponses = {}; // Firebase에서 동기화되는 커스텀 트리 응답 데이터

// ===== Gemini AI 연동 설정 =====
const GEMINI_FUNCTION_URL = "https://us-central1-zero-medical-cs-260406.cloudfunctions.net/askGemini";
let isAiProcessing = false; // AI 응답 대기 중 중복 요청 방지

function initChat() {
    try {
        // data.js 스크립트로 불러온 전역 변수를 바로 참조
        chatData = chatDataRaw;
        
        // 초기 세션 상태 설정 (Firebase)
        saveSessionToStorage("진행 중...");
        
        // Firebase 실시간 관리자 동기화 시작
        initFirebaseSync();
        
        startFlow();
    } catch (e) {
        console.error("데이터 로드 실패", e);
        addMessage("챗봇 데이터를 불러올 수 없습니다. 경로를 확인해주세요.", "bot");
    }
}

function initFirebaseSync() {
    // 메시지 수신 (관리자가 보낸 메시지만 렌더링)
    db.ref('sessions/' + currentSessionId + '/messages').on('child_added', snapshot => {
        let msg = snapshot.val();
        if (!chatHistory.some(m => m.id === msg.id)) {
            chatHistory.push(msg); // 로컬 기록 동기화
            
            if (msg.sender === 'admin') {
                const container = document.getElementById("chat-messages");
                const msgDiv = document.createElement("div");
                msgDiv.className = `message admin-message`;
                msgDiv.innerHTML = `<strong>👨‍💻 관리자</strong><br>` + msg.text; 
                container.appendChild(msgDiv);
                
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    });

    // 상태 동기화 (관리자 개입 여부 파악)
    db.ref('sessions/' + currentSessionId).on('value', snapshot => {
         let data = snapshot.val();
         if(data && data.status) {
             currentSessionStatus = data.status;
         }
    });

    // 커스텀 답변 트리 설정 동기화
    db.ref('settings/responses').on('value', snapshot => {
         treeResponses = snapshot.val() || {};
    });
}

function startFlow() {
    nodeHistory = [];
    currentNode = null;
    const startNode = chatData.nodes["START"];
    if (!startNode && chatData.layer1_classification) {
         // fallback
         handleNode(chatData.layer1_classification);
    } else {
         handleNode(startNode);
    }
}

function handleNode(node, isBack = false) {
    if (!node) return;
    
    currentNode = node;

    let displayMessage = node.message;
    // 커스텀 텍스트 덮어쓰기 로직
    if (node.triggerId && treeResponses[node.triggerId] && treeResponses[node.triggerId].text) {
        displayMessage = treeResponses[node.triggerId].text;
    }

    if (displayMessage && node.type !== "video_solution" && node.type !== "send_video_link") {
        // request_customer_video 타입일 때 가이드 내용 추가
        if (node.type === "request_customer_video" && node.guide) {
            let msg = displayMessage.replace(/\n/g, '<br>') + "<br><br><strong>[📹 촬영 가이드]</strong><ul class='guide-list'>";
            node.guide.instructions.forEach(inst => {
                msg += `<li>${inst}</li>`;
            });
            msg += "</ul>";
            addMessage(msg, "bot");
        } else {
            addMessage(displayMessage.replace(/\n/g, '<br>'), "bot");
        }
    }
    
    if (node.type === "button_select" && node.options) {
        showOptions(node.options);
    } 
    // 액션 노드 처리
    else if (node.type === "video_solution" || node.type === "send_video_link") {
        let defaultTitle = "추천 영상";
        let targetUrl = "";
        
        if (node.video_key) {
            // video_db가 없으므로 생략 또는 기본 로직 유지
            if(chatData.video_db && chatData.video_db.videos) {
                const videoInfo = chatData.video_db.videos.find(v => v.key === node.video_key);
                if (videoInfo) defaultTitle = videoInfo.title;
            }
        }

        // Firebase 커스텀 트리 응답 덮어쓰기 로직
        // node.triggerId는 handleNext()에서 전달해준 현재 리프의 ID입니다. (예: L2_PRE_SPEC)
        let customText = null;
        if (node.triggerId && treeResponses[node.triggerId]) {
            let customResponse = treeResponses[node.triggerId];
            if (customResponse.url && customResponse.url.trim() !== "") {
                targetUrl = customResponse.url;
            }
            if (customResponse.text && customResponse.text.trim() !== "") {
                customText = customResponse.text;
            }
        }

        let videoHtml = "";
        // 커스텀 텍스트가 있으면 무조건 그것을 기본 본문으로 사용
        if (customText) {
            videoHtml += customText.replace(/\n/g, '<br>') + "<br><br>";
        } else {
            videoHtml += `아래 영상을 참고해서 점검해 보세요 😊<br><br>`;
        }

        if (targetUrl && targetUrl.trim() !== "") {
            videoHtml += `<strong>[${defaultTitle}]</strong><br><a href="${targetUrl}" target="_blank" class="video-link" style="background:#ef4444; border-color:#dc2626;">📺 유튜브/가이드 영상 시청하기 (새창)</a><br><br>도움이 되셨나요?`;
        } else {
            // URL이 없고 커스텀 텍스트도 없으면 기존 로직(준비중)
            if (!customText) {
                videoHtml += `<strong>[${defaultTitle}]</strong><br><a href="#" class="video-link" style="background:#6B7280; border-color:#4B5563;" onclick="event.preventDefault(); alert('영상이 아직 준비되지 않았습니다.\\n(관리자 모드에서 링크를 매핑해 주세요)');">🚫 스마트 가이드 준비중</a><br><br>영상대로 해결되셨나요?`;
            } else {
                // URL은 없고 커스텀 텍스트만 있다면
                videoHtml += `도움이 되셨나요?`;
            }
        }
        
        nextTimeout = setTimeout(() => {
            addMessage(videoHtml, "bot");
            // 기존 follow_up.options 거나 현재 node.options 활용
            let opts = (node.follow_up && node.follow_up.options) ? node.follow_up.options : node.options;
            if (opts) {
                showOptions(opts);
            }
        }, 800);
    } 
    else if (node.type === "media_request" || node.type === "request_customer_video") {

        let opts = node.options || [
            { label: "📷 사진/영상 첨부하기", action: "UPLOAD" }
        ];
        showOptions(opts);
    }
    else if (node.type === "escalate" || node.type === "escalate_call" || node.type === "end") {

        saveSessionToStorage(node.type === "end" ? "해결 완료" : "상담원 연결 요망");

        // 여기서 직접 버튼을 렌더링하는 대신 빈 배열로 showOptions()를 호출하면, 범용 로직에 의해 '홈/이전' 버튼이 자동으로 달립니다.
        // escalate는 최종 목적지 중 하나이므로, node.options가 있다면 그것을, 없다면 빈 배열을 보내어 하단의 fallback이 그려지게 합니다.
        if (node.options && node.options.length > 0) {
            showOptions(node.options);
        } else {
            showOptions([]); 
        }

        if (node.next) {
            nextTimeout = setTimeout(() => handleNext(node.next), 1500);
        }
    } 
    else if (node.next) {
        handleNext(node.next);
    }
}

function handleNext(nextId, videoKey = null, triggerId = null) {
    if (nextTimeout) clearTimeout(nextTimeout);
    
    if (!nextId) return;

    if (nextId === "RESTART") {
        startFlow();
        return;
    }

    let targetNode = null;

    if (chatData.nodes && chatData.nodes[nextId]) {
        targetNode = Object.assign({}, chatData.nodes[nextId]);
        targetNode.triggerId = triggerId;
        if (videoKey && targetNode.id === "VIDEO") {
            targetNode.video_key = videoKey;
        }
    } else if (chatData.actions && chatData.actions[nextId]) {
        targetNode = Object.assign({}, chatData.actions[nextId]); 
        targetNode.triggerId = triggerId;
        if (videoKey && targetNode.id === "VIDEO") {
            targetNode.video_key = videoKey; 
        }
    }

    if (targetNode) {
        setTimeout(() => handleNode(targetNode), 600); // 사용자 입력 후 살짝 딜레이
    } else {
        console.error("다음 노드를 찾을 수 없습니다:", nextId);
    }
}

function showOptions(options) {
    const container = document.getElementById("options-container");
    container.innerHTML = "";
    
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        
        let html = `<span>${opt.label}</span>`;
        if (opt.description) {
            html += `<span class="btn-desc">${opt.description}</span>`;
        }
        btn.innerHTML = html;
        
        btn.onclick = () => {
            if (nextTimeout) clearTimeout(nextTimeout);
            
            // 파일 업로드 액션인 경우
            if (opt.action === "UPLOAD") {
                document.getElementById('media-upload').click();
                return;
            }
            
            // 추가 질문하기 액션 (입력창 포커스)
            if (opt.action === "FOCUS_INPUT") {
                container.innerHTML = "";
                document.getElementById("user-free-text").focus();
                return;
            }

            // 현재 노드를 히스토리에 푸시 (뒤로가기 용)
            if (opt.next !== "RESTART") {
                nodeHistory.push(currentNode);
            }
            
            container.innerHTML = ""; // 옵션 지우기
            // 사용자 응답 메시지 표시
            addMessage(opt.label, "user");
            
            // 다음 흐름 처리 (opt.id를 triggerId로 추가 전달!)
            handleNext(opt.next, opt.video_key, opt.id);
        };
        container.appendChild(btn);
    });

    // 항목에 없는 내용을 위한 폴백 안전 장치 버튼 (업로드나 재시작 액션이 없는 경우 항상 노출)
    const hasRestartOrUpload = options.some(opt => opt.next === "RESTART" || opt.action === "UPLOAD");
    if (options.length > 0 && !hasRestartOrUpload) {
        const fallbackBtn = document.createElement("button");
        fallbackBtn.className = "option-btn fallback-btn";
        fallbackBtn.innerHTML = `<span>🤷 찾는 항목이 없어요 (기타 문의)</span><span class="btn-desc">원하는 선택지가 없다면 여기를 눌러 직접 문의하세요.</span>`;
        // 폴백 전용 미세한 스타일 적용 (인라인 혹은 CSS 클래스로 확장 가능)
        fallbackBtn.style.border = "1px solid #10B981";
        fallbackBtn.style.backgroundColor = "#F0FDF4";
        fallbackBtn.style.color = "#047857";
        
        fallbackBtn.onclick = () => {
            if (nextTimeout) clearTimeout(nextTimeout);
            
            nodeHistory.push(currentNode);
            
            container.innerHTML = ""; // 옵션 지우기
            addMessage("찾는 항목이 없어요 (기타 문의)", "user");
            
            let fallbackMsg = "✅ 찾으시는 항목이 없으신가요?<br><br>화면 하단의 최하단 <strong>채팅 입력창</strong>에 겪고 계신 문제나 문의사항을 텍스트로 자세히 적어주시거나, 아래 버튼을 눌러 문제가 되는 부분의 <strong>사진/영상</strong>을 첨부해주세요.<br><br>상담원이 신속하게 확인 후 안내해 드리겠습니다. 🧑‍⚕️";
            
            setTimeout(() => {
                addMessage(fallbackMsg, "bot");
                saveSessionToStorage("기타 문의 접수 됨 (상담 연결 요망)");
                showOptions([
                    { label: "📷 문의 관련 사진/영상 첨부하기", action: "UPLOAD" },
                    { label: "🔄 처음으로 돌아가기", next: "RESTART" }
                ]);
            }, 800);
        };
        container.appendChild(fallbackBtn);
    }

    // 뒤로 가기 / 처음으로 가기 버튼 그룹 추가
    const hasRestart = options.some(opt => opt.next === "RESTART");
    if (nodeHistory.length > 0) {
        // 처음으로 가기 버튼
        if (!hasRestart) {
            const homeBtn = document.createElement("button");
            homeBtn.className = "option-btn home-btn";
            homeBtn.innerHTML = `<span>🏠 처음 화면으로 돌아가기</span>`;
            homeBtn.style.backgroundColor = "#F9FAFB";
            homeBtn.style.color = "#4B5563";
            homeBtn.style.border = "1px solid #D1D5DB";
            
            homeBtn.onclick = () => {
                if (nextTimeout) clearTimeout(nextTimeout);
                container.innerHTML = "";
                addMessage("처음으로 돌아가기", "user");
                setTimeout(() => {
                    startFlow();
                }, 300);
            };
            container.appendChild(homeBtn);
        }

        // 이전으로 가기 버튼
        const backBtn = document.createElement("button");
        backBtn.className = "option-btn back-btn";
        backBtn.innerHTML = `<span>⬅️ 이전 단계로 가기</span>`;
        backBtn.style.backgroundColor = "#F9FAFB";
        backBtn.style.color = "#4B5563";
        backBtn.style.border = "1px solid #D1D5DB";
        
        backBtn.onclick = () => {
            if (nextTimeout) clearTimeout(nextTimeout);
            container.innerHTML = "";
            addMessage("이전 단계로", "user");
            let prevNode = nodeHistory.pop();
            setTimeout(() => {
                handleNode(prevNode, true);
            }, 300);
        };
        container.appendChild(backBtn);
    }
}

function addMessage(text, sender, textForStorage = null, attachment = null) {
    const container = document.getElementById("chat-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-message`;
    msgDiv.innerHTML = text; 
    container.appendChild(msgDiv);
    
    // 부드러운 스크롤 이동 (DOM 렌더링 후 정확한 높이 계산을 위해 미세한 지연 추가)
    setTimeout(() => {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);

    // Firebase 실시간 업데이트
    let newRef = db.ref('sessions/' + currentSessionId + '/messages').push();
    
    let newMsg = {
        id: newRef.key,
        sender: sender,
        text: textForStorage || text,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
    if (attachment) {
        newMsg.attachment = attachment;
    }

    chatHistory.push(newMsg); // 로컬에 미리 적재
    
    newRef.set(newMsg).catch(e => {
        console.error("Firebase Storage Error", e);
        alert("데이터 전송 중 오류가 발생했습니다. 파일 크기가 너무 클 수 있습니다.");
    });
}

// 파일 업로드 핸들러
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById("options-container").innerHTML = "";
    
    // UI에 "업로드 중..." 표시
    const container = document.getElementById("chat-messages");
    const placeholderId = "upload-" + Date.now();
    const msgDiv = document.createElement("div");
    msgDiv.id = placeholderId;
    msgDiv.className = `message user-message`;
    msgDiv.innerHTML = `⏳ <strong>${file.name}</strong><br>파일을 클라우드 서버에 업로드 중입니다. 창을 닫지 말아주세요...`; 
    container.appendChild(msgDiv);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });

    // Firebase Storage 업로드
    const storageRef = storage.ref('uploads/' + currentSessionId + '/' + Date.now() + '_' + file.name);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed', 
        (snapshot) => {
             // 진행률 표시
             let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
             document.getElementById(placeholderId).innerHTML = `⏳ <strong>${file.name}</strong><br>클라우드 서버에 업로드 중... (${Math.round(progress)}%)`;
        }, 
        (error) => {
             console.error("Storage upload error", error);
             document.getElementById(placeholderId).innerHTML = `❌ <strong>${file.name}</strong><br>업로드에 실패했습니다. (${error.message})`;
             setTimeout(() => { showOptions([{ label: "🔄 다시 시도 (처음으로)", next: "RESTART" }]); }, 2000);
        }, 
        () => {
             // 업로드 성공 후 다운로드 URL 가져오기
             uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                 // 기존 placeholder 삭제
                 msgDiv.remove();
                 
                 const isImage = file.type.startsWith('image/');
                 let htmlContent = `<div style="display:flex; flex-direction:column; align-items:flex-end;">
                     <span style="font-size: 0.8rem; margin-bottom: 8px; opacity: 0.9;">첨부 완료: ${file.name}</span>`;
                 
                 if (isImage) {
                     htmlContent += `<img src="${downloadURL}" style="max-width:100%; border-radius:12px; border:2px solid rgba(255,255,255,0.2);">`;
                 } else {
                     htmlContent += `<video src="${downloadURL}" controls style="max-width:100%; border-radius:12px; border:2px solid rgba(255,255,255,0.2);"></video>`;
                 }
                 htmlContent += `</div>`;
                 
                 let textForStorage = `📎 미디어 첨부 완료: ${file.name}`;
                 
                 // RTDB에 다운로드 URL 저장 (Base64 대체)
                 addMessage(htmlContent, "user", textForStorage, {
                     name: file.name,
                     type: file.type,
                     data: downloadURL
                 });
                 
                 setTimeout(() => {
                     addMessage("업로드가 완료되었습니다. 상담원이 사진/영상을 확인한 후 신속하게 연락드리겠습니다. 🛠", "bot");
                     saveSessionToStorage("첨부파일 접수 완료 / 상담 대기");
                     showOptions([{ label: "🔄 처음으로 돌아가기", next: "RESTART" }]);
                 }, 1500);
             });
        }
    );

    event.target.value = '';
}

function saveSessionToStorage(status) {
    db.ref('sessions/' + currentSessionId).update({
        sessionId: currentSessionId,
        date: new Date().toLocaleDateString('ko-KR'),
        status: status,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

// 사용자 자유 채팅(텍스트) 전송 → Gemini AI 연동
window.sendUserText = async function() {
    const input = document.getElementById("user-free-text");
    const text = input.value.trim();
    if (!text) return;
    if (isAiProcessing) return; // 중복 요청 방지
    
    input.value = '';
    input.style.height = 'auto'; // 리셋
    
    // UI 및 스토리지 업데이트 (줄바꿈 <br> 처리 반영)
    addMessage(text.replace(/\n/g, '<br>'), "user", text);
    
    // 관리자 직접 개입 중이면 AI 우회 (기존 로직 유지)
    if (currentSessionStatus === '관리자 직접 개입') {
        return;
    }
    
    // AI 응답 모드 진입
    isAiProcessing = true;
    saveSessionToStorage("상담 진행 중...");
    
    // 타이핑 인디케이터 표시
    const container = document.getElementById("chat-messages");
    const typingDiv = document.createElement("div");
    typingDiv.id = "ai-typing-indicator";
    typingDiv.className = "message bot-message typing-indicator";
    typingDiv.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span> 답변을 준비하고 있습니다...`;
    container.appendChild(typingDiv);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    
    try {
        const response = await fetch(GEMINI_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
        });
        
        // 타이핑 인디케이터 삭제
        const indicator = document.getElementById("ai-typing-indicator");
        if (indicator) indicator.remove();
        
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.reply) {
            // 마크다운 기본 변환 (볼드, 줄바꿈)
            let formatted = data.reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
            
            addMessage(formatted, "bot", data.reply);
            saveSessionToStorage("답변 완료 (추가 문의 가능)");
            
            // 후속 액션 버튼 표시
            setTimeout(() => {
                showOptions([
                    { label: "💬 추가 질문하기", action: "FOCUS_INPUT" },
                    { label: "📷 사진/영상 첨부하기", action: "UPLOAD" },
                    { label: "🧑‍💼 상담원 연결 요청", next: "ESCALATE_CHAT" },
                    { label: "🏠 처음으로 돌아가기", next: "RESTART" }
                ]);
            }, 500);
        } else {
            throw new Error("응답 데이터 없음");
        }
    } catch (error) {
        console.error("AI 응답 오류:", error);
        
        // 타이핑 인디케이터 삭제 (에러 시에도)
        const indicator = document.getElementById("ai-typing-indicator");
        if (indicator) indicator.remove();
        
        addMessage("죄송합니다. AI 응답을 가져오는 중 문제가 발생했습니다.<br>아래 버튼을 눌러 상담원에게 직접 문의해 주세요. 🙏", "bot");
        saveSessionToStorage("AI 오류 / 상담원 연결 필요");
        
        setTimeout(() => {
            showOptions([
                { label: "🧑‍💼 상담원에게 직접 연결", next: "ESCALATE_CHAT" },
                { label: "🔄 처음으로 돌아가기", next: "RESTART" }
            ]);
        }, 500);
    } finally {
        isAiProcessing = false;
    }
};

// 초기화
window.onload = initChat;
