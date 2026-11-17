"""Reads secrets from NAME or from the file in NAME_FILE (Docker/Kubernetes secrets)."""
import os


def read_secret(name: str, default: str | None = None) -> str | None:
    file_path = os.environ.get(f"{name}_FILE")
    if file_path:
        with open(file_path, encoding="utf-8") as fh:
            return fh.read().strip()
    return os.environ.get(name, default)
