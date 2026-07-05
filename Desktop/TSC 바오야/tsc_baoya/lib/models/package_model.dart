import 'package:flutter/material.dart';

enum PackageType { miniBasic, miniPlus, miniPro, mockExam }

class TscPackage {
  final PackageType type;
  final String title;
  final String subtitle;
  final int price;
  final int usageCount;
  final String productId;
  final Color color;
  final Color colorLight;
  final String description;

  const TscPackage({
    required this.type,
    required this.title,
    required this.subtitle,
    required this.price,
    required this.usageCount,
    required this.productId,
    required this.color,
    required this.colorLight,
    required this.description,
  });
}

/// 티어별·파트별 출제 문항 수 — 전 화면 공통 단일 기준. (SJPT와 동일 7파트 쌍둥이)
/// Part 1은 고정 4문항 전체. 미니 기본: 2~7부 각 1 / 미니 플러스: 2~6부 2·7부 1 /
/// 미니 프로: 2~4부 3·5~6부 2·7부 1 / 모의 정상시험: 풀버전 {2:4, 3:5, 4:5, 5:4, 6:3, 7:1}
int tscQuestionCount(PackageType type, int partNum) {
  if (partNum == 1) return 4; // Part 1 고정 4문항 전체 (랜덤 추출 없음)
  switch (type) {
    case PackageType.miniBasic:
      return 1;
    case PackageType.miniPlus:
      return partNum == 7 ? 1 : 2;
    case PackageType.miniPro:
      if (partNum == 7) return 1;
      if (partNum == 5 || partNum == 6) return 2;
      return 3; // 2~4부
    case PackageType.mockExam:
      const full = {2: 4, 3: 5, 4: 5, 5: 4, 6: 3, 7: 1};
      return full[partNum] ?? 2;
  }
}

// 모두 1회권. 수량은 구글플레이 결제창의 다중 수량(멀티수량)으로 N회 구매 →
// 서버가 구매토큰의 quantity 만큼 Firestore 원장에 충전한다.
const List<TscPackage> kPackages = [
  TscPackage(
    type: PackageType.miniBasic,
    title: '미니 기본권',
    subtitle: '1회 1,300원',
    price: 1300,
    usageCount: 1,
    productId: 'tsc_basic',
    color: Color(0xFF4FA05A), // 대나무 그린
    colorLight: Color(0xFFD6EAD3),
    description: '1부×4문항 + 2~7부×1문항',
  ),
  TscPackage(
    type: PackageType.miniPlus,
    title: '미니 플러스권',
    subtitle: '1회 2,000원',
    price: 2000,
    usageCount: 1,
    productId: 'tsc_mini_plus',
    color: Color(0xFF56A99E), // 옥(jade)
    colorLight: Color(0xFFD5ECE8),
    description: '1부×4문항 + 2~6부×2문항 + 7부×1문항',
  ),
  TscPackage(
    type: PackageType.miniPro,
    title: '미니 프로권',
    subtitle: '1회 3,000원',
    price: 3000,
    usageCount: 1,
    productId: 'tsc_mini_pro',
    color: Color(0xFFD9534F), // 중국 레드
    colorLight: Color(0xFFF6D9D7),
    description: '1부×4문항 + 2~4부×3문항 + 5~6부×2문항 + 7부×1문항',
  ),
  TscPackage(
    type: PackageType.mockExam,
    title: '모의 정상시험',
    subtitle: '1회 7,500원',
    price: 7500,
    usageCount: 1,
    productId: 'tsc_mock_exam',
    color: Color(0xFFE0B23A), // 중국 골드
    colorLight: Color(0xFFF7EAC6),
    description: '실제 시험과 동일한 풀버전',
  ),
];
