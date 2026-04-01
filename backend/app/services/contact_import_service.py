"""
CSV/Excel import service using pandas.
Normalizes phone numbers to E.164 format.
"""

import io
import phonenumbers
import pandas as pd
from fastapi import UploadFile


PHONE_COLUMN_ALIASES = ["phone", "phone_number", "telephone", "tel", "mobile", "cell"]
NAME_COLUMN_ALIASES = ["name", "full_name", "contact_name", "person_name"]
BUSINESS_COLUMN_ALIASES = ["business_name", "company", "company_name", "organization", "business"]
EMAIL_COLUMN_ALIASES = ["email", "email_address", "e_mail"]
ADDRESS_COLUMN_ALIASES = ["address", "location", "street_address"]


def _find_column(df: pd.DataFrame, aliases: list[str]) -> str | None:
    lower_cols = {col.lower().strip().replace(" ", "_"): col for col in df.columns}
    for alias in aliases:
        if alias in lower_cols:
            return lower_cols[alias]
    return None


def normalize_phone(raw: str, default_region: str = "US") -> str | None:
    """Normalize a phone number string to E.164 format."""
    try:
        parsed = phonenumbers.parse(str(raw), default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
    except phonenumbers.NumberParseException:
        pass
    return None


async def parse_contact_file(file: UploadFile) -> list[dict]:
    """
    Parse CSV or Excel file and return list of contact dicts.
    Raises ValueError on parse errors or missing phone column.
    """
    content = await file.read()
    filename = file.filename or ""

    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise ValueError("Unsupported file format. Please upload CSV, XLS, or XLSX.")

    df.columns = [str(c).strip() for c in df.columns]

    phone_col = _find_column(df, PHONE_COLUMN_ALIASES)
    if not phone_col:
        raise ValueError(
            f"No phone column found. Expected one of: {', '.join(PHONE_COLUMN_ALIASES)}. "
            f"Found columns: {', '.join(df.columns)}"
        )

    name_col = _find_column(df, NAME_COLUMN_ALIASES)
    business_col = _find_column(df, BUSINESS_COLUMN_ALIASES)
    email_col = _find_column(df, EMAIL_COLUMN_ALIASES)
    address_col = _find_column(df, ADDRESS_COLUMN_ALIASES)

    # Columns that aren't standard fields → custom_fields
    standard_cols = {c for c in [phone_col, name_col, business_col, email_col, address_col] if c}

    contacts = []
    for _, row in df.iterrows():
        raw_phone = str(row[phone_col]).strip()
        phone = normalize_phone(raw_phone)
        if not phone:
            continue  # Skip rows with invalid phones

        contact: dict = {"phone": phone}
        if name_col and pd.notna(row.get(name_col)):
            contact["name"] = str(row[name_col]).strip()
        if business_col and pd.notna(row.get(business_col)):
            contact["businessName"] = str(row[business_col]).strip()
        if email_col and pd.notna(row.get(email_col)):
            contact["email"] = str(row[email_col]).strip()
        if address_col and pd.notna(row.get(address_col)):
            contact["address"] = str(row[address_col]).strip()

        # Extra columns → customFields
        custom = {
            col: str(row[col]).strip()
            for col in df.columns
            if col not in standard_cols and pd.notna(row.get(col))
        }
        if custom:
            contact["customFields"] = custom

        contacts.append(contact)

    return contacts
