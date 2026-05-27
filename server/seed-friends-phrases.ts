// Friends 시즌 1 에피소드 1~10 핵심 표현 시드 데이터 (40개)
// 한국 성인 학습자(TOEIC 600~800) 일상 회화 학습용
// 에피소드당 4개: 대표 / 반복 / 슬랭·구어체 / 실용
// PlayPhrase.me 검색 최적화 (3~6단어), 시대 한정 슬랭 회피
export interface SeedFriendsPhrase {
  episode: number;       // 1~10 (시즌 1)
  episodeTitle: string;  // 영문 부제
  phraseEn: string;
  phraseKo: string;
  category: string;
}

export const friendsPhrasesSeed: SeedFriendsPhrase[] = [
  // S1E1 The Pilot — 레이첼 결혼식장 탈출, 센트럴 퍼크 합류
  { episode: 1, episodeTitle: "The Pilot", phraseEn: "Welcome to the real world", phraseKo: "현실에 온 걸 환영해", category: "greeting" },
  { episode: 1, episodeTitle: "The Pilot", phraseEn: "It's gonna be okay", phraseKo: "다 괜찮아질 거예요", category: "feeling" },
  { episode: 1, episodeTitle: "The Pilot", phraseEn: "I have no idea", phraseKo: "전혀 모르겠어요", category: "daily" },
  { episode: 1, episodeTitle: "The Pilot", phraseEn: "Can I get you anything", phraseKo: "뭐 좀 갖다 드릴까요?", category: "request" },

  // S1E2 The One with the Sonogram at the End — 캐럴 임신, 로스 전부인 커밍아웃
  { episode: 2, episodeTitle: "The One with the Sonogram at the End", phraseEn: "I've made a huge mistake", phraseKo: "엄청난 실수를 했어요", category: "feeling" },
  { episode: 2, episodeTitle: "The One with the Sonogram at the End", phraseEn: "Let me get this straight", phraseKo: "정리 좀 해볼게요", category: "daily" },
  { episode: 2, episodeTitle: "The One with the Sonogram at the End", phraseEn: "What the hell is going on", phraseKo: "도대체 무슨 일이야", category: "daily" },
  { episode: 2, episodeTitle: "The One with the Sonogram at the End", phraseEn: "I appreciate that", phraseKo: "그렇게 말해줘서 고마워요", category: "agreement" },

  // S1E3 The One with the Thumb — 챈들러 흡연 재개, 모니카 남친 알란
  { episode: 3, episodeTitle: "The One with the Thumb", phraseEn: "I have to admit", phraseKo: "솔직히 말하면", category: "daily" },
  { episode: 3, episodeTitle: "The One with the Thumb", phraseEn: "Are you out of your mind", phraseKo: "너 제정신이야?", category: "feeling" },
  { episode: 3, episodeTitle: "The One with the Thumb", phraseEn: "It's not a big deal", phraseKo: "별일 아니에요", category: "daily" },
  { episode: 3, episodeTitle: "The One with the Thumb", phraseEn: "I need a little help", phraseKo: "도움이 좀 필요해요", category: "request" },

  // S1E4 The One with George Stephanopoulos — 레이첼 자기연민, 여자들의 밤
  { episode: 4, episodeTitle: "The One with George Stephanopoulos", phraseEn: "I'm gonna be alone forever", phraseKo: "난 평생 혼자일 거야", category: "feeling" },
  { episode: 4, episodeTitle: "The One with George Stephanopoulos", phraseEn: "What's wrong with you", phraseKo: "너 왜 그래?", category: "daily" },
  { episode: 4, episodeTitle: "The One with George Stephanopoulos", phraseEn: "Snap out of it", phraseKo: "정신 좀 차려", category: "daily" },
  { episode: 4, episodeTitle: "The One with George Stephanopoulos", phraseEn: "I got over it", phraseKo: "그건 이제 다 잊었어요", category: "feeling" },

  // S1E5 The One with the East German Laundry Detergent — 빨래방, 더블 데이트
  { episode: 5, episodeTitle: "The One with the East German Laundry Detergent", phraseEn: "Can I ask you something", phraseKo: "뭐 좀 물어봐도 돼요?", category: "request" },
  { episode: 5, episodeTitle: "The One with the East German Laundry Detergent", phraseEn: "Get out of here", phraseKo: "에이, 말도 안 돼", category: "feeling" },
  { episode: 5, episodeTitle: "The One with the East German Laundry Detergent", phraseEn: "I had a great time", phraseKo: "정말 즐거웠어요", category: "feeling" },
  { episode: 5, episodeTitle: "The One with the East German Laundry Detergent", phraseEn: "Don't even think about it", phraseKo: "꿈도 꾸지 마세요", category: "daily" },

  // S1E6 The One with the Butt — 조이의 알 파치노 단역
  { episode: 6, episodeTitle: "The One with the Butt", phraseEn: "It's a really big deal", phraseKo: "이건 정말 큰일이에요", category: "feeling" },
  { episode: 6, episodeTitle: "The One with the Butt", phraseEn: "I can't take it anymore", phraseKo: "더는 못 참겠어요", category: "feeling" },
  { episode: 6, episodeTitle: "The One with the Butt", phraseEn: "Are you kidding me", phraseKo: "지금 장난해요?", category: "feeling" },
  { episode: 6, episodeTitle: "The One with the Butt", phraseEn: "I don't get it", phraseKo: "이해가 안 돼요", category: "daily" },

  // S1E7 The One with the Blackout — 정전, 챈들러 ATM 부스 갇힘
  { episode: 7, episodeTitle: "The One with the Blackout", phraseEn: "I can't see a thing", phraseKo: "하나도 안 보여요", category: "daily" },
  { episode: 7, episodeTitle: "The One with the Blackout", phraseEn: "What are you doing here", phraseKo: "여기서 뭐 해요?", category: "daily" },
  { episode: 7, episodeTitle: "The One with the Blackout", phraseEn: "You gotta be kidding me", phraseKo: "농담이지, 진심이야?", category: "feeling" },
  { episode: 7, episodeTitle: "The One with the Blackout", phraseEn: "Tell me about it", phraseKo: "누가 아니래요", category: "agreement" },

  // S1E8 The One Where Nana Dies Twice — 할머니 장례, 챈들러 게이 오해
  { episode: 8, episodeTitle: "The One Where Nana Dies Twice", phraseEn: "I'm here for you", phraseKo: "내가 옆에 있어줄게요", category: "feeling" },
  { episode: 8, episodeTitle: "The One Where Nana Dies Twice", phraseEn: "What's that supposed to mean", phraseKo: "그게 무슨 뜻이에요?", category: "daily" },
  { episode: 8, episodeTitle: "The One Where Nana Dies Twice", phraseEn: "How are you holding up", phraseKo: "좀 어떻게 버티고 있어요?", category: "greeting" },
  { episode: 8, episodeTitle: "The One Where Nana Dies Twice", phraseEn: "I had no idea", phraseKo: "전혀 몰랐어요", category: "feeling" },

  // S1E9 The One Where Underdog Gets Away — 추수감사절 망함, 문 잠김
  { episode: 9, episodeTitle: "The One Where Underdog Gets Away", phraseEn: "Something smells amazing", phraseKo: "냄새가 끝내주네요", category: "feeling" },
  { episode: 9, episodeTitle: "The One Where Underdog Gets Away", phraseEn: "I'm starving", phraseKo: "배고파 죽겠어요", category: "feeling" },
  { episode: 9, episodeTitle: "The One Where Underdog Gets Away", phraseEn: "We're locked out", phraseKo: "문 잠겨서 못 들어가요", category: "daily" },
  { episode: 9, episodeTitle: "The One Where Underdog Gets Away", phraseEn: "This is a disaster", phraseKo: "이건 완전 재앙이에요", category: "feeling" },

  // S1E10 The One with the Monkey — 로스의 원숭이 마르셀, 새해 전야
  { episode: 10, episodeTitle: "The One with the Monkey", phraseEn: "I don't know what to say", phraseKo: "뭐라고 해야 할지 모르겠어요", category: "feeling" },
  { episode: 10, episodeTitle: "The One with the Monkey", phraseEn: "What's the worst that could happen", phraseKo: "최악이래봤자 뭐 있겠어요?", category: "daily" },
  { episode: 10, episodeTitle: "The One with the Monkey", phraseEn: "It's been a while", phraseKo: "꽤 오래됐네요", category: "greeting" },
  { episode: 10, episodeTitle: "The One with the Monkey", phraseEn: "Mind if I join you", phraseKo: "같이 껴도 돼요?", category: "request" },
];
