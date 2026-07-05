import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/tsc_model.dart';
import '../home/home_screen.dart';

/// 구매 정보 없이 TSC·앱·미니 시리즈·파트 구성을 소개하는 온보딩 랜딩.
/// 가로 스와이프(세로 스크롤 0)로 한 장에 한 주제씩. (SJPT 이누짱 랜딩의 중국어 쌍둥이)
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _pc = PageController();
  int _page = 0;
  static const _last = 3;

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  void _goHome() {
    // 로그인 강제 없이 바로 응시권 홈으로 (로그인은 구매/시작 시점에 필요 시 처리)
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const HomeScreen()),
    );
  }

  void _next() {
    if (_page >= _last) {
      _goHome();
    } else {
      _pc.nextPage(duration: const Duration(milliseconds: 320), curve: Curves.easeOut);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            // 건너뛰기
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: EdgeInsets.only(right: 16.w, top: 8.h),
                child: TextButton(
                  onPressed: _goHome,
                  child: Text('건너뛰기',
                      style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w700, color: AppColors.textLight)),
                ),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pc,
                onPageChanged: (i) => setState(() => _page = i),
                children: [
                  _intro(),
                  _help(),
                  _whyMini(),
                  _parts(),
                ],
              ),
            ),
            // 페이지 점
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_last + 1, (i) {
                final on = i == _page;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: EdgeInsets.symmetric(horizontal: 4.w),
                  width: on ? 22.w : 8.w,
                  height: 8.h,
                  decoration: BoxDecoration(
                    color: on ? AppColors.orange : AppColors.brownL,
                    borderRadius: BorderRadius.circular(99.r),
                  ),
                );
              }),
            ),
            SizedBox(height: 16.h),
            // CTA
            Padding(
              padding: EdgeInsets.fromLTRB(24.w, 0, 24.w, 20.h),
              child: SizedBox(
                width: double.infinity,
                height: 54.h,
                child: ElevatedButton(
                  onPressed: _next,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16.r)),
                    elevation: 0,
                  ),
                  child: Text(
                    _page >= _last ? '응시권 고르러 가기 →' : '다음',
                    style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 공통 페이지 골격 (이미지 + 제목 + 본문). header=true면 브랜드 배너를 화면 상단에 고정.
  Widget _page0({required String img, required String title, required Widget body, double imgH = 170, bool header = false}) {
    final content = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Image.asset('assets/pandas/$img', height: imgH.h),
        SizedBox(height: 24.h),
        Text(title,
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(fontSize: 23.sp, fontWeight: FontWeight.w900, color: AppColors.text)),
        SizedBox(height: 14.h),
        body,
      ],
    );

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 28.w),
      child: header
          ? Column(
              children: [
                SizedBox(height: 8.h),
                _BrandBanner(),       // 상단 고정
                Expanded(child: Center(child: content)), // 나머지 영역 중앙
              ],
            )
          : Center(child: content),
    );
  }

  Widget _bodyText(String t) => Text(
        t,
        textAlign: TextAlign.center,
        style: GoogleFonts.nunito(fontSize: 14.sp, fontWeight: FontWeight.w600, color: AppColors.textMid, height: 1.7),
      );

  // ── 1. TSC 소개 ──
  Widget _intro() => _page0(
        header: true,
        imgH: 150,
        img: 'bao_welcome.png',
        title: 'TSC가 뭐예요?',
        body: _bodyText(
            'TSC(Test of Spoken Chinese)는\n중국어 ‘말하기’ 실력을 평가하는 시험이에요.\n\n자기소개부터 그림 묘사, 의견 제시,\n스토리 구성까지 — 듣고 바로 말하는 실전 시험입니다.'),
      );

  // ── 2. 앱 가치 ──
  Widget _help() => _page0(
        img: 'bao_thinking.png',
        title: '바오야가 이렇게 도와줘요',
        body: Column(
          children: [
            _bodyText(
                '답변을 녹음하면 AI가 채점하고,\n더 자연스러운 중국어 표현까지 알려줘요.\n실제 시험과 똑같은 흐름으로 연습합니다.'),
            SizedBox(height: 16.h),
            Wrap(
              spacing: 8.w,
              runSpacing: 8.h,
              alignment: WrapAlignment.center,
              children: const ['문법', '어휘', '유창성', '발음']
                  .map((e) => _Chip(e))
                  .toList(),
            ),
          ],
        ),
      );

  // ── 3. 왜 미니 시리즈 ──
  Widget _whyMini() => _page0(
        img: 'bao_home.png',
        imgH: 110,
        title: '왜 ‘미니’로 나눴을까요?',
        body: Column(
          children: [
            _bodyText(
                '정식 모의시험은 시간이 오래 걸려요.\n바쁜 직장인도 자투리 시간에 연습하도록\n가볍게 쪼갰습니다. (모든 미니는 1~7부 전체 응시)'),
            SizedBox(height: 14.h),
            _TierLine(emoji: '🎍', name: '미니 기본', parts: '1~7부 전체 · 10문항', desc: '짧은 시간에 핵심만 빠르게'),
            _TierLine(emoji: '⭐', name: '미니 플러스', parts: '1~7부 전체 · 15문항', desc: '파트별 문항을 늘려 더 탄탄하게'),
            _TierLine(emoji: '🔥', name: '미니 프로', parts: '1~7부 전체 · 18문항', desc: '실전에 가까운 밀도로 집중 훈련'),
          ],
        ),
      );

  // ── 4. 7파트 구성 (세로 스크롤 없이 화면에 꽉 맞춤) ──
  Widget _parts() {
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 8.h),
      child: Column(
        children: [
          Text('시험은 7개 파트로 구성돼요',
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(fontSize: 21.sp, fontWeight: FontWeight.w900, color: AppColors.text)),
          SizedBox(height: 6.h),
          Text('정식 모의시험 기준 · 미니는 일부만 응시',
              style: GoogleFonts.nunito(fontSize: 11.sp, fontWeight: FontWeight.w600, color: AppColors.textLight)),
          SizedBox(height: 12.h),
          Expanded(
            child: Column(
              children: kPartMeta.map((m) => Expanded(child: _PartRow(m))).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

/// 첫 화면 상단 브랜드 배너. "공식 TSC 시험이 아닌 바오야의 모의연습 서비스"임을 명확히 하여
/// 시험 주체와의 상표·오인 분쟁을 예방.
class _BrandBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 'TSC 바오야' 강조 + '모의연습' 보조 — 배경 없이 텍스트만
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            children: [
              TextSpan(
                text: 'TSC 바오야',
                style: GoogleFonts.nunito(
                  fontSize: 26.sp, fontWeight: FontWeight.w900, color: AppColors.orange, letterSpacing: -0.5,
                ),
              ),
              TextSpan(
                text: '  모의연습',
                style: GoogleFonts.nunito(
                  fontSize: 20.sp, fontWeight: FontWeight.w800, color: AppColors.brown,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 6.h),
        Text(
          '공식 시험이 아닌 AI 말하기 연습 서비스입니다',
          textAlign: TextAlign.center,
          style: GoogleFonts.nunito(fontSize: 10.5.sp, fontWeight: FontWeight.w600, color: AppColors.textLight),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  const _Chip(this.text);
  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 7.h),
        decoration: BoxDecoration(
          color: AppColors.orange.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20.r),
        ),
        child: Text(text,
            style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w800, color: AppColors.orangeD)),
      );
}

class _TierLine extends StatelessWidget {
  final String emoji, name, parts, desc;
  const _TierLine({required this.emoji, required this.name, required this.parts, required this.desc});
  @override
  Widget build(BuildContext context) => Container(
        margin: EdgeInsets.symmetric(vertical: 4.h),
        padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: AppColors.brownL),
        ),
        child: Row(
          children: [
            Text(emoji, style: TextStyle(fontSize: 18.sp)),
            SizedBox(width: 10.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(name,
                          style: GoogleFonts.nunito(fontSize: 13.sp, fontWeight: FontWeight.w900, color: AppColors.text)),
                      SizedBox(width: 6.w),
                      Text(parts,
                          style: GoogleFonts.nunito(fontSize: 11.sp, fontWeight: FontWeight.w800, color: AppColors.orangeD)),
                    ],
                  ),
                  Text(desc,
                      style: GoogleFonts.nunito(fontSize: 11.5.sp, fontWeight: FontWeight.w600, color: AppColors.textMid)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _PartRow extends StatelessWidget {
  final Map<String, dynamic> m;
  const _PartRow(this.m);
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(vertical: 3.h),
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 8.h),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: AppColors.brownL),
      ),
      child: Row(
        children: [
          Text(m['icon'] as String, style: TextStyle(fontSize: 18.sp)),
          SizedBox(width: 10.w),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('제${m['part']}부 · ${m['label']}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.nunito(fontSize: 12.5.sp, fontWeight: FontWeight.w800, color: AppColors.text)),
                Text('${m['kanji']}  ·  준비 ${m['prep']}초 · 답변 ${m['answer']}초 · ${m['count']}문항',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.nunito(fontSize: 10.5.sp, fontWeight: FontWeight.w600, color: AppColors.textLight)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
