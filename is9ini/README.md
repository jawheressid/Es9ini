# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   The mobile client expects a FastAPI backend. If you run the Expo app on a device, make sure the API URL is reachable from that device (see [Configure the API URL](#configure-the-api-url)).

## Run the backend

1. Create a virtual environment (optional but recommended) and install dependencies:

   ```bash
   cd server
   pip install -r requirements.txt
   ```

2. Start the FastAPI server (default port `8000`):

   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

   The server subscribes to the Wokwi MQTT feed, exposes REST endpoints (`/api/*`) and a WebSocket at `/ws/telemetry`.

   - `POST /api/set-mode?area_id=<zone-id>&mode=auto|manual` toggles the per-zone automation. Auto mode follows the 70% / 30% dryness thresholds; manual mode leaves the pump button in full control.

## Configure the API URL

The Expo app reads the backend URL from the `EXPO_PUBLIC_API_URL` environment variable (fallback: `http://localhost:8000`).

Set the variable before launching Expo so the front-end can reach your FastAPI server:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000 npx expo start
```

On Windows PowerShell:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:8000"
npx expo start
```

If you run on a physical device via Expo Go, replace the host with your computer's LAN IP.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
