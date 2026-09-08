# 🛰️ BorderSight AI

### AI-Powered Border Surveillance & Monitoring System

> **Internal SIH Hackathon 2026 Project**

BorderSight AI is an intelligent border surveillance platform designed to assist security personnel in monitoring sensitive border areas through AI-powered detection, real-time alerts, tracking, analytics, and centralized web-based monitoring.

---

<h2 align="center">🌐 Live Demo</h2>

<p align="center">
  <a href="https://bordersight-ai.vercel.app/">
    <b>🚀 Open BorderSight AI Live Demo</b>
  </a>
</p>

<h2 align="center">📱 Scan to Open Live Demo</h2>

<p align="center">
  <p align="center">
  <img 
    width="500" 
    alt="BorderSight AI"
    src="https://github.com/user-attachments/assets/e8d8a5a6-8d0b-49c9-bf0c-71b1edfbee1f"
  />
</p>
</p>

---

## 🎯 Problem Statement

Border areas require continuous monitoring to identify unauthorized movement, suspicious activities, vehicle movement, and potential security threats.

Traditional surveillance systems can require continuous human monitoring of multiple camera feeds, making it difficult to quickly identify important events.

BorderSight AI aims to provide a centralized platform that helps security operators monitor and respond to such events more efficiently.

---

## 💡 Our Solution

BorderSight AI combines a web-based surveillance dashboard with AI-assisted monitoring capabilities.

The platform provides a centralized interface where operators can:

- Monitor surveillance feeds
- Detect objects and people
- Track movement
- Define monitoring zones
- Receive security alerts
- Analyze detection data
- Monitor vehicles and number plates
- Communicate with other operators
- Manage users through role-based access

---

# 🚀 Key Features

## 🖥️ 1. Centralized Dashboard

A unified dashboard provides an overview of the border surveillance system.

It includes:

- Live monitoring
- Detection statistics
- Alerts
- Camera status
- Activity information
- System overview

---

## 📹 2. Live Surveillance

The system provides a dedicated interface for monitoring surveillance camera feeds.

Operators can view camera streams and monitor activities in real time.

---

## 🤖 3. AI Object Detection

BorderSight AI uses AI-based object detection to identify objects from surveillance footage.

The detection system can assist in identifying:

- Persons
- Vehicles
- Other relevant objects

The detected information can then be displayed through the monitoring dashboard.

---

## 🚗 4. Vehicle & Number Plate Detection

The system provides a dedicated vehicle monitoring interface for detecting vehicles and extracting number-plate information.

This can help operators maintain vehicle activity records and investigate suspicious movements.

---

## 🧠 5. Behavior Analysis

The platform is designed to assist in identifying unusual or suspicious movement patterns from surveillance data.

This can help security operators focus their attention on potentially important events.

---

## 📍 6. Tracking & Zone Detection

Operators can monitor movement within defined surveillance areas.

The system provides interfaces for:

- Object tracking
- Zone monitoring
- Virtual boundaries
- Movement visualization

---

## 🚨 7. Alert Management

Important security events can be displayed through an alert management interface.

Alerts can contain information such as:

- Event type
- Time
- Location/zone
- Severity
- Detection details
- Status

---

## 📊 8. Analytics & Data View

The analytics module provides a structured view of surveillance data.

Possible information includes:

- Detection count
- Alert statistics
- Vehicle activity
- Camera activity
- Historical events
- Date-wise data

---

## 💬 9. Real-Time Communication

A communication module allows authorized users/operators to communicate through the surveillance platform.

This can help improve coordination between different security personnel.

---

## 🔐 10. Global Login & Role-Based Access

The platform includes a centralized login system.

Different users can have different roles and access levels, such as:

- Administrator
- Security Manager
- Border Officer
- Control Room Operator

The interface can dynamically adapt according to the logged-in user's role.

---

## 🎨 11. Global UI & Theme System

The website uses a centralized design system to maintain consistency across the application.

It includes:

- Global sidebar
- Global header
- Common navigation
- Dashboard template
- Consistent typography
- Theme management
- Reusable UI components

---

# 🧑‍💻 My Contribution

### Web Development & UI Implementation

My primary responsibility in the team was the **web development and UI implementation**.

I worked on the global structure of the BorderSight AI web platform, including:

- Global sidebar
- Global header
- Navigation system
- Main dashboard template
- Common page structure
- Theme consistency
- Multiple application pages
- UI components
- Page-to-page navigation
- Responsive web interface

My main focus was to make the platform:

**Consistent → Interactive → Responsive → Maintainable → Easy to use**

---

# 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive Web Design

### AI / Computer Vision

- COCO-SSD
- TensorFlow.js
- Computer Vision

### Backend / Integration

- APIs
- Backend services
- Real-time data integration

### Development Tools

- VS Code
- Git
- GitHub

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │     User Login      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   BorderSight AI    │
                    │      Dashboard      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
     Surveillance          AI Detection        User Management
          │                    │                    │
          ▼                    ▼                    ▼
     Camera Feed          Object Detection      Role Based Access
          │                    │
          └────────────┬───────┘
                       │
                       ▼
                ┌───────────────┐
                │ Alert System  │
                └───────┬───────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  Analytics  │
                 └─────────────┘
