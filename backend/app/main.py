from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.crm_email_drafts import router as crm_email_router
from app.api.leads import router as leads_router
from app.services.scraper_engine import router as scraper_router


app = FastAPI(
    title="North America Museum & Cultural Commerce Database API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads_router)
app.include_router(crm_email_router)
app.include_router(scraper_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
