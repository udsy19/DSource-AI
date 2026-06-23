"""Catalog embeddings — one shared image+text space (marqo-ecommerce-B) and an in-process
sqlite-vec index. The single index serves Explore back-match, Specify retrieval, and the
enrichment novelty gate. Keep the embedder and the index swappable behind their interfaces.
"""
