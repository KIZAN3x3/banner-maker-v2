import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// header: 長押し/ドラッグの起点になる要素（レイヤー行のサマリー部分）
// children: 展開パネルなど、ドラッグ対象に含めない付随コンテンツ
export default function SortableLayerRow({ id, disabled, header, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 50 : "auto",
      }}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        style={{
          touchAction: "manipulation",
          cursor: disabled ? "default" : "grab",
          opacity: isDragging ? 0.9 : 1,
          boxShadow: isDragging ? "0 10px 28px rgba(0,0,0,0.28)" : "none",
          background: isDragging ? "#fff" : "transparent",
        }}
      >
        {header}
      </div>
      {children}
    </div>
  );
}
