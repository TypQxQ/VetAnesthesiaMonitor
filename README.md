# Vet Anesthesia Monitor

An AI-powered, real-time veterinary anesthesia monitoring application. This Progressive Web App (PWA) acts as a digital anesthesia journal that can automatically read physical monitors via a camera feed using Google's Gemini AI, and sync session data instantly across multiple devices.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

**🔴 Live App: [vet-anesthesia.web.app](https://vet-anesthesia.web.app/)**

## 🎬 Demo

https://github.com/user-attachments/assets/333846b0-1dab-4b91-82a6-c0cf3ba99f56

## 🌟 Features

*   **📱 Multi-Device Sync**: Seamlessly share cases across devices (e.g., monitor via iPad, read data via an external display) in real-time.
*   **🤖 AI Monitor Reading**: Aim the device camera at any standard multiparameter monitor. The app uses Gemini AI to extract heart rate, SpO2, EtCO2, respiration rate, BP, and temperature automatically.
*   **🩺 Clinical Assessments**: Instant AI-powered evaluation of the patient's vitals based on species, weight, and selected anesthetic protocol.
*   **📊 Digital Journal**: Automatically generated electronic anesthesia journal.
*   **⚙️ Customizable Protocols**: Built-in logic for Dogs/Cats across different sizes with customized alerts and warning thresholds.

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18+)
*   A [Firebase](https://firebase.google.com/) Project for Firestore Database and Hosting
*   A [Google AI Studio](https://aistudio.google.com/) Gemini SDK Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/TypQxQ/VetAnesthesiaMonitor.git
    cd VetAnesthesiaMonitor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Then, open `.env` and fill in your Gemini and Firebase keys.

4.  **Run locally:**
    ```bash
    npm run dev
    ```
    *The app will be available on a local secure server (https) so camera permissions function properly.*

## ⚠️ Security Considerations

This project is designed as an **easy-to-deploy proof of concept** that runs entirely on Firebase's free Spark tier. It prioritizes accessibility and ease of setup. For production clinical environments, additional hardening is recommended (see below).

### API Key Exposure

The Gemini API key uses a `VITE_` prefix, which means Vite embeds it in the client-side JavaScript bundle. This is visible in browser DevTools on any live deployment. This is a known tradeoff of the free-tier architecture.

**Mitigation — API Key Restrictions (recommended):**

1.  Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2.  Click on your Gemini API key
3.  Under **Application restrictions**, select **HTTP referrers (websites)**
4.  Add your domains (e.g. `your-app.web.app/*`, `localhost:*`)
5.  Under **API restrictions**, restrict to **Generative Language API** only

This ensures the key is functionally useless outside your domains, even though it's technically visible. This is the [approach recommended by Google](https://cloud.google.com/docs/authentication/api-keys#securing) for client-side API keys.

### Firestore Rules

This app does not use Firebase Authentication. The Firestore security rules allow public read/write access to session and case data. The included `firestore.rules` block session deletion and deny access to all other collections, but without authentication the data is still publicly accessible to anyone who knows the session ID.

This is fine for demos, local use, and experimentation but should be hardened before deploying to a real clinic network.

### Hardening for Production Use

If you plan to deploy this in a clinical environment, consider:

*   **Firebase Authentication** — Add user login to restrict data access to authenticated staff
*   **Cloud Functions (Blaze plan)** — Proxy Gemini API calls through a server-side function so the API key never reaches the client
*   **Firebase App Check** — Prevent unauthorized apps from accessing your backend
*   **Dedicated infrastructure** — Run on a VPS with Docker, a dedicated database, and network-level access controls

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check our [issues page](#) or read our [Contributing Guide](CONTRIBUTING.md).

## 📄 License

This project is open-source and available under the terms of the [Apache 2.0 License](LICENSE).
