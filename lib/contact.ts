/** Aloqa bo'limlarida ishlatiladigan ish vaqti */
export const WORK_HOURS = "10:00 – 18:00";

/** Asosiy aloqa email manzili */
export const CONTACT_EMAIL = "ziyomalaka@gmail.com";

/** Ofis joylashuvi: 41°12'26.6"N 69°13'24.0"E */
export const OFFICE_LOCATION = {
  lat: 41.2073889,
  lng: 69.2233333,
  dms: "41°12'26.6\"N 69°13'24.0\"E",
  zoom: 17,
} as const;

export const GOOGLE_MAPS_URL = `https://www.google.com/maps?q=${OFFICE_LOCATION.lat},${OFFICE_LOCATION.lng}`;

export const YANDEX_MAPS_URL = `https://yandex.com/maps/?ll=${OFFICE_LOCATION.lng},${OFFICE_LOCATION.lat}&z=${OFFICE_LOCATION.zoom}&pt=${OFFICE_LOCATION.lng},${OFFICE_LOCATION.lat}`;

export const GOOGLE_MAPS_EMBED_URL = `https://maps.google.com/maps?q=${OFFICE_LOCATION.lat},${OFFICE_LOCATION.lng}&z=${OFFICE_LOCATION.zoom}&hl=uz&output=embed`;
