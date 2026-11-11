import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';

export interface ConsentOutcome {
  status: string;
  canRequestAds: boolean;
}

let consentPromise: Promise<ConsentOutcome> | null = null;

/**
 * UMP (Google User Messaging Platform / IAB TCF) flow. MUST finish before AdMob.initialize()
 * and before any ad request, so the TC string exists for EEA/UK/CH users.
 * Order: requestConsentInfo -> showConsentForm (only if REQUIRED and a form is available).
 * Never throws: on failure we report canRequestAds=true only for non-EEA-safe cases (see below).
 */
export function gatherConsent(testDeviceIds?: string[]): Promise<ConsentOutcome> {
  if (consentPromise) return consentPromise;
  consentPromise = (async (): Promise<ConsentOutcome> => {
    try {
      let info: any = await AdMob.requestConsentInfo({
        // For testing the EEA flow: debugGeography: AdmobConsentDebugGeography.EEA
        testDeviceIdentifiers: testDeviceIds,
      } as any);

      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = { ...info, ...(await AdMob.showConsentForm()) };
      }

      const canRequestAds =
        typeof info.canRequestAds === 'boolean'
          ? info.canRequestAds
          : info.status === AdmobConsentStatus.OBTAINED || info.status === AdmobConsentStatus.NOT_REQUIRED;
      if (!canRequestAds) consentPromise = null; // let the next ad attempt re-ask
      return { status: String(info.status), canRequestAds };
    } catch (e) {
      console.warn('[UMP] consent flow failed', e);
      // Unknown state: don't risk non-consented requests. Retry on next app start.
      consentPromise = null;
      return { status: 'ERROR', canRequestAds: false };
    }
  })();
  return consentPromise;
}

/** Settings button: lets users revisit their choice (required when privacyOptionsRequirementStatus is REQUIRED). */
export async function showPrivacyOptions(): Promise<void> {
  try {
    await (AdMob as any).showPrivacyOptionsForm();
  } catch (e) {
    console.warn('[UMP] privacy options unavailable', e);
  }
}
