import { describe, it, expect } from "vitest";
import { mapVivaRealItem, mapVivaRealPropertyType } from "@/lib/apify/vivareal";
import type { VivaRealItem } from "@/lib/apify/vivareal";

const baseItem: VivaRealItem = {
  identity: { id: "2880363892" },
  source_context: {
    url: "https://www.vivareal.com.br/imovel/apartamento-3-quartos-iraja-rio-de-janeiro-com-garagem-98m2-venda-RS295000-id-2880363892/",
  },
  timestamps: { published_at: "2026-04-15T03:04:46.048000+00:00" },
  pricing: {
    amount: 295000,
    offers: [
      { business_type: "sale", amount: 295000, monthly_condo_fee: 627, yearly_iptu: 540 },
    ],
  },
  location: {
    street: "Rua Honório de Almeida",
    street_number: "69",
    neighborhood: "Irajá",
    city: "Rio de Janeiro",
    state_code: "RJ",
    coordinates: { latitude: -22.836969, longitude: -43.323003 },
  },
  media: {
    images: [
      { url: "https://resizedimgs.vivareal.com/img/vr-listing/5e442a0a4aedf53f0329a2942a053fc1/photo.webp" },
    ],
  },
  attributes: {
    listing_type: "used",
    unit_types: ["apartment"],
    amenities: ["piscina"],
    rooms: { bedrooms: 3, bathrooms: 3, suites: 1, parking_spaces: 2 },
    area: { usable_area: 98, total_area: 98 },
  },
};

describe("mapVivaRealPropertyType", () => {
  it("apartment", () => {
    expect(mapVivaRealPropertyType(["apartment"])).toBe("apartment");
  });
  it("house family", () => {
    expect(mapVivaRealPropertyType(["home"])).toBe("house");
    expect(mapVivaRealPropertyType(["townhouse"])).toBe("house");
  });
  it("commercial", () => {
    expect(mapVivaRealPropertyType(["office"])).toBe("commercial");
    expect(mapVivaRealPropertyType(["store"])).toBe("commercial");
  });
  it("land", () => {
    expect(mapVivaRealPropertyType(["residential_land"])).toBe("land");
  });
  it("null when empty", () => {
    expect(mapVivaRealPropertyType(undefined)).toBeNull();
  });
});

describe("mapVivaRealItem", () => {
  it("mapeia item completo do VivaReal", () => {
    const { payload, amenities, skipReason } = mapVivaRealItem(baseItem);

    expect(skipReason).toBeNull();
    expect(payload).not.toBeNull();

    expect(payload!.source_url).toBe(baseItem.source_context!.url);
    expect(payload!.source).toBe("vivareal");
    expect(payload!.ad_id).toBe("2880363892");
    expect(payload!.price).toBe(295000);
    expect(payload!.usable_area).toBe(98);
    expect(payload!.total_area).toBe(98);
    expect(payload!.bedrooms).toBe(3);
    expect(payload!.bathrooms).toBe(3);
    expect(payload!.suites).toBe(1);
    expect(payload!.parking_spaces).toBe(2);
    expect(payload!.condo_fee).toBe(627);
    expect(payload!.iptu).toBe(540);
    expect(payload!.property_type).toBe("apartment");
    expect(payload!.lat).toBe(-22.836969);
    expect(payload!.lng).toBe(-43.323003);
    expect(payload!.neighborhood).toBe("Irajá");
    expect(payload!.city).toBe("Rio de Janeiro");
    expect(payload!.address).toBe("Rua Honório de Almeida, 69");
    expect(payload!.state).toBe("RJ");
    expect(payload!.conservation_state).toBe("regular");
    expect(payload!.listing_created_at).toBe("2026-04-15T03:04:46.048000+00:00");
    expect(payload!.images).toHaveLength(1);
    expect(payload!.is_new_launch).toBe(false);
    // piscina em apartamento → escopo condo
    expect(amenities).toEqual([{ item: "piscina", scope: "condo" }]);
  });

  it("is_new_launch true para lançamento", () => {
    const item: VivaRealItem = {
      ...baseItem,
      attributes: { ...baseItem.attributes, listing_type: "new" },
    };
    expect(mapVivaRealItem(item).payload!.is_new_launch).toBe(true);
  });

  it("sai com skip quando faltam campos obrigatórios", () => {
    const { payload, skipReason } = mapVivaRealItem({ ...baseItem, pricing: {} });
    expect(payload).toBeNull();
    expect(skipReason).toContain("missing");
  });

  it("sai com skip quando faltam coordenadas", () => {
    const item: VivaRealItem = {
      ...baseItem,
      location: { ...baseItem.location, coordinates: undefined },
    };
    const { payload, skipReason } = mapVivaRealItem(item);
    expect(payload).toBeNull();
    expect(skipReason).toBe("missing coordinates");
  });

  it("sai com skip para tipo não mapeado", () => {
    const item: VivaRealItem = {
      ...baseItem,
      attributes: { ...baseItem.attributes, unit_types: ["storage"] },
    };
    const { payload, skipReason } = mapVivaRealItem(item);
    expect(payload).toBeNull();
    expect(skipReason).toBe("unmapped property_type");
  });

  it("aceita strings numéricas BR com separador de milhar e vírgula decimal", () => {
    const item: VivaRealItem = {
      ...baseItem,
      pricing: { amount: "295.000" as unknown as number },
      attributes: {
        ...baseItem.attributes,
        area: { usable_area: "98,5" as unknown as number, total_area: 100 },
      },
    };
    const { payload, skipReason } = mapVivaRealItem(item);
    expect(skipReason).toBeNull();
    expect(payload!.price).toBe(295000);
    expect(payload!.usable_area).toBe(98.5);
  });
});
