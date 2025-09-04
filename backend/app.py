from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import os
from typing import Optional

app = FastAPI(
    title="CloudPoint Analytics API",
    description="Advanced weather insights and forecasting API",
    version="1.0.0"
)

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
    if not API_KEY:
        return JSONResponse({"error": "API key not configured. Please add your OpenWeather API key to the API_KEY variable."}, status_code=500)
    
    if not city or not city.strip():
        return JSONResponse({"error": "City is required"}, status_code=400)
    if units not in VALID_UNITS:
        return JSONResponse({"error": "Invalid units. Use 'metric' or 'imperial'."}, status_code=400)

    query = f"{city.strip()},{country.strip()}" if country and country.strip() else city.strip()
    url = f"https://api.openweathermap.org/data/2.5/{endpoint}"
    params = {"q": query, "appid": API_KEY, "units": units}

    try:
        resp = requests.get(url, params=params, timeout=15)
    except requests.Timeout:
        return JSONResponse({"error": "Request timeout. Please try again."}, status_code=504)
    except requests.RequestException as exc:
        return JSONResponse({"error": f"Network error: {str(exc)}"}, status_code=502)

    try:
        data = resp.json()
    except ValueError:
        return JSONResponse({"error": "Invalid response format from weather service"}, status_code=502)

    if resp.status_code != 200:
        message = data.get("message", "Unknown error from weather service")
        if resp.status_code == 401:
            message = "Invalid API key. Please check your OpenWeather API key."
        elif resp.status_code == 404:
            message = "City not found. Please check the city name and country code."
        return JSONResponse({"error": message}, status_code=resp.status_code)

    return JSONResponse(data, status_code=200)

@app.get("/")
def root():
    return {
        "message": "Welcome to CloudPoint Analytics API",
        "version": "1.0.0",
        "endpoints": {
            "weather": "/weather?city={city}&country={country}&units={metric|imperial}",
            "forecast": "/forecast?city={city}&country={country}&units={metric|imperial}",
            "health": "/health"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "api_key_configured": bool(API_KEY),
        "service": "CloudPoint Analytics API"
    }

@app.get("/weather")
def get_weather(city: str, country: str = "", units: str = "metric"):
    return fetch_openweather("weather", city, country, units)


@app.get("/forecast")
def get_forecast(city: str, country: str = "", units: str = "metric"):
    return fetch_openweather("forecast", city, country, units)
