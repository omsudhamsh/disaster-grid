from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.incidents import router as incidents_router
from routes.fusion import router as fusion_router
from routes.sensors import router as sensors_router
from routes.imagery import router as imagery_router


app = FastAPI(
    title="Disaster Grid API",
    description="AI-driven multimodal disaster response platform",
    version="1.0.0",
)


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/")
def root():
    return {
        "system": "Disaster Grid",
        "status": "operational",
        "message": "Disaster Grid API is running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }