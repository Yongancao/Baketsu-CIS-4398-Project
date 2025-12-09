from core.security import create_access_token
from models import User, UserFile


def create_verified_user(db_session, email: str = "user@example.com") -> User:
    user = User(
        email=email,
        name="Test User",
        password="hashed",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_upload_files_persists_metadata(client, db_session, monkeypatch):
    user = create_verified_user(db_session)
    token = create_access_token(user.email)

    uploaded_keys: list[str] = []

    def fake_upload(file_obj, key: str):
        # simulate consuming the file without hitting AWS
        file_obj.read()
        uploaded_keys.append(key)

    monkeypatch.setattr("routes.file_routes.upload_file_to_s3", fake_upload)

    files = [
        ("files", ("hello.txt", b"hello world", "text/plain")),
        ("files", ("notes.md", b"# notes", "text/markdown")),
    ]

    response = client.post(
        "/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["message"] == "Files uploaded successfully"
    assert len(payload["uploaded"]) == 2
    assert uploaded_keys and uploaded_keys[0].startswith(f"users/{user.id}")

    db_files = db_session.query(UserFile).filter_by(user_id=user.id).all()
    assert len(db_files) == 2
    assert {f.filename for f in db_files} == {"hello.txt", "notes.md"}


def test_list_files_returns_user_files(client, db_session, monkeypatch):
    user = create_verified_user(db_session)
    token = create_access_token(user.email)

    monkeypatch.setattr(
        "routes.file_routes.generate_presigned_url",
        lambda key: f"https://example.com/{key}",
    )
    monkeypatch.setattr(
        "routes.file_routes.generate_download_url",
        lambda key, filename: f"https://example.com/{filename}",
    )

    file_record = UserFile(
        user_id=user.id,
        filename="existing.pdf",
        file_key="users/1/existing.pdf",
        file_size=1024,
    )
    db_session.add(file_record)
    db_session.commit()

    response = client.get(
        "/files/list",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["filename"] == "existing.pdf"
