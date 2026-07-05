class TscPart {
  final int part;
  final String label;
  final String icon;
  final String desc;
  final List<TscQuestion> questions;

  const TscPart({
    required this.part,
    required this.label,
    required this.icon,
    required this.desc,
    required this.questions,
  });

  Map<String, dynamic> toJson() => {
    'part': part, 'label': label, 'icon': icon, 'desc': desc,
    'questions': questions.map((q) => q.toJson()).toList(),
  };

  factory TscPart.fromJson(Map<String, dynamic> j) => TscPart(
    part: (j['part'] as num).toInt(),
    label: j['label'] as String? ?? '',
    icon: j['icon'] as String? ?? '',
    desc: j['desc'] as String? ?? '',
    questions: (j['questions'] as List? ?? [])
        .map((e) => TscQuestion.fromJson((e as Map).cast<String, dynamic>()))
        .toList(),
  );
}

class TscQuestion {
  final String id;
  final String text;
  final String? imageUrl;
  final String? theme;          // 7부 4컷 그림 테마
  final List<String>? keywords; // 7부 핵심 키워드

  const TscQuestion({
    required this.id,
    required this.text,
    this.imageUrl,
    this.theme,
    this.keywords,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'text': text, 'imageUrl': imageUrl, 'theme': theme, 'keywords': keywords,
  };

  factory TscQuestion.fromJson(Map<String, dynamic> j) => TscQuestion(
    id: j['id'] as String? ?? '',
    text: j['text'] as String? ?? '',
    imageUrl: j['imageUrl'] as String?,
    theme: j['theme'] as String?,
    keywords: (j['keywords'] as List?)?.map((e) => e.toString()).toList(),
  );
}

class TscAnswer {
  final int partNum;
  final String question;
  final String answer;
  final String? imageUrl;
  final String? theme;          // 7부 채점용 테마
  final List<String>? keywords; // 7부 채점용 키워드

  const TscAnswer({
    required this.partNum,
    required this.question,
    required this.answer,
    this.imageUrl,
    this.theme,
    this.keywords,
  });

  Map<String, dynamic> toJson() => {
    'partNum': partNum, 'question': question, 'answer': answer,
    'imageUrl': imageUrl, 'theme': theme, 'keywords': keywords,
  };

  factory TscAnswer.fromJson(Map<String, dynamic> j) => TscAnswer(
    partNum: (j['partNum'] as num).toInt(),
    question: j['question'] as String? ?? '',
    answer: j['answer'] as String? ?? '',
    imageUrl: j['imageUrl'] as String?,
    theme: j['theme'] as String?,
    keywords: (j['keywords'] as List?)?.map((e) => e.toString()).toList(),
  );
}

// 파트 메타데이터 — TSC 실제 시험 구성 (SJPT와 동일 7파트 쌍둥이 시험, 라벨 동일·중국어 병기)
// prep/answer는 exam_screen _partConfig와 동일, count는 정식(모의) 기준
const kPartMeta = [
  {'part': 1, 'icon': '👤', 'label': '자기소개',                'kanji': '自我介绍', 'prep': 0,  'answer': 10, 'count': 4, 'desc': '이름·출신 등 기본 정보 말하기'},
  {'part': 2, 'icon': '🖼️', 'label': '그림 보고 답하기',         'kanji': '看图回答', 'prep': 3,  'answer': 6,  'count': 4, 'desc': '그림을 보고 짧게 답하기'},
  {'part': 3, 'icon': '💬', 'label': '대화 완성',               'kanji': '快速应答', 'prep': 2,  'answer': 15, 'count': 5, 'desc': '대화에 빠르게 응답하기'},
  {'part': 4, 'icon': '🗣️', 'label': '일상 화제에 대해 설명하기', 'kanji': '简短说明', 'prep': 15, 'answer': 25, 'count': 5, 'desc': '일상 주제를 설명하기'},
  {'part': 5, 'icon': '💡', 'label': '의견 제시',               'kanji': '陈述观点', 'prep': 30, 'answer': 50, 'count': 4, 'desc': '주제에 대한 의견 말하기'},
  {'part': 6, 'icon': '🎭', 'label': '상황 대응',               'kanji': '情景应对', 'prep': 30, 'answer': 40, 'count': 3, 'desc': '제시된 상황에 대응하기'},
  {'part': 7, 'icon': '📖', 'label': '스토리 구성',             'kanji': '看图叙述', 'prep': 30, 'answer': 90, 'count': 1, 'desc': '연속된 그림으로 이야기 구성'},
];
