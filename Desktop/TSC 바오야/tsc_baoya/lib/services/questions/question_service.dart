import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../models/package_model.dart';
import '../../models/tsc_model.dart';

abstract final class QuestionService {
  // AI-OPIC.COM API 직접 호출 → 항상 동일한 문제 사용
  static const _base = 'https://ai-opic.com';
  static const _apiUrl = '$_base/api/baoya-questions';

  // API가 이미지를 상대경로(/baoya/...)로 주면 Flutter에서 로드 불가 → 도메인 붙여 절대경로화
  static String? _absUrl(String? u) {
    if (u == null || u.isEmpty) return null;
    return u.startsWith('/') ? '$_base$u' : u;
  }

  static Future<List<TscPart>> loadParts(PackageType type) async {
    // 일시적 네트워크 끊김·서버 콜드스타트로 인한 1회성 실패 완화 → 최대 2회 시도
    Object? lastErr;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        return await _loadOnce(type);
      } catch (e) {
        lastErr = e;
        if (attempt == 0) await Future.delayed(const Duration(milliseconds: 600));
      }
    }
    throw lastErr ?? Exception('문제 로드 실패');
  }

  static Future<List<TscPart>> _loadOnce(PackageType type) async {
    try {
      final res = await http
          .get(Uri.parse('$_apiUrl?t=${DateTime.now().millisecondsSinceEpoch}'))
          .timeout(const Duration(seconds: 10));

      if (res.statusCode != 200) throw Exception('API ${res.statusCode}');

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['ok'] != true) throw Exception(data['error']?['message'] ?? '문제 로드 실패');

      final rawParts = (data['parts'] as List).cast<Map<String, dynamic>>();
      final parts = <TscPart>[];

      for (final raw in rawParts) {
        final partNum = raw['part'] as int;
        final rawQs = (raw['questions'] as List).cast<Map<String, dynamic>>();

        final pool = rawQs.map((q) => TscQuestion(
          id: q['id']?.toString() ?? 'q_$partNum',
          text: q['text']?.toString() ?? '',
          imageUrl: _absUrl(q['imageUrl']?.toString()),
          theme: q['theme']?.toString(),
          keywords: (q['keywords'] as List?)?.map((e) => e.toString()).toList(),
        )).where((q) => q.text.isNotEmpty).toList();

        // Part 1은 고정 문항이므로 순서 유지, 나머지는 랜덤 추출
        final n = tscQuestionCount(type, partNum);
        if (partNum != 1) pool.shuffle(Random());
        final picked = pool.take(n).toList();

        final meta = kPartMeta.firstWhere(
          (m) => m['part'] == partNum,
          orElse: () => {'label': '제${partNum}부', 'icon': '📝', 'desc': ''},
        );

        parts.add(TscPart(
          part: partNum,
          label: meta['label'] as String,
          icon: meta['icon'] as String,
          desc: meta['desc'] as String,
          questions: picked,
        ));
      }

      // 문항이 0개인 파트는 제외 — ExamScreen의 questions[0] 접근 시 RangeError 크래시 방지
      final nonEmpty = parts.where((p) => p.questions.isNotEmpty).toList();
      if (nonEmpty.isEmpty) throw Exception('출제 가능한 문제가 없습니다');
      debugPrint('[QS] AI-OPIC.COM에서 ${nonEmpty.length}개 파트 로드 완료');
      return nonEmpty;
    } catch (e) {
      debugPrint('[QS] AI-OPIC.COM 로드 실패: $e');
      rethrow;
    }
  }
}
