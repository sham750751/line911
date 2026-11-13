#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
bt="$(find "$sdk/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
platform="$sdk/platforms/android-35/android.jar"
mkdir -p build/classes build/dex dist
"$bt/aapt2" compile --dir android/res -o build/resources.zip
"$bt/aapt2" link -I "$platform" --manifest android/AndroidManifest.xml -R build/resources.zip -A android/assets -o build/unsigned.apk
javac -encoding UTF-8 --release 8 -classpath "$platform" -d build/classes android/src/ru/sarexpo/ledger/*.java
mapfile -t classes < <(find build/classes -name '*.class')
"$bt/d8" --lib "$platform" --min-api 26 --output build/dex "${classes[@]}"
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$bt/zipalign" -f 4 build/unsigned.apk build/aligned.apk
cp build/aligned.apk dist/Sar-Expo-74-unsigned.apk
"$bt/aapt2" dump badging build/aligned.apk
if [[ -n "${SAR_SIGN_KEY:-}" ]]; then
  "$bt/apksigner" sign --ks "$SAR_SIGN_KEY" --ks-pass env:SAR_SIGN_PASS --out dist/Sar-Expo-74.apk build/aligned.apk
  "$bt/apksigner" verify --verbose --print-certs dist/Sar-Expo-74.apk
fi
