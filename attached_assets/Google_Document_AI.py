import os
import json
import pandas as pd
import psycopg2
import smtplib
from datetime import datetime
from google.cloud import documentai_v1 as documentai
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Configuration
GOOGLE_PROJECT_ID = "your-google-project-id"
GOOGLE_PROCESSOR_ID = "your-document-ai-processor-id"
UPLOAD_FOLDER = "uploads/"
CSV_OUTPUT = "extracted_data.csv"
DB_CONFIG = {
    "dbname": "radical_zero",
    "user": "your_postgres_user",
    "password": "your_postgres_password",
    "host": "localhost",
    "port": "5432"
}
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "your_email@example.com"
EMAIL_PASSWORD = "your_app_password"

# Function to connect to PostgreSQL
def connect_db():
    return psycopg2.connect(**DB_CONFIG)

# Function to process document using Google Document AI
def process_document_ai(pdf_path):
    client = documentai.DocumentUnderstandingServiceClient()
    
    with open(pdf_path, "rb") as pdf:
        raw_document = documentai.RawDocument(content=pdf.read(), mime_type="application/pdf")
    
    request = documentai.ProcessRequest(
        name=f"projects/{GOOGLE_PROJECT_ID}/locations/us/processors/{GOOGLE_PROCESSOR_ID}",
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    extracted_text = result.document.text

    extracted_data = {
        "energy_consumption_kWh": None,
        "surface_area_m2": None,
        "building_age": None,
        "emission_kg_m2": None
    }

    for line in extracted_text.split("\n"):
        if "kWh" in line:
            extracted_data["energy_consumption_kWh"] = line.strip()
        elif "m²" in line:
            extracted_data["surface_area_m2"] = line.strip()
        elif "built in" in line:
            extracted_data["building_age"] = line.strip()
        elif "kg CO₂/m²" in line:
            extracted_data["emission_kg_m2"] = line.strip()

    return extracted_data

# Function to insert data into PostgreSQL
def save_to_database(file_name, data):
    conn = connect_db()
    cursor = conn.cursor()
    query = """
        INSERT INTO energy_docs (file_name, energy_consumption_kWh, surface_area_m2, building_age, emission_kg_m2)
        VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(query, (file_name, data["energy_consumption_kWh"], data["surface_area_m2"], data["building_age"], data["emission_kg_m2"]))
    conn.commit()
    cursor.close()
    conn.close()

# Function to send email notifications
def send_email(recipient, subject, message):
    msg = MIMEMultipart()
    msg["From"] = EMAIL_SENDER
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.attach(MIMEText(message, "plain"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, recipient, msg.as_string())
        server.quit()
        print(f"Email sent to {recipient}")
    except Exception as e:
        print(f"Failed to send email: {str(e)}")

# Function to convert extracted data to CSV
def export_to_csv():
    conn = connect_db()
    df = pd.read_sql("SELECT * FROM energy_docs", conn)
    df.to_csv(CSV_OUTPUT, index=False)
    conn.close()
    print(f"CSV Exported: {CSV_OUTPUT}")

# Main workflow
def main():
    extracted_data_list = []

    for file in os.listdir(UPLOAD_FOLDER):
        if file.endswith(".pdf"):
            file_path = os.path.join(UPLOAD_FOLDER, file)
            extracted_data = process_document_ai(file_path)
            extracted_data["file_name"] = file
            extracted_data_list.append(extracted_data)

            # Save to database
            save_to_database(file, extracted_data)

            # Send confirmation email
            send_email(
                recipient="user@example.com",
                subject="Document Processed",
                message=f"Your document '{file}' has been processed successfully.\nExtracted Data:\n{json.dumps(extracted_data, indent=2)}"
            )

    # Export extracted data to CSV
    export_to_csv()
    print("Processing completed!")

if __name__ == "__main__":
    main()
