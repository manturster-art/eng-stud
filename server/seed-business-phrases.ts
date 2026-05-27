// 비즈니스 영어 회화 표현 시드 (50개)
// 한국 직장인 (TOEIC 600~800) 대상, 외국인 동료/거래처와의 실제 시나리오
// PlayPhrase.me 검색 최적화 (3~6단어, 시대 한정 슬랭 회피)
// 기존 시드(seed 30 + peppa 60 + friends 40) 130개와 중복 회피 완료
// 신규 5개 카테고리 도입: phone / email / meeting / smalltalk / negotiation
export interface SeedBusinessPhrase {
  phraseEn: string;
  phraseKo: string;
  category: string;  // 'phone' | 'email' | 'meeting' | 'smalltalk' | 'negotiation'
  scenario?: string; // sourceLabel 보조용 짧은 시나리오
}

export const businessPhrasesSeed: SeedBusinessPhrase[] = [
  // === 전화 응대 (phone) — 10개 ===
  // 외국 거래처/본사와의 영어 전화 상황. 격식 있는 톤.
  { phraseEn: "May I ask who's calling", phraseKo: "전화 주신 분이 누구신가요?", category: "phone", scenario: "전화 받기" },
  { phraseEn: "Could you hold for a moment", phraseKo: "잠시만 기다려 주시겠어요?", category: "phone", scenario: "전화 대기" },
  { phraseEn: "I'll put you through", phraseKo: "연결해 드리겠습니다", category: "phone", scenario: "전화 연결" },
  { phraseEn: "He's not at his desk", phraseKo: "지금 자리에 안 계세요", category: "phone", scenario: "부재 안내" },
  { phraseEn: "Would you like to leave a message", phraseKo: "메시지 남기시겠어요?", category: "phone", scenario: "메시지 응대" },
  { phraseEn: "I'll have him call you back", phraseKo: "다시 전화 드리도록 전하겠습니다", category: "phone", scenario: "콜백 약속" },
  { phraseEn: "Could you speak a bit slower", phraseKo: "조금 천천히 말씀해 주시겠어요?", category: "phone", scenario: "재요청" },
  { phraseEn: "I'm sorry, I didn't catch that", phraseKo: "죄송한데 못 알아들었어요", category: "phone", scenario: "재확인 요청" },
  { phraseEn: "Let me transfer your call", phraseKo: "전화 돌려드릴게요", category: "phone", scenario: "타부서 연결" },
  { phraseEn: "Thanks for getting back to me", phraseKo: "다시 연락 주셔서 감사합니다", category: "phone", scenario: "회신 인사" },

  // === 이메일 표현 (email) — 10개 ===
  // 거래처/내부 이메일에서 자주 쓰는 정형 표현. 격식체.
  { phraseEn: "I'm writing to follow up", phraseKo: "후속 확인차 메일 드립니다", category: "email", scenario: "팔로업 메일" },
  { phraseEn: "Please find the attached file", phraseKo: "첨부 파일 확인 부탁드립니다", category: "email", scenario: "첨부 안내" },
  { phraseEn: "Just a quick reminder", phraseKo: "다시 한 번 알려드리려고요", category: "email", scenario: "리마인더" },
  { phraseEn: "Looking forward to your reply", phraseKo: "답변 기다리겠습니다", category: "email", scenario: "회신 요청" },
  { phraseEn: "Please let me know your thoughts", phraseKo: "의견 알려주시면 감사하겠습니다", category: "email", scenario: "피드백 요청" },
  { phraseEn: "Apologies for the late response", phraseKo: "회신이 늦어 죄송합니다", category: "email", scenario: "지연 사과" },
  { phraseEn: "I hope this email finds you well", phraseKo: "잘 지내고 계시길 바랍니다", category: "email", scenario: "오프닝 인사" },
  { phraseEn: "Could you confirm the details", phraseKo: "세부 사항 확인 부탁드립니다", category: "email", scenario: "확인 요청" },
  { phraseEn: "I'll circle back next week", phraseKo: "다음 주에 다시 연락드릴게요", category: "email", scenario: "후속 안내" },
  { phraseEn: "Let me loop you in", phraseKo: "이 건에 함께 포함시켜 드릴게요", category: "email", scenario: "참조 추가" },

  // === 회의·발표 (meeting) — 10개 ===
  // 영어 회의/컨퍼런스콜에서 진행·발언·확인 시 자주 쓰는 표현.
  { phraseEn: "Let's get started", phraseKo: "그럼 시작하겠습니다", category: "meeting", scenario: "회의 시작" },
  { phraseEn: "Could you elaborate on that", phraseKo: "조금 더 자세히 말씀해 주시겠어요?", category: "meeting", scenario: "부연 요청" },
  { phraseEn: "Let me share my screen", phraseKo: "화면 공유하겠습니다", category: "meeting", scenario: "화상회의" },
  { phraseEn: "Can everyone hear me okay", phraseKo: "다들 잘 들리세요?", category: "meeting", scenario: "음향 확인" },
  { phraseEn: "Let's table this for now", phraseKo: "이건 일단 보류하시죠", category: "meeting", scenario: "안건 보류" },
  { phraseEn: "I'd like to add something", phraseKo: "한 가지 덧붙이고 싶어요", category: "meeting", scenario: "발언 끼어들기" },
  { phraseEn: "Let's move on to the next item", phraseKo: "다음 안건으로 넘어가시죠", category: "meeting", scenario: "안건 전환" },
  { phraseEn: "Could you walk me through it", phraseKo: "처음부터 설명해 주시겠어요?", category: "meeting", scenario: "설명 요청" },
  { phraseEn: "Let's wrap it up", phraseKo: "이쯤에서 마무리하시죠", category: "meeting", scenario: "회의 종료" },
  { phraseEn: "I'll follow up on that", phraseKo: "그건 제가 후속 처리하겠습니다", category: "meeting", scenario: "액션 아이템" },

  // === 비즈니스 스몰토크 (smalltalk) — 10개 ===
  // 미팅 전후·엘리베이터·점심 등 가벼운 대화. 격식 있되 친근.
  { phraseEn: "How was your weekend", phraseKo: "주말 어떻게 보내셨어요?", category: "smalltalk", scenario: "월요일 인사" },
  { phraseEn: "How's business going", phraseKo: "사업은 잘 되세요?", category: "smalltalk", scenario: "거래처 인사" },
  { phraseEn: "Keeping busy these days", phraseKo: "요즘 많이 바쁘세요?", category: "smalltalk", scenario: "근황 묻기" },
  { phraseEn: "How's everything on your end", phraseKo: "그쪽은 다 잘 되시죠?", category: "smalltalk", scenario: "안부 묻기" },
  { phraseEn: "Any plans for the holidays", phraseKo: "연휴 계획 있으세요?", category: "smalltalk", scenario: "휴가 잡담" },
  { phraseEn: "How was your trip", phraseKo: "출장은 어떠셨어요?", category: "smalltalk", scenario: "출장 복귀" },
  { phraseEn: "Let's grab a coffee sometime", phraseKo: "언제 커피 한잔하시죠", category: "smalltalk", scenario: "친목 제안" },
  { phraseEn: "Working from home today", phraseKo: "오늘은 재택근무예요", category: "smalltalk", scenario: "근무 형태" },
  { phraseEn: "Same here", phraseKo: "저도 그래요", category: "smalltalk", scenario: "공감 표현" },
  { phraseEn: "Have a good one", phraseKo: "좋은 하루 보내세요", category: "smalltalk", scenario: "헤어질 때" },

  // === 협상·요청 (negotiation) — 10개 ===
  // 가격·조건·일정 협의, 거절·역제안 표현. 정중하면서도 단호.
  { phraseEn: "Would you consider a discount", phraseKo: "할인 가능하실까요?", category: "negotiation", scenario: "가격 협상" },
  { phraseEn: "Let me get back to you", phraseKo: "확인 후 다시 알려드릴게요", category: "negotiation", scenario: "보류 답변" },
  { phraseEn: "Is there any flexibility on the price", phraseKo: "가격 조정 여지가 있을까요?", category: "negotiation", scenario: "단가 조정" },
  { phraseEn: "Can we push the deadline", phraseKo: "마감을 좀 미룰 수 있을까요?", category: "negotiation", scenario: "일정 연장" },
  { phraseEn: "I'm afraid that won't work", phraseKo: "그건 어려울 것 같아요", category: "negotiation", scenario: "정중한 거절" },
  { phraseEn: "Let's meet in the middle", phraseKo: "중간 지점에서 맞춰 보시죠", category: "negotiation", scenario: "절충안" },
  { phraseEn: "Could you send me a quote", phraseKo: "견적서 보내 주시겠어요?", category: "negotiation", scenario: "견적 요청" },
  { phraseEn: "What's your best offer", phraseKo: "최선의 조건은 어떻게 되세요?", category: "negotiation", scenario: "최종 제안 요구" },
  { phraseEn: "I'll need to check with my team", phraseKo: "팀과 상의해 보겠습니다", category: "negotiation", scenario: "내부 확인" },
  { phraseEn: "Let's put it in writing", phraseKo: "서면으로 남겨 두시죠", category: "negotiation", scenario: "문서화 요청" },
];
