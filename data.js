const chatDataRaw = {
  "system": "수동식 휠체어 CS 챗봇",
  "version": "1.0",
  "description": "구매 전/사용 중/A/S 문의를 단계별 버튼 선택으로 좁혀가며 영상 솔루션을 매칭하고, 해결 불가 시 실제 CS로 에스컬레이션하는 챗봇 구조",

  "entry_channels": [
    "카카오채널",
    "홈페이지 QR코드",
    "문자 링크"
  ],

  "layer1_classification": {
    "id": "L1",
    "message": "안녕하세요! 어떤 도움이 필요하신가요?",
    "type": "button_select",
    "options": [
      {
        "id": "L1_PRE",
        "label": "구매 전 상담",
        "description": "제품 스펙, 비교, 추천 문의",
        "next": "L2_PRE"
      },
      {
        "id": "L1_USE",
        "label": "사용 중 문제",
        "description": "고장, 파손, 작동 불량 문의",
        "next": "L2_USE"
      },
      {
        "id": "L1_AS",
        "label": "A/S 접수",
        "description": "부품 교체, 수리 요청",
        "next": "L2_AS"
      }
    ]
  },

  "layer2": {

    "pre_purchase": {
      "id": "L2_PRE",
      "label": "구매 전 상담",
      "message": "어떤 내용이 궁금하신가요?",
      "type": "button_select",
      "options": [
        {
          "id": "L2_PRE_SPEC",
          "label": "제품 스펙 문의",
          "next": "VIDEO",
          "video_key": "pre_spec_guide"
        },
        {
          "id": "L2_PRE_COMPARE",
          "label": "제품 비교 추천",
          "next": "VIDEO",
          "video_key": "pre_compare_guide"
        },
        {
          "id": "L2_PRE_SIZE",
          "label": "사이즈/체형 선택",
          "next": "VIDEO",
          "video_key": "pre_size_guide"
        },
        {
          "id": "L2_PRE_DELIVERY",
          "label": "배송/조립 문의",
          "next": "VIDEO",
          "video_key": "pre_delivery_guide"
        },
        {
          "id": "L2_PRE_OTHER",
          "label": "기타 문의",
          "next": "ESCALATE_CHAT"
        }
      ]
    },

    "in_use": {
      "id": "L2_USE",
      "label": "사용 중 문제",
      "message": "어떤 부위에 문제가 생겼나요?",
      "type": "button_select",
      "options": [
        {
          "id": "L2_USE_BRAKE",
          "label": "🔒 브레이크",
          "description": "잠금/해제 안됨",
          "next": "L3_BRAKE"
        },
        {
          "id": "L2_USE_WHEEL",
          "label": "🛞 바퀴",
          "description": "펑크, 이탈, 마모",
          "next": "L3_WHEEL"
        },
        {
          "id": "L2_USE_SEAT",
          "label": "🪑 시트",
          "description": "파손, 조절 불량",
          "next": "L3_SEAT"
        },
        {
          "id": "L2_USE_FRAME",
          "label": "🦽 프레임",
          "description": "파손, 소음, 변형",
          "next": "L3_FRAME"
        },
        {
          "id": "L2_USE_FOOTREST",
          "label": "발판/팔걸이",
          "description": "조절 불량, 파손",
          "next": "L3_FOOTREST"
        },
        {
          "id": "L2_USE_OTHER",
          "label": "기타",
          "next": "REQUEST_VIDEO"
        }
      ]
    },

    "after_service": {
      "id": "L2_AS",
      "label": "A/S 접수",
      "message": "A/S 내용을 선택해 주세요.",
      "type": "button_select",
      "options": [
        {
          "id": "L2_AS_PART",
          "label": "부품 구매/교체",
          "next": "ESCALATE_CHAT"
        },
        {
          "id": "L2_AS_REPAIR",
          "label": "수리 요청",
          "next": "REQUEST_VIDEO"
        },
        {
          "id": "L2_AS_WARRANTY",
          "label": "품질보증 문의",
          "next": "ESCALATE_CALL"
        }
      ]
    }
  },

  "layer3_diagnosis": {

    "brake": {
      "id": "L3_BRAKE",
      "label": "브레이크 진단",
      "step1": {
        "message": "어떤 브레이크에 문제가 있나요?",
        "type": "button_select",
        "options": [
          {
            "id": "L3_BRAKE_USER",
            "label": "환자(탑승자) 브레이크",
            "description": "핸드림 옆 손잡이 레버",
            "next": "L3_BRAKE_USER_SYMPTOM"
          },
          {
            "id": "L3_BRAKE_CARER",
            "label": "보호자 브레이크",
            "description": "뒤쪽 핸들 위 레버",
            "next": "L3_BRAKE_CARER_SYMPTOM"
          }
        ]
      },
      "step2_user": {
        "id": "L3_BRAKE_USER_SYMPTOM",
        "message": "증상이 어떤가요?",
        "type": "button_select",
        "options": [
          {
            "id": "SYM_BRAKE_USER_LOOSE",
            "label": "레버가 헐거워서 안 잠김",
            "next": "VIDEO",
            "video_key": "brake_user_loose"
          },
          {
            "id": "SYM_BRAKE_USER_STUCK",
            "label": "잠긴 채로 안 풀림",
            "next": "VIDEO",
            "video_key": "brake_user_stuck"
          },
          {
            "id": "SYM_BRAKE_USER_BROKEN",
            "label": "레버 자체가 파손됨",
            "next": "REQUEST_VIDEO"
          },
          {
            "id": "SYM_BRAKE_USER_TENSION",
            "label": "제동력이 약함(미끄러짐)",
            "next": "VIDEO",
            "video_key": "brake_user_tension_adjust"
          }
        ]
      },
      "step2_carer": {
        "id": "L3_BRAKE_CARER_SYMPTOM",
        "message": "증상이 어떤가요?",
        "type": "button_select",
        "options": [
          {
            "id": "SYM_BRAKE_CARER_LOOSE",
            "label": "레버가 헐거워서 안 잠김",
            "next": "VIDEO",
            "video_key": "brake_carer_loose"
          },
          {
            "id": "SYM_BRAKE_CARER_STUCK",
            "label": "잠긴 채로 안 풀림",
            "next": "VIDEO",
            "video_key": "brake_carer_stuck"
          },
          {
            "id": "SYM_BRAKE_CARER_BROKEN",
            "label": "레버 자체가 파손됨",
            "next": "REQUEST_VIDEO"
          },
          {
            "id": "SYM_BRAKE_CARER_CABLE",
            "label": "케이블이 끊어진 것 같음",
            "next": "REQUEST_VIDEO"
          }
        ]
      }
    },

    "wheel": {
      "id": "L3_WHEEL",
      "label": "바퀴 진단",
      "message": "바퀴 증상을 선택해 주세요.",
      "type": "button_select",
      "options": [
        {
          "id": "SYM_WHEEL_FLAT",
          "label": "공기가 빠짐(펑크)",
          "next": "VIDEO",
          "video_key": "wheel_flat_repair"
        },
        {
          "id": "SYM_WHEEL_DETACH",
          "label": "바퀴가 이탈됨",
          "next": "VIDEO",
          "video_key": "wheel_reattach"
        },
        {
          "id": "SYM_WHEEL_WOBBLE",
          "label": "바퀴가 흔들림",
          "next": "VIDEO",
          "video_key": "wheel_wobble_check"
        },
        {
          "id": "SYM_WHEEL_WORN",
          "label": "타이어 마모",
          "next": "ESCALATE_CHAT"
        }
      ]
    },

    "seat": {
      "id": "L3_SEAT",
      "label": "시트 진단",
      "message": "시트 증상을 선택해 주세요.",
      "type": "button_select",
      "options": [
        {
          "id": "SYM_SEAT_HEIGHT",
          "label": "높낮이 조절 안됨",
          "next": "VIDEO",
          "video_key": "seat_height_adjust"
        },
        {
          "id": "SYM_SEAT_TORN",
          "label": "시트 천 파손/찢어짐",
          "next": "ESCALATE_CHAT"
        },
        {
          "id": "SYM_SEAT_SLING",
          "label": "등받이 처짐",
          "next": "VIDEO",
          "video_key": "seat_sling_adjust"
        }
      ]
    },

    "frame": {
      "id": "L3_FRAME",
      "label": "프레임 진단",
      "message": "프레임 증상을 선택해 주세요.",
      "type": "button_select",
      "options": [
        {
          "id": "SYM_FRAME_NOISE",
          "label": "소음(삐걱거림)",
          "next": "VIDEO",
          "video_key": "frame_noise_check"
        },
        {
          "id": "SYM_FRAME_FOLD",
          "label": "접이식 프레임 안 펴짐/안 접힘",
          "next": "VIDEO",
          "video_key": "frame_fold_guide"
        },
        {
          "id": "SYM_FRAME_BROKEN",
          "label": "물리적 파손/균열",
          "next": "REQUEST_VIDEO"
        }
      ]
    },

    "footrest": {
      "id": "L3_FOOTREST",
      "label": "발판/팔걸이 진단",
      "message": "어떤 부위인가요?",
      "type": "button_select",
      "options": [
        {
          "id": "SYM_FOOT_ANGLE",
          "label": "발판 각도 조절",
          "next": "VIDEO",
          "video_key": "footrest_angle_adjust"
        },
        {
          "id": "SYM_FOOT_DETACH",
          "label": "발판 이탈",
          "next": "VIDEO",
          "video_key": "footrest_reattach"
        },
        {
          "id": "SYM_ARM_HEIGHT",
          "label": "팔걸이 높낮이 조절",
          "next": "VIDEO",
          "video_key": "armrest_height_adjust"
        },
        {
          "id": "SYM_ARM_BROKEN",
          "label": "팔걸이 파손",
          "next": "ESCALATE_CHAT"
        }
      ]
    }
  },

  "actions": {

    "VIDEO": {
      "id": "VIDEO",
      "type": "send_video_link",
      "message": "아래 영상을 참고해서 점검해 보세요 😊\n영상대로 해결되셨나요?",
      "follow_up": {
        "type": "button_select",
        "options": [
          {
            "label": "✅ 해결됐어요",
            "next": "RESOLVED"
          },
          {
            "label": "❌ 여전히 안돼요",
            "next": "REQUEST_VIDEO"
          }
        ]
      }
    },

    "REQUEST_VIDEO": {
      "id": "REQUEST_VIDEO",
      "type": "request_customer_video",
      "message": "<div style='background: rgba(239, 68, 68, 0.08); padding: 18px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 16px; line-height: 1.6;'><strong>🚨 정확한 진단을 위해 꼭 확인해 주세요!</strong><br><br>고객님, 현장의 <strong>사진이나 영상을 저희가 직접 확인하지 않으면 정확한 원인 파악이 매우 어렵습니다.</strong><br>자칫 잘못된 진단으로 인해 오히려 고객님께 더 큰 불편을 드릴 수밖에 없습니다.<br><br>그러한 상황을 방지하고 완벽한 A/S를 제공하기 위함이오니, 번거로우시더라도 문제점이 <strong>최대한 명확하게 드러날 수 있도록</strong> 촬영하여 보내주시기를 정중히 부탁드립니다. 🙏</div>아래의 <strong>[📷 사진/영상 첨부하기]</strong> 버튼을 눌러 미디어를 업로드해 주세요."
    },

    "RESOLVED": {
      "id": "RESOLVED",
      "type": "end",
      "message": "해결되셨다니 다행입니다! 이용해 주셔서 감사합니다 🙏",
      "collect_feedback": true
    },

    "ESCALATE_CHAT": {
      "id": "ESCALATE_CHAT",
      "type": "escalate",
      "channel": "chat",
      "message": "담당자가 채팅으로 도와드리겠습니다.\n잠시만 기다려 주세요."
    },

    "ESCALATE_CALL": {
      "id": "ESCALATE_CALL",
      "type": "escalate",
      "channel": "call",
      "message": "영상을 확인 후 전문 상담원이 연락드리겠습니다.\n운영시간: 평일 09:00 ~ 18:00"
    }
  },

  "video_db": {
    "description": "증상 코드와 영상 URL을 매핑하는 테이블. 영상 제작 후 url 필드를 채워 넣는 구조.",
    "videos": [
      {
        "key": "brake_user_loose",
        "title": "환자용 브레이크 — 헐거움(잠금 안됨) 수리",
        "tags": ["브레이크", "환자용", "잠금", "헐거움"],
        "url": ""
      },
      {
        "key": "brake_user_stuck",
        "title": "환자용 브레이크 — 고착(안 풀림) 해결",
        "tags": ["브레이크", "환자용", "고착"],
        "url": ""
      },
      {
        "key": "brake_user_tension_adjust",
        "title": "환자용 브레이크 — 장력(제동력) 조정",
        "tags": ["브레이크", "환자용", "장력", "미끄러짐"],
        "url": ""
      },
      {
        "key": "brake_carer_loose",
        "title": "보호자 브레이크 — 헐거움(잠금 안됨) 수리",
        "tags": ["브레이크", "보호자용", "잠금", "헐거움"],
        "url": ""
      },
      {
        "key": "brake_carer_stuck",
        "title": "보호자 브레이크 — 고착(안 풀림) 해결",
        "tags": ["브레이크", "보호자용", "고착"],
        "url": ""
      },
      {
        "key": "wheel_flat_repair",
        "title": "바퀴 펑크 — 자가 교체 방법",
        "tags": ["바퀴", "펑크", "공기"],
        "url": ""
      },
      {
        "key": "wheel_reattach",
        "title": "이탈된 바퀴 재장착",
        "tags": ["바퀴", "이탈", "재장착"],
        "url": ""
      },
      {
        "key": "wheel_wobble_check",
        "title": "바퀴 흔들림 점검 및 조임",
        "tags": ["바퀴", "흔들림", "볼트"],
        "url": ""
      },
      {
        "key": "seat_height_adjust",
        "title": "시트 높낮이 조절 방법",
        "tags": ["시트", "높낮이", "조절"],
        "url": ""
      },
      {
        "key": "seat_sling_adjust",
        "title": "등받이 처짐 조정",
        "tags": ["시트", "등받이", "처짐"],
        "url": ""
      },
      {
        "key": "frame_noise_check",
        "title": "프레임 소음(삐걱) 점검",
        "tags": ["프레임", "소음", "삐걱"],
        "url": ""
      },
      {
        "key": "frame_fold_guide",
        "title": "접이식 프레임 펼치기/접기",
        "tags": ["프레임", "접이식", "폴딩"],
        "url": ""
      },
      {
        "key": "footrest_angle_adjust",
        "title": "발판 각도 조절",
        "tags": ["발판", "각도", "조절"],
        "url": ""
      },
      {
        "key": "footrest_reattach",
        "title": "이탈된 발판 재장착",
        "tags": ["발판", "이탈", "재장착"],
        "url": ""
      },
      {
        "key": "armrest_height_adjust",
        "title": "팔걸이 높낮이 조절",
        "tags": ["팔걸이", "높낮이", "조절"],
        "url": ""
      },
      {
        "key": "pre_spec_guide",
        "title": "제품 스펙 안내 영상",
        "tags": ["구매전", "스펙", "안내"],
        "url": ""
      },
      {
        "key": "pre_compare_guide",
        "title": "제품 비교 추천 영상",
        "tags": ["구매전", "비교", "추천"],
        "url": ""
      },
      {
        "key": "pre_size_guide",
        "title": "사이즈/체형별 선택 가이드",
        "tags": ["구매전", "사이즈", "체형"],
        "url": ""
      },
      {
        "key": "pre_delivery_guide",
        "title": "배송 및 조립 안내",
        "tags": ["구매전", "배송", "조립"],
        "url": ""
      }
    ]
  }
};
