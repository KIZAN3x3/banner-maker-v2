import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

// 400ms長押しでドラッグ開始（tolerance未満の指の揺れは許容し、
// それを超えて動いた場合は通常のスクロール/クリックとして扱う）
export function useLayerDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 400, tolerance: 8 } })
  );
}
