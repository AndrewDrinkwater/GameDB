--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_CampaignEntities_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_CampaignEntities_visibility" AS ENUM (
    'visible',
    'hidden',
    'partial'
);


ALTER TYPE public."enum_CampaignEntities_visibility" OWNER TO postgres;

--
-- Name: enum_Campaigns_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Campaigns_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE public."enum_Campaigns_status" OWNER TO postgres;

--
-- Name: enum_Entities_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Entities_type" AS ENUM (
    'npc',
    'location',
    'organisation',
    'item',
    'other'
);


ALTER TYPE public."enum_Entities_type" OWNER TO postgres;

--
-- Name: enum_Entities_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Entities_visibility" AS ENUM (
    'visible',
    'hidden',
    'partial'
);


ALTER TYPE public."enum_Entities_visibility" OWNER TO postgres;

--
-- Name: enum_UserCampaignRoles_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_UserCampaignRoles_role" AS ENUM (
    'dm',
    'player',
    'observer'
);


ALTER TYPE public."enum_UserCampaignRoles_role" OWNER TO postgres;

--
-- Name: enum_Users_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Users_role" AS ENUM (
    'system_admin',
    'dungeon_master',
    'player'
);


ALTER TYPE public."enum_Users_role" OWNER TO postgres;

--
-- Name: enum_Worlds_entity_creation_scope; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Worlds_entity_creation_scope" AS ENUM (
    'owner_dm',
    'all_players'
);


ALTER TYPE public."enum_Worlds_entity_creation_scope" OWNER TO postgres;

--
-- Name: enum_Worlds_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Worlds_status" AS ENUM (
    'active',
    'archived'
);


ALTER TYPE public."enum_Worlds_status" OWNER TO postgres;

--
-- Name: enum_bulk_update_changes_old_read_access; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_bulk_update_changes_old_read_access AS ENUM (
    'global',
    'selective',
    'hidden'
);


ALTER TYPE public.enum_bulk_update_changes_old_read_access OWNER TO postgres;

--
-- Name: enum_bulk_update_changes_old_write_access; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_bulk_update_changes_old_write_access AS ENUM (
    'global',
    'selective',
    'hidden',
    'owner_only'
);


ALTER TYPE public.enum_bulk_update_changes_old_write_access OWNER TO postgres;

--
-- Name: enum_bulk_update_runs_role_used; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_bulk_update_runs_role_used AS ENUM (
    'owner',
    'dm'
);


ALTER TYPE public.enum_bulk_update_runs_role_used OWNER TO postgres;

--
-- Name: enum_entities_read_access; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entities_read_access AS ENUM (
    'global',
    'selective',
    'hidden'
);


ALTER TYPE public.enum_entities_read_access OWNER TO postgres;

--
-- Name: enum_entities_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entities_visibility AS ENUM (
    'hidden',
    'visible',
    'partial'
);


ALTER TYPE public.enum_entities_visibility OWNER TO postgres;

--
-- Name: enum_entities_write_access; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entities_write_access AS ENUM (
    'global',
    'selective',
    'hidden',
    'owner_only'
);


ALTER TYPE public.enum_entities_write_access OWNER TO postgres;

--
-- Name: enum_entity_campaign_importance_importance; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entity_campaign_importance_importance AS ENUM (
    'critical',
    'important',
    'medium'
);


ALTER TYPE public.enum_entity_campaign_importance_importance OWNER TO postgres;

--
-- Name: enum_entity_notes_share_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entity_notes_share_type AS ENUM (
    'private',
    'companions',
    'dm',
    'party'
);


ALTER TYPE public.enum_entity_notes_share_type OWNER TO postgres;

--
-- Name: enum_entity_relationship_type_entity_types_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entity_relationship_type_entity_types_role AS ENUM (
    'from',
    'to'
);


ALTER TYPE public.enum_entity_relationship_type_entity_types_role OWNER TO postgres;

--
-- Name: enum_entity_type_fields_data_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_entity_type_fields_data_type AS ENUM (
    'string',
    'number',
    'boolean',
    'text',
    'date',
    'enum',
    'reference'
);


ALTER TYPE public.enum_entity_type_fields_data_type OWNER TO postgres;

--
-- Name: enum_requests_priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_requests_priority AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.enum_requests_priority OWNER TO postgres;

--
-- Name: enum_requests_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_requests_status AS ENUM (
    'open',
    'in_progress',
    'testing',
    'resolved',
    'closed',
    'backlog'
);


ALTER TYPE public.enum_requests_status OWNER TO postgres;

--
-- Name: enum_requests_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_requests_type AS ENUM (
    'bug',
    'feature'
);


ALTER TYPE public.enum_requests_type OWNER TO postgres;

--
-- Name: enum_user_campaign_roles_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_user_campaign_roles_role AS ENUM (
    'dm',
    'player',
    'observer'
);


ALTER TYPE public.enum_user_campaign_roles_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Campaigns" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    world_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status public."enum_Campaigns_status" DEFAULT 'draft'::public."enum_Campaigns_status",
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    created_by uuid
);


ALTER TABLE public."Campaigns" OWNER TO postgres;

--
-- Name: Characters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Characters" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    race character varying(255),
    class character varying(255),
    level integer DEFAULT 1,
    alignment character varying(255),
    notes text,
    is_active boolean DEFAULT true,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."Characters" OWNER TO postgres;

--
-- Name: UserCampaignRoles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserCampaignRoles" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    role public."enum_UserCampaignRoles_role" DEFAULT 'player'::public."enum_UserCampaignRoles_role" NOT NULL,
    "createdAt" timestamp with time zone
);


ALTER TABLE public."UserCampaignRoles" OWNER TO postgres;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    id uuid NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'user'::character varying,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    email character varying(255)
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- Name: Worlds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Worlds" (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    system character varying(255),
    status public."enum_Worlds_status" DEFAULT 'active'::public."enum_Worlds_status" NOT NULL,
    entity_creation_scope public."enum_Worlds_entity_creation_scope" DEFAULT 'owner_dm'::public."enum_Worlds_entity_creation_scope" NOT NULL
);


ALTER TABLE public."Worlds" OWNER TO postgres;

--
-- Name: COLUMN "Worlds".system; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."Worlds".system IS 'Game system or ruleset (e.g., D&D 5e, Pathfinder)';


--
-- Name: bulk_update_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bulk_update_changes (
    id uuid NOT NULL,
    run_id uuid NOT NULL,
    entity_id uuid NOT NULL,
    old_read_access public.enum_bulk_update_changes_old_read_access NOT NULL,
    old_write_access public.enum_bulk_update_changes_old_write_access NOT NULL,
    old_read_campaign_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    old_read_user_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    old_read_character_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    old_write_campaign_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    old_write_user_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.bulk_update_changes OWNER TO postgres;

--
-- Name: bulk_update_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bulk_update_runs (
    id uuid NOT NULL,
    world_id uuid NOT NULL,
    user_id uuid NOT NULL,
    campaign_context_id uuid,
    description character varying(500),
    entity_count integer DEFAULT 0 NOT NULL,
    reverted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    role_used public.enum_bulk_update_runs_role_used DEFAULT 'owner'::public.enum_bulk_update_runs_role_used NOT NULL
);


ALTER TABLE public.bulk_update_runs OWNER TO postgres;

--
-- Name: entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    world_id uuid NOT NULL,
    created_by uuid NOT NULL,
    entity_type_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    visibility public.enum_entities_visibility DEFAULT 'visible'::public.enum_entities_visibility NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    read_access public.enum_entities_read_access DEFAULT 'global'::public.enum_entities_read_access NOT NULL,
    write_access public.enum_entities_write_access DEFAULT 'global'::public.enum_entities_write_access NOT NULL,
    read_campaign_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    read_user_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    write_campaign_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    write_user_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    image_data text,
    image_mime_type character varying(50),
    read_character_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL
);


ALTER TABLE public.entities OWNER TO postgres;

--
-- Name: entity_campaign_importance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_campaign_importance (
    id uuid NOT NULL,
    entity_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    importance public.enum_entity_campaign_importance_importance,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_campaign_importance OWNER TO postgres;

--
-- Name: entity_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_collections (
    id uuid NOT NULL,
    world_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    shared boolean DEFAULT false NOT NULL,
    selection_mode text DEFAULT 'manual'::text NOT NULL,
    criteria jsonb,
    entity_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_collections OWNER TO postgres;

--
-- Name: entity_follows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_follows (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    entity_id uuid NOT NULL,
    campaign_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_follows OWNER TO postgres;

--
-- Name: entity_list_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_list_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type_id uuid NOT NULL,
    user_id uuid,
    columns jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_list_preferences OWNER TO postgres;

--
-- Name: entity_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    character_id uuid,
    created_by uuid NOT NULL,
    share_type public.enum_entity_notes_share_type DEFAULT 'private'::public.enum_entity_notes_share_type NOT NULL,
    content text NOT NULL,
    mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_notes OWNER TO postgres;

--
-- Name: entity_relationship_type_entity_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_relationship_type_entity_types (
    id uuid NOT NULL,
    relationship_type_id uuid NOT NULL,
    entity_type_id uuid NOT NULL,
    role public.enum_entity_relationship_type_entity_types_role NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_relationship_type_entity_types OWNER TO postgres;

--
-- Name: entity_relationship_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_relationship_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    world_id uuid NOT NULL,
    from_name character varying(150) NOT NULL,
    to_name character varying(150) NOT NULL
);


ALTER TABLE public.entity_relationship_types OWNER TO postgres;

--
-- Name: entity_relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_relationships (
    id uuid NOT NULL,
    from_entity uuid NOT NULL,
    to_entity uuid NOT NULL,
    bidirectional boolean DEFAULT false NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    relationship_type_id uuid NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_relationships OWNER TO postgres;

--
-- Name: entity_secret_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_secret_permissions (
    id uuid NOT NULL,
    secret_id uuid NOT NULL,
    user_id uuid,
    can_view boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    campaign_id uuid
);


ALTER TABLE public.entity_secret_permissions OWNER TO postgres;

--
-- Name: entity_secrets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(100),
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.entity_secrets OWNER TO postgres;

--
-- Name: entity_type_field_layouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_type_field_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type_id uuid NOT NULL,
    entity_type_field_id uuid NOT NULL,
    section_order integer DEFAULT 0 NOT NULL,
    column_order integer DEFAULT 0 NOT NULL,
    field_order integer DEFAULT 0 NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.entity_type_field_layouts OWNER TO postgres;

--
-- Name: entity_type_field_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_type_field_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type_id uuid NOT NULL,
    name character varying(150),
    match_mode character varying(20) DEFAULT 'all'::character varying NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.entity_type_field_rules OWNER TO postgres;

--
-- Name: entity_type_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_type_fields (
    id uuid NOT NULL,
    entity_type_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(100),
    data_type public.enum_entity_type_fields_data_type NOT NULL,
    options jsonb DEFAULT '{}'::jsonb,
    required boolean DEFAULT false,
    default_value text,
    sort_order integer DEFAULT 0,
    reference_type_id uuid,
    reference_filter jsonb DEFAULT '{}'::jsonb NOT NULL,
    visible_by_default boolean DEFAULT true NOT NULL
);


ALTER TABLE public.entity_type_fields OWNER TO postgres;

--
-- Name: entity_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    world_id uuid NOT NULL
);


ALTER TABLE public.entity_types OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(100) NOT NULL,
    campaign_id uuid,
    read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    action_url character varying(500),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: request_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.request_notes (
    id uuid NOT NULL,
    request_id uuid NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.request_notes OWNER TO postgres;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requests (
    id uuid NOT NULL,
    type public.enum_requests_type NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    status public.enum_requests_status DEFAULT 'open'::public.enum_requests_status NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    priority public.enum_requests_priority,
    is_in_backlog boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tester_id uuid
);


ALTER TABLE public.requests OWNER TO postgres;

--
-- Name: session_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_notes (
    id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    session_date date NOT NULL,
    session_title character varying(255) DEFAULT 'Session note'::character varying NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    content_html text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.session_notes OWNER TO postgres;

--
-- Name: uploaded_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uploaded_files (
    id uuid NOT NULL,
    entity_id uuid,
    user_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    mime_type character varying(255) NOT NULL,
    size_bytes integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.uploaded_files OWNER TO postgres;

--
-- Name: user_campaign_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_campaign_roles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    role public.enum_user_campaign_roles_role NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.user_campaign_roles OWNER TO postgres;

--
-- Data for Name: Campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Campaigns" (id, world_id, name, description, status, "createdAt", "updatedAt", created_by) FROM stdin;
14883473-40f7-4667-b417-b3946b2d2fc1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	Masks of Cloverfell	\N	draft	2025-11-09 12:31:59.482+00	2025-11-09 12:31:59.482+00	a3bc8328-8169-4bfa-8177-dd2e088316d5
65019483-f077-4a93-83b6-b8c97864afd1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	Shadows of Varathia	\N	active	2025-11-09 12:26:18.946+00	2025-11-09 14:23:27.86+00	a3bc8328-8169-4bfa-8177-dd2e088316d5
\.


--
-- Data for Name: Characters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Characters" (id, user_id, campaign_id, name, race, class, level, alignment, notes, is_active, "createdAt", "updatedAt") FROM stdin;
dbe0a355-d794-4c1e-86d5-143cb224a970	ecf1ae57-7d88-4763-ad45-23a239523246	65019483-f077-4a93-83b6-b8c97864afd1	Hans Freeguard	Human	Paladin, Bard	10	\N	\N	t	2025-11-09 14:24:29.106+00	2025-11-09 14:24:29.106+00
667e73d1-7fe2-4422-bcf3-cb323b19babc	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	65019483-f077-4a93-83b6-b8c97864afd1	Zite	Human	Warlock	10	\N	\N	t	2025-11-09 15:56:48.577+00	2025-11-09 15:56:48.577+00
c6da3d0c-6593-4141-9fe4-843ecaa14ff2	704d70ff-e300-4126-b526-d034acaedbd7	65019483-f077-4a93-83b6-b8c97864afd1	Ashe	Shifter	Druid	1	\N	\N	t	2025-11-09 15:57:49.401+00	2025-11-09 15:57:49.401+00
3b8b44cd-0135-49af-9bc0-7b5d96d63ebc	b83c50f2-cedc-497a-92bf-e638d8fce720	14883473-40f7-4667-b417-b3946b2d2fc1	Xanxaphir	Half-Drow	Bard	3	\N	\N	t	2025-11-09 18:50:45.85+00	2025-11-09 18:50:45.85+00
1eaa9392-6db9-481e-99f5-54cb34b9e468	ecf1ae57-7d88-4763-ad45-23a239523246	14883473-40f7-4667-b417-b3946b2d2fc1	Daxen Bane	Human	Gunslinger	3	\N	\N	t	2025-11-09 19:22:08.183+00	2025-11-09 19:22:08.183+00
767e5a34-fd91-4fea-a6a5-cadb1345f5b5	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	14883473-40f7-4667-b417-b3946b2d2fc1	Elliot Hightower	Human	Fighter	3	\N	\N	t	2025-11-16 09:18:05.06+00	2025-11-16 09:18:05.06+00
2cda6f4d-e64e-4640-b450-1189ef2d523f	f04f3ae8-4d58-4c87-a4d5-c747cd379ff7	14883473-40f7-4667-b417-b3946b2d2fc1	Nicholas 	Human	Ranger	3	\N	\N	t	2025-11-17 11:00:18.531+00	2025-11-17 11:00:18.531+00
39973cc4-ad24-4d16-bfab-5d65a0887d1d	704d70ff-e300-4126-b526-d034acaedbd7	14883473-40f7-4667-b417-b3946b2d2fc1	Sylbella Firenyl	Elf	Cleric	1	\N	\N	t	2025-11-17 11:01:16.889+00	2025-11-17 11:01:16.889+00
\.


--
-- Data for Name: UserCampaignRoles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserCampaignRoles" (id, user_id, campaign_id, role, "createdAt") FROM stdin;
9383e4d0-5ead-4a84-be78-a050b4076428	a3bc8328-8169-4bfa-8177-dd2e088316d5	65019483-f077-4a93-83b6-b8c97864afd1	dm	2025-11-09 12:26:18.948+00
74425884-c662-4a84-b36f-067e5291188d	a3bc8328-8169-4bfa-8177-dd2e088316d5	14883473-40f7-4667-b417-b3946b2d2fc1	dm	2025-11-09 12:31:59.485+00
5e8f4be3-0937-4a18-aa30-09eb87eed1a1	ecf1ae57-7d88-4763-ad45-23a239523246	65019483-f077-4a93-83b6-b8c97864afd1	player	2025-11-09 14:23:46.225+00
00e06094-7acf-449e-b949-c43098294ec9	704d70ff-e300-4126-b526-d034acaedbd7	65019483-f077-4a93-83b6-b8c97864afd1	player	2025-11-09 14:23:46.236+00
2caab4d2-8c5f-4611-99bc-1dfc620de0a4	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	65019483-f077-4a93-83b6-b8c97864afd1	player	2025-11-09 14:23:46.238+00
e57f43f5-2653-4cf5-9349-6e4f9557c84a	ecabb309-9335-4b32-8e3b-42abd3f328e1	65019483-f077-4a93-83b6-b8c97864afd1	player	2025-11-09 14:23:46.24+00
3e48eece-8354-4466-b050-9e1c62793607	b83c50f2-cedc-497a-92bf-e638d8fce720	14883473-40f7-4667-b417-b3946b2d2fc1	player	2025-11-09 18:50:11.491+00
e2aec3ec-85e7-4363-92f5-f89d5aa2b738	f04f3ae8-4d58-4c87-a4d5-c747cd379ff7	14883473-40f7-4667-b417-b3946b2d2fc1	player	2025-11-09 18:50:11.499+00
47bd6a8b-52fe-4bf3-a724-b28cc5b30479	ecf1ae57-7d88-4763-ad45-23a239523246	14883473-40f7-4667-b417-b3946b2d2fc1	player	2025-11-09 18:50:11.501+00
74ee66a2-32c0-4fd2-8584-50abdfa947c3	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	14883473-40f7-4667-b417-b3946b2d2fc1	player	2025-11-09 18:50:11.503+00
a65b4626-c633-43e2-9e98-dcaa753b7200	704d70ff-e300-4126-b526-d034acaedbd7	14883473-40f7-4667-b417-b3946b2d2fc1	player	2025-11-09 18:50:11.504+00
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (id, username, password_hash, role, "createdAt", "updatedAt", email) FROM stdin;
67fefc75-55f8-4c72-b790-332b7912c506	admin	$2b$10$AWMlTjCEikDkXj95oU8EguoLYf9PXSXs0iSl2wzCAbmXBHqLDJ82.	system_admin	2025-10-08 15:18:58.588+01	2025-10-09 11:59:38.134+01	admin@example.com
bbb230ba-a90c-46be-8102-8ff66d3bac72	Andrew Drinkwater	$2b$10$llnO3D69jHCh76BDPT1FsOx9FhqTkECHaMxunLK7DVLP2qt93raqa	system_admin	2025-10-10 10:37:04.173+01	2025-10-10 10:37:04.173+01	andrewdrinkwater@live.co.uk
b898b6e9-2920-4334-8b48-0fde3ec9c4fe	DanDav	$2b$10$GgsE5Lvkl7w32Z0rxZu6q.RkckYEhIG3lf6ulIUgBQEoMXXvx5Fna	user	2025-10-10 15:04:59.486+01	2025-10-10 15:04:59.486+01	dd@example.com
704d70ff-e300-4126-b526-d034acaedbd7	ErikaD	$2b$10$cdc7oLdJ6QjvohrHN9B0d.29JJ8S8sYHWrpOodHe7HjRrcKYwrXzC	user	2025-10-09 11:59:21.706+01	2025-10-10 15:13:24.014+01	test@example.com
ecabb309-9335-4b32-8e3b-42abd3f328e1	Calum	$2b$10$3N/C5pXyht2CcTHfH8dGmuQxgCIIrihZ53aqs1lcBJ.tl9UE3vqN2	user	2025-10-10 15:15:08.658+01	2025-10-10 15:15:08.658+01	cal@example.com
f04f3ae8-4d58-4c87-a4d5-c747cd379ff7	BenL	$2b$10$9NJDoZie/hKCR9xwJxbXe.5iIyEGCOVftcemXAG8xYyPM9ZgTe17m	user	2025-10-10 15:15:27.688+01	2025-10-10 15:15:27.688+01	BL@example.com
b83c50f2-cedc-497a-92bf-e638d8fce720	AndyP	$2b$10$bObYdiueU8R0V49/bx1QhekSOFXzsPrx8RvfhMrU6hd2dxvL98izK	user	2025-10-10 15:17:56.343+01	2025-10-10 15:17:56.343+01	AP@excample.com
33eaa9c9-2bbf-4e3a-acf5-cddc4b9b26e9	User1	$2b$10$iHv4OBDkBW8cPmsDnydT9ezD5UVAMftDRUlU8yeQf5VU4vIuSdF12	user	2025-11-17 10:20:43.424+00	2025-11-17 10:20:43.424+00	user@email.com
ecf1ae57-7d88-4763-ad45-23a239523246	AndrewD	$2b$10$yGoSipk.SQjYKlHp0OH.vOtpA2jNaZcJwchZfVPIbLl8bqUlhwTCy	user	2025-10-09 14:41:49.145+01	2025-11-18 18:23:41.554+00	tester2@example.com
a3bc8328-8169-4bfa-8177-dd2e088316d5	Clockwise	$2b$10$iifNjeKwih6.q0eBx2jhDeVCq/kw4rYytcnLUgYy3hRDc27Z1ClOC	user	2025-10-10 15:16:15.855+01	2025-11-19 18:31:02.352+00	DD@example.com
\.


--
-- Data for Name: Worlds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Worlds" (id, name, description, created_by, "createdAt", "updatedAt", system, status, entity_creation_scope) FROM stdin;
1a6a672d-af24-4ff4-a91d-39252db38961	Mothership World	\N	a3bc8328-8169-4bfa-8177-dd2e088316d5	2025-11-09 18:09:07.262+00	2025-11-09 18:09:07.262+00	Mothership	active	owner_dm
f3b4ce50-86fc-45b4-b78f-9991acec86c6	Salfordia	\N	a3bc8328-8169-4bfa-8177-dd2e088316d5	2025-11-09 12:24:15.454+00	2025-11-15 15:41:25.779+00	\N	active	all_players
4cad9c1d-3225-48bc-8b6f-a48331f4e65a	Andrew's FF	\N	ecf1ae57-7d88-4763-ad45-23a239523246	2025-11-17 09:54:09.408+00	2025-11-17 09:54:09.408+00	\N	active	owner_dm
\.


--
-- Data for Name: bulk_update_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bulk_update_changes (id, run_id, entity_id, old_read_access, old_write_access, old_read_campaign_ids, old_read_user_ids, old_read_character_ids, old_write_campaign_ids, old_write_user_ids, created_at, updated_at) FROM stdin;
cbc69c84-83b4-4ae5-ba53-58316fd1704f	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	e4636c86-6754-4fd8-ba36-188b9fda69db	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.063+00	2025-11-14 16:26:37.063+00
533e875c-d802-4ea2-90aa-e1030b6df07d	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	adc9b5cd-b294-4111-9e3e-bd8f35922dae	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.07+00	2025-11-14 16:26:37.07+00
ddaeb47e-1c6b-49c8-b1da-1500c7d05be9	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	2d7fe49f-9553-4ffb-a641-d9dc1294667b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.072+00	2025-11-14 16:26:37.072+00
bdb7cb29-03f7-4eda-9de5-246ab6ce51d5	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	f9e9cef4-59f6-4173-9fca-f30b2c9520a9	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.074+00	2025-11-14 16:26:37.074+00
7f50872d-7613-4aa4-8100-b9fcd146a7f1	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	3cbe7034-3602-45c2-a160-6eb46ef1c212	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.075+00	2025-11-14 16:26:37.075+00
5a3b7527-1ca2-4b4e-942f-fab5710f51fa	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	7c1da6c8-7062-459e-8a65-8038941ead88	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.077+00	2025-11-14 16:26:37.077+00
b12f3e83-3278-439a-b4de-13280f987492	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	3ac1bdbe-bcdd-42fd-bedf-eeeb634b368b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.078+00	2025-11-14 16:26:37.078+00
2fc810d9-23bb-4792-a0b1-80a87357a49e	a2f2bb83-8755-4abb-b52c-9ad224dce9cd	ee2ec5e9-021b-412b-9c81-1d274c786f97	global	global	{}	{}	{}	{}	{}	2025-11-14 16:26:37.079+00	2025-11-14 16:26:37.079+00
f73a792a-1c08-4570-ac3c-518f6cfba8fb	d056b676-feef-43fb-b513-3be63a18f1ef	e4636c86-6754-4fd8-ba36-188b9fda69db	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.086+00	2025-11-14 16:26:57.086+00
f2280e44-272a-47cc-9a25-3936c57dc411	d056b676-feef-43fb-b513-3be63a18f1ef	adc9b5cd-b294-4111-9e3e-bd8f35922dae	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.089+00	2025-11-14 16:26:57.089+00
b56a44ce-6bfc-448e-b15c-2a8eb02a3420	d056b676-feef-43fb-b513-3be63a18f1ef	2d7fe49f-9553-4ffb-a641-d9dc1294667b	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.09+00	2025-11-14 16:26:57.09+00
721e66e0-3e92-4f95-8175-257d6768bca8	d056b676-feef-43fb-b513-3be63a18f1ef	f9e9cef4-59f6-4173-9fca-f30b2c9520a9	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.091+00	2025-11-14 16:26:57.091+00
1931dc9d-b2d3-40a4-ad20-89a8fc1f1314	d056b676-feef-43fb-b513-3be63a18f1ef	3cbe7034-3602-45c2-a160-6eb46ef1c212	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.092+00	2025-11-14 16:26:57.092+00
cb33dae6-6636-46ac-a2ca-1dc1c68f782e	d056b676-feef-43fb-b513-3be63a18f1ef	7c1da6c8-7062-459e-8a65-8038941ead88	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.093+00	2025-11-14 16:26:57.093+00
c2a06939-6335-423d-9f92-6be99f9dd4ba	d056b676-feef-43fb-b513-3be63a18f1ef	3ac1bdbe-bcdd-42fd-bedf-eeeb634b368b	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.094+00	2025-11-14 16:26:57.094+00
0b628695-51f4-4610-8b3b-867758075b98	d056b676-feef-43fb-b513-3be63a18f1ef	ee2ec5e9-021b-412b-9c81-1d274c786f97	selective	owner_only	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:26:57.094+00	2025-11-14 16:26:57.094+00
86519df8-f20c-4835-a04e-cdadc88aa2c4	5112e5ea-6468-44bc-b15f-5058fe1b81ac	56286363-0228-4d35-aa7b-9f1ebf2d94e0	global	selective	{}	{}	{}	{}	{}	2025-11-14 16:32:32.48+00	2025-11-14 16:32:32.48+00
716ae36e-63b0-406b-abb7-979d4929aec2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e6fed39e-c171-4efe-b32d-9e5067165b57	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.482+00	2025-11-14 16:32:32.482+00
73ff77e4-97ff-4c04-9d05-f2bb045b37c6	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0798a59b-ca1c-4879-887c-7f17566a8251	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.483+00	2025-11-14 16:32:32.483+00
5409c22f-ad46-4f9e-9ad8-3eb27f838f37	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7312c336-6135-4e34-b378-53cf150d8c43	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.484+00	2025-11-14 16:32:32.484+00
6920c94d-43b8-4ac2-8133-1187ec99b27d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	236d1e4b-5aaa-42e3-af9b-82039003b208	selective	hidden	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.485+00	2025-11-14 16:32:32.485+00
8398989b-97b9-41fa-b109-b5550bf1015a	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.486+00	2025-11-14 16:32:32.486+00
79737be1-c3e8-43c6-9d74-16eea017d324	5112e5ea-6468-44bc-b15f-5058fe1b81ac	5434021e-ebef-4cd4-831f-81822c496b60	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.487+00	2025-11-14 16:32:32.487+00
1a431026-5780-41ef-ad73-b92ce3753fb3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4bbbe907-2650-44dd-b0b3-a3edf106d036	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.488+00	2025-11-14 16:32:32.488+00
e1a68f82-b03e-46cd-bdb9-bea52c29730e	5112e5ea-6468-44bc-b15f-5058fe1b81ac	69e8e3fa-a8fb-4130-9219-1bcac1bf3e9e	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.488+00	2025-11-14 16:32:32.488+00
5926e734-7901-457c-b4bb-1a55b6b635d5	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7df2a55b-dba9-4e55-80a1-7994af54dd71	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	2025-11-14 16:32:32.489+00	2025-11-14 16:32:32.489+00
cdaed84d-ba7a-46fe-95cc-0a7ebcd05a19	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1c373c21-6f9e-4422-8673-d9c72d797e9e	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.49+00	2025-11-14 16:32:32.49+00
6f2a0199-ce9c-4d16-9bd5-5cf659c391f6	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2c7400fc-4b27-4550-bb6e-6764c77f6f28	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.49+00	2025-11-14 16:32:32.49+00
59a66be6-f719-4e0d-a6b7-291b55e77569	5112e5ea-6468-44bc-b15f-5058fe1b81ac	a202e9a8-6219-4a15-b0ee-ed7589264032	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.491+00	2025-11-14 16:32:32.491+00
65835389-41ea-4e3c-950d-43e3d932a32c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	bc6db569-fecb-4cd9-a728-839d939b4291	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.491+00	2025-11-14 16:32:32.491+00
f1177719-a55b-4099-acde-ee6ae766c45c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d368b6b5-33f4-48c5-9bc2-d866fb588314	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.492+00	2025-11-14 16:32:32.492+00
58c1b51e-9d1c-48a8-9ac2-1c76fe00e1be	5112e5ea-6468-44bc-b15f-5058fe1b81ac	738b7e9a-a207-4e18-9a70-24707df5e520	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.492+00	2025-11-14 16:32:32.492+00
e9d8ca66-b2e6-4d37-8a6a-05bf4b368391	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e619d9f1-3d80-451d-9901-7b8950f0f1c8	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.493+00	2025-11-14 16:32:32.493+00
b41d57d5-b3a0-412b-8f54-4c5bdd74ce68	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3d3b0b0e-0501-4b96-9c37-fb769ed2fb52	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.493+00	2025-11-14 16:32:32.493+00
e5bb96da-1730-4d6f-840f-2009e311260c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	34290b5a-758e-4537-a3bf-d6209dd94104	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.493+00	2025-11-14 16:32:32.493+00
a8658a54-d7a0-4597-b762-e131d9ef9733	5112e5ea-6468-44bc-b15f-5058fe1b81ac	44429f9d-bef8-4273-81a2-ebccb1d73073	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.494+00	2025-11-14 16:32:32.494+00
0ca0d0dc-a715-403b-9c33-0089d820936b	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2c3f46cb-c7a5-4df0-802a-194338718f8a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.495+00	2025-11-14 16:32:32.495+00
23d334ff-9b23-4515-97b7-5152d31eb27d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3e4fb933-a6a2-4bc0-8c9c-b2bd858b0912	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.496+00	2025-11-14 16:32:32.496+00
faaa6270-53be-40c1-9652-3bddf41e3e08	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9f2b0263-29a1-4831-bac6-536f6f640d04	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.497+00	2025-11-14 16:32:32.497+00
9ca62612-6b1a-4ae9-8d3c-b27216c0e275	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1397f7b3-421a-425d-b2fc-9d174621726c	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.497+00	2025-11-14 16:32:32.497+00
a487087e-b952-4de6-9032-bd51ffbef9af	5112e5ea-6468-44bc-b15f-5058fe1b81ac	12db5a29-3bb2-4e5c-912a-bd462ea87b96	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.498+00	2025-11-14 16:32:32.498+00
81fa44c3-1e15-456e-92fb-ebe5665ab412	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f2b904c9-63c6-4a46-9ea1-317bea6df5a8	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.499+00	2025-11-14 16:32:32.499+00
02a66655-03eb-41e6-bfcd-73a064f9b099	5112e5ea-6468-44bc-b15f-5058fe1b81ac	88e6724d-a00b-4383-8eb5-1d15590cbb5d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.499+00	2025-11-14 16:32:32.499+00
f0d1e254-255b-4209-b79f-9623faef9412	5112e5ea-6468-44bc-b15f-5058fe1b81ac	06b1173c-3c06-43ab-987c-fe8a317ba870	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.501+00	2025-11-14 16:32:32.501+00
922527af-9527-45e6-ac9d-44bd1848bcd0	5112e5ea-6468-44bc-b15f-5058fe1b81ac	23a20abc-f28f-4d92-94ca-0db47e1a767b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.501+00	2025-11-14 16:32:32.501+00
9a892323-6b4f-40a9-9e4d-0ed68ff4666d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	6dce192b-de28-4e37-9208-1744ee6c5ab5	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.502+00	2025-11-14 16:32:32.502+00
7e565b88-b193-4c03-a62f-218906f736ce	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f1bb9d8c-7d1b-41d6-b111-7d8a0a213fef	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.503+00	2025-11-14 16:32:32.503+00
40e86214-0f9a-4fdb-a654-31a294dece66	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1670a443-7069-45ea-a6a1-7a408772e8fe	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.504+00	2025-11-14 16:32:32.504+00
f4c4724f-1b83-48d5-ab5d-b1f34ce863ae	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9effbec1-8e34-456c-b5e5-c52c5703b87b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.505+00	2025-11-14 16:32:32.505+00
3a5824e1-fd4d-4a27-8806-45a5482582d6	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9e2f6e0d-ec37-41e6-93de-ce94f311126f	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.506+00	2025-11-14 16:32:32.506+00
abf2c0cc-8f00-4c7c-949e-03330e003844	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d8271f29-d716-4b01-a1d5-129266731fef	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.507+00	2025-11-14 16:32:32.507+00
92ce04dc-b187-4d60-a41b-26283553172e	5112e5ea-6468-44bc-b15f-5058fe1b81ac	304ef7ac-19f0-426f-bec1-e09b53442dd6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.507+00	2025-11-14 16:32:32.507+00
389053a2-2962-41a7-acd8-a27b6283567e	5112e5ea-6468-44bc-b15f-5058fe1b81ac	55ad31ca-0dc1-4f41-80c7-4266743bf541	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.508+00	2025-11-14 16:32:32.508+00
0aa1dcac-71b8-4fad-874d-671f0cc41fdf	5112e5ea-6468-44bc-b15f-5058fe1b81ac	c30260a7-0b9b-4497-9f08-4cd0ac920b8b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.509+00	2025-11-14 16:32:32.509+00
faaf3f84-fb73-4889-9840-0d669d8779c3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	78ae5ab1-2a74-4c70-a74a-60a2f0caa792	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.51+00	2025-11-14 16:32:32.51+00
fef3aa29-4d50-44d6-bc0b-9c87bcde4b94	5112e5ea-6468-44bc-b15f-5058fe1b81ac	31f92c66-9eaa-4366-8ea2-df9223ddc97c	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.511+00	2025-11-14 16:32:32.511+00
e8a9595f-3896-4f5a-8e1f-514795e8de18	5112e5ea-6468-44bc-b15f-5058fe1b81ac	6b8ad924-7f11-41e9-bbc6-43b0e0f539c6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.512+00	2025-11-14 16:32:32.512+00
6d140985-d941-4c62-b036-e6c748bc8efd	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2e6fac12-84c9-4586-88a9-0fc59baaee5c	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.512+00	2025-11-14 16:32:32.512+00
aaefc1f7-19aa-4154-8db7-0e799e9599ce	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d9bc3873-6245-42fd-8158-28a770c32451	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.513+00	2025-11-14 16:32:32.513+00
9bab73d4-f87c-4f50-b193-64b6c19a48ea	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d65d825e-0477-4a56-a8bf-8601003b80ea	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.514+00	2025-11-14 16:32:32.514+00
c127a4ab-a35c-4e5e-a151-b296b9c29d9c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9e599d67-8892-4021-8f20-2fbf36a3a41f	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.514+00	2025-11-14 16:32:32.514+00
b236e96a-4235-4e15-80ac-a7c871818cbd	5112e5ea-6468-44bc-b15f-5058fe1b81ac	584724de-1393-495c-b3e5-346f95d6172a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.515+00	2025-11-14 16:32:32.515+00
d136528c-5890-4e26-81b2-1d0d3476036e	5112e5ea-6468-44bc-b15f-5058fe1b81ac	affe56db-904d-4fac-8765-4d4419621dd6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.516+00	2025-11-14 16:32:32.516+00
8e06a506-5241-46a8-a4d6-c9e859b9970d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7edcc7ad-f94e-4ff1-b50f-d709898ed8aa	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.516+00	2025-11-14 16:32:32.516+00
897b0525-8283-4166-8a55-41d384151f6f	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3319b9ca-8323-4307-848a-2d939e3e58c2	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.517+00	2025-11-14 16:32:32.517+00
c9983dd1-4bfc-41c2-8a45-8dd6a508ce16	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e5ae05a4-0310-437b-9262-b5bbf97fe161	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.518+00	2025-11-14 16:32:32.518+00
2cef3aad-8edc-4e17-a0e8-a201ace42cf8	5112e5ea-6468-44bc-b15f-5058fe1b81ac	14a96733-4c9c-44bc-a94e-e72f5e28b843	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.519+00	2025-11-14 16:32:32.519+00
87998953-78e5-45a3-b982-2804a7d955a4	5112e5ea-6468-44bc-b15f-5058fe1b81ac	91978c2c-6752-443f-a5e0-63f14939d11e	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.519+00	2025-11-14 16:32:32.519+00
1eb7932b-54ec-4e98-89f2-67bf9532e945	5112e5ea-6468-44bc-b15f-5058fe1b81ac	27f81544-17d8-42cf-871c-22d1cb65c129	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.52+00	2025-11-14 16:32:32.52+00
1f4178b9-df23-485d-bb31-07abe7f33994	5112e5ea-6468-44bc-b15f-5058fe1b81ac	bfe4e1fb-77e2-426e-87c7-812eb187957d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.521+00	2025-11-14 16:32:32.521+00
cbb2c5e0-b611-4014-b7c1-2921e9f9ec25	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2f8fc49e-a21a-4a92-9191-f32229b3f1a2	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.522+00	2025-11-14 16:32:32.522+00
072bed66-3d61-4fee-a7e6-f78107d79593	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1819e56a-eb9c-48cb-a552-ff622e22d895	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.523+00	2025-11-14 16:32:32.523+00
3a660736-044d-43c4-a23c-99901809108a	5112e5ea-6468-44bc-b15f-5058fe1b81ac	01e3e6be-bb7b-4a6e-9658-d947347fe82f	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.524+00	2025-11-14 16:32:32.524+00
65081b43-9d93-4457-826e-03bef4e3ae8b	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f2dc1a44-11fe-49a8-94dc-b4f587fe67b0	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.524+00	2025-11-14 16:32:32.524+00
b560f4a2-ce4b-454a-a09b-f41b0fd63d64	5112e5ea-6468-44bc-b15f-5058fe1b81ac	bd923bf5-3071-425a-b07b-b8f2931ece1b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.525+00	2025-11-14 16:32:32.525+00
be666f3c-fb6b-4d17-9fe4-1ebeda41e29e	5112e5ea-6468-44bc-b15f-5058fe1b81ac	541db7a3-aa89-4423-979f-a542c17e6a2b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.526+00	2025-11-14 16:32:32.526+00
2c0a8517-76fc-44f8-a1ff-94eb05979ed8	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b26d6f7a-08fe-4ab6-b6a8-dc801621d816	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.527+00	2025-11-14 16:32:32.527+00
4ff697e1-1127-4c48-a588-f3299d5e0bfe	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0d7a01a9-0027-4fa6-a053-7acce2314cc2	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.527+00	2025-11-14 16:32:32.527+00
b11d256f-72cd-414a-81b8-b71b816f5ef5	5112e5ea-6468-44bc-b15f-5058fe1b81ac	a98d2a2e-12cd-4b81-94bf-90f305e40970	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.528+00	2025-11-14 16:32:32.528+00
0d7edd1e-9b9e-4860-8c64-8b4242e30f63	5112e5ea-6468-44bc-b15f-5058fe1b81ac	6872bbc6-d046-4bf6-99d7-63fd3494d6b2	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.529+00	2025-11-14 16:32:32.529+00
e64ac8ea-2a42-4f0e-9602-1ad73ad02d7f	5112e5ea-6468-44bc-b15f-5058fe1b81ac	923ed4a0-5569-49f7-8d0a-d96668424058	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.53+00	2025-11-14 16:32:32.53+00
7e89b870-8f5f-4a5a-a3e7-f3916f9a2801	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f046b94b-76ed-46c0-9427-bb89b8188879	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.53+00	2025-11-14 16:32:32.53+00
cb0a5320-7a45-46e1-8699-48d89008211d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	fa182ab9-8dcf-4e8f-9a05-d2c2748422b7	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.531+00	2025-11-14 16:32:32.531+00
5c5d26b5-bcfa-455b-b832-b8a1370f6dbd	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4a8301d2-4017-4912-95cc-7d468fb35615	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.532+00	2025-11-14 16:32:32.532+00
05716059-1829-46ae-95ba-2749f62b1f40	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4c4c3f04-2c66-4dc8-8114-9d626a8d8a69	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.533+00	2025-11-14 16:32:32.533+00
104f026d-3ba3-4440-91bc-06e1fe06cb0f	5112e5ea-6468-44bc-b15f-5058fe1b81ac	a84b95f3-4786-452d-b769-be4b37e100fe	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.533+00	2025-11-14 16:32:32.533+00
1c65b9cc-a40e-44cc-99ac-0fa3c06d522f	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b85de4c2-1ef7-4e33-b244-8abbf76d3c5a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.534+00	2025-11-14 16:32:32.534+00
59444d96-ff1b-43e6-95f7-44abe3c900e9	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4d13b7cf-2c06-4203-878f-390df41235dc	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.535+00	2025-11-14 16:32:32.535+00
51ba3f4b-96f3-42c8-9225-ba79472c00cc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	04fea315-82b7-40ff-b57b-a81eef70c279	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.536+00	2025-11-14 16:32:32.536+00
0e03ed37-2627-4765-84b9-120c235b360b	5112e5ea-6468-44bc-b15f-5058fe1b81ac	ccdda011-bc1d-47e5-9b72-b261b4448b71	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.537+00	2025-11-14 16:32:32.537+00
e9c640cc-e2e2-4737-b2b6-1d761f2bbbc7	5112e5ea-6468-44bc-b15f-5058fe1b81ac	53919d5d-f71d-4a66-81d7-ee1246861186	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.538+00	2025-11-14 16:32:32.538+00
6cf6fa3e-c4ba-4822-a18d-25e0f9d65f28	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2a57cc9c-aa58-4900-9e50-2e3c88e8a6b5	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.538+00	2025-11-14 16:32:32.538+00
bf1a19f8-8c36-489a-9e0b-f9a088221a7c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	03f28885-b20f-4748-86e6-d0c8043871e1	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.539+00	2025-11-14 16:32:32.539+00
028c48f0-4230-4886-a8cf-a6b360199be5	5112e5ea-6468-44bc-b15f-5058fe1b81ac	651433d2-afd5-4994-955d-4e956bdb1329	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.54+00	2025-11-14 16:32:32.54+00
17dfbe1c-640a-4cf3-8d44-67dec0edb4f7	5112e5ea-6468-44bc-b15f-5058fe1b81ac	180af2c3-f627-40b4-a4f0-e2b6d2a07027	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.541+00	2025-11-14 16:32:32.541+00
13fe6daf-3a71-48a7-aaf3-cdff85e8e78d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b482ff21-f67e-4e01-a99f-53e916143168	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.542+00	2025-11-14 16:32:32.542+00
d49ee537-3d56-48ff-b468-9ea4cfb3e09c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	aff2a579-6277-4cee-9975-96d8113c1e05	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.542+00	2025-11-14 16:32:32.542+00
441f7264-6a5f-4b92-89e7-d69ceb75fcfc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4a99883b-cd27-47b2-af8c-097d7b924b2a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.543+00	2025-11-14 16:32:32.543+00
4fc159ac-305c-40d3-af29-800be08673a8	5112e5ea-6468-44bc-b15f-5058fe1b81ac	497917e4-5278-4175-81a1-0f1f51ba5097	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.544+00	2025-11-14 16:32:32.544+00
548121a9-e228-45b4-881c-51f97af9462a	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9dd09cde-5db4-4bec-baa0-a8e731b51be6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.545+00	2025-11-14 16:32:32.545+00
2e2e328b-b5b3-474b-aaa0-534b7b04b7cc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	a8f64d6f-0f73-43f0-9aff-26262f9f423d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.546+00	2025-11-14 16:32:32.546+00
1e366ad3-6319-4da3-8e9d-ca9472899dbc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	bfd49d99-f5b4-4776-8513-c527b8122514	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.546+00	2025-11-14 16:32:32.546+00
f87cae2a-5016-46f1-885c-0504b815466b	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9a5d6371-f4d4-450c-9579-691f2475424a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.547+00	2025-11-14 16:32:32.547+00
3333d4ce-7faf-4b36-a2f1-93cb032f89e6	5112e5ea-6468-44bc-b15f-5058fe1b81ac	abd3b429-0729-43bd-940a-705299c3f605	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.548+00	2025-11-14 16:32:32.548+00
02169ff3-2640-4058-b3a3-3c1018926e15	5112e5ea-6468-44bc-b15f-5058fe1b81ac	edb1d18f-b114-4798-862b-47f9c4805528	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.549+00	2025-11-14 16:32:32.549+00
a037a04d-73fe-481f-84e2-470d28a6eac9	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1641e2c2-c562-48fc-9536-56cee4574bf4	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.549+00	2025-11-14 16:32:32.549+00
6c0f068e-c527-4904-8a6d-4d66b4f15ecc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1a9a8ae8-e0b9-41c3-ad44-d85c1a54ab20	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.55+00	2025-11-14 16:32:32.55+00
4b6047be-0005-4f80-ae04-734105290fc0	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3b8ed7f1-bbbf-4bc6-a9dd-4237f8ed9e02	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.551+00	2025-11-14 16:32:32.551+00
e564f111-a2d9-4503-8cd3-fbf7774d05cc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e97573db-71f7-4e5d-be5c-789443828662	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.552+00	2025-11-14 16:32:32.552+00
53375830-8518-45b7-b87a-48f31e4a60e2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	64845bb0-e5ae-4959-8b57-de87f7308021	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.553+00	2025-11-14 16:32:32.553+00
e3e2924d-a6e2-4896-81ff-493b2e8e16fc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	87a4451e-08f4-4684-9fcd-334effa7a620	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.554+00	2025-11-14 16:32:32.554+00
8460b6bd-f4fb-4504-b7e5-801c7362cdec	5112e5ea-6468-44bc-b15f-5058fe1b81ac	315f6245-831f-4e59-bc95-85cc188ae5bd	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.556+00	2025-11-14 16:32:32.556+00
7b1dff6f-a6f2-4b56-bcfb-ed471e6b18c9	5112e5ea-6468-44bc-b15f-5058fe1b81ac	ad574aeb-c97b-45b0-82a8-45fb2748495a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.559+00	2025-11-14 16:32:32.559+00
469b4978-91e7-4a3d-baf7-b06a3385eed3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7b5dc87c-e088-4e16-b353-0978866d3b49	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.562+00	2025-11-14 16:32:32.562+00
b486df29-899f-4b34-bb49-f9f9c6358777	5112e5ea-6468-44bc-b15f-5058fe1b81ac	6488c2f3-a5d4-49cc-803e-764a2c4fed8e	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.564+00	2025-11-14 16:32:32.564+00
69a18f52-1ed1-4c7b-bcd8-ce540a38c2f2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	88d40f37-bea8-439c-9707-4e08a4b8a15e	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.565+00	2025-11-14 16:32:32.565+00
5a76b2dc-cb29-4764-90c4-e25d8894c4ee	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d1934e6b-1bce-4241-ab90-954ce132dfd4	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.568+00	2025-11-14 16:32:32.568+00
8f830cb8-eaf5-4dd8-85be-4fd2e263c6da	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b4049b83-a867-4676-a88a-f434d231ce71	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.581+00	2025-11-14 16:32:32.581+00
407e36c0-7a56-468c-8e1f-30c3974c671c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2cb3e233-c652-4b5f-9952-a2b2e2429448	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.583+00	2025-11-14 16:32:32.583+00
5f06b216-430a-4d1f-88de-fe52b1f6a9c3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b42495c3-7e65-4627-b01b-578773a58599	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.584+00	2025-11-14 16:32:32.584+00
099aef5c-6f04-4f8e-b380-7094a7e12f05	5112e5ea-6468-44bc-b15f-5058fe1b81ac	c9cfe478-047f-46ba-ae61-a873ab96981e	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.585+00	2025-11-14 16:32:32.585+00
78ca8907-6fae-488e-a43a-0a73d05294f1	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0c0787c5-9742-4b0b-bc69-db10b58ff247	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.585+00	2025-11-14 16:32:32.585+00
02f05057-ad67-4909-8566-0fdb5d792ba3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	c7f86be2-058f-476b-81ef-97830fdbf176	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.586+00	2025-11-14 16:32:32.586+00
d3c32d7a-d89d-4783-9b5a-ce7cbd8eda20	5112e5ea-6468-44bc-b15f-5058fe1b81ac	61c10a9d-696b-4f82-a486-86966514390d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.587+00	2025-11-14 16:32:32.587+00
819b8b0f-f8b0-4def-a09e-d4fa659cb9f3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d9147e94-44e2-4395-b935-1bbf8f416bee	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.588+00	2025-11-14 16:32:32.588+00
9bdb935d-dc35-4cbc-9cbd-e9661ba59737	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2e16949e-fa45-401d-9409-d4d053a46fbb	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.589+00	2025-11-14 16:32:32.589+00
df2781d0-75db-4770-bbea-7d751e7ea06c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f674bd16-9c69-49ad-af36-db195bceb306	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.59+00	2025-11-14 16:32:32.59+00
9b6f3521-7b4e-4f42-8389-6044cb9e18cb	5112e5ea-6468-44bc-b15f-5058fe1b81ac	41810f3d-0fd4-407f-bd1c-e08c30fa64d1	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.591+00	2025-11-14 16:32:32.591+00
2b6f08e7-7997-418e-a3c0-d49da6226d5c	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d1fc015e-1d5c-4661-b662-8cc602702d15	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.591+00	2025-11-14 16:32:32.591+00
261c4702-579c-46eb-a8a9-984506b3aeae	5112e5ea-6468-44bc-b15f-5058fe1b81ac	ce113c27-fa54-4731-a40e-e5c6daa52a3f	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.592+00	2025-11-14 16:32:32.592+00
9bead406-649a-4d96-8ec9-a77c181ba1d2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	c88f379d-9330-4c55-9723-12f79574fc33	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.593+00	2025-11-14 16:32:32.593+00
bcfb49fd-eaeb-496d-a167-fa623d907e55	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b3b0e1d6-10c1-4380-9104-10a7ed303a5e	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.594+00	2025-11-14 16:32:32.594+00
897d841f-9625-4383-bbec-d6fd049a7541	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1ef1b6c2-35ce-4ecc-8b60-83b3203d7700	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.595+00	2025-11-14 16:32:32.595+00
5b177bf9-e939-42e7-8aed-b11afefe17a2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	54f63d4a-6334-492c-baa3-bd302aa63312	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.597+00	2025-11-14 16:32:32.597+00
af8195db-06f3-484a-a829-5c1ccdb8c2fc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e6a87692-4223-490e-ade1-05c31c36172b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.598+00	2025-11-14 16:32:32.598+00
f1c1452f-e9c5-4e48-8286-f1f4258491a2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	6602363f-5e5f-4f38-b66a-adedf56a4fe6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.599+00	2025-11-14 16:32:32.599+00
2bbf06ca-007c-424d-b748-01146373ecec	5112e5ea-6468-44bc-b15f-5058fe1b81ac	17db8fa3-d267-4d70-86f1-58d1d8c3ac19	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.6+00	2025-11-14 16:32:32.6+00
a3258470-c982-4ef4-8a1f-ba2a300f57a8	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7867b34d-afe2-4c23-a298-7387168d8f85	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.601+00	2025-11-14 16:32:32.601+00
6e4c4982-393a-4dc7-a8a8-331215470ab8	5112e5ea-6468-44bc-b15f-5058fe1b81ac	a906555a-5d17-4777-8599-a5dfd639deb3	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.602+00	2025-11-14 16:32:32.602+00
0808c214-e478-42bd-a9af-a55627e72210	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0783b8a6-165d-4c3a-ae8d-95e3a2753aad	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.602+00	2025-11-14 16:32:32.602+00
e390c694-bf71-432b-a289-4afa5fe35683	5112e5ea-6468-44bc-b15f-5058fe1b81ac	64e9c782-7559-4d1a-b30e-47c4f86ac35a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.603+00	2025-11-14 16:32:32.603+00
c70ab6d0-7458-4b24-bc2f-63742835b7f6	5112e5ea-6468-44bc-b15f-5058fe1b81ac	14701249-9f03-4d46-87cb-83563734b3f3	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.605+00	2025-11-14 16:32:32.605+00
c6bfd9ee-e330-4a71-ad1a-45837629cbff	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e4636c86-6754-4fd8-ba36-188b9fda69db	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.606+00	2025-11-14 16:32:32.606+00
f2dfb393-66dc-4445-96a7-c75f50493551	5112e5ea-6468-44bc-b15f-5058fe1b81ac	adc9b5cd-b294-4111-9e3e-bd8f35922dae	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.606+00	2025-11-14 16:32:32.606+00
16730aea-7495-406f-9cf8-4b5dfb12acb3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	2d7fe49f-9553-4ffb-a641-d9dc1294667b	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.607+00	2025-11-14 16:32:32.607+00
c9b8425c-0cfc-4bab-9fa3-3cf6607fe969	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f9e9cef4-59f6-4173-9fca-f30b2c9520a9	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.608+00	2025-11-14 16:32:32.608+00
f924a073-b1ed-4216-a1fc-abe9bc30ce5d	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3cbe7034-3602-45c2-a160-6eb46ef1c212	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.609+00	2025-11-14 16:32:32.609+00
24a3ec0c-1881-4c51-a531-a7ec603030b1	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7c1da6c8-7062-459e-8a65-8038941ead88	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.609+00	2025-11-14 16:32:32.609+00
cf717ba0-80a7-4db8-90aa-d499b08d70eb	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3ac1bdbe-bcdd-42fd-bedf-eeeb634b368b	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.61+00	2025-11-14 16:32:32.61+00
6029683c-582f-4415-9c95-0584f654a692	5112e5ea-6468-44bc-b15f-5058fe1b81ac	ee2ec5e9-021b-412b-9c81-1d274c786f97	selective	global	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{}	{}	2025-11-14 16:32:32.611+00	2025-11-14 16:32:32.611+00
61434630-4628-40d3-80aa-eb9047f9bfe5	5112e5ea-6468-44bc-b15f-5058fe1b81ac	71452f66-f7c5-4969-92b3-de656707be4a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.612+00	2025-11-14 16:32:32.612+00
1e7b3a0f-a7fa-499a-abbc-df05adce1904	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0a76b3a7-d6cc-4528-81dd-51f9a98da04a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.612+00	2025-11-14 16:32:32.612+00
6396ef88-d977-47e0-b516-f46c9d0fe7fe	5112e5ea-6468-44bc-b15f-5058fe1b81ac	c8129d10-0ba7-4d73-896d-775961fd5368	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.613+00	2025-11-14 16:32:32.613+00
f0d91d04-a7a2-4139-af71-0d5e60975d01	5112e5ea-6468-44bc-b15f-5058fe1b81ac	a506000b-869a-4765-ae09-409139c9dbb5	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.614+00	2025-11-14 16:32:32.614+00
c6ed7243-79b4-4d6e-928b-d75799e551ff	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d7ba62e9-f3e4-4063-b6d7-ec85b6fabf50	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.614+00	2025-11-14 16:32:32.614+00
0e61ef09-6990-4344-8c59-0a87e2d94342	5112e5ea-6468-44bc-b15f-5058fe1b81ac	392103af-0fd5-4072-aacb-d049ce81baa8	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.615+00	2025-11-14 16:32:32.615+00
5f3b1f5b-a6d0-43d7-8793-470100824dc3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	cd12e73d-4049-4289-8cc5-d9f95601ccdf	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.616+00	2025-11-14 16:32:32.616+00
976337f9-a1e7-4f48-a9f3-c63d3b109f38	5112e5ea-6468-44bc-b15f-5058fe1b81ac	92e85ae9-7134-44dd-b813-594429dccb01	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.617+00	2025-11-14 16:32:32.617+00
4be66826-aac5-4b25-ae7b-956e37f50e56	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9f237bf1-d6bd-4f77-ab4a-42f1a1728c45	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.618+00	2025-11-14 16:32:32.618+00
7099b86b-0d1c-428d-b3f5-e2977f98e25a	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3f5c49fd-e080-4ce3-ac52-b1f862a1df37	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.618+00	2025-11-14 16:32:32.618+00
e32f3488-4a60-41cd-947c-c3f80e0032b2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	7f56150e-8fe6-4a9a-817b-819cf36212a8	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.619+00	2025-11-14 16:32:32.619+00
6928cf22-6c8e-468d-8bf5-fef60b16f2cd	5112e5ea-6468-44bc-b15f-5058fe1b81ac	da520ff6-5280-4b8f-baa1-8bbc2cd2004b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.62+00	2025-11-14 16:32:32.62+00
b547fe43-536b-4408-af58-286ac12a999f	5112e5ea-6468-44bc-b15f-5058fe1b81ac	d17c17d6-2d04-494e-86b9-a7666cbbf657	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.621+00	2025-11-14 16:32:32.621+00
b9b58bef-75a3-4006-882e-c2834df9decf	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3f593aae-9361-4f0b-9528-2f2408419d4f	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.622+00	2025-11-14 16:32:32.622+00
42105b80-0038-422e-84cc-d1267df848de	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b83a4322-1879-4259-9609-1f6414b510d3	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.624+00	2025-11-14 16:32:32.624+00
7766caca-ef1b-4108-b0d3-bf628fca1cbe	5112e5ea-6468-44bc-b15f-5058fe1b81ac	93b3f97e-321f-4aee-9bff-9d4be9acc0d1	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.625+00	2025-11-14 16:32:32.625+00
42823638-57e6-41ee-91d5-24306ffc71b2	5112e5ea-6468-44bc-b15f-5058fe1b81ac	6ce1a5cc-9f77-4d35-983f-b07fb37ab44d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.626+00	2025-11-14 16:32:32.626+00
5b8a1cd7-e9cc-4c60-b013-671fd7a012da	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9386672c-4e40-44b9-8afe-2228b210b982	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.627+00	2025-11-14 16:32:32.627+00
68f996be-db79-46dc-a887-0625deaa5fa0	5112e5ea-6468-44bc-b15f-5058fe1b81ac	95bd4a82-280c-4c57-9607-6786162e3fd6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.627+00	2025-11-14 16:32:32.627+00
60eb7457-4312-4661-b427-517628fa49af	5112e5ea-6468-44bc-b15f-5058fe1b81ac	15ae1b52-70e0-42e3-a679-9a17830ba8a3	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.628+00	2025-11-14 16:32:32.628+00
bfe4b014-f793-4155-8d2a-7056c6cdf7fc	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b22e6eac-96c4-429c-b971-bdee55eb6e94	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.63+00	2025-11-14 16:32:32.63+00
bc90ba28-96a2-4595-bdb9-90456543d169	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0433393e-ca54-49b3-a17a-0af8014843b6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.632+00	2025-11-14 16:32:32.632+00
4c8398a8-c6d3-47a6-a8f3-c3135eff58ce	5112e5ea-6468-44bc-b15f-5058fe1b81ac	ec999cef-d827-4df1-b2c5-24970df69a38	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.633+00	2025-11-14 16:32:32.633+00
e04c1115-fe75-41d1-ba12-bd13475b7670	5112e5ea-6468-44bc-b15f-5058fe1b81ac	3d7842a2-4488-4031-9c03-6fd2bc2bebd3	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.634+00	2025-11-14 16:32:32.634+00
76bf7fb7-438a-4d96-8a86-dc4171a18ba6	5112e5ea-6468-44bc-b15f-5058fe1b81ac	454dcca0-36d3-4468-a25c-4d291225d1b7	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.636+00	2025-11-14 16:32:32.636+00
86a89998-b9d7-42a3-841e-0b2b1dcedcec	5112e5ea-6468-44bc-b15f-5058fe1b81ac	17d59357-103a-4b22-beb3-4b6872ecc6ff	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.637+00	2025-11-14 16:32:32.637+00
f5c516b3-e399-4522-95ee-91bde24a29de	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0944817d-a6ac-468e-8a3d-335c2bed8b4c	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.638+00	2025-11-14 16:32:32.638+00
ea8a20b6-69ee-4d51-bedf-f318aa27ef82	5112e5ea-6468-44bc-b15f-5058fe1b81ac	dfc6af77-d05d-4a0e-974d-5fea8ad558d8	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.639+00	2025-11-14 16:32:32.639+00
6544c78e-1a51-4d3c-9dab-0d6949eabbe3	5112e5ea-6468-44bc-b15f-5058fe1b81ac	02c018cc-e002-432a-b463-218ddfe7fdf5	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.64+00	2025-11-14 16:32:32.64+00
5f1ce95d-61be-4117-a5d4-31d989cd9887	5112e5ea-6468-44bc-b15f-5058fe1b81ac	8a6c02e9-89df-42ea-a907-d5dce56d3f5d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.641+00	2025-11-14 16:32:32.641+00
352e88c2-22b0-4d47-b097-785c79a15879	5112e5ea-6468-44bc-b15f-5058fe1b81ac	e4501301-479e-4cde-a866-a837ec5f9ae5	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.642+00	2025-11-14 16:32:32.642+00
dec349b2-93a2-4cee-af8f-fbc795f0b8c5	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0621a8f0-ca81-43a4-9aac-17e3e62a5947	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.645+00	2025-11-14 16:32:32.645+00
ff1d4017-42f3-4d6c-b492-e564ab3c79ed	5112e5ea-6468-44bc-b15f-5058fe1b81ac	67f48b8e-1f5f-4deb-8751-35ad8b293c14	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.646+00	2025-11-14 16:32:32.646+00
881b90d0-7c9f-4cf7-a874-a1b58b8ac734	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9b686b74-fc94-43c4-9301-91c77dce6df1	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.647+00	2025-11-14 16:32:32.647+00
a5fcb336-0f80-49e7-ba74-2b1671b2892a	5112e5ea-6468-44bc-b15f-5058fe1b81ac	546e3750-5a0f-4dc2-8007-75533b50bcf1	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.648+00	2025-11-14 16:32:32.648+00
88002a29-380f-4e69-83fe-9df05c3b0f0b	5112e5ea-6468-44bc-b15f-5058fe1b81ac	b826fb02-3d94-4ba9-a2cc-7fe32f55ea8a	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.649+00	2025-11-14 16:32:32.649+00
1cb02dae-8228-457e-b142-f20bc32e64d0	5112e5ea-6468-44bc-b15f-5058fe1b81ac	f208c2b2-112d-41b0-ad42-9f1cbaa01d5d	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.649+00	2025-11-14 16:32:32.649+00
0ba584e0-3a14-4f70-8980-617b1a0bc08f	5112e5ea-6468-44bc-b15f-5058fe1b81ac	1d981560-620b-4a52-97f8-b3792e7a0b74	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.65+00	2025-11-14 16:32:32.65+00
3a7f5e95-b785-43f9-a960-1ad517357419	5112e5ea-6468-44bc-b15f-5058fe1b81ac	dfb75f41-5925-47c5-bbeb-074c83d9e8f6	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.651+00	2025-11-14 16:32:32.651+00
22889fa8-7b9a-4801-8fdf-35e4ff325fb5	5112e5ea-6468-44bc-b15f-5058fe1b81ac	74d8c9c0-590e-409f-81e3-d6d9e19477dc	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.651+00	2025-11-14 16:32:32.651+00
3089e2ef-2f02-4480-83e1-05a3dd2d2972	5112e5ea-6468-44bc-b15f-5058fe1b81ac	0d9c7d4c-b608-42f3-a6ca-421b37b6f92b	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.652+00	2025-11-14 16:32:32.652+00
65605f53-b4a6-4c55-b4ad-bbeb5c106e79	5112e5ea-6468-44bc-b15f-5058fe1b81ac	9ce3340f-0976-4733-b6d6-af1d15766271	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.653+00	2025-11-14 16:32:32.653+00
077b0f21-d11a-492b-a32c-b788bbd36b28	5112e5ea-6468-44bc-b15f-5058fe1b81ac	09051676-6199-4566-aa70-a22a3ffd1790	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.653+00	2025-11-14 16:32:32.653+00
078a63f2-0ced-427b-8f30-a4b0401157b9	5112e5ea-6468-44bc-b15f-5058fe1b81ac	c35e59cd-f0de-4abd-8567-2862e009f3f7	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.655+00	2025-11-14 16:32:32.655+00
667fa91c-3610-407e-a56c-6f77a46018e9	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4cac314b-2496-4d02-91a0-4e79f8dd72ba	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.656+00	2025-11-14 16:32:32.656+00
e97ea92d-3f18-4255-93f0-f98d582d22a0	5112e5ea-6468-44bc-b15f-5058fe1b81ac	568a91f6-56a9-4204-979d-54d85097aaa2	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.656+00	2025-11-14 16:32:32.656+00
83a2acd3-573f-4e7e-a999-6dd02467a892	5112e5ea-6468-44bc-b15f-5058fe1b81ac	034f1c7d-5acc-431d-898d-5c5cd32f9b73	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.657+00	2025-11-14 16:32:32.657+00
6f4c41cd-f44a-4146-b231-6b4507fff2e1	5112e5ea-6468-44bc-b15f-5058fe1b81ac	4303a3bc-3468-4acd-b3ff-a393a963fa1c	global	global	{}	{}	{}	{}	{}	2025-11-14 16:32:32.658+00	2025-11-14 16:32:32.658+00
ef1a06ca-6aae-4d4b-af50-90501465e4a0	5112e5ea-6468-44bc-b15f-5058fe1b81ac	5da7dd3a-1615-4027-adc5-aa71f265cbb0	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:32:32.659+00	2025-11-14 16:32:32.659+00
ef1741a7-289f-4bb9-8e67-b1cbe6d4ea24	d0abf49c-5d5b-46da-8639-ac6099a513b9	2cb3e233-c652-4b5f-9952-a2b2e2429448	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-14 16:36:27.425+00	2025-11-14 16:36:27.425+00
2d001b5d-14c9-4a3d-87e1-14f61fa9ec9d	bd62417b-d9b6-40bf-89c4-eb8eb2afcf7f	a1a71f61-eea8-4cc4-a29d-e0b140a52247	global	global	{}	{}	{}	{}	{}	2025-11-14 16:49:48.726+00	2025-11-14 16:49:48.726+00
31385a80-2982-4843-b741-c756347dcb03	bd62417b-d9b6-40bf-89c4-eb8eb2afcf7f	fca4686e-4b83-4ff5-8ca7-bb0e00e50ba7	global	global	{}	{}	{}	{}	{}	2025-11-14 16:49:48.729+00	2025-11-14 16:49:48.729+00
ecd89815-c7bf-434a-ac3d-34fbec7b680a	bd62417b-d9b6-40bf-89c4-eb8eb2afcf7f	c670e19a-82eb-4ed1-8bf2-b387a0341e34	global	global	{}	{}	{}	{}	{}	2025-11-14 16:49:48.73+00	2025-11-14 16:49:48.73+00
1fbcb44c-9d0f-4aab-9b46-a7779d84950c	bd62417b-d9b6-40bf-89c4-eb8eb2afcf7f	7d306de2-852c-448a-a612-f896690ecd45	global	global	{}	{}	{}	{}	{}	2025-11-14 16:49:48.731+00	2025-11-14 16:49:48.731+00
0b9bdad0-bcf4-4daa-88bb-d8482b19dd9e	bd62417b-d9b6-40bf-89c4-eb8eb2afcf7f	3f524760-db38-4f8f-bae9-95590f9e550e	global	global	{}	{}	{}	{}	{}	2025-11-14 16:49:48.732+00	2025-11-14 16:49:48.732+00
b5135b65-caa9-4e36-87a3-142764ee8168	9a3fea32-ca77-4ea6-8ab2-3305257af8d2	94e0e249-7846-4676-a28b-92a2bd879a5f	global	global	{}	{}	{}	{}	{}	2025-11-15 09:40:01.576+00	2025-11-15 09:40:01.576+00
be731776-e06b-4dde-aa32-b4f113861a85	a189528d-eb63-49ec-a175-d0eb3c636e64	94e0e249-7846-4676-a28b-92a2bd879a5f	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-15 09:40:27.058+00	2025-11-15 09:40:27.058+00
c9755a91-b7ac-4067-9315-aa1b701e77e5	8c6746f9-5616-4ebe-b3a1-42419f934811	94e0e249-7846-4676-a28b-92a2bd879a5f	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	2025-11-15 12:33:20.243+00	2025-11-15 12:33:20.243+00
32a6d8c4-c924-42f2-9983-71cc239ebf05	ec3f438e-ba06-4c66-ba5a-309b4c89c271	3d3b0b0e-0501-4b96-9c37-fb769ed2fb52	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-15 14:16:20.076+00	2025-11-15 14:16:20.076+00
55149e6e-6406-40eb-a671-0a828fd5b605	ec3f438e-ba06-4c66-ba5a-309b4c89c271	41810f3d-0fd4-407f-bd1c-e08c30fa64d1	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-15 14:16:20.079+00	2025-11-15 14:16:20.079+00
55184fc2-021c-4ab7-83fb-beaf3dd47523	ec3f438e-ba06-4c66-ba5a-309b4c89c271	c35e59cd-f0de-4abd-8567-2862e009f3f7	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	2025-11-15 14:16:20.08+00	2025-11-15 14:16:20.08+00
\.


--
-- Data for Name: bulk_update_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bulk_update_runs (id, world_id, user_id, campaign_context_id, description, entity_count, reverted, created_at, updated_at, role_used) FROM stdin;
a2f2bb83-8755-4abb-b52c-9ad224dce9cd	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	14883473-40f7-4667-b417-b3946b2d2fc1	\N	8	f	2025-11-14 16:26:37.027+00	2025-11-14 16:26:37.027+00	owner
d056b676-feef-43fb-b513-3be63a18f1ef	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	14883473-40f7-4667-b417-b3946b2d2fc1	\N	8	f	2025-11-14 16:26:57.054+00	2025-11-14 16:26:57.054+00	owner
5112e5ea-6468-44bc-b15f-5058fe1b81ac	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	65019483-f077-4a93-83b6-b8c97864afd1	Moving all Shadows of Varathia changes to the Varathia scope	183	f	2025-11-14 16:32:32.448+00	2025-11-14 16:32:32.448+00	owner
d0abf49c-5d5b-46da-8639-ac6099a513b9	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	65019483-f077-4a93-83b6-b8c97864afd1	\N	1	f	2025-11-14 16:36:27.389+00	2025-11-14 16:36:27.389+00	owner
bd62417b-d9b6-40bf-89c4-eb8eb2afcf7f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	14883473-40f7-4667-b417-b3946b2d2fc1	\N	5	f	2025-11-14 16:49:48.69+00	2025-11-14 16:49:48.69+00	owner
9a3fea32-ca77-4ea6-8ab2-3305257af8d2	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	\N	\N	1	f	2025-11-15 09:40:01.572+00	2025-11-15 09:40:01.572+00	owner
a189528d-eb63-49ec-a175-d0eb3c636e64	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	\N	\N	1	f	2025-11-15 09:40:27.017+00	2025-11-15 09:40:27.017+00	owner
8c6746f9-5616-4ebe-b3a1-42419f934811	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	\N	\N	1	f	2025-11-15 12:33:20.208+00	2025-11-15 12:33:20.208+00	owner
ec3f438e-ba06-4c66-ba5a-309b4c89c271	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	\N	for this reason	3	f	2025-11-15 14:16:20.039+00	2025-11-15 14:16:20.039+00	owner
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entities (id, world_id, created_by, entity_type_id, name, description, metadata, visibility, created_at, updated_at, read_access, write_access, read_campaign_ids, read_user_ids, write_campaign_ids, write_user_ids, image_data, image_mime_type, read_character_ids) FROM stdin;
2cb3e233-c652-4b5f-9952-a2b2e2429448	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Joridiah Bleakly	Lord of Cloverfell and collector of magical artefacts. Wants Han's swords, wants the Divine Astrolabe	{"Race": "Human", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.895+00	2025-11-14 16:36:27.427+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1,14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1,14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
ec4dffaf-bb67-492a-9c4b-5596c770f967	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	High Seekers	The High Seekers are a guild of information brokers and fixers. They connect problem solvers with problems.\n\nMost leaders will have a High Seeker in their council.	{}	visible	2025-11-14 22:09:25.269+00	2025-11-14 22:09:25.269+00	global	global	{}	{}	{}	{}	\N	\N	{}
5da7dd3a-1615-4027-adc5-aa71f265cbb0	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Adelaide Castoak	The Pallid Dancer. A mad spectre haunts the Western Tower of Castoak Castle.	{"Race": "Human Spirit", "Type": "Marked", "Status": "Undead", "cause_of_death": "Suicide."}	visible	2025-11-09 18:57:45.604+00	2025-11-13 11:29:26.74+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
03fa3208-0546-406b-8e45-6f76d4958451	1a6a672d-af24-4ff4-a91d-39252db38961	a3bc8328-8169-4bfa-8177-dd2e088316d5	269a226e-f6ab-4888-8ae1-c6bda5f36689	Earth		{}	visible	2025-11-09 18:10:23.847+00	2025-11-09 18:10:39.727+00	global	global	{}	{}	{}	{}	\N	\N	{}
57c9d03b-fc9d-4b92-91fa-3a01626aa556	1a6a672d-af24-4ff4-a91d-39252db38961	a3bc8328-8169-4bfa-8177-dd2e088316d5	feb37506-e304-463e-b613-d5ced919ab18	A Starship		{}	visible	2025-11-09 18:11:07.566+00	2025-11-09 18:11:07.566+00	global	global	{}	{}	{}	{}	\N	\N	{}
0968245c-ca02-46ec-8584-442978beb5a1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Father Rodeggar	Preist of Kelimvor in Cloverfell.3	{"age": "", "Race": "Half-Elf", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-17 20:54:36.301+00	2025-11-19 11:53:14.333+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
e4501301-479e-4cde-a866-a837ec5f9ae5	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ava Bottlebell	Daughter of Kathleen Bottlebell	{"Race": "Human", "Type": "Worker", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.675+00	2025-11-14 16:32:32.644+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3f524760-db38-4f8f-bae9-95590f9e550e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	9afc4157-6291-42ca-97fa-bf08ffe403a8	Daxen Bane		{}	visible	2025-11-14 16:47:21.422+00	2025-11-14 16:49:48.732+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
1c8e7f8b-3dd9-4cc6-b8e1-621d983715dd	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	Cloverfell Inkworks	An industrial scale ink manufacturer and exporter. Predominatly providing ink to the Temple of Ink and Ash.	{"location_type": "Building"}	visible	2025-11-14 22:13:29.159+00	2025-11-19 12:04:49.128+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
7e9f1f53-6891-4e50-a255-9691904bfea3	f3b4ce50-86fc-45b4-b78f-9991acec86c6	ecf1ae57-7d88-4763-ad45-23a239523246	88b979eb-9950-4dd2-a8f7-753a9dd89d73	Aura	The forest kingdom of Auran, home to Auran High Elves and domain of the crystal woods.	{"location_type": "Region"}	visible	2025-11-19 20:06:08.437+00	2025-11-19 20:06:08.437+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3f5c49fd-e080-4ce3-ac52-b1f862a1df37	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Draven Blackthorn	Leader of the Starvenvale Area and accomplished undead hunter	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.751+00	2025-11-14 16:32:32.619+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
7d306de2-852c-448a-a612-f896690ecd45	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	9afc4157-6291-42ca-97fa-bf08ffe403a8	Xanzaphir		{}	visible	2025-11-14 16:48:30.243+00	2025-11-14 16:49:48.731+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
94e0e249-7846-4676-a28b-92a2bd879a5f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Talia	An innocent woman who came under the influence of a cursed locket of heartbreak.	{"Race": "Human", "Type": "Civilian", "Status": "Dead", "cause_of_death": "Murdered and returned as a vengful spirit that was then destroyed by an unlikely group of travellers..."}	visible	2025-11-14 22:21:17.712+00	2025-11-17 08:23:29.045+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
e95d7dec-24c5-43c6-9469-662e63298f46	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	b938723b-3cf2-41ad-be71-b356c7dd8a63	Divine Astrolabe		{}	visible	2025-11-20 09:50:55.871+00	2025-11-20 09:50:55.871+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
a906555a-5d17-4777-8599-a5dfd639deb3	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Gilliad	Enemy - hunting for Adamantine Wizard. Involved in some anti-elf conspiracy	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.829+00	2025-11-14 16:32:32.602+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0783b8a6-165d-4c3a-ae8d-95e3a2753aad	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Gillard	Ranger of the Stave	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.823+00	2025-11-14 16:32:32.603+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
64e9c782-7559-4d1a-b30e-47c4f86ac35a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Geoff	Ma Names Geoff! Burke's man outside of the temple of passing	{"Race": "Human", "Type": "Military", "Status": "Dead", "cause_of_death": "Burned alive by The Flame"}	visible	2025-11-09 18:57:45.82+00	2025-11-14 16:32:32.604+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
14701249-9f03-4d46-87cb-83563734b3f3	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Gak the Hornblower	A Liberated Ib goblin turned apprentice wizard under the tutoriage of Yr.	{"Race": "Goblin", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.816+00	2025-11-14 16:32:32.605+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
71452f66-f7c5-4969-92b3-de656707be4a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Evangeline	Member of the Cult of the Maze, currently on her pilgrimage to the grand labyrinths	{"Race": "Minotaur", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.787+00	2025-11-14 16:32:32.612+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0a76b3a7-d6cc-4528-81dd-51f9a98da04a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Emerion Birthright	Lord Mayor of Lillian's Rest and descendant of Lillian Birthright. Accomplished artist and reader of the stars.	{"Race": "Half Elf", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.783+00	2025-11-14 16:32:32.613+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c8129d10-0ba7-4d73-896d-775961fd5368	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Elric Miradithas	A Demic Elf and apprentice to Costuan. Works for the Golden Rose Agency	{"Race": "Demic Elf", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.779+00	2025-11-14 16:32:32.613+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c670e19a-82eb-4ed1-8bf2-b387a0341e34	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	9afc4157-6291-42ca-97fa-bf08ffe403a8	Nicholas Starling		{}	visible	2025-11-14 16:48:48.628+00	2025-11-14 16:49:48.73+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
555c800f-9edf-4681-a69e-58a21409af01	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	b938723b-3cf2-41ad-be71-b356c7dd8a63	Moates of Lights	Broken Shards of the Light of Varathia, spread across the region during the destruction of Lucernis	{}	visible	2025-11-20 09:51:37.772+00	2025-11-20 09:51:37.772+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d1934e6b-1bce-4241-ab90-954ce132dfd4	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Kaitlyn Wellspring	Mayor of the town of Fairburg, close friends with the Birthright family.	{"Race": "Halfling", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.901+00	2025-11-14 16:32:32.569+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
fca4686e-4b83-4ff5-8ca7-bb0e00e50ba7	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	9afc4157-6291-42ca-97fa-bf08ffe403a8	Elliot Hightower		{"played_by": "Dan D"}	visible	2025-11-14 16:49:00.688+00	2025-11-17 09:53:09.732+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
77c53627-1c2f-4442-a573-91de2eeb2569	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Robert Peak	Lute player	{"Race": "Human", "Type": "Entertainer", "Status": "Alive"}	visible	2025-11-17 20:37:04.349+00	2025-11-17 20:37:04.349+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
9db746e4-ac72-4c51-962b-8e5cf0e1dfed	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Po Night	Muscle Orc - part of Yuri's band	{"Race": "Half-Orc", "Type": "Entertainer", "Status": "Dead", "cause_of_death": "Died by internal drowning during a performance in the Painted Petal. Then rats sprung forth from him..."}	visible	2025-11-17 20:39:08.358+00	2025-11-17 20:39:08.358+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
a1a71f61-eea8-4cc4-a29d-e0b140a52247	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	9afc4157-6291-42ca-97fa-bf08ffe403a8	Sylbella Firenyl	....	{"age": "", "played_by": ""}	visible	2025-11-14 16:49:20.487+00	2025-11-19 12:03:18.41+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
436c98fb-5c16-421c-aba4-e556470e1ec5	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	Cloverfell		{"location_type": "City"}	visible	2025-11-14 17:58:22.21+00	2025-11-14 17:58:36.28+00	global	global	{}	{}	{}	{}	\N	\N	{}
29712980-2d64-4387-bdfb-8062a78fabc6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Felicity Wax	Harpist and new to Yuri's band	{"age": "", "Race": "Human", "Type": "Entertainer", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-17 20:40:07.538+00	2025-11-17 20:40:27.827+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
3bf341e3-61c7-46ae-80a4-04d508a863a1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	The Painted Petal	A tavern in Cloverfell,	{"location_type": "Building"}	visible	2025-11-14 17:59:04.301+00	2025-11-16 17:20:11.492+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
3d3b0b0e-0501-4b96-9c37-fb769ed2fb52	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Toren Shacklehand	Captain of the Watch Guard in Boulder.	{"Race": "Half-Orc", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.175+00	2025-11-17 18:42:24.125+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
779a2e1a-bf05-40a1-bb09-947124a6d0c4	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Unknown Tabaxi Male	The leopard skinned, flute player and part of Yuri's band	{"Race": "Tabaxi", "Type": "Entertainer", "Status": "Alive"}	visible	2025-11-17 20:41:40.448+00	2025-11-17 20:41:40.448+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
738b7e9a-a207-4e18-9a70-24707df5e520	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Trisriell Sylvaris	A high-born auran sorcerous and daughter of Thorien Sylvaris. Currently working for The Golden Rose Agency	{"Race": "Auran Elf", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.181+00	2025-11-14 16:01:18.804+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
e619d9f1-3d80-451d-9901-7b8950f0f1c8	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Treegodgorath	An ancient entity lives in a glade near Silver Burrow	{"Race": "Unknown", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.178+00	2025-11-14 16:02:09.681+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
69e8e3fa-a8fb-4130-9219-1bcac1bf3e9e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Yggdrein Tali	An old friend of Hans. The High Ambassador to the Worsley Woods. aaa	{"Race": "Wood Elf", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.208+00	2025-11-16 16:18:15.675+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4d627be8-4397-4ceb-bf3d-536ca35ca8db	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Brandsman Balthin Tamsin	A member of the Kingsbrand and once good friend to Hans Freeguard.	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.689+00	2025-11-14 16:00:16.005+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Zite Oberoar	Owner of the Golden Rose Agency a band of monster hunting mercenaries that work out of Varatheia	{"age": "", "Race": "Human", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.217+00	2025-11-17 14:58:41.017+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	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	image/jpeg	{}
7c4ee38f-5401-4be6-b6ec-eaa8d99ca232	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Yuri Peak	Singer/Song writer, he appears athletic and confident	{"age": "", "Race": "Human", "Type": "Entertainer", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-14 18:00:19.75+00	2025-11-17 20:35:57.629+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
0798a59b-ca1c-4879-887c-7f17566a8251	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	The City of Varathia		{"location_type": "City"}	visible	2025-11-10 14:52:30.805+00	2025-11-21 08:28:04.125+00	global	global	{}	{}	{}	{}	\N	\N	{}
77985e1a-8545-4f78-a868-77dd4f82deab	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	The Silver Strings	A band that play in and around Cloverfell	{"leader": "7c4ee38f-5401-4be6-b6ec-eaa8d99ca232", "Headquarters": ""}	visible	2025-11-17 20:42:18.59+00	2025-11-19 11:03:54.696+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	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	image/jpeg	{}
56286363-0228-4d35-aa7b-9f1ebf2d94e0	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	The Golden Rose Agency	Tests	{"leader": "2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c", "Headquarters": "0798a59b-ca1c-4879-887c-7f17566a8251"}	visible	2025-11-13 16:36:10.131+00	2025-11-20 12:36:15.323+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	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	image/jpeg	{}
5434021e-ebef-4cd4-831f-81822c496b60	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Yuna	Bar Maiden of the Ninth Hell.	{"Race": "Unknown", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.214+00	2025-11-14 15:46:34.981+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4bbbe907-2650-44dd-b0b3-a3edf106d036	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Yr	A "Dark" Wizard of conjuration who was once trapped in the void. Now helps the party from his tower in Castoak Bay	{"Race": "Human", "Type": "Wizard", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.211+00	2025-11-14 15:47:04.089+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1c373c21-6f9e-4422-8673-d9c72d797e9e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Voxis	Important member of the Silver Sword Agency	{"Race": "Human", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.199+00	2025-11-14 15:55:39.613+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d368b6b5-33f4-48c5-9bc2-d866fb588314	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Uriel Thorn	Lord Mayor of Folksweaven. Thrown out of a seekers door.	{"Race": "Human", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.184+00	2025-11-14 16:00:47.967+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
bc6db569-fecb-4cd9-a728-839d939b4291	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Valian Baum	Somewhat vain Mayor of Timberton	{"Race": "Human", "Type": "Leader", "Status": "Dead", "cause_of_death": "Died fighting The Host while defending the Servants Wing of Birthright Manor"}	visible	2025-11-09 18:57:46.188+00	2025-11-14 16:01:50.606+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2c7400fc-4b27-4550-bb6e-6764c77f6f28	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Visirus	Lizardfolk fleshcarver of Muddlerong. Once captured beneath the Waxworn Inn	{"Race": "Lizardfolk", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.194+00	2025-11-14 15:59:23.955+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
a202e9a8-6219-4a15-b0ee-ed7589264032	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Vedast Corvon	A surviving member of the old Theian Thieves, currently working with The Golden Rose Agency	{"Race": "Halfling", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.191+00	2025-11-14 15:59:50.58+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9PjsBCgsLDg0OHBAQHDsoIig7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O//AABEIAQABAAMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/API6kBaACgAoAWgAoAKYBQAUAFAC0AJQAtACUAFABQAUAFABQAUAFAgoAKACgBKACgAoAKAEoGFABQAUALSAKACgApgFABQAUALQAUALQAlABQAUAFABQAUAFABQAUAFABQAUCCgAoASgAoAKACgAoGFACUALQAUgCgBKYBQAUALQAUALQAUALQAUAJQAZxQAwtSATd7UDHKTSuFhcNRcdhM+tO4rC0xC0AFABQAUCCgAoASgAoAKACgYlABQAUAFIBaAEoAKYBQAtABQAtABQAtACZ4oAaX9KQxME0rjsKEHqKVx2FC0ABWgBASDgnigBGoQmIGxTEO30AKGBp3ELTAKBBQAUAJTAKACkAUAJQMKAFoAKQCUAFABTAWgAoAWgAoAWgBpNIBjNmgBB7UhjgMnrSGSKh9KRRMEG3LLx6gUhjGKqeDkfyoEQPjtVITGnNMQoAoAcFFK47AVxRcLAGpkjutUIKBBQAUAFACUAFABQMKACgApAFACUALTAKAFoAKAFoACcUARM2elIBBSGOAJoGPRGPT9KlsaRaihHGW5+tS2WkTPGEBJOD60rjsZ8vU+tWjNjApNMVhSoHWgYqpnvSuFiQR+1K47EhjOOKLjsQOozVIloardqaJY6qEFAgoAKACgBKACgYUAFAAaQBQAUwCgBRQAtABQAhz2pARMT3NAxAMmgByrn6UmxpEqgZ56VLKJ1YnhVwPapKJCrqMhufQ0hkTz71KtwadibkABeqFuTFRGuMjJqdytiErzyKq5BKkJ6jmk2UkWoY8g4GSByKlsojkO0kDkUxFeXBGaaJZAeDVkD0ORimhDqYgoASgAoAKBiUAFAC0AIaQBQAUAFMBaAFoAKAGucDrSAioGKKQDgcnApFCu207RQkDYJNIhyDQ0gTZYa6aRMH05qOWxXNciAMjY71WwtyxBGAG38DFRJlpDG2lsdPrTEx6RgnB4/rRcLFiGH5tvepbHYsiIcMflYd/SpuUU7nlzkAN3xVollRzgYPI7GqRLIGq0QwU4NMRKOlMQUCCgBKBhQAUAJQAtIANACUAFAC0wFoAKADtQBE5yaQDSKBgKQEkY4J70mUhVQsc0m7DSuSi2Y84NTzl8g4WzdcUuYOUntrKWRxsUkg0pTRSgzbOju8KuIzlu3vWHObchl3OkzoWPltgd8VoqiM3SZViDI3lvwOx9DWl7mdrbl2aRFgDqfnU1K3KZA90zjdnrTsTcqSyMxyTzVpEtkW7PWmIjYVSJY0GmIlQ5FCEOpiCgAoASgYUAFABSAKAEoAWgApgLQAmecUADEDrSAiJ5zQMTrSAUUDJou49allI0LK239q55ysdMIm3b6arAEiudzN1A0otFjdchQPwqedl8iNOx0OGIhto3DuaXM2LlSNmK1QgJgY+lC1B6EN9pMTQn5aGrDTPPtd08W7u6rgCt6UtbGNWOlzCMhxgmuqxyXI92BjsaZIZyKAGlRng07gNcEdqaEyPFMkkQ4FAD6YgpgFACGgAoAKQBQAUAJQAtABTAWgBGGaQEbKaBjelAAKAFFIaJ4lzUNlpHR6ZCNisRwR+tcVR6nbTWh0MEQwKwZujUgTCgAUhl6IfhTETI5XnrQhNDZpyVIJpthY4/wASoptZWA5JAH51dL4iKvwnH3dm0IBI5xzXZCdzjnCxTx8ua1MhAxHWgAOD0NMQ3zCODRYVxC1OwXEByaBEyg45piFpgJQAUAJQAUgCgAoAKACgBaYC0AFICOQ0AR9TQMXpSGKo5pMEjS0+HcwyMisKkjppxOi06IRHy2+6eh9K5Zu+p1QVtDeto8AViamjCmT1oBllQR0NAh65UYK8etMBJF+Unpx1piMG9s/t8yjH7qM7v94/4U0+UTVzH1rTQY8gciqhOzJnG6ORljaJ2Uj2IruTujhasyuDjg1ZmGfSmAhIPWgQ0+wpiEHBpgTK+RQIXOTxQAtMBKBBQMSkAUAFABQAUALTAWgBr5HSpY0RkE8mi47CcCgQmc0wJolBGTwKhs0ijWsJoVYZOK5pxZ0QkjorJ4ZGA3DmuaSZ0xaZuWwVcDNZmheDKpyD1oAWOUKxye9CAn+0RkbWYAVZJSvNWtLd8SuCvoTTSbE2kZt34js8fuv0p+zbI9okZzazbXQKSDbnoT0odNoaqJmHfWaTElThh0I7itYTcTOcFIw5ozG2GUGuqLucklYh4960MwPvSAVULkBASfShu240r7F1NJuGTcQFz2NZOtFGyw8nqV5rZrd9r9+hFXGXNsZzg4vURQAK0MhaYCUCCgYlIAoAKACgBaACmAuKAAjNJghCoxyTWd3c2srXID19qsyYnemBbVC+1R0rK9jVK5ZFk4XKms+dGns2NElxbnv9Qar3ZC96Js6br0+QkjE9gTWE6S3RvCo+p1FreiaIHPJ5rlasdSdyteai0JJGciqjG4pOxzd9rF5MSqyMo9BXTGEVuckpyZnD7XcyfMWY+pNa3ijK0matnpL43STDPoOaylU7G0aXcsvo6Fcq/NR7Qr2ZAlpNBJhuUobTBJoz9Wtdp3KK0pSM6sTJxj6V1HKBAJpAblg9pa2oZVDysOK5Z80md1PkjHQimnuJ3yx2qT0FJJIpyk2UtRAV0jzkgc1tS2uc1fdIrJ6V0I5mOpkiUAFAxKQBQAtACUALQAtMBRSAQtjrQAxn3cCpsWm7WG4AHvQFhvemI0IlwgbFc8tzoiN8+Z32qTT5UHOxsxmR9rH8eapKJLlIdCz8EjmpkkVFnV+H5GnXaT0rjqKzOym7ov6raqI8nqKiLsW9TmpYn8xgsfT2roRhYgjtJ5y3lsTgZ68fhVpozdyss1yhIBfcOmOlXaLRneaL8NzeRyBWD++eRWcoxNoykbMRMseCCTWD0NinqcIaI+1VB6kTWhy0mUkYDpmu5ao4ZaMaCNw4piRqWlqH2lXAz2IzXPKZ1Qh2Lht8MVJz+FZXOhRMW+fzLp2HTOBXXTVoo4KrvJkY5ANamAtMQUDEpAJQAUALQAUAFAC0wFoAMZpAAUDtSaKTsEpGwY6ms0nc2k1Yr45rQxNuzi3qOAfrXJNnZBXRbis0iky8Zwe+KjmbNFAnNtA/RN5/2lFLmZXIhrWcW0t5AGOhHajmYnFGt4agC7mI6tWVR3ZrTVkbeoRI78dKhuzKS0Kj2KG2IWFXz973FUmTaxlrCEkz5RHP8NVdhZFmCG0VtxjOTzwoBP6UczFyIuJao53iDCjpuBqG2VYjnCIvMa/VakdjGvipiYDitYmUtjlZ1y713R2OGW5EkZZtvrVNiUbuxoWZeNgrZBrCdnqdNO60ZavroQQu38R+VRUQhzM0qT5YmGnzE12nnNj1HFNEsKYgoGJSAKAEoAWgAoAWgApgLQAtIAxQBGQSf6mpKuNZdpoTKasdDpShsZriqHbSOktrdWH3BXO2ddkW/sqbc7Rj6UrsLGZflQMAYFUmS0WdCXaRnpmlLccdjWuB5kvpUsa0Q6Fdj/L0pA9RZ7ONzvC4PfFVcVhsVkxPyHHvjNGrCyQSSXNsNskIZR/EBQ7jtF7GbdyrL8w70ITOev32BhW8EYTZzzqzy8dCa607I42rsuWto0sm9EJReprGUrKxtCGty6wjgTc+0kDgenvWerehvoldmFd3BuZif4R0rshHlRwVJ8zI4h1rQyJMYFAgoASgBKACgBKAFpAFMAoAWgBaAFoAWgBDQAzG9T6qaz2Zruja0mUDbn0rmqo66LOqtp12DmuVnamTy3abMZpWAxryTzX3dgcCrijKRvaXD+7Xb1NQ9WaLRFm7Uxv6Gk0NajY3dCDnr60gY97w9wARTuJIlguxkHpTTBodc3IkXGeKGxJWOdvAI5GZT3zj1poGzFviHy1bwOaoZtpBvkORnJ6VpNmUFqbKxmK3aMKI0HNYXuzpSsjnNQvFkYxRcIDyfWuynC2rOOtUvoinGMg1scxKBgYpiFNACUAJQAlABQAlAC0AJQA6gAoAWgBaACgBGbAoAg3MpOKVrlJtGhZzbVU1hUR0U5WNj+0zFEOa5uS7Or2lkLFevIu92+gocbAqlyrJfsMr2zmqUCXM29L10RxhWbBHSspQaZtGaaFvPEZMny5c+goVNvcHUS2H2Oq3F/MqFNij7xpOCQ1O5rXRWSPchAIqB3MZtWktZdko4z94dKtQvsL2ltyeTUPNj3I1LlG5FPzTcMT6VVrGd7lG8YKp+tawMZszbbUY7WY7xnuK1lTcloZwqKL1G6hrktyNkfyr0pwo21Yqle+kTKzzXQco9SVNAEgJNMQ6gBKAEoASgAoASgAoAWgAoAUUALQAtABQAEZoAhkQKKQye0OVZe/UVnM1plu4RmhSRenesYuzsbS1V0QpLIvByBVtIhNjmyaRQsMcrN8uaJWHG5dggfzfmHFZuxepqwTGEALxWbRabEuL6cchjgUJITbMyW/858MN3NaKNjNyuXbGJvIkJ+6DxWUnqbx2J7YbIHc/xHik9xIytRmAVhW1NGNRmC7bnJrsWxyN6iCgQnQ0wJBKO4pAPDg0xDs5oAKAEoASgBKAFpDEpiCgBaAFFAC0ALQAtABQA11yKAGK3lSBh0qWrouLszRtpwwKHlTXNKJ0xkWDAjR9M1F3c0srEAtpA2FOR71XMhKJft4buIbliWQVDaZqostIt7O2EtQv4YqdF1Kt5D20+/LYLxqT2HaldD5WWLfQtx3XUpcenQUnPsLlXUL3TrdSBGgB7CkpMmUURSbYIRAvXvQtXcHorFO7uhHGEXtWkY3M5SsYd3MZCfQV0xVjmk7lDvW5iGeKQCZJpiEoAUHFADw5FADxJmgB/WgBKAEoAXtSGJTEFABQA4UAAoAUUALQAUAMeQL9aAIWcmgCSGYq1RKNy4ysa1vcb1xXNKNjqjK5ajfa3IyKg0TsXIbpIj8rEVHKzRVLFuO/Un/WH8KTiyvaIvwToq5VeT3NQx81yVpPkJPWpAy7q5VXznn3rRRMnIyJ7vDlieTWsYmcpGfI73D4HT1rXSJlrIr3a+XHgVcHdkzVkUc81uc4DJoACMUAJQA4KT2oAdsx1oGHA4FAiUDgUAFACUgFoGJQIKYBQA6gAoAWgAJxQBE8vYUARE5oAQc0wF6UgLVtMVYc1nOJrCRswMHXOetcslY6ou5MbYv93vUplWuW4LBuCSOalyKUTSji8tRuIJrJmiViC9vBGpA9KuMTOUjAurwlsE10RiYORUAkuZAq55qrqJNmzXhsFhh5HOOtYOV2bqNkY+oJlyBXRTZhURmiMk10XOaxJtA4FADTGW4FADxBjk9aLhYG+WgBuCaAGY5piJhyKACgBKQC0DE70CCmAUAKKAFFAATgUAQsxNADKAEpgL0HvSAO1AD4vvYpMqJoW1zt4PasJRNoyNGG7wmc1k4mykWY9QJIGelTyF846TUto2g8nrQoEuZl3V+X6HNaxgZSkV4onncZpykkEY3N6wsViUO2BXNKVzpjGwuoXsVuu3I3Y6CiEHIU5qJzs8zTMSeAe1dkYJHHKbZDgdAK0MxRGAcmgB3+6KAE9zTAYwBOaBDSB2oAbigAVsUxD80hhQAUAIaACmIKAFoAWgBGOBzQBDmgBrDFACUAPwCtAxp9KBCocMKGNblkrn5gcGskzVoPMkUY7UWQrsclw49c0nFD5mKZJX9qNEGrHRRZPPJqXIuMTUthHbL5kpA+tYu8nZGytFXYy61iR/kg+Vf73c1cKK3ZnOs+hmvIS2WJZjXQkkc7dxu0seeBTEO4XpQAhIzQAjSgdDQBGZVHWmIaZx2FFguMMpNOwBvzQA7r0pAA4oAdmgBaAEPWgApiCgBaACgCOQ84oAZ3oAcAD1pDGshX6UxAjYNACsM8igYgHSgEWo+VrFmyFxg0hkihcVLuUhwAJpABuFj4TBPr2qlBvclztsRPK0jZdsn3rVRS2MnJvcbuLdPzpiDKr7mgBN9ADGlGeuadguRtITRYVxmSaYgxQAEUAJTAKQChsUAPDUDHKaQD6AEoAKACmIKAAsB1oAhdsmgABHegBR7UASKcjFIY1o+4ouFhoODyKAHbQeRQMliNZyRcWSt61JY0yBBTSuJysRtKz8dB6VaikZuTYnI71RIAd2oAQyZ6cUAN3gUWC4wuWp2EJg0AABPSgBwRqAHCI0h2F8sUXCwhQelACeWMUBYaUIpiEFAD15NIZIKACgAoAKYhrNigCNiTQAlACUwFBI70gF30AOEvrSsO47KtwaAGlSvIoAVGw3saTQ0yZ5Nq+/aoSuy27IhALda0Mx3ygdSaAGmQjpiiwXGM5PWnYQ3mmAoFIB6rSGSBM9eKAHbcHAoGO2kUgDbmmAhWgBCKAAjigBhFAhjLmmIVOOKAH0hh3oASgBGOBTERmgBKAFoANuaAE2mgA2mgAxQAY96AF3MO+RQAZzyOtADifU5pWHcbvY9KdhBgnrQAbcUAGwmgByxetFx2JAFHSkA4UDDcKAHBlxxSAXOaAFzQAdqADFADSopiIyMGgBCKAGGmIcpzSGL3oAKAI2OTTENzQAUwFFIBRQAE0AJgmgBdgHWgBnfigBRnFABQAoA+poAUnHagY3JoEKCe1ABl6ADc1AAHNFgHh6Qxy80AO6UDFB5oEPpDHUAJnFADTimA0nNAhhoAaaYCdDSAfQA1jgUAR0xBTAWkAtABnNAChc9aAHfoKQyNm3HA6UxCqtJsdgIwM0AKNpPPSgBV+bhRgetIYeX607isGz0FFwGFSKYh6NuGDSGKVoAbtyPemALweaBEq4zSGPIBoATb3oAdwKBhmkAhPagBp6UxDaADNADCOaYBikA6gCNzzTQhlACgUALQAdaAHAcZoAcBSGMds8DpTAFWkA9sgcdKQxGGVGOlMGIFyOKLisSACNcHr6Cp3K2HKTtIbBz09qOoAPQUxCGPigCFlKnIpiHo24deaAHMKAGbSDkUAG/BoAlVwfY0APPIpDDHrQAmfSgBM5oAQ0xDKAENACZ5pgBpAf/Z	image/jpeg	{}
e6fed39e-c171-4efe-b32d-9e5067165b57	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	Yr's Tower		{"location_type": "Building"}	visible	2025-11-12 11:04:18.902+00	2025-11-14 16:32:32.483+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
7df2a55b-dba9-4e55-80a1-7994af54dd71	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Willam Castoak	A Young Lordling of Castoak who tragically died during the attack on Birthright Manor at the age 13	{"Race": "Human", "Type": "Political", "Status": "Dead", "cause_of_death": "Stabbed to death by The Host"}	visible	2025-11-09 18:57:46.202+00	2025-11-14 16:34:01.02+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
63c8c6a0-342f-41f1-8d2d-c0674cdf80f8	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	The Lotus Wall	A wall in Cloverfell where paper lotus's with peoples wishes are added to the wall./	{"location_type": "Area"}	visible	2025-11-14 22:05:47.445+00	2025-11-17 11:41:37.765+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
9ff040f7-05ca-42c5-b8e3-22ffcaf7bc18	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Alren Voss	A high ranking politician in Cloverfell and spokesperson for Joridiah Bleakly.	{"Race": "Human", "Type": "Political", "Status": "Alive"}	visible	2025-11-17 20:46:31.57+00	2025-11-17 20:46:31.57+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
7312c336-6135-4e34-b378-53cf150d8c43	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	The Ram District		{"location_type": "District"}	visible	2025-11-10 14:51:56.499+00	2025-11-14 16:32:32.485+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
236d1e4b-5aaa-42e3-af9b-82039003b208	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Zite's Seeker	A mysterious seeker has become attached to Zite.dd	{"Race": "Unknown", "Type": "Seeker", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.221+00	2025-11-14 16:32:32.486+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
34290b5a-758e-4537-a3bf-d6209dd94104	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Topher King	Masters student at academia who is currently working on a thesis in order to become a Scribe	{"Race": "Human", "Type": "Academic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.172+00	2025-11-14 16:32:32.494+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
44429f9d-bef8-4273-81a2-ebccb1d73073	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Tober Stone	The weird cult guy who spoke to Zite when leaving Boulder	{"Race": "Human", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.167+00	2025-11-14 16:32:32.494+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2c3f46cb-c7a5-4df0-802a-194338718f8a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Thorien Sylvaris	Spellweaver and Lord of Aura. A Kind older elf that showed Hans the political ropes in Aura	{"Race": "Auran Elf", "Type": "Official", "Status": "Dead", "cause_of_death": "Dragon ice."}	visible	2025-11-09 18:57:46.164+00	2025-11-14 16:32:32.495+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
adc9b5cd-b294-4111-9e3e-bd8f35922dae	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Friday Hinderwane	Son of March Hinderwane	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.81+00	2025-11-14 16:32:32.607+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2d7fe49f-9553-4ffb-a641-d9dc1294667b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Frederick Woolward	Leader of Wuldens crossing and current client for the agency	{"Race": "Human", "Type": "Leader", "Status": "Dead", "cause_of_death": "Stabbed to death by The Host"}	visible	2025-11-09 18:57:45.807+00	2025-11-14 16:32:32.607+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f9e9cef4-59f6-4173-9fca-f30b2c9520a9	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Forenzo Washman	Owner of The Fisticuffs Inn in Boulder. A frail looking man who wears an oversized horned helm.	{"Race": "Human", "Type": "Innkeeper", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.803+00	2025-11-14 16:32:32.608+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3cbe7034-3602-45c2-a160-6eb46ef1c212	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Floran Hammerhorn	Port captain and mayor of Pendleport. This silver dragonborn has a distinct hatred for Percival Forester.	{"Race": "Dragonborn", "Type": "Offical", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.8+00	2025-11-14 16:32:32.609+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
7c1da6c8-7062-459e-8a65-8038941ead88	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ferdinand Heracles	An artist who used a magical tool to create cursed art	{"Race": "Human", "Type": "Civilian", "Status": "Dead", "cause_of_death": "Eldritch Blasted from behind while fleeing from Zite."}	visible	2025-11-09 18:57:45.797+00	2025-11-14 16:32:32.61+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3ac1bdbe-bcdd-42fd-bedf-eeeb634b368b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Faye Yolgur	Youngest of 6 sisters, this hag inhabited muddlerong swamp and fed of the nightmares of anybody she captured	{"Race": "Hag", "Type": "Marked", "Status": "Dead", "cause_of_death": "Mauled to death by a bear while fighting the Golden Rose Agency"}	visible	2025-11-09 18:57:45.793+00	2025-11-14 16:32:32.611+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3e4fb933-a6a2-4bc0-8c9c-b2bd858b0912	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Writgiest	An ages old lych held captive in a mysterious structure deep below Timberton. Revealed to be a Great Spirit of Old	{"Race": "Great Spirit", "Type": "Marked", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.161+00	2025-11-14 16:32:32.496+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9f2b0263-29a1-4831-bac6-536f6f640d04	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Weaver	A giant spider that lives in the obsidian bath house. Known to lead the Fence's Truce an alliance of Fences in the city	{"Race": "Arach", "Type": "Criminal", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.156+00	2025-11-14 16:32:32.497+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1397f7b3-421a-425d-b2fc-9d174621726c	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Manhunter	A vicious mercenary who was hired to terrorise Varatheia. Currently imprisoned in the Deepseed	{"Race": "Tabaxi/Hobgoblin", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.152+00	2025-11-14 16:32:32.498+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
12db5a29-3bb2-4e5c-912a-bd462ea87b96	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Griefeater of Kelemvor	A fallen agent of Kelemvor devours the hearts of those in grief. Currently bound to hunt and kill Ashe Cottontail	{"Race": "Celestial", "Type": "Celestial Entity", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.149+00	2025-11-14 16:32:32.498+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f2b904c9-63c6-4a46-9ea1-317bea6df5a8	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Greatwood Beast	A Spirit that represented The Great Wood. Now diminished the spirit is no more. The last tree of the Great Wood.	{"Race": "Great Spirit", "Type": "Spirit", "Status": "Dead", "cause_of_death": "Forgotten."}	visible	2025-11-09 18:57:46.146+00	2025-11-14 16:32:32.499+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
88e6724d-a00b-4383-8eb5-1d15590cbb5d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Grand Luminary	An elderly man and Leader of the Lanternlight Covenant.	{"Race": "Human", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.143+00	2025-11-14 16:32:32.5+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
06b1173c-3c06-43ab-987c-fe8a317ba870	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Blood Druid	A mysterious ancient Blood Druid that was imprisoned within a Demon Head. Wrote the druic book of hemomancy	{"Race": "Wood Elf", "Type": "Religious", "Status": "Dead", "cause_of_death": "Impaled by Ashe's Blood Magic"}	visible	2025-11-09 18:57:46.14+00	2025-11-14 16:32:32.501+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
23a20abc-f28f-4d92-94ca-0db47e1a767b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	The Adamantine Wizard	A Wizard Clad in Green. Currently being pursued by The Brandmen Aria & Gilead as well as Eliza Nocaster	{"Race": "Human?", "Type": "Wizard", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.137+00	2025-11-14 16:32:32.502+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
6dce192b-de28-4e37-9208-1744ee6c5ab5	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Thaddeus Ironheart	Leader of the Fortress Town of Herald's Rest. Specialises in "Siege Breaking"	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.133+00	2025-11-14 16:32:32.502+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f1bb9d8c-7d1b-41d6-b111-7d8a0a213fef	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Stone King Grimace	A Strange Stone Statue who has communicated with the Golden Rose Agency through a large stone door	{"Race": "Stone Statue", "Type": "Seeker", "Status": "Other", "cause_of_death": ""}	visible	2025-11-09 18:57:46.13+00	2025-11-14 16:32:32.504+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1670a443-7069-45ea-a6a1-7a408772e8fe	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Stewart Bison	Assistant to Frederick Woolward	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.127+00	2025-11-14 16:32:32.505+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9effbec1-8e34-456c-b5e5-c52c5703b87b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Skartabel	Mayor of Feather Falls	{"Race": "Aarakocra", "Type": "Official", "Status": "Dead", "cause_of_death": "Eaten whole by The Flame while attempting to fly away from Birthright Manor"}	visible	2025-11-09 18:57:46.124+00	2025-11-14 16:32:32.506+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9e2f6e0d-ec37-41e6-93de-ce94f311126f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Sir Night	Chosen by the Lord Castoak himself Sir Night was given the Soul Cleaver, a blade that cna vanquish spirits.	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.121+00	2025-11-14 16:32:32.506+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d8271f29-d716-4b01-a1d5-129266731fef	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Sidwell Burke	Leader of the Theian Theives and father to "Burke"	{"Race": "Curian", "Type": "Criminal", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.118+00	2025-11-14 16:32:32.507+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
304ef7ac-19f0-426f-bec1-e09b53442dd6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Seri Lonesinger	High Seeker to the Lords of Aura.	{"Race": "Hopeward Elf", "Type": "Seeker", "Status": "Dead", "cause_of_death": "Revealed to be The Host during the Slayer's Ball. Presumed killed by The Host although whne and where is unknown."}	visible	2025-11-09 18:57:46.115+00	2025-11-14 16:32:32.508+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
55ad31ca-0dc1-4f41-80c7-4266743bf541	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Seraphina Birthright	Mother of Emerion Birthright and devious socialite.	{"Race": "Auran Elf", "Type": "Civilian", "Status": "Unknown", "cause_of_death": ""}	visible	2025-11-09 18:57:46.112+00	2025-11-14 16:32:32.509+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c30260a7-0b9b-4497-9f08-4cd0ac920b8b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Selene	Sorcerous of Adwell Academy specialising in magical beasts	{"Race": "Palid Elf", "Type": "Wizard", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.109+00	2025-11-14 16:32:32.509+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
78ae5ab1-2a74-4c70-a74a-60a2f0caa792	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Sebastian Starlight	Representative for the Griffin District. Extremely flashy and loved by many in the Griffin.	{"Race": "Halfling", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.106+00	2025-11-14 16:32:32.51+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
31f92c66-9eaa-4366-8ea2-df9223ddc97c	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Sebastian Fundlewalder	Blacksmith of Timberton.	{"Race": "Human", "Type": "Store Owner", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.103+00	2025-11-14 16:32:32.511+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
6b8ad924-7f11-41e9-bbc6-43b0e0f539c6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Scribe Pewter	Scribe serving Archivist Knox investigating Costuan Fifthathkaraz	{"Race": "Human", "Type": "Academia", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.1+00	2025-11-14 16:32:32.512+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2e6fac12-84c9-4586-88a9-0fc59baaee5c	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Scribe Moss	Scribe serving Archivist Knox investigating Costuan Fifthathkaraz	{"Race": "Human", "Type": "Academia", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.097+00	2025-11-14 16:32:32.513+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d9bc3873-6245-42fd-8158-28a770c32451	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Scribe Luna	Scribe serving Archivist Bellum in the Temple of the Writgiest	{"Race": "Half-Elf", "Type": "Academia", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.094+00	2025-11-14 16:32:32.513+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d65d825e-0477-4a56-a8bf-8601003b80ea	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Scribe Casper	Scribe serving Archivist Bellum in the Temple of the Writgiest	{"Race": "Human", "Type": "Academia", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.091+00	2025-11-14 16:32:32.514+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9e599d67-8892-4021-8f20-2fbf36a3a41f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Sal Gobblemane	A Half-Orc wanderer who works for The Golden Rose Agency.	{"Race": "Half-Orc", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.088+00	2025-11-14 16:32:32.515+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
584724de-1393-495c-b3e5-346f95d6172a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Saffron Garyl	A Divine Alchelite from Hulton, currently searching for Professor Strictwell in Varatheia.	{"Race": "Alchelite", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.083+00	2025-11-14 16:32:32.515+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
affe56db-904d-4fac-8765-4d4419621dd6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Rupert Robbins	Friendly Man of the Stave who helped us in the forest	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.08+00	2025-11-14 16:32:32.516+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
7edcc7ad-f94e-4ff1-b50f-d709898ed8aa	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Rose Stillwater	A Ghost residing in Illmark, Mother of Keyleth Stillwater	{"Race": "Human", "Type": "Civilian", "Status": "Undead", "cause_of_death": "Simply lost her way."}	visible	2025-11-09 18:57:46.074+00	2025-11-14 16:32:32.517+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3319b9ca-8323-4307-848a-2d939e3e58c2	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Roderic Flameforge	A Lord of Gurawin, an old dwarf who was keen to show of his magical hammer during a duel at the Slayer's Ball.	{"Race": "Dwarf", "Type": "Political", "Status": "Dead", "cause_of_death": "Stabbed by The Host while fleeing Birthright Manor."}	visible	2025-11-09 18:57:46.071+00	2025-11-14 16:32:32.518+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
e5ae05a4-0310-437b-9262-b5bbf97fe161	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ringmaster Ustrina	Ringmaster of Ustrina Macabre	{"Race": "Human Spirit", "Type": "Marked", "Status": "Dead", "cause_of_death": "Run through by Hans Freeguard and dragged to The Nine Hells."}	visible	2025-11-09 18:57:46.068+00	2025-11-14 16:32:32.518+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
14a96733-4c9c-44bc-a94e-e72f5e28b843	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Rasphodamus	A giant horse-like celestial creature that seems to have an interest in Hans	{"Race": "Celestial", "Type": "Celestial Entity", "Status": "Other", "cause_of_death": ""}	visible	2025-11-09 18:57:46.065+00	2025-11-14 16:32:32.519+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
91978c2c-6752-443f-a5e0-63f14939d11e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Quinn Oloqen	Son of Lumis Oloqen, has asked to join The Golden Rose agency	{"Race": "Half-Elf", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.062+00	2025-11-14 16:32:32.52+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
27f81544-17d8-42cf-871c-22d1cb65c129	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Quillan Taikijan	Gnomish Wizard of Academia, Head of Enchantment. Did not like the current leadership of Deevus Academy	{"Race": "Gnome", "Type": "Wizard", "Status": "Dead", "cause_of_death": "Died during the attack on Birthright Manor."}	visible	2025-11-09 18:57:46.059+00	2025-11-14 16:32:32.521+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
bfe4e1fb-77e2-426e-87c7-812eb187957d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Po Sorrowsword	The "Poet" of Boulder, a warlock of a celestial entity who pretends to be a wizard	{"Race": "Half-Elf", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.056+00	2025-11-14 16:32:32.522+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2f8fc49e-a21a-4a92-9191-f32229b3f1a2	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Percival Forrester	The previous reeve of Folksweaven before Uriel Thorns return. Was ousted from the town by Uriel and the party.	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.053+00	2025-11-14 16:32:32.523+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1819e56a-eb9c-48cb-a552-ff622e22d895	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Pallas Lodestone	A Dwarven Deacon of the Temple of Thunder in Boulder	{"Race": "Dwarf", "Type": "Religious", "Status": "Dead", "cause_of_death": ""}	visible	2025-11-09 18:57:46.05+00	2025-11-14 16:32:32.523+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
01e3e6be-bb7b-4a6e-9658-d947347fe82f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Orlamec	An ancient Wizard who founded void magic. Writer of "A Glimpse of the Void".	{"Race": "Human", "Type": "Wizard", "Status": "Dead", "cause_of_death": "Unknown."}	visible	2025-11-09 18:57:46.046+00	2025-11-14 16:32:32.524+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
da520ff6-5280-4b8f-baa1-8bbc2cd2004b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Denial	Golden Tiefling lawyer, works out of Varatheia	{"Race": "Tiefling", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.745+00	2025-11-14 16:32:32.621+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f2dc1a44-11fe-49a8-94dc-b4f587fe67b0	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ori Glassblower / Yolgur	Brother of the coven of Yolgur. Is currently seeking to destroy his 6 (now 5) sisters. Member of the Lumin Commision.	{"Race": "Hexblood", "Type": "Entertainer", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.043+00	2025-11-14 16:32:32.525+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
bd923bf5-3071-425a-b07b-b8f2931ece1b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Oliver Fairfax	Owner of the successful and extremely corrupt Fairfax Auction House in Varatheia. Has a history with Vedast.	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.039+00	2025-11-14 16:32:32.525+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
541db7a3-aa89-4423-979f-a542c17e6a2b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Obsosa Shreldin	A Drow Matriarch who is currently having trouble with the Dungeon Master. Has requested the agency gain the Rune of Jera	{"Race": "Dark Elf", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.035+00	2025-11-14 16:32:32.526+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b26d6f7a-08fe-4ab6-b6a8-dc801621d816	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Obadiah Dimm	Curian Innkeeper of "The Delve Inn". Extremely connected and guardian of the secret entrance to The Quartz Maze.	{"Race": "Curian", "Type": "Innkeeper", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.031+00	2025-11-14 16:32:32.527+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0d7a01a9-0027-4fa6-a053-7acce2314cc2	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Northumbert Masters	Hans Freeguard's man-servant	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.028+00	2025-11-14 16:32:32.528+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
a98d2a2e-12cd-4b81-94bf-90f305e40970	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Noridia the White	A follower of The Morninglord currently working with The Golden Rose Agency	{"Race": "Aarakocra", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.025+00	2025-11-14 16:32:32.528+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
6872bbc6-d046-4bf6-99d7-63fd3494d6b2	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Nia Vekenall	Owns a carpentry shop in folksweaven. Once delivered a message for Hans.	{"Race": "Wood Elf", "Type": "Store Owner", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.022+00	2025-11-14 16:32:32.529+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
923ed4a0-5569-49f7-8d0a-d96668424058	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Neviem	This sinister Deep Dragon lives on the akrid lake beneath Feather Falls and sleeps on a hoard of secrets	{"Race": "Dragon", "Type": "Marked", "Status": "Dead", "cause_of_death": "Dagger through the heart while fighting The Golden Rose Agency"}	visible	2025-11-09 18:57:46.018+00	2025-11-14 16:32:32.53+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f046b94b-76ed-46c0-9427-bb89b8188879	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Mythandra Hammerhorn	Captain of "The Mistwind" a trading ship in Castoak Bay.	{"Race": "Wood Elf", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.014+00	2025-11-14 16:32:32.531+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
fa182ab9-8dcf-4e8f-9a05-d2c2748422b7	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Mottle Grouse	Practitioner of forbidden arts and collector of lost knowledge	{"Race": "Halfling", "Type": "Wizard", "Status": "Dead", "cause_of_death": "Flung from a bridge in the veil by Lurapherum."}	visible	2025-11-09 18:57:46.011+00	2025-11-14 16:32:32.531+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4a8301d2-4017-4912-95cc-7d468fb35615	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Mother	You don't know.	{"Race": "Void Entity", "Type": "Mother", "Status": "Other", "cause_of_death": ""}	visible	2025-11-09 18:57:46.008+00	2025-11-14 16:32:32.532+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4c4c3f04-2c66-4dc8-8114-9d626a8d8a69	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Morwen Fireheart	A Red Dragonboarn fire elementalist who attended the Slayer's Ball. Logical in her thinking, she is very suspicious of Zite.	{"Race": "Dragonborn", "Type": "Sorcerous", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.004+00	2025-11-14 16:32:32.533+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
a84b95f3-4786-452d-b769-be4b37e100fe	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Mortigan Reece	A Brandsman on a Diplomatic mission in Pendlescape. Is leaving on the Royal Escutcheon	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:46.001+00	2025-11-14 16:32:32.534+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b85de4c2-1ef7-4e33-b244-8abbf76d3c5a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Mirakan	A nomadic druid travelling Salfordia.	{"Race": "Human", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.998+00	2025-11-14 16:32:32.535+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4d13b7cf-2c06-4203-878f-390df41235dc	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Miraka Istria	Once protected the Lady Ainesilver during her time in Boothsport, was replaced and is now missing	{"Race": "Auran Elf", "Type": "Military", "Status": "Unknown", "cause_of_death": "Presumed killed by Changeling but we just don't know."}	visible	2025-11-09 18:57:45.995+00	2025-11-14 16:32:32.535+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
04fea315-82b7-40ff-b57b-a81eef70c279	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Matthew Novella	Servant for Emerion Birthright, event organiser.	{"Race": "Human", "Type": "Civilian", "Status": "Dead", "cause_of_death": "Revealed to be the Host during the Slayer's Ball. Presumed killed by The Host sometime before the Ball took place."}	visible	2025-11-09 18:57:45.992+00	2025-11-14 16:32:32.536+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
ccdda011-bc1d-47e5-9b72-b261b4448b71	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Markus Welch	Representative for the Rat District	{"Race": "Human", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.989+00	2025-11-14 16:32:32.537+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
53919d5d-f71d-4a66-81d7-ee1246861186	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	March Hinderwane	Matriarch of the Hinderwane family and owner of the Hinderwane Bathhouse	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.985+00	2025-11-14 16:32:32.538+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2a57cc9c-aa58-4900-9e50-2e3c88e8a6b5	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Malachai Marsh	Representative for the Owl District. Head of the Theian School of Necromancy. Member of the Lumin Commision.	{"Race": "Half-Elf", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.982+00	2025-11-14 16:32:32.539+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
03f28885-b20f-4748-86e6-d0c8043871e1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Mahogany Pitch	The last remaining Druid of the Circle of the New Moon	{"Race": "Shifter", "Type": "Druidic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.979+00	2025-11-14 16:32:32.54+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
651433d2-afd5-4994-955d-4e956bdb1329	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Luza Goada	Head Priestess of the Icedawn Temple in Lillian's Rest.	{"Race": "Air Genasi", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.975+00	2025-11-14 16:32:32.54+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
180af2c3-f627-40b4-a4f0-e2b6d2a07027	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Luraphadrum	Luraphadrum the unending watches from without to within.	{"Race": "Void Entity", "Type": "Void Entity", "Status": "Other", "cause_of_death": ""}	visible	2025-11-09 18:57:45.972+00	2025-11-14 16:32:32.541+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b482ff21-f67e-4e01-a99f-53e916143168	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lumis Oloquen	A father of three own's Oloquen Lodge, a isolated lodge that promises to board all wanderers who pass through the area.	{"Race": "Half-Elf", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.968+00	2025-11-14 16:32:32.542+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
aff2a579-6277-4cee-9975-96d8113c1e05	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lucia Laluna	Representative for the Imp District. Owner of Fiendfall theatre.	{"Race": "Aarakocra", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.965+00	2025-11-14 16:32:32.543+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4a99883b-cd27-47b2-af8c-097d7b924b2a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Loyal	An aspiring seeker. Gave the Agency the contract for Yolgur.	{"Race": "Tiefling", "Type": "Seeker", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.962+00	2025-11-14 16:32:32.544+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
497917e4-5278-4175-81a1-0f1f51ba5097	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Louise Woolward	Daughter of Frederick Woolward	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.958+00	2025-11-14 16:32:32.544+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9dd09cde-5db4-4bec-baa0-a8e731b51be6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Louise Thomason	A Cadisian Engineer working on the Royal Escutcheon, travels with a Cadisian Soldier.	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.955+00	2025-11-14 16:32:32.545+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
a8f64d6f-0f73-43f0-9aff-26262f9f423d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lorin Willowinter	Representative for the Theian outlands	{"Race": "Human", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.952+00	2025-11-14 16:32:32.546+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
bfd49d99-f5b4-4776-8513-c527b8122514	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lorelia	A mysterious eladrin priestess that inhabits a ruined temple of Eldath in the Stetcoln woods	{"Race": "Eladrin", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.949+00	2025-11-14 16:32:32.547+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9a5d6371-f4d4-450c-9579-691f2475424a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lord Aiodin Ainésilver	Lord of Aura. Father of Elara Ainésilver. Currently has Aura in lockdown.	{"Race": "Auran Elf", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.946+00	2025-11-14 16:32:32.547+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
abd3b429-0729-43bd-940a-705299c3f605	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lomas Wild	Surveyor whose team went missing in the Muddlerung marshes	{"Race": "Human", "Type": "Store Owner", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.943+00	2025-11-14 16:32:32.548+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
edb1d18f-b114-4798-862b-47f9c4805528	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lock	The Carrion Caller of Aura	{"Race": "Tabaxi", "Type": "Carrion Caller", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.94+00	2025-11-14 16:32:32.549+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1641e2c2-c562-48fc-9536-56cee4574bf4	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lillian Birch	Barmaid at the Wily Druid and talented artist.	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.937+00	2025-11-14 16:32:32.55+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1a9a8ae8-e0b9-41c3-ad44-d85c1a54ab20	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lilla Bucklenut	A halfling archeologist exploring the Hammerhorn Vale	{"Race": "Halfling", "Type": "Academic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.933+00	2025-11-14 16:32:32.551+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3b8ed7f1-bbbf-4bc6-a9dd-4237f8ed9e02	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Lee Fanderwin	Innkeeper of The Modest Lamb	{"Race": "Human", "Type": "Military", "Status": "Unknown", "cause_of_death": ""}	visible	2025-11-09 18:57:45.93+00	2025-11-14 16:32:32.551+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
e97573db-71f7-4e5d-be5c-789443828662	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Kylian Wildborn	Large barbaric curian who arrived with Jexeris during the Slayer's Ball	{"Race": "Curian", "Type": "Unknown", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.927+00	2025-11-14 16:32:32.552+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
64845bb0-e5ae-4959-8b57-de87f7308021	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Kulxol Jacarth	A Black Dragonborn who works at the Altar of Helm in Boulder	{"Race": "Dragonborn", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.924+00	2025-11-14 16:32:32.553+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
87a4451e-08f4-4684-9fcd-334effa7a620	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Korendar Ainesilver	Cousin of Elara Ainesilver and tentatively next in line to the Ainesilver Estate.	{"Race": "Auran Elf", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.921+00	2025-11-14 16:32:32.555+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
315f6245-831f-4e59-bc95-85cc188ae5bd	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Killiam Crownbreaker	The Champion of Boulder, a cocky lordling who is an expert at jousting, was killed during a match in Boulder. Last of his line.	{"Race": "Human", "Type": "Celebrity", "Status": "Dead", "cause_of_death": "Death by poisoned lance."}	visible	2025-11-09 18:57:45.917+00	2025-11-14 16:32:32.558+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
ad574aeb-c97b-45b0-82a8-45fb2748495a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Khul	A Half-Orc ranger who gathers Spider Silk in the forelands. Wanted by the Hopeward guard	{"Race": "Half-Orc", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.914+00	2025-11-14 16:32:32.561+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
7b5dc87c-e088-4e16-b353-0978866d3b49	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Keyleth Stillwater	Daughter of Rose Stillwater and member of Morse's sect of Kelemvor.	{"Race": "Human", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.911+00	2025-11-14 16:32:32.562+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
6488c2f3-a5d4-49cc-803e-764a2c4fed8e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Katlyn Wellspring	Halfing mayor of Fairburg and close friend with the Birthright Family	{"Race": "Halfling", "Type": "Political", "Status": "Dead", "cause_of_death": "Revealed to be The Host during the attack on Birthright Manor. Presumed killed by the host although when is unknown."}	visible	2025-11-09 18:57:45.908+00	2025-11-14 16:32:32.565+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
88d40f37-bea8-439c-9707-4e08a4b8a15e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Kathleen Bottlebell	Owner of the Waxworn Inn along the coastal road in Castoak. Has issues with the Lizardfolk of Muddlerong	{"Race": "Human", "Type": "Innkeeper", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.904+00	2025-11-14 16:32:32.566+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b4049b83-a867-4676-a88a-f434d231ce71	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Jupiter Knox	Captain of the guard in Diajora. Offered to work with the Golden Rose Agency.	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.898+00	2025-11-14 16:32:32.582+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b42495c3-7e65-4627-b01b-578773a58599	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Jexeris	A powerful and feared Tiefling that runs the Ninth Hell Jazz Club	{"Race": "Tiefling", "Type": "Criminal", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.892+00	2025-11-14 16:32:32.584+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c9cfe478-047f-46ba-ae61-a873ab96981e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Jennifer Stone	Auramancer and Cleric of Kelemvor	{"Race": "Kalashtar", "Type": "Auramancer", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.888+00	2025-11-14 16:32:32.585+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0c0787c5-9742-4b0b-bc69-db10b58ff247	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Jadayan Dewater	The human leader of the town of Lowing and owner of Logwin Rosewood	{"Race": "Human", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.884+00	2025-11-14 16:32:32.586+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c7f86be2-058f-476b-81ef-97830fdbf176	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ivan Gothandar	A human blacksmith who's son Percy was taken by the Demon Head in the Foragol Woods	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.881+00	2025-11-14 16:32:32.587+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
61c10a9d-696b-4f82-a486-86966514390d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Isolade Frostfell	Lady of the Evershade forest, once watched Hans get destroyed by Uther Ghostfell in a duel	{"Race": "Wood Elf", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.878+00	2025-11-14 16:32:32.588+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d9147e94-44e2-4395-b935-1bbf8f416bee	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Iris Goodall	Representative for the Lanternlight Covenant. No nonsense. She carried a longsword made of light.	{"Race": "Pallid Elf", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.875+00	2025-11-14 16:32:32.589+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
2e16949e-fa45-401d-9409-d4d053a46fbb	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Imakith the Skinweaver	Zite's ex-patron, The skinweaver, pact-breaker and daughter to Baalzebul Lord of the Seventh Hell.	{"Race": "Fiend", "Type": "Fiend", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.872+00	2025-11-14 16:32:32.589+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f674bd16-9c69-49ad-af36-db195bceb306	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Illuminator Kryn	Aarakocra illuminator of the Lanternlight Covenant. Member of the Lumin Commission.	{"Race": "Aarakocra", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.869+00	2025-11-14 16:32:32.59+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d1fc015e-1d5c-4661-b662-8cc602702d15	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Idlith	The creator and leader of Skeletown. Inhabits the body of Rose Stillwater	{"Race": "Human Spirit", "Type": "Leader", "Status": "Undead", "cause_of_death": "Unknown."}	visible	2025-11-09 18:57:45.863+00	2025-11-14 16:32:32.592+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
41810f3d-0fd4-407f-bd1c-e08c30fa64d1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Illian Goldmane	Mayor of Boulder.	{"Race": "Leonin", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.866+00	2025-11-17 18:41:53.585+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
ce113c27-fa54-4731-a40e-e5c6daa52a3f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Hyglyn	Leader of the Circle of the New Moon (Wolf Shifters)	{"Race": "Shifter", "Type": "Druidic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.86+00	2025-11-14 16:32:32.593+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c88f379d-9330-4c55-9723-12f79574fc33	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Hyacinth Hallite	Representative for the Mare District	{"Race": "Human", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.857+00	2025-11-14 16:32:32.594+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b3b0e1d6-10c1-4380-9104-10a7ed303a5e	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Hollyar	Cleric of the high elves, Now follows the old ways and protects the spriting of The Withered Woods	{"Race": "Auran Elf", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.854+00	2025-11-14 16:32:32.595+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1ef1b6c2-35ce-4ecc-8b60-83b3203d7700	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	High Priestess Liara Morse	High Priestess of Kelemvor. Does not take kindly to idiots.	{"Race": "Human", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.85+00	2025-11-14 16:32:32.596+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
54f63d4a-6334-492c-baa3-bd302aa63312	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Haven	Half-orc Paladin of Kelemvor. Died during the sundering of Lucernus.	{"Race": "Half-Orc", "Type": "Religious", "Status": "Dead", "cause_of_death": "Disintegration by Beholder during the Sundering of Lucernus."}	visible	2025-11-09 18:57:45.847+00	2025-11-14 16:32:32.597+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
e6a87692-4223-490e-ade1-05c31c36172b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Harry Bell	A Novice archer that was on that bridge that one time	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.843+00	2025-11-14 16:32:32.599+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
6602363f-5e5f-4f38-b66a-adedf56a4fe6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Harbo Bizzlebub	An adventurous gnome wizard from long ago. Zite holds his journal. He was last seen travelling southward out of Pendlescape	{"Race": "Gnome", "Type": "Academic", "Status": "Unknown", "cause_of_death": ""}	visible	2025-11-09 18:57:45.839+00	2025-11-14 16:32:32.6+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
17db8fa3-d267-4d70-86f1-58d1d8c3ac19	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Hans Freeguard	A Lord of Aura, cast out from his home in Boothsport. He is currently working with The Golden Rose Agency.	{"Race": "Human", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.836+00	2025-11-14 16:32:32.601+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	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	image/jpeg	{}
7867b34d-afe2-4c23-a298-7387168d8f85	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Glorandel Gaelin	Diplomat representing the High Elves of Aura	{"Race": "Auran Elf", "Type": "Official", "Status": "Unknown", "cause_of_death": ""}	visible	2025-11-09 18:57:45.832+00	2025-11-14 16:32:32.601+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
e4636c86-6754-4fd8-ba36-188b9fda69db	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Frozen Illathyn	A Powerful white dragon known to slumber beneath a large frozen lake in the Hopeward Ice Fields	{"Race": "Dragon", "Type": "Dragon", "Status": "Dead", "cause_of_death": "Killed by the flame during the slayers ball"}	visible	2025-11-09 18:57:45.813+00	2025-11-14 16:32:32.606+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
ee2ec5e9-021b-412b-9c81-1d274c786f97	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Fairfax Boggart	Innkeeper of the Wily Druid	{"Race": "Human", "Type": "Innkeeper", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.79+00	2025-11-14 16:32:32.611+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
a506000b-869a-4765-ae09-409139c9dbb5	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Elowyn Mistral	Archmage of Drakemouth, this kindly mage was against Lord Bleakly's attempt at taking the Divine Astrolabe	{"Race": "Half-Elf", "Type": "Wizard", "Status": "Dead", "cause_of_death": "Stabbed through the heart from behind by The Host"}	visible	2025-11-09 18:57:45.776+00	2025-11-14 16:32:32.614+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d7ba62e9-f3e4-4063-b6d7-ec85b6fabf50	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Eliza Nocaster	Quarter-elven seamstress. Subject to the Adamantine Wizards manipulations during which she lost her family.	{"Race": "Quarter-Elf", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.773+00	2025-11-14 16:32:32.615+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
392103af-0fd5-4072-aacb-d049ce81baa8	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Elder Fawng	Leader of the Lizardfolk in Muddlerong Swamp	{"Race": "Lizardfolk", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.769+00	2025-11-14 16:32:32.616+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
cd12e73d-4049-4289-8cc5-d9f95601ccdf	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Elara Ainesilver	Ambassador of the Auran Elves. Once travelled to the Worsley Woods to negotiate peace. Ex-lover of Hans Freeguard	{"Race": "Auran Elf", "Type": "Political", "Status": "Dead", "cause_of_death": "Stabbed by Balthin Tamsin during an escape attempt."}	visible	2025-11-09 18:57:45.761+00	2025-11-14 16:32:32.617+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
92e85ae9-7134-44dd-b813-594429dccb01	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ecstron	A figure from Ashe's past has warned that Ashe must return before the ritual moon in two months.	{"Race": "Shifter", "Type": "Druidic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.758+00	2025-11-14 16:32:32.617+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9f237bf1-d6bd-4f77-ab4a-42f1a1728c45	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Dulmehier Wolfchreck	Bard and story teller with a habit of taking credit for others accomplishments.	{"Race": "Half-Drow", "Type": "Entertainer", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.754+00	2025-11-14 16:32:32.618+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
7f56150e-8fe6-4a9a-817b-819cf36212a8	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Dr Mary Armstrong	Assistant to Lilla Bucklenut	{"Race": "Human", "Type": "Academic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.748+00	2025-11-14 16:32:32.619+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
d17c17d6-2d04-494e-86b9-a7666cbbf657	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Deandra	Barmaid at the Wily Druid. Hans well fancies her.	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.742+00	2025-11-14 16:32:32.622+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3f593aae-9361-4f0b-9528-2f2408419d4f	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Datton Siltsorrow	Owner of The Cold Brew. Comes from The Carillon, a dwarven region far to the south	{"Race": "Dwarf", "Type": "Innkeeper", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.738+00	2025-11-14 16:32:32.623+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b83a4322-1879-4259-9609-1f6414b510d3	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Daskrudan	Ashes' father and arch-druid of the Circle of the Full Moon	{"Race": "Shifter", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.735+00	2025-11-14 16:32:32.624+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
93b3f97e-321f-4aee-9bff-9d4be9acc0d1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Daruk Stoneguard	Cleric of Tymora - Goddess of Luck. Leader of the temple in Timberton	{"Race": "Dwarf", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.731+00	2025-11-14 16:32:32.625+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
6ce1a5cc-9f77-4d35-983f-b07fb37ab44d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Dane Wintersprout	A man Hans beat at arm wrestling in Boulder.	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.728+00	2025-11-14 16:32:32.626+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9386672c-4e40-44b9-8afe-2228b210b982	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Cylus Thimble	The Theian Guard Captain of the Rat District	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.724+00	2025-11-14 16:32:32.627+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
95bd4a82-280c-4c57-9607-6786162e3fd6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Costuan Fifthathkaraz	Blue Dragonborn Artificer. On the run from the Archive Sanctorum.	{"Race": "Dragonborn", "Type": "Academic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.721+00	2025-11-14 16:32:32.628+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
15ae1b52-70e0-42e3-a679-9a17830ba8a3	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Casper Birthright	Brother of Emerion Birthright, currently holding the Shattermartyr and seeking adventure.	{"Race": "Half Elf", "Type": "Civilian", "Status": "Unknown", "cause_of_death": ""}	visible	2025-11-09 18:57:45.716+00	2025-11-14 16:32:32.629+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b22e6eac-96c4-429c-b971-bdee55eb6e94	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Captain Olrion Gyrelan	A captain of the Auran Guard that escorted the party to Aura	{"Race": "Auran Elf", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.712+00	2025-11-14 16:32:32.631+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0433393e-ca54-49b3-a17a-0af8014843b6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Captain Mystus	High Elf Captain and leader of Fort Hammerhorn.	{"Race": "Auran Elf", "Type": "Leader", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.709+00	2025-11-14 16:32:32.632+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
ec999cef-d827-4df1-b2c5-24970df69a38	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Captain Hollister Barwell	Captain and high up in the CCA	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.706+00	2025-11-14 16:32:32.633+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
3d7842a2-4488-4031-9c03-6fd2bc2bebd3	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Captain Burdock Rabbit	Captain in charge of the blockade south of Wuldens Crossing, Awesome tuba player.	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.703+00	2025-11-14 16:32:32.636+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
454dcca0-36d3-4468-a25c-4d291225d1b7	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Burke	Brigand and ex-member of the Na'er-do-wells a gang based in Varatheia. Claimed the town of Folksweaven	{"Race": "Human", "Type": "Leader", "Status": "Dead", "cause_of_death": "Bear attack while fighting the Golden Rose Agency."}	visible	2025-11-09 18:57:45.699+00	2025-11-14 16:32:32.637+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
17d59357-103a-4b22-beb3-4b6872ecc6ff	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Bubblewick, Huntley & Sprigolia	Owners of the Northern flower-fields of Wuldens Crossing.	{"Race": "Gnome", "Type": "Store Owner", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.696+00	2025-11-14 16:32:32.637+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0944817d-a6ac-468e-8a3d-335c2bed8b4c	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Brynarith Fanderwin	Half Hult-Elf Ranger and Monster Hunter working out of Folkweaven. Left for Hultshire during the Annexation.	{"Race": "Half-Elf", "Type": "Military", "Status": "Unknown", "cause_of_death": ""}	visible	2025-11-09 18:57:45.692+00	2025-11-14 16:32:32.639+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
dfc6af77-d05d-4a0e-974d-5fea8ad558d8	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Brandmaster Lionel	Leader of the Brandsmen. Once met Hans in Boothsport.	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.685+00	2025-11-14 16:32:32.64+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
02c018cc-e002-432a-b463-218ddfe7fdf5	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Borom	Ecstron's father and rival to Daskrudan. This shifter wishes to stick to the traditions of the past.	{"Race": "Shifter", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.682+00	2025-11-14 16:32:32.641+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
8a6c02e9-89df-42ea-a907-d5dce56d3f5d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Baradan Gloom	Black Dragonborn representative for the Wolf District. Member of the Lumin Commission.	{"Race": "Dragonborn", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.678+00	2025-11-14 16:32:32.642+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0621a8f0-ca81-43a4-9aac-17e3e62a5947	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Aulder Stain	Gravekeeper of Timberton, spent decades attempting to bring the rise of The Writgiest.	{"Race": "Human", "Type": "Civilian", "Status": "Dead", "cause_of_death": "Betrayed by the Writgiest."}	visible	2025-11-09 18:57:45.671+00	2025-11-14 16:32:32.645+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
67f48b8e-1f5f-4deb-8751-35ad8b293c14	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Astrid	Half-Sister to Ashe and leader of the Silver Burrow Rangers	{"Race": "Shifter", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.667+00	2025-11-14 16:32:32.646+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9b686b74-fc94-43c4-9301-91c77dce6df1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ashe Cottontail	Next in line for the High Seat of The Circle of the Full Moon. Currently working with The Golden Rose Agency	{"Race": "Shifter", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.663+00	2025-11-14 16:32:32.647+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	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	image/jpeg	{}
546e3750-5a0f-4dc2-8007-75533b50bcf1	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Aria	A Brandswoman hunting for Adamantine Wizard. Involved in some anti-elf conspiracy	{"Race": "Human", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.66+00	2025-11-14 16:32:32.648+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
b826fb02-3d94-4ba9-a2cc-7fe32f55ea8a	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Ari	Death Maiden of Silver Burrow and tender to the glade of Godgorath	{"Race": "Shifter", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.657+00	2025-11-14 16:32:32.649+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
f208c2b2-112d-41b0-ad42-9f1cbaa01d5d	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Archivist Io	An archivist with the appearance of a Gold masked mummy wrapped in iron. A member of the Lumin Commission	{"Race": "Unknown", "Type": "Academic", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.654+00	2025-11-14 16:32:32.649+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
1d981560-620b-4a52-97f8-b3792e7a0b74	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Archivist Censer	An Archivist of Academia. A strange and intense being wrapped in chains wearing an iron mask	{"Race": "Unknown", "Type": "Academia", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.65+00	2025-11-14 16:32:32.65+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
dfb75f41-5925-47c5-bbeb-074c83d9e8f6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Archivist Bellum	Archivist investigating the Temple of the Writgiest in Timberton. A large sarcophagus wrapped in chains	{"Race": "Unknown", "Type": "Academia", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.646+00	2025-11-14 16:32:32.651+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
74d8c9c0-590e-409f-81e3-d6d9e19477dc	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Arbane Guldweave	A needle of Aura currently on assignment working with The Golden Rose Agency	{"Race": "Auran Elf", "Type": "Mercenary", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.643+00	2025-11-14 16:32:32.652+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
0d9c7d4c-b608-42f3-a6ca-421b37b6f92b	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	April Hinderwane	Owner of Scumptious Soaps and twin sister of March Hinderwane	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.64+00	2025-11-14 16:32:32.652+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
9ce3340f-0976-4733-b6d6-af1d15766271	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Andir	A Copper Dragon that lives in the Morel Mountains. Devout follower of the Old Ways	{"Race": "Copper Dragon", "Type": "Dragon", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.635+00	2025-11-14 16:32:32.653+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
09051676-6199-4566-aa70-a22a3ffd1790	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Alric Stormbreaker	Leader of Swindle's rest and member of the council of Castoak	{"Race": "Human", "Type": "Military", "Status": "Dead", "cause_of_death": "Decapitation by the Host during the assault on Birthright Manor"}	visible	2025-11-09 18:57:45.632+00	2025-11-14 16:32:32.654+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4cac314b-2496-4d02-91a0-4e79f8dd72ba	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Alistaire Hueller	Disgraced former Captain of the Townguard in Wulden's Crossing	{"Race": "Human", "Type": "Civilian", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.623+00	2025-11-14 16:32:32.656+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
568a91f6-56a9-4204-979d-54d85097aaa2	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Aldred Goldspector	Representative for the Ram District	{"Race": "Dwarf", "Type": "Political", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.619+00	2025-11-14 16:32:32.657+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
034f1c7d-5acc-431d-898d-5c5cd32f9b73	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Alderust Faire	The leader of the circle of the Bone. Alderust extends his life with an old and powerful magic.	{"Race": "Willowkin", "Type": "Religious", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.615+00	2025-11-14 16:32:32.658+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
4303a3bc-3468-4acd-b3ff-a393a963fa1c	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Aiel	Leader of the auran elf group found in Needles Point. Imprisoned by Aura after helping the Golden Rose.	{"Race": "Auran Elf", "Type": "Military", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.61+00	2025-11-14 16:32:32.658+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
c35e59cd-f0de-4abd-8567-2862e009f3f7	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Alma Faire	Arbitrator of the Boulder Hall, a Maiden of the Tower that watches over all trails by combat in Boulder.	{"Race": "Human", "Type": "Official", "Status": "Alive", "cause_of_death": ""}	visible	2025-11-09 18:57:45.628+00	2025-11-17 18:42:13.582+00	selective	selective	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	{65019483-f077-4a93-83b6-b8c97864afd1}	{}	\N	\N	{}
01c5c7a8-a830-40f4-b2ab-8ee39b0f25f6	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	88b979eb-9950-4dd2-a8f7-753a9dd89d73	The Old Blue Well	An old well in a park area of Cloverfell, connected to the water works beneath the city.	{"location_type": "Area"}	visible	2025-11-14 22:07:29.799+00	2025-11-17 18:44:36.825+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
46601871-24d7-42ee-a6d4-22ab354424e4	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Old Brannis	Chief Petitioner in for the common folk in Cloverfell.	{"Race": "Human", "Type": "Political", "Status": "Alive"}	visible	2025-11-17 20:51:04.172+00	2025-11-17 20:51:04.172+00	selective	selective	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	{14883473-40f7-4667-b417-b3946b2d2fc1}	{}	\N	\N	{}
\.


--
-- Data for Name: entity_campaign_importance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_campaign_importance (id, entity_id, campaign_id, importance, created_at, updated_at) FROM stdin;
89baf6ff-471e-4002-babf-97c91f60edf6	9b686b74-fc94-43c4-9301-91c77dce6df1	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 09:49:27.497+00	2025-11-20 09:49:27.497+00
8bd6dd7a-e775-4283-9fd4-37707b705efe	0798a59b-ca1c-4879-887c-7f17566a8251	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 09:49:39.612+00	2025-11-20 09:49:39.612+00
4976eae7-10e9-47ab-a051-79ee0a813892	17db8fa3-d267-4d70-86f1-58d1d8c3ac19	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 09:49:49.376+00	2025-11-20 09:49:49.376+00
f0a4bfaf-48be-4925-8d6a-d3eb37e49c24	4bbbe907-2650-44dd-b0b3-a3edf106d036	65019483-f077-4a93-83b6-b8c97864afd1	important	2025-11-20 09:49:57.651+00	2025-11-20 09:49:57.651+00
d61b3d74-b5a8-4dee-aa2b-aa615a68fa9e	15ae1b52-70e0-42e3-a679-9a17830ba8a3	65019483-f077-4a93-83b6-b8c97864afd1	important	2025-11-20 09:50:04.548+00	2025-11-20 09:50:04.548+00
b633f119-f73c-4ff4-936b-0c9be02746ea	555c800f-9edf-4681-a69e-58a21409af01	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 09:52:26.229+00	2025-11-20 09:52:26.229+00
93a131d4-0627-40fa-a066-8475381688df	e95d7dec-24c5-43c6-9469-662e63298f46	65019483-f077-4a93-83b6-b8c97864afd1	important	2025-11-20 09:51:43.156+00	2025-11-20 09:52:31.018+00
7f238252-7f0b-4812-8924-6047b2cddbea	738b7e9a-a207-4e18-9a70-24707df5e520	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 09:47:39.3+00	2025-11-20 09:56:56.952+00
3143d4f5-b489-43e5-b683-5e99e0015cdb	23a20abc-f28f-4d92-94ca-0db47e1a767b	65019483-f077-4a93-83b6-b8c97864afd1	important	2025-11-20 09:57:48.429+00	2025-11-20 09:57:48.429+00
4cb2dbb8-04be-4654-8976-308fe1a298be	2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 09:47:15.017+00	2025-11-20 10:25:38.584+00
02295f21-d561-4a99-b743-d41b81b3b3b1	436c98fb-5c16-421c-aba4-e556470e1ec5	14883473-40f7-4667-b417-b3946b2d2fc1	critical	2025-11-20 10:26:06.56+00	2025-11-20 10:26:06.56+00
bfa90cd3-c428-4f66-8a2f-fb55e8ccf494	7e9f1f53-6891-4e50-a255-9691904bfea3	65019483-f077-4a93-83b6-b8c97864afd1	medium	2025-11-20 09:42:24.768+00	2025-11-20 10:36:52.418+00
7e9595d0-75c0-446a-91b9-eee5fc4d5cf7	56286363-0228-4d35-aa7b-9f1ebf2d94e0	65019483-f077-4a93-83b6-b8c97864afd1	critical	2025-11-20 10:52:12.506+00	2025-11-20 10:52:12.506+00
a69cfe5d-40db-4528-9a6b-1ef398fa6216	a202e9a8-6219-4a15-b0ee-ed7589264032	65019483-f077-4a93-83b6-b8c97864afd1	medium	2025-11-20 09:49:35.533+00	2025-11-20 20:55:18.332+00
\.


--
-- Data for Name: entity_collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_collections (id, world_id, owner_id, name, description, shared, selection_mode, criteria, entity_ids, created_at, updated_at) FROM stdin;
2ec31b69-142b-4062-b919-46a63c12b708	f3b4ce50-86fc-45b4-b78f-9991acec86c6	a3bc8328-8169-4bfa-8177-dd2e088316d5	The Golden Rose Agency	\N	f	manual	\N	{56286363-0228-4d35-aa7b-9f1ebf2d94e0,2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c,9b686b74-fc94-43c4-9301-91c77dce6df1,17db8fa3-d267-4d70-86f1-58d1d8c3ac19,a202e9a8-6219-4a15-b0ee-ed7589264032}	2025-11-14 18:45:05.049+00	2025-11-14 18:45:05.049+00
\.


--
-- Data for Name: entity_follows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_follows (id, user_id, entity_id, campaign_id, created_at, updated_at) FROM stdin;
f3aaa40d-dff9-4b50-a7eb-b2d16526b51c	ecf1ae57-7d88-4763-ad45-23a239523246	2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:43:18.305+00	2025-11-19 20:43:18.305+00
0a52d20d-d7ad-40a8-a4bd-12110f1abdb6	ecf1ae57-7d88-4763-ad45-23a239523246	7e9f1f53-6891-4e50-a255-9691904bfea3	65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:46:38.766+00	2025-11-19 20:46:38.766+00
9a215739-5517-4afe-8d7e-bfbe0ca40183	ecf1ae57-7d88-4763-ad45-23a239523246	a202e9a8-6219-4a15-b0ee-ed7589264032	65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:48:47.822+00	2025-11-19 20:48:47.822+00
2a595914-8c17-4fcb-84e9-999a4620b3cd	ecf1ae57-7d88-4763-ad45-23a239523246	e6fed39e-c171-4efe-b32d-9e5067165b57	65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 20:53:25.206+00	2025-11-20 20:53:25.206+00
\.


--
-- Data for Name: entity_list_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_list_preferences (id, entity_type_id, user_id, columns, created_at, updated_at) FROM stdin;
3bd822f8-2a05-4767-8af9-84f1d337683d	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	\N	["name", "description", "metadata.Race", "metadata.Status", "metadata.Type"]	2025-11-09 14:57:57.227+00	2025-11-09 18:58:52.459+00
9807dc8f-a20b-4ce6-b238-b851092fc35f	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	a3bc8328-8169-4bfa-8177-dd2e088316d5	["name", "description", "metadata.Race", "metadata.Status", "metadata.Type"]	2025-11-09 14:58:28.466+00	2025-11-09 18:59:48.703+00
c8081c39-e040-490a-b3b3-532e86975be6	b938723b-3cf2-41ad-be71-b356c7dd8a63	a3bc8328-8169-4bfa-8177-dd2e088316d5	["name", "type", "visibility", "createdAt", "metadata.leader"]	2025-11-13 13:02:59.231+00	2025-11-13 13:02:59.231+00
8ddaded1-b992-42b0-98c3-4a9423718bbf	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	a3bc8328-8169-4bfa-8177-dd2e088316d5	["name", "description", "metadata.leader", "createdAt"]	2025-11-13 16:36:42.756+00	2025-11-13 16:36:42.756+00
16ffc02e-1b9e-4a1d-babf-553948454829	88b979eb-9950-4dd2-a8f7-753a9dd89d73	\N	["name", "description", "metadata.location_type"]	2025-11-20 09:26:25.43+00	2025-11-20 09:26:25.43+00
bca2b0bb-97cb-4b7a-b6b6-fed0d0b830f7	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	\N	["name", "description", "metadata.Headquarters", "metadata.leader"]	2025-11-20 09:26:46.173+00	2025-11-20 09:26:46.173+00
9a8248ce-a292-45fa-a745-d2463a170e23	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	["name", "description", "metadata.Race", "metadata.Status", "metadata.Type"]	2025-11-20 10:07:38.326+00	2025-11-20 10:07:38.326+00
1c69f9ab-b45f-41a0-b3ab-44cac3e6eda9	88b979eb-9950-4dd2-a8f7-753a9dd89d73	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	["name", "description", "metadata.location_type"]	2025-11-20 10:27:15.116+00	2025-11-20 10:28:20.807+00
d4320552-b430-490c-a1b8-5ae52deeffb1	b938723b-3cf2-41ad-be71-b356c7dd8a63	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	["name", "description", "type", "importance"]	2025-11-20 10:32:29.364+00	2025-11-20 10:32:29.364+00
20a5de4c-a646-4e0d-92b3-ab370784068c	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	ecf1ae57-7d88-4763-ad45-23a239523246	["name", "description", "metadata.Race", "metadata.Status", "metadata.Type"]	2025-11-10 22:30:29.296+00	2025-11-20 20:56:20.417+00
ace62ee7-4fe0-4f4e-8d85-3c81bc722b6b	9afc4157-6291-42ca-97fa-bf08ffe403a8	\N	["name", "description", "metadata.played_by"]	2025-11-20 22:04:58.188+00	2025-11-20 22:04:58.188+00
da6902a6-90c1-4809-87fa-1227b7e0d1eb	b938723b-3cf2-41ad-be71-b356c7dd8a63	\N	["name", "description"]	2025-11-20 22:05:35.479+00	2025-11-20 22:05:35.479+00
d60a7408-a855-4460-a3b8-29909e69dbbe	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	ecf1ae57-7d88-4763-ad45-23a239523246	["name", "description", "metadata.Headquarters", "metadata.leader"]	2025-11-21 08:43:05.372+00	2025-11-21 08:43:14.047+00
\.


--
-- Data for Name: entity_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_notes (id, entity_id, campaign_id, character_id, created_by, share_type, content, mentions, created_at, updated_at) FROM stdin;
7d268552-2177-4398-9ae3-ded949c1378b	23a20abc-f28f-4d92-94ca-0db47e1a767b	65019483-f077-4a93-83b6-b8c97864afd1	dbe0a355-d794-4c1e-86d5-143cb224a970	ecf1ae57-7d88-4763-ad45-23a239523246	private	I don't like this guy...\n\nBut I have a feeling that @[Vedast Corvon](a202e9a8-6219-4a15-b0ee-ed7589264032) really doesn't like him	[{"entityId": "a202e9a8-6219-4a15-b0ee-ed7589264032", "entityName": "Vedast Corvon"}]	2025-11-10 11:46:48.596+00	2025-11-10 11:46:48.596+00
ddb1aed2-a1b6-4bd1-901b-8365f6374da1	a202e9a8-6219-4a15-b0ee-ed7589264032	65019483-f077-4a93-83b6-b8c97864afd1	667e73d1-7fe2-4422-bcf3-cb323b19babc	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	companions	I really like this guy, though he is a sneaky boy	[]	2025-11-10 11:55:39.372+00	2025-11-10 11:55:39.372+00
c717b264-0616-441e-a7e9-d178861b1343	2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	65019483-f077-4a93-83b6-b8c97864afd1	\N	a3bc8328-8169-4bfa-8177-dd2e088316d5	private	Hello, World!	[]	2025-11-10 15:38:25.274+00	2025-11-10 15:38:25.274+00
fd2b1029-55dc-4fab-ac2a-c5e30b3f9b83	15ae1b52-70e0-42e3-a679-9a17830ba8a3	65019483-f077-4a93-83b6-b8c97864afd1	\N	a3bc8328-8169-4bfa-8177-dd2e088316d5	private	I like thig guy... @[Hans Freeguard](17db8fa3-d267-4d70-86f1-58d1d8c3ac19)	[{"entityId": "17db8fa3-d267-4d70-86f1-58d1d8c3ac19", "entityName": "Hans Freeguard"}]	2025-11-10 18:39:49.144+00	2025-11-10 18:39:49.144+00
58402e36-f506-461a-94ca-4d64ec6a5aa5	7df2a55b-dba9-4e55-80a1-7994af54dd71	65019483-f077-4a93-83b6-b8c97864afd1	\N	a3bc8328-8169-4bfa-8177-dd2e088316d5	private	Here is a note @[Hans Freeguard](17db8fa3-d267-4d70-86f1-58d1d8c3ac19)	[{"entityId": "17db8fa3-d267-4d70-86f1-58d1d8c3ac19", "entityName": "Hans Freeguard"}]	2025-11-14 14:11:06.285+00	2025-11-14 14:11:06.285+00
daa2712f-6a85-4bd4-9773-67f5eb490682	4d627be8-4397-4ceb-bf3d-536ca35ca8db	14883473-40f7-4667-b417-b3946b2d2fc1	1eaa9392-6db9-481e-99f5-54cb34b9e468	ecf1ae57-7d88-4763-ad45-23a239523246	private	Balthin appeared has promised me freedom and a clear record, if I were to use the handgun I acquired to kill @[Joridiah Bleakly](2cb3e233-c652-4b5f-9952-a2b2e2429448) in a public setting... By order of the King	[{"entityId": "2cb3e233-c652-4b5f-9952-a2b2e2429448", "entityName": "Joridiah Bleakly"}]	2025-11-14 16:09:09.674+00	2025-11-14 16:09:09.674+00
1e23dc34-ac42-4649-806d-ce7f68c5ea3e	4d627be8-4397-4ceb-bf3d-536ca35ca8db	65019483-f077-4a93-83b6-b8c97864afd1	dbe0a355-d794-4c1e-86d5-143cb224a970	ecf1ae57-7d88-4763-ad45-23a239523246	companions	I had sword revenge against him for betraying my friendship and for his direct role in the murder of my beloved @[Elara Ainesilver](cd12e73d-4049-4289-8cc5-d9f95601ccdf) - I have set aside my oath of vengence for a greater cause... but that said, I hope to never see this man and I'm not sure what I would do if I ever did...	[{"entityId": "cd12e73d-4049-4289-8cc5-d9f95601ccdf", "entityName": "Elara Ainesilver"}]	2025-11-14 16:10:58.812+00	2025-11-14 16:10:58.812+00
9d70b428-7316-4907-b3e0-08829dfe8d8d	0968245c-ca02-46ec-8584-442978beb5a1	14883473-40f7-4667-b417-b3946b2d2fc1	1eaa9392-6db9-481e-99f5-54cb34b9e468	ecf1ae57-7d88-4763-ad45-23a239523246	companions	Father Rodeggar conviced us that we should form a group and carry out work for the High Seekers. This way we can earn favour to see Joridiah Bleakly	[]	2025-11-17 20:55:52.988+00	2025-11-17 20:55:52.988+00
99b6880a-aadb-44e7-a0d8-b409723a8d99	2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	65019483-f077-4a93-83b6-b8c97864afd1	dbe0a355-d794-4c1e-86d5-143cb224a970	ecf1ae57-7d88-4763-ad45-23a239523246	private	I am wary of him... Though I trust his heart, his lust for power sometimes overwhelms his senses...	[]	2025-11-19 14:58:54.632+00	2025-11-19 15:08:57.37+00
2ee16074-d771-43d9-99f1-737b09c2dec4	7e9f1f53-6891-4e50-a255-9691904bfea3	65019483-f077-4a93-83b6-b8c97864afd1	dbe0a355-d794-4c1e-86d5-143cb224a970	ecf1ae57-7d88-4763-ad45-23a239523246	private	I have land here, which I have allowed civillian refugees from the rebellion to settle on.	[]	2025-11-19 20:07:01.73+00	2025-11-19 20:07:01.73+00
\.


--
-- Data for Name: entity_relationship_type_entity_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_relationship_type_entity_types (id, relationship_type_id, entity_type_id, role, created_at, updated_at) FROM stdin;
dda99466-7daa-48c2-ae55-2e330c5f65df	95d113a1-912c-4aec-a54d-cc9ad21932db	88b979eb-9950-4dd2-a8f7-753a9dd89d73	from	2025-11-10 14:53:06.616+00	2025-11-10 14:53:06.616+00
3b62219d-3bc6-486b-930a-a909b257a146	95d113a1-912c-4aec-a54d-cc9ad21932db	88b979eb-9950-4dd2-a8f7-753a9dd89d73	to	2025-11-10 14:53:06.616+00	2025-11-10 14:53:06.616+00
a3cc2b62-c46b-43a4-884d-f30d8697227b	95d113a1-912c-4aec-a54d-cc9ad21932db	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	to	2025-11-10 14:53:06.616+00	2025-11-10 14:53:06.616+00
6a2db4a8-9ec2-4b77-aa8c-1f3c42d8e8b1	82802df9-7424-41c6-830c-79748db4721e	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	from	2025-11-14 17:54:09.796+00	2025-11-14 17:54:09.796+00
258d39af-a7a6-4fec-af47-b04721f27456	82802df9-7424-41c6-830c-79748db4721e	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	to	2025-11-14 17:54:09.796+00	2025-11-14 17:54:09.796+00
45dace0d-4fb2-4a5c-aad6-a9f619b47e54	82802df9-7424-41c6-830c-79748db4721e	9afc4157-6291-42ca-97fa-bf08ffe403a8	to	2025-11-14 17:54:09.796+00	2025-11-14 17:54:09.796+00
d61d4cf1-5211-4d2f-ad5d-82a473242081	a56c9bc4-5fb1-4bc2-9d95-9c5d89100e5c	9afc4157-6291-42ca-97fa-bf08ffe403a8	from	2025-11-20 11:41:22.403+00	2025-11-20 11:41:22.403+00
48b187ab-2897-4f9a-b1c8-ec76682d2d3c	a56c9bc4-5fb1-4bc2-9d95-9c5d89100e5c	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	from	2025-11-20 11:41:22.403+00	2025-11-20 11:41:22.403+00
9b4be2ff-a72b-4fa4-8705-75c6bc3fca06	a56c9bc4-5fb1-4bc2-9d95-9c5d89100e5c	9afc4157-6291-42ca-97fa-bf08ffe403a8	to	2025-11-20 11:41:22.403+00	2025-11-20 11:41:22.403+00
b86491ad-f91b-4c88-9e86-064ac30a7d76	a56c9bc4-5fb1-4bc2-9d95-9c5d89100e5c	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	to	2025-11-20 11:41:22.403+00	2025-11-20 11:41:22.403+00
23a5e562-f2e8-4411-b6f6-031bc9c78a4b	11bec3a1-8ad6-4ac4-8538-b56921116fed	9afc4157-6291-42ca-97fa-bf08ffe403a8	from	2025-11-20 11:42:22.936+00	2025-11-20 11:42:22.936+00
93482aa7-f5b9-46cd-afa0-0aeaee47b95d	11bec3a1-8ad6-4ac4-8538-b56921116fed	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	from	2025-11-20 11:42:22.936+00	2025-11-20 11:42:22.936+00
ce055b64-73dd-4951-897b-549b4eeef09b	11bec3a1-8ad6-4ac4-8538-b56921116fed	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	from	2025-11-20 11:42:22.936+00	2025-11-20 11:42:22.936+00
79fcd71f-860b-424d-aedc-12fde84e46da	11bec3a1-8ad6-4ac4-8538-b56921116fed	9afc4157-6291-42ca-97fa-bf08ffe403a8	to	2025-11-20 11:42:22.936+00	2025-11-20 11:42:22.936+00
5cde05d5-fa59-48e2-9b1e-f7f40e0cfac3	11bec3a1-8ad6-4ac4-8538-b56921116fed	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	to	2025-11-20 11:42:22.936+00	2025-11-20 11:42:22.936+00
8baca4f3-bb08-4ea0-9435-2ebf6eb9a4f6	11bec3a1-8ad6-4ac4-8538-b56921116fed	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	to	2025-11-20 11:42:22.936+00	2025-11-20 11:42:22.936+00
15de9e15-b9e0-43d2-86c7-7dd4ca1ba42a	fd425912-52ba-404b-be23-64ccba3cb17c	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	from	2025-11-20 11:43:06.218+00	2025-11-20 11:43:06.218+00
f05d14f9-c998-4232-b83b-4449d760b7db	fd425912-52ba-404b-be23-64ccba3cb17c	9afc4157-6291-42ca-97fa-bf08ffe403a8	from	2025-11-20 11:43:06.218+00	2025-11-20 11:43:06.218+00
52c0d39a-05a2-4ac5-b0cd-ce6a07728402	fd425912-52ba-404b-be23-64ccba3cb17c	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	from	2025-11-20 11:43:06.218+00	2025-11-20 11:43:06.218+00
921866e5-f322-453e-9e73-37dac4662a26	fd425912-52ba-404b-be23-64ccba3cb17c	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	to	2025-11-20 11:43:06.218+00	2025-11-20 11:43:06.218+00
1e4ad5bf-7eeb-4073-86e0-613e749b0bfa	fd425912-52ba-404b-be23-64ccba3cb17c	9afc4157-6291-42ca-97fa-bf08ffe403a8	to	2025-11-20 11:43:06.218+00	2025-11-20 11:43:06.218+00
86e5dd73-53c5-4efd-b197-39f3ba8bc18b	fd425912-52ba-404b-be23-64ccba3cb17c	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	to	2025-11-20 11:43:06.218+00	2025-11-20 11:43:06.218+00
c58e3514-58e1-447c-9bdd-80344a6895ba	8af37a99-dabc-4443-8b93-b77129655c83	9afc4157-6291-42ca-97fa-bf08ffe403a8	from	2025-11-20 11:43:45.607+00	2025-11-20 11:43:45.607+00
8d1ad585-b943-4983-8051-6714e87f0381	8af37a99-dabc-4443-8b93-b77129655c83	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	from	2025-11-20 11:43:45.607+00	2025-11-20 11:43:45.607+00
69e31dc6-c4a4-449c-8c3b-d88955161516	8af37a99-dabc-4443-8b93-b77129655c83	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	from	2025-11-20 11:43:45.607+00	2025-11-20 11:43:45.607+00
a3e43f06-355c-4ac6-8047-87dd89c20075	8af37a99-dabc-4443-8b93-b77129655c83	b938723b-3cf2-41ad-be71-b356c7dd8a63	to	2025-11-20 11:43:45.607+00	2025-11-20 11:43:45.607+00
66c8e863-2039-417c-8adc-a61ff7fd9065	78a25020-5635-4def-a17d-d894f7ba7673	9afc4157-6291-42ca-97fa-bf08ffe403a8	from	2025-11-20 11:44:41.487+00	2025-11-20 11:44:41.487+00
0d0b28db-8362-49a9-8e29-b79a64b14fff	78a25020-5635-4def-a17d-d894f7ba7673	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	from	2025-11-20 11:44:41.487+00	2025-11-20 11:44:41.487+00
557466dd-cc77-4653-bb8e-2e6bf2f6af46	78a25020-5635-4def-a17d-d894f7ba7673	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	from	2025-11-20 11:44:41.487+00	2025-11-20 11:44:41.487+00
afd5b581-4726-4495-b1d9-e35e79f6bf36	78a25020-5635-4def-a17d-d894f7ba7673	b938723b-3cf2-41ad-be71-b356c7dd8a63	to	2025-11-20 11:44:41.487+00	2025-11-20 11:44:41.487+00
\.


--
-- Data for Name: entity_relationship_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_relationship_types (id, name, description, created_at, updated_at, world_id, from_name, to_name) FROM stdin;
82802df9-7424-41c6-830c-79748db4721e	Membership	Links people to organisations, showing that they are a part of that organisation	2025-11-09 13:48:52.405+00	2025-11-09 13:48:52.405+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	has Member	Member of
95d113a1-912c-4aec-a54d-cc9ad21932db	Located		2025-11-10 14:53:06.615+00	2025-11-10 14:53:06.615+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	Contains	Located in
a56c9bc4-5fb1-4bc2-9d95-9c5d89100e5c	Parental	Shows parental relationships between people	2025-11-20 11:41:22.392+00	2025-11-20 11:41:22.392+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	parent of	child of
11bec3a1-8ad6-4ac4-8538-b56921116fed	Enemy	Relationships between these two have broken down and they now seek to destroy or otherwise undermine one another	2025-11-20 11:42:22.935+00	2025-11-20 11:42:22.935+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	enemy of	enemy of
fd425912-52ba-404b-be23-64ccba3cb17c	Ally	This is a formal recognition of an alliance in aid of a common goal	2025-11-20 11:43:06.217+00	2025-11-20 11:43:06.217+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	ally of	ally of
8af37a99-dabc-4443-8b93-b77129655c83	Coveted		2025-11-20 11:43:45.605+00	2025-11-20 11:43:45.605+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	covets	coveted by
78a25020-5635-4def-a17d-d894f7ba7673	Possesion		2025-11-20 11:44:41.486+00	2025-11-20 11:44:41.486+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6	possesses	possesed by
\.


--
-- Data for Name: entity_relationships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_relationships (id, from_entity, to_entity, bidirectional, context, created_at, relationship_type_id, updated_at) FROM stdin;
b49280fe-1a8f-4f2c-885b-b9740e66a60f	0798a59b-ca1c-4879-887c-7f17566a8251	7312c336-6135-4e34-b378-53cf150d8c43	f	{"__direction": "forward"}	2025-11-10 14:53:39.43+00	95d113a1-912c-4aec-a54d-cc9ad21932db	2025-11-10 14:53:39.43+00
5689daed-3473-4bc6-ac81-89c5ca4004a2	56286363-0228-4d35-aa7b-9f1ebf2d94e0	2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c	f	{"__direction": "forward"}	2025-11-14 17:54:40.154+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-14 17:54:40.154+00
112677bb-4d26-4074-8518-0c444cd26625	56286363-0228-4d35-aa7b-9f1ebf2d94e0	17db8fa3-d267-4d70-86f1-58d1d8c3ac19	f	{"__direction": "forward"}	2025-11-14 17:54:48.12+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-14 17:54:48.12+00
ce3c515d-a861-4733-ab98-a413655992cb	56286363-0228-4d35-aa7b-9f1ebf2d94e0	9b686b74-fc94-43c4-9301-91c77dce6df1	f	{"__direction": "forward"}	2025-11-14 17:54:54.602+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-14 17:54:54.602+00
adfa0157-5619-483b-acc2-de1d9bca2e09	56286363-0228-4d35-aa7b-9f1ebf2d94e0	a202e9a8-6219-4a15-b0ee-ed7589264032	f	{"__direction": "forward"}	2025-11-14 17:55:01.12+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-14 17:55:01.12+00
27c548f3-554f-4353-a3b3-f95fded410dc	77985e1a-8545-4f78-a868-77dd4f82deab	7c4ee38f-5401-4be6-b6ec-eaa8d99ca232	f	{"__direction": "forward"}	2025-11-17 20:43:03.855+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-17 20:43:03.855+00
c0382279-6c93-46ad-9803-8b6392be1436	77985e1a-8545-4f78-a868-77dd4f82deab	779a2e1a-bf05-40a1-bb09-947124a6d0c4	f	{"__direction": "forward"}	2025-11-17 20:43:19.984+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-17 20:43:19.984+00
4b90be48-6a78-41bc-918b-15b1f84ed3c4	77985e1a-8545-4f78-a868-77dd4f82deab	77c53627-1c2f-4442-a573-91de2eeb2569	f	{"__direction": "forward"}	2025-11-17 20:43:31.706+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-17 20:43:31.706+00
53166bd3-55c9-4008-aa5c-90cc475e21e1	77985e1a-8545-4f78-a868-77dd4f82deab	9db746e4-ac72-4c51-962b-8e5cf0e1dfed	f	{"__direction": "forward"}	2025-11-17 20:43:40.705+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-17 20:43:40.705+00
2833642e-fcec-4ecf-9054-c7fa40b634d4	77985e1a-8545-4f78-a868-77dd4f82deab	29712980-2d64-4387-bdfb-8062a78fabc6	f	{"__direction": "forward"}	2025-11-17 20:43:58.746+00	82802df9-7424-41c6-830c-79748db4721e	2025-11-17 20:43:58.746+00
467fdac4-cc23-4da9-b2b8-5d90dd5420d3	56286363-0228-4d35-aa7b-9f1ebf2d94e0	e95d7dec-24c5-43c6-9469-662e63298f46	f	{"__direction": "forward"}	2025-11-20 11:45:09.237+00	78a25020-5635-4def-a17d-d894f7ba7673	2025-11-20 11:45:09.237+00
935997b0-74bd-4e4f-9cee-befa3df319e5	56286363-0228-4d35-aa7b-9f1ebf2d94e0	555c800f-9edf-4681-a69e-58a21409af01	f	{"__direction": "forward"}	2025-11-20 11:45:27.643+00	8af37a99-dabc-4443-8b93-b77129655c83	2025-11-20 11:45:27.643+00
e75380dd-8427-406e-ada4-719e58ae7f37	23a20abc-f28f-4d92-94ca-0db47e1a767b	e95d7dec-24c5-43c6-9469-662e63298f46	f	{"__direction": "forward"}	2025-11-20 11:47:47.647+00	8af37a99-dabc-4443-8b93-b77129655c83	2025-11-20 11:47:47.647+00
0f8dd1b0-a52e-4984-bec2-3bd32c451b87	56286363-0228-4d35-aa7b-9f1ebf2d94e0	23a20abc-f28f-4d92-94ca-0db47e1a767b	f	{"__direction": "forward"}	2025-11-20 11:48:04.253+00	11bec3a1-8ad6-4ac4-8538-b56921116fed	2025-11-20 11:48:04.253+00
\.


--
-- Data for Name: entity_secret_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_secret_permissions (id, secret_id, user_id, can_view, created_at, updated_at, campaign_id) FROM stdin;
\.


--
-- Data for Name: entity_secrets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_secrets (id, entity_id, created_by, title, content, created_at, updated_at) FROM stdin;
54d14b09-aed4-4d9d-8ff1-e5c02c623f50	77985e1a-8545-4f78-a868-77dd4f82deab	a3bc8328-8169-4bfa-8177-dd2e088316d5	Here is something secret...	shhhhhhh	2025-11-19 18:08:48.562+00	2025-11-19 18:08:48.562+00
\.


--
-- Data for Name: entity_type_field_layouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_type_field_layouts (id, entity_type_id, entity_type_field_id, section_order, column_order, field_order, priority, created_at, updated_at) FROM stdin;
a7f31a5d-f96b-4c13-8207-870de8fc8d2b	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	9e992366-96c7-4ea7-a5f8-8deb04f88742	0	0	0	0	2025-11-17 09:22:38.185+00	2025-11-17 09:22:38.185+00
3667cfc5-dc55-4b66-a78e-fe20934bb0a6	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	1d8e1e2d-00dd-48b2-96fa-f78e0512840d	0	0	1	1	2025-11-17 09:22:38.185+00	2025-11-17 09:22:38.185+00
aed70693-8173-4b78-baf8-f495a4aff2f0	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	28383351-f9fb-4d13-bfa4-ea72407ef123	0	0	2	2	2025-11-17 09:22:38.185+00	2025-11-17 09:22:38.185+00
4f7a0987-3fe5-4104-982b-37e6a71fc6ba	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	59687682-e401-4c98-98e4-7cebe01b2242	0	0	3	3	2025-11-17 09:22:38.185+00	2025-11-17 09:22:38.185+00
ce7d390a-c4a6-47bb-ba98-47e2f636570c	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	81d070cb-4878-4dd8-a8f9-77d552ca30fe	0	0	4	4	2025-11-17 09:22:38.185+00	2025-11-17 09:22:38.185+00
b2938106-9538-48d2-9df9-6c83d840b94d	9afc4157-6291-42ca-97fa-bf08ffe403a8	79ce50d8-9289-430e-8162-cfc9389f64b1	0	0	0	0	2025-11-17 14:22:02.355+00	2025-11-17 14:22:02.355+00
4daa16f6-33cf-43b3-ba89-a0dbaaf2a7e5	9afc4157-6291-42ca-97fa-bf08ffe403a8	e8a92008-03ba-4015-8315-fc045a04281d	0	0	1	1	2025-11-17 14:22:02.355+00	2025-11-17 14:22:02.355+00
\.


--
-- Data for Name: entity_type_field_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_type_field_rules (id, entity_type_id, name, match_mode, priority, enabled, conditions, actions, created_at, updated_at) FROM stdin;
a3e94810-98e6-4151-8d43-aeadec8fdbde	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	\N	all	0	t	[{"field": "28383351-f9fb-4d13-bfa4-ea72407ef123", "values": ["Undead", "Dead"], "operator": "equals"}]	[{"action": "show", "target": "81d070cb-4878-4dd8-a8f9-77d552ca30fe"}]	2025-11-17 08:20:03.35+00	2025-11-17 08:20:03.35+00
\.


--
-- Data for Name: entity_type_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_type_fields (id, entity_type_id, name, label, data_type, options, required, default_value, sort_order, reference_type_id, reference_filter, visible_by_default) FROM stdin;
59687682-e401-4c98-98e4-7cebe01b2242	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Type	Type	enum	{"choices": ["Academic", "Academia", "Auramancer", "Carrion Caller", "Celebrity", "Celestial Entity", "Civilian", "Criminal", "Dragon", "Druidic", "Entertainer", "Fiend", "Innkeeper", "Leader", "Marked", "Mercenary", "Military", "Mother", "Official", "Offical", "Political", "Religious", "Seeker", "Sorcerous", "Spirit", "Store Owner", "Void Entity", "Wizard", "Worker", "Unknown"]}	f	\N	0	\N	{}	t
28383351-f9fb-4d13-bfa4-ea72407ef123	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Status	Status	enum	{"choices": ["Alive", "Dead", "Undead", "Unknown", "Other"]}	f	\N	0	\N	{}	t
1d8e1e2d-00dd-48b2-96fa-f78e0512840d	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	Race	Race	enum	{"choices": ["Aarakocra", "Arach", "Air Genasi", "Alchelite", "Auran Elf", "Celestial", "Copper Dragon", "Curian", "Dark Elf", "Demic Elf", "Dragon", "Dragonborn", "Dwarf", "Eladrin", "Fiend", "Gnome", "Goblin", "Great Spirit", "Hag", "Half-Drow", "Half-Elf", "Half Elf", "Half-Orc", "Halfling", "Hexblood", "Hopeward Elf", "Human", "Human Spirit", "Human?", "Kalashtar", "Leonin", "Lizardfolk", "Minotaur", "Pallid Elf", "Palid Elf", "Quarter-Elf", "Shifter", "Stone Statue", "Tabaxi", "Tabaxi/Hobgoblin", "Tiefling", "Unknown", "Void Entity", "Willowkin", "Wood Elf", "Wyrewarden"]}	f	\N	0	\N	{}	t
355e5f65-d114-46e6-a95a-1bf7b5c99db6	88b979eb-9950-4dd2-a8f7-753a9dd89d73	location_type	Location Type	enum	{"choices": ["Building", "Area", "District", "Village", "City", "Town", "Region"]}	f	\N	0	\N	{}	t
fa9fb93f-07bf-4d18-bb98-fae09cb3d7c5	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	leader	Leader	reference	{}	f	\N	0	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	{}	t
79ce50d8-9289-430e-8162-cfc9389f64b1	9afc4157-6291-42ca-97fa-bf08ffe403a8	played_by	Played by	text	{}	f	\N	0	\N	{}	t
81d070cb-4878-4dd8-a8f9-77d552ca30fe	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	cause_of_death	Cause of Death	text	{}	f	\N	0	\N	{}	f
9e992366-96c7-4ea7-a5f8-8deb04f88742	6fb26e1a-669b-4dca-88fc-317f8c6e3da3	age	Age	number	{}	f	\N	0	\N	{}	t
e8a92008-03ba-4015-8315-fc045a04281d	9afc4157-6291-42ca-97fa-bf08ffe403a8	age	Age	number	{}	f	\N	0	\N	{}	t
5b962168-c169-4510-a631-73ef5b65daba	f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	Headquarters	HQ Location	reference	{}	f	\N	0	88b979eb-9950-4dd2-a8f7-753a9dd89d73	{}	t
\.


--
-- Data for Name: entity_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_types (id, name, description, created_at, updated_at, world_id) FROM stdin;
6fb26e1a-669b-4dca-88fc-317f8c6e3da3	NPC	A character in the world, not played by a person	2025-11-09 13:46:47.46+00	2025-11-09 14:39:18.447+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6
feb37506-e304-463e-b613-d5ced919ab18	Ship		2025-11-09 18:09:51.305+00	2025-11-09 18:09:51.305+00	1a6a672d-af24-4ff4-a91d-39252db38961
269a226e-f6ab-4888-8ae1-c6bda5f36689	Planet		2025-11-09 18:10:02.351+00	2025-11-09 18:10:02.351+00	1a6a672d-af24-4ff4-a91d-39252db38961
88b979eb-9950-4dd2-a8f7-753a9dd89d73	Location		2025-11-10 14:50:53.908+00	2025-11-10 14:50:53.908+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6
b938723b-3cf2-41ad-be71-b356c7dd8a63	Object		2025-11-12 19:25:32.859+00	2025-11-13 16:35:13.008+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6
f4b03ee6-0bcc-46fc-9ac6-b9453d0167ea	Organisation		2025-11-13 16:35:21.655+00	2025-11-13 16:35:21.655+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6
9afc4157-6291-42ca-97fa-bf08ffe403a8	Character	A character controlled by a player	2025-11-14 16:45:14.723+00	2025-11-14 16:45:14.723+00	f3b4ce50-86fc-45b4-b78f-9991acec86c6
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, campaign_id, read, read_at, metadata, action_url, created_at, updated_at) FROM stdin;
ab3fc28b-906d-49c4-a1a6-90550847aad9	ecf1ae57-7d88-4763-ad45-23a239523246	entity_comment	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-19 20:44:24.116+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "entity_id": "2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c", "target_id": "2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c", "author_name": "DanDav", "entity_name": "Zite Oberoar", "target_type": "entity", "entity_note_id": "b953cfb7-013e-4dd8-b1c5-e2c4a6ba2885"}	/entities/2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c?campaignId=65019483-f077-4a93-83b6-b8c97864afd1#notes	2025-11-19 20:44:06.634+00	2025-11-19 20:44:24.116+00
474deb71-85fc-427c-a3ca-928310e0c259	ecf1ae57-7d88-4763-ad45-23a239523246	entity_mention_entity_note	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-19 20:44:26.371+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c", "author_name": "DanDav", "target_type": "entity", "entity_note_id": "b953cfb7-013e-4dd8-b1c5-e2c4a6ba2885", "related_entity_id": "2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c", "related_entity_name": "Zite Oberoar"}	/entities/2d4a9636-e6f3-40eb-83eb-0f7130cc0b7c?campaignId=65019483-f077-4a93-83b6-b8c97864afd1#notes	2025-11-19 20:44:06.646+00	2025-11-19 20:44:26.371+00
dbcc9d1c-28b9-436a-8e71-b9046b28da14	704d70ff-e300-4126-b526-d034acaedbd7	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-19", "session_title": "Session on Nov 19, 2025", "session_note_id": "498b9b92-9593-47fd-a2da-54577200a66b"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:50:04.976+00	2025-11-19 20:50:04.976+00
07f4fb35-4237-405f-a94e-1476b942f660	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-19", "session_title": "Session on Nov 19, 2025", "session_note_id": "498b9b92-9593-47fd-a2da-54577200a66b"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:50:04.976+00	2025-11-19 20:50:04.976+00
9aa1ae31-0ae4-4b32-ae92-cb2814f2968f	ecf1ae57-7d88-4763-ad45-23a239523246	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-19 20:50:53.09+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-19", "session_title": "Session on Nov 19, 2025", "session_note_id": "498b9b92-9593-47fd-a2da-54577200a66b"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:50:04.976+00	2025-11-19 20:50:53.09+00
49132e3b-c58d-40c9-b4ae-ee672f507c48	ecf1ae57-7d88-4763-ad45-23a239523246	entity_comment	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-19 20:50:54.2+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "entity_id": "a202e9a8-6219-4a15-b0ee-ed7589264032", "target_id": "a202e9a8-6219-4a15-b0ee-ed7589264032", "author_name": "DanDav", "entity_name": "Vedast Corvon", "target_type": "entity", "entity_note_id": "b113ae11-6d3d-4e0c-b39a-c8e33401bad6"}	/entities/a202e9a8-6219-4a15-b0ee-ed7589264032?campaignId=65019483-f077-4a93-83b6-b8c97864afd1#notes	2025-11-19 20:49:26.387+00	2025-11-19 20:50:54.2+00
e18dba6b-72aa-4619-af78-9aceb782c11d	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-20 08:20:47.406+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-19", "session_title": "Session on Nov 19, 2025", "session_note_id": "498b9b92-9593-47fd-a2da-54577200a66b"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-19 20:50:04.976+00	2025-11-20 08:20:47.408+00
3fdc01e2-48b3-41f2-a236-7fcf6a6cde77	704d70ff-e300-4126-b526-d034acaedbd7	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "a76cd99f-d550-4779-a8cd-739cc07edda3"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 12:53:10.535+00	2025-11-20 12:53:10.535+00
8b6bb22a-3fa4-470f-9c43-f9e165c1b666	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "a76cd99f-d550-4779-a8cd-739cc07edda3"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 12:53:10.535+00	2025-11-20 12:53:10.535+00
8386d163-4469-4fa6-85cd-014811633ea1	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-20 13:43:25.605+00	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "a76cd99f-d550-4779-a8cd-739cc07edda3"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 12:53:10.535+00	2025-11-20 13:43:25.606+00
7d0d6f8a-3851-47b2-aa30-5a5db89cb394	ecf1ae57-7d88-4763-ad45-23a239523246	entity_comment	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-20 20:54:14.369+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "entity_id": "e6fed39e-c171-4efe-b32d-9e5067165b57", "target_id": "e6fed39e-c171-4efe-b32d-9e5067165b57", "author_name": "DanDav", "entity_name": "Yr's Tower", "target_type": "entity", "entity_note_id": "81f202a0-f120-4fc5-adaf-f301b6008bd1"}	/entities/e6fed39e-c171-4efe-b32d-9e5067165b57?campaignId=65019483-f077-4a93-83b6-b8c97864afd1#notes	2025-11-20 20:53:50.852+00	2025-11-20 20:54:14.369+00
2c4eb376-04cc-4ba3-9557-bf5bda44c46f	704d70ff-e300-4126-b526-d034acaedbd7	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "6788ccb0-7b68-49a6-a0f2-cf70531ecd2c"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 21:37:23.922+00	2025-11-20 21:37:23.922+00
e75a08b5-9ba4-4475-8bad-2a8aa4608bd8	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:10:58.26+00	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "6788ccb0-7b68-49a6-a0f2-cf70531ecd2c"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 21:37:23.922+00	2025-11-21 09:10:58.261+00
d639ee04-b495-45ab-905b-52963583df59	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:11:01.055+00	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "a76cd99f-d550-4779-a8cd-739cc07edda3"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 12:53:10.534+00	2025-11-21 09:11:01.056+00
bff07fa9-b36c-4f61-8274-f42527a3177a	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "6788ccb0-7b68-49a6-a0f2-cf70531ecd2c"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 21:37:23.922+00	2025-11-20 21:37:23.922+00
19568709-8439-4321-b879-99523fc2d50c	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-20 21:37:49.485+00	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-20", "session_title": "Session on Nov 20, 2025", "session_note_id": "6788ccb0-7b68-49a6-a0f2-cf70531ecd2c"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-20 21:37:23.922+00	2025-11-20 21:37:49.485+00
6f9b0392-2165-4288-92c9-68f72cef618c	704d70ff-e300-4126-b526-d034acaedbd7	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:18.52+00	2025-11-21 09:33:18.52+00
7145629d-dcb2-4145-8c7f-040e217f19f0	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:18.52+00	2025-11-21 09:33:18.52+00
f7de6e0b-e933-499e-b753-5ea0080f0168	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:18.52+00	2025-11-21 09:33:18.52+00
9177081c-092f-4635-9d87-5ae3ab2bad9c	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:22.245+00	2025-11-21 09:33:22.245+00
d57d4b3f-7c84-47b1-bd2f-cbf3c2cb3992	704d70ff-e300-4126-b526-d034acaedbd7	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:22.245+00	2025-11-21 09:33:22.245+00
fb779534-102b-4a89-805e-5503ed0c1e87	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:22.245+00	2025-11-21 09:33:22.245+00
953d75cc-68a9-4254-9f85-c0a3dcd29b86	704d70ff-e300-4126-b526-d034acaedbd7	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-04", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:29.961+00	2025-11-21 09:33:29.961+00
704d760b-2fa4-46c2-aad5-ce2a97d6a8f5	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-04", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:29.961+00	2025-11-21 09:33:29.961+00
8465a5de-0785-4967-8785-934a69390a89	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-04", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:29.961+00	2025-11-21 09:33:29.961+00
a3c74da7-cf04-4f76-8613-da02f44afb97	ecf1ae57-7d88-4763-ad45-23a239523246	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:35:20.049+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-04", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:29.961+00	2025-11-21 09:35:20.049+00
c46e7097-d062-4f53-9be4-e1657f892418	ecf1ae57-7d88-4763-ad45-23a239523246	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:35:21.22+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:22.245+00	2025-11-21 09:35:21.22+00
153c9291-81c0-44fd-b0d1-0eca8dbb9b73	ecf1ae57-7d88-4763-ad45-23a239523246	session_note_added	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:35:21.72+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:18.52+00	2025-11-21 09:35:21.72+00
95cec335-44a9-4338-9487-92cd0300f5ab	ecf1ae57-7d88-4763-ad45-23a239523246	entity_mention_session_note	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:35:22.136+00	{"author_id": "b898b6e9-2920-4334-8b48-0fde3ec9c4fe", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "DanDav", "target_type": "campaign", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a", "related_entity_id": "a202e9a8-6219-4a15-b0ee-ed7589264032", "related_entity_name": "Vedast Corvon"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:33:29.983+00	2025-11-21 09:35:22.136+00
780b93ab-fe8c-4c70-9a0d-bd0d2115cc43	704d70ff-e300-4126-b526-d034acaedbd7	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:46:11.642+00	2025-11-21 09:46:11.642+00
3ab56ada-8c9a-41ac-8588-d5f9cf692900	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:46:11.642+00	2025-11-21 09:46:11.642+00
dfc6272b-b21c-4ec1-9f75-2b0650266bb4	a3bc8328-8169-4bfa-8177-dd2e088316d5	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:46:37.254+00	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:46:11.643+00	2025-11-21 09:46:37.254+00
4ac849cb-ff9e-4d0f-bad6-db2d86595914	704d70ff-e300-4126-b526-d034acaedbd7	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "a3bc8328-8169-4bfa-8177-dd2e088316d5", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "Clockwise", "campaign_id": "65019483-f077-4a93-83b6-b8c97864afd1", "target_type": "campaign", "session_date": "2025-11-04", "campaign_name": "Shadows of Varathia", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:52:44.101+00	2025-11-21 09:52:44.101+00
6dcffa52-c42c-4e8e-a238-cb20b3387f5f	ecabb309-9335-4b32-8e3b-42abd3f328e1	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	f	\N	{"author_id": "a3bc8328-8169-4bfa-8177-dd2e088316d5", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "Clockwise", "campaign_id": "65019483-f077-4a93-83b6-b8c97864afd1", "target_type": "campaign", "session_date": "2025-11-04", "campaign_name": "Shadows of Varathia", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:52:44.101+00	2025-11-21 09:52:44.101+00
8df09ba5-72a7-4942-b520-21054e32ee0a	ecf1ae57-7d88-4763-ad45-23a239523246	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:52:54.04+00	{"author_id": "a3bc8328-8169-4bfa-8177-dd2e088316d5", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "Clockwise", "campaign_id": "65019483-f077-4a93-83b6-b8c97864afd1", "target_type": "campaign", "session_date": "2025-11-04", "campaign_name": "Shadows of Varathia", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:52:44.101+00	2025-11-21 09:52:54.04+00
dd26aca9-2d74-4add-b0e7-70a92a62f177	ecf1ae57-7d88-4763-ad45-23a239523246	entity_mention_session_note	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 09:52:54.47+00	{"author_id": "a3bc8328-8169-4bfa-8177-dd2e088316d5", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "Clockwise", "target_type": "campaign", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a", "related_entity_id": "a202e9a8-6219-4a15-b0ee-ed7589264032", "related_entity_name": "Vedast Corvon"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:52:44.138+00	2025-11-21 09:52:54.47+00
b6f9323d-45d6-4479-9a32-02d3fa81850d	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 10:32:15.994+00	{"author_id": "a3bc8328-8169-4bfa-8177-dd2e088316d5", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "Clockwise", "campaign_id": "65019483-f077-4a93-83b6-b8c97864afd1", "target_type": "campaign", "session_date": "2025-11-04", "campaign_name": "Shadows of Varathia", "session_title": "Session 74 - In Search of Strength", "session_note_id": "d997a752-8f55-48f4-b51c-4aac376c3e2a"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:52:44.101+00	2025-11-21 10:32:15.994+00
efd51401-214a-4700-81a7-fde69cd7883e	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	session_note_updated	65019483-f077-4a93-83b6-b8c97864afd1	t	2025-11-21 10:32:20.119+00	{"author_id": "ecf1ae57-7d88-4763-ad45-23a239523246", "target_id": "65019483-f077-4a93-83b6-b8c97864afd1", "author_name": "AndrewD", "target_type": "campaign", "session_date": "2025-11-21", "session_title": "Session on Nov 21, 2025", "session_note_id": "644b7129-ee0f-4bef-990c-986f9e31aea2"}	/notes/session?campaignId=65019483-f077-4a93-83b6-b8c97864afd1	2025-11-21 09:46:11.642+00	2025-11-21 10:32:20.119+00
f08e79ba-fd29-4410-8fc0-dab54cf1e60a	ecf1ae57-7d88-4763-ad45-23a239523246	request_status_changed	\N	t	2025-11-21 10:33:36.014+00	{"target_id": "9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5", "new_status": "testing", "old_status": "backlog", "request_id": "9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5", "target_type": "request", "request_title": "Modernise the UI for Feature/Bugs"}	/requests/9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5	2025-11-21 10:31:24.348+00	2025-11-21 10:33:36.014+00
1263b3c6-723f-4fe7-91d5-0d81d8d7a08f	ecf1ae57-7d88-4763-ad45-23a239523246	request_note_added	\N	t	2025-11-21 10:49:29.345+00	{"author_id": "bbb230ba-a90c-46be-8102-8ff66d3bac72", "target_id": "174aa44d-4938-45b8-9d89-4e11beca5efb", "request_id": "174aa44d-4938-45b8-9d89-4e11beca5efb", "author_name": "Andrew Drinkwater", "target_type": "request", "request_title": "Test issue", "request_note_id": "839ea87e-7c69-48d7-9fbd-813d71853e64"}	/requests/174aa44d-4938-45b8-9d89-4e11beca5efb	2025-11-21 10:34:41.861+00	2025-11-21 10:49:29.346+00
a6357e1e-8ec1-49b9-ad8b-ecbbf036d604	ecf1ae57-7d88-4763-ad45-23a239523246	request_status_changed	\N	t	2025-11-21 10:49:36.325+00	{"target_id": "174aa44d-4938-45b8-9d89-4e11beca5efb", "new_status": "testing", "old_status": "open", "request_id": "174aa44d-4938-45b8-9d89-4e11beca5efb", "target_type": "request", "request_title": "Test issue"}	/requests/174aa44d-4938-45b8-9d89-4e11beca5efb	2025-11-21 10:34:36.831+00	2025-11-21 10:49:36.325+00
255995ff-4096-4e41-91fa-752ffe4079d5	ecf1ae57-7d88-4763-ad45-23a239523246	request_status_changed	\N	t	2025-11-21 10:49:37.175+00	{"target_id": "9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5", "new_status": "backlog", "old_status": "open", "request_id": "9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5", "target_type": "request", "request_title": "Modernise the UI for Feature/Bugs"}	/requests/9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5	2025-11-21 10:23:33.542+00	2025-11-21 10:49:37.175+00
\.


--
-- Data for Name: request_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.request_notes (id, request_id, content, created_by, created_at, updated_at) FROM stdin;
2e536e94-934e-4b28-85e2-0850479f9db3	9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5	Hello	ecf1ae57-7d88-4763-ad45-23a239523246	2025-11-21 10:17:03.268+00	2025-11-21 10:17:03.268+00
f5c18523-19ab-4712-9255-5278054a6fd2	174aa44d-4938-45b8-9d89-4e11beca5efb	asdasd	ecf1ae57-7d88-4763-ad45-23a239523246	2025-11-21 10:34:13.643+00	2025-11-21 10:34:13.643+00
839ea87e-7c69-48d7-9fbd-813d71853e64	174aa44d-4938-45b8-9d89-4e11beca5efb	asdasd	bbb230ba-a90c-46be-8102-8ff66d3bac72	2025-11-21 10:34:41.803+00	2025-11-21 10:34:41.803+00
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.requests (id, type, title, description, status, created_by, assigned_to, priority, is_in_backlog, created_at, updated_at, tester_id) FROM stdin;
9ea51aa1-bdf5-4c60-ba17-d0adc4d85df5	feature	Modernise the UI for Feature/Bugs	Make it look like the rest of the platform	testing	ecf1ae57-7d88-4763-ad45-23a239523246	\N	high	f	2025-11-21 10:16:44.035+00	2025-11-21 10:31:39.011+00	b898b6e9-2920-4334-8b48-0fde3ec9c4fe
174aa44d-4938-45b8-9d89-4e11beca5efb	bug	Test issue	Hello	testing	ecf1ae57-7d88-4763-ad45-23a239523246	\N	medium	f	2025-11-21 10:34:05.721+00	2025-11-21 10:34:36.829+00	b898b6e9-2920-4334-8b48-0fde3ec9c4fe
\.


--
-- Data for Name: session_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_notes (id, campaign_id, session_date, session_title, content, mentions, created_by, updated_by, created_at, updated_at, content_html) FROM stdin;
ee35386b-620b-461f-82dc-acb1dcd26de4	14883473-40f7-4667-b417-b3946b2d2fc1	2025-08-26	0 - A proper night out	@[Daxen Bane](3f524760-db38-4f8f-bae9-95590f9e550e), @[Elliot Hightower](fca4686e-4b83-4ff5-8ca7-bb0e00e50ba7), @[Xanzaphir](7d306de2-852c-448a-a612-f896690ecd45) and @[Sylbella Firenyl](a1a71f61-eea8-4cc4-a29d-e0b140a52247) enter @[The Painted Petal](3bf341e3-61c7-46ae-80a4-04d508a863a1) for their own reasons encounter a strange event happening where the bands Drummer who was playing died from drowning (On Land) and then spawned swarms of Rats from their body. The 4 work as one and quickly take out the rats that crashed the party. With everyone's own goal of meeting @[Joridiah Bleakly](2cb3e233-c652-4b5f-9952-a2b2e2429448), Lord of Cloverfell, for help with their own problems the now group were also tasked with finding out what happen to the Drummer by the bands Front Man @[Yuri](7c4ee38f-5401-4be6-b6ec-eaa8d99ca232), with mixed interest the group disbands for the night and agreed to meet in the morning to talk things over. \n	[{"entityId": "3f524760-db38-4f8f-bae9-95590f9e550e", "entityName": "Daxen Bane"}, {"entityId": "fca4686e-4b83-4ff5-8ca7-bb0e00e50ba7", "entityName": "Elliot Hightower"}, {"entityId": "7d306de2-852c-448a-a612-f896690ecd45", "entityName": "Xanzaphir"}, {"entityId": "a1a71f61-eea8-4cc4-a29d-e0b140a52247", "entityName": "Sylbella Firenyl"}, {"entityId": "3bf341e3-61c7-46ae-80a4-04d508a863a1", "entityName": "The Painted Petal"}, {"entityId": "2cb3e233-c652-4b5f-9952-a2b2e2429448", "entityName": "Joridiah Bleakly"}, {"entityId": "7c4ee38f-5401-4be6-b6ec-eaa8d99ca232", "entityName": "Yuri"}]	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	a3bc8328-8169-4bfa-8177-dd2e088316d5	2025-11-14 16:38:21.478+00	2025-11-14 18:01:39.983+00	
adcc6573-9dc2-43fa-ace9-6c78af405cef	14883473-40f7-4667-b417-b3946b2d2fc1	2025-09-07	1 - Drown And Out	The group meet and welcome a new face as they start their investigation into the drownings that have been happening, it takes them all over @[Cloverfell](436c98fb-5c16-421c-aba4-e556470e1ec5) as they uncover a curse attached to a locket bought from a mysterious traveling trader at the heart of it. The group now race to @[The Old Blue Well](01c5c7a8-a830-40f4-b2ab-8ee39b0f25f6), the place of @[Talia](94e0e249-7846-4676-a28b-92a2bd879a5f)'s death to put a stop to the vengeful spirit that is causing the deaths... before it is too late.	[{"entityId": "436c98fb-5c16-421c-aba4-e556470e1ec5", "entityName": "Cloverfell"}, {"entityId": "01c5c7a8-a830-40f4-b2ab-8ee39b0f25f6", "entityName": "The Old Blue Well"}, {"entityId": "94e0e249-7846-4676-a28b-92a2bd879a5f", "entityName": "Talia"}]	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	a3bc8328-8169-4bfa-8177-dd2e088316d5	2025-11-14 16:40:45.059+00	2025-11-14 22:22:25.251+00	
07e23548-8caa-4e24-8b97-19d96ed55df5	14883473-40f7-4667-b417-b3946b2d2fc1	2025-10-05	2 - The Old Blue Well	The team make their way to the @[The Old Blue Well](01c5c7a8-a830-40f4-b2ab-8ee39b0f25f6) and perform the ritual given to them by the Priest of Kelemvor to bring out the spirit of @Talia. The group fight the spirit and succeed in stopping the threat and putting Talia to rest once and for all. With another task completed the group were approached by Father Rodegger, who suggests they join as adventurers for the High Seekers in order to gain favour which will get them one step closer to an audience with Bleakly. With a new name and task in hand, The Sentinels Of The Shield make their way to The Weeping Orchard to begin their new task.	[{"entityId": "01c5c7a8-a830-40f4-b2ab-8ee39b0f25f6", "entityName": "The Old Blue Well"}]	b898b6e9-2920-4334-8b48-0fde3ec9c4fe	ecf1ae57-7d88-4763-ad45-23a239523246	2025-11-14 16:42:33.089+00	2025-11-19 10:38:30.015+00	
3980059f-36b8-479d-9a57-b032c0335ad8	14883473-40f7-4667-b417-b3946b2d2fc1	2025-11-18	Session on Nov 18, 2025		[]	ecf1ae57-7d88-4763-ad45-23a239523246	ecf1ae57-7d88-4763-ad45-23a239523246	2025-11-18 22:43:33.716+00	2025-11-19 11:08:51.71+00	
d997a752-8f55-48f4-b51c-4aac376c3e2a	65019483-f077-4a93-83b6-b8c97864afd1	2025-11-04	Session 74 - In Search of Strength	The @[Golden Rose Agency](ca108abd-4b73-46bc-a489-486aa9fc2458) are surprised by a sudden of everyone around them brought on by a vision @[Hans Freeguard](17db8fa3-d267-4d70-86f1-58d1d8c3ac19) has of @[The Writgiest](3e4fb933-a6a2-4bc0-8c9c-b2bd858b0912) ordering him to not abandon Peerbane again. The Dungeon Master intervenes and takes The Agency back to the players camp for some much needed rest and planning. Back at camp everyone begins working on finding more information on where to go next with Hans and @[Casper Birthright](15ae1b52-70e0-42e3-a679-9a17830ba8a3) team up to intimidate other players while @[Vedast Corvon](a202e9a8-6219-4a15-b0ee-ed7589264032) and @[Ashe Cottontail](9b686b74-fc94-43c4-9301-91c77dce6df1) work on snooping. Everyone meets back up again to discuss their finding and after a heated debate the Team focus on getting the Mark of Strength before going anywhere else for more information. They make their way and fly over the battle field between the Fire Giants and the Stone Giants, arriving at the Glass Plate Temple and offering their assistance to the Stone Giants....	[{"entityId": "ca108abd-4b73-46bc-a489-486aa9fc2458", "entityName": "Golden Rose Agency"}, {"entityId": "17db8fa3-d267-4d70-86f1-58d1d8c3ac19", "entityName": "Hans Freeguard"}, {"entityId": "3e4fb933-a6a2-4bc0-8c9c-b2bd858b0912", "entityName": "The Writgiest"}, {"entityId": "15ae1b52-70e0-42e3-a679-9a17830ba8a3", "entityName": "Casper Birthright"}, {"entityId": "a202e9a8-6219-4a15-b0ee-ed7589264032", "entityName": "Vedast Corvon"}, {"entityId": "9b686b74-fc94-43c4-9301-91c77dce6df1", "entityName": "Ashe Cottontail"}]	a3bc8328-8169-4bfa-8177-dd2e088316d5	a3bc8328-8169-4bfa-8177-dd2e088316d5	2025-11-10 18:14:46.53+00	2025-11-21 09:52:44.087+00	
\.


--
-- Data for Name: uploaded_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.uploaded_files (id, entity_id, user_id, file_name, file_path, mime_type, size_bytes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_campaign_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_campaign_roles (id, user_id, campaign_id, role, created_at) FROM stdin;
\.


--
-- Name: Campaigns Campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaigns"
    ADD CONSTRAINT "Campaigns_pkey" PRIMARY KEY (id);


--
-- Name: Characters Characters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Characters"
    ADD CONSTRAINT "Characters_pkey" PRIMARY KEY (id);


--
-- Name: UserCampaignRoles UserCampaignRoles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserCampaignRoles"
    ADD CONSTRAINT "UserCampaignRoles_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY (id);


--
-- Name: Users Users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key" UNIQUE (username);


--
-- Name: Users Users_username_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key1" UNIQUE (username);


--
-- Name: Users Users_username_key10; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key10" UNIQUE (username);


--
-- Name: Users Users_username_key100; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key100" UNIQUE (username);


--
-- Name: Users Users_username_key101; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key101" UNIQUE (username);


--
-- Name: Users Users_username_key102; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key102" UNIQUE (username);


--
-- Name: Users Users_username_key103; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key103" UNIQUE (username);


--
-- Name: Users Users_username_key104; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key104" UNIQUE (username);


--
-- Name: Users Users_username_key105; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key105" UNIQUE (username);


--
-- Name: Users Users_username_key106; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key106" UNIQUE (username);


--
-- Name: Users Users_username_key107; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key107" UNIQUE (username);


--
-- Name: Users Users_username_key108; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key108" UNIQUE (username);


--
-- Name: Users Users_username_key109; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key109" UNIQUE (username);


--
-- Name: Users Users_username_key11; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key11" UNIQUE (username);


--
-- Name: Users Users_username_key110; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key110" UNIQUE (username);


--
-- Name: Users Users_username_key111; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key111" UNIQUE (username);


--
-- Name: Users Users_username_key112; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key112" UNIQUE (username);


--
-- Name: Users Users_username_key113; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key113" UNIQUE (username);


--
-- Name: Users Users_username_key114; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key114" UNIQUE (username);


--
-- Name: Users Users_username_key115; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key115" UNIQUE (username);


--
-- Name: Users Users_username_key116; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key116" UNIQUE (username);


--
-- Name: Users Users_username_key117; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key117" UNIQUE (username);


--
-- Name: Users Users_username_key118; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key118" UNIQUE (username);


--
-- Name: Users Users_username_key119; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key119" UNIQUE (username);


--
-- Name: Users Users_username_key12; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key12" UNIQUE (username);


--
-- Name: Users Users_username_key120; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key120" UNIQUE (username);


--
-- Name: Users Users_username_key121; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key121" UNIQUE (username);


--
-- Name: Users Users_username_key122; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key122" UNIQUE (username);


--
-- Name: Users Users_username_key123; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key123" UNIQUE (username);


--
-- Name: Users Users_username_key124; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key124" UNIQUE (username);


--
-- Name: Users Users_username_key125; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key125" UNIQUE (username);


--
-- Name: Users Users_username_key126; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key126" UNIQUE (username);


--
-- Name: Users Users_username_key127; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key127" UNIQUE (username);


--
-- Name: Users Users_username_key128; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key128" UNIQUE (username);


--
-- Name: Users Users_username_key129; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key129" UNIQUE (username);


--
-- Name: Users Users_username_key13; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key13" UNIQUE (username);


--
-- Name: Users Users_username_key130; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key130" UNIQUE (username);


--
-- Name: Users Users_username_key131; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key131" UNIQUE (username);


--
-- Name: Users Users_username_key132; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key132" UNIQUE (username);


--
-- Name: Users Users_username_key133; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key133" UNIQUE (username);


--
-- Name: Users Users_username_key134; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key134" UNIQUE (username);


--
-- Name: Users Users_username_key135; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key135" UNIQUE (username);


--
-- Name: Users Users_username_key136; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key136" UNIQUE (username);


--
-- Name: Users Users_username_key137; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key137" UNIQUE (username);


--
-- Name: Users Users_username_key138; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key138" UNIQUE (username);


--
-- Name: Users Users_username_key139; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key139" UNIQUE (username);


--
-- Name: Users Users_username_key14; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key14" UNIQUE (username);


--
-- Name: Users Users_username_key140; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key140" UNIQUE (username);


--
-- Name: Users Users_username_key141; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key141" UNIQUE (username);


--
-- Name: Users Users_username_key142; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key142" UNIQUE (username);


--
-- Name: Users Users_username_key143; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key143" UNIQUE (username);


--
-- Name: Users Users_username_key144; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key144" UNIQUE (username);


--
-- Name: Users Users_username_key145; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key145" UNIQUE (username);


--
-- Name: Users Users_username_key146; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key146" UNIQUE (username);


--
-- Name: Users Users_username_key147; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key147" UNIQUE (username);


--
-- Name: Users Users_username_key148; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key148" UNIQUE (username);


--
-- Name: Users Users_username_key149; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key149" UNIQUE (username);


--
-- Name: Users Users_username_key15; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key15" UNIQUE (username);


--
-- Name: Users Users_username_key150; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key150" UNIQUE (username);


--
-- Name: Users Users_username_key151; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key151" UNIQUE (username);


--
-- Name: Users Users_username_key152; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key152" UNIQUE (username);


--
-- Name: Users Users_username_key153; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key153" UNIQUE (username);


--
-- Name: Users Users_username_key154; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key154" UNIQUE (username);


--
-- Name: Users Users_username_key155; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key155" UNIQUE (username);


--
-- Name: Users Users_username_key156; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key156" UNIQUE (username);


--
-- Name: Users Users_username_key157; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key157" UNIQUE (username);


--
-- Name: Users Users_username_key158; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key158" UNIQUE (username);


--
-- Name: Users Users_username_key159; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key159" UNIQUE (username);


--
-- Name: Users Users_username_key16; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key16" UNIQUE (username);


--
-- Name: Users Users_username_key160; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key160" UNIQUE (username);


--
-- Name: Users Users_username_key161; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key161" UNIQUE (username);


--
-- Name: Users Users_username_key162; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key162" UNIQUE (username);


--
-- Name: Users Users_username_key163; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key163" UNIQUE (username);


--
-- Name: Users Users_username_key164; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key164" UNIQUE (username);


--
-- Name: Users Users_username_key165; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key165" UNIQUE (username);


--
-- Name: Users Users_username_key166; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key166" UNIQUE (username);


--
-- Name: Users Users_username_key167; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key167" UNIQUE (username);


--
-- Name: Users Users_username_key168; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key168" UNIQUE (username);


--
-- Name: Users Users_username_key169; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key169" UNIQUE (username);


--
-- Name: Users Users_username_key17; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key17" UNIQUE (username);


--
-- Name: Users Users_username_key170; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key170" UNIQUE (username);


--
-- Name: Users Users_username_key171; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key171" UNIQUE (username);


--
-- Name: Users Users_username_key172; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key172" UNIQUE (username);


--
-- Name: Users Users_username_key173; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key173" UNIQUE (username);


--
-- Name: Users Users_username_key174; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key174" UNIQUE (username);


--
-- Name: Users Users_username_key175; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key175" UNIQUE (username);


--
-- Name: Users Users_username_key176; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key176" UNIQUE (username);


--
-- Name: Users Users_username_key177; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key177" UNIQUE (username);


--
-- Name: Users Users_username_key178; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key178" UNIQUE (username);


--
-- Name: Users Users_username_key179; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key179" UNIQUE (username);


--
-- Name: Users Users_username_key18; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key18" UNIQUE (username);


--
-- Name: Users Users_username_key180; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key180" UNIQUE (username);


--
-- Name: Users Users_username_key181; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key181" UNIQUE (username);


--
-- Name: Users Users_username_key182; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key182" UNIQUE (username);


--
-- Name: Users Users_username_key183; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key183" UNIQUE (username);


--
-- Name: Users Users_username_key184; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key184" UNIQUE (username);


--
-- Name: Users Users_username_key185; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key185" UNIQUE (username);


--
-- Name: Users Users_username_key186; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key186" UNIQUE (username);


--
-- Name: Users Users_username_key187; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key187" UNIQUE (username);


--
-- Name: Users Users_username_key188; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key188" UNIQUE (username);


--
-- Name: Users Users_username_key189; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key189" UNIQUE (username);


--
-- Name: Users Users_username_key19; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key19" UNIQUE (username);


--
-- Name: Users Users_username_key190; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key190" UNIQUE (username);


--
-- Name: Users Users_username_key191; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key191" UNIQUE (username);


--
-- Name: Users Users_username_key192; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key192" UNIQUE (username);


--
-- Name: Users Users_username_key193; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key193" UNIQUE (username);


--
-- Name: Users Users_username_key194; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key194" UNIQUE (username);


--
-- Name: Users Users_username_key195; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key195" UNIQUE (username);


--
-- Name: Users Users_username_key196; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key196" UNIQUE (username);


--
-- Name: Users Users_username_key197; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key197" UNIQUE (username);


--
-- Name: Users Users_username_key198; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key198" UNIQUE (username);


--
-- Name: Users Users_username_key199; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key199" UNIQUE (username);


--
-- Name: Users Users_username_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key2" UNIQUE (username);


--
-- Name: Users Users_username_key20; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key20" UNIQUE (username);


--
-- Name: Users Users_username_key200; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key200" UNIQUE (username);


--
-- Name: Users Users_username_key201; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key201" UNIQUE (username);


--
-- Name: Users Users_username_key202; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key202" UNIQUE (username);


--
-- Name: Users Users_username_key203; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key203" UNIQUE (username);


--
-- Name: Users Users_username_key204; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key204" UNIQUE (username);


--
-- Name: Users Users_username_key205; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key205" UNIQUE (username);


--
-- Name: Users Users_username_key206; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key206" UNIQUE (username);


--
-- Name: Users Users_username_key207; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key207" UNIQUE (username);


--
-- Name: Users Users_username_key208; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key208" UNIQUE (username);


--
-- Name: Users Users_username_key209; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key209" UNIQUE (username);


--
-- Name: Users Users_username_key21; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key21" UNIQUE (username);


--
-- Name: Users Users_username_key210; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key210" UNIQUE (username);


--
-- Name: Users Users_username_key211; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key211" UNIQUE (username);


--
-- Name: Users Users_username_key212; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key212" UNIQUE (username);


--
-- Name: Users Users_username_key213; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key213" UNIQUE (username);


--
-- Name: Users Users_username_key214; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key214" UNIQUE (username);


--
-- Name: Users Users_username_key215; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key215" UNIQUE (username);


--
-- Name: Users Users_username_key216; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key216" UNIQUE (username);


--
-- Name: Users Users_username_key217; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key217" UNIQUE (username);


--
-- Name: Users Users_username_key218; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key218" UNIQUE (username);


--
-- Name: Users Users_username_key219; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key219" UNIQUE (username);


--
-- Name: Users Users_username_key22; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key22" UNIQUE (username);


--
-- Name: Users Users_username_key220; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key220" UNIQUE (username);


--
-- Name: Users Users_username_key221; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key221" UNIQUE (username);


--
-- Name: Users Users_username_key222; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key222" UNIQUE (username);


--
-- Name: Users Users_username_key223; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key223" UNIQUE (username);


--
-- Name: Users Users_username_key224; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key224" UNIQUE (username);


--
-- Name: Users Users_username_key225; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key225" UNIQUE (username);


--
-- Name: Users Users_username_key226; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key226" UNIQUE (username);


--
-- Name: Users Users_username_key227; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key227" UNIQUE (username);


--
-- Name: Users Users_username_key228; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key228" UNIQUE (username);


--
-- Name: Users Users_username_key229; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key229" UNIQUE (username);


--
-- Name: Users Users_username_key23; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key23" UNIQUE (username);


--
-- Name: Users Users_username_key230; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key230" UNIQUE (username);


--
-- Name: Users Users_username_key231; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key231" UNIQUE (username);


--
-- Name: Users Users_username_key232; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key232" UNIQUE (username);


--
-- Name: Users Users_username_key233; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key233" UNIQUE (username);


--
-- Name: Users Users_username_key234; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key234" UNIQUE (username);


--
-- Name: Users Users_username_key235; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key235" UNIQUE (username);


--
-- Name: Users Users_username_key236; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key236" UNIQUE (username);


--
-- Name: Users Users_username_key237; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key237" UNIQUE (username);


--
-- Name: Users Users_username_key238; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key238" UNIQUE (username);


--
-- Name: Users Users_username_key239; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key239" UNIQUE (username);


--
-- Name: Users Users_username_key24; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key24" UNIQUE (username);


--
-- Name: Users Users_username_key240; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key240" UNIQUE (username);


--
-- Name: Users Users_username_key241; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key241" UNIQUE (username);


--
-- Name: Users Users_username_key242; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key242" UNIQUE (username);


--
-- Name: Users Users_username_key243; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key243" UNIQUE (username);


--
-- Name: Users Users_username_key244; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key244" UNIQUE (username);


--
-- Name: Users Users_username_key245; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key245" UNIQUE (username);


--
-- Name: Users Users_username_key246; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key246" UNIQUE (username);


--
-- Name: Users Users_username_key247; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key247" UNIQUE (username);


--
-- Name: Users Users_username_key248; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key248" UNIQUE (username);


--
-- Name: Users Users_username_key249; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key249" UNIQUE (username);


--
-- Name: Users Users_username_key25; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key25" UNIQUE (username);


--
-- Name: Users Users_username_key250; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key250" UNIQUE (username);


--
-- Name: Users Users_username_key251; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key251" UNIQUE (username);


--
-- Name: Users Users_username_key252; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key252" UNIQUE (username);


--
-- Name: Users Users_username_key253; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key253" UNIQUE (username);


--
-- Name: Users Users_username_key254; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key254" UNIQUE (username);


--
-- Name: Users Users_username_key255; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key255" UNIQUE (username);


--
-- Name: Users Users_username_key256; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key256" UNIQUE (username);


--
-- Name: Users Users_username_key257; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key257" UNIQUE (username);


--
-- Name: Users Users_username_key258; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key258" UNIQUE (username);


--
-- Name: Users Users_username_key259; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key259" UNIQUE (username);


--
-- Name: Users Users_username_key26; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key26" UNIQUE (username);


--
-- Name: Users Users_username_key260; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key260" UNIQUE (username);


--
-- Name: Users Users_username_key261; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key261" UNIQUE (username);


--
-- Name: Users Users_username_key262; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key262" UNIQUE (username);


--
-- Name: Users Users_username_key263; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key263" UNIQUE (username);


--
-- Name: Users Users_username_key264; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key264" UNIQUE (username);


--
-- Name: Users Users_username_key265; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key265" UNIQUE (username);


--
-- Name: Users Users_username_key266; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key266" UNIQUE (username);


--
-- Name: Users Users_username_key267; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key267" UNIQUE (username);


--
-- Name: Users Users_username_key268; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key268" UNIQUE (username);


--
-- Name: Users Users_username_key269; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key269" UNIQUE (username);


--
-- Name: Users Users_username_key27; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key27" UNIQUE (username);


--
-- Name: Users Users_username_key270; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key270" UNIQUE (username);


--
-- Name: Users Users_username_key271; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key271" UNIQUE (username);


--
-- Name: Users Users_username_key272; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key272" UNIQUE (username);


--
-- Name: Users Users_username_key273; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key273" UNIQUE (username);


--
-- Name: Users Users_username_key274; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key274" UNIQUE (username);


--
-- Name: Users Users_username_key275; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key275" UNIQUE (username);


--
-- Name: Users Users_username_key276; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key276" UNIQUE (username);


--
-- Name: Users Users_username_key277; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key277" UNIQUE (username);


--
-- Name: Users Users_username_key278; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key278" UNIQUE (username);


--
-- Name: Users Users_username_key279; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key279" UNIQUE (username);


--
-- Name: Users Users_username_key28; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key28" UNIQUE (username);


--
-- Name: Users Users_username_key280; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key280" UNIQUE (username);


--
-- Name: Users Users_username_key281; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key281" UNIQUE (username);


--
-- Name: Users Users_username_key282; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key282" UNIQUE (username);


--
-- Name: Users Users_username_key283; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key283" UNIQUE (username);


--
-- Name: Users Users_username_key284; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key284" UNIQUE (username);


--
-- Name: Users Users_username_key285; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key285" UNIQUE (username);


--
-- Name: Users Users_username_key286; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key286" UNIQUE (username);


--
-- Name: Users Users_username_key287; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key287" UNIQUE (username);


--
-- Name: Users Users_username_key29; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key29" UNIQUE (username);


--
-- Name: Users Users_username_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key3" UNIQUE (username);


--
-- Name: Users Users_username_key30; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key30" UNIQUE (username);


--
-- Name: Users Users_username_key31; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key31" UNIQUE (username);


--
-- Name: Users Users_username_key32; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key32" UNIQUE (username);


--
-- Name: Users Users_username_key33; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key33" UNIQUE (username);


--
-- Name: Users Users_username_key34; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key34" UNIQUE (username);


--
-- Name: Users Users_username_key35; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key35" UNIQUE (username);


--
-- Name: Users Users_username_key36; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key36" UNIQUE (username);


--
-- Name: Users Users_username_key37; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key37" UNIQUE (username);


--
-- Name: Users Users_username_key38; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key38" UNIQUE (username);


--
-- Name: Users Users_username_key39; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key39" UNIQUE (username);


--
-- Name: Users Users_username_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key4" UNIQUE (username);


--
-- Name: Users Users_username_key40; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key40" UNIQUE (username);


--
-- Name: Users Users_username_key41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key41" UNIQUE (username);


--
-- Name: Users Users_username_key42; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key42" UNIQUE (username);


--
-- Name: Users Users_username_key43; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key43" UNIQUE (username);


--
-- Name: Users Users_username_key44; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key44" UNIQUE (username);


--
-- Name: Users Users_username_key45; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key45" UNIQUE (username);


--
-- Name: Users Users_username_key46; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key46" UNIQUE (username);


--
-- Name: Users Users_username_key47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key47" UNIQUE (username);


--
-- Name: Users Users_username_key48; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key48" UNIQUE (username);


--
-- Name: Users Users_username_key49; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key49" UNIQUE (username);


--
-- Name: Users Users_username_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key5" UNIQUE (username);


--
-- Name: Users Users_username_key50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key50" UNIQUE (username);


--
-- Name: Users Users_username_key51; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key51" UNIQUE (username);


--
-- Name: Users Users_username_key52; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key52" UNIQUE (username);


--
-- Name: Users Users_username_key53; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key53" UNIQUE (username);


--
-- Name: Users Users_username_key54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key54" UNIQUE (username);


--
-- Name: Users Users_username_key55; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key55" UNIQUE (username);


--
-- Name: Users Users_username_key56; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key56" UNIQUE (username);


--
-- Name: Users Users_username_key57; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key57" UNIQUE (username);


--
-- Name: Users Users_username_key58; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key58" UNIQUE (username);


--
-- Name: Users Users_username_key59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key59" UNIQUE (username);


--
-- Name: Users Users_username_key6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key6" UNIQUE (username);


--
-- Name: Users Users_username_key60; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key60" UNIQUE (username);


--
-- Name: Users Users_username_key61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key61" UNIQUE (username);


--
-- Name: Users Users_username_key62; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key62" UNIQUE (username);


--
-- Name: Users Users_username_key63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key63" UNIQUE (username);


--
-- Name: Users Users_username_key64; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key64" UNIQUE (username);


--
-- Name: Users Users_username_key65; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key65" UNIQUE (username);


--
-- Name: Users Users_username_key66; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key66" UNIQUE (username);


--
-- Name: Users Users_username_key67; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key67" UNIQUE (username);


--
-- Name: Users Users_username_key68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key68" UNIQUE (username);


--
-- Name: Users Users_username_key69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key69" UNIQUE (username);


--
-- Name: Users Users_username_key7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key7" UNIQUE (username);


--
-- Name: Users Users_username_key70; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key70" UNIQUE (username);


--
-- Name: Users Users_username_key71; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key71" UNIQUE (username);


--
-- Name: Users Users_username_key72; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key72" UNIQUE (username);


--
-- Name: Users Users_username_key73; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key73" UNIQUE (username);


--
-- Name: Users Users_username_key74; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key74" UNIQUE (username);


--
-- Name: Users Users_username_key75; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key75" UNIQUE (username);


--
-- Name: Users Users_username_key76; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key76" UNIQUE (username);


--
-- Name: Users Users_username_key77; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key77" UNIQUE (username);


--
-- Name: Users Users_username_key78; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key78" UNIQUE (username);


--
-- Name: Users Users_username_key79; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key79" UNIQUE (username);


--
-- Name: Users Users_username_key8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key8" UNIQUE (username);


--
-- Name: Users Users_username_key80; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key80" UNIQUE (username);


--
-- Name: Users Users_username_key81; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key81" UNIQUE (username);


--
-- Name: Users Users_username_key82; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key82" UNIQUE (username);


--
-- Name: Users Users_username_key83; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key83" UNIQUE (username);


--
-- Name: Users Users_username_key84; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key84" UNIQUE (username);


--
-- Name: Users Users_username_key85; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key85" UNIQUE (username);


--
-- Name: Users Users_username_key86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key86" UNIQUE (username);


--
-- Name: Users Users_username_key87; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key87" UNIQUE (username);


--
-- Name: Users Users_username_key88; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key88" UNIQUE (username);


--
-- Name: Users Users_username_key89; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key89" UNIQUE (username);


--
-- Name: Users Users_username_key9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key9" UNIQUE (username);


--
-- Name: Users Users_username_key90; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key90" UNIQUE (username);


--
-- Name: Users Users_username_key91; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key91" UNIQUE (username);


--
-- Name: Users Users_username_key92; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key92" UNIQUE (username);


--
-- Name: Users Users_username_key93; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key93" UNIQUE (username);


--
-- Name: Users Users_username_key94; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key94" UNIQUE (username);


--
-- Name: Users Users_username_key95; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key95" UNIQUE (username);


--
-- Name: Users Users_username_key96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key96" UNIQUE (username);


--
-- Name: Users Users_username_key97; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key97" UNIQUE (username);


--
-- Name: Users Users_username_key98; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key98" UNIQUE (username);


--
-- Name: Users Users_username_key99; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "Users_username_key99" UNIQUE (username);


--
-- Name: Worlds Worlds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Worlds"
    ADD CONSTRAINT "Worlds_pkey" PRIMARY KEY (id);


--
-- Name: bulk_update_changes bulk_update_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_changes
    ADD CONSTRAINT bulk_update_changes_pkey PRIMARY KEY (id);


--
-- Name: bulk_update_runs bulk_update_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_runs
    ADD CONSTRAINT bulk_update_runs_pkey PRIMARY KEY (id);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entity_campaign_importance entity_campaign_importance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_campaign_importance
    ADD CONSTRAINT entity_campaign_importance_pkey PRIMARY KEY (id);


--
-- Name: entity_campaign_importance entity_campaign_importance_unique_entity_campaign; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_campaign_importance
    ADD CONSTRAINT entity_campaign_importance_unique_entity_campaign UNIQUE (entity_id, campaign_id);


--
-- Name: entity_collections entity_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_collections
    ADD CONSTRAINT entity_collections_pkey PRIMARY KEY (id);


--
-- Name: entity_follows entity_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_follows
    ADD CONSTRAINT entity_follows_pkey PRIMARY KEY (id);


--
-- Name: entity_list_preferences entity_list_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_list_preferences
    ADD CONSTRAINT entity_list_preferences_pkey PRIMARY KEY (id);


--
-- Name: entity_list_preferences entity_list_preferences_unique_scope; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_list_preferences
    ADD CONSTRAINT entity_list_preferences_unique_scope UNIQUE (entity_type_id, user_id);


--
-- Name: entity_notes entity_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_pkey PRIMARY KEY (id);


--
-- Name: entity_relationship_type_entity_types entity_relationship_type_entity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_type_entity_types
    ADD CONSTRAINT entity_relationship_type_entity_types_pkey PRIMARY KEY (id);


--
-- Name: entity_relationship_types entity_relationship_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_types
    ADD CONSTRAINT entity_relationship_types_pkey PRIMARY KEY (id);


--
-- Name: entity_relationships entity_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationships
    ADD CONSTRAINT entity_relationships_pkey PRIMARY KEY (id);


--
-- Name: entity_secret_permissions entity_secret_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secret_permissions
    ADD CONSTRAINT entity_secret_permissions_pkey PRIMARY KEY (id);


--
-- Name: entity_secret_permissions entity_secret_permissions_unique_secret_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secret_permissions
    ADD CONSTRAINT entity_secret_permissions_unique_secret_user UNIQUE (secret_id, user_id);


--
-- Name: entity_secrets entity_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secrets
    ADD CONSTRAINT entity_secrets_pkey PRIMARY KEY (id);


--
-- Name: entity_type_field_layouts entity_type_field_layouts_entity_field_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_field_layouts
    ADD CONSTRAINT entity_type_field_layouts_entity_field_unique UNIQUE (entity_type_id, entity_type_field_id);


--
-- Name: entity_type_field_layouts entity_type_field_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_field_layouts
    ADD CONSTRAINT entity_type_field_layouts_pkey PRIMARY KEY (id);


--
-- Name: entity_type_field_rules entity_type_field_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_field_rules
    ADD CONSTRAINT entity_type_field_rules_pkey PRIMARY KEY (id);


--
-- Name: entity_type_fields entity_type_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_fields
    ADD CONSTRAINT entity_type_fields_pkey PRIMARY KEY (id);


--
-- Name: entity_type_fields entity_type_fields_unique_name_per_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_fields
    ADD CONSTRAINT entity_type_fields_unique_name_per_type UNIQUE (entity_type_id, name);


--
-- Name: entity_types entity_types_name_key100; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key100 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key101; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key101 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key102; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key102 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key103; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key103 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key104; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key104 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key105; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key105 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key106; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key106 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key107; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key107 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key108; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key108 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key109; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key109 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key110; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key110 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key111; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key111 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key112; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key112 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key113; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key113 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key114; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key114 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key115; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key115 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key116; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key116 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key117; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key117 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key118; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key118 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key119; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key119 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key120; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key120 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key121; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key121 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key122; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key122 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key123; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key123 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key124; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key124 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key125; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key125 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key126; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key126 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key127; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key127 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key128; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key128 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key129; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key129 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key130; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key130 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key131; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key131 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key132; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key132 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key133; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key133 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key134; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key134 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key135; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key135 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key136; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key136 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key137; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key137 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key138; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key138 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key139; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key139 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key140; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key140 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key141; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key141 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key142; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key142 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key143; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key143 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key144; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key144 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key145; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key145 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key146; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key146 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key147; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key147 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key148; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key148 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key149; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key149 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key150; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key150 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key151; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key151 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key152; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key152 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key153; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key153 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key154; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key154 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key155; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key155 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key156; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key156 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key157; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key157 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key158; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key158 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key159; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key159 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key160; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key160 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key161; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key161 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key162; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key162 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key163; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key163 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key164; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key164 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key165; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key165 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key166; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key166 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key167; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key167 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key168; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key168 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key169; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key169 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key170; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key170 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key171; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key171 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key172; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key172 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key173; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key173 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key174; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key174 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key175; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key175 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key176; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key176 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key177; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key177 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key178; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key178 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key179; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key179 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key180; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key180 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key181; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key181 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key182; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key182 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key183; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key183 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key184; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key184 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key185; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key185 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key186; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key186 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key41; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key41 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key42; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key42 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key43; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key43 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key44; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key44 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key45; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key45 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key46; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key46 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key47 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key48; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key48 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key49; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key49 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key50 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key51; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key51 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key52; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key52 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key53; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key53 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key54; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key54 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key55; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key55 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key56; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key56 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key57; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key57 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key58; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key58 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key59 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key60; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key60 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key61 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key62; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key62 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key63; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key63 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key64; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key64 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key65; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key65 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key66; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key66 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key67; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key67 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key68 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key69; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key69 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key70; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key70 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key71; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key71 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key72; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key72 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key73; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key73 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key74; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key74 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key75; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key75 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key76; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key76 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key77; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key77 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key78; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key78 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key79; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key79 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key80; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key80 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key81; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key81 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key82; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key82 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key83; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key83 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key84; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key84 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key85; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key85 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key86 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key87; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key87 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key88; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key88 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key89; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key89 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key90; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key90 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key91; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key91 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key92; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key92 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key93; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key93 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key94; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key94 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key95; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key95 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key96 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key97; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key97 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key98; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key98 UNIQUE (name);


--
-- Name: entity_types entity_types_name_key99; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key99 UNIQUE (name);


--
-- Name: entity_types entity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_pkey PRIMARY KEY (id);


--
-- Name: entity_types entity_types_world_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_world_id_name_key UNIQUE (world_id, name);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: request_notes request_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: session_notes session_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_notes
    ADD CONSTRAINT session_notes_pkey PRIMARY KEY (id);


--
-- Name: entity_relationship_type_entity_types uniq_relationship_type_entity_type_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_type_entity_types
    ADD CONSTRAINT uniq_relationship_type_entity_type_role UNIQUE (relationship_type_id, entity_type_id, role);


--
-- Name: entity_relationship_types uniq_relationship_types_world_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_types
    ADD CONSTRAINT uniq_relationship_types_world_name UNIQUE (world_id, name);


--
-- Name: UserCampaignRoles unique_user_campaign_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserCampaignRoles"
    ADD CONSTRAINT unique_user_campaign_role UNIQUE (user_id, campaign_id);


--
-- Name: entity_follows unique_user_entity_campaign_follow; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_follows
    ADD CONSTRAINT unique_user_entity_campaign_follow UNIQUE (user_id, entity_id, campaign_id);


--
-- Name: uploaded_files uploaded_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_pkey PRIMARY KEY (id);


--
-- Name: user_campaign_roles user_campaign_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_campaign_roles
    ADD CONSTRAINT user_campaign_roles_pkey PRIMARY KEY (id);


--
-- Name: bulk_update_changes_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bulk_update_changes_entity_id ON public.bulk_update_changes USING btree (entity_id);


--
-- Name: bulk_update_changes_run_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bulk_update_changes_run_id ON public.bulk_update_changes USING btree (run_id);


--
-- Name: bulk_update_runs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bulk_update_runs_user_id ON public.bulk_update_runs USING btree (user_id);


--
-- Name: bulk_update_runs_world_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bulk_update_runs_world_id ON public.bulk_update_runs USING btree (world_id);


--
-- Name: entity_campaign_importance_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_campaign_importance_campaign_id ON public.entity_campaign_importance USING btree (campaign_id);


--
-- Name: entity_campaign_importance_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_campaign_importance_entity_id ON public.entity_campaign_importance USING btree (entity_id);


--
-- Name: entity_campaign_importance_importance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_campaign_importance_importance ON public.entity_campaign_importance USING btree (importance);


--
-- Name: entity_list_preferences_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_list_preferences_user_idx ON public.entity_list_preferences USING btree (user_id);


--
-- Name: entity_notes_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_notes_campaign_id ON public.entity_notes USING btree (campaign_id);


--
-- Name: entity_notes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_notes_created_by ON public.entity_notes USING btree (created_by);


--
-- Name: entity_notes_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_notes_entity_id ON public.entity_notes USING btree (entity_id);


--
-- Name: entity_notes_share_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_notes_share_type ON public.entity_notes USING btree (share_type);


--
-- Name: entity_secret_permissions_unique_secret_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX entity_secret_permissions_unique_secret_campaign ON public.entity_secret_permissions USING btree (secret_id, campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: entity_type_field_layouts_entity_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_type_field_layouts_entity_type_idx ON public.entity_type_field_layouts USING btree (entity_type_id);


--
-- Name: entity_type_field_layouts_field_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_type_field_layouts_field_idx ON public.entity_type_field_layouts USING btree (entity_type_field_id);


--
-- Name: entity_type_field_rules_entity_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_type_field_rules_entity_type_idx ON public.entity_type_field_rules USING btree (entity_type_id);


--
-- Name: entity_type_field_rules_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_type_field_rules_priority_idx ON public.entity_type_field_rules USING btree (priority);


--
-- Name: idx_entities_read_campaign_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_read_campaign_ids ON public.entities USING gin (read_campaign_ids);


--
-- Name: idx_entities_read_character_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_read_character_ids ON public.entities USING gin (read_character_ids);


--
-- Name: idx_entities_read_user_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_read_user_ids ON public.entities USING gin (read_user_ids);


--
-- Name: idx_entities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_type ON public.entities USING btree (entity_type_id);


--
-- Name: idx_entities_world; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_world ON public.entities USING btree (world_id);


--
-- Name: idx_entities_write_campaign_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_write_campaign_ids ON public.entities USING gin (write_campaign_ids);


--
-- Name: idx_entities_write_user_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_write_user_ids ON public.entities USING gin (write_user_ids);


--
-- Name: idx_entity_collections_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_collections_owner_id ON public.entity_collections USING btree (owner_id);


--
-- Name: idx_entity_collections_world_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_collections_world_id ON public.entity_collections USING btree (world_id);


--
-- Name: idx_entity_follows_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_follows_campaign_id ON public.entity_follows USING btree (campaign_id);


--
-- Name: idx_entity_follows_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_follows_entity_id ON public.entity_follows USING btree (entity_id);


--
-- Name: idx_entity_follows_user_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_follows_user_campaign ON public.entity_follows USING btree (user_id, campaign_id);


--
-- Name: idx_entity_follows_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_follows_user_id ON public.entity_follows USING btree (user_id);


--
-- Name: idx_entity_relationships_from; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_relationships_from ON public.entity_relationships USING btree (from_entity);


--
-- Name: idx_entity_relationships_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_relationships_to ON public.entity_relationships USING btree (to_entity);


--
-- Name: idx_notifications_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_campaign_id ON public.notifications USING btree (campaign_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_campaign ON public.notifications USING btree (user_id, campaign_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read);


--
-- Name: idx_relationship_types_world; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_relationship_types_world ON public.entity_relationship_types USING btree (world_id);


--
-- Name: idx_request_notes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_notes_created_by ON public.request_notes USING btree (created_by);


--
-- Name: idx_request_notes_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_notes_request_id ON public.request_notes USING btree (request_id);


--
-- Name: idx_requests_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requests_assigned_to ON public.requests USING btree (assigned_to);


--
-- Name: idx_requests_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requests_created_by ON public.requests USING btree (created_by);


--
-- Name: idx_requests_is_in_backlog; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requests_is_in_backlog ON public.requests USING btree (is_in_backlog);


--
-- Name: idx_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requests_status ON public.requests USING btree (status);


--
-- Name: idx_requests_tester_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requests_tester_id ON public.requests USING btree (tester_id);


--
-- Name: idx_requests_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_requests_type ON public.requests USING btree (type);


--
-- Name: session_notes_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX session_notes_campaign_id ON public.session_notes USING btree (campaign_id);


--
-- Name: session_notes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX session_notes_created_by ON public.session_notes USING btree (created_by);


--
-- Name: session_notes_session_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX session_notes_session_date ON public.session_notes USING btree (session_date);


--
-- Name: Campaigns Campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaigns"
    ADD CONSTRAINT "Campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Campaigns Campaigns_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaigns"
    ADD CONSTRAINT "Campaigns_world_id_fkey" FOREIGN KEY (world_id) REFERENCES public."Worlds"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Characters Characters_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Characters"
    ADD CONSTRAINT "Characters_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Characters Characters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Characters"
    ADD CONSTRAINT "Characters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserCampaignRoles UserCampaignRoles_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserCampaignRoles"
    ADD CONSTRAINT "UserCampaignRoles_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserCampaignRoles UserCampaignRoles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserCampaignRoles"
    ADD CONSTRAINT "UserCampaignRoles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Worlds Worlds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Worlds"
    ADD CONSTRAINT "Worlds_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bulk_update_changes bulk_update_changes_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_changes
    ADD CONSTRAINT bulk_update_changes_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE;


--
-- Name: bulk_update_changes bulk_update_changes_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_changes
    ADD CONSTRAINT bulk_update_changes_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.bulk_update_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bulk_update_runs bulk_update_runs_campaign_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_runs
    ADD CONSTRAINT bulk_update_runs_campaign_context_id_fkey FOREIGN KEY (campaign_context_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bulk_update_runs bulk_update_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_runs
    ADD CONSTRAINT bulk_update_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: bulk_update_runs bulk_update_runs_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_update_runs
    ADD CONSTRAINT bulk_update_runs_world_id_fkey FOREIGN KEY (world_id) REFERENCES public."Worlds"(id) ON UPDATE CASCADE;


--
-- Name: entities entities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: entities entities_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entities entities_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_world_id_fkey FOREIGN KEY (world_id) REFERENCES public."Worlds"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_campaign_importance entity_campaign_importance_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_campaign_importance
    ADD CONSTRAINT entity_campaign_importance_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_campaign_importance entity_campaign_importance_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_campaign_importance
    ADD CONSTRAINT entity_campaign_importance_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_collections entity_collections_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_collections
    ADD CONSTRAINT entity_collections_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: entity_collections entity_collections_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_collections
    ADD CONSTRAINT entity_collections_world_id_fkey FOREIGN KEY (world_id) REFERENCES public."Worlds"(id) ON UPDATE CASCADE;


--
-- Name: entity_list_preferences entity_list_preferences_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_list_preferences
    ADD CONSTRAINT entity_list_preferences_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON UPDATE CASCADE;


--
-- Name: entity_list_preferences entity_list_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_list_preferences
    ADD CONSTRAINT entity_list_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entity_notes entity_notes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE;


--
-- Name: entity_notes entity_notes_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_character_id_fkey FOREIGN KEY (character_id) REFERENCES public."Characters"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entity_notes entity_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: entity_notes entity_notes_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_relationship_type_entity_types entity_relationship_type_entity_types_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_type_entity_types
    ADD CONSTRAINT entity_relationship_type_entity_types_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_relationship_type_entity_types entity_relationship_type_entity_types_relationship_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_type_entity_types
    ADD CONSTRAINT entity_relationship_type_entity_types_relationship_type_id_fkey FOREIGN KEY (relationship_type_id) REFERENCES public.entity_relationship_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_relationship_types entity_relationship_types_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationship_types
    ADD CONSTRAINT entity_relationship_types_world_id_fkey FOREIGN KEY (world_id) REFERENCES public."Worlds"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entity_relationships entity_relationships_from_entity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationships
    ADD CONSTRAINT entity_relationships_from_entity_fkey FOREIGN KEY (from_entity) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_relationships entity_relationships_relationship_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationships
    ADD CONSTRAINT entity_relationships_relationship_type_id_fkey FOREIGN KEY (relationship_type_id) REFERENCES public.entity_relationship_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_relationships entity_relationships_to_entity_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_relationships
    ADD CONSTRAINT entity_relationships_to_entity_fkey FOREIGN KEY (to_entity) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_secret_permissions entity_secret_permissions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secret_permissions
    ADD CONSTRAINT entity_secret_permissions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_secret_permissions entity_secret_permissions_secret_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secret_permissions
    ADD CONSTRAINT entity_secret_permissions_secret_id_fkey FOREIGN KEY (secret_id) REFERENCES public.entity_secrets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_secret_permissions entity_secret_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secret_permissions
    ADD CONSTRAINT entity_secret_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_secrets entity_secrets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secrets
    ADD CONSTRAINT entity_secrets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: entity_secrets entity_secrets_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_secrets
    ADD CONSTRAINT entity_secrets_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_type_field_layouts entity_type_field_layouts_entity_type_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_field_layouts
    ADD CONSTRAINT entity_type_field_layouts_entity_type_field_id_fkey FOREIGN KEY (entity_type_field_id) REFERENCES public.entity_type_fields(id) ON DELETE CASCADE;


--
-- Name: entity_type_field_layouts entity_type_field_layouts_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_field_layouts
    ADD CONSTRAINT entity_type_field_layouts_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON DELETE CASCADE;


--
-- Name: entity_type_field_rules entity_type_field_rules_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_field_rules
    ADD CONSTRAINT entity_type_field_rules_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON DELETE CASCADE;


--
-- Name: entity_type_fields entity_type_fields_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_fields
    ADD CONSTRAINT entity_type_fields_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_type_fields entity_type_fields_reference_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_type_fields
    ADD CONSTRAINT entity_type_fields_reference_type_id_fkey FOREIGN KEY (reference_type_id) REFERENCES public.entity_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entity_types entity_types_world_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_world_id_fkey FOREIGN KEY (world_id) REFERENCES public."Worlds"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: request_notes request_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: request_notes request_notes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_notes
    ADD CONSTRAINT request_notes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: requests requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: requests requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: requests requests_tester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_tester_id_fkey FOREIGN KEY (tester_id) REFERENCES public."Users"(id) ON DELETE SET NULL;


--
-- Name: session_notes session_notes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_notes
    ADD CONSTRAINT session_notes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public."Campaigns"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: session_notes session_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_notes
    ADD CONSTRAINT session_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- Name: session_notes session_notes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_notes
    ADD CONSTRAINT session_notes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: uploaded_files uploaded_files_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: uploaded_files uploaded_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON UPDATE CASCADE;


--
-- PostgreSQL database dump complete
--

