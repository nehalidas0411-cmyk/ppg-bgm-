# Heart Rate Monitor using an ARM Controller: showcase site
Flask backend + static frontend for the Microcontrollers & Applications presentation.

## Run
    pip install -r requirements.txt
    python app.py
Open http://localhost:5000

## Files
- app.py: Flask server; /api/ppg (synthetic PPG + beat detection), /api/calc (IBI→BPM, ADC→volts, % error)
- static/index.html, style.css, app.js: the prototype interface (simulated STM32 device, OLED, live scope, telemetry, event log, reference check)

The PPG signal is simulated for demonstration; it is not a measured result.

## Deploy (Render, free tier)
1. Push this folder to a GitHub repo.
2. render.com > New > Web Service > connect the repo.
3. Build command: `pip install -r requirements.txt`  Start command: `gunicorn app:app`
4. Deploy; Render gives you a public https URL.
