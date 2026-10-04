import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.crisis import router as crisis_router
from routes.fusion import router as fusion_router
from routes.incidents import router as incidents_router
from routes.imagery import router as imagery_router
from routes.resources import router as resources_router
from routes.sensors import router as sensors_router

app = FastAPI(
    title="Disaster Grid API",
    description="AI-driven multimodal disaster response platform",
    version="1.0.0",
)

# Allow the React frontend to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_URL", "https://disaster-grid.vercel.app"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    incidents_router,
    prefix="/api/incidents",
    tags=["Incidents"],
)
app.include_router(
    crisis_router,
    prefix="/api/crisis",
    tags=["Crisis"],
)
app.include_router(
    fusion_router,
    prefix="/api/fusion",
    tags=["Fusion"],
)
app.include_router(
    sensors_router,
    prefix="/api/sensors",
    tags=["Sensors"],
)
app.include_router(
    imagery_router,
    prefix="/api/imagery",
    tags=["Imagery"],
)
app.include_router(
    resources_router,
    prefix="/api/resources",
    tags=["Resources"],
)


@app.get("/")
def root():
    return {
        "system": "Disaster Grid",
        "status": "operational",
        "message": "Disaster Grid API is running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
