import { fullTaskName } from '@src/chatbox/application/services/assistant-actions';

describe('fullTaskName', () => {
  it('recupera el nombre completo cuando CLU lo corta', () => {
    const message = 'agrega la tarea crear indices para las consultas de prestamos a Proyecto final BD - Sistema de Biblioteca';
    expect(fullTaskName(message, 'crear indices', 'Proyecto final BD - Sistema de Biblioteca')).toBe(
      'crear indices para las consultas de prestamos',
    );
  });

  it('funciona aunque CLU también corte el nombre de la actividad', () => {
    const message = 'agrega la tarea hacer diapositivas del informe en Proyecto de Física';
    expect(fullTaskName(message, 'hacer diapositivas', 'Proyecto')).toBe('hacer diapositivas del informe');
  });

  it('toma hasta el final del mensaje si no hay actividad', () => {
    expect(fullTaskName('agrega la tarea revisar el modelo relacional.', 'revisar')).toBe('revisar el modelo relacional');
  });

  it('respeta mayúsculas del mensaje y deja el de CLU si no lo encuentra', () => {
    expect(fullTaskName('Agrega la tarea Diseñar ER a Biblioteca', 'diseñar er', 'Biblioteca')).toBe('Diseñar ER');
    expect(fullTaskName('agrega algo', 'otra cosa')).toBe('otra cosa');
  });
});
