// Peppa Pig 시즌 1 에피소드별 핵심 표현 시드 데이터
// 각 에피소드에서 자주 반복되거나 학습에 유용한 짧은 표현 3개씩
export interface SeedPeppaPhrase {
  season: number;
  episode: number;
  phraseEn: string;
  phraseKo: string;
  category: string;
}

export const peppaPhrasesSeed: SeedPeppaPhrase[] = [
  // S1E1 Muddy Puddles
  { season: 1, episode: 1, phraseEn: "I love jumping in muddy puddles", phraseKo: "진흙 웅덩이에서 뛰는 거 정말 좋아해요", category: "daily" },
  { season: 1, episode: 1, phraseEn: "Don't make a fuss", phraseKo: "야단법석 떨지 마", category: "daily" },
  { season: 1, episode: 1, phraseEn: "It's only mud", phraseKo: "그냥 진흙일 뿐이야", category: "daily" },

  // S1E2 Mr Dinosaur is Lost
  { season: 1, episode: 2, phraseEn: "Where is Mr Dinosaur?", phraseKo: "공룡 인형 어디 있어요?", category: "daily" },
  { season: 1, episode: 2, phraseEn: "I can't find him anywhere", phraseKo: "어디에서도 찾을 수가 없어요", category: "feeling" },
  { season: 1, episode: 2, phraseEn: "Let's look upstairs", phraseKo: "위층을 한번 봐 볼까", category: "request" },

  // S1E3 Best Friend
  { season: 1, episode: 3, phraseEn: "She is my best friend", phraseKo: "그 애는 내 가장 친한 친구예요", category: "feeling" },
  { season: 1, episode: 3, phraseEn: "Would you like to play", phraseKo: "같이 놀래요?", category: "request" },
  { season: 1, episode: 3, phraseEn: "What a lovely day", phraseKo: "정말 멋진 날이에요", category: "feeling" },

  // S1E4 Polly Parrot
  { season: 1, episode: 4, phraseEn: "Who's a pretty boy then", phraseKo: "누가 잘생긴 친구일까", category: "daily" },
  { season: 1, episode: 4, phraseEn: "I'm bored", phraseKo: "심심해요", category: "feeling" },
  { season: 1, episode: 4, phraseEn: "Be quiet please", phraseKo: "조용히 좀 해 주세요", category: "request" },

  // S1E5 Hide and Seek
  { season: 1, episode: 5, phraseEn: "Ready or not, here I come", phraseKo: "꼭꼭 숨어라, 잡으러 간다", category: "daily" },
  { season: 1, episode: 5, phraseEn: "I found you", phraseKo: "찾았다!", category: "daily" },
  { season: 1, episode: 5, phraseEn: "It's your turn", phraseKo: "이제 네 차례야", category: "daily" },

  // S1E6 The Playgroup
  { season: 1, episode: 6, phraseEn: "Don't be shy", phraseKo: "부끄러워하지 마", category: "feeling" },
  { season: 1, episode: 6, phraseEn: "Time to tidy up", phraseKo: "정리할 시간이야", category: "daily" },
  { season: 1, episode: 6, phraseEn: "See you tomorrow", phraseKo: "내일 만나요", category: "greeting" },

  // S1E7 Mummy Pig at Work
  { season: 1, episode: 7, phraseEn: "I'm working on the computer", phraseKo: "지금 컴퓨터로 일하고 있어요", category: "daily" },
  { season: 1, episode: 7, phraseEn: "Please don't disturb me", phraseKo: "방해하지 말아 주세요", category: "request" },
  { season: 1, episode: 7, phraseEn: "I'm trying my best", phraseKo: "최선을 다하고 있어요", category: "feeling" },

  // S1E8 Piggy in the Middle
  { season: 1, episode: 8, phraseEn: "Throw it to me", phraseKo: "나한테 던져 줘요", category: "request" },
  { season: 1, episode: 8, phraseEn: "I can't reach", phraseKo: "손이 안 닿아요", category: "daily" },
  { season: 1, episode: 8, phraseEn: "That's not fair", phraseKo: "그건 불공평해요", category: "feeling" },

  // S1E9 Daddy Loses His Glasses
  { season: 1, episode: 9, phraseEn: "I've lost my glasses", phraseKo: "안경을 잃어버렸어요", category: "daily" },
  { season: 1, episode: 9, phraseEn: "Have you seen them", phraseKo: "혹시 보셨어요?", category: "request" },
  { season: 1, episode: 9, phraseEn: "Don't worry, I'll find them", phraseKo: "걱정 마세요, 제가 찾을게요", category: "agreement" },

  // S1E10 Gardening
  { season: 1, episode: 10, phraseEn: "Let's plant some seeds", phraseKo: "씨앗을 좀 심어 봐요", category: "request" },
  { season: 1, episode: 10, phraseEn: "It's growing already", phraseKo: "벌써 자라고 있어요", category: "feeling" },
  { season: 1, episode: 10, phraseEn: "Water the plants", phraseKo: "식물에 물을 주세요", category: "daily" },
];
