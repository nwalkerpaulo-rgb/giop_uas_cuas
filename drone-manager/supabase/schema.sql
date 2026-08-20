-- ============================================================
-- SCHEMA: Gestão de Drones e Contra-Drones
-- Base de dados: Supabase (Postgres)
-- ============================================================

-- Extensão para UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- UTILIZADORES / PERFIS
-- ============================================================
-- Nota: auth.users já é gerido pelo Supabase Auth.
-- Esta tabela guarda o perfil e função de cada utilizador autenticado.

create type user_role as enum ('admin', 'gestor', 'piloto', 'observador');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  photo_url text,
  role user_role not null default 'piloto',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Certificações / habilitações do piloto
create table certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,              -- ex: 'A1/A3', 'A2', 'Operador Certificado'
  certificate_number text,
  issued_at date,
  expires_at date,
  document_url text,               -- ficheiro digitalizado no Supabase Storage
  created_at timestamptz not null default now()
);

-- Certificado médico
create table medical_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  expires_at date,
  document_url text,
  created_at timestamptz not null default now()
);

-- Registo de formação / treino
create table trainings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  completed_at date,
  document_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ATIVOS: DRONES, BATERIAS, CONTRA-DRONE, EQUIPAMENTO
-- ============================================================

create type asset_status as enum ('operacional', 'manutencao', 'inativo');

create table drones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null,
  serial_number text unique not null,
  acquired_at date,
  status asset_status not null default 'operacional',
  total_flight_seconds integer not null default 0,  -- acumulado dos logs
  next_maintenance_at date,
  next_maintenance_hours integer,                    -- alerta por horas de voo
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table batteries (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid references drones(id) on delete set null, -- bateria pode não estar afeta a um drone fixo
  model text not null,
  serial_number text unique not null,
  cycle_count integer not null default 0,
  total_flight_seconds integer not null default 0,
  health_pct integer,                                -- se o log trouxer info de saúde
  status asset_status not null default 'operacional',
  next_maintenance_cycles integer,
  created_at timestamptz not null default now()
);

create table counter_drone_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null,
  serial_number text unique not null,
  system_type text,             -- ex: 'RF Detection', 'Radar', 'Jamming', 'Optico'
  status asset_status not null default 'operacional',
  next_maintenance_at date,
  notes text,
  created_at timestamptz not null default now()
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,           -- ex: payload, comando, tablet, case
  serial_number text,
  status asset_status not null default 'operacional',
  checked_out_by uuid references profiles(id) on delete set null,
  checked_out_at timestamptz,
  next_maintenance_at date,
  created_at timestamptz not null default now()
);

-- Histórico de manutenção (genérico, ligado a qualquer tipo de ativo)
create type maintenance_asset_type as enum ('drone', 'bateria', 'contra_drone', 'equipamento');

create table maintenance_records (
  id uuid primary key default gen_random_uuid(),
  asset_type maintenance_asset_type not null,
  asset_id uuid not null,        -- id do drone/bateria/contra_drone/equipamento
  performed_by uuid references profiles(id) on delete set null,
  performed_at date not null default current_date,
  description text not null,
  next_due_at date,
  next_due_hours integer,
  next_due_cycles integer,
  document_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SESSÕES (INÍCIO/FIM DE SERVIÇO)
-- ============================================================

create type session_status as enum ('aberta', 'fechada', 'completa');

create table service_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id) on delete cascade,
  status session_status not null default 'aberta',

  started_at timestamptz not null default now(),
  start_lat double precision,
  start_lng double precision,
  start_location_label text,

  ended_at timestamptz,
  end_lat double precision,
  end_lng double precision,
  end_location_label text,

  notes text,
  created_at timestamptz not null default now()
);

-- Pilotos/utilizadores presentes numa sessão (M:N)
create table session_participants (
  session_id uuid not null references service_sessions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role_in_session text,          -- ex: 'piloto', 'observador', 'operador payload'
  primary key (session_id, profile_id)
);

-- Ativos usados numa sessão (M:N, genérico)
create table session_assets (
  session_id uuid not null references service_sessions(id) on delete cascade,
  asset_type maintenance_asset_type not null,
  asset_id uuid not null,
  primary key (session_id, asset_type, asset_id)
);

-- Fotos associadas à sessão
create table session_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references service_sessions(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  photo_url text not null,
  caption text,
  taken_at timestamptz not null default now()
);

-- ============================================================
-- MISSÕES
-- ============================================================

create type mission_origin as enum ('log_importado', 'manual');
create type mission_status as enum ('concluida', 'falhada', 'cua');
create type mission_log_status as enum ('pendente', 'a_processar', 'concluido', 'erro');

create table missions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references service_sessions(id) on delete set null,
  pilot_id uuid not null references profiles(id) on delete cascade,
  drone_id uuid references drones(id) on delete set null,
  battery_id uuid references batteries(id) on delete set null,

  origin mission_origin not null default 'manual',
  status mission_status not null default 'concluida',

  started_at timestamptz,
  ended_at timestamptz,
  flight_seconds integer,          -- tempo de voo em segundos
  distance_meters numeric,
  max_altitude_meters numeric,

  area_label text,
  lat double precision,
  lng double precision,

  log_file_url text,               -- path dentro do bucket privado "logs" (não é URL público)
  log_processed boolean not null default false,
  log_status mission_log_status not null default 'pendente',
  log_error text,
  max_speed_mps numeric,
  battery_serial_seen text,        -- nº de série da bateria lido do log (para conferência)

  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INCIDENTES
-- ============================================================

create type incident_severity as enum ('baixa', 'media', 'alta', 'critica');

create table incidents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references service_sessions(id) on delete set null,
  mission_id uuid references missions(id) on delete set null,
  reported_by uuid not null references profiles(id) on delete cascade,
  severity incident_severity not null default 'baixa',
  description text not null,
  actions_taken text,
  lat double precision,
  lng double precision,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  photo_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES ÚTEIS
-- ============================================================
create index idx_missions_pilot on missions(pilot_id);
create index idx_missions_drone on missions(drone_id);
create index idx_missions_session on missions(session_id);
create index idx_sessions_created_by on service_sessions(created_by);
create index idx_maintenance_asset on maintenance_records(asset_type, asset_id);
create index idx_certifications_profile on certifications(profile_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Regra geral: admin/gestor vê tudo. Piloto vê o que criou ou onde participou.

alter table profiles enable row level security;
alter table certifications enable row level security;
alter table medical_certificates enable row level security;
alter table trainings enable row level security;
alter table drones enable row level security;
alter table batteries enable row level security;
alter table counter_drone_systems enable row level security;
alter table equipment enable row level security;
alter table maintenance_records enable row level security;
alter table service_sessions enable row level security;
alter table session_participants enable row level security;
alter table session_assets enable row level security;
alter table session_photos enable row level security;
alter table missions enable row level security;
alter table incidents enable row level security;
alter table incident_photos enable row level security;

-- Função auxiliar: devolve a função do utilizador autenticado
create or replace function current_user_role()
returns user_role
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- PROFILES: todos autenticados podem ver a lista (para escolher pilotos numa sessão);
-- só admin/gestor pode editar outros perfis.
create policy "profiles_select_all" on profiles for select
  using (auth.role() = 'authenticated');
create policy "profiles_update_self_or_admin" on profiles for update
  using (id = auth.uid() or current_user_role() in ('admin','gestor'));
create policy "profiles_insert_admin" on profiles for insert
  with check (current_user_role() in ('admin','gestor') or id = auth.uid());

-- ATIVOS (drones, baterias, contra-drone, equipamento): leitura para todos autenticados,
-- escrita só admin/gestor.
create policy "drones_select" on drones for select using (auth.role() = 'authenticated');
create policy "drones_write" on drones for all
  using (current_user_role() in ('admin','gestor'))
  with check (current_user_role() in ('admin','gestor'));

create policy "batteries_select" on batteries for select using (auth.role() = 'authenticated');
create policy "batteries_write" on batteries for all
  using (current_user_role() in ('admin','gestor'))
  with check (current_user_role() in ('admin','gestor'));

create policy "counter_drone_select" on counter_drone_systems for select using (auth.role() = 'authenticated');
create policy "counter_drone_write" on counter_drone_systems for all
  using (current_user_role() in ('admin','gestor'))
  with check (current_user_role() in ('admin','gestor'));

create policy "equipment_select" on equipment for select using (auth.role() = 'authenticated');
create policy "equipment_write" on equipment for all
  using (current_user_role() in ('admin','gestor'))
  with check (current_user_role() in ('admin','gestor'));

create policy "maintenance_select" on maintenance_records for select using (auth.role() = 'authenticated');
create policy "maintenance_write" on maintenance_records for all
  using (current_user_role() in ('admin','gestor'))
  with check (current_user_role() in ('admin','gestor'));

-- CERTIFICAÇÕES / MÉDICO / FORMAÇÃO: dono vê o seu, admin/gestor vê tudo
create policy "certifications_select" on certifications for select
  using (profile_id = auth.uid() or current_user_role() in ('admin','gestor'));
create policy "certifications_write" on certifications for all
  using (profile_id = auth.uid() or current_user_role() in ('admin','gestor'))
  with check (profile_id = auth.uid() or current_user_role() in ('admin','gestor'));

create policy "medical_select" on medical_certificates for select
  using (profile_id = auth.uid() or current_user_role() in ('admin','gestor'));
create policy "medical_write" on medical_certificates for all
  using (profile_id = auth.uid() or current_user_role() in ('admin','gestor'))
  with check (profile_id = auth.uid() or current_user_role() in ('admin','gestor'));

create policy "trainings_select" on trainings for select
  using (profile_id = auth.uid() or current_user_role() in ('admin','gestor'));
create policy "trainings_write" on trainings for all
  using (profile_id = auth.uid() or current_user_role() in ('admin','gestor'))
  with check (profile_id = auth.uid() or current_user_role() in ('admin','gestor'));

-- SESSÕES: dono ou participante vê a sua; admin/gestor vê todas
create policy "sessions_select" on service_sessions for select
  using (
    created_by = auth.uid()
    or current_user_role() in ('admin','gestor')
    or exists (select 1 from session_participants sp where sp.session_id = id and sp.profile_id = auth.uid())
  );
create policy "sessions_insert" on service_sessions for insert
  with check (created_by = auth.uid());
create policy "sessions_update" on service_sessions for update
  using (created_by = auth.uid() or current_user_role() in ('admin','gestor'));

create policy "session_participants_select" on session_participants for select
  using (auth.role() = 'authenticated');
create policy "session_participants_write" on session_participants for all
  using (
    exists (select 1 from service_sessions s where s.id = session_id and (s.created_by = auth.uid() or current_user_role() in ('admin','gestor')))
  );

create policy "session_assets_select" on session_assets for select using (auth.role() = 'authenticated');
create policy "session_assets_write" on session_assets for all
  using (
    exists (select 1 from service_sessions s where s.id = session_id and (s.created_by = auth.uid() or current_user_role() in ('admin','gestor')))
  );

create policy "session_photos_select" on session_photos for select
  using (
    exists (select 1 from service_sessions s where s.id = session_id and (
      s.created_by = auth.uid() or current_user_role() in ('admin','gestor')
      or exists (select 1 from session_participants sp where sp.session_id = s.id and sp.profile_id = auth.uid())
    ))
  );
create policy "session_photos_insert" on session_photos for insert
  with check (uploaded_by = auth.uid());

-- MISSÕES: piloto vê as suas, admin/gestor vê todas
create policy "missions_select" on missions for select
  using (pilot_id = auth.uid() or current_user_role() in ('admin','gestor'));
create policy "missions_write" on missions for all
  using (pilot_id = auth.uid() or current_user_role() in ('admin','gestor'))
  with check (pilot_id = auth.uid() or current_user_role() in ('admin','gestor'));

-- INCIDENTES: reporter vê os seus, admin/gestor vê todos
create policy "incidents_select" on incidents for select
  using (reported_by = auth.uid() or current_user_role() in ('admin','gestor'));
create policy "incidents_write" on incidents for all
  using (reported_by = auth.uid() or current_user_role() in ('admin','gestor'))
  with check (reported_by = auth.uid() or current_user_role() in ('admin','gestor'));

create policy "incident_photos_select" on incident_photos for select
  using (
    exists (select 1 from incidents i where i.id = incident_id and (i.reported_by = auth.uid() or current_user_role() in ('admin','gestor')))
  );
create policy "incident_photos_insert" on incident_photos for insert
  with check (
    exists (select 1 from incidents i where i.id = incident_id and i.reported_by = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKETS (correr no dashboard Supabase ou via API)
-- ============================================================
-- bucket "documents"  -> certificações, médico, formação, manutenção (privado)
-- bucket "photos"     -> fotos de sessão e incidentes (privado)
-- bucket "logs"       -> ficheiros .DAT/.txt de voo (privado)
