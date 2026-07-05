import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../services/auth/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _signIn() async {
    setState(() { _loading = true; _error = null; });
    try {
      final user = await AuthService.signInWithGoogle();
      // 성공 시 AuthGate(authStateChanges 구독)가 자동으로 홈으로 전환 → 별도 네비게이션 불필요
      if (!mounted) return;
      if (user == null) {
        setState(() { _loading = false; _error = '로그인이 취소됐습니다.'; });
      }
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = '로그인 실패: $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 32.w),
          child: Column(
            children: [
              SizedBox(height: 60.h),
              Image.asset('assets/pandas/bao_home.png', height: 160.h),
              SizedBox(height: 24.h),
              Text(
                'TSC 바오야',
                style: GoogleFonts.nunito(fontSize: 30.sp, fontWeight: FontWeight.w900, color: AppColors.text),
              ),
              SizedBox(height: 8.h),
              Text(
                '중국어 말하기 AI 채점 연습',
                style: GoogleFonts.nunito(fontSize: 15.sp, color: AppColors.textMid),
              ),
              SizedBox(height: 6.h),
              Text(
                '공식 TSC 시험이 아닌 AI 말하기 연습 서비스입니다',
                style: GoogleFonts.nunito(fontSize: 11.sp, color: AppColors.textLight),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              if (_error != null) ...[
                Container(
                  padding: EdgeInsets.all(12.r),
                  decoration: BoxDecoration(color: AppColors.redL, borderRadius: BorderRadius.circular(12.r)),
                  child: Text(_error!, style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.red)),
                ),
                SizedBox(height: 16.h),
              ],
              SizedBox(
                width: double.infinity,
                height: 54.h,
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : _signIn,
                  icon: _loading
                      ? SizedBox(width: 20.w, height: 20.h, child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Container(
                          width: 22.w, height: 22.h,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          alignment: Alignment.center,
                          child: Text('G', style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w900, color: AppColors.orange)),
                        ),
                  label: Text(
                    _loading ? '로그인 중...' : 'Google로 시작하기',
                    style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                  ),
                ),
              ),
              SizedBox(height: 16.h),
              Text(
                '로그인 시 이용약관 및 개인정보처리방침에 동의합니다.',
                style: GoogleFonts.nunito(fontSize: 11.sp, color: AppColors.textLight),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 32.h),
            ],
          ),
        ),
      ),
    );
  }
}
