<div align="center">
  <img src="https://i0.wp.com/donnykimball.com/wp-content/uploads/2024/05/An-Illustration-of-Miyamoto-Musashi.webp?fit=800%2C450&ssl=1" alt="Easir API Banner" width="100%" style="border-radius: 10px; margin-bottom: 20px;">

  # ⚡ Easir API v2 ⚡
  
  [![Node.js](https://img.shields.io/badge/Node.js-v20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-v18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  ![Status](https://img.shields.io/badge/Status-Operational-success?style=for-the-badge)
  [![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

  ### Premium High-Performance API Service
  *Engineered by Easir Iqbal Mahi*

  [Report Bug](https://github.com/sosuke-d-mahi/issues) · [Request Feature](https://github.com/sosuke-d-mahi/issues)
</div>

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation-guide)
- [Configuration](#-configuration-important)
- [Usage](#-how-to-run-the-app)
- [FAQ](#-frequently-asked-questions)

---

## 🌟 About the Project

**Easir API v2** is a robust, full-stack API service designed for high performance and scalability. It combines a powerful **Node.js/Express** backend with a dynamic **React** frontend.

**Key Features:**
*   🚀 **High Speed**: Optimized for fast response times.
*   🛡️ **Secure**: Built-in IP Guard and Traffic Logger.
*   🎨 **Modern UI**: Sleek, responsive React frontend.
*   🔌 **Socket.io**: Real-time communication support.

---

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (LTS Version)
    *   [Download Node.js](https://nodejs.org/en/download/)
*   **VS Code** (Recommended Editor)
    *   [Download VS Code](https://code.visualstudio.com/)

---

## 🛠️ Installation Guide

Follow these steps to get your copy up and running.

### 1. Clone & Setup
Open your terminal in VS Code and run:

```bash
# Install Backend Dependencies
npm install
```

### 2. Setup Frontend
The frontend lives in the `web` directory.

```bash
cd web
npm install
cd ..
```

---

## ⚙️ Configuration (Important!)

This project uses a secure configuration system. You must create a `settings.json` file.

> [!TIP]
> **Quick Start**: Copy the provided example via command line or manually.

```bash
# on Windows Command Prompt
copy settings.example.json settings.json
```

**Manual Method:**
1.  Locate `settings.example.json`.
2.  Duplicate the file and rename it to `settings.json`.
3.  Fill in your details (Operator Name, API Keys) in the new file.

> [!WARNING]
> Never commit your `settings.json` to GitHub if it contains real API keys!

---

## ▶️ How to Run the App

### 1. Build the Frontend
Compile the React application for production.

```bash
cd web
npm run build
cd ..
```

### 2. Launch the Server
Start the high-performance backend.

```bash
npm start
```

> **Success!** Open your browser to `http://localhost:5000` to see the app in action.

---

## ❓ Frequently Asked Questions

<details>
<summary><strong>Q: I see a "ReferenceError" or missing modules.</strong></summary>
Ensure you ran <code>npm install</code> in BOTH the root folder AND the <code>web</code> folder.
</details>

<details>
<summary><strong>Q: The website shows "Cannot GET /"</strong></summary>
You must run <code>npm run build</code> inside the <code>web</code> folder. The server serves the built files from <code>web/dist</code>.
</details>

<details>
<summary><strong>Q: How do I change the banner image?</strong></summary>
Update the <code>imageSrc</code> URL in your <code>settings.json</code> file.
</details>

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://github.com/sosuke-d-mahi">Easir Iqbal Mahi</a></sub>
</div>#

