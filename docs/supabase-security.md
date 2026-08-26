# Nota de Segurança — PostGIS no Supabase

## Alerta `RLS Disabled in Public`

O alerta para `public.spatial_ref_sys` é um caso conhecido envolvendo a extensão PostGIS. Essa relação contém somente definições públicas de sistemas de referência de coordenadas (códigos EPSG); não contém avaliações, usuários, anúncios ou outros dados do produto.

`spatial_ref_sys` é criado e gerenciado pela própria extensão, normalmente com proprietário `supabase_admin`. Por isso, tentar executar:

```sql
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
```

pode retornar `must be owner of table spatial_ref_sys` e não é a correção apropriada. Habilitar RLS nesse objeto também pode interferir no funcionamento ou nas atualizações do PostGIS.

## Mitigação do alerta PostGIS

A migração `016_postgis_metadata_access.sql` remove operações de escrita dos papéis `anon` e `authenticated`, preservando a leitura necessária às funções espaciais. O backend usa a chave secreta do Supabase e continua podendo executar as consultas espaciais.

Essa mitigação não necessariamente remove o cartão do Security Advisor, porque o lint verifica se o objeto tem RLS, não se é uma tabela de sistema gerenciada por extensão. Se o único alerta restante for `public.spatial_ref_sys`, trata-se de um falso positivo conhecido.

## Instalações novas

Para novos projetos, o PostGIS deve ser instalado em um schema próprio, como `extensions`, antes de criar as tabelas da aplicação. Assim, os metadados da extensão não ficam no schema exposto pela API:

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
```

Os scripts de schema do repositório usam `public, extensions` no `search_path` para permanecerem compatíveis com projetos existentes onde PostGIS já está em `public` e com projetos novos onde está em `extensions`.

## Migração de um projeto existente

Não execute `DROP EXTENSION postgis CASCADE` em produção sem backup e janela de manutenção: as tabelas e funções espaciais dependem da extensão. Para retirar o PostGIS de `public` e limpar o alerta, use uma instância de homologação ou solicite a migração ao suporte do Supabase. Depois, valide `ST_DWithin`, `ST_Distance`, geocodificação e o RPC `search_listings_in_radius`.

## Tabelas da aplicação

O alerta mostrado não aponta para `listings` ou `valuations`. Essas tabelas continuam devendo ter RLS próprio, políticas mínimas e grants explícitos. A aplicação deve manter a chave secreta exclusivamente no backend.

## Tabela de fotos

Durante a auditoria foi identificado um risco real separado: `valuation_photos` era criada sem RLS pela migração `012`. As migrações `012` (novas instalações) e `017` (bancos existentes) agora habilitam RLS e deixam o acesso da tabela somente para `service_role`.

## Armazenamento de fotos (bucket privado)

O bucket `property-photos` deve ser **privado** no painel do Supabase (Storage → property-photos → Configurações → "Private bucket"). Com isso:

- `POST /api/upload-photos` retorna apenas o **path do objeto** (nunca URL pública) e o frontend nunca recebe URLs permanentes.
- Toda imagem é exibida pelo proxy autenticado `GET /api/valuation-photos/[id]/image`, que baixa o objeto via `service_role` e faz streaming (com conversão de HEIC quando necessário).
- O backend resolve paths para **signed URLs de curta duração** ao enviar fotos para análise de IA (Gemini).
- **Metadados são removidos no upload**: o `sharp` reencoda a imagem (rotate + JPEG), eliminando EXIF/GPS, modelo de câmera e timestamps antes do armazenamento e de qualquer envio externo.
- Registros antigos que guardam a URL pública legada continuam funcionando: o proxy extrai o path da URL e baixa pelo `service_role`.

### Migração manual (uma vez)
1. No painel: Storage → `property-photos` → marcar como **private**.
2. Aplicar `supabase/migrations/018_audit_logs.sql` no SQL Editor.
3. Validar com: abrir um estudo com fotos (devem carregar via proxy) e gerar o PDF (fotos inclusas).
