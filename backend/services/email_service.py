import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def send_verification_email(to: str, name: str, link: str):
    message = MIMEMultipart("alternative")
    message["Subject"] = "Verify your Baketsu account"
    message["From"] = EMAIL_FROM
    message["To"] = to

    html = f"""
    <html>
        <body>
            <p>Hi {name},</p>
            <p>Welcome to Baketsu! Click below to verify your email:</p>
            <p><a href="{link}">Verify Account</a></p>
            <p>If you didn’t sign up, ignore this email.</p>
        </body>
    </html>
    """

    message.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL_FROM, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, to, message.as_string())
