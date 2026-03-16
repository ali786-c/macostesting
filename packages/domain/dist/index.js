"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  mapLoginResponseToUser: () => mapLoginResponseToUser,
  mapPlaceDtoToCardViewModel: () => mapPlaceDtoToCardViewModel,
  mapReservationDtoToCardViewModel: () => mapReservationDtoToCardViewModel,
  validateLoginPayload: () => validateLoginPayload
});
module.exports = __toCommonJS(index_exports);

// src/auth/loginUseCase.ts
function mapLoginResponseToUser(res) {
  if (!res?.token) return null;
  const id = res.id != null ? String(res.id) : "";
  const name = res.firstName && res.lastName ? `${res.firstName} ${res.lastName}` : res.email?.split("@")[0] ?? "";
  const type = (res.type ?? "client").toLowerCase();
  return {
    id,
    email: res.email ?? "",
    name,
    type
  };
}
function validateLoginPayload(payload) {
  if (!payload.email?.trim()) return "Email requis";
  if (!payload.password?.trim()) return "Mot de passe requis";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) return "Email invalide";
  return null;
}

// src/places/mapPlaceToViewModel.ts
function mapPlaceDtoToCardViewModel(dto) {
  const price = Number(dto.pricePerDay ?? 0);
  return {
    id: dto.id,
    title: dto.city || dto.address || "Sans titre",
    subtitle: (dto.description ?? "").slice(0, 80) + (dto.description && dto.description.length > 80 ? "\u2026" : ""),
    pricePerDay: price,
    priceFormatted: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price),
    type: dto.type ?? "PARKING",
    city: dto.city ?? ""
  };
}

// src/reservations/mapReservationToViewModel.ts
var STATUS_LABELS = {
  PENDING: "En attente",
  CONFIRMED: "Confirm\xE9e",
  COMPLETED: "Termin\xE9e",
  CANCELLED: "Annul\xE9e",
  UPDATE_REQUESTED: "Modification demand\xE9e",
  UPDATE_ACCEPTED: "Modification accept\xE9e",
  UPDATE_REJECTED: "Modification refus\xE9e"
};
function mapReservationDtoToCardViewModel(dto) {
  const price = Number(dto.totalPrice ?? 0);
  return {
    id: dto.id,
    startDate: dto.startDateTime ?? "",
    endDate: dto.endDateTime ?? "",
    totalPrice: price,
    priceFormatted: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price),
    status: dto.status ?? "PENDING",
    statusLabel: STATUS_LABELS[dto.status ?? ""] ?? dto.status ?? "Inconnu"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mapLoginResponseToUser,
  mapPlaceDtoToCardViewModel,
  mapReservationDtoToCardViewModel,
  validateLoginPayload
});
