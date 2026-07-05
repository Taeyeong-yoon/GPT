import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../models/tsc_model.dart';
import '../../services/auth/auth_service.dart';
import '../../services/purchase/purchase_service.dart';
import 'parts_intro_screen.dart';

Future<void> showPurchaseSheet(BuildContext context, TscPackage package) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _PurchaseSheet(package: package),
  );
}

class _PurchaseSheet extends StatefulWidget {
  final TscPackage package;
  const _PurchaseSheet({required this.package});

  @override
  State<_PurchaseSheet> createState() => _PurchaseSheetState();
}

class _PurchaseSheetState extends State<_PurchaseSheet> {
  int _remaining = 0;
  bool _buying = false;
  StreamSubscription<int>? _remainingSub;

  @override
  void initState() {
    super.initState();
    _subscribeRemaining(); // 잔여 응시권 실시간 구독 → 서버 충전 즉시 화면 반영
    PurchaseService.instance.onSuccess = _onPurchaseSuccess;
    PurchaseService.instance.onSettled = _onPurchaseSettled;
  }

  @override
  void dispose() {
    _remainingSub?.cancel();
    PurchaseService.instance.onSuccess = null;
    PurchaseService.instance.onSettled = null;
    super.dispose();
  }

  // 잔여 응시권을 Firestore 스냅샷으로 실시간 구독 → 서버가 충전하는 순간 카운터가 즉시 갱신된다
  // (기존엔 1회성 읽기라 타이밍이 어긋나면 재진입해야 보였음). 로그인 후 유효 uid로 다시 호출해 재구독.
  void _subscribeRemaining() {
    _remainingSub?.cancel();
    _remainingSub = PurchaseService.instance
        .watchRemaining(widget.package.productId)
        .listen((v) {
      if (mounted) setState(() => _remaining = v);
    });
  }

  // 결제 취소/실패/보류 등 성공이 아닌 종료 → 무한 스피너 방지, 버튼 원상복귀.
  // ⚠️ 사용자가 결제창을 닫으면(userCanceled) 플러그인은 productID를 '' 로 보낸다.
  //   (in_app_purchase_android: 취소 시 구매목록이 비어 productID 없이 canceled 전달)
  //   따라서 빈 productID면 방금 진행 중이던 우리 구매로 간주해 반드시 스피너를 해제한다.
  void _onPurchaseSettled(String productId) {
    if (productId.isNotEmpty && productId != widget.package.productId) return;
    if (mounted && _buying) setState(() => _buying = false);
  }

  Future<void> _loadRemaining() async {
    final r = await PurchaseService.instance.getRemaining(widget.package.productId);
    if (mounted) setState(() => _remaining = r);
  }

  Future<void> _onPurchaseSuccess(String productId) async {
    if (productId != widget.package.productId) return;
    await _loadRemaining();
    if (mounted) setState(() => _buying = false);
  }

  Future<void> _handleBuy() async {
    setState(() => _buying = true);
    // 구매 검증(verify-purchase)은 Firebase IDToken이 필수 → 결제 전에 로그인 보장.
    // 로그인 없이 결제하면 서버가 충전을 못 해 "결제했는데 응시권이 안 생김" 문제가 됨.
    final user = await AuthService.ensureSignedIn();
    if (user == null) {
      if (mounted) {
        setState(() => _buying = false);
        _showError('구매하려면 구글 로그인이 필요합니다.');
      }
      return;
    }
    _subscribeRemaining(); // 로그인 후 유효 uid로 실시간 구독 재설정(미로그인 상태로 구독됐을 수 있음)
    final ok = await PurchaseService.instance.buy(widget.package.productId);
    if (!ok && mounted) {
      setState(() => _buying = false);
      _showError('결제를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  Future<void> _handleStart() async {
    // 응시권 차감은 여기서 하지 않음 → 문제 로드 성공 직전(PartsIntroScreen)에 차감.
    // (여기서 차감하면 로드 실패·뒤로가기만 해도 응시권이 그냥 소멸됨)
    // start-exam도 IDToken이 필수 → 릴리스에선 로그인 보장(디버그는 서버 우회라 생략).
    if (!kDebugMode && await AuthService.ensureSignedIn() == null) {
      _showError('시험을 시작하려면 구글 로그인이 필요합니다.');
      return;
    }
    if (_remaining <= 0 && !kDebugMode) {
      _showError('사용 가능한 응시권이 없습니다.');
      return;
    }
    if (!mounted) return;
    Navigator.pop(context);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PartsIntroScreen(package: widget.package)),
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: GoogleFonts.nunito(fontWeight: FontWeight.w700))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pkg = widget.package;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28.r)),
      ),
      padding: EdgeInsets.fromLTRB(20.w, 0, 20.w, 32.h),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 드래그 핸들
          SizedBox(height: 12.h),
          Container(
            width: 40.w,
            height: 4.h,
            decoration: BoxDecoration(
              color: AppColors.brownL,
              borderRadius: BorderRadius.circular(99.r),
            ),
          ),
          SizedBox(height: 20.h),

          // 헤더 카드
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(18.r),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [pkg.colorLight, AppColors.cream],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20.r),
              border: Border.all(color: pkg.colorLight, width: 1.5),
            ),
            child: Row(
              children: [
                Image.asset('assets/pandas/bao_purchase.png', width: 72.r, height: 72.r),
                SizedBox(width: 16.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                        decoration: BoxDecoration(
                          color: pkg.color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20.r),
                        ),
                        child: Text(
                          pkg.subtitle,
                          style: GoogleFonts.nunito(
                            fontSize: 11.sp, fontWeight: FontWeight.w900, color: pkg.color,
                          ),
                        ),
                      ),
                      SizedBox(height: 6.h),
                      Text(
                        pkg.title,
                        style: GoogleFonts.nunito(
                          fontSize: 20.sp, fontWeight: FontWeight.w900, color: AppColors.text,
                        ),
                      ),
                      SizedBox(height: 2.h),
                      Text(
                        pkg.description,
                        style: GoogleFonts.nunito(
                          fontSize: 12.sp, fontWeight: FontWeight.w600, color: AppColors.textMid,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 16.h),

          // 파트 구성 테이블
          _PartTable(package: pkg),
          SizedBox(height: 16.h),

          // 잔여 응시권 (구매한 경우)
          if (_remaining > 0) ...[
            Container(
              width: double.infinity,
              padding: EdgeInsets.symmetric(vertical: 12.h, horizontal: 16.w),
              decoration: BoxDecoration(
                color: AppColors.sageL,
                borderRadius: BorderRadius.circular(14.r),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.confirmation_num_rounded, color: AppColors.sage, size: 18.r),
                  SizedBox(width: 6.w),
                  Text(
                    '보유 응시권 $_remaining장',
                    style: GoogleFonts.nunito(
                      fontSize: 14.sp, fontWeight: FontWeight.w800, color: AppColors.sage,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 12.h),
          ],

          // 구매 / 시작 버튼
          SizedBox(
            width: double.infinity,
            height: 52.h,
            child: ElevatedButton(
              onPressed: _buying ? null : ((_remaining > 0 || kDebugMode) ? _handleStart : _handleBuy),
              style: ElevatedButton.styleFrom(
                backgroundColor: (_remaining > 0 || kDebugMode) ? AppColors.sage : pkg.color,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999.r)),
                elevation: 0,
                disabledBackgroundColor: AppColors.brownL,
              ),
              child: _buying
                  ? const SizedBox(
                      width: 24, height: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      (_remaining > 0 || kDebugMode)
                          ? '시험 시작하기 →'
                          : '${_formatPrice(pkg.price)}원 구매하기',
                      style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w900),
                    ),
            ),
          ),
          SizedBox(height: 10.h),

          // 멀티수량 안내 (구매 모드일 때만)
          if (_remaining <= 0) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.add_circle_outline_rounded, size: 14.r, color: pkg.color),
                SizedBox(width: 5.w),
                Flexible(
                  child: Text(
                    '여러 회가 필요하면 결제 화면에서 수량을 선택하세요',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.nunito(
                      fontSize: 11.5.sp, fontWeight: FontWeight.w800, color: pkg.color,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 8.h),
          ],

          // 정책 안내
          Text(
            '구매 후 즉시 사용 가능 · 환불은 구글 플레이 정책에 따름',
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(
              fontSize: 11.sp, fontWeight: FontWeight.w700,
              color: AppColors.textLight, height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  String _formatPrice(int price) => price.toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
}

class _PartTable extends StatelessWidget {
  final TscPackage package;
  const _PartTable({required this.package});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: AppColors.brownL, width: 1.5),
      ),
      child: Column(
        children: [
          _header(),
          ...kPartMeta.asMap().entries.map((e) => _row(e.key, e.value)),
        ],
      ),
    );
  }

  Widget _header() {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16.r)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '파트 구성',
              style: GoogleFonts.nunito(
                fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.textMid,
              ),
            ),
          ),
          Text(
            '문항 수',
            style: GoogleFonts.nunito(
              fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.orange,
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(int index, Map<String, dynamic> part) {
    final partNum = part['part'] as int;
    final count = tscQuestionCount(package.type, partNum);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 10.h),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.brownL.withValues(alpha: 0.5))),
      ),
      child: Row(
        children: [
          Text(part['icon'] as String, style: TextStyle(fontSize: 16.sp)),
          SizedBox(width: 8.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Part $partNum — ${part['label']}',
                  style: GoogleFonts.nunito(
                    fontSize: 12.sp, fontWeight: FontWeight.w800, color: AppColors.text,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 36.w,
            padding: EdgeInsets.symmetric(vertical: 3.h),
            decoration: BoxDecoration(
              color: count > 0 ? package.colorLight : AppColors.cream,
              borderRadius: BorderRadius.circular(20.r),
            ),
            alignment: Alignment.center,
            child: Text(
              count > 0 ? '$count문' : '-',
              style: GoogleFonts.nunito(
                fontSize: 12.sp, fontWeight: FontWeight.w900,
                color: count > 0 ? package.color : AppColors.textLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
