import 'package:barcode/barcode.dart';
import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../models/tsc_model.dart';
import '../ai/tsc_grading_service.dart';

/// AI 채점 + 파트별 강사 코멘트 + 종합 의견을 PDF로 만들어 저장/공유.
/// (앱이 직접 메일·카톡 전송하지 않음 → 개인정보 미수집. OS 공유시트에서 강사가 직접 처리)
class ReportPdfService {
  // 출시 후 정식 스토어 URL이 나오면 이 한 줄만 교체. 현재는 패키지명 기반 검색 링크(출시되면 자동 연결).
  static const _appStoreUrl = 'https://play.google.com/store/apps/details?id=com.baoya.tsc';

  static const _labels = {
    'grammar': '문법', 'vocabulary': '어휘', 'fluency': '유창성', 'pronunciation': '발음/성조',
  };

  static Future<void> generateAndShare({
    required TscFeedback feedback,
    required List<TscAnswer> answers,
    required Map<int, String> teacherPartNotes,
    required String teacherOverall,
    required bool mini,
  }) async {
    // 한글 기본 + 중국어(간체) fallback (런타임 다운로드 — 채점 시점에 인터넷 연결 전제)
    final kr = await PdfGoogleFonts.nanumGothicRegular();
    final krBold = await PdfGoogleFonts.nanumGothicBold();
    final sc = await PdfGoogleFonts.notoSansSCRegular();
    final scBold = await PdfGoogleFonts.notoSansSCBold();

    final theme = pw.ThemeData.withFont(
      base: kr, bold: krBold, fontFallback: [sc, scBold],
    );

    final doc = pw.Document(theme: theme);
    final now = DateTime.now();
    final dateStr = '${now.year}.${now.month.toString().padLeft(2, '0')}.${now.day.toString().padLeft(2, '0')}';

    // 파트 번호 모음 (답변 기준)
    final partNums = answers.map((a) => a.partNum).toSet().toList()..sort();

    Map<String, String>? aiForPart(int p) {
      for (final f in feedback.partFeedback) {
        if (int.tryParse(f['part'] ?? '') == p) return f;
      }
      return null;
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(28),
        build: (ctx) => [
          // 헤더
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text('TSC 채점 리포트', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
              pw.Text('${mini ? "미니 테스트" : "모의 정상시험"} · $dateStr',
                  style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey700)),
            ],
          ),
          pw.Divider(thickness: 1.2, color: PdfColors.green),
          pw.SizedBox(height: 8),

          // 총점 + 4축
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              color: PdfColors.green50, borderRadius: pw.BorderRadius.circular(8),
            ),
            child: pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                  pw.Text('총점', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                  pw.Text('${feedback.overallScore} / 100  (${feedback.grade})',
                      style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
                ]),
                pw.Spacer(),
                pw.Wrap(spacing: 12, children: feedback.scores.entries.map((e) =>
                  pw.Text('${_labels[e.key] ?? e.key} ${e.value}/25', style: const pw.TextStyle(fontSize: 11))
                ).toList()),
              ],
            ),
          ),
          pw.SizedBox(height: 12),

          // 파트별: 답변 → AI 채점 → 강사 코멘트
          ...partNums.map((p) {
            final ai = aiForPart(p);
            final ans = answers.where((a) => a.partNum == p).toList();
            final note = (teacherPartNotes[p] ?? '').trim();
            return pw.Container(
              margin: const pw.EdgeInsets.only(bottom: 10),
              padding: const pw.EdgeInsets.all(10),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey400),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                pw.Text('제$p부', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: PdfColors.green800)),
                pw.SizedBox(height: 4),
                // 학생 답변
                ...ans.map((a) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 3),
                  child: pw.Text('• ${a.answer.isEmpty ? "(무응답)" : a.answer}', style: const pw.TextStyle(fontSize: 10.5)),
                )),
                pw.SizedBox(height: 4),
                // AI 채점
                if (ai != null) ...[
                  if ((ai['strength'] ?? '').isNotEmpty && ai['strength'] != '없음')
                    pw.Text('✓ 잘된 점: ${ai['strength']}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.green800)),
                  if ((ai['weakness'] ?? '').isNotEmpty)
                    pw.Text('△ 개선할 점: ${ai['weakness']}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.orange800)),
                  if ((ai['tip'] ?? '').isNotEmpty)
                    pw.Text('· 팁: ${ai['tip']}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.blue800)),
                  if ((ai['detail'] ?? '').isNotEmpty)
                    pw.Text('· 상세: ${ai['detail']}', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey800)),
                  if ((ai['comment'] ?? '').isNotEmpty && (ai['strength'] ?? '').isEmpty)
                    pw.Text(ai['comment']!, style: const pw.TextStyle(fontSize: 10)),
                ],
                // 강사 코멘트
                if (note.isNotEmpty) ...[
                  pw.SizedBox(height: 5),
                  pw.Container(
                    width: double.infinity,
                    padding: const pw.EdgeInsets.all(7),
                    decoration: pw.BoxDecoration(color: PdfColors.amber50, borderRadius: pw.BorderRadius.circular(5)),
                    child: pw.Text('[주요 코멘트] $note', style: pw.TextStyle(fontSize: 10.5, fontWeight: pw.FontWeight.bold)),
                  ),
                ],
              ]),
            );
          }),

          // 개선점
          if (feedback.improvements.isNotEmpty) ...[
            pw.SizedBox(height: 4),
            pw.Text('핵심 개선 포인트', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
            ...feedback.improvements.map((s) => pw.Bullet(text: s, style: const pw.TextStyle(fontSize: 10.5))),
          ],

          // 종합 강사 의견
          if (teacherOverall.trim().isNotEmpty) ...[
            pw.SizedBox(height: 10),
            pw.Container(
              width: double.infinity,
              padding: const pw.EdgeInsets.all(10),
              decoration: pw.BoxDecoration(
                color: PdfColors.amber100, borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                pw.Text('종합 코멘트', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 4),
                pw.Text(teacherOverall.trim(), style: const pw.TextStyle(fontSize: 11)),
              ]),
            ),
          ],

          // ── 앱 설치 안내 (바이럴) ──
          pw.SizedBox(height: 16),
          pw.Divider(color: PdfColors.grey400),
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.SizedBox(
                width: 56, height: 56,
                child: pw.BarcodeWidget(
                  barcode: Barcode.qrCode(),
                  data: _appStoreUrl,
                  drawText: false,
                ),
              ),
              pw.SizedBox(width: 10),
              pw.Expanded(
                child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                  pw.Text('이 리포트는 「TSC 바오야」 앱으로 작성되었습니다.',
                      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 2),
                  pw.Text('중국어 말하기 AI 채점 연습 · QR을 스캔하면 앱을 설치할 수 있습니다.',
                      style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                ]),
              ),
            ],
          ),
        ],
      ),
    );

    try {
      final bytes = await doc.save();
      await Printing.sharePdf(bytes: bytes, filename: 'TSC_리포트_$dateStr.pdf');
    } catch (e) {
      debugPrint('[Report] PDF 생성/공유 실패: $e');
      rethrow;
    }
  }
}
