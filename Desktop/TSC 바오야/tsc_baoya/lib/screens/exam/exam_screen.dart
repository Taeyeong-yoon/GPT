import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../models/tsc_model.dart';
import '../../services/audio/stt_service.dart';
import '../../services/audio/tts_service.dart';
import '../../services/exam/exam_progress_store.dart';
import '../../services/purchase/tsc_backend.dart';
import '../result/result_screen.dart';

// 부별 준비시간·답변시간 — SJPT와 동일 7파트 쌍둥이 기준
const _partConfig = {
  1: (prep: 0,  answer: 10),
  2: (prep: 3,  answer: 6),
  3: (prep: 2,  answer: 15),
  4: (prep: 15, answer: 25),
  5: (prep: 30, answer: 50),
  6: (prep: 30, answer: 40),
  7: (prep: 30, answer: 90),
};

const _partName = {
  1: '자기소개',
  2: '그림 보고 답하기',
  3: '대화 완성',
  4: '일상 화제에 대해 설명하기',
  5: '의견 제시',
  6: '상황 대응',
  7: '스토리 구성',
};

const _partChinese = {
  1: '自我介绍', 2: '看图回答', 3: '快速应答', 4: '简短说明',
  5: '陈述观点', 6: '情景应对', 7: '看图叙述',
};

const _partDesc = {
  1: '자신을 중국어로 소개하는 파트입니다.\n준비 시간 없이 바로 녹음이 시작됩니다.',
  2: '화면에 제시된 그림을 보고 짧게 답하는 파트입니다.',
  3: '짧은 대화를 듣고 이어지는 말을 완성하는 파트입니다.',
  4: '일상적인 주제에 대해 자신의 생각을 설명하는 파트입니다.',
  5: '주어진 주제에 대한 의견을 논리적으로 말하는 파트입니다.',
  6: '제시된 상황에 맞게 적절히 대응하는 파트입니다.',
  7: '연속된 그림을 보고 이야기를 구성하여 말하는 파트입니다.',
};

class ExamScreen extends StatefulWidget {
  final TscPackage package;
  final List<TscPart> parts;
  final ExamProgress? resume; // null이면 새 시험, 있으면 중단 지점부터 이어서
  final String? sessionId; // 서버 시험 세션 ID (완료 시 닫아 무료 재개 차단)

  const ExamScreen({
    super.key,
    required this.package,
    required this.parts,
    this.resume,
    this.sessionId,
  });

  @override
  State<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends State<ExamScreen> {
  int _partIdx = 0;
  int _questionIdx = 0;
  final List<TscAnswer> _answers = [];

  int _countdown = 0;
  Timer? _timer;
  Timer? _autoNextTimer;

  // question | prep | recording | transcribing | done | partIntro
  String _phase = 'partIntro';

  final _recorder = AudioRecorder();
  final _beepPlayer = AudioPlayer();
  double _peakDb = -160.0;            // 녹음 중 최대 음량 (dBFS)
  StreamSubscription<Amplitude>? _ampSub;
  String? _lastRecordingPath;
  String? _lastTranscribedText;
  bool _ttsLoading = false;
  bool _autoStarted = false;
  bool _textRevealed = false; // 이미지 파트: TTS 재생 시 자막 표시

  TscPart get _currentPart => widget.parts[_partIdx];
  TscQuestion get _currentQuestion => _currentPart.questions[_questionIdx];
  int get _totalQuestions => widget.parts.fold(0, (s, p) => s + p.questions.length);
  int get _totalAnswered => _answers.length;

  ({int prep, int answer}) get _cfg =>
      _partConfig[_currentPart.part] ?? (prep: 15, answer: 60);

  @override
  void initState() {
    super.initState();
    final r = widget.resume;
    if (r != null) {
      _answers.addAll(r.answers);
      _partIdx = r.partIdx;
      _questionIdx = r.questionIdx;
      // 저장 시점이 시험 완료 직전이었다면(인덱스 초과) 바로 채점으로
      if (_partIdx >= widget.parts.length) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _goToResult());
        return;
      }
      _phase = 'question';
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _handleSpeak();
      });
    } else {
      // 새 시험: 시작 시점 상태를 즉시 저장 → 첫 문항 전에 종료돼도 응시권 복구 가능
      _persist();
    }
  }

  // 현재 진행상황을 로컬에 저장 (앱 종료 시 복구용)
  void _persist() {
    ExamProgressStore.save(
      packageType: widget.package.type,
      parts: widget.parts,
      answers: _answers,
      partIdx: _partIdx,
      questionIdx: _questionIdx,
    );
  }

  void _goToResult() {
    ExamProgressStore.clear();
    // 시험 완료 → 서버 세션 닫기(완료한 시도는 무료 재개 불가). 실패해도 결과 표시엔 영향 없음.
    final sid = widget.sessionId;
    if (sid != null) {
      TscBackend.completeExam(sessionId: sid);
    }
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => ResultScreen(
          answers: List.unmodifiable(_answers),
          mini: widget.package.type != PackageType.mockExam,
          packageType: widget.package.type,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _autoNextTimer?.cancel();
    _ampSub?.cancel();
    _recorder.dispose();
    _beepPlayer.dispose();
    TtsService.instance.stop();
    super.dispose();
  }

  // 삐 신호음 (880Hz, 0.35초)
  Future<void> _playBeep() async {
    try {
      const sampleRate = 44100;
      const frequency = 880.0;
      const numSamples = sampleRate * 35 ~/ 100; // 0.35초
      final pcm = List<int>.generate(numSamples, (i) {
        final t = i / sampleRate;
        final env = i < 441 ? i / 441.0 : math.max(0.0, (numSamples - i) / numSamples.toDouble());
        return (32767 * env * math.sin(2 * math.pi * frequency * t)).round().clamp(-32768, 32767);
      });
      final dataSize = numSamples * 2;
      final buf = ByteData(44 + dataSize);
      void str(int o, String s) { for (var i = 0; i < s.length; i++) buf.setUint8(o + i, s.codeUnitAt(i)); }
      str(0, 'RIFF'); buf.setUint32(4, 36 + dataSize, Endian.little);
      str(8, 'WAVE'); str(12, 'fmt ');
      buf.setUint32(16, 16, Endian.little); buf.setUint16(20, 1, Endian.little);
      buf.setUint16(22, 1, Endian.little);  buf.setUint32(24, sampleRate, Endian.little);
      buf.setUint32(28, sampleRate * 2, Endian.little); buf.setUint16(32, 2, Endian.little);
      buf.setUint16(34, 16, Endian.little); str(36, 'data');
      buf.setUint32(40, dataSize, Endian.little);
      for (var i = 0; i < numSamples; i++) buf.setInt16(44 + i * 2, pcm[i], Endian.little);
      await _beepPlayer.play(BytesSource(buf.buffer.asUint8List()));
      await _beepPlayer.onPlayerComplete.first;
    } catch (_) {}
  }

  void _startTimer(int sec, VoidCallback onEnd) {
    _timer?.cancel();
    setState(() => _countdown = sec);
    if (sec <= 0) { onEnd(); return; }
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() {
        if (_countdown <= 1) {
          t.cancel();
          onEnd();
        } else {
          _countdown--;
        }
      });
    });
  }

  // 녹음 시작 성공 여부 반환 (권한은 _beginRecording에서 미리 확인)
  Future<bool> _startRecording() async {
    try {
      final tmp = await getTemporaryDirectory();
      final path = '${tmp.path}/answer_${_partIdx}_$_questionIdx.m4a';
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 128000, sampleRate: 44100),
        path: path,
      );
      // 녹음 중 최대 음량 추적 — 무음이면 STT 건너뛰어 Whisper 환각 방지
      _peakDb = -160.0;
      _ampSub?.cancel();
      _ampSub = _recorder
          .onAmplitudeChanged(const Duration(milliseconds: 200))
          .listen((amp) {
        if (amp.current > _peakDb) _peakDb = amp.current;
      });
      return true;
    } catch (e) {
      debugPrint('[Rec] start fail: $e');
      return false;
    }
  }

  // 권한 거부/녹음 실패 시 빈 녹음으로 시간만 흘려보내지 않고 무응답 처리 + 안내
  void _skipAsNoAnswer(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
    );
    _lastRecordingPath = '';
    _lastTranscribedText = '(무응답)';
    setState(() => _phase = 'done');
    _autoNextTimer = Timer(const Duration(milliseconds: 2500), _handleNext);
  }

  Future<String?> _stopRecording() async {
    try { return await _recorder.stop(); } catch (_) { return null; }
  }

  // TTS 재생 후 → 자동으로 준비시간 → 녹음 시작
  Future<void> _handleSpeak() async {
    if (_ttsLoading || (_phase != 'question' && _phase != 'partIntro')) return;
    setState(() => _ttsLoading = true);

    // 순서 보장: 이미지가 있으면 먼저 완전히 받아 화면에 띄운 뒤 음성 재생
    final imageUrl = _currentQuestion.imageUrl ?? '';
    if (imageUrl.isNotEmpty) {
      try {
        await precacheImage(NetworkImage(imageUrl), context)
            .timeout(const Duration(seconds: 6));
      } catch (_) {}
      if (!mounted) return;
      // 이미지 표시 후 한 프레임 그려지도록 잠깐 대기
      await Future.delayed(const Duration(milliseconds: 150));
    }

    try {
      // 자막은 음성이 실제로 재생되는 순간에 표시 → 미리 읽고 시간 버는 문제 방지
      await TtsService.instance.speakChinese(
        _currentQuestion.text,
        onStart: () { if (mounted) setState(() => _textRevealed = true); },
      );
    } catch (_) {}
    if (!mounted) return;
    setState(() => _ttsLoading = false);

    if (_cfg.prep > 0) {
      setState(() => _phase = 'prep');
      _startTimer(_cfg.prep, _beginRecording);
    } else {
      _beginRecording();
    }
  }

  Future<void> _beginRecording() async {
    // 권한을 신호음 전에 확인 → 거부 시 이 문항은 무응답 처리하고 다음으로
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      _skipAsNoAnswer('마이크 권한이 없어 이 문항을 건너뜁니다. 설정에서 마이크를 허용해주세요.');
      return;
    }
    await _playBeep(); // 삐 신호음 후 녹음 시작 (신호음이 녹음에 섞이지 않도록 녹음 전에 재생)
    final ok = await _startRecording();
    if (!ok) {
      _skipAsNoAnswer('녹음을 시작할 수 없습니다. 이 문항을 건너뜁니다.');
      return;
    }
    setState(() => _phase = 'recording');
    _startTimer(_cfg.answer, _handleFinishAnswer);
  }

  void _handleFinishAnswer() {
    _timer?.cancel();
    _ampSub?.cancel();
    _stopRecording().then((path) async {
      _lastRecordingPath = path ?? '';
      if (mounted) setState(() => _phase = 'transcribing');

      // 음량이 사실상 무음(-40dBFS 미만)이면 Whisper 환각 방지를 위해 STT 생략
      final wasSilent = _peakDb < -40.0;
      debugPrint('[Rec] peakDb=$_peakDb wasSilent=$wasSilent');

      String text = '';
      if (!wasSilent && _lastRecordingPath!.isNotEmpty) {
        text = await SttService.instance.transcribe(_lastRecordingPath!);
      }
      _lastTranscribedText = text.isEmpty ? '(무응답)' : text;

      if (mounted) {
        setState(() => _phase = 'done');
        // 2.5초 후 자동 다음 문항
        _autoNextTimer = Timer(const Duration(milliseconds: 2500), _handleNext);
      }
    });
  }

  void _handleNext() {
    _autoNextTimer?.cancel();
    final answer = TscAnswer(
      partNum: _currentPart.part,
      question: _currentQuestion.text,
      answer: _lastTranscribedText ?? '(무응답)',
      imageUrl: _currentQuestion.imageUrl,
      theme: _currentQuestion.theme,
      keywords: _currentQuestion.keywords,
    );
    _answers.add(answer);
    _lastRecordingPath = null;
    _lastTranscribedText = null;

    final nextQIdx = _questionIdx + 1;
    if (nextQIdx < _currentPart.questions.length) {
      setState(() { _questionIdx = nextQIdx; _phase = 'question'; _autoStarted = false; _textRevealed = false; });
      _persist();
      Future.delayed(const Duration(milliseconds: 400), _handleSpeak);
    } else {
      final nextPIdx = _partIdx + 1;
      if (nextPIdx < widget.parts.length) {
        setState(() { _partIdx = nextPIdx; _questionIdx = 0; _phase = 'partIntro'; _autoStarted = false; _textRevealed = false; });
        _persist();
      } else {
        _goToResult();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_phase == 'partIntro') return _buildPartIntro();

    final progressPct = _totalQuestions > 0 ? _totalAnswered / _totalQuestions : 0.0;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            // 진행률 헤더
            Padding(
              padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, 0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '제${_currentPart.part}부 · ${_totalAnswered + 1}/$_totalQuestions',
                        style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w700, color: AppColors.textMid),
                      ),
                      Text(
                        widget.package.title,
                        style: GoogleFonts.nunito(fontSize: 12.sp, color: AppColors.textLight),
                      ),
                    ],
                  ),
                  SizedBox(height: 8.h),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4.r),
                    child: LinearProgressIndicator(
                      value: progressPct,
                      minHeight: 6.h,
                      backgroundColor: AppColors.brownL,
                      color: widget.package.color,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16.h),

            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(horizontal: 20.w),
                child: Column(
                  children: [
                    // 질문 카드
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(18.r),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20.r),
                        border: Border.all(color: AppColors.brownL),
                      ),
                      child: Column(
                        children: [
                          // 이미지: 항상 표시 (URL이 유효한 경우만)
                          if ((_currentQuestion.imageUrl ?? '').isNotEmpty) ...[
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12.r),
                              child: Image.network(
                                _currentQuestion.imageUrl!,
                                height: 240.h,
                                width: double.infinity,
                                // 문제 그림은 전체가 보여야 하므로 잘림 없이(contain) 표시
                                fit: BoxFit.contain,
                                // 로딩 중 자리 확보 (자막보다 이미지가 늦게 떠 보이는 현상 방지)
                                loadingBuilder: (_, child, progress) => progress == null
                                    ? child
                                    : Container(
                                        height: 240.h,
                                        alignment: Alignment.center,
                                        color: AppColors.brownL.withValues(alpha: 0.3),
                                        child: CircularProgressIndicator(color: AppColors.orange, strokeWidth: 2),
                                      ),
                                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                              ),
                            ),
                            SizedBox(height: 12.h),
                          ],
                          // 자막: 이미지 없는 파트는 항상 표시, 이미지 있는 파트는 TTS 재생 후 표시
                          if ((_currentQuestion.imageUrl ?? '').isEmpty || _textRevealed)
                            Text(
                              _currentQuestion.text,
                              style: GoogleFonts.nunito(fontSize: 17.sp, fontWeight: FontWeight.w700, color: AppColors.text, height: 1.5),
                              textAlign: TextAlign.center,
                            ),
                          if ((_currentQuestion.imageUrl ?? '').isNotEmpty && !_textRevealed && _phase == 'question')
                            Text(
                              '버튼을 누르면 음성과 함께 자막이 표시됩니다',
                              style: GoogleFonts.nunito(fontSize: 12.sp, color: AppColors.textLight),
                              textAlign: TextAlign.center,
                            ),
                          if (_phase == 'question') ...[
                            SizedBox(height: 12.h),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: _ttsLoading ? null : _handleSpeak,
                                icon: Icon(Icons.volume_up_rounded, size: 18.sp),
                                label: Text(
                                  _ttsLoading ? '재생 중...' : '🔊 문제 듣기',
                                  style: GoogleFonts.nunito(fontSize: 15.sp, fontWeight: FontWeight.w800),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: widget.package.color,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                                  padding: EdgeInsets.symmetric(vertical: 12.h),
                                ),
                              ),
                            ),
                            SizedBox(height: 6.h),
                            Text(
                              '버튼을 누르면 준비 후 자동으로 녹음이 시작됩니다',
                              style: GoogleFonts.nunito(fontSize: 11.sp, color: AppColors.textLight),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ],
                      ),
                    ),
                    SizedBox(height: 16.h),

                    if (_phase == 'prep')
                      _CountdownCard(
                        label: '준비 시간 — 곧 신호음과 함께 답변이 시작됩니다',
                        count: _countdown,
                        color: AppColors.orange,
                      ),

                    if (_phase == 'recording')
                      _RecordingCard(
                        countdown: _countdown,
                        color: widget.package.color,
                        onFinish: _handleFinishAnswer,
                      ),

                    if (_phase == 'transcribing')
                      _TranscribingCard(),

                    if (_phase == 'done')
                      _DoneCard(
                        transcribedText: _lastTranscribedText,
                        onNext: _handleNext,
                        isLast: _totalAnswered + 1 >= _totalQuestions,
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 부 안내 화면
  Widget _buildPartIntro() {
    final part = _currentPart.part;
    final cfg = _partConfig[part] ?? (prep: 0, answer: 60);
    final isFirst = _partIdx == 0;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 28.w),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  isFirst ? '지금부터 시작합니다' : '이제부터',
                  style: GoogleFonts.nunito(fontSize: 14.sp, color: AppColors.textMid, fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 20.h),
                Image.asset('assets/pandas/bao_home.png', height: 120.h),
                SizedBox(height: 20.h),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20.r),
                    border: Border.all(color: AppColors.brownL),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '제${part}부',
                        style: GoogleFonts.nunito(fontSize: 28.sp, fontWeight: FontWeight.w900, color: widget.package.color),
                      ),
                      Text(
                        _partName[part] ?? '',
                        style: GoogleFonts.nunito(fontSize: 18.sp, fontWeight: FontWeight.w700, color: AppColors.text),
                      ),
                      Text(
                        _partChinese[part] ?? '',
                        style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w600, color: AppColors.textLight),
                      ),
                      SizedBox(height: 12.h),
                      Text(
                        _partDesc[part] ?? '',
                        style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.textMid, height: 1.6),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: 12.h),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _TimingChip(label: '준비', value: cfg.prep > 0 ? '${cfg.prep}초' : '없음', color: AppColors.orange),
                          SizedBox(width: 12.w),
                          _TimingChip(label: '답변', value: '${cfg.answer}초', color: widget.package.color),
                        ],
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 28.h),
                SizedBox(
                  width: double.infinity,
                  height: 52.h,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() { _phase = 'question'; _autoStarted = false; });
                      Future.delayed(const Duration(milliseconds: 400), _handleSpeak);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: widget.package.color,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                    ),
                    child: Text(
                      '시작하기 →',
                      style: GoogleFonts.nunito(fontSize: 17.sp, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TimingChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _TimingChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20.r),
      ),
      child: Text(
        '$label $value',
        style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}

class _CountdownCard extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _CountdownCard({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(24.r),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20.r),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(label, style: GoogleFonts.nunito(fontSize: 13.sp, color: color, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          SizedBox(height: 8.h),
          Text('$count', style: GoogleFonts.nunito(fontSize: 56.sp, fontWeight: FontWeight.w900, color: color)),
          Text('초', style: GoogleFonts.nunito(fontSize: 14.sp, color: color)),
        ],
      ),
    );
  }
}

class _RecordingCard extends StatelessWidget {
  final int countdown;
  final Color color;
  final VoidCallback onFinish;
  const _RecordingCard({required this.countdown, required this.color, required this.onFinish});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.r),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.r),
        border: Border.all(color: color.withValues(alpha: 0.5), width: 2),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 10.r, height: 10.r, decoration: BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
              SizedBox(width: 6.w),
              Text('녹음 중', style: GoogleFonts.nunito(fontSize: 14.sp, fontWeight: FontWeight.w700, color: Colors.red)),
            ],
          ),
          SizedBox(height: 12.h),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) => Container(
              width: 6.w,
              height: (16 + (i % 3) * 10).h,
              margin: EdgeInsets.symmetric(horizontal: 3.w),
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3.r)),
            )),
          ),
          SizedBox(height: 12.h),
          Text(
            '$countdown초 남음',
            style: GoogleFonts.nunito(fontSize: 22.sp, fontWeight: FontWeight.w900, color: Colors.red),
          ),
          SizedBox(height: 16.h),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onFinish,
              style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r))),
              child: Text('답변 완료', style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15.sp)),
            ),
          ),
        ],
      ),
    );
  }
}

class _TranscribingCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(24.r),
      decoration: BoxDecoration(
        color: AppColors.orangeL.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20.r),
        border: Border.all(color: AppColors.orangeL),
      ),
      child: Column(
        children: [
          SizedBox(
            width: 28.r, height: 28.r,
            child: CircularProgressIndicator(color: AppColors.orange, strokeWidth: 2.5),
          ),
          SizedBox(height: 12.h),
          Text('음성 분석 중...', style: GoogleFonts.nunito(fontSize: 14.sp, fontWeight: FontWeight.w700, color: AppColors.textMid)),
        ],
      ),
    );
  }
}

class _DoneCard extends StatelessWidget {
  final String? transcribedText;
  final VoidCallback onNext;
  final bool isLast;
  const _DoneCard({required this.transcribedText, required this.onNext, required this.isLast});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.r),
      decoration: BoxDecoration(color: AppColors.sageL, borderRadius: BorderRadius.circular(20.r)),
      child: Column(
        children: [
          Image.asset('assets/pandas/bao_result.png', height: 80.h),
          SizedBox(height: 8.h),
          Text('답변 완료!', style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w800, color: AppColors.text)),
          if (transcribedText != null && transcribedText != '(무응답)') ...[
            SizedBox(height: 8.h),
            Text(transcribedText!, style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.textMid, height: 1.6)),
          ],
          SizedBox(height: 12.h),
          Text(
            '잠시 후 자동으로 다음 문항으로 이동합니다...',
            style: GoogleFonts.nunito(fontSize: 11.sp, color: AppColors.textLight),
          ),
          SizedBox(height: 8.h),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onNext,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.sage,
                side: BorderSide(color: AppColors.sage),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
              ),
              child: Text(isLast ? '채점 요청' : '지금 바로 다음 문항', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}
