export const PUBLIC_FEEDBACK_CONFIG_WEBHOOK_URL = 'https://hook.eu1.make.com/bwzfk1ranwtrky4kglamvofrmb76gbjp';

export type FeedbackSubmitState = 'idle' | 'sending' | 'success' | 'error';

export interface FeedbackBranding {
  restaurantName: string;
  primaryColor: string;
  logoUrl: string;
  backgroundImageUrl: string;
  positiveFeedbackWebhook: string;
  negativeFeedbackWebhook: string;
}

export interface SubmitFeedbackPayload {
  id_reserva: string;
  puntuacion: number;
  puntuacion_texto: string;
  comentario: string;
  lang: 'es' | 'en';
  timestamp: string;
}

const CLIENT_CONFIG_KEY = 'costabots_client_config';

export const FALLBACK_BRANDING: FeedbackBranding = {
  restaurantName: 'Safari Restaurant',
  primaryColor: '#2f7d4a',
  logoUrl: '',
  backgroundImageUrl: '',
  positiveFeedbackWebhook: '',
  negativeFeedbackWebhook: '',
};

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toStringValue(source[key]);
    if (value) return value;
  }

  return '';
}

function normalizeBranding(config: Record<string, unknown>): FeedbackBranding {
  const webhooks = typeof config.webhooks === 'object' && config.webhooks ? (config.webhooks as Record<string, unknown>) : {};
  const mergedConfig = { ...webhooks, ...config };

  return {
    restaurantName:
      pickString(mergedConfig, ['rest_nombre', 'restaurantName', 'restaurant_name', 'nombre_restaurante']) ||
      FALLBACK_BRANDING.restaurantName,
    primaryColor: pickString(mergedConfig, ['color', 'primaryColor', 'primary_color']) || FALLBACK_BRANDING.primaryColor,
    logoUrl: pickString(mergedConfig, ['logo_restaurante', 'restaurantLogoUrl', 'restaurant_logo_url', 'logo']),
    backgroundImageUrl: pickString(mergedConfig, ['backgroundImageUrl', 'backgroundImage', 'restaurantBackgroundUrl', 'fondo_restaurante', 'background']),
    positiveFeedbackWebhook: pickString(mergedConfig, ['webhook_feedback_positivo']),
    negativeFeedbackWebhook: pickString(mergedConfig, ['webhook_feedback_negativo']),
  };
}

function hasFeedbackWebhooks(branding: FeedbackBranding) {
  return Boolean(branding.positiveFeedbackWebhook && branding.negativeFeedbackWebhook);
}

export function loadBrandingFromSession(): FeedbackBranding {
  try {
    const rawConfig = sessionStorage.getItem(CLIENT_CONFIG_KEY);

    if (!rawConfig) {
      return FALLBACK_BRANDING;
    }

    return normalizeBranding(JSON.parse(rawConfig) as Record<string, unknown>);
  } catch {
    return FALLBACK_BRANDING;
  }
}

export async function loadPublicFeedbackBranding(idReserva: string): Promise<FeedbackBranding> {
  const localBranding = loadBrandingFromSession();
  const webhookUrl = PUBLIC_FEEDBACK_CONFIG_WEBHOOK_URL.trim();

  if (hasFeedbackWebhooks(localBranding) || !webhookUrl) {
    return localBranding;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_reserva: idReserva }),
  });

  if (!response.ok) {
    return localBranding;
  }

  const data = (await response.json()) as Record<string, unknown>;
  return normalizeBranding(data);
}

export async function submitFeedback(payload: SubmitFeedbackPayload, webhookUrl: string) {
  const targetUrl = webhookUrl.trim();

  if (!targetUrl) {
    throw new Error('Feedback webhook no configurado');
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Feedback request failed with status ${response.status}`);
  }

  return { success: true, skipped: false };
}
