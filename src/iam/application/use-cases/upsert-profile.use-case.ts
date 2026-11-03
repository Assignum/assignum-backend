import { AppError } from '@src/shared/errors/app-error';

import {
  CURRENT_PRIVACY_POLICY_VERSION,
  hasValidConsent,
  PrivacyConsent,
} from '../../domain/entities/privacy-policy';
import { PartialUserProfile } from '../../domain/entities/user-profile.entity';
import { IUserProfileRepository } from '../../domain/repositories/user-profile.repository';

export interface PrivacyConsentInput {
  accepted: true;
  version: string;
}

type ProfileInput = PartialUserProfile & { privacyConsent?: PrivacyConsentInput };

/** Convierte la aceptación enviada por la app en los campos que se guardan (fecha del servidor). */
const toConsent = (input: PrivacyConsentInput): PrivacyConsent => {
  if (input.version !== CURRENT_PRIVACY_POLICY_VERSION) {
    throw new AppError(
      `Privacy policy version ${input.version} is outdated (current: ${CURRENT_PRIVACY_POLICY_VERSION})`,
      400,
      'PRIVACY_POLICY_OUTDATED',
    );
  }
  return { consentAcceptedAt: new Date().toISOString(), privacyPolicyVersion: input.version };
};

export const createProfile = async (
  profileRepo: IUserProfileRepository,
  uid: string,
  { privacyConsent, ...data }: ProfileInput,
): Promise<void> => {
  if (!privacyConsent) throw new AppError('The privacy policy must be accepted', 400, 'CONSENT_REQUIRED');
  await profileRepo.save(uid, { ...data, ...toConsent(privacyConsent) });
};

/**
 * Edita el perfil. Solo se permite si el usuario aceptó la versión vigente del aviso de
 * privacidad, ya sea antes o en esta misma petición (`privacyConsent`).
 */
export const updateProfile = async (
  profileRepo: IUserProfileRepository,
  uid: string,
  { privacyConsent, ...data }: ProfileInput,
): Promise<void> => {
  if (privacyConsent) {
    await profileRepo.merge(uid, { ...data, ...toConsent(privacyConsent) });
    return;
  }
  const current = await profileRepo.findByUid(uid);
  if (!hasValidConsent(current)) {
    throw new AppError('The current privacy policy must be accepted', 400, 'CONSENT_REQUIRED');
  }
  await profileRepo.merge(uid, data);
};
