import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector

from embedding_service import generate_embedding

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


def search_agent_vectors(
    post_text: str,
    allowed_agent_ids: list,
    limit: int = 50
):
    """Search eligible agents using pgvector cosine similarity."""

    if not post_text or not post_text.strip():
        return []

    if not allowed_agent_ids:
        return []

    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL missing from backend/.env")

    query_embedding = generate_embedding(post_text)

    with psycopg.connect(DATABASE_URL) as conn:
        register_vector(conn)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    agent_id,
                    agent_name,
                    company,
                    profile_text,
                    1 - (embedding <=> %s) AS dense_score
                FROM agent_vectors
                WHERE agent_id = ANY(%s::bigint[])
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                (
                    query_embedding,
                    allowed_agent_ids,
                    query_embedding,
                    limit
                )
            )

            rows = cur.fetchall()

    return [
        {
            "agent_id": row[0],
            "agent_name": row[1],
            "company": row[2],
            "profile_text": row[3],
            "dense_score": float(row[4])
        }
        for row in rows
    ]


if __name__ == "__main__":
    test_post = "UPI digital payment cashback offers for online shopping"

    results = search_agent_vectors(
        test_post,
        allowed_agent_ids=[1, 2, 3, 4, 5],
        limit=5
    )

    print("\nSemantic search results:")

    for result in results:
        print(
            result["agent_name"],
            result["company"],
            round(result["dense_score"], 4)
        )
