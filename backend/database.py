from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.settings import settings

# Database connection - SQLite for development
if "sqlite" in settings.DATABASE_URL:
    # SQLite configuration
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=False,
        connect_args={
            "check_same_thread": False,
        }
    )
else:
    # MySQL configuration
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=50,
        max_overflow=100,
        pool_timeout=30,
        echo=False,
        connect_args={
            "connect_timeout": 10,
            "charset": "utf8mb4",
            "autocommit": False,
            "sql_mode": "TRADITIONAL"
        }
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
