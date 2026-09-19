"""Transactional local institution pool, separate from storefront and legacy crawl JSON."""
from __future__ import annotations
import hashlib
import json
import sqlite3
import uuid
from contextlib import contextmanager
from pathlib import Path

from app.services.institution_normalization import name_location_key, normalized_country, normalized_domain, normalized_state, normalized_text, normalized_website
from app.services.sales_lead_model import InstitutionLeadInput, eligibility, timestamp


class PoolConflict(ValueError):
    pass


class SalesLeadRepository:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS institutions (
                    id TEXT PRIMARY KEY, payload TEXT NOT NULL,
                    assigned_salesperson TEXT, review_status TEXT NOT NULL,
                    status TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS identities (
                    kind TEXT NOT NULL, value TEXT NOT NULL,
                    institution_id TEXT NOT NULL REFERENCES institutions(id),
                    PRIMARY KEY(kind, value)
                );
                CREATE INDEX IF NOT EXISTS pool_assignment ON institutions(review_status, assigned_salesperson, status);
                CREATE TABLE IF NOT EXISTS duplicate_events (
                    fingerprint TEXT PRIMARY KEY, institution_id TEXT NOT NULL,
                    reason TEXT NOT NULL, needs_review INTEGER NOT NULL,
                    incoming TEXT NOT NULL, created_at TEXT NOT NULL
                );
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=20)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def keys(record: dict):
        website = normalized_website(record.get("website"))
        domain = normalized_domain(record.get("website") or record.get("domain"))
        # A reviewed public-source URL can identify a source-only institution,
        # but a directory host must NEVER collapse every listing into one lead.
        website_key = website or normalized_website(record.get("source_url"))
        return [(kind, key) for kind, key in [
            ("domain", domain), ("website", website_key),
            ("name_location", name_location_key(record.get("institution_name"), record.get("city"), record.get("state"), record.get("country"))),
        ] if key]

    @staticmethod
    def decode(row):
        record = json.loads(row["payload"])
        record.update(revision=row["revision"], missing_requirements=eligibility(record))
        record["pool_ready"] = not record["missing_requirements"] and record["review_status"] == "approved" and record["status"] not in {"archived", "disqualified"}
        record["contact_verification"] = "unverified" if record.get("email") or record.get("phone") else "missing"
        return record

    @staticmethod
    def write(db, record, new=False):
        values = (json.dumps(record, ensure_ascii=False), record.get("assigned_salesperson"), record["review_status"], record["status"], record["id"])
        if new:
            db.execute("INSERT INTO institutions(payload,assigned_salesperson,review_status,status,id) VALUES(?,?,?,?,?)", values)
        else:
            db.execute("UPDATE institutions SET payload=?,assigned_salesperson=?,review_status=?,status=?,revision=revision+1 WHERE id=?", values)

    def import_records(self, records: list[InstitutionLeadInput]):
        summary = {"created": 0, "duplicates": 0, "review_required": 0, "results": []}
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for item in records:
                record = item.model_dump()
                record["domain"] = normalized_domain(record.get("website") or record.get("domain"))
                keys = self.keys(record)
                if not keys:
                    raise ValueError("Each candidate needs a website, source URL or name plus location")
                matches = []
                for kind, value in keys:
                    row = db.execute("SELECT institution_id FROM identities WHERE kind=? AND value=?", (kind, value)).fetchone()
                    if row:
                        matches.append((kind, row[0]))
                if matches:
                    # Shared platforms host distinct bookstores/venues. An exact
                    # page or name/location match takes precedence over host-only.
                    specific = next((match for match in matches if match[0] == "website"), None) or next((match for match in matches if match[0] == "name_location"), None)
                    if specific and specific[1] != matches[0][1]:
                        matches = [specific]
                    reason, identifier = matches[0]
                    reason = "same_" + reason
                    old = json.loads(db.execute("SELECT payload FROM institutions WHERE id=?", (identifier,)).fetchone()[0])
                    names_differ = bool(record.get("institution_name") and old.get("institution_name") and normalized_text(record["institution_name"]) != normalized_text(old["institution_name"]))
                    locations_differ = any(record.get(k) and old.get(k) and normalize(record[k]) != normalize(old[k]) for k, normalize in [("city", normalized_text), ("state", normalized_state)])
                    countries_differ = bool(record.get("country") and old.get("country") and normalized_country(record["country"]) != normalized_country(old["country"]))
                    conflict = countries_differ or len({m[1] for m in matches}) > 1 or (reason != "same_name_location" and (names_differ or locations_differ))
                    incoming = json.dumps(record, sort_keys=True, ensure_ascii=False)
                    fingerprint = hashlib.sha256((identifier + incoming).encode()).hexdigest()
                    db.execute("INSERT OR IGNORE INTO duplicate_events VALUES(?,?,?,?,?,?)", (fingerprint, identifier, reason, int(conflict), incoming, timestamp()))
                    if conflict and reason == "same_domain" and normalized_website(record.get("website")) != normalized_website(old.get("website")) and (names_differ or locations_differ):
                        # Keep separately addressable shared-host candidates; never
                        # approve or assign them merely because a page differs.
                        new_id = str(uuid.uuid4())
                        record.update(id=new_id, created_at=timestamp(), updated_at=timestamp(), assigned_salesperson=None, review_status="pending")
                        self.write(db, record, new=True)
                        for kind, value in keys:
                            db.execute("INSERT OR IGNORE INTO identities VALUES(?,?,?)", (kind, value, new_id))
                        summary["created"] += 1
                        summary["review_required"] += 1
                        summary["results"].append({"id": new_id, "duplicate_reason": reason, "needs_review": True})
                        continue
                    summary["duplicates"] += 1
                    summary["review_required"] += int(conflict)
                    if not conflict:
                        # Reimports never reset ownership, CRM state or review decisions.
                        for key, value in record.items():
                            if key not in {"assigned_salesperson", "status", "review_status"} and old.get(key) in (None, "") and value not in (None, ""):
                                old[key] = value
                        current = json.loads(db.execute("SELECT payload FROM institutions WHERE id=?", (identifier,)).fetchone()[0])
                        if old != current:
                            old["updated_at"] = timestamp()
                            self.write(db, old)
                        for kind, value in keys:
                            db.execute("INSERT OR IGNORE INTO identities VALUES(?,?,?)", (kind, value, identifier))
                    summary["results"].append({"id": identifier, "duplicate_reason": reason, "needs_review": conflict})
                    continue
                identifier = str(uuid.uuid4())
                record.update(id=identifier, created_at=timestamp(), updated_at=timestamp(), assigned_salesperson=None, review_status="pending")
                self.write(db, record, new=True)
                for kind, value in keys:
                    db.execute("INSERT INTO identities VALUES(?,?,?)", (kind, value, identifier))
                summary["created"] += 1
                summary["results"].append({"id": identifier, "duplicate_reason": None, "needs_review": False})
        return summary

    @staticmethod
    def filters(assigned_salesperson=None, review_status=None, query=None):
        clauses, params = [], []
        if assigned_salesperson is not None:
            clauses.append("COALESCE(assigned_salesperson,'')=?")
            params.append(normalized_text(assigned_salesperson))
        if review_status:
            clauses.append("review_status=?")
            params.append(review_status)
        if query:
            # Search only identity fields, not JSON syntax/notes. Bound parameters.
            clauses.append("(json_extract(payload,'$.institution_name') LIKE ? ESCAPE '\\' OR json_extract(payload,'$.city') LIKE ? ESCAPE '\\' OR json_extract(payload,'$.state') LIKE ? ESCAPE '\\')")
            escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            params.extend(["%" + escaped + "%"] * 3)
        return (" WHERE " + " AND ".join(clauses) if clauses else ""), params

    def list(self, limit=100, offset=0, assigned_salesperson=None, review_status=None, query=None):
        where, params = self.filters(assigned_salesperson, review_status, query)
        with self.connect() as db:
            total = db.execute("SELECT count(*) FROM institutions" + where, params).fetchone()[0]
            rows = db.execute("SELECT * FROM institutions" + where + " ORDER BY rowid LIMIT ? OFFSET ?", [*params, limit, offset]).fetchall()
            return {"total": total, "items": [self.decode(row) for row in rows], "limit": limit, "offset": offset}

    def export_records(self, assigned_salesperson=None):
        where, params = self.filters(assigned_salesperson)
        with self.connect() as db:
            return [self.decode(row) for row in db.execute("SELECT * FROM institutions" + where + " ORDER BY rowid", params)]

    def duplicate_events(self, limit=100, offset=0):
        with self.connect() as db:
            rows = db.execute("SELECT * FROM duplicate_events ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
            return [{**dict(row), "incoming": json.loads(row["incoming"])} for row in rows]

    def update(self, identifier, changes, revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM institutions WHERE id=?", (identifier,)).fetchone()
            if not row:
                raise KeyError(identifier)
            if row["revision"] != revision:
                raise PoolConflict("Lead changed; refresh before editing")
            record = json.loads(row["payload"])
            record.update(changes)
            validated = InstitutionLeadInput.model_validate({k: record.get(k) for k in InstitutionLeadInput.model_fields}).model_dump()
            record.update(validated)
            if record["review_status"] == "approved" and eligibility(record):
                raise ValueError("Review requires name, location and website or trusted public source")
            record["updated_at"] = timestamp()
            self.write(db, record)
            return self.decode(db.execute("SELECT * FROM institutions WHERE id=?", (identifier,)).fetchone())

    def assign(self, salespeople: list[str], target_per_person: int):
        salespeople = list(dict.fromkeys(key for name in salespeople if (key := normalized_text(name))))
        if not salespeople:
            raise ValueError("At least one salesperson is required")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            counts = {name: db.execute("SELECT count(*) FROM institutions WHERE assigned_salesperson=?", (name,)).fetchone()[0] for name in salespeople}
            need = sum(max(0, target_per_person - n) for n in counts.values())
            rows = db.execute("SELECT * FROM institutions WHERE assigned_salesperson IS NULL AND review_status='approved' AND status NOT IN ('archived','disqualified') ORDER BY rowid LIMIT ?", (need,)).fetchall()
            assigned = 0
            for row in rows:
                record = json.loads(row["payload"])
                if eligibility(record):
                    continue
                eligible = [name for name in salespeople if counts[name] < target_per_person]
                if not eligible:
                    break
                owner = min(eligible, key=lambda name: counts[name])
                record.update(assigned_salesperson=owner, updated_at=timestamp())
                self.write(db, record)
                counts[owner] += 1
                assigned += 1
            return {"assigned_now": assigned, "counts": counts, "shortfall": {name: max(0, target_per_person - count) for name, count in counts.items()}}
