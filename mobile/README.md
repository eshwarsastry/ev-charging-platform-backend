# OHMCharge mobile

An Expo SDK 57 / React Native app for Android and iOS, with a web preview.

## Run

Use Node 24. From this directory:

```sh
npm ci
npm start
```

With no API URL, Discover starts in **Sample stations** mode. All sample locations, networks and availability are fictional. Connected mode never fills missing results with fixtures.

To connect the backend, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`. Restart Expo after changing it. For a physical phone use your computer's reachable LAN address; `localhost` refers to the phone itself. Android emulators commonly use `http://10.0.2.2:3000`. Deployed and release builds require HTTPS. For the web preview, add its origin to backend `CORS_ORIGINS`.

The app supports coordinate search, optional foreground GPS permission, station/network filtering, power and availability filters, connector details, external map directions and provider connection status. Live results require configured and synced operator feeds. Discovery does not start a charger.

## FASTag demonstration

Set `FASTAG_MODE=mock` and `ENABLE_PAYMENT_SANDBOX=true` on a test backend. The FASTag tab calls the public sandbox endpoint and offers active, low-balance and blacklisted scenarios. The server fixes the illustrative session at 12 kWh / INR 240. It reads no real tag, moves no money and starts no charging session. Receipts are ephemeral demonstrations, not persisted financial records.

Administrative FASTag endpoints require a server-side admin key. **Never put that key or partner credentials in this app or an `EXPO_PUBLIC_*` variable.** User sign-in, ownership-checked session history, operator remote start/stop, signed CDR billing and acquiring-bank integration remain prerequisites for live payment features.

## Verify and build

```sh
npm run lint
npm run typecheck
npx expo install --check
npm run export
```

CI exports Android, iOS and web JavaScript/assets. These exports are not signed APK/IPA files. Create signed builds using your Expo account and platform signing credentials:

```sh
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

Confirm ownership of `com.ohmcharge.mobile`, register the EAS project, and configure the HTTPS API URL in the selected EAS environment before building. iOS internal builds require registered test devices. Production profiles are provided but no store submission is performed by CI.
