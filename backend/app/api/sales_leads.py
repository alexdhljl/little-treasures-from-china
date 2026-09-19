import csv
import json
import os
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field, ValidationError

from app.services.sales_lead_csv import export_csv, parse_csv
from app.services.sales_lead_model import INSTITUTION_TYPES, SALES_SIGNALS, InstitutionLeadInput, seed_to_input
from app.services.sales_lead_repository import PoolConflict, SalesLeadRepository

router = APIRouter(prefix="/api/v1/sales-leads", tags=["sales-lead-pool"])


def repository():
    default = Path(__file__).resolve().parents[2] / "data" / "sales-leads.sqlite3"
    return SalesLeadRepository(Path(os.environ.get("SALES_LEADS_DB", str(default))))


def bad_request(exc):
    if isinstance(exc, PoolConflict):
        return HTTPException(409, str(exc))
    return HTTPException(422, str(exc))


class CsvImport(BaseModel):
    content: str = Field(max_length=10_000_000)


class RecordImport(BaseModel):
    records: list[InstitutionLeadInput] = Field(min_length=1, max_length=10000)


class Assignment(BaseModel):
    salespeople: list[str] = Field(min_length=1, max_length=100)
    target_per_person: int = Field(default=100, ge=1, le=10000)


class LeadUpdate(BaseModel):
    revision: int = Field(ge=1)
    review_status: Literal["pending", "approved"] | None = None
    status: Literal["new", "reviewing", "ready", "contacted", "follow_up", "qualified", "disqualified", "archived"] | None = None
    notes: str | None = Field(default=None, max_length=10000)
    reason_to_contact: str | None = Field(default=None, max_length=4000)


@router.get("/metadata")
def metadata():
    return {"institution_types": INSTITUTION_TYPES, "sales_signals": SALES_SIGNALS, "external_discovery_enabled": False}


@router.get("")
def list_leads(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
               assigned_salesperson: str | None = None, review_status: str | None = None,
               query: str | None = Query(None, max_length=200), repo=Depends(repository)):
    return repo.list(limit, offset, assigned_salesperson, review_status, query)


@router.post("/import/csv")
def import_csv(request: CsvImport, repo=Depends(repository)):
    try:
        return repo.import_records(parse_csv(request.content))
    except (ValueError, csv.Error) as exc:
        raise bad_request(exc) from exc


@router.post("/import/records")
def import_records(request: RecordImport, repo=Depends(repository)):
    try:
        return repo.import_records(request.records)
    except ValueError as exc:
        raise bad_request(exc) from exc


@router.post("/import/seeds")
def import_seeds(repo=Depends(repository)):
    path = Path(__file__).resolve().parents[3] / "frontend/data/lead-discovery/seed-leads.json"
    records = [seed_to_input(row) for row in json.loads(path.read_text(encoding="utf-8"))]
    return repo.import_records(records)


@router.get("/duplicates")
def duplicates(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0), repo=Depends(repository)):
    return {"items": repo.duplicate_events(limit, offset)}


@router.post("/assign")
def assign(request: Assignment, repo=Depends(repository)):
    if any(not name.strip() or len(name) > 100 for name in request.salespeople):
        raise HTTPException(422, "Salesperson names must be nonempty and at most 100 characters")
    try:
        return repo.assign(request.salespeople, request.target_per_person)
    except ValueError as exc:
        raise bad_request(exc) from exc


@router.get("/export.csv")
def export(assigned_salesperson: str | None = None, repo=Depends(repository)):
    return Response(export_csv(repo.export_records(assigned_salesperson)), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="sales-leads.csv"'})


@router.patch("/{identifier}")
def update(identifier: str, request: LeadUpdate, repo=Depends(repository)):
    try:
        changes = request.model_dump(exclude_unset=True, exclude={"revision"})
        return repo.update(identifier, changes, request.revision)
    except KeyError as exc:
        raise HTTPException(404, "Lead not found") from exc
    except (ValueError, ValidationError) as exc:
        raise bad_request(exc) from exc
