import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class SttService {
  SttService._();
  static final SttService instance = SttService._();

  static const _apiKey = String.fromEnvironment('OPENAI_API_KEY');

  bool get isConfigured => _apiKey.isNotEmpty;

  // Whisper가 무음/잡음에서 자주 지어내는 중국어 환각 문구 — 이것만 나오면 무응답 처리
  static const _hallucinations = {
    '谢谢大家',
    '谢谢观看',
    '请点赞订阅',
    '请不吝点赞订阅转发打赏支持明镜与点点栏目',
    '字幕由amara社区提供',
    '明镜需要您的支持',
    '谢谢观看请订阅',
    '下次见',
  };

  static String _filterHallucination(String text) {
    final t = text.replaceAll(RegExp(r'[。、!！?？\s，,]'), '');
    return _hallucinations.contains(t) ? '' : text;
  }

  // 머뭇거림/맞장구 필러 — 이것만 남으면 실질 무응답
  static const _fillers = {
    '嗯', '啊', '呃', '哦', '那个', '这个', '就是', '然后', '那', '这', '呀', '吧', '嗯嗯',
  };

  /// Whisper 반복 환각 정리. 반복·필러만 있는 쓰레기 결과는 '' 로 만들어 '무응답' 처리되게 함.
  static String _cleanTranscript(String text) {
    final t = text.trim();
    if (t.isEmpty) return '';
    final core = t.replaceAll(RegExp(r'[\s、。，．,.!！?？・ー~〜ｰ]+'), '');
    if (core.isEmpty) return '';

    // (1) 한 글자가 전체의 60% 이상 차지(길이 6+) → 단일 토큰 반복 환각 → 무응답
    if (core.length >= 6) {
      final counts = <String, int>{};
      for (final ch in core.split('')) {
        counts[ch] = (counts[ch] ?? 0) + 1;
      }
      final maxC = counts.values.fold<int>(0, (a, b) => a > b ? a : b);
      if (maxC / core.length >= 0.6) return '';
    }

    // (2) 필러/맞장구를 빼면 실제 내용이 거의 없음 → 무응답
    final tokens = t.split(RegExp(r'[\s、。，．,.!！?？・]+')).where((e) => e.isNotEmpty);
    final nonFiller = tokens.where((tok) => !_fillers.contains(tok)).join();
    if (nonFiller.replaceAll(RegExp(r'[ー~〜\s]+'), '').length < 2) return '';

    return t;
  }

  /// verbose_json 세그먼트에서 환각/무음 구간 제거 후 본문만 합침.
  /// OpenAI 권장 휴리스틱: no_speech_prob 높음 + 신뢰도 낮음 = 음성 아님,
  /// compression_ratio 큼 = 반복 환각.
  static String _fromVerboseJson(String body) {
    try {
      final data = jsonDecode(body) as Map<String, dynamic>;
      final segments = data['segments'] as List?;
      if (segments == null || segments.isEmpty) {
        return _cleanTranscript(_filterHallucination((data['text'] ?? '').toString().trim()));
      }
      final kept = <String>[];
      for (final s in segments.cast<Map<String, dynamic>>()) {
        final noSpeech = (s['no_speech_prob'] as num?)?.toDouble() ?? 0.0;
        final avgLogprob = (s['avg_logprob'] as num?)?.toDouble() ?? 0.0;
        final compRatio = (s['compression_ratio'] as num?)?.toDouble() ?? 1.0;
        final text = (s['text'] ?? '').toString().trim();
        if (text.isEmpty) continue;
        // 무음 구간: 음성 아닐 확률 높고 신뢰도도 낮음
        if (noSpeech > 0.6 && avgLogprob < -0.4) continue;
        // 거의 확실한 무음
        if (noSpeech > 0.85) continue;
        // 반복 환각(같은 말 도배) / 신뢰도 바닥
        if (compRatio > 2.4 || avgLogprob < -1.0) continue;
        kept.add(text);
      }
      return _cleanTranscript(_filterHallucination(kept.join(' ').trim()));
    } catch (e) {
      debugPrint('[STT] verbose parse fail: $e');
      return '';
    }
  }

  /// m4a 파일 경로를 받아 중국어 텍스트로 변환
  Future<String> transcribe(String filePath) async {
    if (_apiKey.isEmpty) throw StateError('OPENAI_API_KEY not configured');

    final file = File(filePath);
    if (!await file.exists()) return '';

    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) return '';

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        // MultipartRequest는 1회용 → 재시도마다 새로 생성
        final request = http.MultipartRequest(
          'POST',
          Uri.parse('https://api.openai.com/v1/audio/transcriptions'),
        )
          ..headers['Authorization'] = 'Bearer $_apiKey'
          ..fields['model'] = 'whisper-1'
          ..fields['language'] = 'zh'
          ..fields['temperature'] = '0' // 환각(없는 말 지어내기) 억제
          ..fields['response_format'] = 'verbose_json' // 세그먼트별 no_speech_prob 등 획득
          ..files.add(http.MultipartFile.fromBytes(
            'file',
            bytes,
            filename: 'answer.m4a',
          ));

        final streamed = await request.send();
        final body = await streamed.stream.bytesToString();
        if (streamed.statusCode == 200) return _fromVerboseJson(body);
        debugPrint('[STT] error ${streamed.statusCode}: $body');
        if (attempt == 1) return '';
      } catch (e) {
        debugPrint('[STT] retry after: $e');
        if (attempt == 1) return '';
      }
    }
    return '';
  }
}
