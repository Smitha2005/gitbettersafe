# BetterSafe 🚨  
*A personal safety web app with live tracking, SOS alerts, and hidden codeword triggers.*  

BetterSafe is my **first project**, built to provide personal safety features like live location sharing, emergency alerts, and hidden codeword triggers.  

---

## Features
- **Live Location Sharing**  
  Share your real-time location with trusted contacts using Leaflet.js.  

- **Emergency SMS Alerts**  
  Sends SOS alerts via Twilio integration.  

- **Location History**  
  Tracks and displays your movement trail with an option to clear history.  

- **SOS Codeword System**  
  - The SOS button allows you to set a secret keyword.  
  - Pressing the SOS button again hides the keyword from view.  
  - If the keyword is typed anywhere on the page, an emergency alert is automatically sent.  

- **Security**  
  - Secrets like API keys are stored in `.env` and excluded from GitHub via `.gitignore`.  
  - A `.env.example` file is included for setup reference.  

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js  
- **Frontend:** HTML, CSS, JavaScript  
- **Real-Time:** Socket.IO  
- **Maps & Location:** Leaflet.js  
- **SMS Alerts:** Twilio API 
