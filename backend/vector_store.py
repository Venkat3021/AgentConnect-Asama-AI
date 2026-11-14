
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from backend/.env")


def initialize_vector_store():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:

            # Enable pgvector
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

            # Agent embeddings
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agent_vectors (
                    agent_id BIGINT PRIMARY KEY,
                    agent_name TEXT NOT NULL,
                    company TEXT,
                    profile_text TEXT NOT NULL,
                    embedding VECTOR(384),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Post embeddings
            cur.execute("""
                CREATE TABLE IF NOT EXISTS post_vectors (
                    post_id BIGINT PRIMARY KEY,
                    publisher_agent_id BIGINT,
                    post_text TEXT NOT NULL,
                    embedding VECTOR(384),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # HNSW indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS agent_embedding_hnsw
                ON agent_vectors
                USING hnsw (embedding vector_cosine_ops);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS post_embedding_hnsw
                ON post_vectors
                USING hnsw (embedding vector_cosine_ops);
            """)

        conn.commit()

    print("Vector database initialized successfully!")


if __name__ == "__main__":
    initialize_vector_store()
