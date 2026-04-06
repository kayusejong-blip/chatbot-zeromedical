const chatDataRaw = {
  "system": "제로메디컬 고객문의 챗봇",
  "version": "2.0",
  "description": "온라인 쇼핑몰 통합 CS 모델 (배송, 반품, 교환, 사용안내, A/S)",

  "entry_channels": [
    "카카오채널",
    "홈페이지",
    "네이버톡톡",
    "알림톡"
  ],

  "nodes": {
    "START": {
        "id": "START",
        "message": "안녕하세요! 제로메디컬 온라인 고객만족센터입니다.\n도움이 필요하신 카테고리를 선택해주세요.",
        "type": "button_select",
        "options": [
            { "id": "OPT_DELIVERY", "label": "📦 배송/수령 문의", "next": "L2_DELIVERY" },
            { "id": "OPT_RETURN", "label": "🔄 교환/반품/취소", "next": "L2_RETURN" },
            { "id": "OPT_MANUAL", "label": "📄 제품 조립/사용법", "next": "L2_MANUAL" },
            { "id": "OPT_TROUBLE", "label": "⚠️ 사용 중 문제 해결", "next": "L2_TROUBLE" },
            { "id": "OPT_AS", "label": "🛠️ A/S 및 부품 구매", "next": "L2_AS" }
        ]
    },

    "L2_DELIVERY": {
        "id": "L2_DELIVERY",
        "message": "배송과 관련된 궁금증을 해결해드릴게요.",
        "type": "button_select",
        "options": [
            { "id": "DELIVERY_TIME", "label": "언제 배송되나요?", "next": "VIDEO", "video_key": "delivery_time_guide" },
            { "id": "DELIVERY_ADDR", "label": "수령 주소를 변경하고 싶어요", "next": "VIDEO", "video_key": "delivery_addr_guide" },
            { "id": "DELIVERY_TRACK", "label": "배송 조회가 안 됩니다", "next": "VIDEO", "video_key": "delivery_track_guide" },
            { "id": "DELIVERY_OTHER", "label": "기타 배송 관련 도움 요청", "next": "ESCALATE_CHAT" }
        ]
    },
    
    "L2_RETURN": {
        "id": "L2_RETURN",
        "message": "취소 및 교환/반품 안내입니다.",
        "type": "button_select",
        "options": [
            { "id": "RETURN_CANCEL", "label": "주문을 취소하고 싶어요", "next": "VIDEO", "video_key": "return_cancel_guide" },
            { "id": "RETURN_METHOD", "label": "교환/반품 접수는 어떻게 하나요?", "next": "VIDEO", "video_key": "return_method_guide" },
            { "id": "RETURN_FEE", "label": "반품 배송비는 얼마인가요?", "next": "VIDEO", "video_key": "return_fee_guide" },
            { "id": "RETURN_DEFECT", "label": "제품이 파손/불량 상태로 도착했어요", "next": "ESCALATE_CHAT" }
        ]
    },

    "L2_MANUAL": {
        "id": "L2_MANUAL",
        "message": "어떤 제품군인지 선택해 주세요.",
        "type": "button_select",
        "options": [
            { "id": "MANUAL_A", "label": "전동 휠체어 부문", "next": "VIDEO", "video_key": "manual_a_guide" },
            { "id": "MANUAL_B", "label": "수동 휠체어 부문", "next": "VIDEO", "video_key": "manual_b_guide" },
            { "id": "MANUAL_C", "label": "전동 침대 부문", "next": "VIDEO", "video_key": "manual_c_guide" },
            { "id": "MANUAL_D", "label": "기타 의료기기 제품군", "next": "VIDEO", "video_key": "manual_d_guide" }
        ]
    },

    "L2_TROUBLE": {
        "id": "L2_TROUBLE",
        "message": "발생한 증상을 선택해 주시면 빠르게 해결 방법을 안내해 드립니다.",
        "type": "button_select",
        "options": [
            { "id": "TROUBLE_POWER", "label": "🔌 전원이 켜지지 않아요 (기기 미작동)", "next": "VIDEO", "video_key": "trouble_power_guide" },
            { "id": "TROUBLE_NOISE", "label": "🔊 제품에서 찌그덕 소음이 납니다", "next": "VIDEO", "video_key": "trouble_noise_guide" },
            { "id": "TROUBLE_CONNECT", "label": "🔩 부속품이 헐거워서 고정이 안돼요", "next": "VIDEO", "video_key": "trouble_connect_guide" },
            { "id": "TROUBLE_DETAIL", "label": "💬 기타/자세한 증상을 직접 설명할게요", "next": "REQUEST_VIDEO" }
        ]
    },

    "L2_AS": {
        "id": "L2_AS",
        "message": "부품 및 A/S 전담 센터 안내입니다.",
        "type": "button_select",
        "options": [
            { "id": "AS_WARRANTY", "label": "무상 AS 기준 / 품질 보증 기간", "next": "VIDEO", "video_key": "as_warranty_guide" },
            { "id": "AS_PARTS", "label": "소모품/부품 별도 구매 안내", "next": "VIDEO", "video_key": "as_parts_guide" },
            { "id": "AS_REPAIR", "label": "방문 수리/택배 AS 접수하기", "next": "ESCALATE_CHAT" }
        ]
    }
  },

  "actions": {
    "VIDEO": {
      "id": "VIDEO",
      "type": "video_solution",
      "message": "아래는 해당 문의에 대한 상세 안내 영상/설명입니다. 확인 후 문제가 해결되셨을까요?",
      "video_url": "https://www.youtube.com/embed/XXXXXX?si=YYYYYY",
      "options": [
        {
          "id": "V_SOLVED",
          "label": "👍 네, 시원하게 해결되었습니다!",
          "next": "RESTART"
        },
        {
          "id": "V_UNSOLVED",
          "label": "💬 아니오, 상담원 연결이 필요합니다",
          "next": "ESCALATE_CHAT"
        }
      ]
    },
    
    "REQUEST_VIDEO": {
      "id": "REQUEST_VIDEO",
      "type": "media_request",
      "message": "파악하기 어려운 증상이군요!\n현재 문제가 발생한 부위(또는 파손 부위)의 **사진이나 짧은 영상**을 촬영하여 이곳 창에 전송해 주시면, 저희 전문가가 확인 후 즉시 분석해드리겠습니다.",
      "options": [
        {
          "id": "UPLOAD_CAMERA",
          "label": "📸 지금 바로 촬영해서 올리기 지시",
          "action": "UPLOAD",
          "next": "ESCALATE_CHAT"
        },
        {
          "id": "UPLOAD_GALLERY",
          "label": "🖼️ 갤러리에서 사진/영상 선택하기",
          "action": "UPLOAD",
          "next": "ESCALATE_CHAT"
        },
        {
          "id": "CANT_UPLOAD",
          "label": "건너뛰고 상담원과 바로 대화하기",
          "next": "ESCALATE_CHAT"
        }
      ]
    },

    "ESCALATE_CHAT": {
      "id": "ESCALATE_CHAT",
      "type": "escalate",
      "message": "전문 상담원과 즉시 연결해 드리겠습니다.\n\n담당자가 배정되는 동안, 원활하고 신속한 처리를 위해 **하단 채팅창에 아래 항목을 미리 남겨주시면** 대단히 감사하겠습니다.\n\n─────────────────────\n📋 **[문의 접수 양식]**\n- 구매하신 채널 (예: 쿠팡, 스마트스토어 등):\n- 구매자 성함:\n- 구매하신 상품명:\n- 겪고 계신 문제나 증상:\n─────────────────────"
    },

    "ESCALATE_CALL": {
      "id": "ESCALATE_CALL",
      "type": "escalate_call",
      "message": "이 문제는 안전상의 이유로 영상 통화 등을 통해 직접 살펴볼 필요가 있습니다.\n상담원이 빠른 시일 내에 해피콜을 드리겠습니다."
    }
  }
};

// Node.js 환경에서 테스트할 경우를 위한 export
if (typeof module !== 'undefined') {
  module.exports = chatDataRaw;
}
