
from sentence_transformers import SentenceTransformer

# Local embedding model
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

print("Loading local embedding model...")
model = SentenceTransformer(MODEL_NAME)
print("Embedding model loaded successfully!")


def generate_embedding(text: str):
    """
    Generate a 384-dimensional embedding locally.
    No OpenAI API key or API credits required.
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    embedding = model.encode(
        text.strip(),
        normalize_embeddings=True
    )

    return embedding.tolist()


if __name__ == "__main__":
    sample = "Digital payments and UPI cashback offers"

    vector = generate_embedding(sample)

    print("\nEmbedding generated successfully!")
    print("Dimensions:", len(vector))
    print("First five values:", vector[:5])
