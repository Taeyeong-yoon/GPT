import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../models/tsc_model.dart';
import '../../services/ai/tsc_grading_service.dart';
import '../../services/report/report_pdf_service.dart';
import '../../services/result/result_history_store.dart';

class ResultScreen extends StatefulWidget {
  final List<TscAnswer> answers;
  final bool mini; // true=미니 응시권(gpt-4o-mini), false=모의 정상시험(gpt-4o)
  final PackageType? packageType; // 기록 저장용 티어(신규 채점 시)
  final TscFeedback? savedFeedback; // 저장된 기록 열람용 — 있으면 재채점 없이 바로 표시
  const ResultScreen({
    super.key,
    required this.answers,
    this.mini = true,
    this.packageType,
    this.savedFeedback,
  });

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  TscFeedback? _feedback;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.savedFeedback != null) {
      // 저장된 기록 열람 → 채점(=OpenAI 호출) 생략, 재저장·재과금 없음
      _feedback = widget.savedFeedback;
      _loading = false;
    } else {
      _grade();
    }
  }

  Future<void> _grade() async {
    try {
      final result = await TscGradingService.grade(widget.answers, mini: widget.mini);
      if (!mounted) return;
      setState(() { _feedback = result; _loading = false; });
      // 채점 성공 즉시 로컬 저장 → 결과 화면을 실수로 나가도 '내 기록'에서 다시 볼 수 있음
      await ResultHistoryStore.save(ResultRecord(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        savedAt: DateTime.now(),
        packageType: widget.packageType ??
            (widget.mini ? PackageType.miniBasic : PackageType.mockExam),
        answers: widget.answers,
        feedback: result,
      ));
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: _loading
            ? _LoadingView()
            : _error != null
                ? _ErrorView(error: _error!, onRetry: () { setState(() { _loading = true; _error = null; }); _grade(); })
                : _FeedbackView(feedback: _feedback!, answers: widget.answers, mini: widget.mini),
      ),
    );
  }
}

class _LoadingView extends StatefulWidget {
  @override
  State<_LoadingView> createState() => _LoadingViewState();
}

class _LoadingViewState extends State<_LoadingView> {
  static const _steps = ['답변 분석 중...', '문법 검토 중...', '유창성 평가 중...', '점수 계산 중...'];
  int _stepIdx = 0;
  int _elapsed = 0;
  Timer? _tick;
  Timer? _step;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed++);
    });
    _step = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      if (mounted) setState(() => _stepIdx = (_stepIdx + 1) % _steps.length);
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    _step?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset('assets/pandas/bao_thinking.png', height: 120.h),
          SizedBox(height: 20.h),
          Text('바오야가 채점 중입니다', style: GoogleFonts.nunito(fontSize: 16.sp, color: AppColors.text, fontWeight: FontWeight.w700)),
          SizedBox(height: 8.h),
          Text(_steps[_stepIdx], style: GoogleFonts.nunito(fontSize: 14.sp, color: AppColors.textMid, fontWeight: FontWeight.w600)),
          SizedBox(height: 16.h),
          CircularProgressIndicator(color: AppColors.orange),
          SizedBox(height: 12.h),
          Text('${_elapsed}초 경과', style: GoogleFonts.nunito(fontSize: 12.sp, color: AppColors.textLight)),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.r),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('채점 중 오류가 발생했습니다', style: GoogleFonts.nunito(fontSize: 16.sp, color: AppColors.text)),
            SizedBox(height: 16.h),
            ElevatedButton(onPressed: onRetry, child: const Text('다시 시도')),
          ],
        ),
      ),
    );
  }
}

class _FeedbackView extends StatefulWidget {
  final TscFeedback feedback;
  final List<TscAnswer> answers;
  final bool mini;
  const _FeedbackView({required this.feedback, required this.answers, required this.mini});

  @override
  State<_FeedbackView> createState() => _FeedbackViewState();
}

class _FeedbackViewState extends State<_FeedbackView> {
  // 파트번호별 강사 코멘트 + 종합 의견
  final Map<int, TextEditingController> _partNotes = {};
  final TextEditingController _overallNote = TextEditingController();
  bool _exporting = false;

  late final List<int> _partNums;

  @override
  void initState() {
    super.initState();
    _partNums = widget.answers.map((a) => a.partNum).toSet().toList()..sort();
    for (final p in _partNums) {
      _partNotes[p] = TextEditingController();
    }
  }

  @override
  void dispose() {
    for (final c in _partNotes.values) {
      c.dispose();
    }
    _overallNote.dispose();
    super.dispose();
  }

  Map<String, String>? _aiForPart(int p) {
    for (final f in widget.feedback.partFeedback) {
      if (int.tryParse(f['part'] ?? '') == p) return f;
    }
    return null;
  }

  Future<void> _exportPdf() async {
    setState(() => _exporting = true);
    try {
      await ReportPdfService.generateAndShare(
        feedback: widget.feedback,
        answers: widget.answers,
        teacherPartNotes: _partNotes.map((k, v) => MapEntry(k, v.text)),
        teacherOverall: _overallNote.text,
        mini: widget.mini,
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('리포트 생성에 실패했습니다. 인터넷 연결을 확인해주세요.',
              style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final feedback = widget.feedback;
    return SingleChildScrollView(
      padding: EdgeInsets.all(20.r),
      child: Column(
        children: [
          SizedBox(height: 16.h),
          Image.asset('assets/pandas/bao_result.png', height: 100.h),
          SizedBox(height: 12.h),

          // 총점 + 등급
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(20.r),
            decoration: BoxDecoration(color: AppColors.orange, borderRadius: BorderRadius.circular(20.r)),
            child: Column(
              children: [
                Text('총점', style: GoogleFonts.nunito(fontSize: 14.sp, color: Colors.white70, fontWeight: FontWeight.w600)),
                Text('${feedback.overallScore}점', style: GoogleFonts.nunito(fontSize: 48.sp, fontWeight: FontWeight.w900, color: Colors.white)),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 4.h),
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20.r)),
                  child: Text(feedback.grade, style: GoogleFonts.nunito(fontSize: 18.sp, fontWeight: FontWeight.w800, color: Colors.white)),
                ),
              ],
            ),
          ),
          SizedBox(height: 16.h),

          // 세부 점수
          _ScoreCard(scores: feedback.scores),
          SizedBox(height: 16.h),

          // 파트별: 답변 → AI 채점 → 강사 코멘트
          _SectionTitle('파트별 결과 · 주요 코멘트'),
          ..._partNums.map((p) => _PartBlock(
                part: p,
                answers: widget.answers.where((a) => a.partNum == p).toList(),
                ai: _aiForPart(p),
                noteController: _partNotes[p]!,
              )),
          SizedBox(height: 12.h),

          // 개선점
          if (feedback.improvements.isNotEmpty) ...[
            _SectionTitle('핵심 개선 포인트'),
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(16.r),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16.r), border: Border.all(color: AppColors.brownL)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: feedback.improvements.map((s) => Padding(
                  padding: EdgeInsets.symmetric(vertical: 4.h),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ', style: GoogleFonts.nunito(color: AppColors.orange, fontWeight: FontWeight.w800)),
                      Expanded(child: Text(s, style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.text))),
                    ],
                  ),
                )).toList(),
              ),
            ),
            SizedBox(height: 12.h),
          ],

          // 모범 표현
          if (feedback.modelExpressions.isNotEmpty) ...[
            _SectionTitle('이런 표현은 어떨까요?'),
            ...feedback.modelExpressions.map((e) => _ModelExpressionTile(data: e)),
            SizedBox(height: 12.h),
          ],

          // 종합 코멘트
          _SectionTitle('✏️ 종합 코멘트'),
          Container(
            padding: EdgeInsets.all(12.r),
            decoration: BoxDecoration(color: AppColors.yellowL, borderRadius: BorderRadius.circular(14.r)),
            child: TextField(
              controller: _overallNote,
              maxLines: 4,
              style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.text),
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: '종합 의견을 자유롭게 적어주세요.',
                hintStyle: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.textLight),
              ),
            ),
          ),
          SizedBox(height: 20.h),

          // PDF 다운로드
          SizedBox(
            width: double.infinity,
            height: 52.h,
            child: ElevatedButton.icon(
              onPressed: _exporting ? null : _exportPdf,
              icon: _exporting
                  ? SizedBox(width: 18.w, height: 18.w, child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(Icons.picture_as_pdf_rounded, size: 20.sp),
              label: Text(_exporting ? '리포트 생성 중...' : '📄 PDF 리포트 다운로드',
                  style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w900)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
              ),
            ),
          ),
          SizedBox(height: 10.h),
          SizedBox(
            width: double.infinity,
            height: 48.h,
            child: OutlinedButton(
              onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.orange,
                side: BorderSide(color: AppColors.orange),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
              ),
              child: Text('홈으로', style: GoogleFonts.nunito(fontSize: 15.sp, fontWeight: FontWeight.w800)),
            ),
          ),
          SizedBox(height: 20.h),
        ],
      ),
    );
  }
}

/// 한 파트: 학생 답변(STT) → AI 채점(강점/약점/팁/상세) → 강사 코멘트 입력
class _PartBlock extends StatelessWidget {
  final int part;
  final List<TscAnswer> answers;
  final Map<String, String>? ai;
  final TextEditingController noteController;
  const _PartBlock({required this.part, required this.answers, required this.ai, required this.noteController});

  @override
  Widget build(BuildContext context) {
    final strength = ai?['strength'] ?? '';
    final weakness = ai?['weakness'] ?? '';
    final tip = ai?['tip'] ?? '';
    final detail = ai?['detail'] ?? '';
    final comment = ai?['comment'] ?? '';
    final hasStructured = strength.isNotEmpty || weakness.isNotEmpty || tip.isNotEmpty || detail.isNotEmpty;

    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(14.r),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16.r), border: Border.all(color: AppColors.brownL)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('제$part부', style: GoogleFonts.nunito(fontSize: 14.sp, fontWeight: FontWeight.w900, color: AppColors.orangeD)),
          SizedBox(height: 6.h),

          // 학생 답변
          ...answers.map((a) => Padding(
            padding: EdgeInsets.only(bottom: 3.h),
            child: Text('“${a.answer.isEmpty ? "(무응답)" : a.answer}”',
                style: GoogleFonts.nunito(fontSize: 12.5.sp, color: AppColors.textMid, height: 1.5)),
          )),
          Divider(color: AppColors.brownL, height: 16.h),

          // AI 채점
          if (hasStructured) ...[
            if (strength.isNotEmpty && strength != '없음') _aiRow('✓ 잘된 점', strength, AppColors.sage),
            if (weakness.isNotEmpty) _aiRow('△ 개선할 점', weakness, AppColors.orange),
            if (tip.isNotEmpty) _aiRow('💡 표현 팁', tip, AppColors.brown),
            if (detail.isNotEmpty) _aiRow('🔎 상세 분석', detail, AppColors.textMid),
          ] else if (comment.isNotEmpty)
            Text(comment, style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.text)),

          SizedBox(height: 8.h),
          // 강사 코멘트
          Container(
            padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 2.h),
            decoration: BoxDecoration(color: AppColors.yellowL, borderRadius: BorderRadius.circular(10.r)),
            child: TextField(
              controller: noteController,
              maxLines: null,
              style: GoogleFonts.nunito(fontSize: 12.5.sp, color: AppColors.text),
              decoration: InputDecoration(
                border: InputBorder.none,
                isDense: true,
                icon: Text('✏️', style: TextStyle(fontSize: 13.sp)),
                hintText: '이 파트 주요 코멘트',
                hintStyle: GoogleFonts.nunito(fontSize: 12.5.sp, color: AppColors.textLight),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _aiRow(String label, String text, Color color) => Padding(
    padding: EdgeInsets.only(bottom: 6.h),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.nunito(fontSize: 11.sp, fontWeight: FontWeight.w800, color: color)),
        SizedBox(height: 2.h),
        Text(text, style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.text, height: 1.5)),
      ],
    ),
  );
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: 8.h),
    child: Text(title, style: GoogleFonts.nunito(fontSize: 15.sp, fontWeight: FontWeight.w800, color: AppColors.text)),
  );
}

class _ScoreCard extends StatelessWidget {
  final Map<String, int> scores;
  const _ScoreCard({required this.scores});

  static const _labels = {'grammar': '문법', 'vocabulary': '어휘', 'fluency': '유창성', 'pronunciation': '발음/성조'};

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16.r),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16.r), border: Border.all(color: AppColors.brownL)),
      child: Column(
        children: scores.entries.map((e) {
          final pct = (e.value / 25.0).clamp(0.0, 1.0);
          return Padding(
            padding: EdgeInsets.symmetric(vertical: 6.h),
            child: Row(
              children: [
                SizedBox(width: 72.w, child: Text(_labels[e.key] ?? e.key, style: GoogleFonts.nunito(fontSize: 12.sp, color: AppColors.textMid))),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4.r),
                    child: LinearProgressIndicator(value: pct, minHeight: 8.h, backgroundColor: AppColors.brownL, color: AppColors.orange),
                  ),
                ),
                SizedBox(width: 8.w),
                Text('${e.value}', style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w800, color: AppColors.text)),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ModelExpressionTile extends StatelessWidget {
  final Map<String, String> data;
  const _ModelExpressionTile({required this.data});
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: EdgeInsets.only(bottom: 8.h),
    padding: EdgeInsets.all(14.r),
    decoration: BoxDecoration(color: AppColors.yellowL, borderRadius: BorderRadius.circular(14.r)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(data['situation'] ?? '', style: GoogleFonts.nunito(fontSize: 11.sp, color: AppColors.textMid)),
        SizedBox(height: 4.h),
        Text(data['natural_expression'] ?? '', style: GoogleFonts.nunito(fontSize: 14.sp, fontWeight: FontWeight.w700, color: AppColors.text)),
      ],
    ),
  );
}
