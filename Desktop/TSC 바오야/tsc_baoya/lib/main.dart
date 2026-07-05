import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/theme/app_colors.dart';
import 'firebase_options.dart';
import 'screens/landing/landing_screen.dart';
import 'services/purchase/purchase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await PurchaseService.instance.initialize();
  runApp(const BaoyaApp());
}

class BaoyaApp extends StatelessWidget {
  const BaoyaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(390, 844),
      minTextAdapt: true,
      builder: (_, __) => MaterialApp(
        title: 'TSC 바오야',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.orange, surface: AppColors.cream),
          textTheme: GoogleFonts.nunitoTextTheme(),
          scaffoldBackgroundColor: AppColors.cream,
        ),
        home: const LandingScreen(),
      ),
    );
  }
}
