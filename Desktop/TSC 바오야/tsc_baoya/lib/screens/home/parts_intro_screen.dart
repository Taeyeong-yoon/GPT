import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../models/tsc_model.dart';
import '../../services/purchase/tsc_backend.dart';
import '../../services/questions/question_service.dart';
import '../exam/exam_screen.dart';

class PartsIntroScreen extends StatefulWidget {
  final TscPackage package;

  const PartsIntroScreen({super.key, required this.package});

  @override
  State<PartsIntroScreen> createState() => _PartsIntroScreenState();
}

class _PartsIntroScreenState extends State<PartsIntroScreen> {
  bool _loading = false;

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
    );
  }

  Future<void> _startExam() async {
    setState(() => _loading = true);
    try {
      final parts = await QuestionService.loadParts(widget.package.type);
      if (!mounted) return;
      // 디버그 빌드: 결제/차감 없이 콘텐츠 점검용으로 바로 진입 (릴리스는 정상 서버차감)
      if (kDebugMode) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ExamScreen(package: widget.package, parts: parts),
          ),
        );
        return;
      }
      // 시험 시작 → 서버에서 응시권 1회 차감(또는 진행중 세션 재개).
      // 화면을 나가도 이미 차감되어 있어 "보고 나가서 안 깎기" 악용을 차단한다.
      final result = await TscBackend.startExam(productId: widget.package.productId);
      if (!mounted) return;
      if (result == null) {
        _snack('연결을 확인하고 다시 시도해주세요.');
        return;
      }
      if (result['ok'] != true) {
        final status = result['_status'] as int?;
        _snack(
          status == 402
              ? '사용 가능한 응시권이 없습니다.'
              : status == 401
                  ? '로그인이 필요합니다.'
                  : '시험을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.',
        );
        return;
      }
      final sessionId = result['sessionId'] as String?;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ExamScreen(
            package: widget.package,
            parts: parts,
            sessionId: sessionId,
          ),
        ),
      );
    } catch (e) {
      _snack('문제를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final package = widget.package;
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            // 헤더
            Padding(
              padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 0),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(Icons.arrow_back_ios_rounded, size: 20.r, color: AppColors.text),
                  ),
                  SizedBox(width: 12.w),
                  Text(
                    package.title,
                    style: GoogleFonts.nunito(
                      fontSize: 18.sp,
                      fontWeight: FontWeight.w900,
                      color: AppColors.text,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16.h),

            // 바오야 + 안내
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              child: Container(
                padding: EdgeInsets.all(16.r),
                decoration: BoxDecoration(
                  color: package.colorLight,
                  borderRadius: BorderRadius.circular(20.r),
                ),
                child: Row(
                  children: [
                    Image.asset('assets/pandas/bao_thinking.png', width: 64.r, height: 64.r),
                    SizedBox(width: 12.w),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            package.description,
                            style: GoogleFonts.nunito(
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text,
                            ),
                          ),
                          SizedBox(height: 4.h),
                          Text(
                            '각 파트 문항을 순서대로 답변하세요',
                            style: GoogleFonts.nunito(
                              fontSize: 11.sp,
                              color: AppColors.textMid,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16.h),

            // 파트 목록
            Expanded(
              child: ListView.separated(
                padding: EdgeInsets.symmetric(horizontal: 20.w),
                itemCount: kPartMeta.length,
                separatorBuilder: (_, __) => SizedBox(height: 10.h),
                itemBuilder: (_, i) {
                  final p = kPartMeta[i];
                  return Container(
                    padding: EdgeInsets.all(14.r),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14.r),
                      border: Border.all(color: AppColors.brownL),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40.r,
                          height: 40.r,
                          decoration: BoxDecoration(
                            color: AppColors.orangeL.withValues(alpha: 0.5),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(p['icon'] as String, style: TextStyle(fontSize: 20.sp)),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Part ${p['part']} — ${p['label']}',
                                style: GoogleFonts.nunito(
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.text,
                                ),
                              ),
                              Text(
                                p['desc'] as String,
                                style: GoogleFonts.nunito(
                                  fontSize: 11.sp,
                                  color: AppColors.textLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // 시작 버튼
            Padding(
              padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, 20.h),
              child: SizedBox(
                width: double.infinity,
                height: 52.h,
                child: ElevatedButton(
                  onPressed: _loading ? null : _startExam,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: package.color,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16.r),
                    ),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text('시험 시작하기', style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w900)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
