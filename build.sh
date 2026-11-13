#!/usr/bin/env bash
set -euo pipefail
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
BT="$(find "$SDK/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
PLATFORM="$(find "$SDK/platforms" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
mkdir -p build/classes build/dex dist
"$BT/aapt2" link -I "$PLATFORM/android.jar" --manifest AndroidManifest.xml -o build/unsigned.apk
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$PLATFORM/android.jar" -d build/classes src/com/khanza/test/MainActivity.java
mapfile -t CLASSES < <(find build/classes -name '*.class')
"$BT/d8" --lib "$PLATFORM/android.jar" --min-api 26 --output build/dex "${CLASSES[@]}"
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
keytool -genkeypair -keystore build/test.jks -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 3650 -dname "CN=Khanza Test"
"$BT/apksigner" sign --ks build/test.jks --ks-pass pass:android --key-pass pass:android --out dist/Khanza-Test.apk build/aligned.apk
"$BT/apksigner" verify --verbose dist/Khanza-Test.apk
"$BT/aapt2" dump badging dist/Khanza-Test.apk
sha256sum dist/Khanza-Test.apk > dist/SHA256SUMS.txt
