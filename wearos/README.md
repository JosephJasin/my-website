# First Rep · Wear OS beta

Native **Kotlin + Jetpack Compose for Wear OS / Material 3** app, designed for Pixel Watch 4. It uses the workout plans and session history from https://josephjasin.com/firstrep/. Dark theme only. No Google Health integration, heart-rate collection or exercise sensor recording in this beta.

## Install on your watch

1. Open this repository's [Watch beta APK builds](https://github.com/JosephJasin/my-website/actions/workflows/watch-beta.yml). Choose the latest **successful build on main**, then download the **firstrep-watch-beta** artifact at the bottom (sign into GitHub). Unzip it to get `app-debug.apk`.
2. Install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools) on your PC. Enable Developer options on your watch by tapping its **Build number** seven times in Settings → System → About → Versions. In Developer options, enable **ADB debugging** and **Wireless debugging**. Watch and PC must be on the same Wi-Fi network.
3. Choose **Pair new device** under Wireless debugging. In a terminal on the PC, use the **pairing IP and port** shown there:

   ```sh
   adb pair WATCH_IP:PAIRING_PORT
   ```

   Enter the watch's pairing code when prompted. Return to the Wireless debugging screen and use its **connection port**, which is usually different:

   ```sh
   adb connect WATCH_IP:CONNECTION_PORT
   adb install -r app-debug.apk
   ```

4. Open **First Rep β** from the watch app launcher. Allow notifications so the active-workout shortcut is visible. Tap **Pair watch**.
5. On your phone or PC, sign into First Rep → **Settings → First Rep on your watch**. Enter the eight-character code displayed by the app and approve it. This is a different code from ADB pairing. No Google password is shared with the app.
6. Turn off ADB / Wireless debugging after installation. Optionally add the **First Rep** tile from your watch's tile picker for quick Start / Resume access.

This is a debug-signed sideload beta, not a Play Store release. Each clean CI build may use a different debug signing key. If an update reports incompatible signatures, first sync all pending sets, then uninstall the old beta and install the new APK; pair again. Uninstalling clears watch-only records. A stable private signing key should be configured before routine beta updates.

## Use it

- Select the plan and confirm your available equipment on the website. The watch follows the same next workout or resumes an active one, including one started on your phone.
- Start while connected. A new session needs the server's current plan and equipment checks.
- Tap reps or weight, then use **+ / −** or the crown. The last completed entry for that exact exercise is prefilled; always confirm it reflects what you actually did. Weight supports kg, kg each, lb, machine level, bodyweight, or blank. No keyboard.
- Tap **Log** after a set. Rest starts at 90 seconds; add 30 seconds or skip it. The watch gives a short double vibration when the timer finishes while the workout service runs. This is a convenience timer, not an exact alarm; battery restrictions or a restart may delay the cue.
- **Undo last set**, **Skip exercise**, and **Finish workout** are available. Skipping keeps already logged sets. Finish saves partial workouts; an empty session is discarded only after confirmation.
- Use the website for exercise demonstrations, changing variants, optional fourth-day selection and detailed history. A workout started there is resumable on the watch.

## Sync and recovery

A set command is encrypted and persisted on the watch before its UI advances. Commands are sent in order. Server receipts make retries safe if a response is lost. Existing session revisions protect changes made from another device.

When a phone edit conflicts, sync pauses. **Review entries** shows the pending commands. **Use website version** moves pending commands into a local recovery archive and loads the server copy; it does not automatically reapply them. Compare the archive with website history before re-entering anything, because an entry may have reached the server before the response was lost. Pairing again also preserves this archive. It survives app restarts, but not uninstalling or clearing app data.

Open the app to resume sync after a reboot or after finishing offline. The foreground service stops when the session ends (or after a minute waiting to send its final entries). Access lasts 90 days and can be revoked from website Settings. Revoked devices cannot read or write workouts.

## Development

Requires JDK 17, Gradle 8.13 and Android SDK platform 36 / build-tools 35.0.0. No Gradle wrapper is checked in; CI installs the pinned Gradle version.

```sh
cd wearos
gradle :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

CI uploads the debug APK and reports. The web server creates watch tables idempotently; no manual D1 migration is needed for an existing initialized First Rep database.

The native gateway `/firstrep-watch-api/` is separate from the Cloudflare Access browser path `/firstrep/`. It authenticates per-device 256-bit bearer tokens, stored only as hashes on the server, with a short-lived pairing code approved through the existing owner-verified browser session. It cannot export profile data, edit settings or import backups. Browser-origin requests are rejected and CORS is not enabled. Do not put a Cloudflare service token or owner credential in the APK.

Physical-watch checks before relying on the beta: round-screen layout and font scaling; crown direction and increments; notifications and haptic timing with the screen off; Wi-Fi/Bluetooth network handover; airplane-mode logging followed by reconnect; phone/watch concurrent edits; restart with pending sets; revoke and re-pair. Automated tests cannot establish those hardware behaviours.
