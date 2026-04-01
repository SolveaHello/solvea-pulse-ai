from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/outbound_ai"
    ANTHROPIC_API_KEY: str = ""
    VAPI_API_KEY: str = ""
    VAPI_PHONE_NUMBER_ID: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "outbound-ai-recordings"
    AWS_REGION: str = "us-east-1"
    ENCRYPTION_KEY: str = ""
    FASTAPI_HOST: str = "0.0.0.0"
    FASTAPI_PORT: int = 8000
    # Email (Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@outboundai.com"
    # SMS (Twilio — reuse existing account for marketing SMS)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""


settings = Settings()
