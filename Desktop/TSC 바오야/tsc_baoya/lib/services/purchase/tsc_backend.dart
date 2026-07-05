import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// 바오야(TSC) 서버 호출 클라이언트.
/// 구매 검증·시험 시작차감·완료를 서버(ai-opic.com /api/baoya/*)에 위임한다.
/// 진실의 원천 = 서버(Google Play 검증 + Firestore 원장). 클라이언트는 결과만 신뢰.
abstract final class TscBackend {
  static const String _base = String.fromEnvironment(
    'BAOYA_API_BASE',
    defaultValue: 'https://ai-opic.com',
  );

  static Future<String?> _idToken() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    try {
      return await user.getIdToken();
    } catch (e) {
      debugPrint('[TscBackend] idToken 실패: $e');
      return null;
    }
  }

  /// 반환: { ok, _status, ... } / 네트워크·미로그인 시 null
  static Future<Map<String, dynamic>?> _post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final token = await _idToken();
    if (token == null) return null;
    try {
      final resp = await http
          .post(
            Uri.parse('$_base$path'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
      Map<String, dynamic> data;
      try {
        data = jsonDecode(resp.body) as Map<String, dynamic>;
      } catch (_) {
        data = {'ok': false};
      }
      data['_status'] = resp.statusCode;
      return data;
    } catch (e) {
      debugPrint('[TscBackend] $path 오류: $e');
      return null;
    }
  }

  // 결제 3종은 서버리스 함수 개수(Hobby 12개) 제한 때문에 단일 엔드포인트(/api/baoya-exam)로
  // 통합돼 있고, body의 action 으로 분기한다.

  /// 구매 검증 → 서버가 수량만큼 Firestore 원장에 충전.
  static Future<Map<String, dynamic>?> verifyPurchase({
    required String productId,
    required String purchaseToken,
  }) =>
      _post('/api/baoya-exam', {
        'action': 'verify-purchase',
        'productId': productId,
        'purchaseToken': purchaseToken,
      });

  /// 시험 시작 → 서버가 1회 차감(또는 진행중 세션 재개). 반환에 sessionId/resumed/remaining.
  static Future<Map<String, dynamic>?> startExam({required String productId}) =>
      _post('/api/baoya-exam', {'action': 'start-exam', 'productId': productId});

  /// 시험 완료 → 세션 닫기.
  static Future<void> completeExam({required String sessionId}) async {
    await _post('/api/baoya-exam', {'action': 'complete-exam', 'sessionId': sessionId});
  }
}
