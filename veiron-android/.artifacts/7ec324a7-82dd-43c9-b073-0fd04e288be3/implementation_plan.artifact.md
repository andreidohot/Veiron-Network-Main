# Fix Gradle Build Error: Failed to apply plugin 'com.android.internal.version-check'

The build is failing because the Android Gradle Plugin (AGP) detects a conflict between environment variables used to locate the Android preferences folder (`ANDROID_PREFS_ROOT` and `ANDROID_USER_HOME`). Although they appear to point to the same location, AGP 9.2.1+ strictly enforces that only one should be set, or they must be perfectly consistent (and it seems even then it can fail).

Additionally, there's a potential version mismatch where AGP 9.3.0 is the current stable version, and the project is using 9.2.1.

## User Review Required

> [!IMPORTANT]
> This plan involves modifying `gradle.properties` to explicitly set the Android preference location as a system property. This should override the conflicting environment variables.
> I also recommend updating the Android Gradle Plugin (AGP) to the latest stable version (9.3.0) to ensure better compatibility with Gradle 9.4.1.

## Proposed Changes

### [Root Project]

#### [MODIFY] [gradle.properties](file:///D:/Blockchain-Core/Veiron_Network/veiron-android/gradle.properties)
- Add `systemProp.android.user.home=C:\Users\andre\.android` to explicitly define the preference root and resolve the environment variable conflict.

#### [MODIFY] [build.gradle.kts](file:///D:/Blockchain-Core/Veiron_Network/veiron-android/build.gradle.kts)
- Update AGP version from `9.2.1` to `9.3.0`.

## Verification Plan

### Automated Tests
- Run `./gradlew :app:assembleDebug` to verify that the plugin application error is resolved and the project builds successfully.
