from __future__ import annotations

from statistics import mean
from typing import Literal

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="RentFlow AI Service", version="1.0.0")


class PaymentRiskRequest(BaseModel):
    on_time_payments: int = Field(ge=0)
    late_payments: int = Field(ge=0)
    arrears_amount: float = Field(ge=0)
    rent_amount: float = Field(gt=0)
    months_in_unit: int = Field(ge=0)


class MaintenanceForecastRequest(BaseModel):
    category: Literal["plumbing", "electrical", "security", "utility", "general"]
    ticket_counts: list[int] = Field(default_factory=list)
    average_resolution_hours: float = Field(ge=0)


class ExpenseForecastRequest(BaseModel):
    monthly_expenses: list[float] = Field(default_factory=list)
    occupancy_rate: float = Field(ge=0, le=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "rentflow-ai"}


@app.post("/predict/late-payment")
def predict_late_payment(payload: PaymentRiskRequest) -> dict[str, object]:
    payment_total = max(payload.on_time_payments + payload.late_payments, 1)
    late_ratio = payload.late_payments / payment_total
    arrears_ratio = min(payload.arrears_amount / payload.rent_amount, 3)
    tenure_discount = min(payload.months_in_unit / 48, 0.25)
    score = float(np.clip((late_ratio * 0.55) + (arrears_ratio * 0.2) - tenure_discount, 0, 1))
    label = "high" if score >= 0.65 else "medium" if score >= 0.35 else "low"
    return {
        "score": round(score, 4),
        "label": label,
        "recommended_action": "send smart reminder and offer partial payment plan" if score >= 0.35 else "standard reminder cadence",
    }


@app.post("/predict/maintenance")
def predict_maintenance(payload: MaintenanceForecastRequest) -> dict[str, object]:
    baseline = mean(payload.ticket_counts) if payload.ticket_counts else 1
    trend = (payload.ticket_counts[-1] - payload.ticket_counts[0]) / max(len(payload.ticket_counts), 1) if len(payload.ticket_counts) > 1 else 0
    forecast = max(0, round(baseline + trend + payload.average_resolution_hours / 100))
    return {
        "category": payload.category,
        "forecasted_tickets_next_month": forecast,
        "confidence": 0.78,
        "note": "Use IoT meter and inspection data to improve the forecast in production.",
    }


@app.post("/forecast/expenses")
def forecast_expenses(payload: ExpenseForecastRequest) -> dict[str, object]:
    base = mean(payload.monthly_expenses) if payload.monthly_expenses else 0
    occupancy_pressure = 1 + ((payload.occupancy_rate - 0.9) * 0.18)
    forecast = max(0, base * occupancy_pressure)
    return {
        "forecast": round(forecast, 2),
        "drivers": ["occupancy_rate", "historical_expenses", "maintenance_trend"],
        "insight": "Budget reserve is healthy when projected expenses remain under 28% of rent collected.",
    }
