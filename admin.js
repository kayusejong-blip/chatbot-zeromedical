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
}

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
    if (event) {
        document.querySelectorAll('.menu a').forEach(el => el.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    
    currentTab = tab;
    
    if (tab === 'sessions') {
        document.getElementById('view-sessions').style.display = 'flex';
        document.getElementById('view-videos').style.display = 'none';
        document.getElementById('page-title').textContent = '실시간 관리자 대시보드';
        renderSessionList();
    } else if (tab === 'videos') {
        document.getElementById('view-sessions').style.display = 'none';
        document.getElementById('view-videos').style.display = 'flex';
        document.getElementById('page-title').textContent = '영상 가이드 링크 관리';
        loadVideos();
    }
}

// ----------------- 영상 매핑 로직 ----------------- 
function loadVideos() {
    const container = document.getElementById('video-list-container');
    container.innerHTML = '';
    
    let customLinks = JSON.parse(localStorage.getItem('customVideoLinks') || '{}');
    
    // 버튼 경로 추적 BFS/DFS
    let nodeMap = {
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

    let paths = {};
    function traverse(nodeId, currentPath) {
        const node = nodeMap[nodeId];
        if (!node || !node.options) return;
        node.options.forEach(opt => {
            let label = opt.label.replace(/[🛞🪑🦽🔒]/g, "").trim();
            let newPath = currentPath ? currentPath + " > " + label : label;
            
            if (opt.video_key) {
                if (!paths[opt.video_key]) paths[opt.video_key] = [];
                paths[opt.video_key].push(newPath);
            }
            if (opt.next && nodeMap[opt.next]) {
                traverse(opt.next, newPath);
            }
        });
    }
    traverse("L1", "");

    // 영상 리스트 렌더링
    chatDataRaw.video_db.videos.forEach(video => {
        let currentUrl = customLinks[video.key] !== undefined ? customLinks[video.key] : video.url;
        let triggers = paths[video.key] || ["단독 연결 (트리 직접 참조 없음)"];
        
        let card = document.createElement('div');
        card.className = 'video-card';
        
        let triggersHtml = triggers.map(t => `<div class="trigger-path">📍 ${t}</div>`).join("");

        card.innerHTML = `
            <div class="video-info">
                <h4>${video.title}</h4>
                <div class="paths-container">${triggersHtml}</div>
            </div>
            <div class="video-action">
                <input type="text" id="url-${video.key}" value="${currentUrl}" placeholder="https://youtube.com/...">
                <button onclick="saveVideoUrl('${video.key}')">저장</button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.saveVideoUrl = function(key) {
    let customLinks = JSON.parse(localStorage.getItem('customVideoLinks') || '{}');
    let inputUrl = document.getElementById(`url-${key}`).value.trim();
    customLinks[key] = inputUrl;
    localStorage.setItem('customVideoLinks', JSON.stringify(customLinks));
    
    // 버튼 시각효과
    const btn = event.currentTarget;
    btn.textContent = "저장완료!";
    btn.style.background = "#059669";
    setTimeout(() => {
        btn.textContent = "저장";
        btn.style.background = "var(--primary)";
    }, 1500);
}
