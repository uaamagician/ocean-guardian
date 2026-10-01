// tone drives the color scale in index.css (.level-dot[data-tone]).
export const CATEGORIES = {
  clean: { label: "乾淨", tone: "clean" },
  light: { label: "少量垃圾", tone: "light" },
  moderate: { label: "中量垃圾", tone: "moderate" },
  heavy: { label: "大量垃圾", tone: "heavy" },
  not_beach: { label: "不是海灘照片", tone: "none" },
  healthy: { label: "珊瑚健康", tone: "clean" },
  partially_bleached: { label: "部分白化", tone: "light" },
  severely_bleached: { label: "嚴重白化", tone: "moderate" },
  dead: { label: "珊瑚死亡", tone: "heavy" },
  not_coral: { label: "不是珊瑚照片", tone: "none" },
};

export const STATUS = {
  processing: "AI 分析中",
  published: "已公開在地圖上",
  pending_review: "等待人工確認",
};

export const TYPES = {
  trash: "海灘垃圾",
  coral: "珊瑚",
};

export const TONE_COLORS = {
  clean: "#3f9a85",
  light: "#d4ab3c",
  moderate: "#e57a32",
  heavy: "#b8321e",
  none: "#8d9ca1",
};

export function formatTime(timestamp) {
  if (!timestamp) return "";
  return timestamp.toDate().toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
