--
-- PostgreSQL database dump
--

\restrict Cow8ubM6zXfzgkV0tCcTmp99ftALB9wKduujSZBZOKWO2ra5AUQcjmuijC2iE2a

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: _apply_isolation_v1(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._apply_isolation_v1(tbl text) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- 1. Enable RLS

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

  

  -- 2. Drop existing

  EXECUTE format('DROP POLICY IF EXISTS isolation_policy ON public.%I', tbl);

  

  -- 3. Create Isolation Policy (Bypasses recursion via Security Definer functions)

  EXECUTE format('CREATE POLICY isolation_policy ON public.%I FOR ALL TO authenticated USING (

    public.check_is_super_admin()

    OR company_id = public.get_my_company()

  )', tbl);



  -- 4. AUTO-ASSIGN company_id on INSERT (Smoothest flow)

  BEGIN

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET DEFAULT public.get_my_company()', tbl);

  EXCEPTION WHEN OTHERS THEN NULL;

  END;

END $$;


--
-- Name: _drop_all_policies_v3(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._drop_all_policies_v3(tbl text) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE r RECORD;

BEGIN

  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public' LOOP

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);

  END LOOP;

END $$;


--
-- Name: _drop_all_policies_v4(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._drop_all_policies_v4(tbl text) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE r RECORD;

BEGIN

  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public' LOOP

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);

  END LOOP;

END $$;


--
-- Name: check_is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

BEGIN

  RETURN EXISTS (

    SELECT 1 FROM public.user_profiles 

    WHERE user_id = auth.uid() 

    AND role IN ('admin', 'super_admin') 

    AND status = 'active'

  );

END;

$$;


--
-- Name: check_is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_is_super_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'super_admin');

$$;


--
-- Name: get_customer_balance_at(bigint, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_customer_balance_at(cust_id bigint, target_date timestamp with time zone) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

    v_total_credit NUMERIC := 0;

    v_total_debit  NUMERIC := 0;

BEGIN

    -- Sum all credits (Sales/Advances/Charges) up to target_date

    SELECT COALESCE(SUM(COALESCE(amount, charges)), 0) INTO v_total_credit

    FROM public.transactions

    WHERE customer_id = cust_id 

    AND (transaction_type = 'Credit' OR transaction_type = 'Advance')

    AND created_at < target_date;



    -- Sum all debits (Vasooli/Payments) up to target_date

    SELECT COALESCE(SUM(COALESCE(amount, charges)), 0) INTO v_total_debit

    FROM public.transactions

    WHERE customer_id = cust_id 

    AND (transaction_type = 'Debit')

    AND created_at < target_date;



    RETURN v_total_credit - v_total_debit;

END;

$$;


--
-- Name: get_my_company(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_company() RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;

$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT role FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;

$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

  target_company_id UUID;

  target_role TEXT;

  target_full_name TEXT;

  inv_id BIGINT;

BEGIN

  target_full_name := NEW.raw_user_meta_data->>'full_name';

  target_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');



  SELECT id, company_id, role INTO inv_id, target_company_id, target_role

  FROM public.staff_invites

  WHERE lower(email) = lower(NEW.email)

  ORDER BY created_at DESC

  LIMIT 1;



  INSERT INTO public.user_profiles (user_id, email, full_name, role, status, company_id)

  VALUES (

    NEW.id,

    NEW.email,

    target_full_name,

    target_role,

    CASE WHEN target_role IN ('admin','super_admin') AND target_company_id IS NULL THEN 'active' ELSE 'active' END,

    target_company_id

  )

  ON CONFLICT (user_id) DO UPDATE SET

    email = EXCLUDED.email,

    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),

    role = COALESCE(EXCLUDED.role, public.user_profiles.role),

    company_id = COALESCE(EXCLUDED.company_id, public.user_profiles.company_id),

    status = COALESCE(NULLIF(public.user_profiles.status,''), EXCLUDED.status);



  IF target_role IN ('admin','super_admin') AND target_company_id IS NULL THEN

    INSERT INTO public.companies (name, owner_id)

    VALUES ('Khalid & Sons Petroleum', NEW.id)

    RETURNING id INTO target_company_id;

    UPDATE public.user_profiles SET company_id = target_company_id, status = 'active' WHERE user_id = NEW.id;

  END IF;



  IF inv_id IS NOT NULL THEN

    UPDATE public.staff_invites SET status='accepted' WHERE id = inv_id;

  END IF;

  RETURN NEW;

END;

$$;


--
-- Name: is_active_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_active_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.user_profiles

    WHERE user_id = auth.uid() AND status = 'active'

  );

$$;


--
-- Name: is_admin_or_above(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_above() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.user_profiles

    WHERE user_id = auth.uid()

      AND status = 'active'

      AND role IN ('admin','super_admin')

  );

$$;


--
-- Name: is_manager_or_above(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_manager_or_above() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.user_profiles

    WHERE user_id = auth.uid()

      AND status = 'active'

      AND role IN ('manager','admin','super_admin')

  );

$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banks (
    id bigint NOT NULL,
    name text NOT NULL,
    account_number text,
    branch text,
    color text DEFAULT 'primary'::text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: banks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.banks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.banks_id_seq OWNED BY public.banks.id;


--
-- Name: cash_advances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_advances (
    id bigint NOT NULL,
    customer_id integer NOT NULL,
    user_id uuid,
    amount numeric(14,2) NOT NULL,
    reason text NOT NULL,
    advance_date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: cash_advances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cash_advances ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cash_advances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cash_deposits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_deposits (
    id bigint NOT NULL,
    deposit_date date NOT NULL,
    bank_id bigint NOT NULL,
    amount numeric(14,2) NOT NULL,
    deposited_by text,
    reference text,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid DEFAULT public.get_my_company(),
    CONSTRAINT cash_deposits_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cash_deposits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cash_deposits_id_seq OWNED BY public.cash_deposits.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT 'My Petrol Pump'::text NOT NULL,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: company_repayments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_repayments (
    id bigint NOT NULL,
    user_id uuid,
    b2b_company_id integer NOT NULL,
    company_txn_id bigint,
    amount numeric(14,2) NOT NULL,
    payment_mode text NOT NULL,
    reference_no text,
    payment_date date NOT NULL,
    notes text,
    verified boolean,
    created_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: company_repayments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.company_repayments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.company_repayments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: company_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_transactions (
    id bigint NOT NULL,
    user_id uuid,
    b2b_company_id integer NOT NULL,
    txn_type text NOT NULL,
    amount numeric(14,2) NOT NULL,
    direction text NOT NULL,
    charges numeric(14,2),
    net_amount numeric(14,2),
    fuel_type text,
    liters numeric(12,2),
    unit_price numeric(10,2),
    payment_mode text,
    reference_no text,
    member_id integer,
    txn_date date NOT NULL,
    description text,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company(),
    document_no text,
    posting_date date,
    document_date date,
    opening_date date,
    closing_date date,
    doc_type text
);


--
-- Name: company_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.company_transactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.company_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    sr_no integer,
    name text NOT NULL,
    phone text,
    category text,
    created_at timestamp with time zone,
    user_id uuid,
    account_type text NOT NULL,
    credit_limit numeric(14,2),
    initial_credit numeric(14,2),
    is_expense_also boolean,
    notes text,
    company_id uuid DEFAULT public.get_my_company(),
    balance numeric(14,2) DEFAULT 0,
    is_company boolean DEFAULT false,
    company_name text,
    initial_opening_date date,
    initial_closing_date date,
    initial_posting_date date,
    initial_document_date date,
    initial_document_no text,
    initial_reference_no text,
    initial_doc_type text DEFAULT 'OP'::text,
    initial_description text
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.customers ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_reports (
    id integer NOT NULL,
    report_date date
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    icon text,
    user_id uuid,
    is_default boolean,
    created_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.expense_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expense_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_types (
    id bigint NOT NULL,
    name text,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: expense_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expense_types ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.expense_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: member_card_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_card_usage (
    id bigint NOT NULL,
    user_id uuid,
    b2b_company_id integer NOT NULL,
    member_id integer NOT NULL,
    company_txn_id bigint,
    fuel_type text NOT NULL,
    liters numeric(12,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(14,2),
    atm_charges numeric(14,2),
    misc_charges numeric(14,2),
    grand_total numeric(14,2),
    usage_date date NOT NULL,
    description text,
    notes text,
    created_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: member_card_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.member_card_usage ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.member_card_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mobil_arrivals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_arrivals (
    id bigint NOT NULL,
    product_id bigint,
    product_name text NOT NULL,
    category text NOT NULL,
    supplier text,
    quantity numeric(10,2) NOT NULL,
    rate numeric(10,2) NOT NULL,
    total_cost numeric(14,2),
    arrival_date date NOT NULL,
    invoice_no text,
    notes text,
    user_id uuid,
    created_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: mobil_arrivals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mobil_arrivals ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mobil_arrivals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mobil_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_customers (
    id integer NOT NULL,
    customer_name text NOT NULL,
    phone text,
    address text,
    vehicle_type text,
    created_at timestamp with time zone
);


--
-- Name: mobil_product_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_product_prices (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    sale_price numeric(12,2) NOT NULL,
    purchase_price numeric(12,2),
    effective_date date NOT NULL,
    changed_by text,
    notes text,
    created_at timestamp with time zone,
    company_id uuid
);


--
-- Name: mobil_product_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mobil_product_prices ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mobil_product_prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mobil_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_products (
    id bigint NOT NULL,
    name text NOT NULL,
    brand text,
    grade text,
    volume_ml integer,
    unit text,
    category text NOT NULL,
    is_active boolean,
    sort_order integer,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    company_id uuid
);


--
-- Name: mobil_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mobil_products ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mobil_products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mobil_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_sales (
    id bigint NOT NULL,
    customer_id integer,
    customer_name text,
    product_id bigint,
    product_name text NOT NULL,
    category text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    rate numeric(10,2) NOT NULL,
    total_amount numeric(14,2),
    payment_type text,
    sale_date date NOT NULL,
    notes text,
    user_id uuid,
    created_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: mobil_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mobil_sales ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mobil_sales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mobil_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_stock (
    id bigint NOT NULL,
    oil_type text NOT NULL,
    brand text,
    grade text,
    unit text,
    last_updated timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: mobil_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mobil_stock ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mobil_stock_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mobil_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobil_transactions (
    id bigint NOT NULL,
    customer_id integer,
    stock_id integer,
    transaction_type text NOT NULL,
    payment_type text,
    description text,
    created_at timestamp with time zone,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: mobil_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mobil_transactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mobil_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id bigint NOT NULL,
    fuel_type character varying(50),
    price numeric(10,2),
    effective_date date,
    created_at timestamp without time zone,
    updated_by character varying(100),
    company_id uuid
);


--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.price_history ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rent_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_payments (
    id bigint NOT NULL,
    shop_id bigint NOT NULL,
    rent_month integer NOT NULL,
    rent_year integer NOT NULL,
    amount_due numeric(12,2) NOT NULL,
    amount_paid numeric(12,2),
    due_date date NOT NULL,
    paid_date date,
    payment_method text,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: rent_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rent_payments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rent_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    petrol_price numeric(10,2),
    diesel_price numeric(10,2),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    user_id uuid,
    price_history jsonb,
    mobil_history jsonb,
    mobil_arrivals jsonb,
    mobil_sales jsonb,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.settings ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id bigint NOT NULL,
    shop_name text NOT NULL,
    tenant_name text NOT NULL,
    phone text,
    monthly_rent numeric(12,2) NOT NULL,
    due_day integer NOT NULL,
    start_date date NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: shops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.shops ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.shops_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: staff_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_invites (
    id bigint NOT NULL,
    email text NOT NULL,
    company_id uuid,
    role text DEFAULT 'employee'::text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    invited_by uuid
);


--
-- Name: staff_invites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.staff_invites ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.staff_invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_entries (
    id bigint NOT NULL,
    invoice_number character varying(50),
    fuel_type character varying(20) NOT NULL,
    liters numeric(12,2) NOT NULL,
    price_per_liter numeric(10,2) NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    supplier_name character varying(100),
    truck_number character varying(50),
    notes text,
    created_at timestamp with time zone,
    charges numeric(14,2),
    net_payable numeric(14,2),
    purchase_date date,
    company_id uuid DEFAULT public.get_my_company(),
    unit_price numeric(10,2),
    total_cost numeric(14,2),
    invoice_no text,
    truck_no text,
    entry_date date DEFAULT CURRENT_DATE
);


--
-- Name: stock_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.stock_entries ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.stock_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: stock_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_purchases (
    id bigint NOT NULL,
    user_id uuid,
    company_txn_id bigint,
    fuel_type text NOT NULL,
    liters numeric(12,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(14,2),
    charges numeric(14,2),
    net_payable numeric(14,2),
    invoice_no text,
    truck_no text,
    purchase_date date NOT NULL,
    notes text,
    created_at timestamp with time zone,
    supplier_name character varying(100),
    company_id uuid DEFAULT public.get_my_company()
);


--
-- Name: stock_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.stock_purchases ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.stock_purchases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tanks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tanks (
    id bigint NOT NULL,
    fuel_type text NOT NULL,
    last_updated timestamp with time zone,
    user_id uuid,
    company_id uuid DEFAULT public.get_my_company(),
    current_stock numeric(14,2) DEFAULT 0,
    capacity numeric(14,2) DEFAULT 25000,
    name text
);


--
-- Name: tanks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tanks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tanks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id bigint NOT NULL,
    customer_id integer,
    tank_id integer,
    transaction_type text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    payment_method text,
    entry_month text,
    user_id uuid,
    expense_type character varying(100),
    expense_account character varying(50),
    payment_month character varying(10),
    entry_method character varying(20),
    fuel_type character varying(50),
    cash_advance_id bigint,
    company_txn_id bigint,
    charges numeric(14,2),
    payment_mode text,
    reference_no text,
    company_id uuid DEFAULT public.get_my_company(),
    amount numeric(14,2) DEFAULT 0,
    notes text,
    liters numeric(14,3),
    unit_price numeric(14,2),
    updated_at timestamp with time zone DEFAULT now(),
    balance_before numeric(14,2),
    balance_after numeric(14,2),
    customer_balance_before numeric(14,2),
    customer_balance_after numeric(14,2),
    balance_effect numeric(14,2),
    cash_deposit_id bigint
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.transactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    role text DEFAULT 'employee'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid DEFAULT public.get_my_company(),
    CONSTRAINT user_profiles_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'manager'::text, 'employee'::text]))),
    CONSTRAINT user_profiles_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text])))
);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: v_company_account_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_company_account_summary AS
 SELECT c.id,
    c.name,
    c.sr_no,
    c.company_id AS tenant_id,
    COALESCE(sum(ct.amount), (0)::numeric) AS total_amount,
    COALESCE(sum(cr.amount), (0)::numeric) AS total_repayments,
    (COALESCE(sum(ct.amount), (0)::numeric) - COALESCE(sum(cr.amount), (0)::numeric)) AS balance
   FROM ((public.customers c
     LEFT JOIN public.company_transactions ct ON ((ct.b2b_company_id = c.id)))
     LEFT JOIN public.company_repayments cr ON ((cr.b2b_company_id = c.id)))
  WHERE (c.is_company = true)
  GROUP BY c.id, c.name, c.sr_no, c.company_id;


--
-- Name: v_daily_bank_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_daily_bank_summary AS
 SELECT cd.deposit_date,
    b.name AS bank_name,
    b.color AS bank_color,
    count(*) AS deposit_count,
    sum(cd.amount) AS total_amount
   FROM (public.cash_deposits cd
     JOIN public.banks b ON ((b.id = cd.bank_id)))
  GROUP BY cd.deposit_date, b.id, b.name, b.color
  ORDER BY cd.deposit_date DESC, (sum(cd.amount)) DESC;


--
-- Name: v_expense_ledger; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_expense_ledger AS
 SELECT t.id,
    t.created_at AS expense_date,
    t.amount,
    t.description,
    t.notes,
    t.transaction_type,
    t.fuel_type,
    t.user_id,
    t.expense_type AS category,
    t.expense_account AS paid_from,
    c.name AS account_name,
    c.sr_no AS account_no
   FROM (public.transactions t
     LEFT JOIN public.customers c ON ((c.id = t.customer_id)))
  WHERE (t.transaction_type = 'Expense'::text);


--
-- Name: v_member_usage_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_member_usage_summary AS
 SELECT m.id AS member_id,
    m.name AS member_name,
    m.sr_no AS member_no,
    m.company_id AS tenant_id,
    co.name AS b2b_company_name,
    max(mcu.fuel_type) AS fuel_type,
    count(mcu.id) AS usage_count,
    COALESCE(sum(mcu.liters), (0)::numeric) AS total_liters,
    COALESCE(sum((mcu.liters * mcu.unit_price)), (0)::numeric) AS stock_value,
    COALESCE(sum((mcu.atm_charges + mcu.misc_charges)), (0)::numeric) AS total_charges,
    COALESCE((sum((mcu.liters * mcu.unit_price)) + sum((mcu.atm_charges + mcu.misc_charges))), (0)::numeric) AS grand_total
   FROM ((public.customers m
     JOIN public.member_card_usage mcu ON ((mcu.member_id = m.id)))
     JOIN public.customers co ON ((co.id = mcu.b2b_company_id)))
  GROUP BY m.id, m.name, m.sr_no, m.company_id, co.name;


--
-- Name: v_stock_by_fuel; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_stock_by_fuel AS
 SELECT company_id,
    fuel_type,
    COALESCE(sum(current_stock), (0)::numeric) AS total_stock,
    COALESCE(sum(capacity), (0)::numeric) AS total_capacity
   FROM public.tanks
  GROUP BY company_id, fuel_type;


--
-- Name: v_transaction_balance_audit; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transaction_balance_audit AS
 SELECT t.id,
    t.created_at,
    t.customer_id,
    c.sr_no,
    c.name AS customer_name,
    t.transaction_type,
    COALESCE(NULLIF(t.charges, (0)::numeric), t.amount, (0)::numeric) AS amount,
    t.balance_before,
    t.balance_after,
    t.description
   FROM (public.transactions t
     LEFT JOIN public.customers c ON ((c.id = t.customer_id)))
  ORDER BY t.created_at DESC, t.id DESC;


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: banks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks ALTER COLUMN id SET DEFAULT nextval('public.banks_id_seq'::regclass);


--
-- Name: cash_deposits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits ALTER COLUMN id SET DEFAULT nextval('public.cash_deposits_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
db2ed66e-847f-489c-94fb-d0d93d326bb3	db2ed66e-847f-489c-94fb-d0d93d326bb3	{"sub": "db2ed66e-847f-489c-94fb-d0d93d326bb3", "email": "maligillani5@gmail.com", "email_verified": true, "phone_verified": false}	email	2026-04-15 16:06:41.664554+00	2026-04-15 16:06:41.66461+00	2026-04-15 16:06:41.66461+00	0a2bc344-c5d5-45dd-ad0e-c118eb51a630
1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	{"sub": "1286edaf-2c6c-4aa5-a57e-9431e6bb01d1", "email": "u0692906@gmail.com", "email_verified": true, "phone_verified": false}	email	2026-04-16 17:14:31.729285+00	2026-04-16 17:14:31.729335+00	2026-04-16 17:14:31.729335+00	e8183d8c-f129-4982-b13f-185b81fb1ce2
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
39f86837-7ffa-4b9b-af1a-b7bd08422e02	2026-04-16 20:23:46.70641+00	2026-04-16 20:23:46.70641+00	password	c17f6628-be54-457d-8411-8d0d0c59516c
7a83716d-ddfa-4ec6-bd42-64cbba579419	2026-04-30 09:32:48.502865+00	2026-04-30 09:32:48.502865+00	password	bac41725-fe02-4e1b-80bf-fadcadefeee8
561ee383-30cf-484c-881d-469aee3b91cc	2026-04-30 09:51:44.364952+00	2026-04-30 09:51:44.364952+00	password	5e27bf3c-c504-440d-8b6b-69bcf8c4c242
82f114ab-ef58-48fb-ab6a-3ff964536d6f	2026-05-03 06:28:22.700406+00	2026-05-03 06:28:22.700406+00	password	1e456395-5eac-4cea-ac70-3f11c3f37d39
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	62	7dk7s6lykcla	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-01 17:38:43.189722+00	2026-05-02 02:29:03.419697+00	tbd236cdrukb	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	63	yojmhono2moj	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 02:29:03.435487+00	2026-05-02 03:37:52.354495+00	7dk7s6lykcla	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	64	xxmy5b3wsns6	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 03:37:52.363224+00	2026-05-02 04:36:31.69679+00	yojmhono2moj	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	65	4qjbn5ohmxi2	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 04:36:31.703985+00	2026-05-02 05:49:10.840008+00	xxmy5b3wsns6	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	66	ixak7hcznayg	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 05:49:10.853495+00	2026-05-02 07:39:51.991099+00	4qjbn5ohmxi2	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	57	dpng7gzkq4y7	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-04-30 11:49:22.720208+00	2026-05-02 08:27:28.909949+00	kx5odtxsmz42	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	67	654lkrn4uine	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 07:39:52.008026+00	2026-05-02 08:38:02.749127+00	ixak7hcznayg	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	68	y7xjh5nhsa3z	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 08:27:28.915373+00	2026-05-02 09:25:36.593952+00	dpng7gzkq4y7	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	69	5be7t2cv6wk3	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 08:38:02.75409+00	2026-05-02 10:03:00.927678+00	654lkrn4uine	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	70	zqejturep63u	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 09:25:36.607801+00	2026-05-02 10:23:52.391432+00	y7xjh5nhsa3z	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	72	alhwurn2quz4	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 10:23:52.401963+00	2026-05-02 11:27:00.899519+00	zqejturep63u	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	73	zpv2ux2nzprl	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 11:27:00.906464+00	2026-05-02 12:25:04.555449+00	alhwurn2quz4	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	74	ddaz32cbpqpt	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 12:25:04.564171+00	2026-05-03 05:24:19.246108+00	zpv2ux2nzprl	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	75	swh6ohn7t2kv	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-03 05:24:19.273342+00	2026-05-03 06:25:21.929238+00	ddaz32cbpqpt	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	76	f43cnvtxn4rv	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-03 06:25:21.939804+00	2026-05-03 07:51:01.666058+00	swh6ohn7t2kv	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	78	y47livpnmto2	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-03 07:51:01.680561+00	2026-05-03 08:49:06.171067+00	f43cnvtxn4rv	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	79	z22rbmzdbw7v	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-03 08:49:06.182998+00	2026-05-07 04:26:32.777688+00	y47livpnmto2	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	71	xpv2jp6nwkfv	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-02 10:03:00.938219+00	2026-05-07 17:02:31.584776+00	5be7t2cv6wk3	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	59	7zwxjaazm3sn	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-05-01 11:44:20.43075+00	2026-05-07 17:14:05.40893+00	xpzfg4x6jed2	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	80	m36uw2s5blhd	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-07 04:26:32.797761+00	2026-05-15 14:40:03.563036+00	z22rbmzdbw7v	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	83	qz5pf5ycxyph	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-15 14:40:03.580434+00	2026-05-16 12:32:53.492473+00	m36uw2s5blhd	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	84	yhayovwbokjq	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 12:32:53.51548+00	2026-05-16 13:30:54.475558+00	qz5pf5ycxyph	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	85	voqfhpvelgam	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 13:30:54.487155+00	2026-05-16 14:29:13.94744+00	yhayovwbokjq	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	28	hk6rlyqakbx3	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-16 20:23:46.704107+00	2026-04-18 10:16:57.702923+00	\N	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	86	j2r4yizqkxtk	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 14:29:13.955571+00	2026-05-16 15:27:44.225613+00	voqfhpvelgam	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	87	dyer2bk5j62x	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 15:27:44.234909+00	2026-05-16 16:26:05.0315+00	j2r4yizqkxtk	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	36	5k74iprbf6xu	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-18 10:16:57.706751+00	2026-04-18 11:25:20.724757+00	hk6rlyqakbx3	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	77	itcyzj45cf3l	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-05-03 06:28:22.693502+00	2026-05-17 11:08:19.849839+00	\N	82f114ab-ef58-48fb-ab6a-3ff964536d6f
00000000-0000-0000-0000-000000000000	81	3dednzxvuzba	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-07 17:02:31.600775+00	2026-05-18 04:50:07.60022+00	xpv2jp6nwkfv	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	82	2doaqha252dw	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-05-07 17:14:05.414129+00	2026-05-20 05:12:03.633111+00	7zwxjaazm3sn	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	38	dqhjyo6vx5cb	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-18 11:25:20.73264+00	2026-04-18 16:19:59.071773+00	5k74iprbf6xu	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	40	d3dfvvcctzgi	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-18 16:19:59.089102+00	2026-04-18 18:05:15.120697+00	dqhjyo6vx5cb	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	41	oirx6uzdjfjp	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-18 18:05:15.131016+00	2026-04-28 02:34:53.287788+00	d3dfvvcctzgi	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	42	atd4acgpr2dr	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-28 02:34:53.294758+00	2026-04-28 06:30:00.230845+00	oirx6uzdjfjp	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	43	cid3zxdzs3lw	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-28 06:30:00.244815+00	2026-04-28 14:52:58.914827+00	atd4acgpr2dr	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	44	vp75tpfsd2s6	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-28 14:52:58.935769+00	2026-04-29 15:51:52.628322+00	cid3zxdzs3lw	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	45	mjejzqe4rdtc	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-29 15:51:52.649684+00	2026-04-29 17:01:17.817966+00	vp75tpfsd2s6	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	46	bymavqvalheg	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-29 17:01:17.83346+00	2026-04-30 04:35:59.772415+00	mjejzqe4rdtc	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	47	4mtzw2ejklrc	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-30 04:35:59.790305+00	2026-04-30 08:23:45.223053+00	bymavqvalheg	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	48	qk4ioqi4ruf5	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-30 08:23:45.243486+00	2026-04-30 10:16:00.805014+00	4mtzw2ejklrc	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	50	dncxx4hje6yb	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-04-30 09:32:48.49287+00	2026-04-30 10:37:33.804106+00	\N	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	51	5gljymj4v6qy	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-04-30 09:51:44.360963+00	2026-04-30 10:51:16.109283+00	\N	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	52	vatk3nujg3go	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-30 10:16:00.818345+00	2026-04-30 11:32:19.324178+00	qk4ioqi4ruf5	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	53	pxu64cls3f6t	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-04-30 10:37:33.808035+00	2026-04-30 11:35:55.81572+00	dncxx4hje6yb	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	54	kx5odtxsmz42	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-04-30 10:51:16.117452+00	2026-04-30 11:49:22.715414+00	5gljymj4v6qy	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	55	xpzfg4x6jed2	db2ed66e-847f-489c-94fb-d0d93d326bb3	t	2026-04-30 11:32:19.334331+00	2026-05-01 11:44:20.409893+00	vatk3nujg3go	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	56	ckx2r3zf7sxo	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-04-30 11:35:55.822661+00	2026-05-01 11:44:20.410103+00	pxu64cls3f6t	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	58	or7hlmhhcppk	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-01 11:44:20.430757+00	2026-05-01 12:45:52.904901+00	ckx2r3zf7sxo	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	60	tkh7kx7lpi6l	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-01 12:45:52.912727+00	2026-05-01 13:51:52.217014+00	or7hlmhhcppk	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	61	tbd236cdrukb	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-01 13:51:52.237329+00	2026-05-01 17:38:43.174917+00	tkh7kx7lpi6l	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	88	swx5lai2sfwv	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 16:26:05.041668+00	2026-05-16 17:24:45.868678+00	dyer2bk5j62x	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	89	gkq65rkg3gbf	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 17:24:45.874793+00	2026-05-16 21:40:53.941337+00	swx5lai2sfwv	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	90	f4rzncl3fhmq	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 21:40:53.952187+00	2026-05-16 22:56:17.721176+00	gkq65rkg3gbf	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	91	ywnvvuywoezs	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-16 22:56:17.731883+00	2026-05-17 02:33:21.530111+00	f4rzncl3fhmq	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	92	z55mliqd45yy	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-17 02:33:21.540108+00	2026-05-17 10:38:44.266828+00	ywnvvuywoezs	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	94	pknzr6t4rva6	db2ed66e-847f-489c-94fb-d0d93d326bb3	f	2026-05-17 11:08:19.85803+00	2026-05-17 11:08:19.85803+00	itcyzj45cf3l	82f114ab-ef58-48fb-ab6a-3ff964536d6f
00000000-0000-0000-0000-000000000000	93	xs7wfvfxrt6i	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-17 10:38:44.280783+00	2026-05-17 14:04:00.137561+00	z55mliqd45yy	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	95	nzvu5ago66gw	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-17 14:04:00.150648+00	2026-05-18 03:57:53.443943+00	xs7wfvfxrt6i	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	96	exzmrhqadv46	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 03:57:53.457409+00	2026-05-18 05:00:35.313353+00	nzvu5ago66gw	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	98	xnx67cgn2g4x	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 05:00:35.320514+00	2026-05-18 07:41:50.990886+00	exzmrhqadv46	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	99	yy3vcq5rs7ne	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 07:41:51.000114+00	2026-05-18 12:33:56.4018+00	xnx67cgn2g4x	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	100	rstrekzdjpfd	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 12:33:56.418502+00	2026-05-18 21:31:32.410089+00	yy3vcq5rs7ne	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	101	fouqx7tfbnvo	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 21:31:32.432542+00	2026-05-18 22:29:55.931098+00	rstrekzdjpfd	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	102	wd44wyzy5egm	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 22:29:55.937473+00	2026-05-18 23:47:39.769021+00	fouqx7tfbnvo	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	103	7dt5ldwbhuok	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 23:47:39.777697+00	2026-05-19 00:46:00.285096+00	wd44wyzy5egm	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	104	hujmxokt2opa	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-19 00:46:00.295278+00	2026-05-19 01:44:03.735567+00	7dt5ldwbhuok	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	105	tn2lkntwpbzd	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-19 01:44:03.748128+00	2026-05-19 11:52:52.974239+00	hujmxokt2opa	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	106	rhk75limcgf7	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-19 11:52:52.991489+00	2026-05-19 12:51:17.203164+00	tn2lkntwpbzd	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	107	yqtwpflfyroi	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-19 12:51:17.214207+00	2026-05-19 23:15:44.706814+00	rhk75limcgf7	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	108	yutkrijlf336	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-19 23:15:44.726232+00	2026-05-20 00:14:07.73951+00	yqtwpflfyroi	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	109	n5uhjpigwrzd	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-20 00:14:07.750376+00	2026-05-20 04:56:11.341077+00	yutkrijlf336	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	97	bdivgvcwdqv4	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-18 04:50:07.605654+00	2026-05-20 05:04:21.752471+00	3dednzxvuzba	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	112	63s7kyxcx6on	db2ed66e-847f-489c-94fb-d0d93d326bb3	f	2026-05-20 05:12:03.638052+00	2026-05-20 05:12:03.638052+00	2doaqha252dw	39f86837-7ffa-4b9b-af1a-b7bd08422e02
00000000-0000-0000-0000-000000000000	110	gzynkztyvabr	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-20 04:56:11.352656+00	2026-05-20 05:54:21.073412+00	n5uhjpigwrzd	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	113	bdoe4pxrodeg	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	f	2026-05-20 05:54:21.080884+00	2026-05-20 05:54:21.080884+00	gzynkztyvabr	561ee383-30cf-484c-881d-469aee3b91cc
00000000-0000-0000-0000-000000000000	111	kdf7g4baidyr	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-20 05:04:21.760725+00	2026-05-20 08:41:49.535406+00	bdivgvcwdqv4	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	114	u6stubbhlddk	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-20 08:41:49.547814+00	2026-05-20 11:23:15.96297+00	kdf7g4baidyr	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	115	4rbgbnvxly7h	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	t	2026-05-20 11:23:15.976152+00	2026-05-20 16:11:46.915532+00	u6stubbhlddk	7a83716d-ddfa-4ec6-bd42-64cbba579419
00000000-0000-0000-0000-000000000000	116	devdlogbnku2	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	f	2026-05-20 16:11:46.924292+00	2026-05-20 16:11:46.924292+00	4rbgbnvxly7h	7a83716d-ddfa-4ec6-bd42-64cbba579419
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
82f114ab-ef58-48fb-ab6a-3ff964536d6f	db2ed66e-847f-489c-94fb-d0d93d326bb3	2026-05-03 06:28:22.675904+00	2026-05-17 11:08:19.872356+00	\N	aal1	\N	2026-05-17 11:08:19.872255	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	119.30.116.97	\N	\N	\N	\N	\N
39f86837-7ffa-4b9b-af1a-b7bd08422e02	db2ed66e-847f-489c-94fb-d0d93d326bb3	2026-04-16 20:23:46.6928+00	2026-05-20 05:12:03.649047+00	\N	aal1	\N	2026-05-20 05:12:03.648908	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	119.30.119.102	\N	\N	\N	\N	\N
561ee383-30cf-484c-881d-469aee3b91cc	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2026-04-30 09:51:44.346381+00	2026-05-20 05:54:21.100717+00	\N	aal1	\N	2026-05-20 05:54:21.100603	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	103.72.2.167	\N	\N	\N	\N	\N
7a83716d-ddfa-4ec6-bd42-64cbba579419	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2026-04-30 09:32:48.474263+00	2026-05-20 16:11:46.941655+00	\N	aal1	\N	2026-05-20 16:11:46.941527	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	119.30.118.42	\N	\N	\N	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	authenticated	authenticated	u0692906@gmail.com	$2a$10$IwdT0CE/esQzvYGY/Shhc.Oeui6w4L0UC0XecazPKMQgG5KMJpwAu	2026-04-16 17:41:10.278868+00	\N		2026-04-16 17:38:07.572569+00		\N			\N	2026-04-30 09:51:44.345132+00	{"provider": "email", "providers": ["email"]}	{"sub": "1286edaf-2c6c-4aa5-a57e-9431e6bb01d1", "email": "u0692906@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-04-16 17:14:31.709544+00	2026-05-20 16:11:46.931041+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	db2ed66e-847f-489c-94fb-d0d93d326bb3	authenticated	authenticated	maligillani5@gmail.com	$2a$10$eI/wthFw74voEYQdKocIbuhChADrSRSKXJqvh8yrepY1bmKti13FO	2026-04-15 16:12:47.651464+00	2026-04-15 16:12:32.06992+00		2026-04-15 16:12:32.06992+00		\N			\N	2026-05-03 06:28:22.674178+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-04-15 16:06:41.649662+00	2026-05-20 05:12:03.640173+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banks (id, name, account_number, branch, color, is_active, created_by, created_at, company_id) FROM stdin;
6	Alfah khalid & son's(1212)	1009261212		danger	t	\N	2026-04-18 11:12:51.234+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
4	ABL khalid & son's(0084)	0010003230570084	0351	success	t	\N	2026-04-15 13:29:50.90688+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
1	Alfah CC khalid & son's(1997)	1007031997		info	t	\N	2026-04-15 13:29:50.90688+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
2	Faysal Bank Umer Khalid	3057390000006309	PK07FAYS3057390000006309	primary	t	\N	2026-04-15 13:29:50.90688+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
\.


--
-- Data for Name: cash_advances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_advances (id, customer_id, user_id, amount, reason, advance_date, status, notes, created_at, updated_at, company_id) FROM stdin;
1	8	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	5500.00	Ghar ka kharcha	2026-02-01	pending		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
2	83	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2000.00	Other	2026-02-01	pending	pay adv	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
3	23	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	1500.00	Other	2026-02-03	pending	water servies	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
4	87	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	10000.00	Other	2026-02-03	pending	advance pay mar	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
5	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	1000.00	Other	2026-02-05	pending		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
8	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	4000.00	Other	2026-02-08	pending	Adv	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
9	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	4000.00	Dawai / Ilaj	2026-02-08	cleared		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
7	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	4000.00	Safar / Transport	2026-02-08	cleared		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
6	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	4000.00	Safar / Transport	2026-02-08	cleared		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
10	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	4000.00	Other	2026-02-14	cleared		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
11	84	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2000.00	Other	2026-02-12	pending		\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
\.


--
-- Data for Name: cash_deposits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_deposits (id, deposit_date, bank_id, amount, deposited_by, reference, note, created_by, created_at, company_id) FROM stdin;
1	2026-01-31	6	1456525.99	\N	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2026-04-18 11:15:19.205+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
2	2026-01-31	4	24248.00	\N	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2026-04-18 11:15:44.883+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
3	2026-01-31	1	110738.99	\N	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2026-04-18 11:16:07.742+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, owner_id, created_at) FROM stdin;
ec716434-6cb1-44b1-a14f-ee2eb68143e3	My Petrol Pump	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	2026-04-16 19:57:22.744331+00
\.


--
-- Data for Name: company_repayments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_repayments (id, user_id, b2b_company_id, company_txn_id, amount, payment_mode, reference_no, payment_date, notes, verified, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: company_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_transactions (id, user_id, b2b_company_id, txn_type, amount, direction, charges, net_amount, fuel_type, liters, unit_price, payment_mode, reference_no, member_id, txn_date, description, notes, created_at, updated_at, company_id, document_no, posting_date, document_date, opening_date, closing_date, doc_type) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, sr_no, name, phone, category, created_at, user_id, account_type, credit_limit, initial_credit, is_expense_also, notes, company_id, balance, is_company, company_name, initial_opening_date, initial_closing_date, initial_posting_date, initial_document_date, initial_document_no, initial_reference_no, initial_doc_type, initial_description) FROM stdin;
2	1	Bank Alflah (K&S)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
3	2	Bank ABL khata (K&S)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
4	3	Bank Alfah CC (K&S)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
5	4	Fasil Bank (Umer Khalid)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
6	6	Tawaza, Mutafirk Khata	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	321823.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
7	8	Akrajat Mutafarik (Dir Exp)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	238595.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
10	15	Capital Rice H.k.(P+L)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	48549349.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
11	87	Mustarka Staff (adv+c)kam (old B)	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	24612.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
26	36	ADC agriculture (Tariq)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
40	14	khared M.Oil (GO, Shahid)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
60	58	Desil ABL (goriChock)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
35	5	Karaya Gari	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	127460.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
36	7	Petrol Khata (Khalid & Sons)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
37	9	Leas + Access Khata	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	201405.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
14	23	A.D.I.O (Live Stock)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	483831.35	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
47	38	Sheikh Ahmad (colony devloper)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	72998.68	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
39	13	Sale, Mobilil, Filter	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	371729.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
42	17	S.E Kanal  Office	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1603215.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
21	31	DY.DEO (W).(32) Office	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	162583.03	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
22	32	P.H.A oFFICE	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3789058.94	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
27	37	MoonStar Taransport Company	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
48	42	Raouf Drg Sahiwal	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	340767.39	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
25	35	Dir Agri (Muhammad Ashfaq)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	308463.15	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
34	53	D.H.D.C(h) oFFICE	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	17573.85	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
16	25	D.H.O oFFICE	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5410231.08	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
18	28	(1)C.E.O (h) OFFICE	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	627885.28	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
46	27	Kachi Parchi (DHO) Wahab + Arshad	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	109716.28	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
52	48	Rana Muzamil (Mamu Caneda)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	187308.99	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
17	26	Depty DY. D.H.O oFFICE	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	35776.30	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
20	30	D.E.O (W) Office.41	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	118767.96	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
58	56	Malik Rafeeq Chiken (new)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22800.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
59	57	Petrol (Nadeem-Faizan-Asif)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
61	59	Sajad Shah (H.k) (old B)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	66532.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
44	19	S.E Kanal  Office	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	165716.82	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
50	44	Muhammad Faheem Arshad (chacha gormay)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	233238.95	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
33	52	Alfazal Construction Company	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	238758.00	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
29	40	DQCB Health Office (H)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	441232.21	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
32	47	E.2.E Petroleum Service	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1024015.62	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
51	45	Royal Archad Sahiwal	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	580800.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
24	34	C.T,D oFFICE	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10175793.78	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
19	29	(2)C.E.O (h) Office	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	724162.10	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
49	43	Kashif Saif	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	143422.67	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
41	16	Daily Dasti Udhar Khata (P.D)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	272793.52	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
56	54	Queem Hospital (generator)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	872481.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
57	55	Asghar Malik Shop	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26265.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
12	21	Dir (Live Stock)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	595664.78	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
28	39	D.M.O Office	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	313567.01	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
30	41	DIR+ETO Office	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	205363.96	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
15	24	A.D.L (Live Stock)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	186423.20	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
9	12	Mustarka Khata U.K	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	105686.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
31	46	Tevta College (w)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	269179.44	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
53	49	Sheikh Khalid (sabzi Mendi)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	193524.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
23	33	A.C Office	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	606119.92	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
54	50	Aleem Zahoor	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	148500.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
45	20	S.D.O (|||) Kanal	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	169459.16	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
13	22	D.Dir (Live Stock)	\N	Company	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	906106.95	t	\N	\N	\N	\N	\N	\N	\N	OP	\N
63	61	Trade Discount (P.D Instiv)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
64	62	Khared (p+d) (online O.P)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
68	66	Mehkama Batul Mal (Welfare Society)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
69	67	Women Hostel (oldage)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
78	76	ADV+Pay (Amir Shahzad)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
85	83	ADV+Pay (Rozi khan)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
86	84	ADV+Pay (Qari Shafeeq)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
93	92	Zafar Khan Baloch	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	0.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
8	11	Mutafarik Kharcha Ghar H.K	\N	Owner	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	119058.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
74	72	ADV+Pay (Nazeer Ahmad)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
98	97	Iftaykhar Hussain Batla (oldBaqaya 93)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	238000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
75	73	ADV+Pay (Imran.93)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
88	86	ADV+Pay (Watu Machanic)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
83	81	ADV+Pay (Safdar Ali)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
89	88	TotalBill (h) CEO (Old Baqaya 487)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	252682.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
90	89	TotalBill DHO (oldBaqaya 486)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5600000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
91	90	Tariq Cattrig (papu) (oldBaqaya 175)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26030.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
87	85	ADV+Pay (Raka Maseei)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	82580.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
92	91	TotalBill DPO (Old Baqaya 145)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3266281.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
94	93	TotalBill RPO (Old Baqaya 146)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	917032.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
62	60	Tariq Cattrig	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	85330.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
76	74	ADV+Pay (WajehiaUdeen)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14100.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
99	98	Hamza Malik (old baqaya 240)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39220.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
77	75	ADV+Pay (Zameer Hussain)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8567.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
100	99	Malik Rafeeq Chiken (old Baqaya 76)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	81958.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
79	77	ADV+Pay (FasilUlRehman)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2400.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
101	100	Kachi Parchi AntiCruption	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	113013.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
80	78	ADV+Pay (Dawood Maseh)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2430.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
43	18	S.E Kanal  Office	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	231576.60	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
81	79	ADV+Pay (SaifAli)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10400.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
95	94	Kachi Parchi DPO (old Baqaya 486)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1301162.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
66	64	Shani (Iftaykhar GO)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	38613.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
70	68	Rana Arif (Good T)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
96	95	Kachi Parchi (khalid Ameen)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1300748.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
71	69	ADV+Pay (Ch Nadeen)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30100.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
97	96	TotalBill DEO (m) (Old Baqaya 93)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10540.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
72	70	ADV+Pay (Rana Faizan)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
82	80	ADV+Pay (Imran BhutoNagar)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8500.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
38	10	GO Company cc	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	supplier_credit	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	394204.00	t	GO Company cc	\N	\N	\N	\N	\N	\N	OP	\N
67	65	Mehkama Sabziyat (Agriculture)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	193780.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
55	51	Nadeem Zafar (riksha)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	45500.30	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
73	71	ADV+Pay (Asif Ali)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3000.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
84	82	ADV+Pay (Amir Maseei)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30300.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
65	63	Shaffeq Bhola (AminaCity)	\N	Regular	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	regular	0.00	0.00	f	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	114375.00	f	\N	\N	\N	\N	\N	\N	\N	OP	\N
\.


--
-- Data for Name: daily_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_reports (id, report_date) FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_categories (id, name, icon, user_id, is_default, created_at, company_id) FROM stdin;
1	Petrol Stock	Γ¢╜	\N	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
2	Diesel Stock	Γ¢╜	\N	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
3	Electricity Bill	ΓÜí	\N	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
4	Staff Salary	≡ƒæ╖	\N	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
\.


--
-- Data for Name: expense_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_types (id, name, company_id) FROM stdin;
\.


--
-- Data for Name: member_card_usage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.member_card_usage (id, user_id, b2b_company_id, member_id, company_txn_id, fuel_type, liters, unit_price, total_amount, atm_charges, misc_charges, grand_total, usage_date, description, notes, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: mobil_arrivals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_arrivals (id, product_id, product_name, category, supplier, quantity, rate, total_cost, arrival_date, invoice_no, notes, user_id, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: mobil_customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_customers (id, customer_name, phone, address, vehicle_type, created_at) FROM stdin;
\.


--
-- Data for Name: mobil_product_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_product_prices (id, product_id, sale_price, purchase_price, effective_date, changed_by, notes, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: mobil_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_products (id, name, brand, grade, volume_ml, unit, category, is_active, sort_order, notes, created_at, updated_at, company_id) FROM stdin;
\.


--
-- Data for Name: mobil_sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_sales (id, customer_id, customer_name, product_id, product_name, category, quantity, rate, total_amount, payment_type, sale_date, notes, user_id, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: mobil_stock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_stock (id, oil_type, brand, grade, unit, last_updated, company_id) FROM stdin;
\.


--
-- Data for Name: mobil_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mobil_transactions (id, customer_id, stock_id, transaction_type, payment_type, description, created_at, company_id) FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_history (id, fuel_type, price, effective_date, created_at, updated_by, company_id) FROM stdin;
\.


--
-- Data for Name: rent_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rent_payments (id, shop_id, rent_month, rent_year, amount_due, amount_paid, due_date, paid_date, payment_method, status, notes, created_at, updated_at, company_id) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, petrol_price, diesel_price, created_at, updated_at, user_id, price_history, mobil_history, mobil_arrivals, mobil_sales, company_id) FROM stdin;
1	259.31	276.84	\N	2026-05-20 06:36:21.497	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	[{"date": "2026-02-01", "diesel": 269.5, "petrol": 254.29, "end_date": null, "start_date": "2026-02-01", "updated_by": "Admin"}, {"date": "2026-02-15", "diesel": 276.84, "petrol": 259.31, "end_date": "2026-02-28", "start_date": "2026-02-15", "updated_by": "Admin"}, {"date": "2026-05-20", "diesel": 276.84, "petrol": 259.31, "end_date": null, "start_date": "2026-05-20", "updated_by": "Admin"}, {"date": "2026-02-16", "diesel": 276.84, "petrol": 259.31, "end_date": null, "start_date": "2026-02-16", "updated_by": "Admin"}]	\N	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3
\.


--
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shops (id, shop_name, tenant_name, phone, monthly_rent, due_day, start_date, status, notes, created_at, updated_at, company_id) FROM stdin;
\.


--
-- Data for Name: staff_invites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_invites (id, email, company_id, role, status, created_at, invited_by) FROM stdin;
\.


--
-- Data for Name: stock_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_entries (id, invoice_number, fuel_type, liters, price_per_liter, total_amount, supplier_name, truck_number, notes, created_at, charges, net_payable, purchase_date, company_id, unit_price, total_cost, invoice_no, truck_no, entry_date) FROM stdin;
8	GO	Petrol	10000.00	245.80	2458000.00	GO	TUF-25-818	\N	\N	9700.00	2467700.00	2026-02-10	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
6	GO CO.	Petrol	10000.00	245.80	2458000.00	Gas & Oil	CAY-18-4913	\N	\N	9700.00	2467700.00	2026-02-04	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
7	GoCo.	Petrol	10000.00	245.80	2458000.00	GAS & OIL	cay-92-3806	\N	\N	9700.00	2467700.00	2026-02-06	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
9	GO	Petrol	10000.00	245.80	2457988.00	GO	TUE-22-580	\N	\N	10000.00	2467988.00	2026-02-13	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
10	GO	Petrol	8000.00	245.80	1966390.40	GO	TMG-619	\N	\N	9760.00	1976150.40	2026-02-14	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
5	GO sabqa stock	Petrol	10357.60	245.81	2546001.66	GO	\N	\N	\N	\N	2546001.66	2026-02-01	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
11	GO	Petrol	2000.00	245.80	491597.60	GO	TUC-16-467	14-02-26 SABQA BAQAYA OLD INVIECE	\N	1980.00	493577.60	2026-02-17	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
12	GO	Petrol	8000.00	250.80	2006390.40	GO	TUC-16-467	NEW INVICE RATE 16-02-2026	\N	7920.00	2014310.40	2026-02-17	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
13	GO	Petrol	10000.00	250.80	2507988.00	GO	CAY-18-4913	\N	\N	9900.00	2517888.00	2026-02-21	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
14	GO	Petrol	10000.00	250.80	2507988.00	GO	TUF-25-412	\N	\N	9900.00	2517888.00	2026-02-24	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
15	GO	Petrol	16000.00	250.80	4012780.80	GO	TUC-17-880	\N	\N	15840.00	4028620.80	2026-02-27	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
16	GO	Petrol	5000.00	250.80	1253994.00	GO	TUD-17-070	\N	\N	4900.00	1258894.00	2026-02-28	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
17	GO SABQA STOCK	Diesel	14119.00	261.01	3685183.25	GO	\N	\N	\N	\N	3685183.25	2026-02-01	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
18	GO	Diesel	5000.00	261.01	1305044.00	GO	TUE-22-580	\N	\N	4850.00	1309894.00	2026-02-13	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
19	GO	Diesel	10000.00	268.33	2683288.00	GO	LET-18-1897	\N	\N	9900.00	2693188.00	2026-02-26	ec716434-6cb1-44b1-a14f-ee2eb68143e3	\N	\N	\N	\N	2026-05-02
\.


--
-- Data for Name: stock_purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_purchases (id, user_id, company_txn_id, fuel_type, liters, unit_price, total_amount, charges, net_payable, invoice_no, truck_no, purchase_date, notes, created_at, supplier_name, company_id) FROM stdin;
\.


--
-- Data for Name: tanks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tanks (id, fuel_type, last_updated, user_id, company_id, current_stock, capacity, name) FROM stdin;
3	Petrol	\N	\N	\N	0.00	25000.00	Petrol Tank 1
4	Diesel	\N	\N	\N	0.00	25000.00	Diesel Tank 1
5	Petrol	2026-05-20 00:13:51.696+00	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	81190.27	25000.00	Petrol Tank
6	Diesel	2026-05-20 00:17:55.831+00	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11211.56	25000.00	Diesel Tank
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, customer_id, tank_id, transaction_type, description, created_at, payment_method, entry_month, user_id, expense_type, expense_account, payment_month, entry_method, fuel_type, cash_advance_id, company_txn_id, charges, payment_mode, reference_no, company_id, amount, notes, liters, unit_price, updated_at, balance_before, balance_after, customer_balance_before, customer_balance_after, balance_effect, cash_deposit_id) FROM stdin;
1	8	\N	Advance	Cash Advance: Ghar ka kharcha	\N	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	1	\N	5500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
4	37	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	201405.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	201405.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
5	38	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	394204.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	394204.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
6	39	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	371729.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	371729.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
7	41	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	63944.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	63944.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
8	42	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1603215.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1603215.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
9	43	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	139508.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	139508.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
10	44	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	108305.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108305.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
11	45	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	126703.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	126703.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
12	12	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	412900.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	412900.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
13	13	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	799949.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	799949.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
14	14	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	448282.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	448282.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
15	15	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	122557.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	122557.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
16	16	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	4435817.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4435817.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
17	18	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	542673.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	542673.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
18	19	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	669558.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	669558.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
19	35	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	127460.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	127460.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
20	20	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	64530.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	64530.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
22	21	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	124851.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	124851.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
23	37	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	201405.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	201405.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
24	22	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1116262.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1116262.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
25	38	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	394204.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	394204.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
26	23	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	473188.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	473188.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
27	39	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	371729.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	371729.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
28	24	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9056347.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9056347.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
29	41	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	63944.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	63944.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
30	25	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224114.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	224114.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
31	42	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1603215.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1603215.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
33	43	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	139508.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	139508.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
34	28	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	141636.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	141636.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
35	44	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	108305.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108305.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
36	29	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	412014.03	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	412014.03	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
37	45	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	126703.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	126703.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
38	12	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	412900.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	412900.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
39	30	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	64969.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	64969.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
40	13	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	799949.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	799949.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
41	48	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	177244.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	177244.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
42	14	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	448282.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	448282.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
43	49	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	96873.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	96873.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
44	15	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	122557.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	122557.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
45	50	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	145857.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	145857.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
46	16	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	4435817.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4435817.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
47	51	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	273644.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	273644.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
48	18	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	542673.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	542673.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
49	31	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	100830.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	100830.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
50	19	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	669558.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	669558.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
52	20	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	64530.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	64530.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
2	35	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	127460.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	127460.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
233	16	\N	Credit	Petrol sale | Balance: Rs.4,435,817.00 ΓåÆ Rs.4,440,902.80 (Change Rs.5,085.80)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-02 11:45:27.802551+00	4435817.00	4440902.80	4435817.00	4440902.80	5085.80	\N
241	49	\N	Credit	Petrol sale | Balance: Rs.96,873.00 ΓåÆ Rs.103,372.65 (Change Rs.6,499.65)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6499.65	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6499.65	\N	25.560	254.29	2026-05-02 12:01:35.42649+00	96873.00	103372.65	96873.00	103372.65	6499.65	\N
249	17	\N	Credit	Petrol sale | Balance: Rs.0.00 ΓåÆ Rs.8,900.15 (Change Rs.8,900.15)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8900.15	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8900.15	\N	35.000	254.29	2026-05-02 12:36:38.604045+00	0.00	8900.15	0.00	8900.15	8900.15	\N
256	25	\N	Credit	Petrol sale | Balance: Rs.232,759.86 ΓåÆ Rs.256,408.83 (Change Rs.23,648.97)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	23648.97	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	23648.97	\N	93.000	254.29	2026-05-02 12:47:17.237219+00	232759.86	256408.83	232759.86	256408.83	23648.97	\N
264	19	\N	Credit	Diesel sale | Balance: Rs.669,558.00 ΓåÆ Rs.684,380.50 (Change Rs.14,822.50)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	14822.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14822.50	\N	55.000	269.50	2026-05-02 12:57:32.273637+00	669558.00	684380.50	669558.00	684380.50	14822.50	\N
271	43	\N	Credit	Diesel sale | Balance: Rs.139,508.00 ΓåÆ Rs.146,245.50 (Change Rs.6,737.50)	2026-03-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	6737.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6737.50	\N	25.000	269.50	2026-05-03 07:16:20.616255+00	139508.00	146245.50	139508.00	146245.50	6737.50	\N
283	24	\N	Credit	Diesel sale | Balance: Rs.9,240,583.27 ΓåÆ Rs.9,348,922.27 (Change Rs.108,339.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	108339.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108339.00	\N	402.000	269.50	2026-05-03 08:17:46.590708+00	9240583.27	9348922.27	9240583.27	9348922.27	108339.00	\N
293	28	\N	Credit	Petrol sale | Balance: Rs.154,589.99 ΓåÆ Rs.156,878.60 (Change Rs.2,288.61)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2288.61	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2288.61	\N	9.000	254.29	2026-05-16 12:49:33.639087+00	154589.99	156878.60	154589.99	156878.60	2288.61	\N
298	16	\N	Credit	Diesel sale | Balance: Rs.4,603,721.62 ΓåÆ Rs.4,634,714.12 (Change Rs.30,992.50)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	30992.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30992.50	\N	115.000	269.50	2026-05-16 13:02:10.34883+00	4603721.62	4634714.12	4603721.62	4634714.12	30992.50	\N
303	24	\N	Credit	Petrol sale | Balance: Rs.9,348,922.27 ΓåÆ Rs.9,426,989.30 (Change Rs.78,067.03)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	78067.03	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	78067.03	\N	307.000	254.29	2026-05-16 13:10:49.452252+00	9348922.27	9426989.30	9348922.27	9426989.30	78067.03	\N
308	55	\N	Credit	Petrol sale | Balance: Rs.25,000.31 ΓåÆ Rs.26,000.31 (Change Rs.1,000.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.930	254.29	2026-05-16 13:30:28.523246+00	25000.31	26000.31	25000.31	26000.31	1000.00	\N
313	41	\N	Credit	Diesel sale - ch ali raza tractor | Balance: Rs.67,144.00 ΓåÆ Rs.70,684.00 (Change Rs.3,540.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	3540.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3540.00	\N	13.140	269.50	2026-05-16 13:39:53.538885+00	67144.00	70684.00	67144.00	70684.00	3540.00	\N
328	22	\N	Credit	Diesel sale | Balance: Rs.1,207,688.08 ΓåÆ Rs.1,234,638.08 (Change Rs.26,950.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	26950.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26950.00	\N	100.000	269.50	2026-05-16 14:16:19.668805+00	1207688.08	1234638.08	1207688.08	1234638.08	26950.00	\N
333	33	\N	Credit	Diesel sale | Balance: Rs.69,259.00 ΓåÆ Rs.74,649.00 (Change Rs.5,390.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-16 14:24:28.068309+00	69259.00	74649.00	69259.00	74649.00	5390.00	\N
338	41	\N	Credit	Petrol sale | Balance: Rs.70,684.00 ΓåÆ Rs.80,984.00 (Change Rs.10,300.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10300.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10300.00	\N	40.500	254.29	2026-05-16 14:36:35.562501+00	70684.00	80984.00	70684.00	80984.00	10300.00	\N
344	24	\N	Credit	Petrol sale | Balance: Rs.9,480,024.70 ΓåÆ Rs.9,482,567.60 (Change Rs.2,542.90)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2542.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2542.90	\N	10.000	254.29	2026-05-16 14:49:37.054785+00	9480024.70	9482567.60	9480024.70	9482567.60	2542.90	\N
354	14	\N	Credit	Petrol sale | Balance: Rs.448,282.00 ΓåÆ Rs.455,910.70 (Change Rs.7,628.70)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7628.70	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7628.70	\N	30.000	254.29	2026-05-16 15:08:49.076286+00	448282.00	455910.70	448282.00	455910.70	7628.70	\N
358	48	\N	Credit	Petrol sale | Balance: Rs.210,555.99 ΓåÆ Rs.217,676.11 (Change Rs.7,120.12)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7120.12	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7120.12	\N	28.000	254.29	2026-05-16 15:12:45.51286+00	210555.99	217676.11	210555.99	217676.11	7120.12	\N
362	33	\N	Credit	Diesel sale | Balance: Rs.83,835.00 ΓåÆ Rs.89,226.00 (Change Rs.5,391.00)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5391.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5391.00	\N	20.000	269.50	2026-05-16 15:16:38.200024+00	83835.00	89226.00	83835.00	89226.00	5391.00	\N
366	23	\N	Credit	Diesel sale | Balance: Rs.499,751.50 ΓåÆ Rs.519,694.50 (Change Rs.19,943.00)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	19943.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19943.00	\N	74.000	269.50	2026-05-16 15:24:56.502443+00	499751.50	519694.50	499751.50	519694.50	19943.00	\N
370	24	\N	Credit	Petrol sale | Balance: Rs.9,514,860.06 ΓåÆ Rs.9,519,945.86 (Change Rs.5,085.80)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-16 15:30:43.923172+00	9514860.06	9519945.86	9514860.06	9519945.86	5085.80	\N
374	54	\N	Credit	Petrol sale | Balance: Rs.130,000.00 ΓåÆ Rs.135,000.00 (Change Rs.5,000.00)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	19.660	254.29	2026-05-16 15:36:08.520527+00	130000.00	135000.00	130000.00	135000.00	5000.00	\N
385	28	\N	Credit	Petrol sale - nagat cash | Balance: Rs.159,167.21 ΓåÆ Rs.206,734.21 (Change Rs.47,567.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	47567.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	47567.00	\N	187.060	254.29	2026-05-16 16:26:14.917411+00	159167.21	206734.21	159167.21	206734.21	47567.00	\N
388	28	\N	Credit	Diesel sale | Balance: Rs.214,382.85 ΓåÆ Rs.262,892.85 (Change Rs.48,510.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	48510.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	48510.00	\N	180.000	269.50	2026-05-16 16:33:17.113872+00	214382.85	262892.85	214382.85	262892.85	48510.00	\N
391	22	\N	Credit	Petrol sale | Balance: Rs.2,196,353.28 ΓåÆ Rs.2,204,999.14 (Change Rs.8,645.86)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8645.86	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8645.86	\N	34.000	254.29	2026-05-16 16:40:31.486385+00	2196353.28	2204999.14	2196353.28	2204999.14	8645.86	\N
394	24	\N	Credit	Petrol sale | Balance: Rs.9,519,945.86 ΓåÆ Rs.9,521,217.31 (Change Rs.1,271.45)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1271.45	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1271.45	\N	5.000	254.29	2026-05-16 16:47:42.460468+00	9519945.86	9521217.31	9519945.86	9521217.31	1271.45	\N
397	30	\N	Credit	Petrol sale | Balance: Rs.103,988.47 ΓåÆ Rs.138,063.33 (Change Rs.34,074.86)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	34074.86	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	34074.86	\N	134.000	254.29	2026-05-16 16:55:14.800039+00	103988.47	138063.33	103988.47	138063.33	34074.86	\N
401	48	\N	Credit	Petrol sale | Balance: Rs.222,507.62 ΓåÆ Rs.225,813.39 (Change Rs.3,305.77)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3305.77	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3305.77	\N	13.000	254.29	2026-05-16 17:05:50.920522+00	222507.62	225813.39	222507.62	225813.39	3305.77	\N
404	32	\N	Credit	Diesel sale | Balance: Rs.0.00 ΓåÆ Rs.112,381.50 (Change Rs.112,381.50)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	112381.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	112381.50	\N	417.000	269.50	2026-05-16 17:11:43.701057+00	0.00	112381.50	0.00	112381.50	112381.50	\N
407	43	\N	Credit	Petrol sale | Balance: Rs.167,045.00 ΓåÆ Rs.173,402.00 (Change Rs.6,357.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6357.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6357.00	\N	25.000	254.29	2026-05-16 21:42:47.064049+00	167045.00	173402.00	167045.00	173402.00	6357.00	\N
53	52	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	143469.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	143469.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
54	21	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	124851.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	124851.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
55	53	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	16570.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16570.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
56	22	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1116262.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1116262.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
57	54	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	125000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	125000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
82	52	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	143469.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	143469.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
83	71	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	30100.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30100.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
84	35	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	127460.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	127460.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
85	53	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	16570.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16570.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
86	72	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
88	54	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	125000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	125000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
92	74	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
93	33	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	49394.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	49394.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
94	38	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	394204.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	394204.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
95	75	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
96	39	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	371729.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	371729.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
97	34	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8498.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8498.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
98	76	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	14100.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14100.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
99	41	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	63944.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	63944.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
100	56	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	653578.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	653578.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
101	77	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8567.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8567.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
102	42	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1603215.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1603215.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
103	58	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	22800.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22800.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
104	79	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2400.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2400.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
105	59	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
106	43	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	139508.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	139508.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
107	80	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2430.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2430.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
108	61	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	66532.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	66532.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
109	44	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	108305.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108305.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
110	62	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	85330.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	85330.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
111	45	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	126703.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	126703.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
112	81	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10400.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10400.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
113	65	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	96375.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	96375.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
114	12	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	412900.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	412900.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
115	82	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
116	66	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	11843.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11843.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
117	13	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	799949.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	799949.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
118	84	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7300.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7300.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
120	14	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	448282.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	448282.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
119	70	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	108000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
121	87	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	72580.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	72580.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
122	71	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	30100.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30100.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
123	15	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	122557.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	122557.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
124	88	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
125	16	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	4435817.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4435817.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
126	72	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
127	89	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	252682.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	252682.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
128	18	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	542673.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	542673.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
129	73	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
130	90	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5600000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5600000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
131	19	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	669558.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	669558.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
58	23	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	473188.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	473188.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
59	24	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9056347.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9056347.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
60	55	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	22500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
61	25	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224114.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	224114.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
62	33	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	49394.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	49394.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
64	34	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8498.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8498.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
65	28	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	141636.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	141636.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
66	56	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	653578.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	653578.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
68	58	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	22800.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22800.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
67	29	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	412014.03	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	412014.03	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
69	30	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	64969.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	64969.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
70	59	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
71	48	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	177244.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	177244.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
72	49	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	96873.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	96873.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
73	61	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	66532.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	66532.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
74	50	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	145857.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	145857.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
75	62	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	85330.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	85330.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
76	51	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	273644.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	273644.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
77	65	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	96375.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	96375.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
78	31	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	100830.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	100830.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
79	66	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	11843.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11843.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
81	70	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	108000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
234	16	\N	Credit	Diesel sale | Balance: Rs.4,440,902.80 ΓåÆ Rs.4,457,072.80 (Change Rs.16,170.00)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16170.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16170.00	\N	60.000	269.50	2026-05-02 11:48:59.202332+00	4440902.80	4457072.80	4440902.80	4457072.80	16170.00	\N
242	31	\N	Credit	Diesel sale | Balance: Rs.100,830.00 ΓåÆ Rs.118,347.50 (Change Rs.17,517.50)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	17517.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	17517.50	\N	65.000	269.50	2026-05-02 12:02:58.747384+00	100830.00	118347.50	100830.00	118347.50	17517.50	\N
250	18	\N	Credit	Diesel sale | Balance: Rs.542,673.00 ΓåÆ Rs.558,843.00 (Change Rs.16,170.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16170.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16170.00	\N	60.000	269.50	2026-05-02 12:38:45.700668+00	542673.00	558843.00	542673.00	558843.00	16170.00	\N
257	30	\N	Credit	Petrol sale | Balance: Rs.77,429.21 ΓåÆ Rs.91,452.21 (Change Rs.14,023.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	14023.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14023.00	\N	55.150	254.29	2026-05-02 12:49:34.967427+00	77429.21	91452.21	77429.21	91452.21	14023.00	\N
265	55	\N	Credit	Petrol sale | Balance: Rs.22,500.00 ΓåÆ Rs.24,000.31 (Change Rs.1,500.31)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1500.31	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1500.31	\N	5.900	254.29	2026-05-02 12:59:04.429662+00	22500.00	24000.31	22500.00	24000.31	1500.31	\N
272	12	\N	Credit	Diesel sale | Balance: Rs.429,878.50 ΓåÆ Rs.452,786.00 (Change Rs.22,907.50)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	22907.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22907.50	\N	85.000	269.50	2026-05-03 07:17:29.610215+00	429878.50	452786.00	429878.50	452786.00	22907.50	\N
278	23	\N	Credit	Diesel sale | Balance: Rs.473,188.00 ΓåÆ Rs.493,400.50 (Change Rs.20,212.50)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	20212.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	20212.50	\N	75.000	269.50	2026-05-03 08:00:02.150328+00	473188.00	493400.50	473188.00	493400.50	20212.50	\N
284	30	\N	Credit	Diesel sale | Balance: Rs.91,452.21 ΓåÆ Rs.92,799.71 (Change Rs.1,347.50)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	1347.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1347.50	\N	5.000	269.50	2026-05-03 08:29:41.17691+00	91452.21	92799.71	91452.21	92799.71	1347.50	\N
289	57	\N	Credit	Diesel sale | Balance: Rs.0.00 ΓåÆ Rs.5,390.00 (Change Rs.5,390.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-03 08:45:36.601986+00	0.00	5390.00	0.00	5390.00	5390.00	\N
299	17	\N	Credit	Petrol sale | Balance: Rs.8,900.15 ΓåÆ Rs.17,800.30 (Change Rs.8,900.15)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8900.15	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8900.15	\N	35.000	254.29	2026-05-16 13:03:52.036813+00	8900.15	17800.30	8900.15	17800.30	8900.15	\N
304	24	\N	Credit	Diesel sale | Balance: Rs.9,426,989.30 ΓåÆ Rs.9,441,272.80 (Change Rs.14,283.50)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	14283.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14283.50	\N	53.000	269.50	2026-05-16 13:11:45.300305+00	9426989.30	9441272.80	9426989.30	9441272.80	14283.50	\N
309	66	\N	Credit	Petrol sale | Balance: Rs.11,843.00 ΓåÆ Rs.13,443.00 (Change Rs.1,600.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1600.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1600.00	\N	6.290	254.29	2026-05-16 13:31:41.859775+00	11843.00	13443.00	11843.00	13443.00	1600.00	\N
324	16	\N	Credit	Petrol sale | Balance: Rs.4,636,748.44 ΓåÆ Rs.4,643,359.98 (Change Rs.6,611.54)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6611.54	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6611.54	\N	26.000	254.29	2026-05-16 14:09:25.07021+00	4636748.44	4643359.98	4636748.44	4643359.98	6611.54	\N
329	48	\N	Credit	Petrol sale | Balance: Rs.205,724.48 ΓåÆ Rs.210,555.99 (Change Rs.4,831.51)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4831.51	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4831.51	\N	19.000	254.29	2026-05-16 14:18:57.716425+00	205724.48	210555.99	205724.48	210555.99	4831.51	\N
334	57	\N	Credit	Diesel sale | Balance: Rs.5,390.00 ΓåÆ Rs.15,890.00 (Change Rs.10,500.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	10500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10500.00	\N	38.960	269.50	2026-05-16 14:26:12.561871+00	5390.00	15890.00	5390.00	15890.00	10500.00	\N
339	41	\N	Credit	Petrol sale - nawaz pha | Balance: Rs.80,984.00 ΓåÆ Rs.87,020.00 (Change Rs.6,036.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6036.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6036.00	\N	23.740	254.29	2026-05-16 14:37:57.699074+00	80984.00	87020.00	80984.00	87020.00	6036.00	\N
345	25	\N	Credit	Petrol sale | Balance: Rs.256,408.83 ΓåÆ Rs.261,494.63 (Change Rs.5,085.80)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-16 14:51:24.975057+00	256408.83	261494.63	256408.83	261494.63	5085.80	\N
350	22	\N	Credit	Petrol sale - nagat cash | Balance: Rs.1,677,934.08 ΓåÆ Rs.2,121,230.07 (Change Rs.443,295.99)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	443295.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	443295.99	\N	1743.270	254.29	2026-05-16 14:58:37.326707+00	1677934.08	2121230.07	1677934.08	2121230.07	443295.99	\N
243	33	\N	Credit	Diesel sale | Balance: Rs.49,394.00 ΓåÆ Rs.55,784.00 (Change Rs.6,390.00)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	6390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6390.00	\N	23.710	269.50	2026-05-02 12:04:32.853253+00	49394.00	55784.00	49394.00	55784.00	6390.00	\N
251	20	\N	Credit	Petrol sale | Balance: Rs.64,530.00 ΓåÆ Rs.71,395.83 (Change Rs.6,865.83)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6865.83	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6865.83	\N	27.000	254.29	2026-05-02 12:41:10.477893+00	64530.00	71395.83	64530.00	71395.83	6865.83	\N
89	73	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
90	55	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	22500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
91	37	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	201405.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	201405.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
132	74	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
133	91	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	26030.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26030.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
138	76	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	14100.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14100.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
139	94	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	917032.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	917032.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
141	77	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8567.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8567.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
142	95	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1301162.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1301162.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
144	79	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2400.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2400.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
145	96	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1300748.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1300748.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
147	80	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2430.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2430.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
148	97	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10540.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10540.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
150	81	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10400.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10400.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
151	98	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	238000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	238000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
153	47	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52199.98	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52199.98	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
154	84	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7300.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7300.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
156	28	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	141636.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	141636.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
157	87	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	72580.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	72580.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
159	100	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	81958.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	81958.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
160	88	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
162	101	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	113013.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	113013.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
164	48	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	177244.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	177244.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
166	90	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5600000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5600000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
167	50	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	145857.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	145857.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
169	92	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3266281.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3266281.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
171	94	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	917032.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	917032.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
173	95	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1301162.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1301162.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
175	96	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1300748.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1300748.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
177	97	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10540.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10540.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
179	98	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	238000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	238000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
181	99	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	39220.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39220.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
183	100	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	81958.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	81958.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
185	101	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	113013.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	113013.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
134	20	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	64530.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	64530.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
135	75	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
136	92	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3266281.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3266281.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
137	21	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	124851.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	124851.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
140	22	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1116262.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1116262.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
143	23	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	473188.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	473188.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
146	24	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9056347.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9056347.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
149	25	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224114.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	224114.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
152	82	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
155	99	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	39220.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39220.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
235	24	\N	Credit	Petrol sale | Balance: Rs.9,056,347.00 ΓåÆ Rs.9,058,889.90 (Change Rs.2,542.90)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2542.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2542.90	\N	10.000	254.29	2026-05-02 11:51:19.145094+00	9056347.00	9058889.90	9056347.00	9058889.90	2542.90	\N
266	33	\N	Credit	Diesel sale | Balance: Rs.55,784.00 ΓåÆ Rs.58,479.00 (Change Rs.2,695.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	2695.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2695.00	\N	10.000	269.50	2026-05-02 13:00:00.306153+00	55784.00	58479.00	55784.00	58479.00	2695.00	\N
236	24	\N	Credit	Diesel sale | Balance: Rs.9,058,889.90 ΓåÆ Rs.9,081,797.40 (Change Rs.22,907.50)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	22907.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22907.50	\N	85.000	269.50	2026-05-02 11:52:10.766626+00	9058889.90	9081797.40	9058889.90	9081797.40	22907.50	\N
245	41	\N	Credit	Diesel sale | Balance: Rs.63,944.00 ΓåÆ Rs.67,144.00 (Change Rs.3,200.00)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	3200.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3200.00	\N	11.870	269.50	2026-05-02 12:06:48.181787+00	63944.00	67144.00	63944.00	67144.00	3200.00	\N
252	22	\N	Credit	Petrol sale | Balance: Rs.1,116,262.00 ΓåÆ Rs.1,118,804.90 (Change Rs.2,542.90)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2542.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2542.90	\N	10.000	254.29	2026-05-02 12:42:24.097836+00	1116262.00	1118804.90	1116262.00	1118804.90	2542.90	\N
260	48	\N	Credit	Petrol sale | Balance: Rs.183,092.67 ΓåÆ Rs.186,652.73 (Change Rs.3,560.06)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3560.06	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3560.06	\N	14.000	254.29	2026-05-02 12:51:22.424486+00	183092.67	186652.73	183092.67	186652.73	3560.06	\N
267	83	\N	Advance	Cash Advance: Other | pay adv | Balance: Rs.0.00 ΓåÆ Rs.2,000.00 (Change Rs.2,000.00)	2026-05-03 06:59:26.418051+00	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	2	\N	2000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2000.00	\N	\N	\N	2026-05-03 06:59:26.418051+00	0.00	2000.00	0.00	2000.00	2000.00	\N
279	23	\N	Advance	Cash Advance: Other | water servies | Balance: Rs.493,400.50 ΓåÆ Rs.494,900.50 (Change Rs.1,500.00)	2026-05-03 08:10:10.561344+00	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	3	\N	1500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1500.00	\N	\N	\N	2026-05-03 08:10:10.561344+00	493400.50	494900.50	493400.50	494900.50	1500.00	\N
285	48	\N	Credit	Petrol sale | Balance: Rs.186,652.73 ΓåÆ Rs.205,724.48 (Change Rs.19,071.75)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	19071.75	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19071.75	\N	75.000	254.29	2026-05-03 08:31:28.341163+00	186652.73	205724.48	186652.73	205724.48	19071.75	\N
290	33	\N	Credit	Diesel sale | Balance: Rs.58,479.00 ΓåÆ Rs.63,869.00 (Change Rs.5,390.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-03 08:46:45.496447+00	58479.00	63869.00	58479.00	63869.00	5390.00	\N
295	12	\N	Credit	Diesel sale | Balance: Rs.472,190.00 ΓåÆ Rs.491,594.00 (Change Rs.19,404.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	19404.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19404.00	\N	72.000	269.50	2026-05-16 12:51:29.053726+00	472190.00	491594.00	472190.00	491594.00	19404.00	\N
300	18	\N	Credit	Diesel sale | Balance: Rs.558,843.00 ΓåÆ Rs.570,431.50 (Change Rs.11,588.50)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	11588.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11588.50	\N	43.000	269.50	2026-05-16 13:06:09.094532+00	558843.00	570431.50	558843.00	570431.50	11588.50	\N
305	30	\N	Credit	Petrol sale | Balance: Rs.92,799.71 ΓåÆ Rs.95,088.32 (Change Rs.2,288.61)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2288.61	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2288.61	\N	9.000	254.29	2026-05-16 13:13:25.434127+00	92799.71	95088.32	92799.71	95088.32	2288.61	\N
325	22	\N	Credit	Petrol sale | Balance: Rs.1,190,904.94 ΓåÆ Rs.1,207,688.08 (Change Rs.16,783.14)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	16783.14	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16783.14	\N	66.000	254.29	2026-05-16 14:11:37.344605+00	1190904.94	1207688.08	1190904.94	1207688.08	16783.14	\N
330	50	\N	Credit	Petrol sale | Balance: Rs.152,356.65 ΓåÆ Rs.159,985.65 (Change Rs.7,629.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7629.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7629.00	\N	30.000	254.29	2026-05-16 14:20:16.429611+00	152356.65	159985.65	152356.65	159985.65	7629.00	\N
335	24	\N	Credit	Petrol sale | Balance: Rs.9,441,272.80 ΓåÆ Rs.9,469,244.70 (Change Rs.27,971.90)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	27971.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	27971.90	\N	110.000	254.29	2026-05-16 14:32:18.958474+00	9441272.80	9469244.70	9441272.80	9469244.70	27971.90	\N
341	46	\N	Credit	Petrol sale | Balance: Rs.0.00 ΓåÆ Rs.19,404.00 (Change Rs.19,404.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	19404.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19404.00	\N	76.310	254.29	2026-05-16 14:39:59.582855+00	0.00	19404.00	0.00	19404.00	19404.00	\N
346	49	\N	Credit	Petrol sale | Balance: Rs.111,572.65 ΓåÆ Rs.117,672.67 (Change Rs.6,100.02)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6100.02	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6100.02	\N	23.990	254.29	2026-05-16 14:52:41.853674+00	111572.65	117672.67	111572.65	117672.67	6100.02	\N
351	22	\N	Credit	Petrol sale - katoti | Balance: Rs.2,121,230.07 ΓåÆ Rs.2,147,193.07 (Change Rs.25,963.00)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	25963.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	25963.00	\N	102.100	254.29	2026-05-16 14:59:26.019813+00	2121230.07	2147193.07	2121230.07	2147193.07	25963.00	\N
355	22	\N	Credit	Petrol sale | Balance: Rs.2,147,193.07 ΓåÆ Rs.2,154,821.77 (Change Rs.7,628.70)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7628.70	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7628.70	\N	30.000	254.29	2026-05-16 15:10:17.876761+00	2147193.07	2154821.77	2147193.07	2154821.77	7628.70	\N
359	49	\N	Credit	Petrol sale | Balance: Rs.117,672.67 ΓåÆ Rs.120,672.67 (Change Rs.3,000.00)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3000.00	\N	11.800	254.29	2026-05-16 15:13:41.902479+00	117672.67	120672.67	117672.67	120672.67	3000.00	\N
367	22	\N	Credit	Petrol sale | Balance: Rs.2,178,807.27 ΓåÆ Rs.2,196,353.28 (Change Rs.17,546.01)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	17546.01	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	17546.01	\N	69.000	254.29	2026-05-16 15:26:17.883752+00	2178807.27	2196353.28	2178807.27	2196353.28	17546.01	\N
371	30	\N	Credit	Petrol sale | Balance: Rs.95,088.32 ΓåÆ Rs.103,988.47 (Change Rs.8,900.15)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8900.15	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8900.15	\N	35.000	254.29	2026-05-16 15:32:14.269054+00	95088.32	103988.47	95088.32	103988.47	8900.15	\N
375	33	\N	Credit	Diesel sale | Balance: Rs.89,226.00 ΓåÆ Rs.90,574.00 (Change Rs.1,348.00)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	1348.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1348.00	\N	5.000	269.50	2026-05-16 15:37:02.182654+00	89226.00	90574.00	89226.00	90574.00	1348.00	\N
379	47	\N	Credit	Petrol sale | Balance: Rs.58,198.68 ΓåÆ Rs.64,198.68 (Change Rs.6,000.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6000.00	\N	23.600	254.29	2026-05-16 16:09:36.17338+00	58198.68	64198.68	58198.68	64198.68	6000.00	\N
383	13	\N	Credit	Petrol sale | Balance: Rs.829,594.00 ΓåÆ Rs.835,696.96 (Change Rs.6,102.96)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6102.96	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6102.96	\N	24.000	254.29	2026-05-16 16:20:18.342837+00	829594.00	835696.96	829594.00	835696.96	6102.96	\N
386	28	\N	Credit	Petrol sale - katoti | Balance: Rs.206,734.21 ΓåÆ Rs.210,314.21 (Change Rs.3,580.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3580.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3580.00	\N	14.080	254.29	2026-05-16 16:27:12.427023+00	206734.21	210314.21	206734.21	210314.21	3580.00	\N
389	20	\N	Credit	Petrol sale | Balance: Rs.76,227.34 ΓåÆ Rs.82,330.30 (Change Rs.6,102.96)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6102.96	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6102.96	\N	24.000	254.29	2026-05-16 16:35:49.045655+00	76227.34	82330.30	76227.34	82330.30	6102.96	\N
395	24	\N	Credit	Diesel sale | Balance: Rs.9,521,217.31 ΓåÆ Rs.9,572,422.31 (Change Rs.51,205.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	51205.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	51205.00	\N	190.000	269.50	2026-05-16 16:48:28.702838+00	9521217.31	9572422.31	9521217.31	9572422.31	51205.00	\N
399	30	\N	Credit	Diesel sale | Balance: Rs.138,063.33 ΓåÆ Rs.140,758.33 (Change Rs.2,695.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	2695.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2695.00	\N	10.000	269.50	2026-05-16 17:02:47.555+00	138063.33	140758.33	138063.33	140758.33	2695.00	\N
402	49	\N	Credit	Petrol sale | Balance: Rs.120,672.67 ΓåÆ Rs.131,072.67 (Change Rs.10,400.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10400.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10400.00	\N	40.900	254.29	2026-05-16 17:08:47.9318+00	120672.67	131072.67	120672.67	131072.67	10400.00	\N
405	55	\N	Credit	Petrol sale | Balance: Rs.26,500.31 ΓåÆ Rs.27,500.31 (Change Rs.1,000.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.930	254.29	2026-05-16 17:18:02.737986+00	26500.31	27500.31	26500.31	27500.31	1000.00	\N
408	12	\N	Credit	Diesel sale | Balance: Rs.505,069.00 ΓåÆ Rs.527,976.50 (Change Rs.22,907.50)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	22907.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22907.50	\N	85.000	269.50	2026-05-16 21:44:08.199226+00	505069.00	527976.50	505069.00	527976.50	22907.50	\N
229	\N	\N	CashSale	{"machine":1,"liters_input":3168.48,"liters":3168.48,"rate":254.29,"gross":805712.78,"udhaar":50897,"testing":0,"notes":""}	2026-01-31 19:00:01+00	Cash	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	machine_reading	Petrol	\N	\N	754815.78	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	754815.78	\N	3168.480	254.29	2026-05-02 10:46:30.09602+00	\N	\N	\N	\N	\N	\N
230	\N	\N	CashSale	{"machine":1,"liters_input":473.62,"liters":473.62,"rate":269.5,"gross":127640.59,"udhaar":66184,"testing":0,"notes":""}	2026-01-31 19:00:01+00	Cash	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	machine_reading	Diesel	\N	\N	61456.59	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	61456.59	\N	473.620	269.50	2026-05-02 10:46:30.09602+00	\N	\N	\N	\N	\N	\N
238	25	\N	Credit	Petrol sale | Balance: Rs.224,114.00 ΓåÆ Rs.232,759.86 (Change Rs.8,645.86)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8645.86	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8645.86	\N	34.000	254.29	2026-05-02 11:58:32.41893+00	224114.00	232759.86	224114.00	232759.86	8645.86	\N
246	12	\N	Credit	Diesel sale | Balance: Rs.412,900.00 ΓåÆ Rs.429,878.50 (Change Rs.16,978.50)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16978.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16978.50	\N	63.000	269.50	2026-05-02 12:27:09.132993+00	412900.00	429878.50	412900.00	429878.50	16978.50	\N
253	22	\N	Credit	Diesel sale | Balance: Rs.1,118,804.90 ΓåÆ Rs.1,165,967.40 (Change Rs.47,162.50)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	47162.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	47162.50	\N	175.000	269.50	2026-05-02 12:43:05.762356+00	1118804.90	1165967.40	1118804.90	1165967.40	47162.50	\N
261	50	\N	Credit	Petrol sale | Balance: Rs.145,857.00 ΓåÆ Rs.152,356.65 (Change Rs.6,499.65)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6499.65	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6499.65	\N	25.560	254.29	2026-05-02 12:52:41.981095+00	145857.00	152356.65	145857.00	152356.65	6499.65	\N
268	16	\N	Credit	Petrol sale | Balance: Rs.4,457,072.80 ΓåÆ Rs.4,467,244.40 (Change Rs.10,171.60)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10171.60	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10171.60	\N	40.000	254.29	2026-05-03 07:10:13.883822+00	4457072.80	4467244.40	4457072.80	4467244.40	10171.60	\N
274	16	\N	Credit	Petrol sale | Balance: Rs.4,497,428.40 ΓåÆ Rs.4,513,194.38 (Change Rs.15,765.98)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	15765.98	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	15765.98	\N	62.000	254.29	2026-05-03 07:52:49.839206+00	4497428.40	4513194.38	4497428.40	4513194.38	15765.98	\N
280	22	\N	Credit	Petrol sale - water servies | Balance: Rs.1,165,967.40 ΓåÆ Rs.1,168,510.30 (Change Rs.2,542.90)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2542.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2542.90	\N	10.000	254.29	2026-05-03 08:12:29.778937+00	1165967.40	1168510.30	1165967.40	1168510.30	2542.90	\N
286	52	\N	Credit	Petrol sale | Balance: Rs.143,469.00 ΓåÆ Rs.152,569.00 (Change Rs.9,100.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9100.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9100.00	\N	35.790	254.29	2026-05-03 08:32:26.825114+00	143469.00	152569.00	143469.00	152569.00	9100.00	\N
291	87	\N	Advance	Cash Advance: Other | advance pay mar | Balance: Rs.72,580.00 ΓåÆ Rs.82,580.00 (Change Rs.10,000.00)	2026-05-03 08:50:12.288269+00	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	4	\N	10000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10000.00	\N	\N	\N	2026-05-03 08:50:12.288269+00	72580.00	82580.00	72580.00	82580.00	10000.00	\N
301	22	\N	Credit	Petrol sale | Balance: Rs.1,173,900.30 ΓåÆ Rs.1,177,968.94 (Change Rs.4,068.64)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4068.64	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4068.64	\N	16.000	254.29	2026-05-16 13:08:25.500263+00	1173900.30	1177968.94	1173900.30	1177968.94	4068.64	\N
306	49	\N	Credit	Petrol sale | Balance: Rs.103,372.65 ΓåÆ Rs.111,572.65 (Change Rs.8,200.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8200.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8200.00	\N	32.250	254.29	2026-05-16 13:14:48.598781+00	103372.65	111572.65	103372.65	111572.65	8200.00	\N
331	19	\N	Credit	Diesel sale | Balance: Rs.684,380.50 ΓåÆ Rs.700,550.50 (Change Rs.16,170.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16170.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16170.00	\N	60.000	269.50	2026-05-16 14:21:32.438424+00	684380.50	700550.50	684380.50	700550.50	16170.00	\N
336	24	\N	Credit	Diesel sale | Balance: Rs.9,469,244.70 ΓåÆ Rs.9,480,024.70 (Change Rs.10,780.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	10780.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10780.00	\N	40.000	269.50	2026-05-16 14:33:04.235704+00	9469244.70	9480024.70	9469244.70	9480024.70	10780.00	\N
342	16	\N	Credit	Petrol sale | Balance: Rs.4,643,359.98 ΓåÆ Rs.4,644,631.43 (Change Rs.1,271.45)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1271.45	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1271.45	\N	5.000	254.29	2026-05-16 14:46:40.654124+00	4643359.98	4644631.43	4643359.98	4644631.43	1271.45	\N
347	33	\N	Credit	Petrol sale | Balance: Rs.74,649.00 ΓåÆ Rs.83,835.00 (Change Rs.9,186.00)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9186.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9186.00	\N	36.120	254.29	2026-05-16 14:54:28.515299+00	74649.00	83835.00	74649.00	83835.00	9186.00	\N
352	67	\N	Credit	Diesel sale - nagat cash | Balance: Rs.0.00 ΓåÆ Rs.178,278.00 (Change Rs.178,278.00)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	178278.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	178278.00	\N	661.510	269.50	2026-05-16 15:01:32.816161+00	0.00	178278.00	0.00	178278.00	178278.00	\N
356	22	\N	Credit	Diesel sale | Balance: Rs.2,154,821.77 ΓåÆ Rs.2,178,807.27 (Change Rs.23,985.50)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	23985.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	23985.50	\N	89.000	269.50	2026-05-16 15:11:06.358542+00	2154821.77	2178807.27	2154821.77	2178807.27	23985.50	\N
360	50	\N	Credit	Petrol sale | Balance: Rs.159,985.65 ΓåÆ Rs.167,614.65 (Change Rs.7,629.00)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7629.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7629.00	\N	30.000	254.29	2026-05-16 15:14:58.654359+00	159985.65	167614.65	159985.65	167614.65	7629.00	\N
364	41	\N	Credit	Petrol sale - ceo h 2 | Balance: Rs.92,105.97 ΓåÆ Rs.97,191.97 (Change Rs.5,086.00)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5086.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5086.00	\N	20.000	254.29	2026-05-16 15:18:41.98022+00	92105.97	97191.97	92105.97	97191.97	5086.00	\N
372	48	\N	Credit	Petrol sale | Balance: Rs.217,676.11 ΓåÆ Rs.222,507.62 (Change Rs.4,831.51)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4831.51	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4831.51	\N	19.000	254.29	2026-05-16 15:33:41.288871+00	217676.11	222507.62	217676.11	222507.62	4831.51	\N
376	57	\N	Credit	Diesel sale | Balance: Rs.15,890.00 ΓåÆ Rs.26,265.00 (Change Rs.10,375.00)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	10375.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10375.00	\N	38.500	269.50	2026-05-16 15:38:54.548693+00	15890.00	26265.00	15890.00	26265.00	10375.00	\N
384	14	\N	Credit	Diesel sale | Balance: Rs.455,910.70 ΓåÆ Rs.469,385.70 (Change Rs.13,475.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13475.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13475.00	\N	50.000	269.50	2026-05-16 16:21:57.134818+00	455910.70	469385.70	455910.70	469385.70	13475.00	\N
387	28	\N	Credit	Petrol sale | Balance: Rs.210,314.21 ΓåÆ Rs.214,382.85 (Change Rs.4,068.64)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4068.64	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4068.64	\N	16.000	254.29	2026-05-16 16:30:18.060483+00	210314.21	214382.85	210314.21	214382.85	4068.64	\N
390	21	\N	Credit	Petrol sale | Balance: Rs.132,479.70 ΓåÆ Rs.137,565.50 (Change Rs.5,085.80)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-16 16:38:43.187138+00	132479.70	137565.50	132479.70	137565.50	5085.80	\N
393	22	\N	Credit	Diesel sale | Balance: Rs.2,260,246.64 ΓåÆ Rs.2,315,494.14 (Change Rs.55,247.50)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	55247.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	55247.50	\N	205.000	269.50	2026-05-16 16:44:14.200186+00	2260246.64	2315494.14	2260246.64	2315494.14	55247.50	\N
396	25	\N	Credit	Petrol sale | Balance: Rs.261,494.63 ΓåÆ Rs.266,580.43 (Change Rs.5,085.80)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-16 16:49:45.312086+00	261494.63	266580.43	261494.63	266580.43	5085.80	\N
403	50	\N	Credit	Petrol sale | Balance: Rs.167,614.65 ΓåÆ Rs.175,243.35 (Change Rs.7,628.70)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7628.70	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7628.70	\N	30.000	254.29	2026-05-16 17:10:03.980258+00	167614.65	175243.35	167614.65	175243.35	7628.70	\N
406	33	\N	Credit	Diesel sale | Balance: Rs.90,574.00 ΓåÆ Rs.95,965.00 (Change Rs.5,391.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5391.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5391.00	\N	20.000	269.50	2026-05-16 17:19:40.53682+00	90574.00	95965.00	90574.00	95965.00	5391.00	\N
409	28	\N	Credit	Petrol sale | Balance: Rs.262,892.85 ΓåÆ Rs.267,470.07 (Change Rs.4,577.22)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4577.22	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4577.22	\N	18.000	254.29	2026-05-16 21:46:46.034037+00	262892.85	267470.07	262892.85	267470.07	4577.22	\N
231	47	\N	Credit	Petrol sale | Balance: Rs.52,199.98 ΓåÆ Rs.58,198.68 (Change Rs.5,998.70)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5998.70	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5998.70	\N	23.590	254.29	2026-05-02 11:33:54.824605+00	52199.98	58198.68	52199.98	58198.68	5998.70	\N
239	30	\N	Credit	Petrol sale | Balance: Rs.64,969.00 ΓåÆ Rs.77,429.21 (Change Rs.12,460.21)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12460.21	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12460.21	\N	49.000	254.29	2026-05-02 11:59:26.163119+00	64969.00	77429.21	64969.00	77429.21	12460.21	\N
247	13	\N	Credit	Diesel sale | Balance: Rs.799,949.00 ΓåÆ Rs.829,594.00 (Change Rs.29,645.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	29645.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	29645.00	\N	110.000	269.50	2026-05-02 12:28:44.424055+00	799949.00	829594.00	799949.00	829594.00	29645.00	\N
254	24	\N	Credit	Petrol sale | Balance: Rs.9,104,704.90 ΓåÆ Rs.9,118,945.14 (Change Rs.14,240.24)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	14240.24	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14240.24	\N	56.000	254.29	2026-05-02 12:44:20.637036+00	9104704.90	9118945.14	9104704.90	9118945.14	14240.24	\N
262	51	\N	Credit	Petrol sale | Balance: Rs.273,644.00 ΓåÆ Rs.375,360.00 (Change Rs.101,716.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	101716.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	101716.00	\N	400.000	254.29	2026-05-02 12:54:23.55517+00	273644.00	375360.00	273644.00	375360.00	101716.00	\N
269	16	\N	Credit	Diesel sale | Balance: Rs.4,467,244.40 ΓåÆ Rs.4,497,428.40 (Change Rs.30,184.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	30184.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30184.00	\N	112.000	269.50	2026-05-03 07:10:50.531136+00	4467244.40	4497428.40	4467244.40	4497428.40	30184.00	\N
275	20	\N	Credit	Petrol sale | Balance: Rs.71,395.83 ΓåÆ Rs.76,227.34 (Change Rs.4,831.51)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4831.51	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4831.51	\N	19.000	254.29	2026-05-03 07:54:59.93042+00	71395.83	76227.34	71395.83	76227.34	4831.51	\N
281	22	\N	Credit	Diesel sale | Balance: Rs.1,168,510.30 ΓåÆ Rs.1,173,900.30 (Change Rs.5,390.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-03 08:15:34.517078+00	1168510.30	1173900.30	1168510.30	1173900.30	5390.00	\N
158	29	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	412014.03	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	412014.03	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
161	30	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	64969.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	64969.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
163	89	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	252682.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	252682.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
165	49	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	96873.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	96873.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
168	91	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	26030.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26030.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
170	51	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	273644.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	273644.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
172	31	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	100830.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	100830.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
176	52	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	143469.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	143469.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
178	53	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	16570.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16570.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
180	54	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	125000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	125000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
182	55	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	22500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
184	33	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	49394.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	49394.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
186	34	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8498.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8498.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
187	56	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	653578.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	653578.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
188	58	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	22800.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	22800.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
189	59	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
190	61	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	66532.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	66532.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
191	62	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	85330.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	85330.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
192	65	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	96375.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	96375.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
193	66	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	11843.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11843.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
194	70	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	108000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	108000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
195	71	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	30100.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30100.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
196	72	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
197	73	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
198	74	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
199	75	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	52000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	52000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
200	76	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	14100.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14100.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
201	77	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8567.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8567.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
202	79	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2400.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2400.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
203	80	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2430.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2430.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
204	81	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10400.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10400.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
205	82	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8500.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8500.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
206	84	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7300.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7300.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
207	87	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	72580.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	72580.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
208	88	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
209	89	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	252682.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	252682.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
210	90	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5600000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5600000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
211	91	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	26030.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26030.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
212	92	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3266281.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3266281.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
213	94	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	917032.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	917032.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
214	95	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1301162.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1301162.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
215	96	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1300748.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1300748.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
216	97	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10540.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10540.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
217	98	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	238000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	238000.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
218	99	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	39220.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39220.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
219	100	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	81958.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	81958.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
220	101	\N	Credit	Opening Balance (January 2026) ΓÇö Pichla pending	2026-01-30 19:00:00+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	113013.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	113013.00	\N	\N	\N	2026-05-02 03:05:11.252761+00	\N	\N	\N	\N	\N	\N
232	45	\N	Credit	Petrol sale - 15-L+W.SERVIES | Balance: Rs.126,703.00 ΓåÆ Rs.131,017.00 (Change Rs.4,314.00)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4314.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4314.00	\N	16.960	254.29	2026-05-02 11:41:39.750355+00	126703.00	131017.00	126703.00	131017.00	4314.00	\N
240	48	\N	Credit	Petrol sale | Balance: Rs.177,244.00 ΓåÆ Rs.183,092.67 (Change Rs.5,848.67)	2026-02-01 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5848.67	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5848.67	\N	23.000	254.29	2026-05-02 12:00:49.403616+00	177244.00	183092.67	177244.00	183092.67	5848.67	\N
248	28	\N	Credit	Petrol sale - P-36-L+M.OIL | Balance: Rs.141,636.00 ΓåÆ Rs.154,589.99 (Change Rs.12,953.99)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12953.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12953.99	\N	50.940	254.29	2026-05-02 12:30:49.326008+00	141636.00	154589.99	141636.00	154589.99	12953.99	\N
255	24	\N	Credit	Diesel sale | Balance: Rs.9,118,945.14 ΓåÆ Rs.9,228,631.64 (Change Rs.109,686.50)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	109686.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	109686.50	\N	407.000	269.50	2026-05-02 12:44:58.391357+00	9118945.14	9228631.64	9118945.14	9228631.64	109686.50	\N
263	53	\N	Credit	Diesel sale - DIESEL+M.OIL | Balance: Rs.16,570.00 ΓåÆ Rs.193,524.00 (Change Rs.176,954.00)	2026-02-02 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	176954.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	176954.00	\N	656.600	269.50	2026-05-02 12:56:30.482834+00	16570.00	193524.00	16570.00	193524.00	176954.00	\N
270	65	\N	Credit	Petrol sale | Balance: Rs.96,375.00 ΓåÆ Rs.105,375.00 (Change Rs.9,000.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9000.00	\N	35.390	254.29	2026-05-03 07:15:00.682395+00	96375.00	105375.00	96375.00	105375.00	9000.00	\N
276	21	\N	Credit	Petrol sale | Balance: Rs.124,851.00 ΓåÆ Rs.132,479.70 (Change Rs.7,628.70)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7628.70	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7628.70	\N	30.000	254.29	2026-05-03 07:55:56.25061+00	124851.00	132479.70	124851.00	132479.70	7628.70	\N
282	24	\N	Credit	Petrol sale | Balance: Rs.9,228,631.64 ΓåÆ Rs.9,240,583.27 (Change Rs.11,951.63)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	11951.63	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11951.63	\N	47.000	254.29	2026-05-03 08:17:06.779918+00	9228631.64	9240583.27	9228631.64	9240583.27	11951.63	\N
287	15	\N	Credit	Diesel sale | Balance: Rs.122,557.00 ΓåÆ Rs.131,989.50 (Change Rs.9,432.50)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	9432.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9432.50	\N	35.000	269.50	2026-05-03 08:41:24.360604+00	122557.00	131989.50	122557.00	131989.50	9432.50	\N
297	16	\N	Credit	Petrol sale | Balance: Rs.4,583,124.13 ΓåÆ Rs.4,603,721.62 (Change Rs.20,597.49)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	20597.49	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	20597.49	\N	81.000	254.29	2026-05-16 13:01:27.38253+00	4583124.13	4603721.62	4583124.13	4603721.62	20597.49	\N
302	22	\N	Credit	Diesel sale | Balance: Rs.1,177,968.94 ΓåÆ Rs.1,190,904.94 (Change Rs.12,936.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	12936.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12936.00	\N	48.000	269.50	2026-05-16 13:09:26.945311+00	1177968.94	1190904.94	1177968.94	1190904.94	12936.00	\N
307	15	\N	Credit	Diesel sale | Balance: Rs.131,989.50 ΓåÆ Rs.141,422.00 (Change Rs.9,432.50)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	9432.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9432.50	\N	35.000	269.50	2026-05-16 13:28:54.056415+00	131989.50	141422.00	131989.50	141422.00	9432.50	\N
312	33	\N	Credit	Diesel sale | Balance: Rs.63,869.00 ΓåÆ Rs.69,259.00 (Change Rs.5,390.00)	2026-02-04 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-16 13:35:13.379453+00	63869.00	69259.00	63869.00	69259.00	5390.00	\N
322	43	\N	Credit	Petrol sale | Balance: Rs.152,602.75 ΓåÆ Rs.158,960.00 (Change Rs.6,357.25)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6357.25	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6357.25	\N	25.000	254.29	2026-05-16 13:58:53.77588+00	152602.75	158960.00	152602.75	158960.00	6357.25	\N
332	54	\N	Credit	Petrol sale | Balance: Rs.125,000.00 ΓåÆ Rs.130,000.00 (Change Rs.5,000.00)	2026-02-05 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	19.660	254.29	2026-05-16 14:22:45.918414+00	125000.00	130000.00	125000.00	130000.00	5000.00	\N
337	84	\N	Advance	Cash Advance: Other | Balance: Rs.7,300.00 ΓåÆ Rs.8,300.00 (Change Rs.1,000.00)	2026-05-16 14:34:28.220613+00	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	5	\N	1000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	\N	\N	2026-05-16 14:34:28.220613+00	7300.00	8300.00	7300.00	8300.00	1000.00	\N
343	23	\N	Credit	Diesel sale | Balance: Rs.494,900.50 ΓåÆ Rs.499,751.50 (Change Rs.4,851.00)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	4851.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4851.00	\N	18.000	269.50	2026-05-16 14:48:00.151981+00	494900.50	499751.50	494900.50	499751.50	4851.00	\N
348	66	\N	Credit	Petrol sale | Balance: Rs.15,043.00 ΓåÆ Rs.18,033.00 (Change Rs.2,990.00)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2990.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2990.00	\N	11.760	254.29	2026-05-16 14:55:19.70897+00	15043.00	18033.00	15043.00	18033.00	2990.00	\N
353	67	\N	Credit	Diesel sale | Balance: Rs.178,278.00 ΓåÆ Rs.193,780.00 (Change Rs.15,502.00)	2026-02-06 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	15502.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	15502.00	\N	57.520	269.50	2026-05-16 15:02:25.76594+00	178278.00	193780.00	178278.00	193780.00	15502.00	\N
357	24	\N	Credit	Petrol sale | Balance: Rs.9,482,567.60 ΓåÆ Rs.9,496,299.26 (Change Rs.13,731.66)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	13731.66	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13731.66	\N	54.000	254.29	2026-05-16 15:11:45.611454+00	9482567.60	9496299.26	9482567.60	9496299.26	13731.66	\N
361	55	\N	Credit	Petrol sale | Balance: Rs.26,000.31 ΓåÆ Rs.26,500.31 (Change Rs.500.00)	2026-02-07 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	500.00	\N	1.970	254.29	2026-05-16 15:16:00.381791+00	26000.31	26500.31	26000.31	26500.31	500.00	\N
365	43	\N	Credit	Diesel sale | Balance: Rs.158,960.00 ΓåÆ Rs.167,045.00 (Change Rs.8,085.00)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	8085.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8085.00	\N	30.000	269.50	2026-05-16 15:22:41.159324+00	158960.00	167045.00	158960.00	167045.00	8085.00	\N
369	24	\N	Credit	Diesel sale | Balance: Rs.9,501,385.06 ΓåÆ Rs.9,514,860.06 (Change Rs.13,475.00)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13475.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13475.00	\N	50.000	269.50	2026-05-16 15:30:04.985162+00	9501385.06	9514860.06	9501385.06	9514860.06	13475.00	\N
373	31	\N	Credit	Diesel sale | Balance: Rs.118,347.50 ΓåÆ Rs.143,138.81 (Change Rs.24,791.31)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	24791.31	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	24791.31	\N	91.990	269.50	2026-05-16 15:34:52.027519+00	118347.50	143138.81	118347.50	143138.81	24791.31	\N
377	46	\N	Credit	Petrol sale - wahab | Balance: Rs.19,404.00 ΓåÆ Rs.24,489.80 (Change Rs.5,085.80)	2026-02-08 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-16 15:40:01.780956+00	19404.00	24489.80	19404.00	24489.80	5085.80	\N
381	12	\N	Credit	Diesel sale | Balance: Rs.491,594.00 ΓåÆ Rs.505,069.00 (Change Rs.13,475.00)	2026-02-09 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13475.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13475.00	\N	50.000	269.50	2026-05-16 16:15:52.818311+00	491594.00	505069.00	491594.00	505069.00	13475.00	\N
410	16	\N	Credit	Petrol sale | Balance: Rs.4,644,631.43 ΓåÆ Rs.4,717,866.95 (Change Rs.73,235.52)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	73235.52	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	73235.52	\N	288.000	254.29	2026-05-16 21:47:58.455343+00	4644631.43	4717866.95	4644631.43	4717866.95	73235.52	\N
411	16	\N	Credit	Diesel sale | Balance: Rs.4,717,866.95 ΓåÆ Rs.4,734,036.95 (Change Rs.16,170.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16170.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16170.00	\N	60.000	269.50	2026-05-16 21:48:35.972924+00	4717866.95	4734036.95	4717866.95	4734036.95	16170.00	\N
412	22	\N	Credit	Petrol sale | Balance: Rs.2,315,494.14 ΓåÆ Rs.2,319,308.49 (Change Rs.3,814.35)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3814.35	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3814.35	\N	15.000	254.29	2026-05-16 21:49:27.870049+00	2315494.14	2319308.49	2315494.14	2319308.49	3814.35	\N
415	22	\N	Credit	Diesel sale | Balance: Rs.2,350,070.15 ΓåÆ Rs.2,377,020.15 (Change Rs.26,950.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	26950.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26950.00	\N	100.000	269.50	2026-05-16 21:51:29.566555+00	2350070.15	2377020.15	2350070.15	2377020.15	26950.00	\N
416	30	\N	Credit	Petrol sale | Balance: Rs.140,758.33 ΓåÆ Rs.141,958.33 (Change Rs.1,200.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1200.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1200.00	\N	4.720	254.29	2026-05-16 21:53:07.09764+00	140758.33	141958.33	140758.33	141958.33	1200.00	\N
418	51	\N	Credit	Petrol sale | Balance: Rs.375,360.00 ΓåÆ Rs.477,076.00 (Change Rs.101,716.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	101716.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	101716.00	\N	400.000	254.29	2026-05-16 21:54:52.047356+00	375360.00	477076.00	375360.00	477076.00	101716.00	\N
419	48	\N	Credit	Petrol sale | Balance: Rs.225,813.39 ΓåÆ Rs.235,984.99 (Change Rs.10,171.60)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10171.60	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10171.60	\N	40.000	254.29	2026-05-16 21:56:04.784416+00	225813.39	235984.99	225813.39	235984.99	10171.60	\N
420	31	\N	Credit	Diesel sale | Balance: Rs.143,138.81 ΓåÆ Rs.182,216.31 (Change Rs.39,077.50)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	39077.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39077.50	\N	145.000	269.50	2026-05-16 21:57:15.427085+00	143138.81	182216.31	143138.81	182216.31	39077.50	\N
421	52	\N	Credit	Petrol sale | Balance: Rs.152,569.00 ΓåÆ Rs.161,569.00 (Change Rs.9,000.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9000.00	\N	35.390	254.29	2026-05-16 21:57:58.649612+00	152569.00	161569.00	152569.00	161569.00	9000.00	\N
424	55	\N	Credit	Petrol sale | Balance: Rs.28,500.30 ΓåÆ Rs.29,500.30 (Change Rs.1,000.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.930	254.29	2026-05-16 22:02:13.543658+00	28500.30	29500.30	28500.30	29500.30	1000.00	\N
425	33	\N	Credit	Diesel sale | Balance: Rs.95,965.00 ΓåÆ Rs.105,397.00 (Change Rs.9,432.00)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	9432.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9432.00	\N	35.000	269.50	2026-05-16 22:04:54.919965+00	95965.00	105397.00	95965.00	105397.00	9432.00	\N
426	24	\N	Credit	Petrol sale | Balance: Rs.9,572,422.31 ΓåÆ Rs.9,600,902.79 (Change Rs.28,480.48)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	28480.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	28480.48	\N	112.000	254.29	2026-05-16 22:06:16.489069+00	9572422.31	9600902.79	9572422.31	9600902.79	28480.48	\N
427	24	\N	Credit	Diesel sale | Balance: Rs.9,600,902.79 ΓåÆ Rs.9,644,831.29 (Change Rs.43,928.50)	2026-02-10 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	43928.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	43928.50	\N	163.000	269.50	2026-05-16 22:07:00.671109+00	9600902.79	9644831.29	9600902.79	9644831.29	43928.50	\N
430	16	\N	Credit	Petrol sale | Balance: Rs.4,734,036.95 ΓåÆ Rs.4,751,328.67 (Change Rs.17,291.72)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	17291.72	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	17291.72	\N	68.000	254.29	2026-05-16 22:12:11.769898+00	4734036.95	4751328.67	4734036.95	4751328.67	17291.72	\N
431	16	\N	Credit	Diesel sale | Balance: Rs.4,751,328.67 ΓåÆ Rs.4,770,193.67 (Change Rs.18,865.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	18865.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	18865.00	\N	70.000	269.50	2026-05-16 22:12:47.87831+00	4751328.67	4770193.67	4751328.67	4770193.67	18865.00	\N
432	45	\N	Credit	Petrol sale | Balance: Rs.146,271.86 ΓåÆ Rs.153,900.56 (Change Rs.7,628.70)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7628.70	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7628.70	\N	30.000	254.29	2026-05-16 22:13:58.18816+00	146271.86	153900.56	146271.86	153900.56	7628.70	\N
433	17	\N	Credit	Petrol sale | Balance: Rs.17,800.30 ΓåÆ Rs.26,700.45 (Change Rs.8,900.15)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8900.15	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8900.15	\N	35.000	254.29	2026-05-16 22:14:37.66969+00	17800.30	26700.45	17800.30	26700.45	8900.15	\N
434	18	\N	Credit	Diesel sale | Balance: Rs.570,431.50 ΓåÆ Rs.581,750.50 (Change Rs.11,319.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	11319.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11319.00	\N	42.000	269.50	2026-05-16 22:15:08.701121+00	570431.50	581750.50	570431.50	581750.50	11319.00	\N
435	22	\N	Credit	Petrol sale | Balance: Rs.2,377,020.15 ΓåÆ Rs.2,397,617.64 (Change Rs.20,597.49)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	20597.49	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	20597.49	\N	81.000	254.29	2026-05-16 22:16:05.157093+00	2377020.15	2397617.64	2377020.15	2397617.64	20597.49	\N
436	22	\N	Credit	Diesel sale | Balance: Rs.2,397,617.64 ΓåÆ Rs.2,447,475.14 (Change Rs.49,857.50)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	49857.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	49857.50	\N	185.000	269.50	2026-05-16 22:16:39.807444+00	2397617.64	2447475.14	2397617.64	2447475.14	49857.50	\N
437	24	\N	Credit	Petrol sale | Balance: Rs.9,644,831.29 ΓåÆ Rs.9,647,374.19 (Change Rs.2,542.90)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2542.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2542.90	\N	10.000	254.29	2026-05-16 22:17:36.133892+00	9644831.29	9647374.19	9644831.29	9647374.19	2542.90	\N
438	24	\N	Credit	Diesel sale | Balance: Rs.9,647,374.19 ΓåÆ Rs.9,666,239.19 (Change Rs.18,865.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	18865.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	18865.00	\N	70.000	269.50	2026-05-16 22:18:04.125538+00	9647374.19	9666239.19	9647374.19	9666239.19	18865.00	\N
439	48	\N	Credit	Petrol sale | Balance: Rs.235,984.99 ΓåÆ Rs.250,988.10 (Change Rs.15,003.11)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	15003.11	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	15003.11	\N	59.000	254.29	2026-05-16 22:18:46.509412+00	235984.99	250988.10	235984.99	250988.10	15003.11	\N
440	49	\N	Credit	Petrol sale | Balance: Rs.131,072.67 ΓåÆ Rs.137,422.67 (Change Rs.6,350.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6350.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6350.00	\N	24.970	254.29	2026-05-16 22:19:23.539534+00	131072.67	137422.67	131072.67	137422.67	6350.00	\N
441	50	\N	Credit	Petrol sale | Balance: Rs.175,243.35 ΓåÆ Rs.180,243.35 (Change Rs.5,000.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	19.660	254.29	2026-05-16 22:20:11.635476+00	175243.35	180243.35	175243.35	180243.35	5000.00	\N
442	31	\N	Credit	Diesel sale | Balance: Rs.182,216.31 ΓåÆ Rs.191,109.81 (Change Rs.8,893.50)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	8893.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8893.50	\N	33.000	269.50	2026-05-16 22:20:54.356282+00	182216.31	191109.81	182216.31	191109.81	8893.50	\N
443	15	\N	Credit	Diesel sale | Balance: Rs.141,422.00 ΓåÆ Rs.146,812.00 (Change Rs.5,390.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-16 22:21:29.089353+00	141422.00	146812.00	141422.00	146812.00	5390.00	\N
444	55	\N	Credit	Petrol sale | Balance: Rs.29,500.30 ΓåÆ Rs.30,500.30 (Change Rs.1,000.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.930	254.29	2026-05-16 22:22:02.588667+00	29500.30	30500.30	29500.30	30500.30	1000.00	\N
445	33	\N	Credit	Petrol sale | Balance: Rs.105,397.00 ΓåÆ Rs.110,439.00 (Change Rs.5,042.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5042.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5042.00	\N	19.830	254.29	2026-05-16 22:22:41.871834+00	105397.00	110439.00	105397.00	110439.00	5042.00	\N
446	46	\N	Credit	Petrol sale | Balance: Rs.24,489.80 ΓåÆ Rs.44,702.80 (Change Rs.20,213.00)	2026-02-11 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	20213.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	20213.00	\N	79.490	254.29	2026-05-16 22:23:30.594247+00	24489.80	44702.80	24489.80	44702.80	20213.00	\N
447	28	\N	Credit	Petrol sale | Balance: Rs.267,470.07 ΓåÆ Rs.270,521.55 (Change Rs.3,051.48)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3051.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3051.48	\N	12.000	254.29	2026-05-16 22:57:13.282374+00	267470.07	270521.55	267470.07	270521.55	3051.48	\N
448	16	\N	Credit	Petrol sale | Balance: Rs.4,770,193.67 ΓåÆ Rs.4,806,557.14 (Change Rs.36,363.47)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	36363.47	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	36363.47	\N	143.000	254.29	2026-05-16 22:58:34.588534+00	4770193.67	4806557.14	4770193.67	4806557.14	36363.47	\N
449	16	\N	Credit	Diesel sale | Balance: Rs.4,806,557.14 ΓåÆ Rs.4,877,974.64 (Change Rs.71,417.50)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	71417.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	71417.50	\N	265.000	269.50	2026-05-16 22:59:11.82354+00	4806557.14	4877974.64	4806557.14	4877974.64	71417.50	\N
450	21	\N	Credit	Petrol sale | Balance: Rs.137,565.50 ΓåÆ Rs.142,651.30 (Change Rs.5,085.80)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-16 22:59:50.796419+00	137565.50	142651.30	137565.50	142651.30	5085.80	\N
451	29	\N	Credit	Diesel sale | Balance: Rs.412,014.03 ΓåÆ Rs.426,836.53 (Change Rs.14,822.50)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	14822.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14822.50	\N	55.000	269.50	2026-05-16 23:00:34.540771+00	412014.03	426836.53	412014.03	426836.53	14822.50	\N
452	22	\N	Credit	Petrol sale | Balance: Rs.2,447,475.14 ΓåÆ Rs.2,451,289.49 (Change Rs.3,814.35)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3814.35	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3814.35	\N	15.000	254.29	2026-05-16 23:01:00.874691+00	2447475.14	2451289.49	2447475.14	2451289.49	3814.35	\N
453	24	\N	Credit	Petrol sale | Balance: Rs.9,666,239.19 ΓåÆ Rs.9,677,682.24 (Change Rs.11,443.05)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	11443.05	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11443.05	\N	45.000	254.29	2026-05-16 23:01:32.349606+00	9666239.19	9677682.24	9666239.19	9677682.24	11443.05	\N
454	24	\N	Credit	Diesel sale | Balance: Rs.9,677,682.24 ΓåÆ Rs.9,718,107.24 (Change Rs.40,425.00)	2026-02-12 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	40425.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	40425.00	\N	150.000	269.50	2026-05-16 23:02:04.898455+00	9677682.24	9718107.24	9677682.24	9718107.24	40425.00	\N
455	16	\N	Credit	Petrol sale | Balance: Rs.4,877,974.64 ΓåÆ Rs.4,883,823.31 (Change Rs.5,848.67)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5848.67	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5848.67	\N	23.000	254.29	2026-05-16 23:10:00.455614+00	4877974.64	4883823.31	4877974.64	4883823.31	5848.67	\N
456	16	\N	Credit	Diesel sale | Balance: Rs.4,883,823.31 ΓåÆ Rs.4,910,234.31 (Change Rs.26,411.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	26411.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26411.00	\N	98.000	269.50	2026-05-16 23:10:35.182049+00	4883823.31	4910234.31	4883823.31	4910234.31	26411.00	\N
457	21	\N	Credit	Petrol sale | Balance: Rs.142,651.30 ΓåÆ Rs.144,431.33 (Change Rs.1,780.03)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1780.03	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1780.03	\N	7.000	254.29	2026-05-16 23:11:23.192762+00	142651.30	144431.33	142651.30	144431.33	1780.03	\N
458	18	\N	Credit	Diesel sale | Balance: Rs.581,750.50 ΓåÆ Rs.595,495.00 (Change Rs.13,744.50)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13744.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13744.50	\N	51.000	269.50	2026-05-16 23:12:17.443218+00	581750.50	595495.00	581750.50	595495.00	13744.50	\N
459	22	\N	Credit	Petrol sale | Balance: Rs.2,451,289.49 ΓåÆ Rs.2,460,189.64 (Change Rs.8,900.15)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8900.15	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8900.15	\N	35.000	254.29	2026-05-16 23:12:50.94016+00	2451289.49	2460189.64	2451289.49	2460189.64	8900.15	\N
460	22	\N	Credit	Diesel sale | Balance: Rs.2,460,189.64 ΓåÆ Rs.2,510,047.14 (Change Rs.49,857.50)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	49857.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	49857.50	\N	185.000	269.50	2026-05-16 23:13:27.833592+00	2460189.64	2510047.14	2460189.64	2510047.14	49857.50	\N
461	24	\N	Credit	Petrol sale | Balance: Rs.9,718,107.24 ΓåÆ Rs.9,758,030.77 (Change Rs.39,923.53)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	39923.53	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39923.53	\N	157.000	254.29	2026-05-16 23:14:35.394168+00	9718107.24	9758030.77	9718107.24	9758030.77	39923.53	\N
462	24	\N	Credit	Diesel sale | Balance: Rs.9,758,030.77 ΓåÆ Rs.9,771,505.77 (Change Rs.13,475.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13475.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13475.00	\N	50.000	269.50	2026-05-16 23:15:04.827184+00	9758030.77	9771505.77	9758030.77	9771505.77	13475.00	\N
463	30	\N	Credit	Diesel sale | Balance: Rs.141,958.33 ΓåÆ Rs.144,653.33 (Change Rs.2,695.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	2695.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2695.00	\N	10.000	269.50	2026-05-16 23:16:29.287129+00	141958.33	144653.33	141958.33	144653.33	2695.00	\N
464	49	\N	Credit	Petrol sale | Balance: Rs.137,422.67 ΓåÆ Rs.138,922.67 (Change Rs.1,500.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1500.00	\N	5.900	254.29	2026-05-16 23:17:03.150059+00	137422.67	138922.67	137422.67	138922.67	1500.00	\N
465	50	\N	Credit	Petrol sale | Balance: Rs.180,243.35 ΓåÆ Rs.186,943.35 (Change Rs.6,700.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6700.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6700.00	\N	26.350	254.29	2026-05-16 23:17:53.248313+00	180243.35	186943.35	180243.35	186943.35	6700.00	\N
466	15	\N	Credit	Diesel sale | Balance: Rs.146,812.00 ΓåÆ Rs.152,202.00 (Change Rs.5,390.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	20.000	269.50	2026-05-16 23:18:30.967285+00	146812.00	152202.00	146812.00	152202.00	5390.00	\N
467	55	\N	Credit	Petrol sale | Balance: Rs.30,500.30 ΓåÆ Rs.31,500.30 (Change Rs.1,000.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.930	254.29	2026-05-16 23:19:19.07804+00	30500.30	31500.30	30500.30	31500.30	1000.00	\N
468	33	\N	Credit	Petrol sale | Balance: Rs.110,439.00 ΓåÆ Rs.113,134.00 (Change Rs.2,695.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2695.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2695.00	\N	10.600	254.29	2026-05-16 23:20:05.713613+00	110439.00	113134.00	110439.00	113134.00	2695.00	\N
469	41	\N	Credit	Diesel sale - Pathan | Balance: Rs.97,191.97 ΓåÆ Rs.231,941.97 (Change Rs.134,750.00)	2026-02-13 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	134750.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	134750.00	\N	500.000	269.50	2026-05-16 23:20:56.249259+00	97191.97	231941.97	97191.97	231941.97	134750.00	\N
470	47	\N	Credit	Petrol sale | Balance: Rs.64,198.68 ΓåÆ Rs.71,698.68 (Change Rs.7,500.00)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7500.00	\N	29.490	254.29	2026-05-16 23:29:12.777883+00	64198.68	71698.68	64198.68	71698.68	7500.00	\N
471	14	\N	Credit	Petrol sale | Balance: Rs.469,385.70 ΓåÆ Rs.473,200.05 (Change Rs.3,814.35)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3814.35	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3814.35	\N	15.000	254.29	2026-05-16 23:29:45.681134+00	469385.70	473200.05	469385.70	473200.05	3814.35	\N
472	16	\N	Credit	Petrol sale | Balance: Rs.4,910,234.31 ΓåÆ Rs.4,920,405.91 (Change Rs.10,171.60)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10171.60	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10171.60	\N	40.000	254.29	2026-05-16 23:30:11.862404+00	4910234.31	4920405.91	4910234.31	4920405.91	10171.60	\N
473	16	\N	Credit	Diesel sale | Balance: Rs.4,920,405.91 ΓåÆ Rs.4,936,575.91 (Change Rs.16,170.00)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16170.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16170.00	\N	60.000	269.50	2026-05-16 23:30:34.597135+00	4920405.91	4936575.91	4920405.91	4936575.91	16170.00	\N
474	20	\N	Credit	Petrol sale | Balance: Rs.82,330.30 ΓåÆ Rs.88,687.55 (Change Rs.6,357.25)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6357.25	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6357.25	\N	25.000	254.29	2026-05-16 23:31:57.833664+00	82330.30	88687.55	82330.30	88687.55	6357.25	\N
475	22	\N	Credit	Diesel sale | Balance: Rs.2,510,047.14 ΓåÆ Rs.2,514,089.64 (Change Rs.4,042.50)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	4042.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4042.50	\N	15.000	269.50	2026-05-16 23:32:33.313532+00	2510047.14	2514089.64	2510047.14	2514089.64	4042.50	\N
476	24	\N	Credit	Petrol sale | Balance: Rs.9,771,505.77 ΓåÆ Rs.9,775,320.12 (Change Rs.3,814.35)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3814.35	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3814.35	\N	15.000	254.29	2026-05-16 23:33:09.928993+00	9771505.77	9775320.12	9771505.77	9775320.12	3814.35	\N
477	25	\N	Credit	Petrol sale | Balance: Rs.266,580.43 ΓåÆ Rs.272,937.68 (Change Rs.6,357.25)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6357.25	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6357.25	\N	25.000	254.29	2026-05-16 23:33:45.534844+00	266580.43	272937.68	266580.43	272937.68	6357.25	\N
478	48	\N	Credit	Petrol sale | Balance: Rs.250,988.10 ΓåÆ Rs.256,328.19 (Change Rs.5,340.09)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5340.09	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5340.09	\N	21.000	254.29	2026-05-16 23:34:20.952646+00	250988.10	256328.19	250988.10	256328.19	5340.09	\N
479	54	\N	Credit	Petrol sale | Balance: Rs.135,000.00 ΓåÆ Rs.140,000.00 (Change Rs.5,000.00)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5000.00	\N	19.660	254.29	2026-05-16 23:35:04.793385+00	135000.00	140000.00	135000.00	140000.00	5000.00	\N
480	55	\N	Credit	Petrol sale | Balance: Rs.31,500.30 ΓåÆ Rs.32,000.30 (Change Rs.500.00)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	500.00	\N	1.970	254.29	2026-05-16 23:36:39.456437+00	31500.30	32000.30	31500.30	32000.30	500.00	\N
481	33	\N	Credit	Petrol sale | Balance: Rs.113,134.00 ΓåÆ Rs.118,524.00 (Change Rs.5,390.00)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5390.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5390.00	\N	21.200	254.29	2026-05-16 23:37:16.425181+00	113134.00	118524.00	113134.00	118524.00	5390.00	\N
482	46	\N	Credit	Petrol sale - wahab | Balance: Rs.44,702.80 ΓåÆ Rs.53,602.80 (Change Rs.8,900.00)	2026-02-14 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8900.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8900.00	\N	35.000	254.29	2026-05-16 23:37:53.456508+00	44702.80	53602.80	44702.80	53602.80	8900.00	\N
484	55	\N	Credit	Petrol sale | Balance: Rs.32,000.30 ΓåÆ Rs.33,000.30 (Change Rs.1,000.00)	2026-02-03 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.930	254.29	2026-05-17 14:51:52.50845+00	32000.30	33000.30	32000.30	33000.30	1000.00	\N
485	47	\N	Credit	Petrol sale | Balance: Rs.71,698.68 ΓåÆ Rs.72,998.68 (Change Rs.1,300.00)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1300.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1300.00	\N	5.110	254.29	2026-05-18 05:12:51.717817+00	71698.68	72998.68	71698.68	72998.68	1300.00	\N
487	16	\N	Credit	Petrol sale | Balance: Rs.4,936,575.91 ΓåÆ Rs.4,941,661.71 (Change Rs.5,085.80)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5085.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5085.80	\N	20.000	254.29	2026-05-18 07:43:03.666235+00	4936575.91	4941661.71	4936575.91	4941661.71	5085.80	\N
488	16	\N	Credit	Diesel sale | Balance: Rs.4,941,661.71 ΓåÆ Rs.4,955,136.71 (Change Rs.13,475.00)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13475.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13475.00	\N	50.000	269.50	2026-05-18 07:43:58.757972+00	4941661.71	4955136.71	4941661.71	4955136.71	13475.00	\N
489	23	\N	Credit	Petrol sale | Balance: Rs.519,694.50 ΓåÆ Rs.522,237.40 (Change Rs.2,542.90)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2542.90	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2542.90	\N	10.000	254.29	2026-05-18 07:46:44.914608+00	519694.50	522237.40	519694.50	522237.40	2542.90	\N
490	22	\N	Credit	Petrol sale | Balance: Rs.2,514,089.64 ΓåÆ Rs.2,521,209.76 (Change Rs.7,120.12)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7120.12	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7120.12	\N	28.000	254.29	2026-05-18 12:34:55.447081+00	2514089.64	2521209.76	2514089.64	2521209.76	7120.12	\N
491	22	\N	Credit	Diesel sale | Balance: Rs.2,521,209.76 ΓåÆ Rs.2,557,592.26 (Change Rs.36,382.50)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	36382.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	36382.50	\N	135.000	269.50	2026-05-18 12:35:34.935009+00	2521209.76	2557592.26	2521209.76	2557592.26	36382.50	\N
492	24	\N	Credit	Diesel sale | Balance: Rs.9,775,320.12 ΓåÆ Rs.9,795,532.62 (Change Rs.20,212.50)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	20212.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	20212.50	\N	75.000	269.50	2026-05-18 12:37:53.669274+00	9775320.12	9795532.62	9775320.12	9795532.62	20212.50	\N
493	24	\N	Credit	Petrol sale | Balance: Rs.9,795,532.62 ΓåÆ Rs.9,799,397.61 (Change Rs.3,864.99)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3864.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3864.99	\N	15.200	254.29	2026-05-18 12:39:23.305005+00	9795532.62	9799397.61	9795532.62	9799397.61	3864.99	\N
494	48	\N	Credit	Petrol sale | Balance: Rs.256,328.19 ΓåÆ Rs.261,159.70 (Change Rs.4,831.51)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4831.51	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4831.51	\N	19.000	254.29	2026-05-18 12:40:45.323345+00	256328.19	261159.70	256328.19	261159.70	4831.51	\N
495	31	\N	Credit	Diesel sale | Balance: Rs.191,109.81 ΓåÆ Rs.216,025.80 (Change Rs.24,915.99)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	24915.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	24915.99	\N	92.450	269.50	2026-05-18 12:42:06.599814+00	191109.81	216025.80	191109.81	216025.80	24915.99	\N
496	33	\N	Credit	Petrol sale | Balance: Rs.118,524.00 ΓåÆ Rs.121,219.00 (Change Rs.2,695.00)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2695.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2695.00	\N	10.600	254.29	2026-05-18 12:43:41.125163+00	118524.00	121219.00	118524.00	121219.00	2695.00	\N
497	33	\N	Credit	Diesel sale | Balance: Rs.121,219.00 ΓåÆ Rs.124,062.00 (Change Rs.2,843.00)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	2843.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2843.00	\N	10.550	269.50	2026-05-18 12:44:37.519261+00	121219.00	124062.00	121219.00	124062.00	2843.00	\N
498	66	\N	Credit	Petrol sale | Balance: Rs.18,033.00 ΓåÆ Rs.24,033.00 (Change Rs.6,000.00)	2026-02-15 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6000.00	\N	23.600	254.29	2026-05-18 12:48:14.581826+00	18033.00	24033.00	18033.00	24033.00	6000.00	\N
499	16	\N	Credit	Petrol sale | Balance: Rs.4,955,136.71 ΓåÆ Rs.4,961,619.46 (Change Rs.6,482.75)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6482.75	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6482.75	\N	25.000	259.31	2026-05-18 12:58:21.498844+00	4955136.71	4961619.46	4955136.71	4961619.46	6482.75	\N
501	43	\N	Credit	Petrol sale | Balance: Rs.173,402.00 ΓåÆ Rs.185,701.00 (Change Rs.12,299.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12299.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12299.00	\N	47.430	259.31	2026-05-18 21:42:25.865575+00	173402.00	185701.00	173402.00	185701.00	12299.00	\N
502	28	\N	Credit	Petrol sale | Balance: Rs.270,521.55 ΓåÆ Rs.279,856.71 (Change Rs.9,335.16)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9335.16	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9335.16	\N	36.000	259.31	2026-05-18 21:43:36.751602+00	270521.55	279856.71	270521.55	279856.71	9335.16	\N
504	16	\N	Credit	Petrol sale | Balance: Rs.4,961,619.46 ΓåÆ Rs.4,974,325.65 (Change Rs.12,706.19)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12706.19	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12706.19	\N	49.000	259.31	2026-05-18 22:14:20.865033+00	4961619.46	4974325.65	4961619.46	4974325.65	12706.19	\N
505	16	\N	Credit	Petrol sale | Balance: Rs.4,974,325.65 ΓåÆ Rs.4,992,736.66 (Change Rs.18,411.01)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	18411.01	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	18411.01	\N	71.000	259.31	2026-05-18 22:14:53.896315+00	4974325.65	4992736.66	4974325.65	4992736.66	18411.01	\N
506	16	\N	Credit	Diesel sale | Balance: Rs.4,992,736.66 ΓåÆ Rs.5,013,499.66 (Change Rs.20,763.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	20763.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	20763.00	\N	75.000	276.84	2026-05-18 22:15:19.405807+00	4992736.66	5013499.66	4992736.66	5013499.66	20763.00	\N
507	17	\N	Credit	Petrol sale | Balance: Rs.26,700.45 ΓåÆ Rs.35,776.30 (Change Rs.9,075.85)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9075.85	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9075.85	\N	35.000	259.31	2026-05-18 22:15:56.929516+00	26700.45	35776.30	26700.45	35776.30	9075.85	\N
508	20	\N	Credit	Petrol sale | Balance: Rs.88,687.55 ΓåÆ Rs.95,948.23 (Change Rs.7,260.68)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7260.68	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7260.68	\N	28.000	259.31	2026-05-18 22:16:35.482744+00	88687.55	95948.23	88687.55	95948.23	7260.68	\N
509	22	\N	Credit	Petrol sale | Balance: Rs.2,557,592.26 ΓåÆ Rs.2,570,557.76 (Change Rs.12,965.50)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12965.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12965.50	\N	50.000	259.31	2026-05-18 22:17:26.568031+00	2557592.26	2570557.76	2557592.26	2570557.76	12965.50	\N
510	22	\N	Credit	Diesel sale | Balance: Rs.2,570,557.76 ΓåÆ Rs.2,610,699.56 (Change Rs.40,141.80)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	40141.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	40141.80	\N	145.000	276.84	2026-05-18 22:18:09.301272+00	2570557.76	2610699.56	2570557.76	2610699.56	40141.80	\N
511	24	\N	Credit	Petrol sale | Balance: Rs.9,799,397.61 ΓåÆ Rs.9,805,880.36 (Change Rs.6,482.75)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6482.75	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6482.75	\N	25.000	259.31	2026-05-18 22:18:40.38089+00	9799397.61	9805880.36	9799397.61	9805880.36	6482.75	\N
512	24	\N	Credit	Diesel sale | Balance: Rs.9,805,880.36 ΓåÆ Rs.9,847,129.52 (Change Rs.41,249.16)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	41249.16	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	41249.16	\N	149.000	276.84	2026-05-18 22:19:16.007132+00	9805880.36	9847129.52	9805880.36	9847129.52	41249.16	\N
513	25	\N	Credit	Petrol sale | Balance: Rs.272,937.68 ΓåÆ Rs.289,792.83 (Change Rs.16,855.15)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	16855.15	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16855.15	\N	65.000	259.31	2026-05-18 22:19:59.612863+00	272937.68	289792.83	272937.68	289792.83	16855.15	\N
514	48	\N	Credit	Petrol sale | Balance: Rs.261,159.70 ΓåÆ Rs.264,530.73 (Change Rs.3,371.03)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3371.03	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3371.03	\N	13.000	259.31	2026-05-18 22:21:29.777157+00	261159.70	264530.73	261159.70	264530.73	3371.03	\N
515	49	\N	Credit	Petrol sale | Balance: Rs.138,922.67 ΓåÆ Rs.143,422.67 (Change Rs.4,500.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4500.00	\N	17.350	259.31	2026-05-18 22:22:11.734662+00	138922.67	143422.67	138922.67	143422.67	4500.00	\N
516	50	\N	Credit	Petrol sale | Balance: Rs.186,943.35 ΓåÆ Rs.195,145.35 (Change Rs.8,202.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8202.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8202.00	\N	31.630	259.31	2026-05-18 22:22:51.861678+00	186943.35	195145.35	186943.35	195145.35	8202.00	\N
517	15	\N	Credit	Diesel sale | Balance: Rs.152,202.00 ΓåÆ Rs.164,659.80 (Change Rs.12,457.80)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	12457.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12457.80	\N	45.000	276.84	2026-05-18 22:23:53.212486+00	152202.00	164659.80	152202.00	164659.80	12457.80	\N
519	19	\N	Credit	Diesel sale | Balance: Rs.700,550.50 ΓåÆ Rs.717,160.90 (Change Rs.16,610.40)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-18 22:25:19.788147+00	700550.50	717160.90	700550.50	717160.90	16610.40	\N
520	55	\N	Credit	Petrol sale | Balance: Rs.33,000.30 ΓåÆ Rs.34,000.30 (Change Rs.1,000.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-18 22:26:03.121365+00	33000.30	34000.30	33000.30	34000.30	1000.00	\N
521	33	\N	Credit	Petrol sale | Balance: Rs.124,062.00 ΓåÆ Rs.125,062.00 (Change Rs.1,000.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-18 22:26:44.342895+00	124062.00	125062.00	124062.00	125062.00	1000.00	\N
522	66	\N	Credit	Petrol sale | Balance: Rs.24,033.00 ΓåÆ Rs.26,703.00 (Change Rs.2,670.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2670.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2670.00	\N	10.300	259.31	2026-05-18 22:27:22.003303+00	24033.00	26703.00	24033.00	26703.00	2670.00	\N
523	46	\N	Credit	Petrol sale | Balance: Rs.53,602.80 ΓåÆ Rs.72,150.80 (Change Rs.18,548.00)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	18548.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	18548.00	\N	71.530	259.31	2026-05-18 22:28:03.241329+00	53602.80	72150.80	53602.80	72150.80	18548.00	\N
524	30	\N	Credit	Petrol sale | Balance: Rs.144,653.33 ΓåÆ Rs.152,432.63 (Change Rs.7,779.30)	2026-02-16 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7779.30	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7779.30	\N	30.000	259.31	2026-05-18 23:49:21.643756+00	144653.33	152432.63	144653.33	152432.63	7779.30	\N
525	65	\N	Credit	Petrol sale | Balance: Rs.105,375.00 ΓåÆ Rs.114,375.00 (Change Rs.9,000.00)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9000.00	\N	34.710	259.31	2026-05-18 23:50:24.026792+00	105375.00	114375.00	105375.00	114375.00	9000.00	\N
526	43	\N	Credit	Diesel sale | Balance: Rs.185,701.00 ΓåÆ Rs.189,853.60 (Change Rs.4,152.60)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	4152.60	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4152.60	\N	15.000	276.84	2026-05-18 23:55:34.249522+00	185701.00	189853.60	185701.00	189853.60	4152.60	\N
527	12	\N	Credit	Diesel sale | Balance: Rs.527,976.50 ΓåÆ Rs.567,841.46 (Change Rs.39,864.96)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	39864.96	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39864.96	\N	144.000	276.84	2026-05-19 00:17:11.516227+00	527976.50	567841.46	527976.50	567841.46	39864.96	\N
528	13	\N	Credit	Diesel sale | Balance: Rs.835,696.96 ΓåÆ Rs.841,233.76 (Change Rs.5,536.80)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	5536.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5536.80	\N	20.000	276.84	2026-05-19 00:18:26.524433+00	835696.96	841233.76	835696.96	841233.76	5536.80	\N
529	14	\N	Credit	Petrol sale | Balance: Rs.473,200.05 ΓåÆ Rs.480,979.35 (Change Rs.7,779.30)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7779.30	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7779.30	\N	30.000	259.31	2026-05-19 00:20:00.417695+00	473200.05	480979.35	473200.05	480979.35	7779.30	\N
530	16	\N	Credit	Petrol sale | Balance: Rs.5,013,499.66 ΓåÆ Rs.5,019,982.41 (Change Rs.6,482.75)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6482.75	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6482.75	\N	25.000	259.31	2026-05-19 00:25:58.656417+00	5013499.66	5019982.41	5013499.66	5019982.41	6482.75	\N
531	16	\N	Credit	Petrol sale | Balance: Rs.5,019,982.41 ΓåÆ Rs.5,029,058.26 (Change Rs.9,075.85)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9075.85	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9075.85	\N	35.000	259.31	2026-05-19 00:26:43.088125+00	5019982.41	5029058.26	5019982.41	5029058.26	9075.85	\N
532	29	\N	Credit	Diesel sale | Balance: Rs.426,836.53 ΓåÆ Rs.441,232.21 (Change Rs.14,395.68)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	14395.68	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14395.68	\N	52.000	276.84	2026-05-19 00:28:10.353503+00	426836.53	441232.21	426836.53	441232.21	14395.68	\N
533	21	\N	Credit	Petrol sale | Balance: Rs.144,431.33 ΓåÆ Rs.149,617.53 (Change Rs.5,186.20)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 00:29:07.240387+00	144431.33	149617.53	144431.33	149617.53	5186.20	\N
534	23	\N	Credit	Diesel sale | Balance: Rs.522,237.40 ΓåÆ Rs.543,554.08 (Change Rs.21,316.68)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	21316.68	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	21316.68	\N	77.000	276.84	2026-05-19 00:30:22.756815+00	522237.40	543554.08	522237.40	543554.08	21316.68	\N
535	22	\N	Credit	Petrol sale | Balance: Rs.2,610,699.56 ΓåÆ Rs.2,614,070.59 (Change Rs.3,371.03)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3371.03	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3371.03	\N	13.000	259.31	2026-05-19 00:31:26.64093+00	2610699.56	2614070.59	2610699.56	2614070.59	3371.03	\N
536	22	\N	Credit	Diesel sale | Balance: Rs.2,614,070.59 ΓåÆ Rs.2,640,924.07 (Change Rs.26,853.48)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	26853.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26853.48	\N	97.000	276.84	2026-05-19 00:32:19.99658+00	2614070.59	2640924.07	2614070.59	2640924.07	26853.48	\N
537	24	\N	Credit	Petrol sale | Balance: Rs.9,847,129.52 ΓåÆ Rs.9,852,315.72 (Change Rs.5,186.20)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 00:33:02.116778+00	9847129.52	9852315.72	9847129.52	9852315.72	5186.20	\N
539	30	\N	Credit	Petrol sale | Balance: Rs.152,432.63 ΓåÆ Rs.161,508.48 (Change Rs.9,075.85)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9075.85	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9075.85	\N	35.000	259.31	2026-05-19 00:34:36.198534+00	152432.63	161508.48	152432.63	161508.48	9075.85	\N
540	30	\N	Credit	Diesel sale | Balance: Rs.161,508.48 ΓåÆ Rs.168,152.64 (Change Rs.6,644.16)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	6644.16	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6644.16	\N	24.000	276.84	2026-05-19 00:35:09.482608+00	161508.48	168152.64	161508.48	168152.64	6644.16	\N
541	48	\N	Credit	Petrol sale | Balance: Rs.264,530.73 ΓåÆ Rs.268,939.00 (Change Rs.4,408.27)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4408.27	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4408.27	\N	17.000	259.31	2026-05-19 00:35:47.828711+00	264530.73	268939.00	264530.73	268939.00	4408.27	\N
542	32	\N	Credit	Diesel sale | Balance: Rs.112,381.50 ΓåÆ Rs.233,637.42 (Change Rs.121,255.92)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	121255.92	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	121255.92	\N	438.000	276.84	2026-05-19 00:36:11.870804+00	112381.50	233637.42	112381.50	233637.42	121255.92	\N
543	52	\N	Credit	Petrol sale | Balance: Rs.161,569.00 ΓåÆ Rs.176,709.00 (Change Rs.15,140.00)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	15140.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	15140.00	\N	58.390	259.31	2026-05-19 00:37:15.243526+00	161569.00	176709.00	161569.00	176709.00	15140.00	\N
544	55	\N	Credit	Petrol sale | Balance: Rs.34,000.30 ΓåÆ Rs.35,000.30 (Change Rs.1,000.00)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-19 00:42:24.322902+00	34000.30	35000.30	34000.30	35000.30	1000.00	\N
545	33	\N	Credit	Petrol sale | Balance: Rs.125,062.00 ΓåÆ Rs.141,805.00 (Change Rs.16,743.00)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	16743.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16743.00	\N	64.570	259.31	2026-05-19 00:43:01.122069+00	125062.00	141805.00	125062.00	141805.00	16743.00	\N
547	41	\N	Credit	Petrol sale - nawaz | Balance: Rs.231,946.97 ΓåÆ Rs.233,243.52 (Change Rs.1,296.55)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1296.55	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1296.55	\N	5.000	259.31	2026-05-19 00:44:23.9233+00	231946.97	233243.52	231946.97	233243.52	1296.55	\N
548	24	\N	Credit	Diesel sale | Balance: Rs.9,878,246.72 ΓåÆ Rs.9,905,930.72 (Change Rs.27,684.00)	2026-02-17 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	27684.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	27684.00	\N	100.000	276.84	2026-05-19 00:47:19.670638+00	9878246.72	9905930.72	9878246.72	9905930.72	27684.00	\N
549	28	\N	Credit	Petrol sale | Balance: Rs.292,562.90 ΓåÆ Rs.294,896.69 (Change Rs.2,333.79)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2333.79	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2333.79	\N	9.000	259.31	2026-05-19 00:47:59.921912+00	292562.90	294896.69	292562.90	294896.69	2333.79	\N
550	16	\N	Credit	Petrol sale | Balance: Rs.5,029,058.26 ΓåÆ Rs.5,037,356.18 (Change Rs.8,297.92)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8297.92	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8297.92	\N	32.000	259.31	2026-05-19 00:48:31.308487+00	5029058.26	5037356.18	5029058.26	5037356.18	8297.92	\N
551	16	\N	Credit	Petrol sale | Balance: Rs.5,037,356.18 ΓåÆ Rs.5,040,986.52 (Change Rs.3,630.34)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3630.34	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3630.34	\N	14.000	259.31	2026-05-19 00:48:53.524129+00	5037356.18	5040986.52	5037356.18	5040986.52	3630.34	\N
552	18	\N	Credit	Diesel sale | Balance: Rs.595,495.00 ΓåÆ Rs.611,274.88 (Change Rs.15,779.88)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	15779.88	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	15779.88	\N	57.000	276.84	2026-05-19 00:49:18.52381+00	595495.00	611274.88	595495.00	611274.88	15779.88	\N
553	34	\N	Credit	Petrol sale | Balance: Rs.8,498.00 ΓåÆ Rs.17,573.85 (Change Rs.9,075.85)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9075.85	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9075.85	\N	35.000	259.31	2026-05-19 00:49:42.720081+00	8498.00	17573.85	8498.00	17573.85	9075.85	\N
554	23	\N	Credit	Diesel sale | Balance: Rs.543,554.08 ΓåÆ Rs.562,656.04 (Change Rs.19,101.96)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	19101.96	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19101.96	\N	69.000	276.84	2026-05-19 00:50:25.081471+00	543554.08	562656.04	543554.08	562656.04	19101.96	\N
555	22	\N	Credit	Petrol sale | Balance: Rs.2,640,924.07 ΓåÆ Rs.2,648,703.37 (Change Rs.7,779.30)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7779.30	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7779.30	\N	30.000	259.31	2026-05-19 00:50:45.14254+00	2640924.07	2648703.37	2640924.07	2648703.37	7779.30	\N
556	22	\N	Credit	Diesel sale | Balance: Rs.2,648,703.37 ΓåÆ Rs.2,717,913.37 (Change Rs.69,210.00)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	69210.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	69210.00	\N	250.000	276.84	2026-05-19 00:51:06.497118+00	2648703.37	2717913.37	2648703.37	2717913.37	69210.00	\N
557	24	\N	Credit	Petrol sale | Balance: Rs.9,905,930.72 ΓåÆ Rs.9,924,601.04 (Change Rs.18,670.32)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	18670.32	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	18670.32	\N	72.000	259.31	2026-05-19 00:51:34.053468+00	9905930.72	9924601.04	9905930.72	9924601.04	18670.32	\N
558	24	\N	Credit	Diesel sale | Balance: Rs.9,924,601.04 ΓåÆ Rs.9,956,991.32 (Change Rs.32,390.28)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	32390.28	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	32390.28	\N	117.000	276.84	2026-05-19 00:51:52.973199+00	9924601.04	9956991.32	9924601.04	9956991.32	32390.28	\N
559	30	\N	Credit	Petrol sale | Balance: Rs.168,152.64 ΓåÆ Rs.170,486.43 (Change Rs.2,333.79)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2333.79	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2333.79	\N	9.000	259.31	2026-05-19 00:52:21.785435+00	168152.64	170486.43	168152.64	170486.43	2333.79	\N
560	48	\N	Credit	Petrol sale | Balance: Rs.268,939.00 ΓåÆ Rs.280,607.95 (Change Rs.11,668.95)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	11668.95	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11668.95	\N	45.000	259.31	2026-05-19 00:53:02.214136+00	268939.00	280607.95	268939.00	280607.95	11668.95	\N
561	55	\N	Credit	Petrol sale | Balance: Rs.35,000.30 ΓåÆ Rs.36,000.30 (Change Rs.1,000.00)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-19 00:53:31.403746+00	35000.30	36000.30	35000.30	36000.30	1000.00	\N
562	15	\N	Credit	Diesel sale | Balance: Rs.164,659.80 ΓåÆ Rs.171,580.80 (Change Rs.6,921.00)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	6921.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6921.00	\N	25.000	276.84	2026-05-19 00:54:00.7043+00	164659.80	171580.80	164659.80	171580.80	6921.00	\N
563	33	\N	Credit	Petrol sale | Balance: Rs.141,805.00 ΓåÆ Rs.152,585.00 (Change Rs.10,780.00)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10780.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10780.00	\N	41.570	259.31	2026-05-19 00:54:58.444537+00	141805.00	152585.00	141805.00	152585.00	10780.00	\N
564	41	\N	Credit	Petrol sale - khalid butt | Balance: Rs.233,243.52 ΓåÆ Rs.239,243.52 (Change Rs.6,000.00)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6000.00	\N	23.140	259.31	2026-05-19 00:55:54.755933+00	233243.52	239243.52	233243.52	239243.52	6000.00	\N
565	9	\N	Credit	Petrol sale - waqas | Balance: Rs.102,686.00 ΓåÆ Rs.105,686.00 (Change Rs.3,000.00)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3000.00	\N	11.570	259.31	2026-05-19 00:58:52.75282+00	102686.00	105686.00	102686.00	105686.00	3000.00	\N
566	12	\N	Credit	Diesel sale | Balance: Rs.567,841.46 ΓåÆ Rs.574,208.78 (Change Rs.6,367.32)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	6367.32	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6367.32	\N	23.000	276.84	2026-05-19 00:59:19.588198+00	567841.46	574208.78	567841.46	574208.78	6367.32	\N
567	16	\N	Credit	Petrol sale | Balance: Rs.5,040,986.52 ΓåÆ Rs.5,043,061.00 (Change Rs.2,074.48)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2074.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2074.48	\N	8.000	259.31	2026-05-19 00:59:44.20595+00	5040986.52	5043061.00	5040986.52	5043061.00	2074.48	\N
568	16	\N	Credit	Petrol sale | Balance: Rs.5,043,061.00 ΓåÆ Rs.5,057,323.05 (Change Rs.14,262.05)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	14262.05	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14262.05	\N	55.000	259.31	2026-05-19 01:00:06.796744+00	5043061.00	5057323.05	5043061.00	5057323.05	14262.05	\N
569	16	\N	Credit	Diesel sale | Balance: Rs.5,057,323.05 ΓåÆ Rs.5,073,933.45 (Change Rs.16,610.40)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-19 01:00:29.161744+00	5057323.05	5073933.45	5057323.05	5073933.45	16610.40	\N
570	22	\N	Credit	Petrol sale | Balance: Rs.2,717,913.37 ΓåÆ Rs.2,720,506.47 (Change Rs.2,593.10)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2593.10	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2593.10	\N	10.000	259.31	2026-05-19 01:00:57.423895+00	2717913.37	2720506.47	2717913.37	2720506.47	2593.10	\N
571	22	\N	Credit	Diesel sale | Balance: Rs.2,720,506.47 ΓåÆ Rs.2,737,116.87 (Change Rs.16,610.40)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-19 01:01:20.658623+00	2720506.47	2737116.87	2720506.47	2737116.87	16610.40	\N
572	24	\N	Credit	Petrol sale | Balance: Rs.9,956,991.32 ΓåÆ Rs.9,962,177.52 (Change Rs.5,186.20)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 01:01:43.633396+00	9956991.32	9962177.52	9956991.32	9962177.52	5186.20	\N
573	24	\N	Credit	Diesel sale | Balance: Rs.9,962,177.52 ΓåÆ Rs.10,006,471.92 (Change Rs.44,294.40)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	44294.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	44294.40	\N	160.000	276.84	2026-05-19 01:02:05.314677+00	9962177.52	10006471.92	9962177.52	10006471.92	44294.40	\N
574	30	\N	Credit	Petrol sale | Balance: Rs.170,486.43 ΓåÆ Rs.175,672.63 (Change Rs.5,186.20)	2026-02-18 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 01:02:35.747845+00	170486.43	175672.63	170486.43	175672.63	5186.20	\N
575	30	\N	Credit	Diesel sale | Balance: Rs.175,672.63 ΓåÆ Rs.177,056.83 (Change Rs.1,384.20)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	1384.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1384.20	\N	5.000	276.84	2026-05-19 01:03:03.756363+00	175672.63	177056.83	175672.63	177056.83	1384.20	\N
576	48	\N	Credit	Petrol sale | Balance: Rs.280,607.95 ΓåÆ Rs.282,682.43 (Change Rs.2,074.48)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2074.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2074.48	\N	8.000	259.31	2026-05-19 01:03:23.458813+00	280607.95	282682.43	280607.95	282682.43	2074.48	\N
577	50	\N	Credit	Petrol sale | Balance: Rs.195,145.35 ΓåÆ Rs.202,925.35 (Change Rs.7,780.00)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7780.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7780.00	\N	30.000	259.31	2026-05-19 01:03:46.178603+00	195145.35	202925.35	195145.35	202925.35	7780.00	\N
578	54	\N	Credit	Petrol sale | Balance: Rs.140,000.00 ΓåÆ Rs.143,500.00 (Change Rs.3,500.00)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3500.00	\N	13.500	259.31	2026-05-19 01:04:40.576967+00	140000.00	143500.00	140000.00	143500.00	3500.00	\N
580	55	\N	Credit	Petrol sale | Balance: Rs.36,000.30 ΓåÆ Rs.37,000.30 (Change Rs.1,000.00)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-19 01:05:17.354352+00	36000.30	37000.30	36000.30	37000.30	1000.00	\N
581	33	\N	Credit	Petrol sale | Balance: Rs.152,585.00 ΓåÆ Rs.153,085.00 (Change Rs.500.00)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	500.00	\N	1.930	259.31	2026-05-19 01:05:44.268289+00	152585.00	153085.00	152585.00	153085.00	500.00	\N
582	46	\N	Credit	Petrol sale - wahab | Balance: Rs.72,150.80 ΓåÆ Rs.80,707.80 (Change Rs.8,557.00)	2026-02-19 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8557.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8557.00	\N	33.000	259.31	2026-05-19 01:06:19.345022+00	72150.80	80707.80	72150.80	80707.80	8557.00	\N
583	13	\N	Credit	Diesel sale | Balance: Rs.841,233.76 ΓåÆ Rs.871,686.16 (Change Rs.30,452.40)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	30452.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	30452.40	\N	110.000	276.84	2026-05-19 01:08:56.636167+00	841233.76	871686.16	841233.76	871686.16	30452.40	\N
584	16	\N	Credit	Petrol sale | Balance: Rs.5,073,933.45 ΓåÆ Rs.5,082,231.37 (Change Rs.8,297.92)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8297.92	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8297.92	\N	32.000	259.31	2026-05-19 01:09:22.296172+00	5073933.45	5082231.37	5073933.45	5082231.37	8297.92	\N
585	16	\N	Credit	Petrol sale | Balance: Rs.5,082,231.37 ΓåÆ Rs.5,110,755.47 (Change Rs.28,524.10)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	28524.10	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	28524.10	\N	110.000	259.31	2026-05-19 01:10:02.380336+00	5082231.37	5110755.47	5082231.37	5110755.47	28524.10	\N
586	21	\N	Credit	Petrol sale | Balance: Rs.149,617.53 ΓåÆ Rs.157,396.83 (Change Rs.7,779.30)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7779.30	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7779.30	\N	30.000	259.31	2026-05-19 01:11:36.503182+00	149617.53	157396.83	149617.53	157396.83	7779.30	\N
587	22	\N	Credit	Petrol sale | Balance: Rs.2,737,116.87 ΓåÆ Rs.2,746,192.72 (Change Rs.9,075.85)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9075.85	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9075.85	\N	35.000	259.31	2026-05-19 01:12:19.084663+00	2737116.87	2746192.72	2737116.87	2746192.72	9075.85	\N
588	22	\N	Credit	Diesel sale | Balance: Rs.2,746,192.72 ΓåÆ Rs.2,786,334.52 (Change Rs.40,141.80)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	40141.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	40141.80	\N	145.000	276.84	2026-05-19 01:12:58.161973+00	2746192.72	2786334.52	2746192.72	2786334.52	40141.80	\N
589	24	\N	Credit	Petrol sale | Balance: Rs.10,006,471.92 ΓåÆ Rs.10,046,664.97 (Change Rs.40,193.05)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	40193.05	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	40193.05	\N	155.000	259.31	2026-05-19 01:13:30.570992+00	10006471.92	10046664.97	10006471.92	10046664.97	40193.05	\N
590	24	\N	Credit	Diesel sale | Balance: Rs.10,046,664.97 ΓåÆ Rs.10,068,258.49 (Change Rs.21,593.52)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	21593.52	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	21593.52	\N	78.000	276.84	2026-05-19 01:14:00.88806+00	10046664.97	10068258.49	10046664.97	10068258.49	21593.52	\N
591	30	\N	Credit	Petrol sale | Balance: Rs.177,056.83 ΓåÆ Rs.179,649.93 (Change Rs.2,593.10)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2593.10	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2593.10	\N	10.000	259.31	2026-05-19 01:14:36.847662+00	177056.83	179649.93	177056.83	179649.93	2593.10	\N
592	51	\N	Credit	Petrol sale | Balance: Rs.477,076.00 ΓåÆ Rs.580,800.00 (Change Rs.103,724.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	103724.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	103724.00	\N	400.000	259.31	2026-05-19 01:15:02.459993+00	477076.00	580800.00	477076.00	580800.00	103724.00	\N
593	31	\N	Credit	Diesel sale | Balance: Rs.216,025.80 ΓåÆ Rs.249,523.44 (Change Rs.33,497.64)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	33497.64	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	33497.64	\N	121.000	276.84	2026-05-19 01:15:24.21967+00	216025.80	249523.44	216025.80	249523.44	33497.64	\N
594	55	\N	Credit	Petrol sale | Balance: Rs.37,000.30 ΓåÆ Rs.38,500.30 (Change Rs.1,500.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1500.00	\N	5.780	259.31	2026-05-19 01:15:46.867955+00	37000.30	38500.30	37000.30	38500.30	1500.00	\N
595	33	\N	Credit	Petrol sale | Balance: Rs.153,085.00 ΓåÆ Rs.163,163.00 (Change Rs.10,078.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10078.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10078.00	\N	38.860	259.31	2026-05-19 01:16:12.489274+00	153085.00	163163.00	153085.00	163163.00	10078.00	\N
596	66	\N	Credit	Petrol sale | Balance: Rs.26,703.00 ΓåÆ Rs.33,733.00 (Change Rs.7,030.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7030.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7030.00	\N	27.110	259.31	2026-05-19 01:16:38.632292+00	26703.00	33733.00	26703.00	33733.00	7030.00	\N
597	22	\N	Credit	Petrol sale - nagat cash | Balance: Rs.2,786,334.52 ΓåÆ Rs.3,310,667.52 (Change Rs.524,333.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	524333.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	524333.00	\N	2022.030	259.31	2026-05-19 01:18:37.796287+00	2786334.52	3310667.52	2786334.52	3310667.52	524333.00	\N
598	22	\N	Credit	Petrol sale - katoti | Balance: Rs.3,310,667.52 ΓåÆ Rs.3,338,263.52 (Change Rs.27,596.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	27596.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	27596.00	\N	106.420	259.31	2026-05-19 01:19:16.330387+00	3310667.52	3338263.52	3310667.52	3338263.52	27596.00	\N
599	20	\N	Credit	Petrol sale | Balance: Rs.95,948.23 ΓåÆ Rs.103,468.22 (Change Rs.7,519.99)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7519.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7519.99	\N	29.000	259.31	2026-05-19 01:35:12.09168+00	95948.23	103468.22	95948.23	103468.22	7519.99	\N
600	41	\N	Credit	Petrol sale - habib chicken | Balance: Rs.239,243.52 ΓåÆ Rs.249,593.52 (Change Rs.10,350.00)	2026-02-20 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10350.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10350.00	\N	39.910	259.31	2026-05-19 01:36:09.401834+00	239243.52	249593.52	239243.52	249593.52	10350.00	\N
601	56	\N	Credit	Diesel sale | Balance: Rs.747,903.00 ΓåÆ Rs.872,481.00 (Change Rs.124,578.00)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	124578.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	124578.00	\N	450.000	276.84	2026-05-19 01:37:10.536386+00	747903.00	872481.00	747903.00	872481.00	124578.00	\N
602	16	\N	Credit	Petrol sale | Balance: Rs.5,110,755.47 ΓåÆ Rs.5,123,202.35 (Change Rs.12,446.88)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12446.88	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12446.88	\N	48.000	259.31	2026-05-19 01:38:03.745338+00	5110755.47	5123202.35	5110755.47	5123202.35	12446.88	\N
603	16	\N	Credit	Petrol sale | Balance: Rs.5,123,202.35 ΓåÆ Rs.5,192,178.81 (Change Rs.68,976.46)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	68976.46	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	68976.46	\N	266.000	259.31	2026-05-19 01:38:30.951271+00	5123202.35	5192178.81	5123202.35	5192178.81	68976.46	\N
604	46	\N	Credit	Petrol sale - wahab | Balance: Rs.80,707.80 ΓåÆ Rs.89,783.80 (Change Rs.9,076.00)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	9076.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	9076.00	\N	35.000	259.31	2026-05-19 01:39:15.785914+00	80707.80	89783.80	80707.80	89783.80	9076.00	\N
605	20	\N	Credit	Petrol sale | Balance: Rs.103,468.22 ΓåÆ Rs.104,765.22 (Change Rs.1,297.00)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1297.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1297.00	\N	5.000	259.31	2026-05-19 01:40:02.387123+00	103468.22	104765.22	103468.22	104765.22	1297.00	\N
606	23	\N	Credit	Diesel sale | Balance: Rs.562,656.04 ΓåÆ Rs.584,526.40 (Change Rs.21,870.36)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	21870.36	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	21870.36	\N	79.000	276.84	2026-05-19 01:40:37.749388+00	562656.04	584526.40	562656.04	584526.40	21870.36	\N
607	22	\N	Credit	Diesel sale | Balance: Rs.3,338,263.52 ΓåÆ Rs.3,341,585.60 (Change Rs.3,322.08)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	3322.08	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3322.08	\N	12.000	276.84	2026-05-19 01:42:30.093825+00	3338263.52	3341585.60	3338263.52	3341585.60	3322.08	\N
608	24	\N	Credit	Petrol sale | Balance: Rs.10,068,258.49 ΓåÆ Rs.10,082,779.85 (Change Rs.14,521.36)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	14521.36	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	14521.36	\N	56.000	259.31	2026-05-19 01:42:58.198909+00	10068258.49	10082779.85	10068258.49	10082779.85	14521.36	\N
609	24	\N	Credit	Diesel sale | Balance: Rs.10,082,779.85 ΓåÆ Rs.10,095,237.65 (Change Rs.12,457.80)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	12457.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12457.80	\N	45.000	276.84	2026-05-19 01:43:28.494271+00	10082779.85	10095237.65	10082779.85	10095237.65	12457.80	\N
610	19	\N	Credit	Petrol sale | Balance: Rs.717,160.90 ΓåÆ Rs.722,347.10 (Change Rs.5,186.20)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 01:44:16.956702+00	717160.90	722347.10	717160.90	722347.10	5186.20	\N
611	33	\N	Credit	Petrol sale | Balance: Rs.163,163.00 ΓåÆ Rs.168,316.00 (Change Rs.5,153.00)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5153.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5153.00	\N	19.870	259.31	2026-05-19 01:45:05.768927+00	163163.00	168316.00	163163.00	168316.00	5153.00	\N
612	66	\N	Credit	Petrol sale | Balance: Rs.33,733.00 ΓåÆ Rs.35,733.00 (Change Rs.2,000.00)	2026-02-21 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2000.00	\N	7.710	259.31	2026-05-19 01:45:32.695472+00	33733.00	35733.00	33733.00	35733.00	2000.00	\N
613	16	\N	Credit	Petrol sale | Balance: Rs.5,192,178.81 ΓåÆ Rs.5,196,327.77 (Change Rs.4,148.96)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4148.96	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4148.96	\N	16.000	259.31	2026-05-19 01:47:31.939805+00	5192178.81	5196327.77	5192178.81	5196327.77	4148.96	\N
614	16	\N	Credit	Petrol sale | Balance: Rs.5,196,327.77 ΓåÆ Rs.5,198,142.94 (Change Rs.1,815.17)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1815.17	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1815.17	\N	7.000	259.31	2026-05-19 01:48:01.645833+00	5196327.77	5198142.94	5196327.77	5198142.94	1815.17	\N
615	22	\N	Credit	Petrol sale | Balance: Rs.3,341,585.60 ΓåÆ Rs.3,354,032.48 (Change Rs.12,446.88)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12446.88	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12446.88	\N	48.000	259.31	2026-05-19 01:48:32.024029+00	3341585.60	3354032.48	3341585.60	3354032.48	12446.88	\N
616	24	\N	Credit	Petrol sale | Balance: Rs.10,095,237.65 ΓåÆ Rs.10,106,906.60 (Change Rs.11,668.95)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	11668.95	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11668.95	\N	45.000	259.31	2026-05-19 01:49:01.040135+00	10095237.65	10106906.60	10095237.65	10106906.60	11668.95	\N
617	24	\N	Credit	Diesel sale | Balance: Rs.10,106,906.60 ΓåÆ Rs.10,123,517.00 (Change Rs.16,610.40)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-19 01:49:33.047293+00	10106906.60	10123517.00	10106906.60	10123517.00	16610.40	\N
618	48	\N	Credit	Petrol sale | Balance: Rs.282,682.43 ΓåÆ Rs.287,868.43 (Change Rs.5,186.00)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.00	\N	20.000	259.31	2026-05-19 01:50:10.62619+00	282682.43	287868.43	282682.43	287868.43	5186.00	\N
619	50	\N	Credit	Petrol sale | Balance: Rs.202,925.35 ΓåÆ Rs.209,900.35 (Change Rs.6,975.00)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6975.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6975.00	\N	26.900	259.31	2026-05-19 01:50:42.738933+00	202925.35	209900.35	202925.35	209900.35	6975.00	\N
621	54	\N	Credit	Petrol sale | Balance: Rs.147,000.00 ΓåÆ Rs.148,500.00 (Change Rs.1,500.00)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1500.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1500.00	\N	5.780	259.31	2026-05-19 01:51:44.135933+00	147000.00	148500.00	147000.00	148500.00	1500.00	\N
622	33	\N	Credit	Petrol sale | Balance: Rs.168,316.00 ΓåÆ Rs.174,353.00 (Change Rs.6,037.00)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6037.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6037.00	\N	23.280	259.31	2026-05-19 01:52:32.913575+00	168316.00	174353.00	168316.00	174353.00	6037.00	\N
624	41	\N	Credit	Petrol sale - khalid butt | Balance: Rs.259,593.52 ΓåÆ Rs.269,593.52 (Change Rs.10,000.00)	2026-02-22 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10000.00	\N	38.560	259.31	2026-05-19 01:54:41.530728+00	259593.52	269593.52	259593.52	269593.52	10000.00	\N
625	14	\N	Credit	Petrol sale | Balance: Rs.480,979.35 ΓåÆ Rs.483,831.35 (Change Rs.2,852.00)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2852.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2852.00	\N	11.000	259.31	2026-05-19 11:59:13.631743+00	480979.35	483831.35	480979.35	483831.35	2852.00	\N
626	28	\N	Credit	Petrol sale | Balance: Rs.294,896.69 ΓåÆ Rs.299,564.27 (Change Rs.4,667.58)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4667.58	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4667.58	\N	18.000	259.31	2026-05-19 11:59:58.645655+00	294896.69	299564.27	294896.69	299564.27	4667.58	\N
627	16	\N	Credit	Petrol sale | Balance: Rs.5,198,142.94 ΓåÆ Rs.5,202,027.40 (Change Rs.3,884.46)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3884.46	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3884.46	\N	14.980	259.31	2026-05-19 12:01:43.594553+00	5198142.94	5202027.40	5198142.94	5202027.40	3884.46	\N
628	16	\N	Credit	Petrol sale | Balance: Rs.5,202,027.40 ΓåÆ Rs.5,214,725.81 (Change Rs.12,698.41)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12698.41	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12698.41	\N	48.970	259.31	2026-05-19 12:02:17.848753+00	5202027.40	5214725.81	5202027.40	5214725.81	12698.41	\N
629	18	\N	Credit	Diesel sale | Balance: Rs.611,274.88 ΓåÆ Rs.627,885.28 (Change Rs.16,610.40)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-19 12:03:06.05965+00	611274.88	627885.28	611274.88	627885.28	16610.40	\N
630	18	\N	Credit	Diesel sale | Balance: Rs.611,274.88 ΓåÆ Rs.627,885.28 (Change Rs.16,610.40)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-19 12:03:06.565317+00	611274.88	627885.28	611274.88	627885.28	16610.40	\N
631	22	\N	Credit	Petrol sale | Balance: Rs.3,354,032.48 ΓåÆ Rs.3,370,628.32 (Change Rs.16,595.84)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	16595.84	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16595.84	\N	64.000	259.31	2026-05-19 12:04:19.787168+00	3354032.48	3370628.32	3354032.48	3370628.32	16595.84	\N
632	22	\N	Credit	Diesel sale | Balance: Rs.3,370,628.32 ΓåÆ Rs.3,431,533.12 (Change Rs.60,904.80)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	60904.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	60904.80	\N	220.000	276.84	2026-05-19 12:05:21.983432+00	3370628.32	3431533.12	3370628.32	3431533.12	60904.80	\N
633	24	\N	Credit	Petrol sale | Balance: Rs.10,123,517.00 ΓåÆ Rs.10,126,110.10 (Change Rs.2,593.10)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2593.10	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2593.10	\N	10.000	259.31	2026-05-19 12:06:01.000786+00	10123517.00	10126110.10	10123517.00	10126110.10	2593.10	\N
634	24	\N	Credit	Diesel sale | Balance: Rs.10,126,110.10 ΓåÆ Rs.10,165,421.38 (Change Rs.39,311.28)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	39311.28	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	39311.28	\N	142.000	276.84	2026-05-19 12:06:45.514125+00	10126110.10	10165421.38	10126110.10	10165421.38	39311.28	\N
635	25	\N	Credit	Petrol sale | Balance: Rs.289,792.83 ΓåÆ Rs.296,794.20 (Change Rs.7,001.37)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7001.37	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7001.37	\N	27.000	259.31	2026-05-19 12:07:55.74639+00	289792.83	296794.20	289792.83	296794.20	7001.37	\N
636	30	\N	Credit	Petrol sale | Balance: Rs.179,649.93 ΓåÆ Rs.188,207.16 (Change Rs.8,557.23)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8557.23	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8557.23	\N	33.000	259.31	2026-05-19 12:09:20.480366+00	179649.93	188207.16	179649.93	188207.16	8557.23	\N
637	30	\N	Credit	Diesel sale | Balance: Rs.188,207.16 ΓåÆ Rs.192,359.76 (Change Rs.4,152.60)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	4152.60	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4152.60	\N	15.000	276.84	2026-05-19 12:10:58.230206+00	188207.16	192359.76	188207.16	192359.76	4152.60	\N
638	48	\N	Credit	Petrol sale | Balance: Rs.287,868.43 ΓåÆ Rs.295,907.04 (Change Rs.8,038.61)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8038.61	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8038.61	\N	31.000	259.31	2026-05-19 12:12:01.031041+00	287868.43	295907.04	287868.43	295907.04	8038.61	\N
639	55	\N	Credit	Petrol sale | Balance: Rs.38,500.30 ΓåÆ Rs.39,500.30 (Change Rs.1,000.00)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-19 12:12:31.335317+00	38500.30	39500.30	38500.30	39500.30	1000.00	\N
641	33	\N	Credit	Diesel sale | Balance: Rs.174,353.00 ΓåÆ Rs.191,963.00 (Change Rs.17,610.00)	2026-02-23 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	17610.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	17610.00	\N	63.610	276.84	2026-05-19 12:14:04.95929+00	174353.00	191963.00	174353.00	191963.00	17610.00	\N
644	12	\N	Credit	Diesel sale | Balance: Rs.574,208.78 ΓåÆ Rs.588,050.78 (Change Rs.13,842.00)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	13842.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	13842.00	\N	50.000	276.84	2026-05-19 12:15:22.868734+00	574208.78	588050.78	574208.78	588050.78	13842.00	\N
645	13	\N	Credit	Petrol sale | Balance: Rs.871,686.16 ΓåÆ Rs.872,886.15 (Change Rs.1,199.99)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1199.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1199.99	\N	4.630	259.31	2026-05-19 12:16:07.353055+00	871686.16	872886.15	871686.16	872886.15	1199.99	\N
646	28	\N	Credit	Petrol sale | Balance: Rs.299,564.27 ΓåÆ Rs.306,565.64 (Change Rs.7,001.37)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7001.37	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7001.37	\N	27.000	259.31	2026-05-19 12:17:49.693376+00	299564.27	306565.64	299564.27	306565.64	7001.37	\N
647	16	\N	Credit	Petrol sale | Balance: Rs.5,214,725.81 ΓåÆ Rs.5,220,949.25 (Change Rs.6,223.44)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6223.44	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6223.44	\N	24.000	259.31	2026-05-19 12:18:35.364284+00	5214725.81	5220949.25	5214725.81	5220949.25	6223.44	\N
648	16	\N	Credit	Petrol sale | Balance: Rs.5,220,949.25 ΓåÆ Rs.5,253,881.62 (Change Rs.32,932.37)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	32932.37	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	32932.37	\N	127.000	259.31	2026-05-19 12:19:22.508568+00	5220949.25	5253881.62	5220949.25	5253881.62	32932.37	\N
649	16	\N	Credit	Diesel sale | Balance: Rs.5,253,881.62 ΓåÆ Rs.5,288,486.62 (Change Rs.34,605.00)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	34605.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	34605.00	\N	125.000	276.84	2026-05-19 12:20:04.482335+00	5253881.62	5288486.62	5253881.62	5288486.62	34605.00	\N
650	21	\N	Credit	Petrol sale | Balance: Rs.157,396.83 ΓåÆ Rs.162,583.03 (Change Rs.5,186.20)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 12:20:47.520535+00	157396.83	162583.03	157396.83	162583.03	5186.20	\N
651	22	\N	Credit	Petrol sale | Balance: Rs.3,431,533.12 ΓåÆ Rs.3,436,719.32 (Change Rs.5,186.20)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	5186.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	5186.20	\N	20.000	259.31	2026-05-19 12:21:47.049419+00	3431533.12	3436719.32	3431533.12	3436719.32	5186.20	\N
652	24	\N	Credit	Petrol sale | Balance: Rs.10,165,421.38 ΓåÆ Rs.10,175,793.78 (Change Rs.10,372.40)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10372.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10372.40	\N	40.000	259.31	2026-05-19 12:23:03.719258+00	10165421.38	10175793.78	10165421.38	10175793.78	10372.40	\N
653	30	\N	Credit	Diesel sale | Balance: Rs.192,359.76 ΓåÆ Rs.195,681.84 (Change Rs.3,322.08)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	3322.08	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3322.08	\N	12.000	276.84	2026-05-19 12:23:58.376895+00	192359.76	195681.84	192359.76	195681.84	3322.08	\N
654	48	\N	Credit	Petrol sale | Balance: Rs.295,907.04 ΓåÆ Rs.300,315.03 (Change Rs.4,407.99)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	4407.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4407.99	\N	17.000	259.31	2026-05-19 12:24:45.954019+00	295907.04	300315.03	295907.04	300315.03	4407.99	\N
655	50	\N	Credit	Petrol sale | Balance: Rs.209,900.35 ΓåÆ Rs.217,680.35 (Change Rs.7,780.00)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7780.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7780.00	\N	30.000	259.31	2026-05-19 12:25:22.787354+00	209900.35	217680.35	209900.35	217680.35	7780.00	\N
657	32	\N	Credit	Diesel sale | Balance: Rs.233,637.42 ΓåÆ Rs.802,543.62 (Change Rs.568,906.20)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	568906.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	568906.20	\N	2055.000	276.84	2026-05-19 12:26:27.332781+00	233637.42	802543.62	233637.42	802543.62	568906.20	\N
661	52	\N	Credit	Petrol sale | Balance: Rs.176,709.00 ΓåÆ Rs.187,308.99 (Change Rs.10,599.99)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	10599.99	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	10599.99	\N	40.880	259.31	2026-05-19 12:30:11.767353+00	176709.00	187308.99	176709.00	187308.99	10599.99	\N
662	19	\N	Credit	Petrol sale | Balance: Rs.722,347.10 ΓåÆ Rs.724,162.10 (Change Rs.1,815.00)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1815.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1815.00	\N	7.000	259.31	2026-05-19 12:30:53.632808+00	722347.10	724162.10	722347.10	724162.10	1815.00	\N
663	15	\N	Credit	Petrol sale | Balance: Rs.171,580.80 ΓåÆ Rs.183,654.80 (Change Rs.12,074.00)	2026-02-24 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12074.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12074.00	\N	46.560	259.31	2026-05-19 12:31:49.081553+00	171580.80	183654.80	171580.80	183654.80	12074.00	\N
682	28	\N	Credit	Petrol sale | Balance: Rs.311,233.22 ΓåÆ Rs.313,567.01 (Change Rs.2,333.79)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2333.79	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2333.79	\N	9.000	259.31	2026-05-19 12:57:36.410463+00	311233.22	313567.01	311233.22	313567.01	2333.79	\N
684	16	\N	Credit	Petrol sale | Balance: Rs.5,322,981.46 ΓåÆ Rs.5,325,055.94 (Change Rs.2,074.48)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2074.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2074.48	\N	8.000	259.31	2026-05-19 12:59:10.965729+00	5322981.46	5325055.94	5322981.46	5325055.94	2074.48	\N
685	16	\N	Credit	Petrol sale | Balance: Rs.5,325,055.94 ΓåÆ Rs.5,336,722.30 (Change Rs.11,666.36)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	11666.36	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11666.36	\N	44.990	259.31	2026-05-19 13:01:43.181558+00	5325055.94	5336722.30	5325055.94	5336722.30	11666.36	\N
686	16	\N	Credit	Diesel sale | Balance: Rs.5,336,722.30 ΓåÆ Rs.5,353,332.70 (Change Rs.16,610.40)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-19 13:02:44.61673+00	5336722.30	5353332.70	5336722.30	5353332.70	16610.40	\N
687	20	\N	Credit	Petrol sale | Balance: Rs.111,766.59 ΓåÆ Rs.118,767.96 (Change Rs.7,001.37)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7001.37	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7001.37	\N	27.000	259.31	2026-05-19 13:03:29.737988+00	111766.59	118767.96	111766.59	118767.96	7001.37	\N
688	22	\N	Credit	Petrol sale | Balance: Rs.3,574,417.47 ΓåÆ Rs.3,580,900.22 (Change Rs.6,482.75)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	6482.75	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6482.75	\N	25.000	259.31	2026-05-19 13:04:04.762208+00	3574417.47	3580900.22	3574417.47	3580900.22	6482.75	\N
689	22	\N	Credit	Diesel sale | Balance: Rs.3,580,900.22 ΓåÆ Rs.3,632,115.62 (Change Rs.51,215.40)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	51215.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	51215.40	\N	185.000	276.84	2026-05-19 13:04:41.50671+00	3580900.22	3632115.62	3580900.22	3632115.62	51215.40	\N
690	22	\N	Credit	Petrol sale | Balance: Rs.3,632,115.62 ΓåÆ Rs.3,712,115.62 (Change Rs.80,000.00)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	80000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	80000.00	\N	308.510	259.31	2026-05-19 13:05:21.314839+00	3632115.62	3712115.62	3632115.62	3712115.62	80000.00	\N
691	48	\N	Credit	Petrol sale | Balance: Rs.324,430.86 ΓåÆ Rs.340,767.39 (Change Rs.16,336.53)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	16336.53	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16336.53	\N	63.000	259.31	2026-05-19 13:06:05.926963+00	324430.86	340767.39	324430.86	340767.39	16336.53	\N
692	32	\N	Credit	Diesel sale | Balance: Rs.913,279.62 ΓåÆ Rs.1,024,015.62 (Change Rs.110,736.00)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	110736.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	110736.00	\N	400.000	276.84	2026-05-19 13:06:47.472177+00	913279.62	1024015.62	913279.62	1024015.62	110736.00	\N
693	50	\N	Credit	Petrol sale | Balance: Rs.225,459.65 ΓåÆ Rs.233,238.95 (Change Rs.7,779.30)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7779.30	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7779.30	\N	30.000	259.31	2026-05-19 13:07:22.167533+00	225459.65	233238.95	225459.65	233238.95	7779.30	\N
694	55	\N	Credit	Petrol sale | Balance: Rs.41,500.30 ΓåÆ Rs.43,500.30 (Change Rs.2,000.00)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2000.00	\N	7.710	259.31	2026-05-19 13:07:53.404469+00	41500.30	43500.30	41500.30	43500.30	2000.00	\N
695	33	\N	Credit	Diesel sale | Balance: Rs.215,610.00 ΓåÆ Rs.221,647.00 (Change Rs.6,037.00)	2026-02-25 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	6037.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	6037.00	\N	21.810	276.84	2026-05-19 13:08:38.581716+00	215610.00	221647.00	215610.00	221647.00	6037.00	\N
696	43	\N	Credit	Petrol sale - nagat cash | Balance: Rs.189,853.60 ΓåÆ Rs.231,576.60 (Change Rs.41,723.00)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	41723.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	41723.00	\N	160.900	259.31	2026-05-19 23:44:46.102547+00	189853.60	231576.60	189853.60	231576.60	41723.00	\N
697	45	\N	Credit	Petrol sale | Balance: Rs.153,900.56 ΓåÆ Rs.169,459.16 (Change Rs.15,558.60)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	15558.60	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	15558.60	\N	60.000	259.31	2026-05-19 23:46:06.255233+00	153900.56	169459.16	153900.56	169459.16	15558.60	\N
698	16	\N	Credit	Petrol sale | Balance: Rs.5,353,332.70 ΓåÆ Rs.5,354,629.25 (Change Rs.1,296.55)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1296.55	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1296.55	\N	5.000	259.31	2026-05-19 23:47:33.008761+00	5353332.70	5354629.25	5353332.70	5354629.25	1296.55	\N
699	23	\N	Credit	Diesel sale | Balance: Rs.584,526.40 ΓåÆ Rs.606,119.92 (Change Rs.21,593.52)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	21593.52	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	21593.52	\N	78.000	276.84	2026-05-19 23:48:26.7641+00	584526.40	606119.92	584526.40	606119.92	21593.52	\N
700	22	\N	Credit	Petrol sale | Balance: Rs.3,712,115.62 ΓåÆ Rs.3,719,894.92 (Change Rs.7,779.30)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	7779.30	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7779.30	\N	30.000	259.31	2026-05-19 23:49:16.86562+00	3712115.62	3719894.92	3712115.62	3719894.92	7779.30	\N
701	30	\N	Credit	Diesel sale | Balance: Rs.195,681.84 ΓåÆ Rs.197,066.04 (Change Rs.1,384.20)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	1384.20	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1384.20	\N	5.000	276.84	2026-05-19 23:49:48.298365+00	195681.84	197066.04	195681.84	197066.04	1384.20	\N
702	15	\N	Credit	Diesel sale | Balance: Rs.183,654.80 ΓåÆ Rs.186,423.20 (Change Rs.2,768.40)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	2768.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2768.40	\N	10.000	276.84	2026-05-19 23:50:53.30664+00	183654.80	186423.20	183654.80	186423.20	2768.40	\N
703	55	\N	Credit	Petrol sale | Balance: Rs.43,500.30 ΓåÆ Rs.44,500.30 (Change Rs.1,000.00)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-19 23:51:31.30967+00	43500.30	44500.30	43500.30	44500.30	1000.00	\N
704	33	\N	Credit	Petrol sale | Balance: Rs.221,647.00 ΓåÆ Rs.230,453.00 (Change Rs.8,806.00)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8806.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8806.00	\N	33.960	259.31	2026-05-19 23:52:28.947908+00	221647.00	230453.00	221647.00	230453.00	8806.00	\N
705	66	\N	Credit	Petrol sale | Balance: Rs.35,733.00 ΓåÆ Rs.38,613.00 (Change Rs.2,880.00)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	2880.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2880.00	\N	11.110	259.31	2026-05-19 23:53:04.272299+00	35733.00	38613.00	35733.00	38613.00	2880.00	\N
706	46	\N	Credit	Diesel sale - wahab | Balance: Rs.89,783.80 ΓåÆ Rs.109,716.28 (Change Rs.19,932.48)	2026-02-26 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	19932.48	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19932.48	\N	72.000	276.84	2026-05-19 23:54:04.025419+00	89783.80	109716.28	89783.80	109716.28	19932.48	\N
708	16	\N	Credit	Petrol sale | Balance: Rs.5,354,629.25 ΓåÆ Rs.5,383,931.28 (Change Rs.29,302.03)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	29302.03	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	29302.03	\N	113.000	259.31	2026-05-20 00:05:34.705222+00	5354629.25	5383931.28	5354629.25	5383931.28	29302.03	\N
709	16	\N	Credit	Diesel sale | Balance: Rs.5,383,931.28 ΓåÆ Rs.5,410,231.08 (Change Rs.26,299.80)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	26299.80	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	26299.80	\N	95.000	276.84	2026-05-20 00:06:31.051162+00	5383931.28	5410231.08	5383931.28	5410231.08	26299.80	\N
710	13	\N	Credit	Diesel sale | Balance: Rs.889,496.55 ΓåÆ Rs.906,106.95 (Change Rs.16,610.40)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	16610.40	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	16610.40	\N	60.000	276.84	2026-05-20 00:07:25.406753+00	889496.55	906106.95	889496.55	906106.95	16610.40	\N
711	22	\N	Credit	Petrol sale | Balance: Rs.3,719,894.92 ΓåÆ Rs.3,732,860.42 (Change Rs.12,965.50)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	12965.50	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	12965.50	\N	50.000	259.31	2026-05-20 00:09:08.80547+00	3719894.92	3732860.42	3719894.92	3732860.42	12965.50	\N
712	22	\N	Credit	Diesel sale | Balance: Rs.3,732,860.42 ΓåÆ Rs.3,789,058.94 (Change Rs.56,198.52)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	56198.52	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	56198.52	\N	203.000	276.84	2026-05-20 00:09:36.116816+00	3732860.42	3789058.94	3732860.42	3789058.94	56198.52	\N
713	25	\N	Credit	Petrol sale | Balance: Rs.296,794.20 ΓåÆ Rs.308,463.15 (Change Rs.11,668.95)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	11668.95	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	11668.95	\N	45.000	259.31	2026-05-20 00:10:03.664963+00	296794.20	308463.15	296794.20	308463.15	11668.95	\N
714	30	\N	Credit	Petrol sale | Balance: Rs.197,066.04 ΓåÆ Rs.205,363.96 (Change Rs.8,297.92)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8297.92	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8297.92	\N	32.000	259.31	2026-05-20 00:10:32.786998+00	197066.04	205363.96	197066.04	205363.96	8297.92	\N
715	31	\N	Credit	Petrol sale | Balance: Rs.249,523.44 ΓåÆ Rs.269,179.44 (Change Rs.19,656.00)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	19656.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	19656.00	\N	75.800	259.31	2026-05-20 00:11:44.024178+00	249523.44	269179.44	249523.44	269179.44	19656.00	\N
716	55	\N	Credit	Petrol sale | Balance: Rs.44,500.30 ΓåÆ Rs.45,500.30 (Change Rs.1,000.00)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	1000.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	1000.00	\N	3.860	259.31	2026-05-20 00:12:22.787877+00	44500.30	45500.30	44500.30	45500.30	1000.00	\N
717	33	\N	Credit	Petrol sale | Balance: Rs.230,453.00 ΓåÆ Rs.238,758.00 (Change Rs.8,305.00)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	8305.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	8305.00	\N	32.030	259.31	2026-05-20 00:13:08.693415+00	230453.00	238758.00	230453.00	238758.00	8305.00	\N
718	41	\N	Credit	Petrol sale - habib chicken | Balance: Rs.269,593.52 ΓåÆ Rs.272,793.52 (Change Rs.3,200.00)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Petrol	\N	\N	3200.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	3200.00	\N	12.340	259.31	2026-05-20 00:13:51.705949+00	269593.52	272793.52	269593.52	272793.52	3200.00	\N
719	12	\N	Credit	Diesel sale | Balance: Rs.588,050.78 ΓåÆ Rs.595,664.78 (Change Rs.7,614.00)	2026-02-27 07:00:00+00	\N	\N	\N	\N	\N	\N	\N	Diesel	\N	\N	7614.00	Credit	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	7614.00	\N	27.500	276.84	2026-05-20 00:17:55.727229+00	588050.78	595664.78	588050.78	595664.78	7614.00	\N
720	84	\N	Advance	Cash Advance: Other | Balance: Rs.24,300.00 ΓåÆ Rs.28,300.00 (Change Rs.4,000.00)	2026-05-20 05:09:30.664416+00	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	10	\N	4000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	4000.00	\N	\N	\N	2026-05-20 05:09:30.664416+00	24300.00	28300.00	24300.00	28300.00	4000.00	\N
721	84	\N	Advance	Cash Advance: Other | Balance: Rs.28,300.00 ΓåÆ Rs.30,300.00 (Change Rs.2,000.00)	2026-05-20 06:01:20.419248+00	\N	\N	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	\N	\N	\N	\N	\N	11	\N	2000.00	\N	\N	ec716434-6cb1-44b1-a14f-ee2eb68143e3	2000.00	\N	\N	\N	2026-05-20 06:01:20.419248+00	28300.00	30300.00	28300.00	30300.00	2000.00	\N
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, email, full_name, role, status, approved_by, approved_at, created_at, company_id) FROM stdin;
6	1286edaf-2c6c-4aa5-a57e-9431e6bb01d1	u0692906@gmail.com	\N	admin	active	db2ed66e-847f-489c-94fb-d0d93d326bb3	2026-04-16 19:36:02.993+00	2026-04-16 19:24:49.166996+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
2	db2ed66e-847f-489c-94fb-d0d93d326bb3	maligillani5@gmail.com	Syed Muhammad Ali Gillani	super_admin	active	\N	\N	2026-04-15 16:07:16.793285+00	ec716434-6cb1-44b1-a14f-ee2eb68143e3
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-04-15 10:00:17
20211116045059	2026-04-15 10:00:17
20211116050929	2026-04-15 10:00:17
20211116051442	2026-04-15 10:00:17
20211116212300	2026-04-15 10:00:17
20211116213355	2026-04-15 10:00:17
20211116213934	2026-04-15 10:00:17
20211116214523	2026-04-15 10:00:17
20211122062447	2026-04-15 10:00:17
20211124070109	2026-04-15 10:00:17
20211202204204	2026-04-15 10:00:17
20211202204605	2026-04-15 10:00:17
20211210212804	2026-04-15 10:00:17
20211228014915	2026-04-15 10:00:17
20220107221237	2026-04-15 10:00:17
20220228202821	2026-04-15 10:00:17
20220312004840	2026-04-15 10:00:17
20220603231003	2026-04-15 10:00:17
20220603232444	2026-04-15 10:00:17
20220615214548	2026-04-15 10:00:17
20220712093339	2026-04-15 10:00:18
20220908172859	2026-04-15 10:00:18
20220916233421	2026-04-15 10:00:18
20230119133233	2026-04-15 10:00:18
20230128025114	2026-04-15 10:00:18
20230128025212	2026-04-15 10:00:18
20230227211149	2026-04-15 10:00:18
20230228184745	2026-04-15 10:00:18
20230308225145	2026-04-15 10:00:18
20230328144023	2026-04-15 10:00:18
20231018144023	2026-04-15 10:00:18
20231204144023	2026-04-15 10:00:18
20231204144024	2026-04-15 10:00:18
20231204144025	2026-04-15 10:00:18
20240108234812	2026-04-15 10:00:18
20240109165339	2026-04-15 10:00:18
20240227174441	2026-04-15 10:00:18
20240311171622	2026-04-15 10:00:18
20240321100241	2026-04-15 10:00:18
20240401105812	2026-04-15 10:00:18
20240418121054	2026-04-15 10:00:18
20240523004032	2026-04-15 10:00:18
20240618124746	2026-04-15 10:00:18
20240801235015	2026-04-15 10:00:18
20240805133720	2026-04-15 10:00:18
20240827160934	2026-04-15 10:00:18
20240919163303	2026-04-15 10:00:18
20240919163305	2026-04-15 10:00:18
20241019105805	2026-04-15 10:00:18
20241030150047	2026-04-15 10:00:18
20241108114728	2026-04-15 10:00:18
20241121104152	2026-04-15 10:00:18
20241130184212	2026-04-15 10:00:18
20241220035512	2026-04-15 10:00:18
20241220123912	2026-04-15 10:00:18
20241224161212	2026-04-15 10:00:18
20250107150512	2026-04-15 10:00:18
20250110162412	2026-04-15 10:00:18
20250123174212	2026-04-15 10:00:18
20250128220012	2026-04-15 10:00:18
20250506224012	2026-04-15 10:00:18
20250523164012	2026-04-15 10:00:18
20250714121412	2026-04-15 10:00:18
20250905041441	2026-04-15 10:00:18
20251103001201	2026-04-15 10:00:18
20251120212548	2026-04-15 10:00:18
20251120215549	2026-04-15 10:00:18
20260218120000	2026-04-15 10:00:18
20260326120000	2026-04-15 10:00:18
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-04-15 09:59:21.702264
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-04-15 09:59:21.741086
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-04-15 09:59:21.743604
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-04-15 09:59:21.765105
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-04-15 09:59:21.776167
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-04-15 09:59:21.778484
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-04-15 09:59:21.781555
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-04-15 09:59:21.785552
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-04-15 09:59:21.787909
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-04-15 09:59:21.792087
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-04-15 09:59:21.794622
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-04-15 09:59:21.798274
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-04-15 09:59:21.802285
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-04-15 09:59:21.804775
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-04-15 09:59:21.808108
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-04-15 09:59:21.828155
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-04-15 09:59:21.830571
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-04-15 09:59:21.83277
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-04-15 09:59:21.835166
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-04-15 09:59:21.839068
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-04-15 09:59:21.841266
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-04-15 09:59:21.845311
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-04-15 09:59:21.857757
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-04-15 09:59:21.864982
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-04-15 09:59:21.867355
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-04-15 09:59:21.869522
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-04-15 09:59:21.872046
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-04-15 09:59:21.873738
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-04-15 09:59:21.875515
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-04-15 09:59:21.877146
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-04-15 09:59:21.879469
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-04-15 09:59:21.881309
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-04-15 09:59:21.883063
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-04-15 09:59:21.88851
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-04-15 09:59:21.890817
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-04-15 09:59:21.892559
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-04-15 09:59:21.894265
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-04-15 09:59:21.896001
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-04-15 09:59:21.898595
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-04-15 09:59:21.906288
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-04-15 09:59:21.908022
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-04-15 09:59:21.90967
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-04-15 09:59:21.911429
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-04-15 09:59:21.913113
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-04-15 09:59:21.914811
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-04-15 09:59:21.917267
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-04-15 09:59:21.925181
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-04-15 09:59:21.927754
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-04-15 09:59:21.929698
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-04-15 09:59:21.943312
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-04-15 09:59:21.946032
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-04-15 09:59:22.623304
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-04-15 09:59:22.624299
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-04-15 09:59:22.632012
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-04-15 09:59:22.633382
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-04-15 09:59:22.634295
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-04-15 09:59:22.640609
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-04-15 09:59:22.642655
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-04-15 09:59:22.637235
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-05-10 12:47:22.44543
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-05-10 12:47:22.462666
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 116, true);


--
-- Name: banks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.banks_id_seq', 6, true);


--
-- Name: cash_advances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cash_advances_id_seq', 11, true);


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cash_deposits_id_seq', 3, true);


--
-- Name: company_repayments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_repayments_id_seq', 1, false);


--
-- Name: company_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_transactions_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 101, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 96, true);


--
-- Name: expense_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_types_id_seq', 1, false);


--
-- Name: member_card_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.member_card_usage_id_seq', 1, false);


--
-- Name: mobil_arrivals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mobil_arrivals_id_seq', 1, false);


--
-- Name: mobil_product_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mobil_product_prices_id_seq', 1, false);


--
-- Name: mobil_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mobil_products_id_seq', 1, false);


--
-- Name: mobil_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mobil_sales_id_seq', 1, false);


--
-- Name: mobil_stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mobil_stock_id_seq', 1, false);


--
-- Name: mobil_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mobil_transactions_id_seq', 1, false);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_history_id_seq', 1, false);


--
-- Name: rent_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rent_payments_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, true);


--
-- Name: shops_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shops_id_seq', 1, false);


--
-- Name: staff_invites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_invites_id_seq', 1, false);


--
-- Name: stock_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_entries_id_seq', 19, true);


--
-- Name: stock_purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_purchases_id_seq', 1, false);


--
-- Name: tanks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tanks_id_seq', 6, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 721, true);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_profiles_id_seq', 14, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: cash_deposits cash_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT cash_deposits_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: customers customers_id_unique_for_fk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_id_unique_for_fk UNIQUE (id);


--
-- Name: expense_categories expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_name_key UNIQUE (name);


--
-- Name: staff_invites staff_invites_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invites
    ADD CONSTRAINT staff_invites_email_key UNIQUE (email);


--
-- Name: staff_invites staff_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invites
    ADD CONSTRAINT staff_invites_pkey PRIMARY KEY (id);


--
-- Name: tanks tanks_fuel_type_company_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_fuel_type_company_unique UNIQUE (company_id, fuel_type);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_banks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banks_active ON public.banks USING btree (is_active);


--
-- Name: idx_cash_advances_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_advances_customer_id ON public.cash_advances USING btree (customer_id);


--
-- Name: idx_cash_advances_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_advances_date ON public.cash_advances USING btree (advance_date DESC);


--
-- Name: idx_cash_deposits_bank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_deposits_bank ON public.cash_deposits USING btree (bank_id);


--
-- Name: idx_cash_deposits_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_deposits_created ON public.cash_deposits USING btree (created_at DESC);


--
-- Name: idx_cash_deposits_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_deposits_date ON public.cash_deposits USING btree (deposit_date DESC);


--
-- Name: idx_staff_invites_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_invites_company ON public.staff_invites USING btree (company_id);


--
-- Name: idx_staff_invites_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_invites_email ON public.staff_invites USING btree (lower(email));


--
-- Name: idx_stock_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_date ON public.stock_entries USING btree (purchase_date DESC);


--
-- Name: idx_stock_entries_fuel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_entries_fuel ON public.stock_entries USING btree (fuel_type);


--
-- Name: idx_tanks_company_fuel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tanks_company_fuel ON public.tanks USING btree (company_id, fuel_type);


--
-- Name: idx_tanks_fuel_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tanks_fuel_type ON public.tanks USING btree (fuel_type);


--
-- Name: idx_transactions_cash_deposit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_cash_deposit_id ON public.transactions USING btree (cash_deposit_id);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);


--
-- Name: idx_transactions_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_customer_id ON public.transactions USING btree (customer_id);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (transaction_type);


--
-- Name: idx_user_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_status ON public.user_profiles USING btree (status);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: banks banks_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: banks banks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: cash_advances cash_advances_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_advances
    ADD CONSTRAINT cash_advances_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: cash_advances cash_advances_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_advances
    ADD CONSTRAINT cash_advances_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: cash_deposits cash_deposits_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT cash_deposits_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: cash_deposits cash_deposits_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT cash_deposits_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: cash_deposits cash_deposits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT cash_deposits_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: companies companies_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: company_repayments company_repayments_b2b_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_repayments
    ADD CONSTRAINT company_repayments_b2b_company_id_fkey FOREIGN KEY (b2b_company_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: company_repayments company_repayments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_repayments
    ADD CONSTRAINT company_repayments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: company_transactions company_transactions_b2b_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_transactions
    ADD CONSTRAINT company_transactions_b2b_company_id_fkey FOREIGN KEY (b2b_company_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: company_transactions company_transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_transactions
    ADD CONSTRAINT company_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: customers customers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: expense_categories expense_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: expense_types expense_types_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_types
    ADD CONSTRAINT expense_types_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: member_card_usage member_card_usage_b2b_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_card_usage
    ADD CONSTRAINT member_card_usage_b2b_company_id_fkey FOREIGN KEY (b2b_company_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: member_card_usage member_card_usage_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_card_usage
    ADD CONSTRAINT member_card_usage_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: mobil_arrivals mobil_arrivals_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobil_arrivals
    ADD CONSTRAINT mobil_arrivals_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: mobil_product_prices mobil_product_prices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobil_product_prices
    ADD CONSTRAINT mobil_product_prices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: mobil_products mobil_products_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobil_products
    ADD CONSTRAINT mobil_products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: mobil_sales mobil_sales_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobil_sales
    ADD CONSTRAINT mobil_sales_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: mobil_stock mobil_stock_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobil_stock
    ADD CONSTRAINT mobil_stock_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: mobil_transactions mobil_transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobil_transactions
    ADD CONSTRAINT mobil_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: price_history price_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: rent_payments rent_payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: settings settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: shops shops_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: staff_invites staff_invites_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invites
    ADD CONSTRAINT staff_invites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: staff_invites staff_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invites
    ADD CONSTRAINT staff_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: stock_entries stock_entries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: stock_purchases stock_purchases_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_purchases
    ADD CONSTRAINT stock_purchases_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: tanks tanks_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT tanks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: transactions transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: transactions transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: user_profiles user_profiles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_advances advances_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY advances_access ON public.cash_advances TO authenticated USING (true);


--
-- Name: banks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

--
-- Name: banks banks_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY banks_compat_all_v2 ON public.banks TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: banks banks_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY banks_read ON public.banks FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: banks banks_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY banks_write ON public.banks TO authenticated USING (public.is_manager_or_above()) WITH CHECK (public.is_manager_or_above());


--
-- Name: cash_advances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_advances ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_advances cash_advances_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_advances_compat_all_v2 ON public.cash_advances TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: cash_deposits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_deposits ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_deposits cash_deposits_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_deposits_compat_all_v2 ON public.cash_deposits TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: company_repayments co_repay_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY co_repay_active ON public.company_repayments TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: company_transactions co_txn_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY co_txn_active ON public.company_transactions TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: company_repayments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_repayments ENABLE ROW LEVEL SECURITY;

--
-- Name: company_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_access ON public.customers TO authenticated USING (true);


--
-- Name: customers customers_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_compat_all_v2 ON public.customers TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: daily_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_reports daily_reports_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_reports_active ON public.daily_reports TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: cash_deposits deposits_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deposits_delete ON public.cash_deposits FOR DELETE TO authenticated USING (public.is_admin_or_above());


--
-- Name: cash_deposits deposits_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deposits_modify ON public.cash_deposits FOR UPDATE TO authenticated USING (public.is_admin_or_above());


--
-- Name: cash_deposits deposits_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deposits_read ON public.cash_deposits FOR SELECT TO authenticated USING (public.is_active_user());


--
-- Name: cash_deposits deposits_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deposits_write ON public.cash_deposits FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_above());


--
-- Name: expense_categories exp_cat_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exp_cat_access ON public.expense_categories TO authenticated USING (true);


--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_types expense_types_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_types_active ON public.expense_types TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: banks isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.banks TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: companies isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.companies TO authenticated USING (((id = public.get_my_company()) OR (owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'super_admin'::text))))));


--
-- Name: customers isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.customers TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: staff_invites isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.staff_invites TO authenticated USING (((company_id = public.get_my_company()) OR (email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'super_admin'::text))))));


--
-- Name: stock_entries isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.stock_entries TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: stock_purchases isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.stock_purchases TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: tanks isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.tanks TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: transactions isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.transactions TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: user_profiles isolation_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY isolation_policy ON public.user_profiles TO authenticated USING ((public.check_is_super_admin() OR (company_id = public.get_my_company())));


--
-- Name: member_card_usage mcu_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mcu_active ON public.member_card_usage TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: member_card_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_card_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_arrivals mobil_arr_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_arr_active ON public.mobil_arrivals TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: mobil_arrivals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_arrivals ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_customers mobil_customers_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_customers_active ON public.mobil_customers TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: mobil_product_prices mobil_prices_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_prices_active ON public.mobil_product_prices TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: mobil_products mobil_prod_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_prod_active ON public.mobil_products TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: mobil_product_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_product_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_products ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_sales mobil_sales_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_sales_active ON public.mobil_sales TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: mobil_stock; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_stock ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_stock mobil_stock_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_stock_active ON public.mobil_stock TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: mobil_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mobil_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: mobil_transactions mobil_transactions_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mobil_transactions_active ON public.mobil_transactions TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: price_history price_history_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY price_history_active ON public.price_history TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: rent_payments rent_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_active ON public.rent_payments TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: rent_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: settings settings_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY settings_access ON public.settings TO authenticated USING (true);


--
-- Name: shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

--
-- Name: shops shops_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shops_active ON public.shops TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: staff_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_invites staff_invites_delete_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_invites_delete_v2 ON public.staff_invites FOR DELETE TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: staff_invites staff_invites_insert_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_invites_insert_v2 ON public.staff_invites FOR INSERT TO authenticated WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: staff_invites staff_invites_select_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_invites_select_v2 ON public.staff_invites FOR SELECT TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()) OR (lower(email) = lower((COALESCE(( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())), ''::character varying))::text))));


--
-- Name: staff_invites staff_invites_update_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_invites_update_v2 ON public.staff_invites FOR UPDATE TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: stock_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_entries stock_entries_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_entries_active ON public.stock_entries TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: stock_entries stock_entries_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_entries_compat_all_v2 ON public.stock_entries TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: stock_purchases stock_purch_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_purch_active ON public.stock_purchases TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: stock_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: tanks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;

--
-- Name: tanks tanks_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tanks_active ON public.tanks TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());


--
-- Name: tanks tanks_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tanks_compat_all_v2 ON public.tanks TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions transactions_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_access ON public.transactions TO authenticated USING (true);


--
-- Name: transactions transactions_compat_all_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transactions_compat_all_v2 ON public.transactions TO authenticated USING ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company()))) WITH CHECK ((public.check_is_super_admin() OR (company_id IS NULL) OR (company_id = public.get_my_company())));


--
-- Name: user_profiles up_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY up_admin_all ON public.user_profiles TO authenticated USING (public.check_is_admin());


--
-- Name: user_profiles up_own_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY up_own_all ON public.user_profiles TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict Cow8ubM6zXfzgkV0tCcTmp99ftALB9wKduujSZBZOKWO2ra5AUQcjmuijC2iE2a

