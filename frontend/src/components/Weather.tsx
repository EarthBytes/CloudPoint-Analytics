import React, { useMemo, useState } from "react";
import axios from "axios";

type Units = "metric" | "imperial";

const Weather: React.FC = () => {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const unitTempSuffix = units === "metric" ? "°C" : "°F";
  const unitWindSuffix = units === "metric" ? "m/s" : "mph";

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (country.trim()) params.set("country", country.trim());
    params.set("units", units);
    return params.toString();
  };

  const fetchWeatherAndForecast = async () => {
    if (!city.trim()) {
      setError("Please enter a city name");
      setWeather(null);
      setForecast(null);
      return;
    }
    setLoading(true);
    try {
      const query = buildQuery();
      const [wRes, fRes] = await Promise.all([
        axios.get(`/weather?${query}`),
        axios.get(`/forecast?${query}`)
      ]);

      const wData = wRes.data as { error?: string } & Record<string, unknown>;
      const fData = fRes.data as { error?: string } & Record<string, unknown>;

      if (wData && !wData.error) {
        setWeather(wData);
      } else {
        throw new Error(wData?.error || "City not found");
      }

      if (fData && !fData.error) {
        setForecast(fData);
      } else {
        throw new Error(fData?.error || "Forecast not available");
      }

      setError("");
    } catch (e: any) {
      const serverMsg = e?.response?.data?.error;
      console.error("Fetch failed", e?.message || e);
      setError(serverMsg || e?.message || "Could not fetch weather");
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") fetchWeatherAndForecast();
  };

  const temperature = weather?.main?.temp;
  const feelsLike = weather?.main?.feels_like;
  const description = weather?.weather?.[0]?.description ?? "";
  const icon = weather?.weather?.[0]?.icon ?? ""; // e.g., 10d
  const cityName = weather?.name ?? "";
  const apiCountry = weather?.sys?.country ?? "";
  const wind = weather?.wind?.speed;
  const humidity = weather?.main?.humidity;
  const iconUrl = icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "";

  const timezoneOffsetSec: number | undefined = weather?.timezone;
  const sunriseUnix: number | undefined = weather?.sys?.sunrise;
  const sunsetUnix: number | undefined = weather?.sys?.sunset;

  const formatTime = (unix?: number, offsetSec?: number) => {
    if (!unix || offsetSec === undefined) return "-";
    const localMs = (unix + offsetSec) * 1000;
    const d = new Date(localMs);
    const hh = d.getUTCHours().toString().padStart(2, "0");
    const mm = d.getUTCMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Build 5-day forecast cards from 3-hourly data
  const dailyForecast = useMemo(() => {
    if (!forecast?.list) return [] as any[];
    const list: any[] = forecast.list;

    // Group by date (YYYY-MM-DD) in local city time using city.timezone
    const tz = forecast?.city?.timezone ?? 0; // seconds
    const byDate: Record<string, any[]> = {};
    list.forEach((entry) => {
      const local = new Date((entry.dt + tz) * 1000);
      const yyyy = local.getUTCFullYear();
      const mm = (local.getUTCMonth() + 1).toString().padStart(2, "0");
      const dd = local.getUTCDate().toString().padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;
      byDate[key] = byDate[key] || [];
      byDate[key].push(entry);
    });

    // For each date, pick the entry closest to 12:00 local; fallback to middle entry
    const days: any[] = Object.keys(byDate)
      .sort()
      .map((dateKey) => {
        const entries = byDate[dateKey];
        let chosen = entries[0];
        let bestDiff = Infinity;
        entries.forEach((e) => {
          const local = new Date((e.dt + tz) * 1000);
          const diff = Math.abs(local.getUTCHours() - 12);
          if (diff < bestDiff) {
            bestDiff = diff;
            chosen = e;
          }
        });
        // Compute min/max for the day
        const min = Math.min(...entries.map((e) => e.main?.temp_min ?? e.main?.temp));
        const max = Math.max(...entries.map((e) => e.main?.temp_max ?? e.main?.temp));
        return { dateKey, chosen, min, max };
      });

    // Return next 5 days
    return days.slice(0, 5);
  }, [forecast]);

  return (
    <div className="container" style={{ width: "100%" }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(6px)",
        borderRadius: 16,
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        padding: 24,
        margin: "2rem auto",
        maxWidth: 880
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>CloudPoint Analytics</h1>
          <div style={{ display: "flex", gap: 8, justifySelf: "end" }}>
            <button onClick={() => setUnits("metric")} disabled={units === "metric"} style={{
              background: units === "metric" ? "#0ea5e9" : "#e2e8f0",
              color: units === "metric" ? "#fff" : "#0f172a",
              padding: "8px 12px",
              border: 0,
              borderRadius: 10,
              fontWeight: 600,
              cursor: units === "metric" ? "default" : "pointer"
            }}>°C</button>
            <button onClick={() => setUnits("imperial")} disabled={units === "imperial"} style={{
              background: units === "imperial" ? "#0ea5e9" : "#e2e8f0",
              color: units === "imperial" ? "#fff" : "#0f172a",
              padding: "8px 12px",
              border: 0,
              borderRadius: 10,
              fontWeight: 600,
              cursor: units === "imperial" ? "default" : "pointer"
            }}>°F</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="City"
              aria-label="City"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                outline: "none",
                minWidth: 180
              }}
            />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Country code (e.g., US, GB)"
              aria-label="Country code"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                outline: "none",
                minWidth: 180
              }}
            />
          </div>
          <button
            onClick={fetchWeatherAndForecast}
            disabled={loading}
            style={{
              background: "#0ea5e9",
              color: "#fff",
              padding: "10px 14px",
              border: 0,
              borderRadius: 10,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              justifySelf: "end"
            }}
          >
            {loading ? "Loading..." : "Get Weather"}
          </button>
        </div>

        {error && (
          <div style={{
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            padding: 12,
            borderRadius: 12,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {weather && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {/* Current conditions card */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>{cityName}{apiCountry ? `, ${apiCountry}` : ""}</h2>
                  <p style={{ textTransform: "capitalize", color: "#334155" }}>{description}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 48, fontWeight: 700 }}>{Math.round(temperature)}{unitTempSuffix}</span>
                  </div>
                </div>
                {iconUrl && (
                  <img src={iconUrl} alt={description} width={100} height={100} style={{ imageRendering: "-webkit-optimize-contrast" }} />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center"
                }}>
                  <p style={{ color: "#64748b" }}>Feels Like</p>
                  <p style={{ fontSize: 20, fontWeight: 700 }}>{feelsLike !== undefined ? Math.round(feelsLike) : "-"}{unitTempSuffix}</p>
                </div>
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center"
                }}>
                  <p style={{ color: "#64748b" }}>Humidity</p>
                  <p style={{ fontSize: 20, fontWeight: 700 }}>{humidity ?? "-"}%</p>
                </div>
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center"
                }}>
                  <p style={{ color: "#64748b" }}>Wind</p>
                  <p style={{ fontSize: 20, fontWeight: 700 }}>{wind ?? "-"} {unitWindSuffix}</p>
                </div>
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center"
                }}>
                  <p style={{ color: "#64748b" }}>Sunrise / Sunset</p>
                  <p style={{ fontSize: 16, fontWeight: 600 }}>{formatTime(sunriseUnix, timezoneOffsetSec)} / {formatTime(sunsetUnix, timezoneOffsetSec)}</p>
                </div>
              </div>
            </div>

            {/* Forecast grid */}
            {dailyForecast.length > 0 && (
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 20
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>5-day Forecast</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {dailyForecast.map((day) => {
                    const tz = forecast?.city?.timezone ?? 0;
                    const local = new Date((day.chosen.dt + tz) * 1000);
                    const weekday = local.toLocaleDateString(undefined, { weekday: "short" });
                    const monthDay = local.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    const dIcon = day.chosen.weather?.[0]?.icon;
                    const dDesc = day.chosen.weather?.[0]?.description ?? "";
                    const dIconUrl = dIcon ? `https://openweathermap.org/img/wn/${dIcon}@2x.png` : "";
                    return (
                      <div key={day.dateKey} style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        textAlign: "center"
                      }}>
                        <div style={{ fontWeight: 700 }}>{weekday}</div>
                        <div style={{ color: "#64748b", marginBottom: 6 }}>{monthDay}</div>
                        {dIconUrl && <img src={dIconUrl} alt={dDesc} width={64} height={64} />}
                        <div style={{ fontWeight: 700, marginTop: 6 }}>{Math.round(day.max)}{unitTempSuffix} / {Math.round(day.min)}{unitTempSuffix}</div>
                        <div style={{ textTransform: "capitalize", color: "#64748b" }}>{dDesc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!weather && !error && !loading && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 20,
            textAlign: "center"
          }}>
            <p style={{ color: "#64748b" }}>Enter city (and optional country code), pick units, then Get Weather.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;
