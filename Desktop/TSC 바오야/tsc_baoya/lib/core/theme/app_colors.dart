import 'package:flutter/material.dart';

/// 바오야(TSC) 팔레트 — 마스코트 판다 + 중국 느낌.
/// 대나무 그린(판다) 메인 · 옥(jade) 보조 · 중국 레드/골드 포인트 · 판다 흑백 텍스트.
///
/// ⚠️ 키 이름은 이누짱 화면 코드를 1:1로 복제하기 위해 이누짱과 동일하게 유지한다
///    (예: `orange`, `cream`, `sage`, `brown` …). 이름은 이누짱과 같지만 **값은 판다·중국 색**이다.
///    즉 `orange`=대나무 그린, `sage`=옥색, `gold`=중국 골드. 화면 코드 수정 없이 테마만 바뀐다.
abstract final class AppColors {
  static const Color cream     = Color(0xFFFCF8EE); // 배경 — 판다 수채화 이미지 배경과 일치(따뜻한 크림)
  static const Color orange    = Color(0xFF4FA05A); // 메인 — 대나무 그린(판다)
  static const Color orangeL   = Color(0xFFBFE3C2); // 밝은 그린
  static const Color orangeD   = Color(0xFF2F7A3C); // 어두운 그린
  static const Color brown     = Color(0xFF9C8A5E); // 보조 — 대나무 줄기 톤
  static const Color brownL    = Color(0xFFDCE6D6); // 연한 경계선(그린 그레이)
  static const Color warmWhite = Color(0xFFF3F7EF);
  static const Color red       = Color(0xFFE23B3B); // 포인트 — 중국 레드
  static const Color redL      = Color(0xFFFAD9D6);
  static const Color sage      = Color(0xFF56A99E); // 보조 성공색 — 옥(jade) 중국 느낌
  static const Color sageL     = Color(0xFFD5ECE8);
  static const Color yellow    = Color(0xFFF2C94C); // 중국 골드-옐로
  static const Color yellowL   = Color(0xFFFCF3D6);
  static const Color text      = Color(0xFF1F2420); // 판다 블랙
  static const Color textMid   = Color(0xFF5A6158);
  static const Color textLight = Color(0xFF9AA298);
  static const Color gold      = Color(0xFFE0B23A); // 중국 골드
}
