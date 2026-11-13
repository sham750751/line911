#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
BT="$(find "$SDK/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
PLATFORM="$SDK/platforms/android-35"
if [ ! -f "$PLATFORM/android.jar" ]; then PLATFORM="$(find "$SDK/platforms" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"; fi
mkdir -p build/classes build/dex build/assets dist
# Test-only automation hooks are omitted from the shipped game.
python3 - <<'PY'
from pathlib import Path
p=Path('android/assets/game.html').read_text()
p='\n'.join(line for line in p.splitlines() if not line.startswith('if(new URLSearchParams(location.search).has(\'qa\'))window.VVTest='))
Path('build/assets/game.html').write_text(p)
PY
"$BT/aapt2" compile --dir android/res -o build/resources.zip
"$BT/aapt2" link -I "$PLATFORM/android.jar" --manifest android/AndroidManifest.xml -R build/resources.zip -A build/assets -o build/unsigned.apk
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$PLATFORM/android.jar" -d build/classes android/src/com/codex/voidvector/MainActivity.java
mapfile -t CLASSES < <(find build/classes -name '*.class')
"$BT/d8" --lib "$PLATFORM/android.jar" --min-api 26 --output build/dex "${CLASSES[@]}"
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
keytool -genkeypair -keystore build/test.jks -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 3650 -dname "CN=Codex Void Vector"
"$BT/apksigner" sign --ks build/test.jks --ks-pass pass:android --key-pass pass:android --out dist/Void-Vector.apk build/aligned.apk
"$BT/apksigner" verify --verbose dist/Void-Vector.apk
"$BT/aapt2" dump badging dist/Void-Vector.apk
sha256sum dist/Void-Vector.apk > dist/SHA256SUMS.txt
