import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Send, Star } from 'lucide-react';
import {
  FALLBACK_BRANDING,
  loadPublicFeedbackBranding,
  submitFeedback,
} from './feedback';
import type { FeedbackBranding, FeedbackSubmitState } from './feedback';

function getReservationIdFromPath() {
  const match = window.location.pathname.match(/^\/feedback\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : 'RES-PRUEBA123';
}

function getRatingText(rating: number) {
  return '⭐'.repeat(Math.min(5, Math.max(1, rating)));
}

export function App() {
  const idReserva = getReservationIdFromPath();
  const [branding, setBranding] = useState<FeedbackBranding>(FALLBACK_BRANDING);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<FeedbackSubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    loadPublicFeedbackBranding(idReserva)
      .then((nextBranding) => {
        if (isMounted) setBranding(nextBranding);
      })
      .catch(() => {
        if (isMounted) setBranding(FALLBACK_BRANDING);
      });

    return () => {
      isMounted = false;
    };
  }, [idReserva]);

  const activeRating = hoverRating || rating;
  const pageStyle = useMemo(
    () =>
      ({
        '--feedback-accent': branding.primaryColor,
        '--feedback-bg-image': branding.backgroundImageUrl ? `url("${branding.backgroundImageUrl}")` : 'none',
      }) as CSSProperties,
    [branding.backgroundImageUrl, branding.primaryColor],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!rating || status === 'sending') return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const feedbackWebhook = rating >= 4 ? branding.positiveFeedbackWebhook : branding.negativeFeedbackWebhook;
      await submitFeedback({
        id_reserva: idReserva,
        puntuacion: rating,
        puntuacion_texto: getRatingText(rating),
        comentario: comment.trim(),
        timestamp: new Date().toISOString(),
      }, feedbackWebhook);
      setStatus('success');
    } catch (error) {
      console.error('[COSTABOTS Feedback] Error enviando valoracion', error);
      setStatus('error');
      setErrorMessage('No se ha podido enviar la valoración en este momento.');
    }
  }

  return (
    <main className="feedback-shell" style={pageStyle}>
      <section className="feedback-card" aria-label={`Valoracion de ${branding.restaurantName}`}>
        {status === 'success' ? (
          <div className="success-view">
            <span className="success-icon" aria-hidden="true">
              <CheckCircle2 size={42} />
            </span>
            <p className="restaurant-name">{branding.restaurantName}</p>
            <h1>Gracias por tu valoración</h1>
            <p>Tu opinión nos ayuda a mejorar.</p>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="brand-avatar">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.restaurantName} />
              ) : (
                <span aria-hidden="true">{branding.restaurantName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            <p className="restaurant-name">{branding.restaurantName}</p>

            <div className="bot-message">
              <h1>Gracias por visitarnos</h1>
              <p>¿Cómo valorarías tu experiencia?</p>
            </div>

            <fieldset className="rating-field" aria-label="Puntuacion">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                  aria-pressed={rating === value}
                  className={value <= activeRating ? 'is-active' : ''}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => setRating(value)}
                  onFocus={() => setHoverRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  type="button"
                >
                  <Star size={39} fill="currentColor" />
                </button>
              ))}
            </fieldset>

            <label className="comment-field">
              Comentario opcional
              <textarea
                onChange={(event) => setComment(event.target.value)}
                placeholder="Cuéntanos qué te gustó o qué podríamos mejorar"
                rows={4}
                value={comment}
              />
            </label>

            {status === 'error' && (
              <p className="error-message">
                <AlertCircle size={17} />
                {errorMessage}
              </p>
            )}

            <button className="submit-button" disabled={!rating || status === 'sending'} type="submit">
              <Send size={18} />
              {status === 'sending' ? 'Enviando...' : 'Enviar valoración'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
