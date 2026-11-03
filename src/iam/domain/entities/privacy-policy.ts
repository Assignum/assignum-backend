/**
 * Versión vigente del aviso de privacidad. Al cambiar el texto del aviso en la app hay que
 * subir esta versión (y la de la app): los usuarios que aceptaron una versión anterior deben
 * aceptarla de nuevo antes de seguir editando su perfil.
 */
export const CURRENT_PRIVACY_POLICY_VERSION = '1.0';

export interface PrivacyConsent {
  /** ISO 8601, lo fija el servidor al recibir la aceptación. */
  consentAcceptedAt: string;
  privacyPolicyVersion: string;
}

export const hasValidConsent = (
  profile: { consentAcceptedAt?: string | null; privacyPolicyVersion?: string | null } | null,
): boolean =>
  !!profile?.consentAcceptedAt && profile.privacyPolicyVersion === CURRENT_PRIVACY_POLICY_VERSION;
