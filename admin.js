let allSessions = [];

function loadSessionsFromFirebase() {
    db.ref('sessions').orderByChild("timestamp").on('value', snapshot => {
        let data = snapshot.val();
        if (data) {
            // 객체를 배열로 변환하고 최신순(작성 시간이 큰 순서) 정렬 처리
            // timestamp가 없을 수 있으므로 예외처리 포함
            allSessions = Object.values(data).sort((a, b) => {
                let ta = a.timestamp || 0;
                let tb = b.timestamp || 0;
                return tb - ta;
            });
        } else {
            allSessions = [];
        }
        
        if (currentTab === 'sessions') {
            renderSessionList();
            
            // 현재 선택된 세션이 있다면 디테일 뷰도 업데이트 (동기화)
            if (currentSelectedSessionId) {
                let s = allSessions.find(s => s.sessionId === currentSelectedSessionId);
                if (s) showSessionDetail(s);
            }
        }
    });

    // 트리 설정도 로드
    db.ref('settings/responses').on('value', snapshot => {
        responseSettings = snapshot.val() || {};
        if (currentTab === 'videos') {
            loadVideos();
        }
    });
}

let responseSettings = {};

function renderSessionList() {
    document.getElementById('total-sessions').textContent = `총 세션: ${allSessions.length}`;
    
    const listContainer = document.getElementById('session-list');
    listContainer.innerHTML = '';

    if (allSessions.length === 0) {
        listContainer.innerHTML = '<li style="padding: 20px; text-align: center; color: #6B7280;">채팅 내역이 없습니다.</li>';
        return;
    }

    allSessions.forEach(session => {
        const li = document.createElement('li');
        li.className = 'session-item';
        
        let badgeClass = 'ongoing';
        if (session.status === '해결 완료') badgeClass = 'resolved';
        else if (session.status === '상담원 연결 요망') badgeClass = 'escalated';

        let msgs = session.messages ? Object.values(session.messages) : [];
        li.innerHTML = `
            <span class="session-id">${session.sessionId}</span>
            <div class="session-meta">
                <span>${session.date} (${msgs.length}개의 대화)</span>
                <span class="badge ${badgeClass}">${session.status}</span>
            </div>
        `;

        li.onclick = () => {
            // Remove active class from all
            document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            
            showSessionDetail(session);
        };
        
        // 현재 선택된 항목 표시 유지
        if (session.sessionId === currentSelectedSessionId) {
            li.classList.add('active');
        }

        listContainer.appendChild(li);
    });
}

let currentSelectedSessionId = null;

function showSessionDetail(session) {
    currentSelectedSessionId = session.sessionId;
    const adminReplyContainer = document.getElementById('admin-reply-container');
    if (adminReplyContainer) {
        adminReplyContainer.style.display = 'block';
    }

    const headerTitle = document.querySelector('#detail-header h3');
    const headerStatus = document.getElementById('detail-status');
    const messagesContainer = document.getElementById('detail-messages');

    headerTitle.textContent = `대화 상세: ${session.sessionId}`;
    
    headerStatus.style.display = 'inline-block';
    headerStatus.className = 'badge';
    if (session.status === '진행 중...') headerStatus.classList.add('ongoing');
    else if (session.status === '해결 완료') headerStatus.classList.add('resolved');
    else headerStatus.classList.add('escalated');
    headerStatus.textContent = session.status;

    messagesContainer.innerHTML = '';

    let msgs = session.messages ? Object.values(session.messages) : [];

    if (msgs.length === 0) {
        messagesContainer.innerHTML = '<div class="empty-state"><p>대화 내용이 존재하지 않습니다.</p></div>';
        return;
    }

    msgs.forEach(msg => {
        const div = document.createElement('div');
        div.className = `detail-msg ${msg.sender}`;
        
        let contentHtml = `<div class="msg-content">${msg.text}</div>`;
        if (msg.attachment) {
            if (msg.attachment.type.startsWith('image/')) {
                contentHtml += `<div class="msg-attachment" style="margin-top: 10px;">
                    <a href="${msg.attachment.data}" download="${msg.attachment.name}">
                        <img src="${msg.attachment.data}" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" title="클릭시 원본 다운로드">
                    </a>
                </div>`;
            } else if (msg.attachment.type.startsWith('video/')) {
                contentHtml += `<div class="msg-attachment" style="margin-top: 10px;">
                    <video controls src="${msg.attachment.data}" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 1px solid var(--border-color);"></video>
                    <div style="margin-top: 5px; text-align: right;">
                        <a href="${msg.attachment.data}" download="${msg.attachment.name}" style="font-size: 0.8rem; color: var(--primary); text-decoration: underline; font-weight: 600;">📥 영상 다운로드</a>
                    </div>
                </div>`;
            }
        }

        div.innerHTML = `
            ${contentHtml}
            <span class="msg-time">${msg.time}</span>
        `;
        messagesContainer.appendChild(div);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 초기화
window.onload = () => {
    loadSessionsFromFirebase();
};

// 실시간 관리자 개입 전송 함수
window.sendAdminReply = function() {
    if (!currentSelectedSessionId) return;
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();
    if (!text) return;
    
    // Firebase 업데이트: 메시지 추가 & 상태 변경
    let newRef = db.ref('sessions/' + currentSelectedSessionId + '/messages').push();
    newRef.set({
        id: newRef.key,
        sender: "admin",
        text: text,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }).then(() => {
        // 상태를 관리자 개입으로 변경 
        db.ref('sessions/' + currentSelectedSessionId).update({
             status: "관리자 직접 개입",
             timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        input.value = '';
    }).catch(e => {
         console.error(e);
         alert("전송 실패");
    });
};

// 탭 스위칭 로직
let currentTab = 'sessions';
function switchTab(tab, event) {
    if (event) event.preventDefault();
    currentTab = tab;
    // 모든 탭 컨텐츠 숨기기
    document.getElementById('view-sessions').style.display = 'none';
    document.getElementById('view-videos').style.display = 'none';
    document.getElementById('view-changelog').style.display = 'none';
    
    // 메뉴 액티브 상태 초기화
    document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');
    
    if (tab === 'sessions') {
        document.getElementById('view-sessions').style.display = 'flex';
        document.getElementById('page-title').textContent = '실시간 관리자 대시보드';
        renderSessionList();
    } else if (tab === 'videos') {
        document.getElementById('view-videos').style.display = 'flex';
        document.getElementById('page-title').textContent = '버튼 트리 맞춤 답변 관리';
        loadVideos();
    } else if (tab === 'changelog') {
        document.getElementById('view-changelog').style.display = 'block';
        document.getElementById('page-title').textContent = '버전 업데이트 창고';
    }
}

// ----------------- 버튼 트리 맞춤 답변 로직 ----------------- 
function loadVideos() {
    const container = document.getElementById('video-list-container');
    container.innerHTML = '';
    
    // 버튼 경로 추적 BFS/DFS (동적 노드 파싱)
    let nodeMap = chatDataRaw.nodes;
    let leafNodes = [];

    function traverse(nodeId, currentPath) {
        const node = nodeMap[nodeId];
        if (!node || !node.options) return;
        node.options.forEach(opt => {
            // 이모지 필터링
            let label = opt.label.replace(/[🛞🪑🦽🔒📦🔄📄⚠️🛠️🔌🔊🔩💬👍👎📸🖼️]/g, "").trim();
            let newPath = currentPath ? currentPath + " > " + label : label;
            
            // 만약 다음 노드가 액션 노드(Leaf)에 도달한다면 리스트에 추가
            if (["VIDEO", "REQUEST_VIDEO", "ESCALATE_CHAT", "ESCALATE_CALL"].includes(opt.next)) {
                leafNodes.push({
                    id: opt.id,
                    path: newPath,
                    defaultKey: opt.video_key || null,
                    nextAction: opt.next
                });
            } else if (nodeMap[opt.next]) {
                traverse(opt.next, newPath);
            }
        });
    }
    
    if (nodeMap["START"]) {
        traverse("START", "");
    } else if (chatDataRaw.layer1_classification) {
        // Fallback for older version
        nodeMap = {
            "L1": chatDataRaw.layer1_classification,
            "L2_PRE": chatDataRaw.layer2.pre_purchase,
            "L2_USE": chatDataRaw.layer2.in_use,
            "L2_AS": chatDataRaw.layer2.after_service,
            "L3_BRAKE": chatDataRaw.layer3_diagnosis.brake.step1,
            "L3_WHEEL": chatDataRaw.layer3_diagnosis.wheel,
            "L3_SEAT": chatDataRaw.layer3_diagnosis.seat,
            "L3_FRAME": chatDataRaw.layer3_diagnosis.frame,
            "L3_FOOTREST": chatDataRaw.layer3_diagnosis.footrest,
            "L3_ARMREST": chatDataRaw.layer3_diagnosis.armrest,
            "L3_BRAKE_USER_SYMPTOM": chatDataRaw.layer3_diagnosis.brake.step2_user,
            "L3_BRAKE_CARER_SYMPTOM": chatDataRaw.layer3_diagnosis.brake.step2_carer
        };
        traverse("L1", "");
    }

    // 트리 리스트 렌더링 (재귀적 딥 트리 구조)
    // 1. Build generic tree from leaf paths
    let tree = {};
    leafNodes.forEach(leaf => {
        let parts = leaf.path.split(" > ");
        let current = tree;
        for(let i=0; i<parts.length; i++) {
            let part = parts[i];
            if (i === parts.length - 1) {
                if(!current[part]) current[part] = {};
                current[part]._leaf = leaf; // 마지막 노드는 _leaf 속성을 갖도록
            } else {
                if(!current[part]) current[part] = {};
                current = current[part];
            }
        }
    });

    // 2. Recursive renderer
    function renderTreeUI(nodeObj, depth) {
        let wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.width = '100%';

        Object.keys(nodeObj).forEach(key => {
            if (key === '_leaf') return; // 내부 마커 스킵
            
            let childObj = nodeObj[key];
            
            if (childObj._leaf) {
                // 단말 노드 (최하위 카드 렌더링)
                let leaf = childObj._leaf;
                let savedData = responseSettings[leaf.id] || {};
                let currentUrl = savedData.url || "";
                let currentText = savedData.text || "";
                
                let card = document.createElement('div');
                card.className = 'video-card';
                card.style = "background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; align-items: flex-start; flex-direction: column; gap: 15px; margin-bottom: 10px;";

                let actionBadge = "";
                if(leaf.nextAction === "VIDEO") actionBadge = `<span style="background:#818cf8; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem;">영상 제공 액션</span>`;
                if(leaf.nextAction === "REQUEST_VIDEO") actionBadge = `<span style="background:#fb923c; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem;">미디어 요청 액션</span>`;
                if(leaf.nextAction.includes("ESCALATE")) actionBadge = `<span style="background:#f87171; color:white; padding:2px 6px; border-radius:4px; font-size:0.75rem;">상담원 연결 액션</span>`;

                card.innerHTML = `
                    <div style="width:100%; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; padding-bottom:10px;">
                        <div style="font-weight:600; color:#374151;">📍 최종 도착: ${key}</div>
                        ${actionBadge}
                    </div>
                    
                    <div style="width:100%; display:flex; flex-direction:column; gap:10px;">
                        <label style="font-size:0.85rem; font-weight:600; color:#4b5563;">커스텀 텍스트 답변 (기본 답변 대신 출력될 내용)</label>
                        <textarea id="text-${leaf.id}" placeholder="해당 항목 선택시 보여줄 상세한 텍스트 답변을 다채롭게 입력하세요..." style="width:100%; height:80px; padding:10px; border-radius:8px; border:1px solid #d1d5db; resize:vertical; font-family:inherit;">${currentText}</textarea>
                        <div style="display:flex; justify-content:flex-end;">
                            <button onclick="saveTreeText('${leaf.id}', this)" style="background:#4b5563; color:white; border:none; border-radius:6px; padding:8px 16px; font-weight:600; cursor:pointer;">텍스트만 따로 저장</button>
                        </div>
                    </div>
                    
                    <div style="width:100%; display:flex; flex-direction:column; gap:10px; margin-top:5px; padding-top:15px; border-top:1px dashed #d1d5db;">
                        <label style="font-size:0.85rem; font-weight:600; color:#4b5563;">추가 영상 링크 (URL)</label>
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="url-${leaf.id}" value="${currentUrl}" placeholder="https://youtube.com/... (또는 외부 링크)" style="flex:1; padding:10px; border-radius:8px; border:1px solid #d1d5db;">
                            <button onclick="saveTreeUrl('${leaf.id}', this)" style="background:var(--primary); color:white; border:none; border-radius:8px; padding:0 20px; font-weight:600; cursor:pointer;">링크 저장</button>
                        </div>
                    </div>
                `;
                wrapper.appendChild(card);
            } else {
                // 폴더 노드 (토글)
                let details = document.createElement('details');
                details.style = `margin-bottom: 8px; border: 1px solid #d1d5db; border-radius: 8px; background: ${depth % 2 === 0 ? '#ffffff' : '#f9fafb'}; overflow: hidden;`;
                
                let summary = document.createElement('summary');
                summary.style = `background: ${depth === 0 ? '#f3f4f6' : 'transparent'}; padding: ${depth === 0 ? '15px 20px' : '12px 15px'}; font-weight: ${depth === 0 ? 'bold' : '600'}; font-size: ${depth === 0 ? '1.1rem' : '0.95rem'}; cursor: pointer; border-bottom: ${depth === 0 ? '1px solid #e5e7eb' : 'none'}; list-style: none; display: flex; align-items: center; gap: 8px; color: #374151; transition: 0.2s;`;
                summary.innerHTML = `<span style="font-size:0.75rem; color:#9ca3af; transform: rotate(0deg); display:inline-block; transition: 0.2s;">▶</span> <span>${depth === 0 ? '📁' : '📂'} ${key}</span>`;
                
                details.addEventListener('toggle', (e) => {
                    let arrow = summary.querySelector('span');
                    if(details.open) arrow.style.transform = 'rotate(90deg)';
                    else arrow.style.transform = 'rotate(0deg)';
                });

                details.appendChild(summary);

                let contentWrap = document.createElement('div');
                contentWrap.style = `padding: 10px 15px 15px 15px; display: flex; flex-direction: column; border-left: 2px dashed #d1d5db; margin-left: 20px; margin-top: 5px;`;
                
                let childNodes = renderTreeUI(childObj, depth + 1);
                contentWrap.appendChild(childNodes);
                details.appendChild(contentWrap);
                wrapper.appendChild(details);
            }
        });
        return wrapper;
    }

    container.appendChild(renderTreeUI(tree, 0));
}

window.saveTreeText = function(id, btn) {
    let inputText = document.getElementById(`text-${id}`).value.trim();
    db.ref('settings/responses/' + id + '/text').set(inputText).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "저장완료!";
        btn.style.background = "#059669";
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "#4b5563";
        }, 1500);
    }).catch(e => {
        console.error(e);
        alert("텍스트 설정 저장 실패!");
    });
}

window.saveTreeUrl = function(id, btn) {
    let inputUrl = document.getElementById(`url-${id}`).value.trim();
    db.ref('settings/responses/' + id + '/url').set(inputUrl).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "저장완료!";
        btn.style.background = "#059669";
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "var(--primary)";
        }, 1500);
    }).catch(e => {
        console.error(e);
        alert("링크 설정 저장 실패!");
    });
}
