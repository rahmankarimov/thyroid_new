import { useState, useEffect, useCallback } from "react";
import type { Annotation } from "../types/medical";
import { medicalDataService } from "../services/medicalDataService";

export function useAnnotations(imageSeriesId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!imageSeriesId) {
      setAnnotations([]);
      return;
    }
    setAccessDenied(false);
    medicalDataService
      .getAnnotations(imageSeriesId)
      .then(data => {
        const parsed = data.map(a => {
          let parsedPath = a.path;
          if (typeof a.path === "string") {
            try { parsedPath = JSON.parse(a.path); } catch (e) { console.error("Failed to parse path", e); }
          }
          return { ...a, path: parsedPath as any };
        });
        setAnnotations(parsed);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("assigned")) setAccessDenied(true);
        setAnnotations([]);
      });
  }, [imageSeriesId]);

  const addAnnotation = useCallback(
    async (req: {
      imageSeriesId: string;
      patientId: string;
      path: Array<{ x: number; y: number }>;
      comment: string;
      color: string;
    }): Promise<Annotation> => {
      const ann = await medicalDataService.saveAnnotation(req);
      setAnnotations((prev) => [...prev, ann]);
      return ann;
    },
    []
  );

  const removeAnnotation = useCallback(async (id: string) => {
    await medicalDataService.deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const setShared = useCallback(async (id: string, shared: boolean) => {
    const updated = await medicalDataService.setAnnotationShared(id, shared);
    setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, shared: updated.shared } : a));
  }, []);

  return { annotations, addAnnotation, removeAnnotation, setShared, accessDenied };
}
