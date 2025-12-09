from core.security import hash_password, create_access_token
from models import User


def test_register_creates_user_and_sends_email(client, db_session, monkeypatch):
    sent_email = {}

    def fake_send(to: str, name: str, link: str):
        sent_email["to"] = to
        sent_email["name"] = name
        sent_email["link"] = link

    monkeypatch.setattr("routes.auth_routes.send_verification_email", fake_send)

    payload = {
        "name": "alice",
        "email": "Alice@example.com",
        "password": "super-secret",
        "confirm_password": "super-secret",
    }

    response = client.post("/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["email"] == "alice@example.com"
    assert data["name"] == "Alice"
    assert data["is_verified"] is False
    assert sent_email["to"] == "alice@example.com"
    assert "verify" in sent_email["link"]

    # Ensure user persisted in the database
    user = db_session.query(User).filter_by(email="alice@example.com").first()
    assert user is not None
    assert user.is_verified is False


def test_login_requires_verified_user(client, db_session):
    user = User(
        email="bob@example.com",
        name="Bob",
        password=hash_password("password123"),
        is_verified=False,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/auth/login", json={"email": "bob@example.com", "password": "password123"}
    )
    assert response.status_code == 403
    assert response.json()["detail"].startswith("Email not verified")


def test_login_returns_token_for_verified_user(client, db_session):
    user = User(
        email="carol@example.com",
        name="Carol",
        password=hash_password("password123"),
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/auth/login", json={"email": "carol@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "carol@example.com"


def test_me_returns_current_user(client, db_session):
    user = User(
        email="dave@example.com",
        name="Dave",
        password=hash_password("password123"),
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(user.email)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "dave@example.com"
    assert data["name"] == "Dave"
