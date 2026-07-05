import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../services/purchase/purchase_service.dart';
import 'purchase_bottom_sheet.dart';

class PackageCard extends StatefulWidget {
  final TscPackage package;
  final VoidCallback? onTap;

  const PackageCard({super.key, required this.package, this.onTap});

  @override
  State<PackageCard> createState() => _PackageCardState();
}

class _PackageCardState extends State<PackageCard> {
  int _remaining = 0;

  @override
  void initState() {
    super.initState();
    _loadRemaining();
  }

  Future<void> _loadRemaining() async {
    final r = await PurchaseService.instance.getRemaining(widget.package.productId);
    if (mounted) setState(() => _remaining = r);
  }

  TscPackage get package => widget.package;

  @override
  Widget build(BuildContext context) {
    final isMock = package.type == PackageType.mockExam;

    return GestureDetector(
      onTap: widget.onTap ?? () => _onTap(context),
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(18.r),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(
            color: isMock ? package.color : package.color.withValues(alpha: 0.4),
            width: isMock ? 2.0 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: package.color.withValues(alpha: 0.15),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52.r,
              height: 52.r,
              decoration: BoxDecoration(
                color: package.colorLight,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                _icon,
                style: TextStyle(fontSize: 26.sp),
              ),
            ),
            SizedBox(width: 14.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        package.title,
                        style: GoogleFonts.nunito(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.w800,
                          color: AppColors.text,
                        ),
                      ),
                      SizedBox(width: 6.w),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                        decoration: BoxDecoration(
                          color: package.colorLight,
                          borderRadius: BorderRadius.circular(20.r),
                        ),
                        child: Text(
                          package.subtitle,
                          style: GoogleFonts.nunito(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w700,
                            color: package.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 4.h),
                  Text(
                    package.description,
                    style: GoogleFonts.nunito(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: 10.w),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (_remaining > 0)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                    decoration: BoxDecoration(
                      color: AppColors.sageL,
                      borderRadius: BorderRadius.circular(20.r),
                    ),
                    child: Text(
                      '$_remaining장',
                      style: GoogleFonts.nunito(
                        fontSize: 12.sp, fontWeight: FontWeight.w900, color: AppColors.sage,
                      ),
                    ),
                  )
                else
                  Text(
                    '${_formatPrice(package.price)}원',
                    style: GoogleFonts.nunito(
                      fontSize: 17.sp,
                      fontWeight: FontWeight.w900,
                      color: package.color,
                    ),
                  ),
                SizedBox(height: 2.h),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 14.r,
                  color: AppColors.textLight,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String get _icon {
    switch (package.type) {
      case PackageType.miniBasic:  return '🐾';
      case PackageType.miniPlus:   return '⭐';
      case PackageType.miniPro:    return '🔥';
      case PackageType.mockExam:   return '👑';
    }
  }

  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
  }

  Future<void> _onTap(BuildContext context) async {
    await showPurchaseSheet(context, package);
    _loadRemaining(); // 구매 후 잔여 횟수 갱신
  }
}
