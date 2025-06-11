# School Project

This is a **school project** focused on demonstrating the implementation of specific algorithms and libraries. 

## 🎯 Project Scope

> ⚠️ **Note:**  
This project is intentionally focused on implementing and showcasing the following:
- [ ] 🧠 **Merge Sort** – for sorting-related features (e.g., product lists).
- [x] 🔍 **Boyer-Moore Algorithm** – for efficient string searching (e.g., search within product names or descriptions).
- [x] 🔐 **bcrypt** – for secure password hashing during user registration and login.

Any **other features**, **security best practices**, or **vulnerabilities** are **not the focus** of this project and may be **incomplete or intentionally skipped**.

---

# 🧑‍💻 How to Run Locally

Follow these steps to set up and run the project on your local machine.

## ✅ Prerequisites

Make sure you have the following installed:

* Node.js
* Git (optional, for cloning)

## 📦 Installation

1. **Clone the repository** (or download it):

```bash
git clone https://github.com/fuyu-i/agrigorithm
cd agrigorithm
```

2. **Install dependencies**:

```bash
npm install
```

## ⚙️ Configuration

Before running the app, you'll need to update the API configuration:

1. **Locate your config.js file**

2. **Update the API_BASE_URL** to point to your local server:

```javascript
// const API_BASE_URL = 'https://agrigorithm.loca.lt';
const API_BASE_URL = 'http://localhost:3000';
```

*Make sure to comment out the original URL and uncomment the localhost URL.*

## 🚀 Running the Server

Start the Node.js backend server:

```bash
npm start
```
or
```bash
node server.js
```

This will launch the server on:

```
http://localhost:3000
```

## 🌐 Accessing the App

Open your browser and go to:

```
http://localhost:3000
```

---
# 📝 To-Do List

## Fix
- Include description when searching

## ✅ Features To Implement

- [ ] **Seller Products Page**
  - List all products uploaded by the current user
  - Option to edit the shop name

- [ ] **Add New Product Form**
  - Allow logged-in users to list new products

- [ ] **Others**

---
