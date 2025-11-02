# Smart Irrigation System – *Mabrouka’s Smart Farm*

> **An intelligent irrigation management system** that monitors soil moisture, predicts weather, and automates irrigation to optimize water usage and support sustainable agriculture.  
> Built with **React Native (frontend)** and **FastAPI (backend)**.

---

## 🚀 Project Overview

This project is composed of **four main missions**, each designed to empower the farmer *Mabrouka* with smart insights and automation for her land.

### 🌱 Mission 1 – Dashboard for Mabrouka

Create an interactive dashboard to help Mabrouka:
- Visualize **real-time soil moisture** levels.  
- Know if her land is **thirsty or well-irrigated**.  
- Monitor data through an intuitive **React Native mobile interface**.

> 💡 The dashboard acts as Mabrouka’s control center to understand the current condition of her soil.

---

### 🤖 Mission 2 – Teaching the Machine (Smart Irrigation Logic)

Train the system to **understand when the soil is thirsty** and decide when to irrigate, using simple rule-based logic.

**Irrigation Decision Rules:**
- If soil moisture is **below a defined threshold → Open pump** (start irrigation).  
- If soil moisture is **above the threshold → Stop pump** (no irrigation needed).

> ✅ The system supports both **manual mode** (Mabrouka decides) and **automatic mode** (the system controls irrigation).

---

### 📲 Mission 3 – Smart Notifications & Pump Status

Provide Mabrouka with real-time feedback about her land and irrigation system:

- Display which **pumps are ON or OFF**.  
- Send **SMS notifications** through [**TextBee.dev**](https://textbee.dev) when:
  - Soil becomes dry (irrigation needed).  
  - Pump status changes (ON/OFF).  
- Notify Mabrouka even when she is **offline or not using the app**.

> 📡 Ensures Mabrouka never misses a critical irrigation alert.

---

### ☁️ Mission 4 – Weather Forecast Integration

Integrate the **OpenWeatherMap API** to forecast:
- 🌧️ Rainfall (mm)  
- 🌡️ Temperature (°C)  
- 💧 Humidity (%)  

**Irrigation Decision Based on Forecast:**
- If **rainfall is expected**, irrigation is delayed.  
- The system estimates **how many days to skip** based on expected rainfall amount.

> 🔮 Predictive irrigation helps conserve water and prevent overwatering.

---

## 🧠 System Architecture

    ┌────────────────────┐
    │      Sensors       │
    │   (Soil Moisture,  │
    │    Temperature,    │
    │    Humidity)       │
    └─────────┬──────────┘
              │
              ▼
      ┌──────────────── ┐
      │     ESP32       │
      │ Microcontroller │
      └─────────────────┘
              │ Wi-Fi
              ▼
     ┌───────────────────┐
     │   FastAPI Server  │
     │ (Python Backend)  │
     └────────┬──────────┘
              │
              ▼
     ┌───────────────────┐
     │  React Native     │
     │  Mobile App (UI)  │
     └───────────────────┘
              │
              ▼
     ┌──────────────────┐
     │ TextBee.dev API  │
     │ (SMS Alerts)     │
     └──────────────────┘


     
---

## ⚙️ How It Works

1. **ESP32** connects to Wi-Fi and sends soil and weather sensor data to the **FastAPI backend**.  
2. The backend applies decision logic to determine if irrigation is needed.  
3. **AutoMode logic:**
   - Turns **ON** the pump when:
     - Soil is dry **AND** (Temperature is high **OR** Humidity is low)  **AND** No rain detected.
   - Turns **OFF** the pump otherwise.
4. The **React Native dashboard** displays:
   - Real-time soil moisture readings  
   - Pump status (ON/OFF)  
   - Weather forecast  
   - Irrigation recommendations  
5. **TextBee.dev** sends SMS alerts to Mabrouka when:
   - Irrigation is required  
   - Pump state changes  
   - Forecast indicates potential rain  

---

## 🧩 Tech Stack

| Layer | Technology | Description |
|-------|-------------|-------------|
| **Frontend** | React Native | Mobile dashboard for the farmer |
| **Backend** | FastAPI | Python-based API handling sensor data and logic |
| **Hardware** | ESP32 + Sensors | Measures soil moisture, humidity, temperature |
| **Weather Data** | OpenWeatherMap API | Provides rainfall, humidity, and temperature forecast |
| **Notifications** | TextBee.dev | Sends SMS alerts and irrigation warnings |

---

## 🔔 Features Summary

✅ Real-time soil monitoring  
✅ Automatic or manual irrigation control  
✅ Weather-based irrigation scheduling  
✅ SMS notifications via TextBee.dev  
✅ Mobile-friendly dashboard  

---

## 💻 Installation & Running the Project

### Client (React Native)
```bash
# Install dependencies
npm install

# Start the development server
npm run start

```
### Server (FastAPI)
```bash
# Navigate to server folder
cd server

# Activate virtual environment
./venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI server
uvicorn app:app --reload
```

🌐 Wokwi Simulation

Test the ESP32 and sensors online using this Wokwi project:
https://wokwi.com/projects/446488612639019009


## 🧭 Future Improvements

- Integrate a **database** to log sensor data and irrigation history.  
- Add **AI/ML model** for adaptive threshold adjustment.  
- Enable **multi-field support** for larger farms.  
- Include **data visualization and analytics** (trends over time).  
- Add **voice assistant or chatbot** for easier interaction.

---

## 👩‍🌾 Author

**Developed by:** *WIIIIIIOUUUU*    
**Purpose:** Smart irrigation solution for smallholder farmers like Mabrouka.

