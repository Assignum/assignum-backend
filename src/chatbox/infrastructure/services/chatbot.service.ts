interface BotRule {
  keywords: string[];
  reply: string;
}

const rules: BotRule[] = [
  {
    keywords: ['qué es assignum', 'que es assignum', 'assignum'],
    reply:
      'Assignum es una aplicación universitaria de gestión de actividades grupales. Permite crear actividades, asignar tareas a miembros del equipo, hacer seguimiento del progreso y colaborar de forma organizada.',
  },
  {
    keywords: ['crear actividad', 'nueva actividad', 'cómo creo', 'como creo'],
    reply:
      'Para crear una actividad: ve a la pantalla principal y toca el botón "+". Ingresa el nombre de la actividad, la fecha de entrega y las tareas iniciales. Después puedes invitar miembros y asignar tareas.',
  },
  {
    keywords: ['invitar', 'agregar miembro', 'añadir miembro'],
    reply:
      'Para invitar a un miembro: abre la actividad, ve a la sección "Miembros" y toca "Invitar". Ingresa el email del compañero. Recibirá una notificación y podrá aceptar o rechazar la invitación.',
  },
  {
    keywords: ['estados', 'estado de tarea', 'status'],
    reply:
      'Las tareas tienen 4 estados: (1) Pendiente — tarea sin iniciar, (2) En Progreso — el miembro está trabajando, (3) Entregado — el miembro marcó como listo, (4) Verificado — el líder confirmó la entrega.',
  },
  {
    keywords: ['verificar', 'verificado'],
    reply:
      'Solo el líder puede verificar tareas. Una tarea solo puede marcarse como "Verificado" cuando está en estado "Entregado". Ve a la tarea y toca "Verificar".',
  },
  {
    keywords: ['upc', 'universidad', 'peruana de ciencias aplicadas'],
    reply:
      'Assignum fue diseñado pensando en el contexto universitario de la UPC, donde los trabajos grupales son frecuentes. Facilita la coordinación y el seguimiento de actividades académicas entre compañeros.',
  },
  {
    keywords: ['tarea', 'tareas'],
    reply:
      'Las tareas son las unidades de trabajo dentro de una actividad. El líder puede agregar tareas, asignarlas automáticamente (round-robin) o manualmente. Cada miembro solo ve y actualiza sus tareas asignadas.',
  },
  {
    keywords: ['progreso', 'avance', 'porcentaje'],
    reply:
      'El progreso de una actividad se calcula como: (tareas en estado "Verificado" / total de tareas) × 100%. Solo cuando el progreso es 100%, el líder puede finalizar la actividad.',
  },
  {
    keywords: ['líder', 'lider', 'quien es el lider', 'quien lidera'],
    reply:
      'El líder es el usuario que creó la actividad. Tiene permisos completos: invitar miembros, asignar tareas, verificar entregas y finalizar la actividad.',
  },
  {
    keywords: ['notificacion', 'notificaciones', 'invitacion pendiente'],
    reply:
      'Las notificaciones te muestran las invitaciones pendientes a actividades. Puedes aceptar o rechazar cada invitación desde la pantalla de notificaciones.',
  },
];

const DEFAULT_REPLY =
  'Lo siento, no entendí tu pregunta. Puedes preguntarme sobre: qué es Assignum, cómo crear actividades, cómo invitar miembros, estados de tareas, o el rol del líder.';

export const getBotReply = (message: string): string => {
  const lower = message.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.reply;
    }
  }
  return DEFAULT_REPLY;
};
