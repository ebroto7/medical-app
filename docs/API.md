# API Documentation

Documentación de los principales endpoints de la API de NutriDiary.

## 🔑 Autenticación

Todos los endpoints (excepto Auth) requieren autenticación.

**Header**: `Cookie: sb-access-token=...` (Manejado automáticamente por el cliente de Supabase)

## 📡 Endpoints

### Auth

#### POST /api/auth/signup

Registra un nuevo usuario y su perfil.

**Rate Limit**: 5 req / min

**Body:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "fullName": "John Doe",
  "role": "patient" // o "nutritionist"
}
```

---

### Nutrition Entries

#### GET /api/nutrition/entries

Obtiene el historial de entradas nutricionales. Soporta paginación.

**Query Params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | number | Número de página (default: 1) |
| `limit` | number | Items por página (default: 20, max: 100) |
| `date` | string | Filtrar por fecha exacta (YYYY-MM-DD) |
| `startDate` | string | Inicio de rango de fecha |
| `endDate` | string | Fin de rango de fecha |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2024-12-14",
      "meal_type": "breakfast",
      "description": "Toast with coffee",
      "time": "08:30",
      "nutrition_images": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### POST /api/nutrition/entries

Crea una nueva entrada nutricional.

**Body:**
```json
{
  "date": "2024-12-14",
  "mealType": "breakfast",
  "description": "Toast with coffee",
  "time": "08:30" // opcional
}
```

---

## 📄 Paginación

Los endpoints de listado siguen un estándar común de paginación. La metadata siempre se incluye en la clave `pagination`.

```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

## ⚠️ Errores

| Código | Descripción | Ejemplo Body |
|--------|-------------|--------------|
| `400` | Error de validación | `{ "error": "Validation error", "details": [...] }` |
| `401` | No autenticado | `{ "error": "Unauthorized" }` |
| `403` | No autorizado (rol/propiedad) | `{ "error": "Forbidden" }` |
| `429` | Rate limit excedido | `{ "error": "Too many requests" }` |
| `500` | Error de servidor | `{ "error": "Internal server error" }` |
