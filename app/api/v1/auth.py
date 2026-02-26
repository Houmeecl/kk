"""
KONTAX - Auth Endpoints: Login, Register, Refresh, Me
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User as UserModel  # ✅ Modelo SQLAlchemy
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RefreshRequest,
    TokenResponse,
    User as UserSchema,  # ✅ Schema Pydantic
)
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Autenticación con email + password.
    Retorna access_token + refresh_token.
    """
    user = db.query(UserModel).filter(UserModel.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )

    # Actualizar último login
    user.ultimo_login = datetime.utcnow()
    db.commit()

    # Generar tokens
    token_data = {"sub": str(user.id), "email": user.email, "rol": user.rol}

    return LoginResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user=UserSchema.model_validate(user),
    )


@router.post("/register", response_model=UserSchema, status_code=201)
async def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    """
    Registrar nuevo usuario.
    Requiere rol: admin
    """
    existing = db.query(UserModel).filter(UserModel.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    user = UserModel(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        nombre=data.nombre,
        rol=data.rol or "viewer",
        activo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserSchema.model_validate(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: Session = Depends(get_db)):
    """Renovar access token usando refresh token"""
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )

    user = db.query(UserModel).filter(UserModel.id == payload["sub"]).first()
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")

    token_data = {"sub": str(user.id), "email": user.email, "rol": user.rol}

    return TokenResponse(
        access_token=create_access_token(token_data),
        token_type="bearer",
    )


@router.get("/me", response_model=UserSchema)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    """Obtener perfil del usuario autenticado"""
    return UserSchema.model_validate(current_user)


@router.post("/logout")
async def logout(current_user: UserModel = Depends(get_current_user)):
    """
    Logout usuario.
    En JWT stateless, el cliente elimina el token.
    Endpoint existe para consistencia de API.
    """
    return {"message": "Sesión cerrada correctamente"}
