import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class TtsService {
  TtsService._();
  static final TtsService instance = TtsService._();

  static const _apiKey = String.fromEnvironment('GOOGLE_TTS_API_KEY');
  // 중국어(만다린) 음성. zh-CN-Neural2-* 는 존재하지 않음 → cmn-CN 계열 Wavenet 사용.
  static const _voiceName = 'cmn-CN-Wavenet-A';
  static const _langCode = 'cmn-CN';

  final AudioPlayer _player = AudioPlayer();

  bool get isConfigured => _apiKey.isNotEmpty;

  Future<void> speakChinese(String text, {VoidCallback? onStart}) async {
    if (!isConfigured) return;
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    try {
      final file = await _resolveCache(trimmed);
      if (!await file.exists()) await _fetchAndCache(trimmed, file);
      await _player.stop();
      final completer = Completer<void>();
      _player.onPlayerComplete.first.then((_) => completer.complete());
      onStart?.call(); // 오디오 실제 재생 시작 = 자막 표시 시점 (음성과 자막 동기화)
      await _player.play(DeviceFileSource(file.path), mode: PlayerMode.mediaPlayer);
      await completer.future; // TTS 재생 완전히 끝날 때까지 대기
    } catch (e) {
      debugPrint('[TTS] error: $e');
    }
  }

  Future<void> stop() async => _player.stop();

  Future<void> _fetchAndCache(String text, File file) async {
    final res = await http.post(
      Uri.parse('https://texttospeech.googleapis.com/v1/text:synthesize?key=$_apiKey'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'input': {'text': text},
        'voice': {'languageCode': _langCode, 'name': _voiceName},
        'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': 0.95, 'pitch': 0.0},
      }),
    );
    if (res.statusCode != 200) throw StateError('TTS failed: ${res.statusCode}');
    final audio = (jsonDecode(res.body) as Map)['audioContent'] as String;
    final bytes = Uint8List.fromList(base64Decode(audio));
    await file.create(recursive: true);
    await file.writeAsBytes(bytes, flush: true);
  }

  Future<File> _resolveCache(String text) async {
    final tmp = await getTemporaryDirectory();
    final dir = Directory('${tmp.path}/tts_cache_tsc');
    if (!await dir.exists()) await dir.create(recursive: true);
    final key = text.hashCode.abs().toString();
    return File('${dir.path}/$key.mp3');
  }
}
