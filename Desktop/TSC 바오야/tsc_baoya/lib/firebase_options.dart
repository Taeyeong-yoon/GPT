// Firebase Console에서 com.baoya.tsc 앱 등록 후 `flutterfire configure` 실행하세요.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android: return android;
      default: return android;
    }
  }

  // TODO: Firebase Console → com.baoya.tsc 앱 등록 → google-services.json 다운로드

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDFd1oCjFjjvOn6x8RNxr8cpo5mO4kv1GY',
    appId: '1:498949682642:android:cf0be51dc81331a95e440b',
    messagingSenderId: '498949682642',
    projectId: 'baoya-tsc',
    storageBucket: 'baoya-tsc.firebasestorage.app',
  );
}
