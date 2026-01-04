/**
 * Centralized constants for the application.
 *
 * This file eliminates magic numbers and hardcoded values scattered across the codebase.
 */

// ============================================
// Toast Configuration
// ============================================

export const TOAST_CONFIG = {
  /** Maximum number of toasts visible at once */
  LIMIT: 1,
  /** Delay before auto-removing toast (ms) */
  REMOVE_DELAY: 1000000, // Very long, essentially manual dismiss
  /** Auto-dismiss duration for success toasts (ms) */
  AUTO_DISMISS_MS: 3000,
} as const;

// ============================================
// File Upload Limits
// ============================================

export const UPLOAD_LIMITS = {
  /** Maximum file size for nutrition images (bytes) */
  NUTRITION_IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  /** Maximum file size for GPX files (bytes) */
  GPX_FILE_MAX_SIZE: 20 * 1024 * 1024, // 20MB
  /** Allowed MIME types for nutrition images */
  NUTRITION_IMAGE_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
  /** Allowed MIME types for GPX files */
  GPX_FILE_MIME_TYPES: ["application/gpx+xml", "text/xml", "application/xml"] as const,
  /** Maximum number of images per nutrition entry */
  MAX_IMAGES_PER_ENTRY: 5,
} as const;

// ============================================
// Training Session Limits
// ============================================

export const TRAINING_LIMITS = {
  /** Maximum duration in minutes (8 hours) */
  MAX_DURATION_MINUTES: 480,
  /** Minimum duration in minutes */
  MIN_DURATION_MINUTES: 1,
  /** Maximum intensity level */
  MAX_INTENSITY: 10,
  /** Minimum intensity level */
  MIN_INTENSITY: 1,
} as const;

// ============================================
// GPX Plan Limits
// ============================================

export const GPX_LIMITS = {
  /** Maximum duration in minutes (48 hours) */
  MAX_DURATION_MINUTES: 2880,
  /** Minimum duration in minutes */
  MIN_DURATION_MINUTES: 1,
  /** Maximum distance in km */
  MAX_DISTANCE_KM: 1000,
  /** Maximum elevation gain in meters */
  MAX_ELEVATION_M: 20000,
  /** Maximum temporal loop repetitions */
  MAX_LOOP_REPETITIONS: 50,
  /** Maximum temporal loop interval (8 hours) */
  MAX_LOOP_INTERVAL_MINUTES: 480,
} as const;

// ============================================
// Validation Limits
// ============================================

export const VALIDATION_LIMITS = {
  /** Maximum name length */
  MAX_NAME_LENGTH: 200,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Maximum notes length */
  MAX_NOTES_LENGTH: 1000,
  /** Maximum comment length */
  MAX_COMMENT_LENGTH: 2000,
} as const;

// ============================================
// Pagination Defaults
// ============================================

export const PAGINATION = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size */
  MAX_PAGE_SIZE: 100,
  /** Minimum page size */
  MIN_PAGE_SIZE: 1,
} as const;

// ============================================
// Polling Intervals
// ============================================

export const POLLING_INTERVALS = {
  /** Unread notifications check interval (ms) */
  NOTIFICATIONS_MS: 30000, // 30 seconds
  /** Session refresh check interval (ms) */
  SESSION_REFRESH_MS: 60000, // 1 minute
} as const;

// ============================================
// Debounce/Throttle Timeouts
// ============================================

export const DEBOUNCE = {
  /** Search input debounce (ms) */
  SEARCH_MS: 300,
  /** Autosave debounce (ms) */
  AUTOSAVE_MS: 1000,
  /** Resize handler debounce (ms) */
  RESIZE_MS: 150,
} as const;

// ============================================
// Animation Durations
// ============================================

export const ANIMATION = {
  /** Default transition duration (ms) */
  DEFAULT_MS: 200,
  /** Slide transition duration (ms) */
  SLIDE_MS: 300,
  /** Fade transition duration (ms) */
  FADE_MS: 150,
} as const;

// ============================================
// Date/Time Formats
// ============================================

export const DATE_FORMATS = {
  /** API date format */
  API: "yyyy-MM-dd",
  /** Display date format */
  DISPLAY: "d 'de' MMMM, yyyy",
  /** Short display format */
  SHORT: "d MMM",
  /** Time format 24h */
  TIME_24H: "HH:mm",
  /** Time format 12h */
  TIME_12H: "h:mm a",
} as const;

// ============================================
// API Endpoints (for reference)
// ============================================

export const API_ENDPOINTS = {
  // Nutrition
  NUTRITION_ENTRIES: "/api/nutrition/entries",
  NUTRITION_UPLOAD: "/api/nutrition/upload",
  NUTRITION_PATIENT_ENTRIES: "/api/nutrition/patient-entries",

  // Training
  TRAINING_SESSIONS: "/api/training/sessions",
  TRAINING_PATIENT_SESSIONS: "/api/training/patient-sessions",

  // Meal Plans
  MEAL_PLANS: "/api/meal-plans",

  // GPX Plans
  GPX_PLANS: "/api/gpx-plans",

  // Saved Meals
  SAVED_MEALS: "/api/saved-meals",

  // Comments
  COMMENTS: "/api/comments",

  // Notifications
  NOTIFICATIONS: "/api/notifications",

  // Connections
  CONNECTION_REQUEST: "/api/nutrition/request-patient",
  CONNECTION_ACCEPT: "/api/nutrition/accept-request",
  CONNECTION_REJECT: "/api/nutrition/reject-request",
  CONNECTION_DISCONNECT: "/api/nutrition/disconnect",
  CONNECTED_NUTRITIONISTS: "/api/nutrition/connected-nutritionists",
  MY_PATIENTS: "/api/nutrition/my-patients",
  PENDING_REQUESTS: "/api/nutrition/pending-requests",
} as const;

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  // Generic
  GENERIC: "Ha ocurrido un error. Por favor, inténtalo de nuevo.",
  NETWORK: "Error de conexión. Verifica tu conexión a internet.",

  // Auth
  AUTH_REQUIRED: "Debes iniciar sesión para continuar.",
  AUTH_EXPIRED: "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
  ACCESS_DENIED: "No tienes permiso para realizar esta acción.",

  // Validation
  VALIDATION_ERROR: "Por favor, corrige los errores en el formulario.",
  REQUIRED_FIELD: "Este campo es obligatorio.",
  INVALID_FORMAT: "Formato inválido.",

  // File upload
  FILE_TOO_LARGE: "El archivo es demasiado grande.",
  FILE_TYPE_INVALID: "Tipo de archivo no permitido.",

  // Rate limiting
  RATE_LIMITED: "Has realizado demasiadas solicitudes. Espera un momento.",
} as const;

// ============================================
// Success Messages
// ============================================

export const SUCCESS_MESSAGES = {
  SAVED: "Guardado correctamente.",
  DELETED: "Eliminado correctamente.",
  UPDATED: "Actualizado correctamente.",
  CREATED: "Creado correctamente.",
  SENT: "Enviado correctamente.",
} as const;
