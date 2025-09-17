--
-- PostgreSQL database dump
--

\restrict fBe281o7Jav6ruPSya2SOXGhdetdBcOwEX6D9VxGXu8xHGSaNKXb6COzxpLs2ry

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

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
-- Name: admin_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.admin_role AS ENUM (
    'admin',
    'superadmin'
);


--
-- Name: can_delete_parameter(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_delete_parameter(param_id character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    lab_count INTEGER;
    demographic_count INTEGER;
    bio_age_count INTEGER;
    penalty_count INTEGER;
BEGIN
    -- Check lab_parameters
    SELECT COUNT(*) INTO lab_count
    FROM lab_parameters lp
    JOIN parameter_master pm ON lp.parameter_name = pm.parameter_key
    WHERE pm.parameter_id = param_id;
    
    -- Check demographic_averages
    SELECT COUNT(*) INTO demographic_count
    FROM demographic_averages
    WHERE parameter_id = param_id;
    
    -- Check bio_age_rules
    SELECT COUNT(*) INTO bio_age_count
    FROM bio_age_rules
    WHERE parameter_id = param_id;
    
    -- Check health_penalty_rules
    SELECT COUNT(*) INTO penalty_count
    FROM health_penalty_rules
    WHERE parameter_id = param_id;
    
    -- Return true only if no references exist
    RETURN (lab_count = 0 AND demographic_count = 0 AND bio_age_count = 0 AND penalty_count = 0);
END;
$$;


--
-- Name: health_index_audit_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.health_index_audit_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO health_index_config_audit(table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), current_user);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO health_index_config_audit(table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO health_index_config_audit(table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), current_user);
    RETURN OLD;
  END IF;
END;
$$;


--
-- Name: prevent_parameter_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_parameter_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT can_delete_parameter(OLD.parameter_id) THEN
        RAISE EXCEPTION 'Cannot delete parameter % (%) because it has associated data in user reports or other tables', 
            OLD.parameter_key, OLD.parameter_id;
    END IF;
    RETURN OLD;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role public.admin_role DEFAULT 'admin'::public.admin_role NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    username character varying(255)
);


--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: batch_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_records (
    id integer NOT NULL,
    batch_id character varying(50),
    row_number integer,
    employee_id character varying(50),
    name character varying(255),
    gender character varying(10),
    email character varying(255),
    phone character varying(20),
    test_date date,
    company_id character varying(50),
    validation_status character varying(20) DEFAULT 'pending'::character varying,
    validation_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parameter_name text,
    parameter_value text,
    date_of_birth date,
    location character varying(255)
);


--
-- Name: batch_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_records_id_seq OWNED BY public.batch_records.id;


--
-- Name: batch_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_uploads (
    id integer NOT NULL,
    batch_id character varying(50) NOT NULL,
    filename character varying(255) NOT NULL,
    uploaded_by character varying(100) NOT NULL,
    total_records integer DEFAULT 0,
    valid_records integer DEFAULT 0,
    error_records integer DEFAULT 0,
    status character varying(20) DEFAULT 'uploaded'::character varying,
    error_details jsonb,
    approved_by character varying(100),
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_path character varying(500)
);


--
-- Name: COLUMN batch_uploads.file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_uploads.file_path IS 'Path to the uploaded Excel file for download';


--
-- Name: batch_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_uploads_id_seq OWNED BY public.batch_uploads.id;


--
-- Name: bio_age_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bio_age_rules (
    id integer NOT NULL,
    parameter_id character varying NOT NULL,
    direction character varying NOT NULL,
    range_start numeric NOT NULL,
    range_end numeric NOT NULL,
    penalty_years integer NOT NULL,
    gender character(1),
    flag_if_extreme boolean DEFAULT false,
    notes text,
    CONSTRAINT bio_age_rules_direction_check CHECK (((direction)::text = ANY (ARRAY[('above'::character varying)::text, ('below'::character varying)::text, ('range'::character varying)::text, ('both'::character varying)::text, ('bmi'::character varying)::text, ('bp'::character varying)::text])))
);


--
-- Name: bio_age_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bio_age_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bio_age_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bio_age_rules_id_seq OWNED BY public.bio_age_rules.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    company_id character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_email character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    employee_count integer
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_year_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_year_employees (
    id integer NOT NULL,
    company_id character varying(50) NOT NULL,
    year integer NOT NULL,
    total_employees integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100)
);


--
-- Name: company_year_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_year_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_year_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_year_employees_id_seq OWNED BY public.company_year_employees.id;


--
-- Name: corporate_action_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporate_action_plans (
    id integer NOT NULL,
    company_id character varying NOT NULL,
    action_plan jsonb NOT NULL,
    generated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    language character varying(5) DEFAULT 'en'::character varying
);


--
-- Name: corporate_action_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.corporate_action_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: corporate_action_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.corporate_action_plans_id_seq OWNED BY public.corporate_action_plans.id;


--
-- Name: corporate_health_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporate_health_metrics (
    id integer NOT NULL,
    company_id character varying(50),
    metric_date date DEFAULT CURRENT_DATE,
    total_employees integer DEFAULT 0,
    employees_tested integer DEFAULT 0,
    employees_consulted integer DEFAULT 0,
    chq_score integer,
    cvd_risk_percentage numeric(5,2),
    diabetes_risk_percentage numeric(5,2),
    hypertension_risk_percentage numeric(5,2),
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: corporate_health_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.corporate_health_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: corporate_health_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.corporate_health_metrics_id_seq OWNED BY public.corporate_health_metrics.id;


--
-- Name: corporate_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporate_users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    company_id character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    is_active boolean DEFAULT true,
    created_by character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: corporate_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.corporate_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: corporate_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.corporate_users_id_seq OWNED BY public.corporate_users.id;


--
-- Name: demographic_averages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demographic_averages (
    id integer NOT NULL,
    company_id character varying(50),
    location character varying(100),
    age_group character varying(20),
    gender character varying(10),
    parameter_key character varying(20),
    average_value numeric(10,3),
    min_value numeric(10,3),
    max_value numeric(10,3),
    sample_size integer,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parameter_id character varying(10) NOT NULL
);


--
-- Name: demographic_averages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.demographic_averages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: demographic_averages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.demographic_averages_id_seq OWNED BY public.demographic_averages.id;


--
-- Name: health_condition_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_condition_rules (
    id integer NOT NULL,
    rule_id character varying NOT NULL,
    rule_name text NOT NULL,
    condition text NOT NULL,
    penalty_points integer NOT NULL
);


--
-- Name: health_condition_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_condition_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_condition_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_condition_rules_id_seq OWNED BY public.health_condition_rules.id;


--
-- Name: health_index_combinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_index_combinations (
    id integer NOT NULL,
    rule_name text NOT NULL,
    members jsonb NOT NULL,
    trigger_type character varying(20) NOT NULL,
    trigger_threshold numeric(4,2),
    combo_max numeric(6,2) NOT NULL,
    scale_by_avg boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT combo_max_positive CHECK ((combo_max >= (0)::numeric)),
    CONSTRAINT health_index_combinations_trigger_type_check CHECK (((trigger_type)::text = ANY ((ARRAY['all_out'::character varying, 'any_two'::character varying, 'avg_dev_ge_t'::character varying])::text[]))),
    CONSTRAINT threshold_range CHECK (((trigger_threshold IS NULL) OR ((trigger_threshold > (0)::numeric) AND (trigger_threshold <= (1)::numeric)))),
    CONSTRAINT threshold_required CHECK (((((trigger_type)::text = 'avg_dev_ge_t'::text) AND (trigger_threshold IS NOT NULL)) OR ((trigger_type)::text <> 'avg_dev_ge_t'::text)))
);


--
-- Name: health_index_combinations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_index_combinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_index_combinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_index_combinations_id_seq OWNED BY public.health_index_combinations.id;


--
-- Name: health_index_config_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_index_config_audit (
    id integer NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id integer NOT NULL,
    action character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by character varying(100) NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: health_index_config_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_index_config_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_index_config_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_index_config_audit_id_seq OWNED BY public.health_index_config_audit.id;


--
-- Name: health_index_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_index_parameters (
    id integer NOT NULL,
    parameter_id character varying NOT NULL,
    include_in_index boolean DEFAULT true NOT NULL,
    direction character varying(20) NOT NULL,
    pmax numeric(6,2) DEFAULT 75 NOT NULL,
    k_full numeric(4,3) DEFAULT 0.25 NOT NULL,
    weight numeric(4,2) DEFAULT 1.0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT health_index_parameters_direction_check CHECK (((direction)::text = ANY ((ARRAY['high_bad'::character varying, 'low_bad'::character varying, 'two_sided'::character varying])::text[]))),
    CONSTRAINT k_full_range CHECK (((k_full > (0)::numeric) AND (k_full <= (1)::numeric))),
    CONSTRAINT pmax_positive CHECK ((pmax >= (0)::numeric)),
    CONSTRAINT weight_positive CHECK ((weight > (0)::numeric))
);


--
-- Name: health_index_parameters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_index_parameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_index_parameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_index_parameters_id_seq OWNED BY public.health_index_parameters.id;


--
-- Name: health_penalty_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_penalty_rules (
    id integer NOT NULL,
    parameter_id character varying,
    direction character varying,
    range_start numeric,
    range_end numeric,
    penalty_points integer NOT NULL,
    CONSTRAINT health_penalty_rules_direction_check CHECK (((direction)::text = ANY (ARRAY[('above'::character varying)::text, ('below'::character varying)::text, ('range'::character varying)::text, ('both'::character varying)::text])))
);


--
-- Name: health_penalty_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_penalty_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_penalty_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_penalty_rules_id_seq OWNED BY public.health_penalty_rules.id;


--
-- Name: health_safety_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_safety_rules (
    id integer NOT NULL,
    rule_id character varying NOT NULL,
    rule_name text NOT NULL,
    condition text NOT NULL,
    action text NOT NULL
);


--
-- Name: health_safety_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_safety_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_safety_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_safety_rules_id_seq OWNED BY public.health_safety_rules.id;


--
-- Name: lab_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_parameters (
    id integer NOT NULL,
    report_id character varying(50),
    parameter_name character varying(100) NOT NULL,
    parameter_value numeric(10,3),
    unit character varying(20),
    reference_min numeric(10,3),
    reference_max numeric(10,3),
    status character varying(20),
    category character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lab_parameters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_parameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_parameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_parameters_id_seq OWNED BY public.lab_parameters.id;


--
-- Name: parameter_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parameter_categories (
    id integer NOT NULL,
    category_key character varying(50) NOT NULL,
    category_name character varying(100) NOT NULL,
    display_order integer DEFAULT 1,
    icon character varying(50),
    color character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    description text,
    updated_at timestamp with time zone,
    category_name_vi character varying(255)
);


--
-- Name: COLUMN parameter_categories.category_name_vi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parameter_categories.category_name_vi IS 'Vietnamese translation of category display name';


--
-- Name: parameter_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parameter_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parameter_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parameter_categories_id_seq OWNED BY public.parameter_categories.id;


--
-- Name: parameter_category_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parameter_category_mappings (
    id integer NOT NULL,
    category_id integer NOT NULL,
    parameter_id character varying(10) NOT NULL,
    display_order integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: parameter_category_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.parameter_category_mappings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.parameter_category_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: parameter_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parameter_master (
    id integer NOT NULL,
    parameter_id character varying(20) NOT NULL,
    parameter_key character varying(100) NOT NULL,
    parameter_text_mapping text NOT NULL,
    parameter_priority integer DEFAULT 1,
    unit character varying(50),
    reference_min numeric(10,3),
    reference_max numeric(10,3),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category_id integer,
    reference_min_male numeric(10,3),
    reference_max_male numeric(10,3),
    reference_min_female numeric(10,3),
    reference_max_female numeric(10,3),
    parameter_key_vi character varying(255)
);


--
-- Name: COLUMN parameter_master.parameter_key_vi; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parameter_master.parameter_key_vi IS 'Vietnamese translation of parameter display name';


--
-- Name: parameter_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parameter_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parameter_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parameter_master_id_seq OWNED BY public.parameter_master.id;


--
-- Name: parameter_usage_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.parameter_usage_status AS
 SELECT pm.parameter_id,
    pm.parameter_key,
    pm.unit,
    pm.parameter_priority,
    count(DISTINCT lp.id) AS lab_records_count,
    count(DISTINCT lp.report_id) AS reports_count,
    count(DISTINCT da.id) AS demographic_records_count,
    public.can_delete_parameter(pm.parameter_id) AS can_delete
   FROM ((public.parameter_master pm
     LEFT JOIN public.lab_parameters lp ON (((pm.parameter_key)::text = (lp.parameter_name)::text)))
     LEFT JOIN public.demographic_averages da ON (((pm.parameter_id)::text = (da.parameter_id)::text)))
  GROUP BY pm.parameter_id, pm.parameter_key, pm.unit, pm.parameter_priority;


--
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_assessments (
    id integer NOT NULL,
    report_id character varying(50),
    risk_type character varying(50) NOT NULL,
    risk_percentage integer,
    risk_level character varying(20),
    timeframe character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    factors jsonb,
    CONSTRAINT risk_assessments_risk_percentage_check CHECK (((risk_percentage >= 0) AND (risk_percentage <= 100)))
);


--
-- Name: risk_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_assessments_id_seq OWNED BY public.risk_assessments.id;


--
-- Name: uhid_sequence; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uhid_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_deletion_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_deletion_audit (
    id integer NOT NULL,
    operation_type character varying(50) NOT NULL,
    company_id character varying(255),
    company_name character varying(255),
    user_id integer,
    user_email character varying(255),
    user_identifier character varying(255),
    deleted_count integer,
    deleted_by_admin_id integer,
    deleted_by_admin_email character varying(255),
    deleted_by_admin_name character varying(255),
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    additional_info jsonb,
    ip_address character varying(45),
    user_agent text
);


--
-- Name: TABLE user_deletion_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_deletion_audit IS 'Audit log for tracking all user deletion operations including bulk company deletions';


--
-- Name: user_deletion_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_deletion_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_deletion_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_deletion_audit_id_seq OWNED BY public.user_deletion_audit.id;


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id integer NOT NULL,
    user_id character varying(50),
    report_id character varying(50) NOT NULL,
    health_score integer,
    biological_age integer,
    test_date date NOT NULL,
    report_status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rule_version character varying(50),
    score_breakdown jsonb,
    CONSTRAINT user_reports_health_score_check CHECK (((health_score >= 0) AND (health_score <= 1000)))
);


--
-- Name: user_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_reports_id_seq OWNED BY public.user_reports.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    user_id character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    company_id character varying(50) NOT NULL,
    password_hash character varying(255),
    first_login boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uhid character varying(50),
    location character varying(100) DEFAULT 'Vietnam'::character varying,
    last_login timestamp without time zone,
    CONSTRAINT users_gender_check CHECK (((gender)::text = ANY (ARRAY[('Male'::character varying)::text, ('Female'::character varying)::text, ('Other'::character varying)::text])))
);


--
-- Name: COLUMN users.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login IS 'Timestamp of last successful login/OTP verification';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: batch_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_records ALTER COLUMN id SET DEFAULT nextval('public.batch_records_id_seq'::regclass);


--
-- Name: batch_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_uploads ALTER COLUMN id SET DEFAULT nextval('public.batch_uploads_id_seq'::regclass);


--
-- Name: bio_age_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bio_age_rules ALTER COLUMN id SET DEFAULT nextval('public.bio_age_rules_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_year_employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_year_employees ALTER COLUMN id SET DEFAULT nextval('public.company_year_employees_id_seq'::regclass);


--
-- Name: corporate_action_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_action_plans ALTER COLUMN id SET DEFAULT nextval('public.corporate_action_plans_id_seq'::regclass);


--
-- Name: corporate_health_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_health_metrics ALTER COLUMN id SET DEFAULT nextval('public.corporate_health_metrics_id_seq'::regclass);


--
-- Name: corporate_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_users ALTER COLUMN id SET DEFAULT nextval('public.corporate_users_id_seq'::regclass);


--
-- Name: demographic_averages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_averages ALTER COLUMN id SET DEFAULT nextval('public.demographic_averages_id_seq'::regclass);


--
-- Name: health_condition_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_condition_rules ALTER COLUMN id SET DEFAULT nextval('public.health_condition_rules_id_seq'::regclass);


--
-- Name: health_index_combinations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_combinations ALTER COLUMN id SET DEFAULT nextval('public.health_index_combinations_id_seq'::regclass);


--
-- Name: health_index_config_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_config_audit ALTER COLUMN id SET DEFAULT nextval('public.health_index_config_audit_id_seq'::regclass);


--
-- Name: health_index_parameters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_parameters ALTER COLUMN id SET DEFAULT nextval('public.health_index_parameters_id_seq'::regclass);


--
-- Name: health_penalty_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_penalty_rules ALTER COLUMN id SET DEFAULT nextval('public.health_penalty_rules_id_seq'::regclass);


--
-- Name: health_safety_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_safety_rules ALTER COLUMN id SET DEFAULT nextval('public.health_safety_rules_id_seq'::regclass);


--
-- Name: lab_parameters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_parameters ALTER COLUMN id SET DEFAULT nextval('public.lab_parameters_id_seq'::regclass);


--
-- Name: parameter_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_categories ALTER COLUMN id SET DEFAULT nextval('public.parameter_categories_id_seq'::regclass);


--
-- Name: parameter_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_master ALTER COLUMN id SET DEFAULT nextval('public.parameter_master_id_seq'::regclass);


--
-- Name: risk_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments ALTER COLUMN id SET DEFAULT nextval('public.risk_assessments_id_seq'::regclass);


--
-- Name: user_deletion_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_deletion_audit ALTER COLUMN id SET DEFAULT nextval('public.user_deletion_audit_id_seq'::regclass);


--
-- Name: user_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports ALTER COLUMN id SET DEFAULT nextval('public.user_reports_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: batch_records batch_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_records
    ADD CONSTRAINT batch_records_pkey PRIMARY KEY (id);


--
-- Name: batch_uploads batch_uploads_batch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_uploads
    ADD CONSTRAINT batch_uploads_batch_id_key UNIQUE (batch_id);


--
-- Name: batch_uploads batch_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_uploads
    ADD CONSTRAINT batch_uploads_pkey PRIMARY KEY (id);


--
-- Name: bio_age_rules bio_age_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bio_age_rules
    ADD CONSTRAINT bio_age_rules_pkey PRIMARY KEY (id);


--
-- Name: companies companies_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_id_key UNIQUE (company_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_year_employees company_year_employees_company_id_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_year_employees
    ADD CONSTRAINT company_year_employees_company_id_year_key UNIQUE (company_id, year);


--
-- Name: company_year_employees company_year_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_year_employees
    ADD CONSTRAINT company_year_employees_pkey PRIMARY KEY (id);


--
-- Name: corporate_action_plans corporate_action_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_action_plans
    ADD CONSTRAINT corporate_action_plans_pkey PRIMARY KEY (id);


--
-- Name: corporate_health_metrics corporate_health_metrics_company_id_metric_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_health_metrics
    ADD CONSTRAINT corporate_health_metrics_company_id_metric_date_key UNIQUE (company_id, metric_date);


--
-- Name: corporate_health_metrics corporate_health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_health_metrics
    ADD CONSTRAINT corporate_health_metrics_pkey PRIMARY KEY (id);


--
-- Name: corporate_users corporate_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_users
    ADD CONSTRAINT corporate_users_email_key UNIQUE (email);


--
-- Name: corporate_users corporate_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_users
    ADD CONSTRAINT corporate_users_pkey PRIMARY KEY (id);


--
-- Name: corporate_users corporate_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_users
    ADD CONSTRAINT corporate_users_username_key UNIQUE (username);


--
-- Name: demographic_averages demographic_averages_company_location_age_gender_param_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_averages
    ADD CONSTRAINT demographic_averages_company_location_age_gender_param_id_key UNIQUE (company_id, location, age_group, gender, parameter_id);


--
-- Name: demographic_averages demographic_averages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_averages
    ADD CONSTRAINT demographic_averages_pkey PRIMARY KEY (id);


--
-- Name: health_condition_rules health_condition_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_condition_rules
    ADD CONSTRAINT health_condition_rules_pkey PRIMARY KEY (id);


--
-- Name: health_condition_rules health_condition_rules_rule_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_condition_rules
    ADD CONSTRAINT health_condition_rules_rule_id_key UNIQUE (rule_id);


--
-- Name: health_index_combinations health_index_combinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_combinations
    ADD CONSTRAINT health_index_combinations_pkey PRIMARY KEY (id);


--
-- Name: health_index_config_audit health_index_config_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_config_audit
    ADD CONSTRAINT health_index_config_audit_pkey PRIMARY KEY (id);


--
-- Name: health_index_parameters health_index_parameters_parameter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_parameters
    ADD CONSTRAINT health_index_parameters_parameter_id_key UNIQUE (parameter_id);


--
-- Name: health_index_parameters health_index_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_parameters
    ADD CONSTRAINT health_index_parameters_pkey PRIMARY KEY (id);


--
-- Name: health_penalty_rules health_penalty_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_penalty_rules
    ADD CONSTRAINT health_penalty_rules_pkey PRIMARY KEY (id);


--
-- Name: health_safety_rules health_safety_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_safety_rules
    ADD CONSTRAINT health_safety_rules_pkey PRIMARY KEY (id);


--
-- Name: health_safety_rules health_safety_rules_rule_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_safety_rules
    ADD CONSTRAINT health_safety_rules_rule_id_key UNIQUE (rule_id);


--
-- Name: lab_parameters lab_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_parameters
    ADD CONSTRAINT lab_parameters_pkey PRIMARY KEY (id);


--
-- Name: parameter_categories parameter_categories_category_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_categories
    ADD CONSTRAINT parameter_categories_category_key_key UNIQUE (category_key);


--
-- Name: parameter_categories parameter_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_categories
    ADD CONSTRAINT parameter_categories_pkey PRIMARY KEY (id);


--
-- Name: parameter_category_mappings parameter_category_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_category_mappings
    ADD CONSTRAINT parameter_category_mappings_pkey PRIMARY KEY (id);


--
-- Name: parameter_master parameter_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_master
    ADD CONSTRAINT parameter_key_unique UNIQUE (parameter_key);


--
-- Name: parameter_master parameter_master_parameter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_master
    ADD CONSTRAINT parameter_master_parameter_id_key UNIQUE (parameter_id);


--
-- Name: parameter_master parameter_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_master
    ADD CONSTRAINT parameter_master_pkey PRIMARY KEY (id);


--
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: batch_records unique_employee_param_per_batch; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_records
    ADD CONSTRAINT unique_employee_param_per_batch UNIQUE (batch_id, employee_id, parameter_name);


--
-- Name: user_deletion_audit user_deletion_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_deletion_audit
    ADD CONSTRAINT user_deletion_audit_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_report_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_report_id_key UNIQUE (report_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_uhid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uhid_key UNIQUE (uhid);


--
-- Name: users users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_id_key UNIQUE (user_id);


--
-- Name: idx_batch_records_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_records_batch_id ON public.batch_records USING btree (batch_id);


--
-- Name: idx_batch_records_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_records_employee_id ON public.batch_records USING btree (employee_id);


--
-- Name: idx_company_year_employees_company_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_year_employees_company_year ON public.company_year_employees USING btree (company_id, year);


--
-- Name: idx_demographic_averages_parameter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demographic_averages_parameter_id ON public.demographic_averages USING btree (parameter_id);


--
-- Name: idx_hi_audit_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hi_audit_changed_at ON public.health_index_config_audit USING btree (changed_at DESC);


--
-- Name: idx_hi_audit_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hi_audit_table_record ON public.health_index_config_audit USING btree (table_name, record_id);


--
-- Name: idx_hi_combos_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hi_combos_active ON public.health_index_combinations USING btree (is_active);


--
-- Name: idx_hi_combos_members_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hi_combos_members_gin ON public.health_index_combinations USING gin (members jsonb_path_ops);


--
-- Name: idx_hi_params_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hi_params_active ON public.health_index_parameters USING btree (is_active, include_in_index);


--
-- Name: idx_hi_params_parameter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hi_params_parameter_id ON public.health_index_parameters USING btree (parameter_id);


--
-- Name: idx_lab_parameters_parameter_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_parameters_parameter_name ON public.lab_parameters USING btree (parameter_name);


--
-- Name: idx_lab_parameters_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_parameters_report_id ON public.lab_parameters USING btree (report_id);


--
-- Name: idx_parameter_master_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parameter_master_key ON public.parameter_master USING btree (parameter_key);


--
-- Name: idx_risk_assessments_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_assessments_report_id ON public.risk_assessments USING btree (report_id);


--
-- Name: idx_user_deletion_audit_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_audit_company_id ON public.user_deletion_audit USING btree (company_id);


--
-- Name: idx_user_deletion_audit_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_audit_deleted_at ON public.user_deletion_audit USING btree (deleted_at);


--
-- Name: idx_user_deletion_audit_deleted_by_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_audit_deleted_by_admin_id ON public.user_deletion_audit USING btree (deleted_by_admin_id);


--
-- Name: idx_user_deletion_audit_operation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_audit_operation_type ON public.user_deletion_audit USING btree (operation_type);


--
-- Name: idx_user_deletion_audit_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_audit_user_id ON public.user_deletion_audit USING btree (user_id);


--
-- Name: idx_user_reports_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_report_id ON public.user_reports USING btree (report_id);


--
-- Name: idx_user_reports_rule_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_rule_version ON public.user_reports USING btree (rule_version);


--
-- Name: idx_user_reports_score_breakdown_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_score_breakdown_gin ON public.user_reports USING gin (score_breakdown jsonb_path_ops);


--
-- Name: idx_user_reports_test_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_test_date ON public.user_reports USING btree (test_date DESC);


--
-- Name: idx_user_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reports_user_id ON public.user_reports USING btree (user_id);


--
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);


--
-- Name: idx_users_company_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_last_login ON public.users USING btree (company_id, last_login) WHERE (last_login IS NOT NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_user_id ON public.users USING btree (user_id);


--
-- Name: health_index_combinations health_index_combinations_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER health_index_combinations_audit AFTER INSERT OR DELETE OR UPDATE ON public.health_index_combinations FOR EACH ROW EXECUTE FUNCTION public.health_index_audit_trigger();


--
-- Name: health_index_parameters health_index_parameters_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER health_index_parameters_audit AFTER INSERT OR DELETE OR UPDATE ON public.health_index_parameters FOR EACH ROW EXECUTE FUNCTION public.health_index_audit_trigger();


--
-- Name: parameter_master prevent_parameter_deletion_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_parameter_deletion_trigger BEFORE DELETE ON public.parameter_master FOR EACH ROW EXECUTE FUNCTION public.prevent_parameter_deletion();


--
-- Name: company_year_employees update_company_year_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_year_employees_updated_at BEFORE UPDATE ON public.company_year_employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: health_index_combinations update_health_index_combinations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_health_index_combinations_updated_at BEFORE UPDATE ON public.health_index_combinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: health_index_parameters update_health_index_parameters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_health_index_parameters_updated_at BEFORE UPDATE ON public.health_index_parameters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: batch_records batch_records_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_records
    ADD CONSTRAINT batch_records_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_uploads(batch_id);


--
-- Name: bio_age_rules bio_age_rules_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bio_age_rules
    ADD CONSTRAINT bio_age_rules_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.parameter_master(parameter_id) ON DELETE CASCADE;


--
-- Name: company_year_employees company_year_employees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_year_employees
    ADD CONSTRAINT company_year_employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id) ON DELETE CASCADE;


--
-- Name: corporate_health_metrics corporate_health_metrics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_health_metrics
    ADD CONSTRAINT corporate_health_metrics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: corporate_users corporate_users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_users
    ADD CONSTRAINT corporate_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: demographic_averages demographic_averages_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_averages
    ADD CONSTRAINT demographic_averages_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.parameter_master(parameter_id) ON UPDATE CASCADE;


--
-- Name: health_index_parameters health_index_parameters_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_index_parameters
    ADD CONSTRAINT health_index_parameters_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.parameter_master(parameter_id) ON DELETE CASCADE;


--
-- Name: health_penalty_rules health_penalty_rules_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_penalty_rules
    ADD CONSTRAINT health_penalty_rules_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.parameter_master(parameter_id);


--
-- Name: lab_parameters lab_parameters_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_parameters
    ADD CONSTRAINT lab_parameters_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.user_reports(report_id);


--
-- Name: parameter_master parameter_master_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parameter_master
    ADD CONSTRAINT parameter_master_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.parameter_categories(id);


--
-- Name: risk_assessments risk_assessments_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.user_reports(report_id);


--
-- Name: user_reports user_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict fBe281o7Jav6ruPSya2SOXGhdetdBcOwEX6D9VxGXu8xHGSaNKXb6COzxpLs2ry


-- =====================================================
-- SEED DATA (Essential for system operation)
-- =====================================================

-- Insert companies
INSERT INTO companies (company_id, company_name, contact_email, employee_count) VALUES
('CUG1', 'Insmart Vietnam', 'hr@insmart.vn', 500),
('DEMO001', 'Demo Corporation', 'hr@democorp.com', 100),
('TEST001', 'Test Industries', 'admin@testind.com', 50)
ON CONFLICT (company_id) DO NOTHING;

-- Insert admin users (password: 'admin123')
-- NOTE: admin_users uses 'password' column, not 'password_hash'
INSERT INTO admin_users (name, email, username, password, role) VALUES
('System Admin', 'admin@system.com', 'admin', '$2b$10$8K1p/rPx.yP4ZgFYvLKEd.LqCqEbh5XnDx4YBQv5hb2yYBzAqmGCi', 'superadmin'),
('Demo Admin', 'demo@admin.com', 'demoadmin', '$2b$10$8K1p/rPx.yP4ZgFYvLKEd.LqCqEbh5XnDx4YBQv5hb2yYBzAqmGCi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert corporate users (password: 'corp123')
-- NOTE: corporate_users uses 'password_hash' column
INSERT INTO corporate_users (username, password_hash, company_id, company_name, full_name, email, phone, created_by) VALUES
('insmart_hr', '$2b$10$8K1p/rPx.yP4ZgFYvLKEd.LqCqEbh5XnDx4YBQv5hb2yYBzAqmGCi', 'CUG1', 'Insmart Vietnam', 'Insmart HR Manager', 'hr@insmart.vn', '0123456789', 'System'),
('demo_hr', '$2b$10$8K1p/rPx.yP4ZgFYvLKEd.LqCqEbh5XnDx4YBQv5hb2yYBzAqmGCi', 'DEMO001', 'Demo Corporation', 'Demo HR Manager', 'hr@democorp.com', '0987654321', 'System')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 1. This schema is EXACT copy from production AWS database
-- 2. admin_users table uses 'password' column (not password_hash)
-- 3. corporate_users table uses 'password_hash' column  
-- 4. batch_records structure is different from what was documented
-- 5. Default passwords are 'admin123' and 'corp123' (change these!)
-- =====================================================
