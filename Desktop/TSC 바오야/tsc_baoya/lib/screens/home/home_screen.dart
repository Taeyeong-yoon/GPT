import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../services/exam/exam_progress_store.dart';
import '../exam/exam_screen.dart';
import '../history/history_screen.dart';
import '../result/result_screen.dart';
import 'package_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime? _lastBack;
  bool _resumeChecked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkResume());
  }

  // 중단된 시험이 있으면 이어하기/채점/버리기 선택지 제공
  Future<void> _checkResume() async {
    if (_resumeChecked) return;
    _resumeChecked = true;
    final progress = await ExamProgressStore.load();
    if (progress == null || !mounted) return;

    final answered = progress.answers.length;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cream,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
        title: Text('진행 중이던 시험이 있어요',
            style: GoogleFonts.nunito(fontWeight: FontWeight.w900, color: AppColors.text)),
        content: Text(
          answered > 0
              ? '완료하지 못한 시험이 있습니다. (답변 $answered개 저장됨)\n이어서 응시하거나, 지금까지의 답변으로 채점할 수 있어요.'
              : '완료하지 못한 시험이 있습니다.\n이어서 응시하시겠어요?',
          style: GoogleFonts.nunito(color: AppColors.textMid, height: 1.5),
        ),
        actionsPadding: EdgeInsets.fromLTRB(12.w, 0, 12.w, 12.h),
        actions: [
          TextButton(
            onPressed: () { Navigator.pop(ctx); _discard(); },
            child: Text('버리기',
                style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: AppColors.textLight)),
          ),
          if (answered > 0)
            TextButton(
              onPressed: () { Navigator.pop(ctx); _gradeNow(progress); },
              child: Text('받은 답변 채점',
                  style: GoogleFonts.nunito(fontWeight: FontWeight.w800, color: AppColors.brown)),
            ),
          ElevatedButton(
            onPressed: () { Navigator.pop(ctx); _resume(progress); },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.orange, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
            ),
            child: Text('이어서 응시', style: GoogleFonts.nunito(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
  }

  void _resume(ExamProgress progress) {
    final pkg = kPackages.firstWhere((p) => p.type == progress.packageType);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ExamScreen(package: pkg, parts: progress.parts, resume: progress),
      ),
    );
  }

  void _gradeNow(ExamProgress progress) {
    ExamProgressStore.clear();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ResultScreen(
          answers: progress.answers,
          mini: progress.mini,
          packageType: progress.packageType,
        ),
      ),
    );
  }

  void _discard() => ExamProgressStore.clear();

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        final now = DateTime.now();
        if (_lastBack == null || now.difference(_lastBack!) > const Duration(seconds: 2)) {
          _lastBack = now;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('한 번 더 누르면 종료됩니다',
                  style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
              duration: const Duration(seconds: 2),
            ),
          );
        } else {
          SystemNavigator.pop(); // 2초 내 두 번 → 종료
        }
      },
      child: Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            _Header(),
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: 8.h),
                    Text(
                      '응시권을 선택하세요',
                      style: GoogleFonts.nunito(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textMid,
                      ),
                    ),
                    SizedBox(height: 12.h),
                    ...kPackages.map((pkg) => Padding(
                      padding: EdgeInsets.only(bottom: 14.h),
                      child: PackageCard(package: pkg),
                    )),
                    SizedBox(height: 20.h),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 12.h),
      child: Row(
        children: [
          Container(
            width: 52.r,
            height: 52.r,
            decoration: BoxDecoration(
              color: AppColors.orangeL,
              borderRadius: BorderRadius.circular(16.r),
              boxShadow: [
                BoxShadow(
                  color: AppColors.orange.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16.r),
              child: Image.asset('assets/pandas/bao_home.png', fit: BoxFit.cover),
            ),
          ),
          SizedBox(width: 14.w),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'TSC 바오야',
                style: GoogleFonts.nunito(
                  fontSize: 20.sp,
                  fontWeight: FontWeight.w900,
                  color: AppColors.text,
                ),
              ),
              Text(
                '중국어 말하기 · AI 채점',
                style: GoogleFonts.nunito(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textLight,
                ),
              ),
            ],
          ),
          const Spacer(),
          // 내 기록 (저장된 채점 결과 다시 보기)
          TextButton.icon(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HistoryScreen()),
            ),
            style: TextButton.styleFrom(
              backgroundColor: AppColors.orangeL.withValues(alpha: 0.5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
            ),
            icon: Icon(Icons.history_rounded, size: 18.r, color: AppColors.orangeD),
            label: Text('기록',
                style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w800, color: AppColors.orangeD)),
          ),
        ],
      ),
    );
  }
}
