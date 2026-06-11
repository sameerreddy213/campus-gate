# CampusGate - Smart Gate Pass Management System 🛡️

**CampusGate** is a comprehensive, digital solution designed to streamline the gate pass process for educational institutions. It facilitates seamless communication between students, wardens, parents, and security personnel, ensuring safety, efficiency, and accountability.

**[🚀 Live Demo: campus-gate-app.azurewebsites.net](https://campus-gate-app.azurewebsites.net)**

> **🚀 Calls for Collaboration!**  
> This project is open for contributions. We are looking for developers to help find bugs, improve code quality, and add new features. If you find an issue, please open a PR!

---

## ✨ Key Features

- **For Students:**
  - Easy digital outing requests.
  - Real-time status tracking.
  - History of past outings.
  - QR Code generation for gate exit/entry.

- **For Wardens/Authorities:**
  - Digital dashboard for reviewing requests.
  - One-click approval/rejection.
  - Insights into student movement.

- **For Parents:**
  - SMS/Notification alerts (Planned).
  - Approval workflow for specific outing types.

- **For Security (Watchman):**
  - QR Code scanner implementation.
  - Real-time verification of passes.
  - Entry/Exit logging.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, ShadCN UI, Framer Motion.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB.
- **Authentication:** JWT (JSON Web Tokens).

---

## 📂 Project Structure

The project is organized into two main directories:

- **`/client`**: The React frontend application.
- **`/server`**: The Node.js/Express backend API.

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (Local or Atlas connection string)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/sameerredy213/campus-gate-pass.git
cd campus-gate-pass
```

### 2. Backend Setup
Navigate to the server directory, install dependencies, and configure environment variables.

```bash
cd server
npm install
```

Create a `.env` file in the `/server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus-gate-pass
JWT_SECRET=your_super_secret_key
# Add other keys as needed
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the client directory, and install dependencies.

```bash
cd client
npm install
```

Start the frontend development server:
```bash
npm run dev
```

The application should now be running at `http://localhost:8080`.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

1.  **Fork the repository.**
2.  **Create a new branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit your changes** (`git commit -m 'Add some AmazingFeature'`).
4.  **Push to the branch** (`git push origin feature/AmazingFeature`).
5.  **Open a Pull Request.**

### 🐛 Found a Bug?
Please open an issue in the repository describing the bug, how to reproduce it, and any screenshots if possible.

---

## 💻 Local Setup & Installation

Follow these steps to get the project running on your local machine.

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local or Atlas URL)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/sameerreddy213/college-gate.git
cd college-gate
```

### 2. Install Dependencies
We use a monorepo structure. You can install all dependencies from the root:
```bash
npm run install-all
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory:
```bash
cd server
cp .env.example .env
```
Edit `.env` and add your credentials:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

### 4. 🛑 IMPORTANT: First-Time Setup (Seeding)
**You must do this before you can log in!**

The database starts empty. To create the initial **Administrator** account, run the seed script from the `server` directory:

```bash
cd server
node seed.js
```

The script prints the admin email and password to the console. You can control the credentials with the `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD` environment variables (in `server/.env`); if `DEV_ADMIN_PASSWORD` is not set, a random password is generated and printed.

### 5. Run the Application
You can run both client and server concurrently from the root:
```bash
# From root directory
npm run dev
```
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:5000

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Sameer Reddy](https://github.com/sameerredy213)
