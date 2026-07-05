import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/package_model.dart';
import '../../models/tsc_model.dart';
import '../ai/tsc_grading_service.dart';

/// 채점 완료된 한 번의 응시 결과(답변 + AI 피드백)를 로컬에 보관하는 단위.
/// 응시권으로 산 유료 결과물이므로 실수로 결과 화면을 나가도 다시 볼 수 있게 저장한다.
class ResultRecord {
  final String id;
  final DateTime savedAt;
  final PackageType packageType;
  final List<TscAnswer> answers;
  final TscFeedback feedback;

  const ResultRecord({
    required this.id,
    required this.savedAt,
    required this.packageType,
    required this.answers,
    required this.feedback,
  });

  bool get mini => packageType != PackageType.mockExam;

  Map<String, dynamic> toJson() => {
    'id': id,
    'savedAt': savedAt.toIso8601String(),
    'packageType': packageType.name,
    'answers': answers.map((a) => a.toJson()).toList(),
    'feedback': feedback.toJson(),
  };

  factory ResultRecord.fromJson(Map<String, dynamic> j) => ResultRecord(
    id: j['id'] as String? ?? '',
    savedAt: DateTime.tryParse(j['savedAt'] as String? ?? '') ?? DateTime.now(),
    packageType: PackageType.values.byName(
      (j['packageType'] as String?) ?? PackageType.miniBasic.name,
    ),
    answers: (j['answers'] as List? ?? [])
        .map((e) => TscAnswer.fromJson((e as Map).cast<String, dynamic>()))
        .toList(),
    feedback: TscFeedback.fromJson(
      (j['feedback'] as Map? ?? {}).cast<String, dynamic>(),
    ),
  );
}

/// 응시 결과 기록 로컬 저장소. 최근 [_cap]개만 유지(오래된 것부터 자동 밀려남), 수동 삭제 지원.
abstract final class ResultHistoryStore {
  static const _key = 'result_history_v1';
  static const int cap = 20; // 최근 20개 상한

  /// 새 결과를 맨 앞에 추가하고 20개를 초과하면 가장 오래된 것을 버린다.
  static Future<void> save(ResultRecord record) async {
    try {
      final list = await loadAll();
      list.removeWhere((r) => r.id == record.id); // 혹시 같은 id면 갱신
      list.insert(0, record);
      final capped = list.take(cap).toList();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key,
        jsonEncode(capped.map((r) => r.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('[ResultHistory] save fail: $e');
    }
  }

  static Future<List<ResultRecord>> loadAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null || raw.isEmpty) return [];
      final arr = jsonDecode(raw) as List;
      return arr
          .map((e) => ResultRecord.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
    } catch (e) {
      debugPrint('[ResultHistory] load fail: $e');
      return [];
    }
  }

  static Future<void> delete(String id) async {
    try {
      final list = await loadAll();
      list.removeWhere((r) => r.id == id);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key,
        jsonEncode(list.map((r) => r.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('[ResultHistory] delete fail: $e');
    }
  }
}
