import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

abstract final class AuthService {
  static FirebaseAuth get _auth => FirebaseAuth.instance;

  static final _googleSignIn = GoogleSignIn(
    // 바오야 전용 Firebase 프로젝트의 Web client ID로 교체 필요
    serverClientId: String.fromEnvironment('GOOGLE_WEB_CLIENT_ID'),
  );

  static User? get currentUser => _auth.currentUser;
  static bool get isLoggedIn => _auth.currentUser != null;
  static Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// 이미 로그인돼 있으면 그 유저를, 아니면 구글 로그인을 띄워 로그인시킨다.
  /// 서버 호출(구매검증·시험시작)은 Firebase IDToken이 필수라 구매/시작 직전에 이걸 통과해야 한다.
  static Future<User?> ensureSignedIn() async {
    return currentUser ?? await signInWithGoogle();
  }

  static Future<User?> signInWithGoogle() async {
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null;

      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      final result = await _auth.signInWithCredential(credential);
      return result.user;
    } on FirebaseAuthException catch (e, st) {
      debugPrint('[Auth] Google sign-in failed [${e.code}]: ${e.message}');
      debugPrintStack(stackTrace: st);
      return null;
    } catch (e, st) {
      debugPrint('[Auth] unexpected error: $e');
      debugPrintStack(stackTrace: st);
      return null;
    }
  }

  static Future<void> signOut() async {
    await Future.wait([_auth.signOut(), _googleSignIn.signOut()]);
  }
}
