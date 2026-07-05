import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import 'tsc_backend.dart';

typedef PurchaseSuccessCallback = void Function(String productId);

/// 응시권(소비성) 결제 + 잔여 횟수 관리.
/// 잔여 횟수의 진실은 **서버(Firestore 원장 users/{uid}.credits)** 에 있다.
/// 구매 → 서버 검증(/api/baoya/verify-purchase)이 수량만큼 충전.
/// 차감은 시험 시작 시 서버(/api/baoya/start-exam)에서 처리한다.
class PurchaseService {
  static final PurchaseService instance = PurchaseService._();
  PurchaseService._();

  final _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;

  PurchaseSuccessCallback? onSuccess;

  /// 구매가 성공이 아닌 방식(취소·실패·보류·검증실패)으로 끝나도 호출 → UI 로딩 스피너 해제용.
  /// 사용자가 결제창을 닫으면(취소) onSuccess는 안 오지만 이건 와서 버튼이 정상 복귀한다.
  PurchaseSuccessCallback? onSettled;

  Future<void> initialize() async {
    _sub = _iap.purchaseStream.listen(
      _onPurchaseUpdate,
      onError: (Object e) => debugPrint('[Purchase] stream error: $e'),
    );
  }

  void dispose() {
    _sub?.cancel();
  }

  // ── 잔여 횟수 (Firestore 원장 기준) ──────────────────────────────
  static int _readCredit(Map<String, dynamic>? data, String productId) {
    final credits = (data?['credits'] as Map<String, dynamic>?) ?? const {};
    final v = credits[productId];
    if (v is int) return v;
    if (v is num) return v.toInt();
    return 0;
  }

  Future<int> getRemaining(String productId) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return 0;
    try {
      final doc =
          await FirebaseFirestore.instance.collection('users').doc(uid).get();
      return _readCredit(doc.data(), productId);
    } catch (e) {
      debugPrint('[Purchase] getRemaining error: $e');
      return 0;
    }
  }

  /// 잔여 횟수 실시간 구독 (화면에서 자동 갱신용)
  Stream<int> watchRemaining(String productId) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return Stream<int>.value(0);
    return FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .snapshots()
        .map((doc) => _readCredit(doc.data(), productId));
  }

  // ── 구매 ────────────────────────────────────────────────────────
  Future<bool> buy(String productId) async {
    final available = await _iap.isAvailable();
    if (!available) {
      debugPrint('[Purchase] IAP not available');
      return false;
    }
    final response = await _iap.queryProductDetails({productId});
    if (response.error != null || response.productDetails.isEmpty) {
      debugPrint('[Purchase] product not found: $productId / ${response.error}');
      return false;
    }
    final param = PurchaseParam(productDetails: response.productDetails.first);
    // 소비성 — 수량은 구글 결제창의 다중수량으로 사용자가 선택.
    return _iap.buyConsumable(purchaseParam: param);
  }

  Future<void> _onPurchaseUpdate(List<PurchaseDetails> purchases) async {
    for (final p in purchases) {
      switch (p.status) {
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          // 서버 검증 → 서버가 구매 수량만큼 Firestore 원장에 충전(멱등).
          final token = p.verificationData.serverVerificationData;
          final result = await TscBackend.verifyPurchase(
            productId: p.productID,
            purchaseToken: token,
          );

          final reachedServer = result != null;
          final ok = result != null && result['ok'] == true;
          final status = (result?['_status'] as int?) ?? 0;
          // 성공이거나 서버가 명확히 거절(4xx)한 경우에만 소비 완료 처리.
          // 네트워크 실패(null)·서버오류(5xx)면 미완료로 두고 다음 실행 때 재검증(서버 멱등).
          final shouldComplete =
              ok || (reachedServer && status >= 400 && status < 500);
          if (p.pendingCompletePurchase && shouldComplete) {
            await _iap.completePurchase(p);
          }
          if (ok) {
            // 성공 → onSuccess가 잔여 재로딩 + 버튼을 '시작하기'로 전환(스피너 해제 포함)
            onSuccess?.call(p.productID);
          } else {
            // 검증 실패(서버오류 등) → 스피너만 해제해 버튼 복귀
            onSettled?.call(p.productID);
          }
          break;

        case PurchaseStatus.error:
          debugPrint('[Purchase] error: ${p.error}');
          if (p.pendingCompletePurchase) {
            await _iap.completePurchase(p);
          }
          onSettled?.call(p.productID);
          break;

        case PurchaseStatus.pending:
        case PurchaseStatus.canceled:
          // 결제창을 닫거나(취소) 결제 보류 → 로딩 스피너 해제하고 버튼 복귀
          onSettled?.call(p.productID);
          break;
      }
    }
  }
}
