#!/usr/bin/env bash
# Reproducible SDK-only build; no Gradle or third-party native dependencies.
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with platform 35 and build-tools 35.0.0}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17}"
: "${LOOPFORGE_KEYSTORE:?Set LOOPFORGE_KEYSTORE to your signing keystore}"
: "${LOOPFORGE_KEY_PASSWORD:?Set LOOPFORGE_KEY_PASSWORD to the keystore password}"
export PATH="$JAVA_HOME/bin:$PATH"
tools_dir="$ANDROID_HOME/build-tools/35.0.0"
android_jar="$ANDROID_HOME/platforms/android-35/android.jar"
build_dir="$project_dir/android/build"
mkdir -p "$build_dir/assets/web" "$build_dir/classes" "$build_dir/dex"
for asset in index.html icon.svg manifest.webmanifest css js fonts vendor; do
  cp -R "$project_dir/$asset" "$build_dir/assets/web/"
done
"$tools_dir/aapt" package -f -M "$project_dir/android/AndroidManifest.xml" -S "$project_dir/android/res" -A "$build_dir/assets" -I "$android_jar" -F "$build_dir/resources.apk"
find "$project_dir/android/src" -name '*.java' -print > "$build_dir/sources.txt"
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$android_jar:$tools_dir/core-lambda-stubs.jar" -d "$build_dir/classes" @"$build_dir/sources.txt"
jar cf "$build_dir/classes.jar" -C "$build_dir/classes" .
"$tools_dir/d8" --lib "$android_jar" --min-api 26 --output "$build_dir/dex" "$build_dir/classes.jar"
cp "$build_dir/resources.apk" "$build_dir/unsigned.apk"
(cd "$build_dir/dex" && "$tools_dir/aapt" add "$build_dir/unsigned.apk" classes.dex)
"$tools_dir/zipalign" -f -p 4 "$build_dir/unsigned.apk" "$build_dir/aligned.apk"
"$tools_dir/apksigner" sign --ks "$LOOPFORGE_KEYSTORE" --ks-key-alias loopforge --ks-pass env:LOOPFORGE_KEY_PASSWORD --key-pass env:LOOPFORGE_KEY_PASSWORD --out "$build_dir/Loop-Forge-Carbon.apk" "$build_dir/aligned.apk"
"$tools_dir/apksigner" verify --verbose "$build_dir/Loop-Forge-Carbon.apk"
echo "$build_dir/Loop-Forge-Carbon.apk"
