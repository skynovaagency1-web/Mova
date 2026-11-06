// Photos of the pilot places, from Wikimedia Commons (free licences, credited in the app and on the site).
// Loaded from Wikimedia's thumbnail servers; replace with MovaaGo's own photos when available.
const T = "https://thumb.wikimedia.org/wikipedia/commons/thumb/";

export type PlacePhoto = { uri: string; credit: string };

export const PLACE_PHOTOS: Record<string, PlacePhoto> = {
  viotte: { uri: T + "e/e7/Gare_de_Besan%C3%A7on_Viotte.jpg/960px-Gare_de_Besan%C3%A7on_Viotte.jpg", credit: "Niamor12, CC BY-SA 4.0" },
  centre: { uri: "https://upload.wikimedia.org/wikipedia/commons/5/54/Eglise_St_Pierre_Besancon_02.jpg", credit: "Arnaud 25, domaine public" },
  battant: { uri: T + "6/6e/Besan%C3%A7on%2C_le_quartier_Battant.jpg/960px-Besan%C3%A7on%2C_le_quartier_Battant.jpg", credit: "Wikipedro, CC BY-SA 4.0" },
  citadelle: { uri: T + "a/ab/Aerial_image_of_the_Citadel_of_Besan%C3%A7on_%28view_from_the_southwest%29.jpg/960px-Aerial_image_of_the_Citadel_of_Besan%C3%A7on_%28view_from_the_southwest%29.jpg", credit: "Carsten Steger, CC BY-SA 4.0" },
  tgv: { uri: T + "7/7e/La_gare_de_Besan%C3%A7on-Franche-Comt%C3%A9_TGV_%282%29.jpg/960px-La_gare_de_Besan%C3%A7on-Franche-Comt%C3%A9_TGV_%282%29.jpg", credit: "Wikipedro, CC BY-SA 4.0" },
  chu: { uri: T + "6/6a/Besan%C3%A7on%2C_le_CHU_Jean_Minjoz.jpg/960px-Besan%C3%A7on%2C_le_CHU_Jean_Minjoz.jpg", credit: "Wikipedro, CC BY-SA 4.0" },
  campus: { uri: T + "f/f9/Besan%C3%A7on%2C_le_b%C3%A2timent_Rousseau_du_campus_de_la_Bouloie.jpg/960px-Besan%C3%A7on%2C_le_b%C3%A2timent_Rousseau_du_campus_de_la_Bouloie.jpg", credit: "Wikipedro, CC BY-SA 4.0" },
  planoise: { uri: T + "1/18/Planoise_Montage_-_2.jpg/960px-Planoise_Montage_-_2.jpg", credit: "Toufik-de-planoise, CC BY-SA 1.0" },
  micropolis: { uri: T + "3/33/Micropolis_Besan%C3%A7on_002.jpg/960px-Micropolis_Besan%C3%A7on_002.jpg", credit: "Arnaud 25, CC BY-SA 4.0" },
  chalezeule: { uri: T + "d/d3/Chalezeule%2C_vue_sur_le_centre_du_village.jpg/960px-Chalezeule%2C_vue_sur_le_centre_du_village.jpg", credit: "Wikipedro, CC BY-SA 4.0" },
};

export const PHOTO_CREDITS = "Photos des lieux : Wikimedia Commons — " + Object.values(PLACE_PHOTOS).map((p) => p.credit.split(",")[0]).filter((v, i, a) => a.indexOf(v) === i).join(", ") + " (CC BY-SA / domaine public).";
