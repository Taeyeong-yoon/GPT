import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/package_model.dart';
import '../../models/tsc_model.dart';

/// 진행 중이던 시험의 스냅샷. 앱이 중간에 종료돼도 답변·진행위치를 복구하기 위함.
class ExamProgress {
  final PackageType packageType;
  final List<TscPart> parts;
  final List<TscAnswer> answers;
  final int partIdx;     // 다음에 응답할 파트 인덱스
  final int questionIdx; // 다음에 응답할 문항 인덱스
  final DateTime savedAt;

  const ExamProgress({
    required this.packageType,
    required this.parts,
    required this.answers,
    required this.partIdx,
    required this.questionIdx,
    required this.savedAt,
  });

  /// 미니 응시권 = gpt-4o-mini 채점, 모의 정상시험 = gpt-4o (ResultScreen.mini와 동일 규칙)
  bool get mini => packageType != PackageType.mockExam;
}

/// 시험 진행상황을 로컬(SharedPreferences)에 단계마다 저장/복구/삭제.
/// 응시권은 시험 시작 시 이미 차감되므로, 중단되어도 답변을 살려 응시권 손해를 막는다.
abstract final class ExamProgressStore {
  static const _key = 'exam_progress_v1';

  static Future<void> save({
    required PackageType packageType,
    required List<TscPart> parts,
    required List<TscAnswer> answers,
    required int partIdx,
    required int questionIdx,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = jsonEncode({
        'packageType': packageType.name,
        'parts': parts.map((p) => p.toJson()).toList(),
        'answers': answers.map((a) => a.toJson()).toList(),
        'partIdx': partIdx,
        'questionIdx': questionIdx,
        'savedAt': DateTime.now().toIso8601String(),
      });
      await prefs.setString(_key, data);
    } catch (e) {
      debugPrint('[ExamProgress] save fail: $e');
    }
  }

  static Future<ExamProgress?> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null || raw.isEmpty) return null;

      final j = jsonDecode(raw) as Map<String, dynamic>;
      final parts = (j['parts'] as List? ?? [])
          .map((e) => TscPart.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
      if (parts.isEmpty) return null;

      return ExamProgress(
        packageType: PackageType.values.byName(j['packageType'] as String),
        parts: parts,
        answers: (j['answers'] as List? ?? [])
            .map((e) => TscAnswer.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        partIdx: (j['partIdx'] as num?)?.toInt() ?? 0,
        questionIdx: (j['questionIdx'] as num?)?.toInt() ?? 0,
        savedAt: DateTime.tryParse(j['savedAt'] as String? ?? '') ?? DateTime.now(),
      );
    } catch (e) {
      debugPrint('[ExamProgress] load fail: $e');
      // 손상된 데이터는 깨끗이 비워 다음 실행에 영향 없게
      await clear();
      return null;
    }
  }

  static Future<void> clear() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_key);
    } catch (e) {
      debugPrint('[ExamProgress] clear fail: $e');
    }
  }
}
