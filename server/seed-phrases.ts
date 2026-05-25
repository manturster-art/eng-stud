// 초기 시드 표현 라이브러리 — 일상 회화에서 자주 쓰이는 짧은 표현 모음
// PlayPhrase.me로 검색했을 때 실제 영화/드라마 클립이 풍부하게 나오는 항목 위주
export interface SeedPhrase {
  phraseEn: string;
  phraseKo: string;
  category: string;
}

export const phrasesSeed: SeedPhrase[] = [
  // greeting (인사)
  { phraseEn: "Nice to meet you", phraseKo: "만나서 반갑습니다", category: "greeting" },
  { phraseEn: "I'm so glad to meet you", phraseKo: "당신을 만나서 정말 기뻐요", category: "greeting" },
  { phraseEn: "How have you been?", phraseKo: "그동안 어떻게 지냈어요?", category: "greeting" },
  { phraseEn: "Long time no see", phraseKo: "오랜만이에요", category: "greeting" },
  { phraseEn: "What's up?", phraseKo: "잘 지내?", category: "greeting" },

  // feeling (감정 표현)
  { phraseEn: "That sounds great", phraseKo: "좋은 것 같아요", category: "feeling" },
  { phraseEn: "I can't believe it", phraseKo: "믿을 수가 없어요", category: "feeling" },
  { phraseEn: "I'm proud of you", phraseKo: "당신이 자랑스러워요", category: "feeling" },
  { phraseEn: "I'm sorry to hear that", phraseKo: "그 말 들으니 안타깝네요", category: "feeling" },
  { phraseEn: "That's a relief", phraseKo: "다행이에요", category: "feeling" },
  { phraseEn: "I'm looking forward to it", phraseKo: "기대하고 있어요", category: "feeling" },

  // daily (일상)
  { phraseEn: "Could you do me a favor", phraseKo: "부탁 하나 들어줄래요?", category: "daily" },
  { phraseEn: "Help yourself", phraseKo: "마음껏 드세요", category: "daily" },
  { phraseEn: "Make yourself at home", phraseKo: "편하게 있으세요", category: "daily" },
  { phraseEn: "Take your time", phraseKo: "천천히 하세요", category: "daily" },
  { phraseEn: "Let me think about it", phraseKo: "생각해 볼게요", category: "daily" },
  { phraseEn: "It's up to you", phraseKo: "당신이 결정하세요", category: "daily" },
  { phraseEn: "It depends", phraseKo: "상황에 따라 달라요", category: "daily" },
  { phraseEn: "Don't worry about it", phraseKo: "신경 쓰지 마세요", category: "daily" },

  // agreement (동의/맞장구)
  { phraseEn: "I couldn't agree more", phraseKo: "전적으로 동의해요", category: "agreement" },
  { phraseEn: "That makes sense", phraseKo: "말이 되네요", category: "agreement" },
  { phraseEn: "You got it", phraseKo: "알겠어요", category: "agreement" },
  { phraseEn: "Sounds good to me", phraseKo: "저는 좋아요", category: "agreement" },
  { phraseEn: "I see what you mean", phraseKo: "무슨 말인지 알겠어요", category: "agreement" },

  // request (요청/제안)
  { phraseEn: "Would you mind if I", phraseKo: "혹시 ~해도 될까요?", category: "request" },
  { phraseEn: "Do you happen to know", phraseKo: "혹시 알고 계신가요?", category: "request" },
  { phraseEn: "Let me know", phraseKo: "알려주세요", category: "request" },
  { phraseEn: "Can you give me a hand", phraseKo: "도와줄 수 있나요?", category: "request" },
  { phraseEn: "Why don't we", phraseKo: "우리 ~하는 게 어때요?", category: "request" },
  { phraseEn: "Feel free to ask", phraseKo: "편하게 물어보세요", category: "request" },
];
