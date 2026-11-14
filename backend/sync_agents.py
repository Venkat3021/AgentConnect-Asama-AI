
import json
import os
from urllib.request import Request, urlopen

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector

from embedding_service import generate_embedding

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
API_URL = "http://127.0.0.1:8000/api/agents"


def fetch_agents():
    request = Request(
        API_URL,
        headers={"Accept": "application/json"}
    )

    with urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def sync_agents():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL missing from .env")

    agents = fetch_agents()

    conn = psycopg.connect(DATABASE_URL)
    register_vector(conn)

    synced = 0
    skipped = 0

    try:
        with conn.cursor() as cur:
            for agent in agents:

                name = str(agent.get("name", "")).strip()
                company = str(agent.get("company", "")).strip()
                description = str(
                    agent.get("description", "")
                ).strip()

                interests = agent.get("interests", [])

                # Skip invalid Swagger test records
                if (
                    not agent.get("active", True)
                    or not name
                    or not company
                    or name.lower() == "string"
                    or company.lower() == "string"
                ):
                    print("Skipping invalid agent:", agent.get("id"))
                    skipped += 1
                    continue

                if not isinstance(interests, list):
                    interests = []

                clean_interests = [
                    str(item).strip()
                    for item in interests
                    if str(item).strip()
                    and str(item).strip().lower() != "string"
                ]

                profile_text = (
                    f"Agent: {name}. "
                    f"Company: {company}. "
                    f"Description: {description}. "
                    f"Interests: {', '.join(clean_interests)}."
                )

                print(f"Generating embedding: {name}")

                embedding = generate_embedding(profile_text)

                cur.execute(
                    """
                    INSERT INTO agent_vectors (
                        agent_id,
                        agent_name,
                        company,
                        profile_text,
                        embedding,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)

                    ON CONFLICT (agent_id)
                    DO UPDATE SET
                        agent_name = EXCLUDED.agent_name,
                        company = EXCLUDED.company,
                        profile_text = EXCLUDED.profile_text,
                        embedding = EXCLUDED.embedding,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (
                        agent["id"],
                        name,
                        company,
                        profile_text,
                        embedding
                    )
                )

                synced += 1
                print(f"Synced: {name}")

        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

    print("\nAgent synchronization completed!")
    print("Agents synced:", synced)
    print("Agents skipped:", skipped)


if __name__ == "__main__":
    sync_agents()
