# VOID VECTOR

An offline portrait arcade game created for Khanza by Codex. Touch to move; firing is automatic. Clear waves, select upgrades and fight a boss every third wave. Pulse clears hostile bullets. Best score and audio preference persist locally.

The game and all graphics, its emblem and audio are bundled and generated locally. No internet permission, accounts, ads or external assets.

Build the Android APK with `bash void-vector/build-game.sh` on a machine with Java and Android SDK platform 35/build-tools. GitHub Actions uploads a signed test APK. This is a demonstration build with an ephemeral signing key; retain a dedicated private signing key before distributing future compatible updates.

Run the browser gameplay checks with `python3 void-vector/tests/smoke.py`. Tests cover actual mobile rendering, touch input, combat, shields, boss progression, upgrades, pause and persisted high scores.
