import { useState, useEffect } from "react";
import type { WidgetSettings } from "../types/medical";
import { api } from "../services/api";

interface UserPermissions {
  canAnnotate: boolean;
  canViewAnnotations: boolean;
  canSubmitDiagnosis: boolean;
  canSeeAi: boolean;
  canSeeGallery: boolean;
  active: boolean;
  canSeePatients: boolean;
}

const DEFAULTS: WidgetSettings = {
  showAISuggestion: true,
  showPathologyInput: true,
  showAnnotationTool: true,
  showViewAnnotations: true,
  showImageGallery: true,
  showPatients: false,
  showTiradsCalculator: true,
};

export function useWidgetSettings(): WidgetSettings {
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULTS);

  useEffect(() => {
    Promise.all([
      api.get<WidgetSettings>("/widget-settings").catch(() => DEFAULTS),
      api.get<UserPermissions>("/users/me/permissions").catch(() => null),
    ]).then(([global, user]) => {
      if (!user) { setSettings(global); return; }
      setSettings({
        showAISuggestion:   global.showAISuggestion  && user.canSeeAi,
        showPathologyInput:  global.showPathologyInput && user.canSubmitDiagnosis,
        showAnnotationTool:  global.showAnnotationTool && user.canAnnotate,
        showViewAnnotations: global.showViewAnnotations && user.canViewAnnotations,
        showImageGallery:    global.showImageGallery   && user.canSeeGallery,
        showPatients:        user.canSeePatients ?? false,
        showTiradsCalculator: global.showTiradsCalculator,
      });
    });
  }, []);

  return settings;
}
