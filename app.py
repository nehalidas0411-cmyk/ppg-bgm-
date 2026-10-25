"""Backend for the ARM heart-rate-monitor showcase site.
Run:  pip install -r requirements.txt  &&  python app.py   ->  http://localhost:5000
The beat-detection code mirrors the pseudocode in the presentation:
smooth -> threshold crossing -> refractory period -> IBI -> BPM -> average.
"""
import math, random
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="static", static_url_path="")
REFRACTORY_MS = 300
AVG_BEATS = 4


def synth_ppg(bpm, noise, seconds, fs):
    """Illustrative PPG: a main systolic peak plus a smaller dicrotic bump per beat."""
    n, period = int(seconds * fs), 60.0 / bpm
    out = []
    for i in range(n):
        ph = ((i / fs) % period) / period
        v = math.exp(-((ph - 0.20) / 0.07) ** 2) + 0.35 * math.exp(-((ph - 0.48) / 0.10) ** 2)
        out.append(round(v + random.gauss(0, noise), 4))
    return out


def moving_average(x, w=5):
    out, s = [], 0.0
    for i, v in enumerate(x):
        s += v
        if i >= w:
            s -= x[i - w]
        out.append(s / min(i + 1, w))
    return out


def detect(samples, fs):
    sig = moving_average(samples)
    win, beats, last, above = int(2 * fs), [], None, False
    for i in range(1, len(sig)):
        seg = sig[max(0, i - win):i + 1]
        thr = (max(seg) + min(seg)) / 2          # adaptive mid-level threshold
        rising = sig[i - 1] < thr <= sig[i]
        if rising and max(seg) - min(seg) > 0.3:  # ignore flat / no-contact signal
            t = i * 1000 / fs
            if last is None or t - last >= REFRACTORY_MS:
                beats.append(i)
                last = t
    ibis = [(b - a) * 1000 / fs for a, b in zip(beats, beats[1:])]
    ibis = [x for x in ibis if 300 <= x <= 2000]  # validate IBI (30-200 BPM)
    recent = [60000 / x for x in ibis[-AVG_BEATS:]]
    bpm = round(sum(recent) / len(recent), 1) if recent else None
    return {"beats": beats, "ibis_ms": [round(x) for x in ibis], "bpm": bpm,
            "status": "SIGNAL OK" if bpm else "Searching"}


@app.get("/")
def home():
    return send_from_directory("static", "index.html")


@app.get("/api/ppg")
def ppg():
    bpm = min(max(float(request.args.get("bpm", 75)), 40), 180)
    noise = min(max(float(request.args.get("noise", 0.05)), 0), 0.6)
    fs = 100
    s = synth_ppg(bpm, noise, 8, fs)
    return jsonify({"fs": fs, "samples": s, **detect(s, fs)})


@app.post("/api/calc")
def calc():
    d = request.get_json(force=True)
    out = {}
    if d.get("ibi_ms"):
        out["bpm"] = round(60000 / float(d["ibi_ms"]), 1)
    if d.get("adc_count") is not None:
        c = max(0, min(4095, int(d["adc_count"])))
        out["voltage"] = round(c * 3.3 / 4095, 4)
    if d.get("device_bpm") and d.get("reference_bpm"):
        dv, rf = float(d["device_bpm"]), float(d["reference_bpm"])
        out["error_pct"] = round(abs(dv - rf) / rf * 100, 2)
    return jsonify(out)


READINGS = []


@app.post("/api/readings")
def save_reading():
    d = request.get_json(force=True)
    bpm = d.get("bpm")
    if not bpm:
        return jsonify({"error": "No valid BPM to save"}), 400
    ref = d.get("reference_bpm")
    err = round(abs(float(bpm) - float(ref)) / float(ref) * 100, 2) if ref else None
    READINGS.append({"bpm": float(bpm), "reference_bpm": float(ref) if ref else None, "error_pct": err})
    del READINGS[:-20]
    return jsonify(READINGS[-1])


@app.get("/api/readings")
def list_readings():
    return jsonify(READINGS[::-1])


if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG") == "1")
