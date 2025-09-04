from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import os

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development ... later restrict
    allow_methods=["*"],
    allow_headers=["*"]
)

API_KEY = "" # Insert your OpenWeather API key here 
VALID_UNITS = {"metric", "imperial"}


def fetch_openweather(endpoint: str, city: str, country: str, units: str):
    if not city:
        return JSONResponse({"error": "City is required"}, status_code=400)
    if units not in VALID_UNITS:
        return JSONResponse({"error": "Invalid units. Use 'metric' or 'imperial'."}, status_code=400)

    query = f"{city},{country}" if country else city
    url = f"https://api.openweathermap.org/data/2.5/{endpoint}"
    params = {"q": query, "appid": API_KEY, "units": units}

    try:
        resp = requests.get(url, params=params, timeout=10)
    except requests.RequestException as exc:
        return JSONResponse({"error": f"Upstream request failed: {exc}"}, status_code=502)

    try:
        data = resp.json()
    except ValueError:
        return JSONResponse({"error": "Upstream returned non-JSON response"}, status_code=502)

    if resp.status_code != 200:
        message = data.get("message") or "Upstream error"
        return JSONResponse({"error": message}, status_code=resp.status_code)

    return JSONResponse(data, status_code=200)


@app.get("/weather")
def get_weather(city: str, country: str = "", units: str = "metric"):
    return fetch_openweather("weather", city, country, units)


@app.get("/forecast")
def get_forecast(city: str, country: str = "", units: str = "metric"):
    return fetch_openweather("forecast", city, country, units)
