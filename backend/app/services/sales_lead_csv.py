import csv
import io

from app.services.sales_lead_model import InstitutionLeadInput, seed_to_input

COLUMNS = [
    ("Institution Name", "institution_name"), ("Institution Type", "institution_type"),
    ("City", "city"), ("State", "state"), ("Country", "country"), ("Website", "website"),
    ("Contact Page", "contact_page"), ("Phone", "phone"), ("Email", "email"),
    ("Founded Year", "founded_year"), ("Opened Year", "opened_year"),
    ("Sales Signal", "sales_signal"), ("Reason to Contact", "reason_to_contact"),
    ("Source URL", "source_url"), ("Source Type", "source_type"),
    ("Assigned Salesperson", "assigned_salesperson"), ("Status", "status"), ("Notes", "notes"),
    ("ID", "id"), ("Domain", "domain"), ("Created At", "created_at"), ("Updated At", "updated_at"),
    ("Review Status", "review_status"),
]


def excel_safe(value):
    value = "" if value is None else str(value)
    if value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("'", "\t", "\r", "\n")):
        return "'" + value
    return value


def decode_excel(value):
    if value.startswith("'"):
        tail = value[1:]
        if tail.lstrip().startswith(("=", "+", "-", "@")) or tail.startswith(("'", "\t", "\r", "\n")):
            return tail
    return value


def export_csv(records: list[dict]) -> bytes:
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, lineterminator="\r\n")
    writer.writerow([title for title, _ in COLUMNS])
    for record in records:
        writer.writerow([excel_safe(record.get(key)) for _, key in COLUMNS])
    return stream.getvalue().encode("utf-8-sig")  # Excel Unicode auto-detection.


def parse_csv(content: str) -> list[InstitutionLeadInput]:
    if len(content) > 10_000_000:
        raise ValueError("CSV exceeds 10 MB text limit")
    reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff"), newline=""), strict=True)
    headers = reader.fieldnames or []
    if not headers or len(set(headers)) != len(headers):
        raise ValueError("CSV requires unique column headers")
    aliases = {title: key for title, key in COLUMNS}
    fields = set(InstitutionLeadInput.model_fields)
    legacy = "name" in headers and "category" in headers
    known = fields | set(aliases) | {"id", "created_at", "updated_at"}
    if not legacy and any(h not in known for h in headers):
        raise ValueError("Unrecognized columns; use the sales export template or legacy seed CSV")
    records = []
    for number, row in enumerate(reader, start=2):
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"CSV record {number}: wrong column count")
        row = {key: decode_excel(value) for key, value in row.items()}
        if not any(value.strip() for value in row.values()):
            continue
        if legacy:
            records.append(seed_to_input({key: value or None for key, value in row.items()}))
        else:
            values = {aliases.get(key, key): value or None for key, value in row.items() if aliases.get(key, key) in fields}
            values["status"] = values.get("status") or "new"
            values["review_status"] = "pending"  # CSV never auto-approves official identity.
            records.append(InstitutionLeadInput.model_validate(values))
        if len(records) > 10000:
            raise ValueError("Import at most 10,000 records per batch")
    if not records:
        raise ValueError("CSV has no institution records")
    return records
