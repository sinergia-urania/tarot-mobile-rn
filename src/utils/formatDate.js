// src/utils/formatDate.js
export function formatDateLocal(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


