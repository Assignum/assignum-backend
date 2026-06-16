const bearerAuth = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Firebase idToken',
    description: 'Firebase idToken obtenido en /api/auth/login o /api/auth/register',
  },
};

const UserProfile = {
  type: 'object',
  properties: {
    uid: { type: 'string' },
    email: { type: 'string' },
    fullName: { type: 'string' },
    birthDate: { type: 'string', nullable: true },
    disponibilidad: { type: 'string', enum: ['Mañana', 'Tarde', 'Noche', 'Fin de semana'] },
    cargaAcademica: { type: 'string', enum: ['Ligera', 'Media', 'Alta'] },
    trabajoEnEquipo: { type: 'integer', minimum: 1, maximum: 5 },
    comunicacion: { type: 'integer', minimum: 1, maximum: 5 },
    horasEstudio: { type: 'number', minimum: 0, maximum: 60 },
  },
};

const ActivityTask = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    assignedToEmail: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['Pendiente', 'En Progreso', 'Entregado', 'Verificado'] },
    comments: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    links: { type: 'array', items: { type: 'string' } },
  },
};

const Activity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    uid: { type: 'string', description: 'UID del líder (creador)' },
    leaderName: { type: 'string', description: 'Nombre completo del líder (resuelto en tiempo de consulta)' },
    name: { type: 'string' },
    dueDate: { type: 'string', description: 'ISO date string' },
    documentLink: { type: 'string', nullable: true },
    tasks: { type: 'array', items: { $ref: '#/components/schemas/ActivityTask' } },
    invitedEmails: { type: 'array', items: { type: 'string' } },
    acceptedEmails: { type: 'array', items: { type: 'string' } },
    memberNames: { type: 'object', additionalProperties: { type: 'string' } },
    finalized: { type: 'boolean' },
  },
};

const ErrorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    code: { type: 'string' },
  },
  required: ['error'],
};

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'Assignum API',
    version: '1.0.0',
    description:
      'REST API del sistema de gestión de actividades académicas Assignum.\n\n' +
      '**Autenticación:** Todos los endpoints protegidos requieren el header:\n' +
      '`Authorization: Bearer <Firebase idToken>`\n\n' +
      'Obtén el `idToken` desde `POST /api/auth/login` o `POST /api/auth/register`.',
  },
  servers: [
    { url: 'https://assignum-backend.onrender.com', description: 'Render (producción)' },
    { url: 'http://localhost:3000', description: 'Local' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth', description: 'Registro, login, logout y recuperación de contraseña' },
    { name: 'Users', description: 'Perfil del usuario autenticado' },
    { name: 'Activities', description: 'CRUD de actividades' },
    { name: 'Tasks', description: 'Gestión de tareas dentro de una actividad' },
    { name: 'Members', description: 'Miembros e invitaciones' },
    { name: 'Notifications', description: 'Invitaciones pendientes del usuario' },
    { name: 'Dashboard', description: 'Estadísticas del home' },
    { name: 'Chat', description: 'Asistente con respuestas predefinidas' },
  ],
  components: {
    securitySchemes: bearerAuth,
    schemas: {
      UserProfile,
      ActivityTask,
      Activity,
      ErrorResponse,
    },
    responses: {
      Unauthorized: {
        description: 'Token inválido o ausente',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Sin permisos para esta acción',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      BadRequest: {
        description: 'Error de validación',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check (sin auth)',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
        },
      },
    },

    // ── AUTH ──────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar nuevo usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', example: 'alumno@upc.edu.pe' }, password: { type: 'string', minLength: 6, example: 'secret123' } } },
            },
          },
        },
        responses: {
          201: { description: 'Usuario creado', content: { 'application/json': { schema: { type: 'object', properties: { uid: { type: 'string' }, idToken: { type: 'string' }, email: { type: 'string' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', example: 'alumno@upc.edu.pe' }, password: { type: 'string', example: 'secret123' } } },
            },
          },
        },
        responses: {
          200: { description: 'Login exitoso', content: { 'application/json': { schema: { type: 'object', properties: { uid: { type: 'string' }, idToken: { type: 'string' }, email: { type: 'string' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cerrar sesión (revoca refresh tokens)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logout exitoso', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Enviar email de recuperación de contraseña',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: {
          200: { description: 'Email enviado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    // ── USERS ─────────────────────────────────────────────────────────────
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Obtener perfil del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/users/me/profile': {
      post: {
        tags: ['Users'],
        summary: 'Crear perfil (onboarding — primera vez)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'disponibilidad', 'cargaAcademica', 'trabajoEnEquipo', 'comunicacion', 'horasEstudio'],
                properties: {
                  fullName: { type: 'string', example: 'Juan Pérez' },
                  birthDate: { type: 'string', nullable: true, example: '2003-05-15' },
                  disponibilidad: { type: 'string', enum: ['Mañana', 'Tarde', 'Noche', 'Fin de semana'] },
                  cargaAcademica: { type: 'string', enum: ['Ligera', 'Media', 'Alta'] },
                  trabajoEnEquipo: { type: 'integer', minimum: 1, maximum: 5 },
                  comunicacion: { type: 'integer', minimum: 1, maximum: 5 },
                  horasEstudio: { type: 'number', minimum: 0, maximum: 60 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Perfil creado' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Actualizar perfil (todos los campos opcionales)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  birthDate: { type: 'string', nullable: true },
                  disponibilidad: { type: 'string', enum: ['Mañana', 'Tarde', 'Noche', 'Fin de semana'] },
                  cargaAcademica: { type: 'string', enum: ['Ligera', 'Media', 'Alta'] },
                  trabajoEnEquipo: { type: 'integer', minimum: 1, maximum: 5 },
                  comunicacion: { type: 'integer', minimum: 1, maximum: 5 },
                  horasEstudio: { type: 'number', minimum: 0, maximum: 60 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Perfil actualizado' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/search': {
      get: {
        tags: ['Users'],
        summary: 'Buscar usuario por email',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'email', required: true, schema: { type: 'string', format: 'email' } }],
        responses: {
          200: { description: 'Usuario encontrado', content: { 'application/json': { schema: { type: 'object', properties: { uid: { type: 'string' }, email: { type: 'string' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── ACTIVITIES ────────────────────────────────────────────────────────
    '/api/activities': {
      get: {
        tags: ['Activities'],
        summary: 'Listar actividades (como líder o miembro)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de actividades', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Activity' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Activities'],
        summary: 'Crear actividad',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'dueDate'],
                properties: {
                  name: { type: 'string', example: 'Proyecto Final BD' },
                  dueDate: { type: 'string', example: '2026-07-15' },
                  documentLink: { type: 'string', nullable: true, example: 'https://docs.google.com/...' },
                  tasks: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } }, example: [{ name: 'Diseñar modelo ER' }, { name: 'Implementar triggers' }] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Actividad creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/activities/{id}': {
      get: {
        tags: ['Activities'],
        summary: 'Obtener detalle de actividad (tasks filtradas por rol)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Actividad', content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Activities'],
        summary: 'Editar actividad (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, dueDate: { type: 'string' }, documentLink: { type: 'string', nullable: true } } },
            },
          },
        },
        responses: {
          200: { description: 'Actividad actualizada' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Activities'],
        summary: 'Eliminar actividad (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Actividad eliminada' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/activities/{id}/finalize': {
      post: {
        tags: ['Activities'],
        summary: 'Finalizar actividad (solo líder; requiere progreso 100%)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Actividad finalizada' },
          400: { description: 'Progreso incompleto', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ── TASKS ─────────────────────────────────────────────────────────────
    '/api/activities/{id}/tasks': {
      post: {
        tags: ['Tasks'],
        summary: 'Agregar tareas a la actividad (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['tasks'], properties: { tasks: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } }, example: [{ name: 'Nueva tarea' }] } } },
            },
          },
        },
        responses: {
          201: { description: 'Tareas agregadas', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ActivityTask' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/activities/{id}/tasks/assign': {
      post: {
        tags: ['Tasks'],
        summary: 'Asignar tareas round-robin entre miembros aceptados (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Tareas asignadas' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/activities/{id}/tasks/{taskId}': {
      put: {
        tags: ['Tasks'],
        summary: 'Actualizar tarea (líder: cualquier campo; miembro: solo sus tareas, sin Verificado)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'taskId', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['Pendiente', 'En Progreso', 'Entregado', 'Verificado'] },
                  comments: { type: 'string' },
                  files: { type: 'array', items: { type: 'string' } },
                  links: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tarea actualizada' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Eliminar tarea (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'taskId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Tarea eliminada' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/activities/{id}/tasks/{taskId}/verify': {
      post: {
        tags: ['Tasks'],
        summary: 'Verificar tarea: Entregado → Verificado (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'taskId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Tarea verificada' },
          400: { description: 'Tarea no está en estado Entregado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ── MEMBERS ───────────────────────────────────────────────────────────
    '/api/activities/{id}/members': {
      get: {
        tags: ['Members'],
        summary: 'Listar miembros aceptados y pendientes',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Lista de miembros',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      fullName: { type: 'string' },
                      status: { type: 'string', enum: ['accepted', 'pending'] },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/activities/{id}/members/{email}': {
      delete: {
        tags: ['Members'],
        summary: 'Remover miembro aceptado (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'email', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Miembro removido' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/activities/{id}/invitations': {
      post: {
        tags: ['Members'],
        summary: 'Invitar miembro por email (solo líder)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: {
          201: { description: 'Invitación enviada' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { description: 'Usuario no encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/activities/{id}/invitations/accept': {
      post: {
        tags: ['Members'],
        summary: 'Aceptar invitación (el invitado)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invitación aceptada' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/activities/{id}/invitations/decline': {
      post: {
        tags: ['Members'],
        summary: 'Rechazar invitación (el invitado)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invitación rechazada' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Invitaciones pendientes del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de notificaciones',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      activityId: { type: 'string' },
                      activityName: { type: 'string' },
                      leaderName: { type: 'string' },
                      dueDate: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── DASHBOARD ─────────────────────────────────────────────────────────
    '/api/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Estadísticas del home',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Estadísticas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalActivities: { type: 'integer', description: 'Actividades donde es líder o miembro' },
                    pendingTasks: { type: 'integer', description: 'Tareas asignadas al usuario con status Pendiente' },
                    upcomingActivities: { type: 'integer', description: 'Actividades que vencen en los próximos 7 días' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── CHAT ──────────────────────────────────────────────────────────────
    '/api/chat/message': {
      post: {
        tags: ['Chat'],
        summary: 'Enviar mensaje al asistente y obtener respuesta predefinida',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string', example: '¿Qué es Assignum?' } } } } },
        },
        responses: {
          200: { description: 'Respuesta del bot', content: { 'application/json': { schema: { type: 'object', properties: { reply: { type: 'string' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/chat/history': {
      get: {
        tags: ['Chat'],
        summary: 'Obtener historial de mensajes',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Historial',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userMessage: { type: 'string' },
                      botReply: { type: 'string' },
                      timestamp: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Chat'],
        summary: 'Borrar todo el historial de chat',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Historial eliminado' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

export default spec;
