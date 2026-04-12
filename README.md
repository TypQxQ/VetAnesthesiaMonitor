# Vet Anesthesia Monitor

An AI-powered, real-time veterinary anesthesia monitoring application. This Progressive Web App (PWA) acts as a digital anesthesia journal that can automatically read physical monitors via a camera feed using Google's Gemini AI, and sync session data instantly across multiple devices.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

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

### Firebase Setup & Security

Since this app operates completely client-side in its current open-source form without user authentication:
**It is highly recommended to properly secure your Firestore Database.**

Deploying this app simply requires setting up Firebase Hosting and providing a `Firestore` database. However, as no authentication is included natively, failing to secure your Firestore rules (`firebase.json` & `firestore.rules`) can result in publicly editable data.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check our [issues page](#) or read our [Contributing Guide](CONTRIBUTING.md).

## 📄 License

This project is open-source and available under the terms of the [Apache 2.0 License](LICENSE).
