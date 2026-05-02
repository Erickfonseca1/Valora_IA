import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Valora AI — API",
    version: "1.0.0",
    description:
      "Motor de precificação de imóveis baseado na NBR 14653 (MCDDM). Ingestão de dados via scraper Apify e avaliação geoespacial com PostGIS.",
    contact: { email: "erickfmpeixoto@gmail.com" },
  },
  servers: [{ url: "/api", description: "Local / Production" }],
  components: {
    securitySchemes: {
      IngestSecret: {
        type: "apiKey",
        in: "header",
        name: "x-ingest-secret",
        description: "Shared secret definido em INGEST_WEBHOOK_SECRET",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
          details: { type: "object" },
        },
      },
      IngestPayload: {
        type: "object",
        required: ["source_url", "platform", "price", "usable_area", "lat", "lng", "city"],
        properties: {
          source_url: { type: "string", format: "uri", example: "https://sp.olx.com.br/imoveis/123" },
          platform: {
            type: "string",
            enum: ["olx", "zapimoveis", "vivareal", "quintoandar", "imovelweb"],
          },
          price: { type: "number", example: 850000 },
          usable_area: { type: "number", example: 72 },
          bedrooms: { type: "integer", nullable: true, example: 3 },
          bathrooms: { type: "integer", nullable: true, example: 2 },
          parking_spaces: { type: "integer", nullable: true, example: 1 },
          lat: { type: "number", example: -23.5505 },
          lng: { type: "number", example: -46.6333 },
          neighborhood: { type: "string", nullable: true, example: "Pinheiros" },
          city: { type: "string", example: "São Paulo" },
        },
      },
      IngestResult: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["created", "updated"] },
              id: { type: "string", format: "uuid" },
              source_url: { type: "string" },
            },
          },
        },
      },
      ScrapeResult: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              scraped: { type: "integer", example: 200 },
              upserted: { type: "integer", example: 195 },
              skipped_not_listing: { type: "integer", example: 0 },
              skipped_missing_fields: { type: "integer", example: 3 },
              skipped_no_coords: { type: "integer", example: 2 },
              errors: { type: "integer", example: 0 },
            },
          },
        },
      },
      ScrapeInput: {
        type: "object",
        required: ["location"],
        properties: {
          location: { type: "string", example: "Joao Pessoa, Paraiba" },
          deal_type: { type: "string", enum: ["sale", "rent"], default: "sale" },
          property_type: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "apartment", "studio", "kitnet", "house", "gated_house", "villa_house",
                "penthouse", "flat", "loft", "residential_land", "townhouse", "farm",
                "store", "office", "commercial_house", "hotel", "corporate_floor",
                "building", "commercial_land", "storage", "garage",
              ],
            },
          },
          min_bedroom: { type: "string", enum: ["1", "2", "3", "4"] },
          min_bathroom: { type: "string", enum: ["1", "2", "3", "4"] },
          min_parking: { type: "string", enum: ["1", "2", "3", "4"] },
          min_price: { type: "integer", example: 200000 },
          max_price: { type: "integer", example: 800000 },
          min_sqm: { type: "integer", example: 50 },
          max_sqm: { type: "integer", example: 200 },
          below_market_price: { type: "boolean", default: false },
          near_transit: { type: "boolean", default: false },
          maximize_coverage: { type: "boolean", default: false },
          limit: { type: "integer", default: 200, maximum: 2000, example: 200 },
        },
      },
      EvaluateInput: {
        type: "object",
        required: ["lat", "lng", "target_area"],
        properties: {
          lat: { type: "number", example: -7.1195 },
          lng: { type: "number", example: -34.845 },
          target_area: { type: "number", example: 72 },
          target_bedrooms: { type: "integer", nullable: true, example: 3 },
        },
      },
      ComparableListing: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          source_url: { type: "string", format: "uri" },
          platform: { type: "string" },
          price: { type: "number" },
          price_per_m2: { type: "number" },
          usable_area: { type: "number" },
          bedrooms: { type: "integer", nullable: true },
          bathrooms: { type: "integer", nullable: true },
          parking_spaces: { type: "integer", nullable: true },
          coordinates: {
            type: "object",
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
            },
          },
          neighborhood: { type: "string", nullable: true },
          city: { type: "string" },
          distance_m: { type: "integer" },
          homogenized_price_per_m2: { type: "number" },
        },
      },
      ValuationResult: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              estimated_value: { type: "number", example: 612000.0 },
              price_per_m2_mean: { type: "number", example: 8500.0 },
              price_per_m2_median: { type: "number", example: 8350.0 },
              confidence_interval: {
                type: "object",
                properties: {
                  lower: { type: "number", example: 580000.0 },
                  upper: { type: "number", example: 644000.0 },
                  confidence_level: { type: "number", example: 0.8 },
                },
              },
              sample_size: { type: "integer", example: 12 },
              radius_used_m: { type: "integer", example: 1500 },
              offer_factor_applied: { type: "number", example: 0.9 },
              comparables: {
                type: "array",
                items: { $ref: "#/components/schemas/ComparableListing" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/ingest": {
      post: {
        summary: "Ingerir imóvel individual",
        description:
          "Upsert de um imóvel com coordenadas explícitas. Usado por scrapers customizados ou testes manuais. Se `source_url` já existir, atualiza preço e `last_seen`.",
        security: [{ IngestSecret: [] }],
        tags: ["Ingestão"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/IngestPayload" },
              example: {
                source_url: "https://sp.olx.com.br/imoveis/123",
                platform: "olx",
                price: 850000,
                usable_area: 72,
                bedrooms: 3,
                bathrooms: 2,
                parking_spaces: 1,
                lat: -23.5505,
                lng: -46.6333,
                neighborhood: "Pinheiros",
                city: "São Paulo",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Imóvel atualizado",
            content: { "application/json": { schema: { $ref: "#/components/schemas/IngestResult" } } },
          },
          "201": {
            description: "Imóvel criado",
            content: { "application/json": { schema: { $ref: "#/components/schemas/IngestResult" } } },
          },
          "401": { description: "Token inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "422": { description: "Payload inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "500": { description: "Erro no banco", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/scrape": {
      post: {
        summary: "Disparar scraper ZAP Imóveis + ingerir",
        description:
          "Chama o actor Apify `fatihtahta/zap-imoveis-scraper` de forma síncrona, aguarda o resultado e ingere todos os imóveis automaticamente. Coordenadas GPS reais via Google — sem geocodificação secundária. Pipeline completo: scrape → upsert. Timeout: 10 minutos.",
        security: [{ IngestSecret: [] }],
        tags: ["Ingestão"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ScrapeInput" },
              example: {
                location: "Joao Pessoa, Paraiba",
                deal_type: "sale",
                limit: 200,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Scrape + ingestão concluídos",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ScrapeResult" } } },
          },
          "401": { description: "Token inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "422": { description: "Payload inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "500": { description: "APIFY_API_TOKEN não configurado", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "502": { description: "Apify retornou erro", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/evaluate": {
      get: {
        summary: "Documentação do endpoint",
        description: "Retorna descrição dos campos de entrada e saída.",
        tags: ["Avaliação"],
        responses: {
          "200": { description: "Descrição do endpoint" },
        },
      },
      post: {
        summary: "Avaliar imóvel (MCDDM)",
        description:
          "Executa o motor de precificação NBR 14653. Busca comparáveis em raio progressivo (1–3 km), remove outliers por IQR, aplica Fator de Oferta (0,90) e Fator de Área (expoente 0,7), retorna valor estimado com intervalo de confiança de 80%.",
        tags: ["Avaliação"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EvaluateInput" },
              example: {
                lat: -7.1195,
                lng: -34.845,
                target_area: 72,
                target_bedrooms: 3,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Avaliação concluída",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ValuationResult" } } },
          },
          "404": {
            description: "Comparáveis insuficientes (< 5 no raio máximo de 3 km)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
          },
          "422": { description: "Payload inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "500": { description: "Erro interno no motor", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/valuations": {
      post: {
        summary: "Gerar avaliação (wizard)",
        description:
          "Endpoint principal do wizard. Geocodifica o endereço, roda o motor MCDDM, persiste o resultado e retorna o shape completo do relatório incluindo price_factors (radar chart) e comparables.",
        tags: ["Avaliações"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["address", "property_type", "area_m2"],
                properties: {
                  address: { type: "string", example: "Rua Augusta, 1200, São Paulo, SP" },
                  property_type: { type: "string", enum: ["apartment", "house", "commercial", "land"] },
                  area_m2: { type: "number", example: 98 },
                  bedrooms: { type: "integer", nullable: true, example: 3 },
                  bathrooms: { type: "integer", nullable: true, example: 2 },
                  parking_spots: { type: "integer", nullable: true, example: 1 },
                  amenities: { type: "array", items: { type: "string" }, example: ["Portaria", "Elevador"] },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Avaliação gerada e persistida" },
          "404": { description: "Comparáveis insuficientes na região", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "422": { description: "Endereço não geocodificável ou payload inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/valuations/{id}": {
      get: {
        summary: "Buscar avaliação salva",
        description: "Retorna o shape completo de uma avaliação salva. Usado ao reabrir relatório na tabela do dashboard.",
        tags: ["Avaliações"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, example: "val_abc123" }],
        responses: {
          "200": { description: "Avaliação encontrada" },
          "404": { description: "Não encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/dashboard/metrics": {
      get: {
        summary: "Métricas do dashboard",
        description: "Alimenta os cards do topo: avaliações do mês, confiança média, temperatura de mercado e cidade principal.",
        tags: ["Dashboard"],
        responses: {
          "200": {
            description: "Métricas calculadas",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    valuations_this_month: 47,
                    valuations_prev_month: 42,
                    avg_confidence: 91.2,
                    market_temperature: "hot",
                    market_city: "São Paulo",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/dashboard/valuations": {
      get: {
        summary: "Tabela de avaliações recentes",
        description: "Lista paginada de avaliações para a tabela do dashboard.",
        tags: ["Dashboard"],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": {
            description: "Lista paginada",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    total: 132,
                    items: [
                      {
                        id: "val_abc123",
                        address: "Rua Augusta, 1200",
                        neighborhood: "Consolação, SP",
                        property_type: "apartment",
                        price_brl: 785000,
                        confidence_score: 94,
                        created_at: "2026-04-29T12:00:00Z",
                        bedrooms: 3,
                        area_m2: 98,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/market/trend": {
      get: {
        summary: "Tendência de preço/m² por cidade",
        description: "Retorna série histórica de preço médio/m² por mês para alimentar o gráfico de linha do dashboard.",
        tags: ["Mercado"],
        parameters: [
          { name: "city", in: "query", required: true, schema: { type: "string" }, example: "joao-pessoa" },
          { name: "months", in: "query", schema: { type: "integer", default: 12, maximum: 24 } },
        ],
        responses: {
          "200": {
            description: "Série histórica",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    city: "Joao Pessoa",
                    period_months: 12,
                    current_price_m2: 6800,
                    yearly_change_pct: 8.5,
                    data_points: [6200, 6250, 6300, 6280, 6350, 6400, 6450, 6500, 6600, 6700, 6750, 6800],
                  },
                },
              },
            },
          },
          "422": { description: "city param ausente", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
  },
  tags: [
    { name: "Ingestão", description: "Endpoints para popular o banco de imóveis comparáveis" },
    { name: "Avaliações", description: "Wizard + relatório — endpoint principal do produto" },
    { name: "Dashboard", description: "Cards e tabela do dashboard" },
    { name: "Mercado", description: "Tendências de preço por cidade" },
  ],
};

export async function GET() {
  return NextResponse.json(spec);
}
