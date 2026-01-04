// Waypoint Editor Components
// These components are extracted from WaypointEditorDialog for better maintainability

export { NutritionFieldsForm, createEmptyNutritionData } from "./NutritionFieldsForm";
export type { NutritionFormData } from "./NutritionFieldsForm";

export { SpatialWaypointTab, SpatialTabTrigger } from "./SpatialWaypointTab";
export { TemporalWaypointTab, TemporalTabTrigger } from "./TemporalWaypointTab";
export { LoopWaypointTab, LoopTabTrigger, getEffectiveRepetitions } from "./LoopWaypointTab";
