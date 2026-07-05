import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../models/tsc_model.dart';

class TscFeedback {
  final int overallScore;
  final String grade;
  final Map<String, int> scores;
  // 각 항목 키: part, strength, weakness, tip (또는 구버전 comment)
  final List<Map<String, String>> partFeedback;
  final List<String> improvements;
  final List<Map<String, String>> modelExpressions;

  const TscFeedback({
    required this.overallScore,
    required this.grade,
    required this.scores,
    required this.partFeedback,
    required this.improvements,
    required this.modelExpressions,
  });

  static Map<String, String> _strMap(dynamic e) =>
      (e as Map).map((k, v) => MapEntry(k.toString(), v?.toString() ?? ''));

  factory TscFeedback.fromJson(Map<String, dynamic> j) => TscFeedback(
    overallScore: (j['overall_score'] as num?)?.toInt() ?? 0,
    grade: j['grade'] as String? ?? 'Lv.1',
    scores: (j['scores'] as Map? ?? {})
        .map((k, v) => MapEntry(k.toString(), (v as num?)?.toInt() ?? 0)),
    partFeedback: (j['part_feedback'] as List? ?? []).map(_strMap).toList(),
    improvements: (j['improvements'] as List? ?? []).map((e) => e.toString()).toList(),
    modelExpressions: (j['model_expressions'] as List? ?? []).map(_strMap).toList(),
  );

  /// 로컬 기록 저장용 — fromJson이 그대로 되읽을 수 있게 API와 동일한 키로 직렬화.
  Map<String, dynamic> toJson() => {
    'overall_score': overallScore,
    'grade': grade,
    'scores': scores,
    'part_feedback': partFeedback,
    'improvements': improvements,
    'model_expressions': modelExpressions,
  };
}

class TscGradingService {
  static const _apiKey = String.fromEnvironment('OPENAI_API_KEY');

  static const _systemPrompt = '''당신은 중국어 TSC(Test of Spoken Chinese) 공인 채점관입니다.

평가 기준 (각 0~25점, 합계 100점):
- grammar: 어법 정확도 (어순/양사/시제·조사(了/过/着)/보어 오류 빈도 및 문장 구조 정확도)
- vocabulary: 상황에 맞는 단어 선택 및 어휘 다양성
- fluency: 문장 완성도, 답변 길이, 내용의 충실도
- pronunciation: 성조·발음 정확도 (STT 기반 간접 평가)

파트별 평가 포인트 (part_feedback 작성 시 반드시 아래 기준에 따라 구체적으로 서술):
- 1부(자기소개): 完整한 문장(주어+술어) 사용, 이름·거주지·생년월일·취미 정보 전달 정확도, 예의 바른 표현
- 2부(그림 보고 답하기): 위치·방위 표현(在/上/下/前/后/旁边), 존재문(有/是), 명사+단답 회피 여부
- 3부(대화 완성): 상황에 맞는 응답, 상대 발화에 자연스럽게 호응, 어투 일관성
- 4부(일상 화제 설명): 이유·근거 제시(因为/所以/由于), 구체적 예시 포함 여부, 화제 벗어남 여부
- 5부(의견 제시): 주장→이유→예시 논리 구조, 접속사(因为/所以/但是/而且/虽然/不过) 활용, 답변 길이(최소 3문장)
- 6부(상황 대응): 상황별 정중 표현(请/麻烦您/不好意思/建议), 요청·사과·제안 의도 명확성
- 7부(스토리 구성): 4컷 전체 커버 여부, 장면 전환 표현(首先/然后/接着/最后), 감정·행동 묘사 충실도

무응답 또는 "不知道/我不会说/听不懂" 등 회피 답변은 해당 파트 strength를 "없음"으로, weakness에 구체적으로 명시하세요.
STT 변환 특성상 성조·발음 오인식이 있을 수 있으므로 과도하게 감점하지 마세요.
답변이 짧거나 비어있으면 해당 항목은 0~5점 범위로 처리하세요.

반드시 아래 JSON 스키마로만 응답하세요. 그 외 텍스트나 마크다운 금지.

{
  "overall_score": <0~100 정수>,
  "grade": <"Lv.1"~"Lv.9" 중 하나>,
  "scores": { "grammar": <0~25>, "vocabulary": <0~25>, "fluency": <0~25>, "pronunciation": <0~25> },
  "part_feedback": [{
    "part": <1~7>,
    "strength": <잘된 점 — 구체적인 표현·어휘를 인용하여 1문장. 없으면 "없음">,
    "weakness": <아쉬운 점 — 틀리거나 어색한 표현을 직접 인용하고 이유를 설명하여 1~2문장>,
    "tip": <개선 팁 — 더 자연스러운 중국어 표현 예시를 반드시 포함하여 1문장>,
    "detail": <상세 분석 1문장 — 해당 부의 평가 포인트(위 파트별 기준)에 비춰 답변을 한 단계 더 깊이 진단. strength·weakness와 겹치지 않는 새로운 관찰을 담을 것>
  }],
  "improvements": [<개선점1>, <개선점2>, <개선점3>],
  "model_expressions": [{ "situation": <상황설명>, "natural_expression": <더 자연스러운 중국어 표현> }]
}''';

  // 7부가 포함된 경우 표준 프롬프트에 덧붙이는 보조 지침
  static String _part7Guide(String theme, String keywords) =>
      '''


【7부 추가 지침】7부는 4컷 그림 스토리 묘사 문제입니다.
테마: $theme
핵심 키워드: $keywords
- fluency: 4컷 전체 커버 여부를 최우선 평가 — 언급된 컷 수를 weakness 또는 strength에 명시
- vocabulary: 위 핵심 키워드 활용도 반영 (동의어·유의어 인정)
- part 7의 tip에는 반드시 더 자연스러운 중국어 서술 예시 1문장을 포함하세요''';

  static String _buildUserMessage(List<TscAnswer> answers, String level) {
    final buf = StringBuffer('응시 정보: 목표 레벨 - $level, 총 ${answers.length}문항\n\n');
    for (final a in answers) {
      final ans = a.answer.trim().isEmpty ? '(무응답)' : a.answer.trim();
      if (a.partNum == 7) {
        buf.writeln('[Part 7 — 4컷 그림 스토리 묘사]');
        buf.writeln('테마: ${a.theme ?? ''}');
        buf.writeln('핵심 키워드: ${(a.keywords ?? []).join(', ')}');
        buf.writeln('Q: ${a.question}');
        buf.writeln('A: $ans');
        buf.writeln();
      } else {
        buf.writeln('[Part ${a.partNum}]');
        buf.writeln('Q: ${a.question}');
        buf.writeln('A: $ans');
        buf.writeln();
      }
    }
    return buf.toString();
  }

  /// [mini]=true → gpt-4o-mini(미니 응시권), false → gpt-4o(모의 정상시험). 이누짱과 동일.
  static Future<TscFeedback> grade(
    List<TscAnswer> answers, {
    bool mini = true,
    String level = '중급',
  }) async {
    if (_apiKey.isEmpty) throw StateError('OPENAI_API_KEY not configured');

    final model = mini ? 'gpt-4o-mini' : 'gpt-4o';

    TscAnswer? part7;
    for (final a in answers) {
      if (a.partNum == 7) { part7 = a; break; }
    }
    final systemPrompt = part7 != null
        ? _systemPrompt + _part7Guide(part7.theme ?? '', (part7.keywords ?? []).join('·'))
        : _systemPrompt;

    final body = jsonEncode({
      'model': model,
      'temperature': 0.3,
      'response_format': {'type': 'json_object'},
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        {'role': 'user', 'content': _buildUserMessage(answers, level)},
      ],
    });

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final res = await http.post(
          Uri.parse('https://api.openai.com/v1/chat/completions'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $_apiKey',
          },
          body: body,
        );
        if (res.statusCode != 200) throw StateError('OpenAI ${res.statusCode}');
        final raw = (jsonDecode(res.body) as Map)['choices'][0]['message']['content'] as String;
        final cleaned = raw.replaceAll(RegExp(r'^```(?:json)?\n?'), '').replaceAll(RegExp(r'\n?```$'), '').trim();
        return TscFeedback.fromJson(jsonDecode(cleaned) as Map<String, dynamic>);
      } catch (e) {
        if (attempt == 1) rethrow;
        debugPrint('[Grading] retry after error: $e');
      }
    }
    throw StateError('채점 실패');
  }
}
