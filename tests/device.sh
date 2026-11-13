#!/usr/bin/env bash
set -euo pipefail
adb install -r dist/Sar-Expo-74.apk
adb shell am start -W -n ru.sarexpo.ledger/.MainActivity
for i in {1..15}; do
  adb shell uiautomator dump /sdcard/sar.xml >/dev/null || true
  adb pull /sdcard/sar.xml /tmp/sar.xml >/dev/null 2>&1 || true
  if [[ -f /tmp/sar.xml ]] && grep -q 'Открыть демобазу' /tmp/sar.xml; then exit 0; fi
  sleep 1
done
adb logcat -d -s AndroidRuntime:E chromium:E
exit 1
