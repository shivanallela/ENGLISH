# Antigravity AI – Intelligent Speech & Text Reconstruction Agent

Antigravity AI is an advanced, premium Natural Language Understanding (NLU), Intent Reconstruction, and Communication Intelligence system designed to process poorly written or spoken text and reconstruct the exact sentence the user intended to communicate. 

The application runs directly in the browser as a client-side Single Page Application (SPA), integrating with **Google's Gemini 2.5 Flash / Pro** models to achieve deep semantic reconstruction.

---

## 🌟 Key Features

1. **Dual Voice Capture Modes**:
   - **Live Speech Transcription**: Utilizes the browser's `webkitSpeechRecognition` API for real-time speech-to-text directly in the textarea.
   - **Audio Recording**: Record audio via your microphone and stream the raw binary files directly to the Gemini API (which natively understands audio inputs).
2. **Interactive LCS Diff Viewer**:
   - Highlights exact word additions and deletions inline so you can compare the original input with the reconstructed results.
3. **8-Step Reasoning Pipeline Timeline**:
   - Animates the agent's internal analysis process before rendering final results (Identify Context &rarr; Analyze Anomalies &rarr; Recover Intent &rarr; Reconstruct Semantics &rarr; Rank Alternatives &rarr; Validate Confidence &rarr; Synthesize Explanations &rarr; Formulate Learning Tip).
4. **Interactive Sandbox & Presets**:
   - Runs out-of-the-box in **Sandbox Mode** without an API Key.
   - Provides five high-quality presets demonstrating complex scenarios (speech fillers, Telugu-English mix, Hindi-English mix, extreme typos, and broken OCR fragments).
5. **Clarification Handler (Low Confidence)**:
   - If the reconstruction confidence drops below the configurable threshold, the UI prompts the user with the agent's specific clarification question and a response field.
6. **Learning Hub & Explanations**:
   - Structured logs explaining grammar rules, vocabulary enhancements, and educational writing tips.
7. **Premium Styling & Accessibility**:
   - A gorgeous glassmorphic dark theme, glowing animations, a canvas audio visualizer, and custom scrollbars.

---

## 🚀 Quick Start

### Method 1: Instant Launch (No Installation)
1. Navigate to the project folder.
2. Double-click [index.html](file:///c:/Users/shiva/civic%20issue/PDD%20PROJECT/ENGLISH/index.html) to open the application in any modern web browser (Google Chrome or Microsoft Edge recommended for Speech APIs).

### Method 2: Running a Local Development Server (Recommended)
Running through an HTTP server ensures full support for media device APIs and local storage features.

1. Open a terminal in this directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.

---

## ⚙️ Configuration & API Key

By default, the application runs in **Sandbox Mode** with mock responses. To unlock live, arbitrary AI reconstructions:
1. Click the **Settings (Gear)** icon in the top right.
2. Input your **Google Gemini API Key** (you can obtain one from the Google AI Studio).
3. Select your preferred model (`Gemini 2.5 Flash` or `Gemini 2.5 Pro`).
4. Click **Test Connection** to confirm setup, then click **Save & Apply**.

*Note: Your API Key is saved securely inside your browser's local storage and is only sent directly to Google's API endpoints.*
