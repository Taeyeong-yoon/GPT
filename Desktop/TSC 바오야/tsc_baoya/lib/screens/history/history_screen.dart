import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../models/package_model.dart';
import '../../services/result/result_history_store.dart';
import '../result/result_screen.dart';

/// 내 응시 기록 — 채점된 결과를 로컬에서 다시 열람/삭제. 최근 20개까지 보관.
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<ResultRecord> _records = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await ResultHistoryStore.loadAll();
    if (mounted) setState(() { _records = list; _loading = false; });
  }

  TscPackage _pkg(PackageType t) =>
      kPackages.firstWhere((p) => p.type == t, orElse: () => kPackages.first);

  String _fmtDate(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${d.year}.${two(d.month)}.${two(d.day)} ${two(d.hour)}:${two(d.minute)}';
  }

  void _open(ResultRecord r) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ResultScreen(
          answers: r.answers,
          mini: r.mini,
          packageType: r.packageType,
          savedFeedback: r.feedback, // 저장분 열람 → 재채점 없음
        ),
      ),
    );
  }

  Future<void> _confirmDelete(ResultRecord r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cream,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
        title: Text('기록 삭제', style: GoogleFonts.nunito(fontWeight: FontWeight.w900, color: AppColors.text)),
        content: Text('이 응시 기록을 삭제할까요? 되돌릴 수 없습니다.',
            style: GoogleFonts.nunito(color: AppColors.textMid, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('취소', style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: AppColors.textLight)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.orange, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
            ),
            child: Text('삭제', style: GoogleFonts.nunito(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
    if (ok == true) {
      await ResultHistoryStore.delete(r.id);
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            // 헤더
            Padding(
              padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 8.h),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(Icons.arrow_back_ios_rounded, size: 20.r, color: AppColors.text),
                  ),
                  SizedBox(width: 12.w),
                  Text('내 기록', style: GoogleFonts.nunito(fontSize: 20.sp, fontWeight: FontWeight.w900, color: AppColors.text)),
                  const Spacer(),
                  if (_records.isNotEmpty)
                    Text('최근 ${_records.length}개', style: GoogleFonts.nunito(fontSize: 12.sp, color: AppColors.textLight, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? Center(child: CircularProgressIndicator(color: AppColors.orange))
                  : _records.isEmpty
                      ? _EmptyView()
                      : ListView.separated(
                          padding: EdgeInsets.all(20.r),
                          itemCount: _records.length,
                          separatorBuilder: (_, __) => SizedBox(height: 12.h),
                          itemBuilder: (_, i) => _RecordCard(
                            record: _records[i],
                            pkg: _pkg(_records[i].packageType),
                            dateText: _fmtDate(_records[i].savedAt),
                            onTap: () => _open(_records[i]),
                            onDelete: () => _confirmDelete(_records[i]),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  final ResultRecord record;
  final TscPackage pkg;
  final String dateText;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  const _RecordCard({
    required this.record,
    required this.pkg,
    required this.dateText,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16.r),
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(14.r),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          border: Border.all(color: AppColors.brownL),
        ),
        child: Row(
          children: [
            // 점수 원형 배지
            Container(
              width: 52.r,
              height: 52.r,
              decoration: BoxDecoration(color: pkg.colorLight, shape: BoxShape.circle),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${record.feedback.overallScore}',
                      style: GoogleFonts.nunito(fontSize: 18.sp, fontWeight: FontWeight.w900, color: pkg.color)),
                  Text('점', style: GoogleFonts.nunito(fontSize: 9.sp, color: pkg.color, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            SizedBox(width: 14.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(pkg.title, style: GoogleFonts.nunito(fontSize: 14.sp, fontWeight: FontWeight.w900, color: AppColors.text)),
                      SizedBox(width: 6.w),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 1.h),
                        decoration: BoxDecoration(color: pkg.color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20.r)),
                        child: Text(record.feedback.grade,
                            style: GoogleFonts.nunito(fontSize: 10.sp, fontWeight: FontWeight.w900, color: pkg.color)),
                      ),
                    ],
                  ),
                  SizedBox(height: 3.h),
                  Text(dateText, style: GoogleFonts.nunito(fontSize: 11.5.sp, color: AppColors.textLight, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            IconButton(
              onPressed: onDelete,
              icon: Icon(Icons.delete_outline_rounded, size: 20.r, color: AppColors.textLight),
              tooltip: '삭제',
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset('assets/pandas/bao_thinking.png', height: 110.h),
          SizedBox(height: 16.h),
          Text('아직 기록이 없어요', style: GoogleFonts.nunito(fontSize: 16.sp, fontWeight: FontWeight.w800, color: AppColors.text)),
          SizedBox(height: 6.h),
          Text('응시하고 채점을 받으면 여기에 저장됩니다.',
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(fontSize: 13.sp, color: AppColors.textMid, height: 1.5)),
        ],
      ),
    );
  }
}
