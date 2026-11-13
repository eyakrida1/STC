// Petit bus d'événements : prévient les éléments de la coque (cloche, compteurs) qu'une donnée a changé.
// Avec l'API Django, il sera remplacé par une invalidation de cache (ou des notifications temps réel).
import { useEffect } from "react"

const EVENT = "cdis:data-changed"

export type DataTopic = "notes" | "sessions" | "notifications"

export function emitDataChanged(topic: DataTopic) {
  window.dispatchEvent(new CustomEvent<DataTopic>(EVENT, { detail: topic }))
}

export function useDataChanged(listener: (topic: DataTopic) => void) {
  useEffect(() => {
    const handler = (e: Event) => listener((e as CustomEvent<DataTopic>).detail)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [listener])
}
