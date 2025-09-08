--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

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

ALTER TABLE IF EXISTS ONLY public.supplier_prices DROP CONSTRAINT IF EXISTS supplier_prices_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.supplier_prices DROP CONSTRAINT IF EXISTS supplier_prices_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shopping_list_items DROP CONSTRAINT IF EXISTS shopping_list_items_shopping_list_id_fkey;
ALTER TABLE IF EXISTS ONLY public.matching_preferences DROP CONSTRAINT IF EXISTS matching_preferences_matched_product_id_fkey;
DROP INDEX IF EXISTS public.idx_supplier_prices_supplier_id;
DROP INDEX IF EXISTS public.idx_supplier_prices_supplier;
DROP INDEX IF EXISTS public.idx_supplier_prices_product_id;
DROP INDEX IF EXISTS public.idx_supplier_prices_product;
DROP INDEX IF EXISTS public.idx_shopping_lists_share_id;
DROP INDEX IF EXISTS public.idx_shopping_lists_expires_at;
DROP INDEX IF EXISTS public.idx_shopping_list_items_updated_at;
DROP INDEX IF EXISTS public.idx_shopping_list_items_list_id;
DROP INDEX IF EXISTS public.idx_products_normalized;
DROP INDEX IF EXISTS public.idx_products_description;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_name_key;
ALTER TABLE IF EXISTS ONLY public.supplier_prices DROP CONSTRAINT IF EXISTS supplier_prices_product_id_supplier_id_key;
ALTER TABLE IF EXISTS ONLY public.supplier_prices DROP CONSTRAINT IF EXISTS supplier_prices_pkey;
ALTER TABLE IF EXISTS ONLY public.shopping_lists DROP CONSTRAINT IF EXISTS shopping_lists_share_id_key;
ALTER TABLE IF EXISTS ONLY public.shopping_lists DROP CONSTRAINT IF EXISTS shopping_lists_pkey;
ALTER TABLE IF EXISTS ONLY public.shopping_list_items DROP CONSTRAINT IF EXISTS shopping_list_items_shopping_list_id_item_index_key;
ALTER TABLE IF EXISTS ONLY public.shopping_list_items DROP CONSTRAINT IF EXISTS shopping_list_items_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.matching_preferences DROP CONSTRAINT IF EXISTS matching_preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.matching_preferences DROP CONSTRAINT IF EXISTS matching_preferences_original_item_matched_product_id_key;
ALTER TABLE IF EXISTS public.suppliers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.supplier_prices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shopping_lists ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shopping_list_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.matching_preferences ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.suppliers_id_seq;
DROP SEQUENCE IF EXISTS public.supplier_prices_id_seq;
DROP SEQUENCE IF EXISTS public.shopping_lists_id_seq;
DROP TABLE IF EXISTS public.shopping_lists;
DROP SEQUENCE IF EXISTS public.shopping_list_items_id_seq;
DROP TABLE IF EXISTS public.shopping_list_items;
DROP SEQUENCE IF EXISTS public.products_id_seq;
DROP VIEW IF EXISTS public.product_supplier_prices;
DROP TABLE IF EXISTS public.suppliers;
DROP TABLE IF EXISTS public.supplier_prices;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.matching_preferences_id_seq;
DROP TABLE IF EXISTS public.matching_preferences;
DROP FUNCTION IF EXISTS public.cleanup_expired_shopping_lists();
--
-- Name: cleanup_expired_shopping_lists(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_shopping_lists() RETURNS integer
    LANGUAGE plpgsql
    AS $$
            DECLARE
                deleted_count INTEGER;
            BEGIN
                DELETE FROM shopping_lists WHERE expires_at < CURRENT_TIMESTAMP;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                RETURN deleted_count;
            END;
            $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: matching_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matching_preferences (
    id integer NOT NULL,
    original_item text NOT NULL,
    matched_product_id integer NOT NULL,
    frequency integer DEFAULT 1,
    last_used timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: matching_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matching_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matching_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matching_preferences_id_seq OWNED BY public.matching_preferences.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    description text NOT NULL,
    normalized_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: supplier_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_prices (
    id integer NOT NULL,
    product_id integer,
    supplier_id integer,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_supplier_prices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_supplier_prices AS
 SELECT p.id AS product_id,
    p.description,
    s.id AS supplier_id,
    s.name AS supplier_name,
    sp.price,
    sp.created_at
   FROM ((public.products p
     JOIN public.supplier_prices sp ON ((p.id = sp.product_id)))
     JOIN public.suppliers s ON ((sp.supplier_id = s.id)));


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: shopping_list_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_list_items (
    id integer NOT NULL,
    shopping_list_id integer,
    item_index integer NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    purchased_quantity integer DEFAULT 0 NOT NULL
);


--
-- Name: shopping_list_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shopping_list_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shopping_list_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shopping_list_items_id_seq OWNED BY public.shopping_list_items.id;


--
-- Name: shopping_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shopping_lists (
    id integer NOT NULL,
    share_id character varying(32) NOT NULL,
    title character varying(255) DEFAULT 'Shopping List'::character varying NOT NULL,
    picklist_data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval)
);


--
-- Name: shopping_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shopping_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shopping_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shopping_lists_id_seq OWNED BY public.shopping_lists.id;


--
-- Name: supplier_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_prices_id_seq OWNED BY public.supplier_prices.id;


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: matching_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_preferences ALTER COLUMN id SET DEFAULT nextval('public.matching_preferences_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: shopping_list_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_list_items ALTER COLUMN id SET DEFAULT nextval('public.shopping_list_items_id_seq'::regclass);


--
-- Name: shopping_lists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists ALTER COLUMN id SET DEFAULT nextval('public.shopping_lists_id_seq'::regclass);


--
-- Name: supplier_prices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_prices ALTER COLUMN id SET DEFAULT nextval('public.supplier_prices_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Data for Name: matching_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.matching_preferences VALUES (18, 'CND PLEXIGEL Bonder, Builder, Protector Top Coat, Shaper 0.5 fl oz [Pick Any][Soft Blush]', 70, 1, '2025-08-29 12:43:28.131308', '2025-08-29 12:43:28.131308');
INSERT INTO public.matching_preferences VALUES (38, 'OPI Crystal Nail File 5 and half inches long NIB 2025', 370, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (44, 'CND - Shellac Combo - Ruby Ritz & Ice Vapor Great Colors For Holiday 2023', 81, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (47, 'CND Shellac UV Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Aqua-intance]', 81, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (48, 'CND Shellac UV Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Silhouette]', 81, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (59, 'Nail Tek 2 Ridge Filler Intensive Therapy II For Soft, Peeling Nails 0.5oz', 355, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (60, 'Nail Tek 2 Strengthener Intensive Therapy II For Soft, Peeling Nails 3pcs deal', 355, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (19, 'DND DC DUO Matching Gel & Lacquer 0.5 floz/15mL #271 - Beautiful Disaster', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (20, 'DND DC Gel Polish UV/LED #077 - Strawberry Latte (GEL ONLY)', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (21, 'DND DIVA Gel Polish UV/LED 0.5fl oz/1.5 ml (PART 1 #1-250)[#007 - Stargirl (GEL ONLY)]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (22, 'DND DUO DIVA GEL & LACQUER #239 - Chestnut Wonders', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (23, 'DND DUO Matching Gel & Lacquer #535 - Rose City', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (24, 'DND DUO Matching Gel & Lacquer #705 - Silver Dreamer', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (25, 'DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#604 - Cool Gray]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (26, 'DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#615 - Honey Beige]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (27, 'DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#633 - Garnet Red]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (28, 'DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#654 - Pumpkin Spice]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (29, 'DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#753 - Scarlett Dreams]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (30, 'DND Diva Nail Lacquer DV227 - R U Jelly? (LACQUER ONLY)', 520, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (31, 'DND Duo Gel & Lacquer Clear Pink # 441 - Brand new', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (32, 'DND Duo Gel & Lacquer Twinkle Little Star #443', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (33, 'DND Duo Matching Soak-Off Gel & Nail Polish - #865 - Pearly Pink', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (78, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Love Fizz]', 81, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (79, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Ruby Ritz]', 81, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (142, 'Kupa ManiPro KP60 Replacement Cord Nail Drill Motor Cord Only K-60 with end cap', 299, 1, '2025-09-02 23:06:44.864616', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (34, 'DND Duo Matching Soak-Off Gel & Nail Polish - #879 - Sunset Suede', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (35, 'DND Gel Polish UV/LED #429 - Boston University Red (GEL ONLY)', 120, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (36, 'DND Gel Polish UV/LED #807 - Cotton Candy (GEL ONLY)', 120, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (37, 'INM Out The Door #1 Super Fast Drying Top Coat 16oz 2025', 442, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (39, 'OPI GelColor Intelli-Gel Polish 0.5fl.oz/15mL GCH22 Funny Bunny', 381, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (40, 'OPI Nail Polish 0.5 fl oz - NLC89 Chocolate Moose', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (41, 'OPI Nail Polish 0.5 fl oz - NLF81 Living on the Boula-vard', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (42, 'OPI Nail Polish 0.5 fl oz - NLP40 Como se Llama?', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (43, 'OPI Nail Polish 0.5 fl oz - NLW58 Yank My Doodle', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (45, 'CND Shellac LED/UV Base Coat + Top Coat 0.25 oz - DUO Brand New in Box', 83, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (46, 'CND Shellac Soak Off Gel Polish Negligee- 7.3mL (.25 fl oz) Rare Color', 81, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (49, 'CND Shellac UV/LED Gel Polish Duraforce Top + Base 0.25oz Combo 2023 NIB', 83, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (50, 'CND Vinylux Weekly Top Coat 0.5 oz/15 mL Nail Lacquer Polish Brand New Formula', 94, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (51, 'DND DC Gel Polish UV/LED #2443 -  Sheer Sugar (Gel Only)', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (52, 'DND DC Gel Polish UV/LED #2452 -  Giving Classy (Gel Only)', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (53, 'DND DC Sheer 2024 Edition#1 NEW Collection *Pick Any*[2461 - Milky Pink]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (54, 'DND DUO DIVA GEL & LACQUER #253 - Gothic Grape', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (55, 'DND Daisy Soak Off Gel Polish Duo full size .5oz (Part 1: #401-599)[478 - Spiced Berry]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (56, 'DND Duo Matching Soak-Off Gel & Nail Polish - #870 - Tea Time', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (57, 'DND Duo Matching Soak-Off Gel & Nail Polish - #878 - Picnic For 2', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (58, 'GELIXIR - Soak Off UV/LED Gel - Foil Gel (Transfer Foil Gel) 15ml 0.5oz', 184, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (61, 'Nail Tek Nail Recovery Kit Restores Damaged Nails Brand New Kit', 352, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (62, 'OPI GelColor - GC F13 - Louvre Me Louvre Me Not Rare Color 0.5 oz', 383, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (63, 'OPI Nail Polish 0.5 fl oz - NLF16 Tickle My France-y', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (64, 'OPI Nail Polish 0.5 fl oz - NLSH3 Chiffon-d of You', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (65, 'OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPA68 - Kiss Me I''m Brazilian]', 372, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (135, 'DND Gel Polish UV/LED #811 - Guava (GEL ONLY)', 120, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (66, 'OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPH012 - Emmy, Have You Seen Oscar]', 372, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (67, 'OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPH02 - Chick Flick Cherry]', 372, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (68, 'OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPH70 - Aloha from OPI]', 372, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (69, 'OPI Spring 2024 YOUR WAY Infinite Shine 0.5 fl oz/15mL NEW 9 Colors *Pick Any*[ISL139 - Get in Lime]', 394, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (70, 'APRES GEL X - EXTEND GEL/PRIMER/BOND/TOP COAT/MATTE TOP - SELECT ITEM [Non Acid Primer]', 17, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (71, 'CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [064]', 40, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (72, 'CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [065]', 40, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (73, 'CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [108]', 40, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (74, 'CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [129]', 40, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (75, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Blue Eyeshadow]', 81, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (76, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Garnet Glamour]', 81, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (77, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Hollywood]', 81, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (80, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Terracotta Dreams]', 81, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (81, 'CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Tropix]', 81, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (82, 'DND - Gel Polish & Matching Nail Lacquer - 601 BALLET PINK 0.5 oz/ 15 mL', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (83, 'DND 2023 Super Glitter Soak Off Gel-Polish Duo .5oz LED/UV #893 - 929- Pick Any[897 - Knotty or Nice]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (84, 'DND DC DUO Matching Gel & Lacquer 0.5 floz/15mL #005 - Neon Pink', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (85, 'DND DC DUO Matching Gel & Lacquer 0.5 floz/15mL #008 - NY Islanders', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (86, 'DND DC Gel Polish UV/LED #2439 -  Milky White (Gel Only)', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (87, 'DND DC Gel Polish UV/LED 883 Candy Kisses (GEL ONLY)', 120, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (88, 'DND DC Mermaid Glitter Gel 0.5 oz LED/UV DND Gel Polish - Pick Any.[250 - Darkindigo]', 114, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (89, 'DND DC Mermaid Glitter Gel 0.5 oz LED/UV DND Gel Polish - Pick Any.[DC No Cleanse Top]', 114, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (90, 'DND DC Platinum Glitter Gel Polish #214 - Paparazzi', 114, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (91, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[004 - Pink Lemonade]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (92, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[007 - Canadian Maple]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (93, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[015 - Pink Daisy]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (94, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[052 - Walnut Brown]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (95, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[059 - Sheer Pink]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (96, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[061 - Wineberry]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (97, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[063 - Shocking Orange]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (98, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[146 - Icy Pink]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (99, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[254 - Forest Green]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (100, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[279 - Coral Bells]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (101, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[319 - Coffee Bean]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (102, 'DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New colors - Pick Any[156 - Wild Rose]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (103, 'DND DC Soak Off Gel Polish Duo #2439 - Milky White', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (104, 'DND DC Soak Off Gel Polish Duo #320 - #2543 LED/UV New - Pick Any Color[2448 - Have Mercy]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (105, 'DND DC Super Platinum Gel Only 2023 Collection 0.6 oz - Pick Any[938 - Copper Fireside]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (106, 'DND DUO DIVA COLLECTION MATCHING GEL & LACQUER #1-250 *PART 1 - Pick Any*[246 - Blue Lagoon]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (107, 'DND DUO Matching Gel & Lacquer #447 - Black Licorice', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (108, 'DND DUO Matching Gel & Lacquer #456 - Cherry Berry', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (109, 'DND DUO Matching Gel & Lacquer #774 - Gypsy Light', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (110, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[405 - Lush Lilac Star]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (111, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[407 - Black Diamond Star]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (112, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[421 - Rose Petal]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (113, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[445 - Melting Violet]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (114, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[446 - Woodlake]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (115, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[447 - Black Licorice]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (116, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[607 - Hazelnut]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (117, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[633 - Garnet Red]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (118, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[637 - Lucky Red]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (119, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[663 - Lavender Pop]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (120, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[683 - Cinder Shoes]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (121, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[751 - Cherry Mocha]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (122, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[757 - Chili Pepper]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (123, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[776 - Ice Ice Baby]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (124, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[856 - Ivory Cream]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (125, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[861 - Tie The Knot]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (126, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[862 - Pearly Ice]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (127, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[864 - Nude Escape]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (128, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[867 - Perfect Nude]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (129, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[876 - Flower Girl]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (130, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[895 - Disco Daydream]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (131, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[899 - Berry Jazz]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (132, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[922 - Berrylicious]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (133, 'DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[928 - Bronzed Era]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (134, 'DND Gel Polish Duo Sheer Collection #856 - 892 New Collection 2024 - Pick Any[#885 - Rebel Rose]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (136, 'DND Gel Polish UV/LED 0.5fl oz/1.5 ml *Pick Any* (PART 1 #401-599) (Gel only)[#447 - Black Licorice]', 120, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (137, 'DND New Colors 2020 Soak Off Gel-Polish Duo .5oz LED/UV #711 - 782 - Pick Any..[751 - Cherry Mocha]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (138, 'DND New Colors 2020 Soak Off Gel-Polish Duo .5oz LED/UV #711 - 782 - Pick Any..[756 - Bonfire]', 118, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (139, 'FUNG-OFF� Special Nail Conditioner For Nail Fungus Treatment 0.5 Oz', 150, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (140, 'Gelish Soak-Off Gel Polish 0.5 fl oz/15mL 1110910 - HOLIDAY PARTY BLUES', 164, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (141, 'Kiara Sky Gel Polish 15 ml/0.5 fl oz - #401 - #650 Most Current update![629 GIVE ME SPACE]', 279, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (143, 'LECHAT PERFECT MATCH METALLUX COLLECTION CHROME GEL + LAC DUO[S05 - Hypnotic]', 315, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (144, 'LECHAT PERFECT MATCH METALLUX GEL+LAC DUO 2018 COLLECTION UPDATED *PICK ANY*[MLMS10 - Phoenix Rise]', 315, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (145, 'OPI "What''s Your Mani-tude" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F025 - Slip Dressed Up]', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (146, 'OPI "What''s Your Mani-tude" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F026 - Band Tease]', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (147, 'OPI "What''s Your Mani-tude" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F029 - Cargo All Out]', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (148, 'OPI "What''s Your Mani-tude" Nail Lacquer Fall 2025 Collection 12pcs No Display', 397, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (149, 'OPI Bond 007 Skyfall THE LIVING DAYLIGHTS Multi Hex Glitter Nail Polish D15 NEW!', 396, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (150, 'OPI Matching GelColor & Nail Polish Lacquer Duo - **Pick Any**[GCE41 - Barefoot in Barcelona]', 381, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (151, 'OPI Matching GelColor & Nail Polish Lacquer Duo - **Pick Any**[GCI64 - Aurora Berry-alis]', 381, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (152, 'Orly Nail Lacquers 0.6oz All Colors (Update to Spring 2025) - PART 1 *Pick Any *[2000213 - Stop the Clock]', 427, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (153, 'Orly Nail Lacquers 0.6oz All Colors (Update to Spring 2025) - PART 1 *Pick Any *[20467 - La Vida Loca]', 427, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');
INSERT INTO public.matching_preferences VALUES (154, 'Seche Base Ridge Filling Base Coat Nail Polish .5 oz', 475, 2, '2025-09-02 23:20:12.616285', '2025-09-02 23:06:44.864616');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products VALUES (520, 'DC/ Diva Lacquer', 'dc/ diva lacquer', '2025-09-02 22:24:52.315326', '2025-09-02 22:24:52.315326');
INSERT INTO public.products VALUES (404, 'Opi Nail Envy Start To Finish 15ml / 0.5 fl oz #NTT70', 'opi nail envy start to finish 15ml / 0.5 fl oz #ntt70', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (405, 'OPI Nail File Pro Sampler Pack 6 pcs #FI600', 'opi nail file pro sampler pack 6 pcs #fi600', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (406, 'OPI Nail Treatment Nail Cuticle Oil 8.6 mL - 0.29 Fl. Oz AS200', 'opi nail treatment nail cuticle oil 8.6 ml - 0.29 fl. oz as200', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (407, 'OPI Nail Treatment Cuticle Oil 0.5 oz', 'opi nail treatment cuticle oil 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (408, 'OPI N.A.S Cleansing Solution 2 oz', 'opi n.a.s cleansing solution 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (409, 'OPI Pro Sample Pack 6 pcs', 'opi pro sample pack 6 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (410, 'OPI Pro Spa Cuticle Oil togo', 'opi pro spa cuticle oil togo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (411, 'opi remover 32 oz', 'opi remover 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (412, 'OPI White file edge 240', 'opi white file edge 240', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (413, 'ORLY Base Coat One Night Stand 0.6 oz', 'orly base coat one night stand 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (414, 'Orly Bonder Base coat 0.6 oz', 'orly bonder base coat 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (415, 'Orly Bonder base coat 8 oz', 'orly bonder base coat 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (416, 'ORLY Breathable', 'orly breathable', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (417, 'ORLY Breathable Nail Treatment Calcium Boost .6 fl oz#2460002', 'orly breathable nail treatment calcium boost .6 fl oz#2460002', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (418, 'ORLY Breathable Nail Treatment Protein Boost .6 fl oz#2460001', 'orly breathable nail treatment protein boost .6 fl oz#2460001', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (419, 'Orly Builder 0.6 oz Clear', 'orly builder 0.6 oz clear', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (420, 'Orly Builder 1.2 oz/ 36 mL', 'orly builder 1.2 oz/ 36 ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (421, 'Orly Cutique Cuticle Remover 0.5 oz', 'orly cutique cuticle remover 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (422, 'Orly Flash Dry Drops 0.6 oz', 'orly flash dry drops 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (423, 'Orly Gel Bodyguard 0.6 oz', 'orly gel bodyguard 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (424, 'ORLY GEL POLISH 0.3 OZ', 'orly gel polish 0.3 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (425, 'Orly Gel polish 0.6 oz', 'orly gel polish 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (426, 'Orly in a snap top coat 0.6 oz #24320', 'orly in a snap top coat 0.6 oz #24320', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (427, 'ORLY Lacquer 0.5 OZ', 'orly lacquer 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (428, 'Orly Manicure Keeper Duo Kit 18mL for Lasting Manicures at Home', 'orly manicure keeper duo kit 18ml for lasting manicures at home', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (429, 'Orly Nail Lacquer glosser Top Coat 0.6 oz #24210', 'orly nail lacquer glosser top coat 0.6 oz #24210', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (430, 'Orly Nail Lacquer Matte top coat 0.6 oz #24250', 'orly nail lacquer matte top coat 0.6 oz #24250', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (431, 'ORLY Nail Lacquer Nail Amor 0.6 OZ #24440', 'orly nail lacquer nail amor 0.6 oz #24440', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (432, 'Orly Nail Lacquer Nailtrition 0.6 oz #24160', 'orly nail lacquer nailtrition 0.6 oz #24160', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (433, 'Orly Nail Lacquer No Bite 0.6 oz', 'orly nail lacquer no bite 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (434, 'Orly Nail Lacquer Top sec''n dry 0.6 oz #24310', 'orly nail lacquer top sec''n dry 0.6 oz #24310', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (435, 'Orly Nail Polish Thinner 2 oz #23135', 'orly nail polish thinner 2 oz #23135', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (436, 'Orly Nail Treatment Fungus MD', 'orly nail treatment fungus md', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (437, 'Orly polishield 3 in 1 top coat 0.6 oz #24270', 'orly polishield 3 in 1 top coat 0.6 oz #24270', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (438, 'Orly Primer 0.6 oz', 'orly primer 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (439, 'Orly primer 1.2 oz', 'orly primer 1.2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (440, 'Orly Pro Fx gel 0.6 oz', 'orly pro fx gel 0.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (441, 'Orly Shining Armor High Shine Top Coat 0.6 fl. oz #2410001', 'orly shining armor high shine top coat 0.6 fl. oz #2410001', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (442, 'Out the door Top Coat 16 oz', 'out the door top coat 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (443, 'Paon Seven-Eight Permanent Hair Color', 'paon seven-eight permanent hair color', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (444, 'Petal kolinsky acrylic nail brush black angle size 08', 'petal kolinsky acrylic nail brush black angle size 08', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (445, 'Petal kolinsky acrylic nail brush black angle size 12', 'petal kolinsky acrylic nail brush black angle size 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (446, 'Petal kolinsky acrylic nail brush black angle size 14', 'petal kolinsky acrylic nail brush black angle size 14', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (447, 'Petal kolinsky acrylic nail brush black angle size 16', 'petal kolinsky acrylic nail brush black angle size 16', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (448, 'Petal kolinsky acrylic nail brush black angle size 18', 'petal kolinsky acrylic nail brush black angle size 18', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (449, 'Petal kolinsky acrylic nail brush black angle size 20', 'petal kolinsky acrylic nail brush black angle size 20', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (450, 'Poshe Super Fast Drying Top Coat 16 oz', 'poshe super fast drying top coat 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (451, 'Prolinc Be Natural Callus eliminator 1 oz', 'prolinc be natural callus eliminator 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (452, 'Prolinc Be Natural Callus eliminator 4 oz', 'prolinc be natural callus eliminator 4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (453, 'Pro Shaker Duo', 'pro shaker duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (454, 'Pro Tool Nail Machine 2 Way Nail Drill #275', 'pro tool nail machine 2 way nail drill #275', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (455, 'Pro-Tool Foot Control', 'pro-tool foot control', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (456, 'Pro-Tool Super Flex Shaft - Slim 1/8 in', 'pro-tool super flex shaft - slim 1/8 in', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (457, 'Pro-Tool Super Flex Shaft -Regular 1/8 in', 'pro-tool super flex shaft -regular 1/8 in', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (458, 'Pumice pad Disposable 400 pcs', 'pumice pad disposable 400 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (459, 'Pyramid Cat Eye Gel', 'pyramid cat eye gel', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (460, 'Pyramid Gel duo', 'pyramid gel duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (461, 'Pyramid Dip powder', 'pyramid dip powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (462, 'Red Nail Essential Dip Liquid #1 Bond 0.5 oz', 'red nail essential dip liquid #1 bond 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (463, 'Red Nail Essential Dip Liquid #2 Base Coat 0.5 oz', 'red nail essential dip liquid #2 base coat 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (464, 'Red Nail Essential Dip Liquid #3 Activator 0.5 oz', 'red nail essential dip liquid #3 activator 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (465, 'Red Nail Essential Dip Liquid #4 Top Coat 0.5 oz', 'red nail essential dip liquid #4 top coat 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (466, 'Red Nail essential Dip Liquid Kit 8 oz', 'red nail essential dip liquid kit 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (467, 'Retail Mini Callus Pumice Pack 40 pc #3899', 'retail mini callus pumice pack 40 pc #3899', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (468, 'Sanding Band 400 pcs', 'sanding band 400 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (469, 'Salon Callus Away Callus Remover 8 oz', 'salon callus away callus remover 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (470, 'Salon Nail Liquid Bubble Gum NL 6000 8 oz', 'salon nail liquid bubble gum nl 6000 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (471, 'Salon Pure Acetone nail remover 16 oz', 'salon pure acetone nail remover 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (472, 'Satin Smooth Paraffin Wax Warmer Spa Thermostat Control #814103', 'satin smooth paraffin wax warmer spa thermostat control #814103', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (473, 'Seche Clear Base Coat .5 fl oz #83117', 'seche clear base coat .5 fl oz #83117', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (474, 'Seche Restore Thinner Professional Kit (2 oz Restore & Dropper) 83053', 'seche restore thinner professional kit (2 oz restore & dropper) 83053', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (475, 'Seche Vite Dry Fast Top Coat Professional 0.5 oz #83100', 'seche vite dry fast top coat professional 0.5 oz #83100', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (476, 'Seche Vite Dry Top 4 oz + 0.5 oz', 'seche vite dry top 4 oz + 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (477, 'Seche Vite Top 16 oz', 'seche vite top 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (478, 'Seche Vive Instant Gel Effect Top 4 oz', 'seche vive instant gel effect top 4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (479, 'Shamrock Latex Gloves powder free (Case 10 box)', 'shamrock latex gloves powder free (case 10 box)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (480, 'SNS Dip liquid 0.5 oz', 'sns dip liquid 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (481, 'SNS Dip liquid refill 2 oz', 'sns dip liquid refill 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (482, 'Spectrum Beauty Lab Fungus treatment', 'spectrum beauty lab fungus treatment', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (483, 'ST Carbide', 'st carbide', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (484, 'Startool Carbide Nail Bit All in 1 3/32 3X Coarse', 'startool carbide nail bit all in 1 3/32 3x coarse', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (485, 'Startool Nail Carbide bit Special Shark 4X Coarse', 'startool nail carbide bit special shark 4x coarse', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (486, 'Suavecito firme clay pomade 4 oz K-P254', 'suavecito firme clay pomade 4 oz k-p254', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (487, 'Suavecito Matte Pomade 4 oz #P129NN', 'suavecito matte pomade 4 oz #p129nn', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (488, 'Suavecito Pomade Firme (Strong) Hold Pomade 4 oz K-P002', 'suavecito pomade firme (strong) hold pomade 4 oz k-p002', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (489, 'Suavecito Pomade Original Hold Pomade 4 oz K-P001', 'suavecito pomade original hold pomade 4 oz k-p001', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (490, 'Sumika Dazzling Gel', 'sumika dazzling gel', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (491, 'Sumika Pastel candy gel', 'sumika pastel candy gel', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (492, 'Sumika Twinkle Gel 24 Color B5g1', 'sumika twinkle gel 24 color b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (493, 'Tip Box Plastic Soft P.P Container', 'tip box plastic soft p.p container', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (494, 'USN Coffin Nail Tip Box 550 Tips', 'usn coffin nail tip box 550 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (495, 'USN Long Straight Crystal Clear Box 540 Tips', 'usn long straight crystal clear box 540 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (496, 'USN Nail Tip Stiletto Clear Box 540 Tips', 'usn nail tip stiletto clear box 540 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (497, 'USN Round French Box 575 Tips', 'usn round french box 575 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (498, 'USN Stiletto Clear Bag 50 pcs', 'usn stiletto clear bag 50 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (499, 'USN Stiletto Crystal Clear Box 540 Tips', 'usn stiletto crystal clear box 540 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (500, 'USN Stiletto Nail Tip Bag 50 pcs', 'usn stiletto nail tip bag 50 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (501, 'USN Stiletto Nail Tip Box 550 Tips', 'usn stiletto nail tip box 550 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (502, 'USN Straight Clear Box 540 Tips', 'usn straight clear box 540 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (503, 'USN Straight Coffin Natural Bag 50 pcs', 'usn straight coffin natural bag 50 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (504, 'USN Straight Coffin Natural Box 540 Tips', 'usn straight coffin natural box 540 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (505, 'USN Straight Natural Nail Tip Box 540 Tips', 'usn straight natural nail tip box 540 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (506, 'USN Straight Tip Natural Bag 50 pcs', 'usn straight tip natural bag 50 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (507, 'Vitamin Dip Liquid', 'vitamin dip liquid', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (508, 'Voesh Gloves/ Sock Argan box 100', 'voesh gloves/ sock argan box 100', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (509, 'Voesh Pedi In a Box 4 step box 50 pcs', 'voesh pedi in a box 4 step box 50 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (510, 'Voesh Shower Filter', 'voesh shower filter', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (511, 'Wave Gel Duo', 'wave gel duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (512, 'Wecheer Nail Drill Cordless rechargeable #WE-243', 'wecheer nail drill cordless rechargeable #we-243', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (513, 'Wecheer nail drill super manicure #WE-242', 'wecheer nail drill super manicure #we-242', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (514, 'Wonder Gel Base Coat UV/LED Cured 0.5 oz', 'wonder gel base coat uv/led cured 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (515, 'Wonder gel Top Coat no-wipe UV/LED Cured 0.5 oz', 'wonder gel top coat no-wipe uv/led cured 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (516, 'Young Nails Powder 85 gr', 'young nails powder 85 gr', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (517, 'Young Nails Protein Bond 0.25 oz', 'young nails protein bond 0.25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (518, 'Young Nails Liquid 6 oz', 'young nails liquid 6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (519, 'Young Nails Liquid 32 oz', 'young nails liquid 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (1, '#1 Eyelash Glue', '#1 eyelash glue', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (2, '777 ft red wood french nail brush Dotting Tool size 8', '777 ft red wood french nail brush dotting tool size 8', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (3, '777 ft red wood french nail brush Dotting Tool size 10', '777 ft red wood french nail brush dotting tool size 10', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (4, '777 ft red wood french nail brush Dotting Tool size 12', '777 ft red wood french nail brush dotting tool size 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (5, '7 Star Dip liquid 0.5', '7 star dip liquid 0.5', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (6, 'Accel 2 Way Professional Rotary Tool 30000 rpm #F-275FR', 'accel 2 way professional rotary tool 30000 rpm #f-275fr', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (7, 'Accel Super Flexible Shaft 3/32 #F-275SF', 'accel super flexible shaft 3/32 #f-275sf', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (8, 'Andrea Strip Lash Twin Pack Lashes Black 33 #61793', 'andrea strip lash twin pack lashes black 33 #61793', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (9, 'Aora Chrome Bond Kit 4 oz refill', 'aora chrome bond kit 4 oz refill', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (10, 'Aora Chrome Bond 0.47 oz', 'aora chrome bond 0.47 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (11, 'Apre Gel Color', 'apre gel color', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (12, 'Apres Gel extend gold 0.5 oz/ builder gel', 'apres gel extend gold 0.5 oz/ builder gel', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (13, 'Apres Gel extend No Wipe 0.5 oz', 'apres gel extend no wipe 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (14, 'Apres Gel extend gold 1 oz', 'apres gel extend gold 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (15, 'Apres Gel extend No wipe 1 oz', 'apres gel extend no wipe 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (16, 'Apres Gel Ionic/ Jar', 'apres gel ionic/ jar', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (17, 'Apres Primer/bond/prep', 'apres primer/bond/prep', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (18, 'Apres Tip box', 'apres tip box', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (19, 'Apres Tip Refill bag', 'apres tip refill bag', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (20, 'Ardell Deluxe Pack 105 Black #66694', 'ardell deluxe pack 105 black #66694', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (21, 'Ardell Gray Magic Color Additive Cover gray 1.0 oz #780590', 'ardell gray magic color additive cover gray 1.0 oz #780590', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (22, 'Ardell Individual Naturals 6 Pack Knot Free Medium 60078', 'ardell individual naturals 6 pack knot free medium 60078', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (23, 'Ardell Individual Naturals 6 Pack Knot Free Short 60079', 'ardell individual naturals 6 pack knot free short 60079', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (24, 'Ardell Individual Naturals 6 pack Knot Free Combo', 'ardell individual naturals 6 pack knot free combo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (25, 'Ardell Natural 105 Black #65002', 'ardell natural 105 black #65002', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (26, 'B tool one way rotary tool #3699', 'b tool one way rotary tool #3699', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (27, 'Barbicide Disinfect salon tools 16 oz Pints #51610', 'barbicide disinfect salon tools 16 oz pints #51610', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (28, 'Bare Luxury Pedi 4 In1 Pack Pomelo & Hibiscus Case 48 pack #3623002', 'bare luxury pedi 4 in1 pack pomelo & hibiscus case 48 pack #3623002', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (29, 'Bare Soak Lotion Massage Ointment 3.4 fl oz 100 mL', 'bare soak lotion massage ointment 3.4 fl oz 100 ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (30, 'Ben Thanh Nipper D555', 'ben thanh nipper d555', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (31, 'Bio Seaweed Stronger Base Coat 0.5 OZ / new look', 'bio seaweed stronger base coat 0.5 oz / new look', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (32, 'Bio Seaweed Top Coat No-Wipe 0.5 oz', 'bio seaweed top coat no-wipe 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (33, 'Bio Seaweed Unity Gel -b5g1', 'bio seaweed unity gel -b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (34, 'Blue Cross Cuticle Remover Lanolin Enriched 32OZ', 'blue cross cuticle remover lanolin enriched 32oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (35, 'BST Dau khuynh diep pk 12', 'bst dau khuynh diep pk 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (36, 'Btool Rotary Tool Machine', 'btool rotary tool machine', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (37, 'BUFFER PINK SET 10', 'buffer pink set 10', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (38, 'BZ NP Student Powder 2oz', 'bz np student powder 2oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (39, 'Callas Eyelash Adhesive Latex Free 0.17 fl. oz. / 5 ml', 'callas eyelash adhesive latex free 0.17 fl. oz. / 5 ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (40, 'CARAMIA Duo', 'caramia duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (41, 'Caramia Soak-off gel Top & Base Duo', 'caramia soak-off gel top & base duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (42, 'Chaun Legend Gel Polish 80 color', 'chaun legend gel polish 80 color', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (43, 'Chaun Legend Gel No Wipe Top', 'chaun legend gel no wipe top', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (44, 'China Glaze Lacquer', 'china glaze lacquer', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (45, 'Chisel Acrylic & Dipping Powder 2 oz', 'chisel acrylic & dipping powder 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (46, 'Chisel Acrylic & Dipping Powder Refill 12 oz', 'chisel acrylic & dipping powder refill 12 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (47, 'Chisel Duo Cloud', 'chisel duo cloud', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (48, 'Chisel Primer 0.5 oz', 'chisel primer 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (49, 'Chisel Super Dipping Base 0.5 oz New Bottle', 'chisel super dipping base 0.5 oz new bottle', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (50, 'Clubman Citrus Citrus Musk Cologne 12.5 oz #401900', 'clubman citrus citrus musk cologne 12.5 oz #401900', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (51, 'Clean Easy Wax warmer', 'clean easy wax warmer', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (52, 'Clean Easy Sensitive Microwave 8 oz', 'clean easy sensitive microwave 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (53, 'Clubman Country Club Shampoo 16 OZ #277200', 'clubman country club shampoo 16 oz #277200', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (54, 'Clubman Eau de Portugal Hair Tonic 12.5 oz #271300', 'clubman eau de portugal hair tonic 12.5 oz #271300', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (55, 'ClubMan Island Bay Rum 12 oz #402100', 'clubman island bay rum 12 oz #402100', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (56, 'Clubman Lilac Vegetal After Shave Lotion 12 oz #259100', 'clubman lilac vegetal after shave lotion 12 oz #259100', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (57, 'Clubman Lime Sec Cologne 12.5 fl oz #401800', 'clubman lime sec cologne 12.5 fl oz #401800', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (58, 'Clubman Molding Paste 1.7oz #66296', 'clubman molding paste 1.7oz #66296', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (59, 'Clubman Pinaud After Shave Lotion 12.5 oz #403200', 'clubman pinaud after shave lotion 12.5 oz #403200', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (60, 'Clubman Pinaud Hair Tonic 12.5 oz #276700', 'clubman pinaud hair tonic 12.5 oz #276700', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (61, 'Clubman Pinaud Lilac Vegetal After-Shave Lotion 12.5 oz #271000', 'clubman pinaud lilac vegetal after-shave lotion 12.5 oz #271000', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (62, 'CnC top 0.5 oz', 'cnc top 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (63, 'CnC top refill 8 oz', 'cnc top refill 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (64, 'cnd Air Dry 2.3 oz', 'cnd air dry 2.3 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (65, 'CND Cuticle Away 6 oz', 'cnd cuticle away 6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (66, 'CND Lamp', 'cnd lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (67, 'cnd lotion 31 oz', 'cnd lotion 31 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (68, 'CND Lotion 33 oz', 'cnd lotion 33 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (69, 'CND lotion 8.3 oz', 'cnd lotion 8.3 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (70, 'CND Luxe top (disc)', 'cnd luxe top (disc)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (71, 'CND Nail Fresh 1 oz', 'cnd nail fresh 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (72, 'CND Nail Primer 0.5 oz', 'cnd nail primer 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (73, 'CND powder 3.7 oz', 'cnd powder 3.7 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (74, 'CND powder 32 oz', 'cnd powder 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (75, 'CND RADICAL SOLAR 4 OZ', 'cnd radical solar 4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (76, 'CND Retention 8 oz', 'cnd retention 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (77, 'CND retention 16 oz', 'cnd retention 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (78, 'CND Retention 32 oz', 'cnd retention 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (79, 'CND RETENTION GALLON', 'cnd retention gallon', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (80, 'CND Ridge Fx Nail Surface enhancer 0.5 OZ', 'cnd ridge fx nail surface enhancer 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (81, 'cnd shellac 0.25 OZ', 'cnd shellac 0.25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (82, 'cnd shellac red box', 'cnd shellac red box', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (83, 'CND SHELLAC TOP/ base 0.25', 'cnd shellac top/ base 0.25', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (84, 'CND Shellac Top 0.5 oz', 'cnd shellac top 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (85, 'CND SKINCARE FEET 15 OZ', 'cnd skincare feet 15 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (86, 'CND Solar Oil mini pack 40', 'cnd solar oil mini pack 40', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (87, 'CND Solar oil 2.3 oz (old)', 'cnd solar oil 2.3 oz (old)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (88, 'CND Solar oil 2.3 oz new', 'cnd solar oil 2.3 oz new', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (89, 'CND Solar Speed Spray 32 oz', 'cnd solar speed spray 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (90, 'CND Solar Speed Spray 4 oz', 'cnd solar speed spray 4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (91, 'CND Stickey base 0.5 oz', 'cnd stickey base 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (92, 'CND Super Shiny Top 0.33 pk 6', 'cnd super shiny top 0.33 pk 6', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (93, 'cnd vinylux color 0.5 oz', 'cnd vinylux color 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (94, 'CND Vinylux top 0.5 oz', 'cnd vinylux top 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (95, 'Codi Lotion 25 oz', 'codi lotion 25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (96, 'Cre8tion gel 0.5 oz', 'cre8tion gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (97, 'Cre8tion Cordless lamp', 'cre8tion cordless lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (98, 'Cr8tion Special effect gel', 'cr8tion special effect gel', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (99, 'CREATIVE PLAY TOP LACQUER', 'creative play top lacquer', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (100, 'Credo Corn Cutter', 'credo corn cutter', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (101, 'CUCCIO BUTTER MILK 26 OZ', 'cuccio butter milk 26 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (102, 'Dixon buffer 3 way Purple White grit 60/100 8 pcs D14', 'dixon buffer 3 way purple white grit 60/100 8 pcs d14', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (103, 'DM Soak off Jelly Gel 48 color B5g1', 'dm soak off jelly gel 48 color b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (104, 'DND Art', 'dnd art', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (105, 'DND Dap Dip Powder 2 oz', 'dnd dap dip powder 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (106, 'DND DC Cat Eye 9D', 'dnd dc cat eye 9d', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (107, 'Dnd Dc Dip Liquid Step 1 Bonder 0.5oz / 15ml', 'dnd dc dip liquid step 1 bonder 0.5oz / 15ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (108, 'Dnd Dc Dip Liquid Step 2 Base Coat 0.5oz / 15ml', 'dnd dc dip liquid step 2 base coat 0.5oz / 15ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (109, 'Dnd Dc Dip Liquid Step 3 Activator 0.5oz / 15ml', 'dnd dc dip liquid step 3 activator 0.5oz / 15ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (110, 'Dnd Dc Dip Liquid Step 4 Top Gel 0.5oz / 15ml', 'dnd dc dip liquid step 4 top gel 0.5oz / 15ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (111, 'Dnd Dc Dip Liquid Step 5 Brush Saver 0.5oz / 15ml', 'dnd dc dip liquid step 5 brush saver 0.5oz / 15ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (112, 'DND DC Foil Gel Base 0.5 oz #400', 'dnd dc foil gel base 0.5 oz #400', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (113, 'DND DC Gel Polish duo', 'dnd dc gel polish duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (114, 'DND DC Mermaid/ Platinum/ Mood', 'dnd dc mermaid/ platinum/ mood', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (115, 'DND DC Soak off Matte Top Coat 0.5 oz #200', 'dnd dc soak off matte top coat 0.5 oz #200', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (116, 'DND Diva 9D cat eye', 'dnd diva 9d cat eye', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (117, 'DND Drill Machine', 'dnd drill machine', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (118, 'DND DUO GEL POLISH', 'dnd duo gel polish', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (119, 'DND Gel E Tip Glue 0.5 oz', 'dnd gel e tip glue 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (120, 'DND Gel only', 'dnd gel only', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (121, 'DND Glove case 1000', 'dnd glove case 1000', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (122, 'DND Refill + 12 x 0.5 oz', 'dnd refill + 12 x 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (123, 'DND Refill 16 oz + 8 x 0.5 oz', 'dnd refill 16 oz + 8 x 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (124, 'DND Soft Gel Tip Primer', 'dnd soft gel tip primer', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (125, 'DUO Adhesive Eyelash Glue Clear #568034', 'duo adhesive eyelash glue clear #568034', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (126, 'Duo Quick Set Striplash Adhesive', 'duo quick set striplash adhesive', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (127, 'Eagle Brand Green Medicated Roll on (Dầu Lăn Xanh) box 12', 'eagle brand green medicated roll on (dầu lăn xanh) box 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (128, 'Eagle Brand Medicated Oil 24 mL (dầu xanh) box 12', 'eagle brand medicated oil 24 ml (dầu xanh) box 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (129, 'Eagle Brand Medicated Oil 24 mL (dầu trang)  ea', 'eagle brand medicated oil 24 ml (dầu trang) ea', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (130, 'Electric Foot File Callus Remover Rechargeable Machine #FCR02', 'electric foot file callus remover rechargeable machine #fcr02', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (131, 'Entity Nu Bond Non-Acid Nail Primer 0.5 oz #5101153', 'entity nu bond non-acid nail primer 0.5 oz #5101153', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (132, 'Entity Soak-off Gel No Wipe Top Coat 0.5oz', 'entity soak-off gel no wipe top coat 0.5oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (133, 'Entity Success Sculpting Liquid 16 oz', 'entity success sculpting liquid 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (134, 'Essie Gel Couture Effect Top Coat Golden Era 0.46 Oz #1254', 'essie gel couture effect top coat golden era 0.46 oz #1254', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (135, 'Essie Gel Couture Effect Top Coat Silk Illusion 0.46 Oz #1255', 'essie gel couture effect top coat silk illusion 0.46 oz #1255', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (136, 'Essie Gel Couture Effect Top Coat Spectrum Glow 0.46 Oz #1256', 'essie gel couture effect top coat spectrum glow 0.46 oz #1256', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (137, 'Essie Gel Couture- b5g1', 'essie gel couture- b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (138, 'Essie Gel Polish 0.46 oz', 'essie gel polish 0.46 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (139, 'ESSIE Lacquer - b5g1', 'essie lacquer - b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (140, 'Ex acrylic nail brush kolinsky Black handle size 10', 'ex acrylic nail brush kolinsky black handle size 10', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (141, 'Ex acrylic nail brush kolinsky size 06', 'ex acrylic nail brush kolinsky size 06', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (142, 'Ex acrylic nail brush kolinsky size 08', 'ex acrylic nail brush kolinsky size 08', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (143, 'Ex acrylic nail brush kolinsky size 10', 'ex acrylic nail brush kolinsky size 10', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (144, 'Ex acrylic nail brush kolinsky size 12', 'ex acrylic nail brush kolinsky size 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (145, 'Ex acrylic nail brush kolinsky size 14', 'ex acrylic nail brush kolinsky size 14', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (146, 'Ex acrylic nail brush kolinsky size 20', 'ex acrylic nail brush kolinsky size 20', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (147, 'Fanta Sea Eyebrow Hair Removal Waxing Wax Strips 100 SmFSC619', 'fanta sea eyebrow hair removal waxing wax strips 100 smfsc619', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (148, 'Fiori Shine Buffer 30 pcs Sheet #10624', 'fiori shine buffer 30 pcs sheet #10624', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (149, 'Foot File Callus Remover Rechargeable Machine FCR03', 'foot file callus remover rechargeable machine fcr03', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (150, 'Fung off fungus treatment', 'fung off fungus treatment', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (151, 'Fusion Shine (DIVIDE 5) Pack 12 pcs #SW-113', 'fusion shine (divide 5) pack 12 pcs #sw-113', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (152, 'Fusion Shine 2 Way Pack 12 pcs #MB-618 (12 pc)', 'fusion shine 2 way pack 12 pcs #mb-618 (12 pc)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (153, 'Fusion Shine 50 pcs Sheet', 'fusion shine 50 pcs sheet', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (154, 'Gel II 7D lamp', 'gel ii 7d lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (155, 'Gel II Top 0.5 oz', 'gel ii top 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (156, 'Gelish Blooming Gel 0.5 oz', 'gelish blooming gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (157, 'Gelish Brush on Structure gel 0.5 oz', 'gelish brush on structure gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (158, 'Gelish Brush On Foundation Flex 0.5 oz', 'gelish brush on foundation flex 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (159, 'Gelish Cream Gel 6pc Palette Act Natural #1121807', 'gelish cream gel 6pc palette act natural #1121807', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (160, 'Gelish Dip Activator 0.5 oz', 'gelish dip activator 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (161, 'Gelish Dip base 0.5 oz', 'gelish dip base 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (162, 'Gelish Dip Powder 0.8 oz', 'gelish dip powder 0.8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (163, 'Gelish French Dip Container #1620001', 'gelish french dip container #1620001', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (164, 'Gelish Gel 0.5 oz', 'gelish gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (165, 'Gelish Gel + lacquer duo', 'gelish gel + lacquer duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (166, 'Gelish Go File e-file drill', 'gelish go file e-file drill', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (167, 'Gelish Hard Gel 1.6 OZ', 'gelish hard gel 1.6 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (168, 'Gelish Lamp 18G', 'gelish lamp 18g', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (169, 'Gelish Lamp 18G unplugged', 'gelish lamp 18g unplugged', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (170, 'Gelish MINI Complete Basix Gel Nail #1221755', 'gelish mini complete basix gel nail #1221755', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (171, 'Gelish Nail Surface Cleanse 32 Oz', 'gelish nail surface cleanse 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (172, 'Gelish Polygel Slip Solution 4 OZ #1713004', 'gelish polygel slip solution 4 oz #1713004', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (173, 'Gelish Polygel spatula tool', 'gelish polygel spatula tool', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (174, 'Gelish Pro kit Salon #01789', 'gelish pro kit salon #01789', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (175, 'Gelish Soak Off Gel 6 pc Let''s Roll collection for Summer 2025 #1130100', 'gelish soak off gel 6 pc let''s roll collection for summer 2025 #1130100', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (176, 'Gelish Soft Gel Lamp Touch', 'gelish soft gel lamp touch', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (177, 'Gelish Soft gel mini lamp', 'gelish soft gel mini lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (178, 'Gelish Soft Gel Tip Adhesive 15 mL-0.5 Fl. Oz Tube #1148022', 'gelish soft gel tip adhesive 15 ml-0.5 fl. oz tube #1148022', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (179, 'Gelish Soft Gel Tip Primer 15ml /0.5 oz Bottle #1148009', 'gelish soft gel tip primer 15ml /0.5 oz bottle #1148009', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (180, 'Gelish Xpress Dip 1.5oz 43gr NEW', 'gelish xpress dip 1.5oz 43gr new', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (181, 'Gelixir Base Coat 0.5 oz', 'gelixir base coat 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (182, 'Gelixir Base Coat Gel Refill 8 oz', 'gelixir base coat gel refill 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (183, 'Gelixir Duo - 180', 'gelixir duo - 180', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (184, 'Gelixir Foil Gel 0.5 oz', 'gelixir foil gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (185, 'Gelixir Gel Only 180', 'gelixir gel only 180', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (186, 'Gelixir Gel Polish Snow White 8 oz', 'gelixir gel polish snow white 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (187, 'Gelixir Gel Top', 'gelixir gel top', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (188, 'Gelixir line art gel - B5G1', 'gelixir line art gel - b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (189, 'Gelixir No Wipe top coat 0.5 oz', 'gelixir no wipe top coat 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (190, 'Gelixir Rhinestone Glue Gel No-wipe UV/LED Clear Gel 0.36 oz', 'gelixir rhinestone glue gel no-wipe uv/led clear gel 0.36 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (191, 'Gelixir Rhinestone Glue Gel No-wipe UV/LED Clear Gel 1 oz', 'gelixir rhinestone glue gel no-wipe uv/led clear gel 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (192, 'Gelixir Soak Off Gel Matte Top Coat .5 oz / 15 mL', 'gelixir soak off gel matte top coat .5 oz / 15 ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (193, 'Gelixir Soak Off Gel Top Coat No-wipe .5 oz / 15 mL', 'gelixir soak off gel top coat no-wipe .5 oz / 15 ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (194, 'Gena Healthy Hoof Lacquer Top coat 0.5 oz #02081', 'gena healthy hoof lacquer top coat 0.5 oz #02081', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (195, 'Gena Healthy Hoof Lacquer Top coat 4oz #02082', 'gena healthy hoof lacquer top coat 4oz #02082', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (196, 'Gigi GiGi Digital Paraffin Warmer with Steel Bowl #0953', 'gigi gigi digital paraffin warmer with steel bowl #0953', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (197, 'Gigi Wax Brazilian Bikini Wax Microwave 8 oz #0912', 'gigi wax brazilian bikini wax microwave 8 oz #0912', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (198, 'Gigi Wax Brazilian Bikini Wax Microwave Kit #0911', 'gigi wax brazilian bikini wax microwave kit #0911', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (199, 'Gigi Wax Can Creme Wax For Sensitive Skin 14 oz #0260', 'gigi wax can creme wax for sensitive skin 14 oz #0260', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (200, 'GiGi Wax Can Milk Chocolate Creme Wax 14 oz #0251', 'gigi wax can milk chocolate creme wax 14 oz #0251', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (201, 'Gigi Wax Can Purpose Hard Wax - 14 oz #0332', 'gigi wax can purpose hard wax - 14 oz #0332', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (202, 'GIGI WAX PURPOSE MICROWAVE 8 OZ', 'gigi wax purpose microwave 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (203, 'Gigi Wax Creme Wax Microwave 8 OZ #0360', 'gigi wax creme wax microwave 8 oz #0360', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (204, 'Gigi Wax Hemp Microwave 7.6 OZ 0918', 'gigi wax hemp microwave 7.6 oz 0918', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (205, 'Gigi Wax Strip Free Honee Microwave Formula 8 oz #0322', 'gigi wax strip free honee microwave formula 8 oz #0322', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (206, 'Gigi Wax Warmer for 8 oz And 14 oz #0225', 'gigi wax warmer for 8 oz and 14 oz #0225', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (207, 'Glam & Glits  Acrylic (Cream) 1 oz', 'glam & glits acrylic (cream) 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (208, 'Glam Glits gel thinner', 'glam glits gel thinner', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (209, 'Glam & Glits Glow In The Dark Acrylic (Cream) 1 oz Spectra - GL2007', 'glam & glits glow in the dark acrylic (cream) 1 oz spectra - gl2007', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (210, 'Glam & Glits Glow In The Dark Acrylic (Cream) 1 oz Why So Sirius? - GL2015', 'glam & glits glow in the dark acrylic (cream) 1 oz why so sirius? - gl2015', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (211, 'GREAT GLOVE Latex Powder-Free Case 10 Box', 'great glove latex powder-free case 10 box', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (212, 'Hang Cat Eye Fashion 36 colors', 'hang cat eye fashion 36 colors', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (213, 'HANG Easy Dap Hybrid Gel 2 oz', 'hang easy dap hybrid gel 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (214, 'Hang Gel Metal Liner Gel Art Gel Silver 2 uv led 0.4 fl oz', 'hang gel metal liner gel art gel silver 2 uv led 0.4 fl oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (215, 'Hang Gelx Extend Gel Press on', 'hang gelx extend gel press on', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (216, 'Hang Gel X Flex Gel Premium Almond Short Box 12 Size 704 tips', 'hang gel x flex gel premium almond short box 12 size 704 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (217, 'Hang Gel x Rhinestone Glue No- Wipe 15ml /0.5 oz Bottle w/ thin brush', 'hang gel x rhinestone glue no- wipe 15ml /0.5 oz bottle w/ thin brush', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (218, 'Hang Gel x Tip Press On Extend Gel 15ml /0.5 oz Bottle', 'hang gel x tip press on extend gel 15ml /0.5 oz bottle', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (219, 'Hang Gel x Tip Press On Extend Gel Refill 16 oz/ 500mL', 'hang gel x tip press on extend gel refill 16 oz/ 500ml', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (220, 'Hang Gel x Tips Almond Medium 900 ct / 12 Size Natural', 'hang gel x tips almond medium 900 ct / 12 size natural', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (221, 'Hang Gel x Tips Coffin Long 600 ct / 12 Size 50945', 'hang gel x tips coffin long 600 ct / 12 size 50945', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (222, 'Hang Gel x Tips Coffin Long XL 360 ct / 12 Size', 'hang gel x tips coffin long xl 360 ct / 12 size', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (223, 'Hang Gel x Tips Coffin Medium 600ct / 12 Size 51355', 'hang gel x tips coffin medium 600ct / 12 size 51355', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (224, 'Hang Gel x Tips Coffin Short 900 ct / 12 Size', 'hang gel x tips coffin short 900 ct / 12 size', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (225, 'Hang Gel x Tips Square Long 504 ct / 10 Size', 'hang gel x tips square long 504 ct / 10 size', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (226, 'Hang Gel x Tips Square Medium 900 ct / 12 Size #23 Natural', 'hang gel x tips square medium 900 ct / 12 size #23 natural', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (227, 'Hang Gel x Tips Square Short 900 ct / 12 Size', 'hang gel x tips square short 900 ct / 12 size', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (228, 'Hang Gel x Tips Stiletto Long 600 ct / 12 Size Natural', 'hang gel x tips stiletto long 600 ct / 12 size natural', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (229, 'Hang New Chrome Powder', 'hang new chrome powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (230, 'Hang Toe tip Toe tip', 'hang toe tip toe tip', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (231, 'Harmony Gelish Gel Brush Striper Mini #01380', 'harmony gelish gel brush striper mini #01380', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (232, 'Harmony Gelish Gel Brush Square Size 6 #01383', 'harmony gelish gel brush square size 6 #01383', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (233, 'Harmony Gelish ProHesion Acrylic Nail Sculpting Liquid 32 oz #01109', 'harmony gelish prohesion acrylic nail sculpting liquid 32 oz #01109', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (234, 'Harmony Gelish ProHesion Acrylic Nail Sculpting Liquid 8 oz #01107', 'harmony gelish prohesion acrylic nail sculpting liquid 8 oz #01107', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (235, 'Harmony Gelish Soft Gel Tips Medium Coffin 550 ct #1168098', 'harmony gelish soft gel tips medium coffin 550 ct #1168098', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (236, 'Harmony Gelish Soft Gel Tips Short Round 160 ct #1270024', 'harmony gelish soft gel tips short round 160 ct #1270024', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (237, 'Harmony Gelish Xpress Dip Powder French Color Clear As Day 105G (3.7 Oz) #1661997', 'harmony gelish xpress dip powder french color clear as day 105g (3.7 oz) #1661997', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (238, 'Harmony ProHesion Nail Powder Studio Cover Warm Pink 3.7 oz', 'harmony prohesion nail powder studio cover warm pink 3.7 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (239, 'HDPE Roll Clear Plastic Bag 11x19 Case 4 Roll', 'hdpe roll clear plastic bag 11x19 case 4 roll', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (240, 'I fan white Nail Salon Table Fan nail Dry', 'i fan white nail salon table fan nail dry', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (241, 'Ibd 5 Second Brush On Nail Glue Each #54006', 'ibd 5 second brush on nail glue each #54006', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (242, 'Ibd 5 Second Brush On Nail Glue pk 12 #54006', 'ibd 5 second brush on nail glue pk 12 #54006', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (243, 'IBD 5 Second Nail Filler Powder Each #56001', 'ibd 5 second nail filler powder each #56001', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (244, 'IBD Builder gel 0.5 oz', 'ibd builder gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (245, 'IBD Builder Gel 2 oz', 'ibd builder gel 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (246, 'IBD Builder Gel 8 oz', 'ibd builder gel 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (247, 'ibd Building Gel 0.5 oz', 'ibd building gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (248, 'IBD Dehydrate PH Balance 0 .5 oz #60112', 'ibd dehydrate ph balance 0 .5 oz #60112', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (249, 'IBD Intense Seal LED/UV 0.5 oz #60505', 'ibd intense seal led/uv 0.5 oz #60505', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (250, 'IBD Just Gel -b5g1', 'ibd just gel -b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (251, 'IBD Just Gel Base Coat 0.5 oz #56503', 'ibd just gel base coat 0.5 oz #56503', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (252, 'IBD Just Gel DUO b5g1', 'ibd just gel duo b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (253, 'IBD Just Gel Mattify Top Coat 0.5 oz', 'ibd just gel mattify top coat 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (254, 'IBD Just Gel Top Coat 0.5 oz #56502', 'ibd just gel top coat 0.5 oz #56502', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (255, 'IBD Just Gel Top Coat No Cleanse 14mL/0.5 oz 0.5 oz', 'ibd just gel top coat no cleanse 14ml/0.5 oz 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (256, 'Ibd Power-bond Gel Bond .5oz/15ml #56501', 'ibd power-bond gel bond .5oz/15ml #56501', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (257, 'IBD soft gel clear solid gel tip adhesive', 'ibd soft gel clear solid gel tip adhesive', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (258, 'Igel Dip powder 2 oz', 'igel dip powder 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (259, 'Igel Duo gel & polish', 'igel duo gel & polish', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (260, 'IGEL LAMP 2.0', 'igel lamp 2.0', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (261, 'Igel Lamp 3.0', 'igel lamp 3.0', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (262, 'Igel Lamp 3.0 XXL', 'igel lamp 3.0 xxl', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (263, 'Igel Lamp Hybrid Lite', 'igel lamp hybrid lite', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (264, 'Igel No cleanse top refill 8 oz + 12 x 0.5 oz bottle', 'igel no cleanse top refill 8 oz + 12 x 0.5 oz bottle', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (265, 'Igel Trio dip, gel, polish', 'igel trio dip, gel, polish', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (266, 'Ivanca Chrome Powder', 'ivanca chrome powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (267, 'Jessica Top Gel', 'jessica top gel', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (268, 'Jessica Geleration Top & Base', 'jessica geleration top & base', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (269, 'Kat Beauty Dip powder 2 oz', 'kat beauty dip powder 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (270, 'Kiara Sky Acrylic Nail Brush Kolinsky size 10', 'kiara sky acrylic nail brush kolinsky size 10', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (271, 'Kiara Sky Acrylic Nail Brush Kolinsky size 12', 'kiara sky acrylic nail brush kolinsky size 12', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (272, 'KIARA SKY DIP POWDER 1 OZ', 'kiara sky dip powder 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (273, 'KIARA SKY DIP POWDER 10 OZ', 'kiara sky dip powder 10 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (274, 'Kiara Sky Dip Glow powder', 'kiara sky dip glow powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (275, 'Kiara Sky Dip Liquid 0.5 oz', 'kiara sky dip liquid 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (276, 'Kiara Sky Dip liquid 2 oz', 'kiara sky dip liquid 2 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (277, 'Kiara Sky Drill White', 'kiara sky drill white', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (278, 'Kiara Sky Dust Collector', 'kiara sky dust collector', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (279, 'Kiara Sky gel 0.5 oz', 'kiara sky gel 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (280, 'Kiara Sky Gel Thinner 3.4 oz', 'kiara sky gel thinner 3.4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (281, 'Kiara sky In One Dip 2 oz -b5g1', 'kiara sky in one dip 2 oz -b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (282, 'Kiara Sky Ema Liquid Monomer 16 oz', 'kiara sky ema liquid monomer 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (283, 'Kiara Sky Ema Liquid Monomer 32 oz', 'kiara sky ema liquid monomer 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (284, 'Kiara Sky In One Dip EMA Liquid Monomer Gallon KSM128', 'kiara sky in one dip ema liquid monomer gallon ksm128', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (285, 'Kiara Sky Lamp', 'kiara sky lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (286, 'Kiara Sky Nail Polish 0.5 oz', 'kiara sky nail polish 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (287, 'Kiki Wonder Top Coat No Wipe', 'kiki wonder top coat no wipe', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (288, 'ks color blend', 'ks color blend', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (289, 'KUPA CONTROL BOX', 'kupa control box', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (290, 'Kupa EnrichRx Clear 0.5 oz', 'kupa enrichrx clear 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (291, 'Kupa Handpiece kp55', 'kupa handpiece kp55', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (292, 'Kupa Lamp glo', 'kupa lamp glo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (293, 'Kupa Manipro complete set', 'kupa manipro complete set', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (294, 'Kupa Manipro Hana', 'kupa manipro hana', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (295, 'Kupa Next Passport + KP', 'kupa next passport + kp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (296, 'Kupa No Wipe Top/ Base Gel 8 oz + 3 x 0.5 oz bottle', 'kupa no wipe top/ base gel 8 oz + 3 x 0.5 oz bottle', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (297, 'Kupa No wipe top/ base/ matte 0.5 oz', 'kupa no wipe top/ base/ matte 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (298, 'Kupa Plus + Handpiece', 'kupa plus + handpiece', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (299, 'Kupa Replacement Motor Cord For kupa passport k-55', 'kupa replacement motor cord for kupa passport k-55', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (300, 'Kupa Replacement Motor Cord For kupa passport k-55A 536K32-11 / 520K41', 'kupa replacement motor cord for kupa passport k-55a 536k32-11 / 520k41', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (301, 'La Palm 7D lamp', 'la palm 7d lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (302, 'Lamour AGUILA French Bag', 'lamour aguila french bag', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (303, 'Lamour AGUILA NATURAL Bag', 'lamour aguila natural bag', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (304, 'Lamour Crystal Clear Bag', 'lamour crystal clear bag', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (305, 'Lamour EDEN NATURAL Bag', 'lamour eden natural bag', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (306, 'Lamour NATURAL Bag 50 tips', 'lamour natural bag 50 tips', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (307, 'Lamour PEARL TIP Bag', 'lamour pearl tip bag', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (308, 'Lavish Nail Polish (White/ Black)', 'lavish nail polish (white/ black)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (309, 'Layrite Cement Hair Clay Hold MITF 4.25 oz', 'layrite cement hair clay hold mitf 4.25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (310, 'Layrite Narural Matte Cream 4.25 oz', 'layrite narural matte cream 4.25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (311, 'Layrite Supershine Cream 4.25 oz', 'layrite supershine cream 4.25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (312, 'Lechat Gelos gel thinner 1 oz', 'lechat gelos gel thinner 1 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (313, 'Lechat Perfect Match -b5g1', 'lechat perfect match -b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (314, 'Lechat Perfect Match Dip Powder', 'lechat perfect match dip powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (315, 'Lechat Perfect Match Spectra', 'lechat perfect match spectra', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (316, 'Lechat Perfect Match 3 in 1 Dip Acrylic', 'lechat perfect match 3 in 1 dip acrylic', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (317, 'lechat Perfect Match Bond Plus 0.5 oz #PMBP1', 'lechat perfect match bond plus 0.5 oz #pmbp1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (318, 'Lechat Perfect Match Mood Dip Powder', 'lechat perfect match mood dip powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (319, 'Lechat Perfect Match Mood Duo', 'lechat perfect match mood duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (320, 'Lechat Mood Nail Polish', 'lechat mood nail polish', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (321, 'Longevity essential oil Dầu vàng Pain & Joint Box 6 pcs', 'longevity essential oil dầu vàng pain & joint box 6 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (322, 'Manicure Assorted Color Brush', 'manicure assorted color brush', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (323, 'Medicool Pro 35K drill', 'medicool pro 35k drill', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (324, 'Medicool Sanding Band 100 pcs', 'medicool sanding band 100 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (325, 'Medicool Sanding Band 10000 pcs', 'medicool sanding band 10000 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (326, 'Mia Secret ema liquid 4 oz', 'mia secret ema liquid 4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (327, 'Mia Secret ema liquid 8 oz', 'mia secret ema liquid 8 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (328, 'Mia Secret ema liquid 16 oz', 'mia secret ema liquid 16 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (329, 'Mia Secret EMA Liquid 32 oz', 'mia secret ema liquid 32 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (330, 'Monika Cuticle Nipper', 'monika cuticle nipper', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (331, 'Monika Nail File Zebra Grit 180/180 Pack 50 pcs USA F527', 'monika nail file zebra grit 180/180 pack 50 pcs usa f527', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (332, 'Morgan Taylor Lacquer B5G1', 'morgan taylor lacquer b5g1', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (333, 'Morgan Taylor Nail Lacquer New Collection', 'morgan taylor nail lacquer new collection', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (334, 'Mr. Pumice box 24 pcs', 'mr. pumice box 24 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (335, 'MT React Base Coat No-light Extended Wear Pro Kit 4oz', 'mt react base coat no-light extended wear pro kit 4oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (336, 'Nail File Mini 100/100 Zebra 50 pc/Pack #F505', 'nail file mini 100/100 zebra 50 pc/pack #f505', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (337, 'Nail File Regular 7" 100/100 White White 50 pc #F508', 'nail file regular 7" 100/100 white white 50 pc #f508', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (338, 'Nail File Regular 7" 80/100 Zebra 50 pc #F510', 'nail file regular 7" 80/100 zebra 50 pc #f510', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (339, 'Nail File Regular 7" 80/80 Zebra 50 pc #F509', 'nail file regular 7" 80/80 zebra 50 pc #f509', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (340, 'Niail File Monika 180/180 #F527', 'niail file monika 180/180 #f527', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (341, 'Nail Harmony Gelish Dip Liquid Step 4 Top Coat 0.5oz / 15ml #1640004', 'nail harmony gelish dip liquid step 4 top coat 0.5oz / 15ml #1640004', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (342, 'NAIL LACQUER THINNER 4OZ #', 'nail lacquer thinner 4oz #', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (343, 'Nail Mac Super Flex Shaft 3/32 #NM288', 'nail mac super flex shaft 3/32 #nm288', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (344, 'NAIL TEK 10 SPEED', 'nail tek 10 speed', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (345, 'Nail Tek Hydrate For Weak Severely Damaged Nails 0.5 Oz #37828', 'nail tek hydrate for weak severely damaged nails 0.5 oz #37828', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (346, 'Nail Tek Nail Nutritionist - Keratin Enriched Nail Treatment Oil 0.5 oz #55861', 'nail tek nail nutritionist - keratin enriched nail treatment oil 0.5 oz #55861', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (347, 'Nail Tek Nail Nutritionist Bamboo & Biotin 0.5 oz #65963', 'nail tek nail nutritionist bamboo & biotin 0.5 oz #65963', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (348, 'Nail Tek Nail Nutritionist Bamboo & Biotin 0.5 oz 37832', 'nail tek nail nutritionist bamboo & biotin 0.5 oz 37832', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (349, 'Nail Tek Nail Recovery Kit - For Hard, Brittle Nails - Intensive Therapy 3, Foundation 3, Renew', 'nail tek nail recovery kit - for hard, brittle nails - intensive therapy 3, foundation 3, renew', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (350, 'Nail Tek Nail Recovery Kit - For Weak, Damaged Nails - Intensive Therapy 4, Foundation 4, Renew', 'nail tek nail recovery kit - for weak, damaged nails - intensive therapy 4, foundation 4, renew', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (351, 'Nail Tek RENEW Cuticle Oil 0.5 oz #37829', 'nail tek renew cuticle oil 0.5 oz #37829', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (352, 'Nail Tek Restore Damaged Nails Kit - Intensive Therapy 2 + Foundation 2, Renew 55840', 'nail tek restore damaged nails kit - intensive therapy 2 + foundation 2, renew 55840', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (353, 'Nail Tek Ridge Filler 1 For Normal Healthy Nail 0.5 Oz #37812', 'nail tek ridge filler 1 for normal healthy nail 0.5 oz #37812', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (354, 'Nail Tek Ridge Filler 4 For Weak Severely Damaged Nails 0.5 Oz #37826', 'nail tek ridge filler 4 for weak severely damaged nails 0.5 oz #37826', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (355, 'Nail Tek Strengthen 2 For Soft Peeling Nails 0.5 OZ #37816', 'nail tek strengthen 2 for soft peeling nails 0.5 oz #37816', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (356, 'Nailtiques 0.5 oz', 'nailtiques 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (357, 'Nghia Clipper B901, 902', 'nghia clipper b901, 902', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (358, 'Nghia Cuticle Nipper D555', 'nghia cuticle nipper d555', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (359, 'Nghia Cuticle Nipper Stainless Steel D 03 Jaw 16', 'nghia cuticle nipper stainless steel d 03 jaw 16', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (360, 'Nitro magic Ombre 0.5 oz', 'nitro magic ombre 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (361, 'Nolift Nail Primer 0.75 oz', 'nolift nail primer 0.75 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (362, 'Not Polish Gel Duo', 'not polish gel duo', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (363, 'Not Polish Luxe Pro Lamp', 'not polish luxe pro lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (364, 'Not Polish Dip Powder', 'not polish dip powder', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (365, 'Olaplex No. 0 5.2 oz Spray', 'olaplex no. 0 5.2 oz spray', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (366, 'Ombre Brush round', 'ombre brush round', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (367, 'OPI Brilliant Top Coat (Disc)', 'opi brilliant top coat (disc)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (368, 'OPI Plumping Top Coat (Disc)', 'opi plumping top coat (disc)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (369, 'OPI Brush Cleaner', 'opi brush cleaner', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (370, 'OPI Crystal File', 'opi crystal file', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (371, 'OPI Dip liquid essentials base/top/activator', 'opi dip liquid essentials base/top/activator', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (372, 'OPI dip powder 1,5 oz', 'opi dip powder 1,5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (373, 'OPI dip powder 4 oz', 'opi dip powder 4 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (374, 'OPI Disposable Grit Strips - 120 grit 20 pcs', 'opi disposable grit strips - 120 grit 20 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (375, 'OPI Disposable Grit Strips - 80 grit 20 pcs', 'opi disposable grit strips - 80 grit 20 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (376, 'OPI Drip Dry Nail Lacquer Refill 27 ml / 1 oz AL711', 'opi drip dry nail lacquer refill 27 ml / 1 oz al711', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (377, 'OPI Gel Base Stay Classic', 'opi gel base stay classic', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (378, 'OPI Gel Base Stay Strong 0.5 oz', 'opi gel base stay strong 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (379, 'OPI Gel top old (original)', 'opi gel top old (original)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (380, 'OPI Gel Top Stay Shiny', 'opi gel top stay shiny', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (381, 'OPI GelColor (intelligel) 0.5 oz', 'opi gelcolor (intelligel) 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (382, 'OPI Gel color (white cap) 0.5 oz', 'opi gel color (white cap) 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (383, 'OPI Gelcolor Old (Black bottle) 0.5 oz', 'opi gelcolor old (black bottle) 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (384, 'OPI Gelevate 4 in 1 Builder Gel in a Bottle Blank Canvas #BIB006', 'opi gelevate 4 in 1 builder gel in a bottle blank canvas #bib006', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (385, 'OPI GELevate Soft Gel Extensions Box 640 pcs Almond Tip #FCT004', 'opi gelevate soft gel extensions box 640 pcs almond tip #fct004', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (386, 'OPI GELevate Soft Gel Lightning Flash Cure Gel Lamp #GL905', 'opi gelevate soft gel lightning flash cure gel lamp #gl905', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (387, 'OPI Gelevate Tip Box 640 pcs', 'opi gelevate tip box 640 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (388, 'OPI Gel Intelligel Super Gloss top/ nowipe', 'opi gel intelligel super gloss top/ nowipe', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (389, 'OPI Gel Intelligel Super Base Coat', 'opi gel intelligel super base coat', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (390, 'OPI Gel Mini 0.25 oz', 'opi gel mini 0.25 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (391, 'OPI Gel New Collection Kit 6 pcs', 'opi gel new collection kit 6 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (392, 'OPI Gel Plump Effect Top Coat 0.5 oz', 'opi gel plump effect top coat 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (393, 'OPI Hello Kitty pack 5 pcs mini', 'opi hello kitty pack 5 pcs mini', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (394, 'OPI Infinite Shine 0.5 oz', 'opi infinite shine 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (395, 'OPI Infinite shine Top/ Base 0.5 oz', 'opi infinite shine top/ base 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (396, 'OPI Lacquer 0.5 oz', 'opi lacquer 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (397, 'OPI Lacquer New Collection kit 12 pcs', 'opi lacquer new collection kit 12 pcs', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (398, 'OPI Star Light Lamp', 'opi star light lamp', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (399, 'Opi Nail Envy Natural Nail Strengthener 15ml / 0.5 fl oz #NTT60 no box', 'opi nail envy natural nail strengthener 15ml / 0.5 fl oz #ntt60 no box', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (400, 'OPI Nail Envy + Oil 0.5 oz', 'opi nail envy + oil 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (401, 'OPI Nail Envy Triflex Original/ Color 0.5 oz', 'opi nail envy triflex original/ color 0.5 oz', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (402, 'Opi Nail Envy Powerful Pink 15ml / 0.5 fl oz #NT229', 'opi nail envy powerful pink 15ml / 0.5 fl oz #nt229', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.products VALUES (403, 'OPI Nail Envy Soft & Thin (old)', 'opi nail envy soft & thin (old)', '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');


--
-- Data for Name: shopping_list_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: shopping_lists; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: supplier_prices; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.supplier_prices VALUES (693, 520, 18, 0.50, '2025-09-02 22:24:52.321397', '2025-09-02 22:24:52.321397');
INSERT INTO public.supplier_prices VALUES (389, 296, 14, 29.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (390, 297, 11, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (391, 298, 11, 295.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (392, 299, 2, 13.42, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (393, 300, 2, 13.42, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (394, 301, 3, 220.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (395, 302, 2, 0.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (396, 303, 2, 0.55, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (397, 304, 2, 0.77, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (398, 305, 2, 0.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (399, 306, 2, 0.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (400, 307, 2, 0.66, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (401, 308, 3, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (402, 308, 5, 1.60, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (403, 309, 2, 14.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (404, 310, 2, 12.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (405, 311, 2, 12.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (406, 312, 2, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (407, 313, 2, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (408, 313, 3, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (409, 313, 6, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (410, 314, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (411, 315, 2, 7.54, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (412, 315, 6, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (413, 316, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (414, 317, 2, 2.60, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (415, 318, 2, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (416, 319, 2, 6.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (417, 320, 6, 2.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (418, 321, 2, 29.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (419, 322, 2, 0.20, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (420, 323, 3, 240.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (421, 323, 5, 235.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (422, 323, 11, 240.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (423, 323, 14, 235.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (424, 324, 3, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (425, 325, 11, 245.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (426, 326, 11, 7.59, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (427, 327, 11, 11.96, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (428, 328, 2, 22.76, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (429, 329, 11, 35.94, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (430, 329, 14, 35.94, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (431, 330, 2, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (432, 331, 2, 9.19, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (433, 332, 2, 1.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (434, 332, 9, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (435, 333, 2, 2.16, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (436, 334, 6, 11.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (437, 335, 2, 8.48, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (438, 336, 2, 1.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (439, 337, 2, 4.46, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (440, 338, 2, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (441, 338, 3, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (442, 339, 2, 6.04, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (443, 340, 2, 9.19, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (444, 341, 2, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (445, 342, 2, 1.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (446, 343, 2, 35.56, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (447, 344, 9, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (448, 345, 2, 4.38, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (449, 345, 9, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (450, 346, 2, 3.31, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (451, 347, 2, 3.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (452, 348, 2, 3.31, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (453, 349, 2, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (454, 350, 2, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (455, 351, 2, 2.63, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (456, 352, 2, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (457, 352, 9, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (458, 353, 2, 3.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (459, 354, 2, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (460, 354, 9, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (461, 355, 2, 3.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (462, 355, 3, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (463, 356, 4, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (464, 356, 16, 9.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (465, 357, 3, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (466, 358, 3, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (467, 359, 2, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (468, 359, 3, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (469, 359, 6, 8.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (470, 360, 14, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (471, 361, 11, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (472, 362, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (473, 363, 5, 118.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (474, 364, 3, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (475, 365, 2, 16.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (476, 366, 15, 1.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (477, 367, 10, 5.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (478, 368, 10, 5.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (479, 369, 3, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (480, 370, 7, 6.95, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (481, 371, 11, 4.97, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (482, 371, 14, 5.04, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (483, 372, 1, 12.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (484, 372, 3, 12.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (485, 372, 4, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (486, 372, 6, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (487, 372, 7, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (488, 372, 9, 13.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (489, 372, 10, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (490, 372, 11, 10.47, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (491, 373, 1, 30.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (492, 374, 10, 11.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (493, 375, 10, 11.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (494, 376, 2, 9.03, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (495, 377, 17, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (496, 378, 14, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (497, 379, 1, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (498, 380, 5, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (499, 381, 1, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (500, 381, 2, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (501, 381, 3, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (502, 381, 4, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (503, 381, 6, 12.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (504, 381, 7, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (505, 381, 9, 11.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (506, 381, 10, 10.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (507, 381, 11, 8.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (508, 381, 12, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (509, 381, 13, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (510, 381, 17, 8.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (511, 382, 17, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (512, 383, 1, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (513, 383, 6, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (514, 384, 2, 16.24, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (515, 385, 2, 19.49, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (516, 386, 2, 60.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (517, 387, 2, 19.49, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (518, 388, 11, 5.40, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (519, 389, 17, 8.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (520, 390, 11, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (521, 391, 11, 55.56, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (522, 392, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (523, 393, 10, 6.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (524, 394, 1, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (525, 394, 3, 4.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (526, 394, 7, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (527, 394, 9, 5.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (528, 394, 10, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (529, 395, 11, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (530, 396, 1, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (531, 396, 2, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (532, 396, 3, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (533, 396, 4, 3.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (534, 396, 6, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (535, 396, 7, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (536, 396, 9, 4.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (537, 396, 10, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (538, 396, 11, 3.12, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (539, 396, 12, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (540, 396, 13, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (541, 396, 15, 3.12, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (542, 396, 17, 3.32, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (543, 397, 11, 46.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (544, 398, 1, 99.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (545, 398, 11, 103.48, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (546, 399, 2, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (547, 400, 10, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (548, 401, 11, 5.84, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (549, 401, 17, 5.51, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (550, 402, 2, 6.67, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (551, 403, 10, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (552, 404, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (553, 405, 2, 6.90, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (554, 406, 2, 3.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (555, 406, 10, 3.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (556, 407, 2, 5.79, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (557, 408, 2, 5.20, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (558, 409, 2, 6.90, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (559, 410, 10, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (560, 411, 7, 12.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (561, 412, 10, 0.90, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (562, 413, 2, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (563, 414, 11, 3.12, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (564, 415, 11, 10.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (565, 416, 2, 3.47, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (566, 417, 2, 3.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (567, 418, 2, 3.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (568, 419, 11, 11.22, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (569, 420, 11, 18.35, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (570, 421, 2, 4.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (571, 422, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (572, 423, 10, 14.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (573, 424, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (574, 424, 9, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (575, 424, 10, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (576, 425, 3, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (577, 426, 2, 4.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (578, 427, 1, 2.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (579, 427, 2, 3.32, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (580, 427, 9, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (581, 427, 10, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (582, 428, 2, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (583, 429, 2, 4.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (584, 430, 2, 4.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (585, 431, 2, 4.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (586, 432, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (587, 433, 2, 4.11, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (588, 434, 2, 4.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (589, 435, 2, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (590, 435, 9, 3.15, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (591, 436, 2, 6.28, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (592, 437, 2, 4.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (593, 438, 10, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (594, 439, 6, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (595, 439, 11, 9.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (596, 440, 2, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (597, 441, 2, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (598, 442, 1, 14.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (599, 442, 3, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (600, 443, 2, 5.18, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (601, 443, 8, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (602, 444, 2, 15.23, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (603, 445, 2, 18.42, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (604, 446, 2, 23.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (605, 447, 2, 27.37, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (606, 448, 2, 31.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (607, 449, 2, 33.60, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (608, 450, 2, 16.86, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (609, 451, 2, 1.96, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (610, 452, 2, 3.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (611, 453, 3, 125.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (612, 454, 1, 30.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (613, 454, 2, 25.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (614, 454, 6, 32.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (615, 455, 2, 11.03, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (616, 455, 4, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (617, 456, 2, 38.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (618, 456, 3, 33.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (619, 456, 12, 35.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (620, 457, 2, 38.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (621, 458, 3, 20.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (622, 459, 3, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (623, 460, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (624, 461, 3, 8.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (625, 462, 1, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (626, 462, 2, 2.36, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (627, 463, 1, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (628, 463, 2, 2.36, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (629, 464, 1, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (630, 464, 2, 2.36, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (631, 465, 1, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (632, 465, 2, 2.34, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (633, 466, 14, 25.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (634, 467, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (635, 468, 1, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (636, 469, 2, 4.20, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (637, 470, 2, 4.20, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (638, 471, 2, 3.68, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (639, 472, 2, 35.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (640, 473, 2, 2.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (641, 474, 2, 4.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (642, 475, 2, 2.92, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (643, 476, 6, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (644, 476, 11, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (645, 477, 1, 30.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (646, 478, 11, 10.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (647, 479, 2, 31.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (648, 480, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (649, 481, 3, 14.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (650, 482, 2, 2.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (651, 483, 1, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (652, 483, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (653, 484, 2, 7.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (654, 485, 2, 6.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (655, 486, 2, 8.40, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (656, 487, 2, 7.88, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (657, 488, 2, 7.88, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (658, 489, 2, 7.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (659, 490, 2, 6.83, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (660, 491, 2, 6.83, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (661, 492, 2, 7.88, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (662, 492, 10, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (663, 493, 2, 1.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (664, 494, 2, 3.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (665, 495, 2, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (666, 496, 2, 4.74, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (667, 497, 2, 4.46, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (668, 498, 2, 0.28, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (669, 499, 2, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (670, 500, 2, 0.22, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (671, 501, 2, 3.95, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (672, 502, 2, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (673, 503, 2, 0.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (674, 504, 2, 4.16, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (675, 505, 2, 4.16, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (676, 506, 2, 0.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (677, 507, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (678, 508, 11, 145.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (679, 509, 11, 78.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (680, 509, 14, 78.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (681, 510, 11, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (682, 511, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (683, 512, 2, 23.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (684, 513, 2, 24.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (685, 514, 2, 3.41, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (686, 515, 2, 3.41, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (687, 516, 6, 14.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (688, 516, 7, 15.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (689, 516, 13, 15.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (690, 517, 11, 6.57, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (691, 518, 11, 13.17, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (692, 519, 11, 34.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (1, 1, 1, 23.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (2, 2, 2, 3.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (3, 3, 2, 3.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (4, 4, 2, 3.95, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (5, 5, 3, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (6, 6, 2, 22.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (7, 6, 4, 25.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (8, 7, 2, 29.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (9, 7, 3, 33.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (10, 7, 4, 32.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (11, 8, 2, 2.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (12, 9, 5, 14.38, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (13, 10, 5, 4.30, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (14, 11, 6, 10.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (15, 12, 1, 16.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (16, 12, 6, 16.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (17, 13, 6, 18.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (18, 14, 1, 26.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (19, 15, 6, 31.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (20, 16, 6, 14.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (21, 17, 6, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (22, 18, 3, 21.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (23, 18, 6, 21.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (24, 19, 6, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (25, 20, 2, 4.39, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (26, 21, 2, 5.69, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (27, 21, 6, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (28, 22, 2, 8.77, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (29, 23, 2, 8.77, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (30, 24, 2, 8.28, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (31, 25, 2, 1.62, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (32, 26, 2, 20.53, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (33, 27, 2, 3.57, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (34, 28, 2, 50.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (35, 29, 2, 1.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (36, 30, 3, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (37, 31, 2, 6.83, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (38, 32, 2, 6.83, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (39, 33, 2, 7.88, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (40, 33, 7, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (41, 34, 2, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (42, 34, 8, 56.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (43, 35, 2, 55.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (44, 36, 2, 20.53, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (45, 37, 9, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (46, 38, 2, 2.63, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (47, 39, 2, 3.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (48, 40, 1, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (49, 40, 2, 3.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (50, 40, 3, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (51, 40, 6, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (52, 41, 2, 4.44, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (53, 42, 2, 8.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (54, 42, 6, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (55, 43, 2, 6.67, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (56, 44, 2, 1.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (57, 44, 6, 1.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (58, 44, 10, 2.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (59, 45, 2, 8.17, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (60, 46, 2, 38.08, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (61, 47, 2, 4.44, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (62, 48, 5, 5.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (63, 49, 2, 3.98, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (64, 50, 2, 5.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (65, 51, 6, 50.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (66, 52, 2, 4.20, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (67, 53, 2, 4.67, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (68, 54, 2, 5.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (69, 55, 2, 5.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (70, 56, 2, 5.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (71, 57, 2, 5.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (72, 58, 2, 2.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (73, 59, 2, 5.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (74, 60, 2, 3.73, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (75, 61, 2, 5.62, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (76, 62, 3, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (77, 63, 1, 24.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (78, 64, 9, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (79, 65, 11, 3.19, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (80, 66, 1, 95.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (81, 66, 11, 94.12, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (82, 67, 4, 12.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (83, 67, 9, 12.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (84, 68, 9, 13.65, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (85, 69, 6, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (86, 69, 9, 3.85, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (87, 70, 11, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (88, 71, 9, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (89, 72, 3, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (90, 72, 11, 7.31, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (91, 73, 6, 18.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (92, 73, 11, 16.09, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (93, 74, 6, 75.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (94, 75, 9, 16.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (95, 76, 11, 19.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (96, 77, 11, 30.13, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (97, 78, 11, 42.69, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (98, 79, 1, 118.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (99, 80, 2, 3.76, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (100, 81, 3, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (101, 81, 6, 9.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (102, 81, 9, 9.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (103, 81, 10, 9.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (104, 81, 12, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (105, 82, 9, 7.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (106, 83, 9, 8.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (107, 83, 11, 8.26, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (108, 84, 11, 13.02, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (109, 85, 9, 21.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (110, 86, 6, 30.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (111, 87, 3, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (112, 87, 9, 10.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (113, 88, 9, 12.60, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (114, 89, 9, 34.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (115, 90, 9, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (116, 91, 9, 4.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (117, 92, 6, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (118, 93, 6, 1.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (119, 93, 7, 1.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (120, 93, 9, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (121, 94, 6, 3.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (122, 95, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (123, 95, 6, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (124, 96, 1, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (125, 96, 3, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (126, 97, 5, 105.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (127, 98, 3, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (128, 98, 9, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (129, 99, 9, 2.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (130, 100, 6, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (131, 101, 9, 20.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (132, 102, 2, 1.84, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (133, 103, 2, 2.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (134, 104, 4, 2.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (135, 105, 1, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (136, 105, 2, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (137, 105, 3, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (138, 105, 4, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (139, 105, 5, 3.53, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (140, 105, 13, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (141, 106, 1, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (142, 107, 2, 2.59, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (143, 108, 2, 2.63, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (144, 109, 2, 2.63, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (145, 110, 2, 2.63, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (146, 111, 2, 2.54, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (147, 112, 2, 3.90, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (148, 113, 6, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (149, 114, 4, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (150, 114, 5, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (151, 115, 2, 3.96, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (152, 116, 1, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (153, 116, 4, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (154, 117, 4, 105.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (155, 118, 1, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (156, 118, 2, 4.60, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (157, 118, 3, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (158, 118, 4, 3.20, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (159, 118, 5, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (160, 118, 6, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (161, 118, 7, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (162, 119, 5, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (163, 120, 1, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (164, 121, 4, 33.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (165, 122, 5, 40.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (166, 123, 4, 42.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (167, 124, 2, 2.42, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (168, 125, 2, 2.94, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (169, 126, 2, 3.53, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (170, 127, 14, 17.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (171, 128, 14, 40.83, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (172, 129, 2, 3.94, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (173, 130, 2, 43.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (174, 131, 2, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (175, 132, 2, 3.15, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (176, 133, 2, 29.98, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (177, 134, 2, 4.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (178, 135, 2, 4.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (179, 136, 2, 4.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (180, 137, 2, 4.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (181, 137, 3, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (182, 137, 7, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (183, 137, 9, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (184, 137, 10, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (185, 138, 10, 10.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (186, 139, 2, 3.15, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (187, 139, 9, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (188, 139, 10, 3.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (189, 140, 2, 14.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (190, 141, 2, 3.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (191, 142, 2, 12.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (192, 143, 2, 14.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (193, 144, 2, 17.37, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (194, 145, 2, 10.28, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (195, 146, 2, 30.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (196, 147, 2, 1.30, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (197, 148, 2, 3.58, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (198, 149, 2, 35.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (199, 150, 6, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (200, 151, 2, 6.95, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (201, 152, 2, 6.95, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (202, 153, 2, 5.79, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (203, 154, 4, 240.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (204, 155, 6, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (205, 156, 1, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (206, 157, 2, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (207, 157, 11, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (208, 158, 2, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (209, 158, 11, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (210, 159, 2, 7.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (211, 160, 14, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (212, 161, 11, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (213, 161, 14, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (214, 162, 1, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (215, 162, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (216, 162, 6, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (217, 163, 2, 4.39, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (218, 164, 1, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (219, 164, 2, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (220, 164, 3, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (221, 164, 6, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (222, 164, 7, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (223, 164, 9, 8.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (224, 164, 12, 9.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (225, 164, 13, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (226, 164, 15, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (227, 165, 12, 11.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (228, 166, 5, 180.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (229, 166, 14, 175.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (230, 167, 2, 16.30, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (231, 167, 9, 23.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (232, 169, 11, 165.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (233, 170, 2, 18.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (234, 171, 2, 11.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (235, 172, 2, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (236, 173, 2, 12.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (237, 174, 7, 150.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (238, 175, 2, 43.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (239, 176, 1, 50.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (240, 176, 3, 50.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (241, 177, 1, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (242, 178, 2, 6.86, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (243, 179, 2, 2.62, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (244, 180, 2, 5.87, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (245, 181, 14, 2.52, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (246, 182, 2, 23.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (247, 183, 1, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (248, 183, 2, 3.89, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (249, 183, 3, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (250, 183, 6, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (251, 184, 2, 2.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (252, 185, 2, 2.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (253, 186, 2, 23.33, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (254, 187, 1, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (255, 188, 2, 2.22, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (256, 189, 14, 2.52, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (257, 190, 2, 2.22, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (258, 191, 2, 3.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (259, 192, 2, 2.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (260, 193, 2, 2.70, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (261, 194, 2, 1.53, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (262, 195, 2, 4.47, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (263, 196, 2, 96.80, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (264, 197, 2, 6.05, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (265, 198, 2, 8.92, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (266, 199, 2, 7.88, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (267, 200, 2, 7.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (268, 201, 2, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (269, 202, 2, 5.13, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (270, 202, 6, 8.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (271, 203, 2, 6.04, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (272, 204, 2, 6.04, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (273, 205, 2, 6.05, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (274, 206, 2, 17.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (275, 207, 2, 3.68, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (276, 207, 3, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (277, 207, 9, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (278, 208, 3, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (279, 209, 2, 6.30, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (280, 210, 2, 6.30, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (281, 211, 2, 33.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (282, 212, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (283, 213, 2, 7.78, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (284, 214, 2, 4.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (285, 215, 2, 6.84, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (286, 216, 2, 13.68, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (287, 217, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (288, 217, 3, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (289, 218, 2, 6.32, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (290, 219, 2, 90.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (291, 220, 2, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (292, 221, 2, 9.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (293, 222, 2, 8.40, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (294, 223, 2, 9.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (295, 224, 2, 9.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (296, 225, 2, 10.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (297, 225, 3, 14.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (298, 226, 2, 9.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (299, 227, 2, 9.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (300, 228, 2, 9.45, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (301, 229, 2, 7.22, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (302, 229, 3, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (303, 230, 2, 1.67, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (304, 231, 2, 6.79, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (305, 232, 2, 8.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (306, 233, 2, 24.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (307, 234, 2, 15.72, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (308, 235, 2, 15.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (309, 236, 2, 5.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (310, 237, 2, 16.79, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (311, 238, 2, 10.61, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (312, 239, 2, 15.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (313, 240, 2, 12.08, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (314, 241, 2, 1.42, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (315, 242, 2, 17.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (316, 243, 2, 1.21, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (317, 244, 14, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (318, 245, 11, 11.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (319, 245, 14, 11.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (320, 246, 14, 24.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (321, 247, 2, 6.05, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (322, 247, 6, 6.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (323, 248, 2, 3.12, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (324, 249, 2, 4.95, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (325, 250, 2, 3.15, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (326, 250, 3, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (327, 250, 6, 4.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (328, 250, 7, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (329, 251, 2, 4.28, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (330, 252, 2, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (331, 252, 12, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (332, 253, 2, 3.71, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (333, 254, 2, 4.28, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (334, 255, 2, 4.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (335, 256, 2, 3.25, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (336, 257, 2, 10.07, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (337, 258, 1, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (338, 258, 3, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (339, 259, 5, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (340, 259, 14, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (341, 260, 4, 130.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (342, 261, 3, 130.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (343, 262, 3, 140.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (344, 263, 1, 65.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (345, 264, 5, 40.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (346, 265, 3, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (347, 266, 1, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (348, 267, 1, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (349, 268, 10, 22.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (350, 269, 3, 5.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (351, 270, 2, 23.10, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (352, 271, 11, 25.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (353, 272, 6, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (354, 272, 9, 8.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (355, 273, 11, 44.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (356, 274, 2, 7.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (357, 275, 11, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (358, 276, 3, 13.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (359, 277, 11, 235.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (360, 278, 11, 180.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (361, 279, 7, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (362, 279, 9, 6.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (363, 279, 13, 5.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (364, 280, 11, 7.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (365, 281, 2, 9.98, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (366, 281, 9, 11.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (367, 282, 11, 15.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (368, 283, 11, 26.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (369, 284, 2, 95.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (370, 284, 11, 90.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (371, 285, 1, 130.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (372, 285, 11, 140.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (373, 286, 9, 2.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (374, 287, 2, 3.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (375, 288, 9, 11.50, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (376, 289, 9, 93.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (377, 290, 14, 5.75, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (378, 291, 5, 180.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (379, 291, 14, 180.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (380, 292, 1, 150.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (381, 293, 3, 270.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (382, 293, 5, 260.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (383, 293, 11, 265.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (384, 293, 14, 260.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (385, 294, 3, 290.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (386, 294, 11, 265.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (387, 295, 11, 275.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');
INSERT INTO public.supplier_prices VALUES (388, 296, 11, 29.00, '2025-08-24 14:35:44.730356', '2025-08-24 14:35:44.730356');


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.suppliers VALUES (1, 'USA', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (2, 'BEAUTY ZONE', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (3, 'GEL NAILS', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (4, 'CALI ', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (5, 'NAILCOST', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (6, 'KASHI', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (7, 'KAREN', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (8, 'Phuong Oanh', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (9, 'BOLSA', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (10, 'IMPERIAL', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (11, 'SKYLINE', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (12, 'cali 2', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (13, 'WHALE', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (14, 'B.PAGE', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (15, 'TSUPPLIES', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (16, 'Nailtiques', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (17, 'NICHE', '2025-08-24 14:35:44.730356');
INSERT INTO public.suppliers VALUES (18, 'Home', '2025-09-02 22:24:32.772117');


--
-- Name: matching_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.matching_preferences_id_seq', 281, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 520, true);


--
-- Name: shopping_list_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shopping_list_items_id_seq', 1, true);


--
-- Name: shopping_lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shopping_lists_id_seq', 1, true);


--
-- Name: supplier_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_prices_id_seq', 693, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 18, true);


--
-- Name: matching_preferences matching_preferences_original_item_matched_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_preferences
    ADD CONSTRAINT matching_preferences_original_item_matched_product_id_key UNIQUE (original_item, matched_product_id);


--
-- Name: matching_preferences matching_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_preferences
    ADD CONSTRAINT matching_preferences_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: shopping_list_items shopping_list_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_list_items
    ADD CONSTRAINT shopping_list_items_pkey PRIMARY KEY (id);


--
-- Name: shopping_list_items shopping_list_items_shopping_list_id_item_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_list_items
    ADD CONSTRAINT shopping_list_items_shopping_list_id_item_index_key UNIQUE (shopping_list_id, item_index);


--
-- Name: shopping_lists shopping_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_pkey PRIMARY KEY (id);


--
-- Name: shopping_lists shopping_lists_share_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_share_id_key UNIQUE (share_id);


--
-- Name: supplier_prices supplier_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_prices
    ADD CONSTRAINT supplier_prices_pkey PRIMARY KEY (id);


--
-- Name: supplier_prices supplier_prices_product_id_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_prices
    ADD CONSTRAINT supplier_prices_product_id_supplier_id_key UNIQUE (product_id, supplier_id);


--
-- Name: suppliers suppliers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_key UNIQUE (name);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: idx_products_description; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_description ON public.products USING gin (to_tsvector('english'::regconfig, description));


--
-- Name: idx_products_normalized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_normalized ON public.products USING btree (normalized_description);


--
-- Name: idx_shopping_list_items_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_list_items_list_id ON public.shopping_list_items USING btree (shopping_list_id);


--
-- Name: idx_shopping_list_items_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_list_items_updated_at ON public.shopping_list_items USING btree (updated_at);


--
-- Name: idx_shopping_lists_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_lists_expires_at ON public.shopping_lists USING btree (expires_at);


--
-- Name: idx_shopping_lists_share_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_lists_share_id ON public.shopping_lists USING btree (share_id);


--
-- Name: idx_supplier_prices_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_prices_product ON public.supplier_prices USING btree (product_id);


--
-- Name: idx_supplier_prices_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_prices_product_id ON public.supplier_prices USING btree (product_id);


--
-- Name: idx_supplier_prices_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_prices_supplier ON public.supplier_prices USING btree (supplier_id);


--
-- Name: idx_supplier_prices_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_prices_supplier_id ON public.supplier_prices USING btree (supplier_id);


--
-- Name: matching_preferences matching_preferences_matched_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_preferences
    ADD CONSTRAINT matching_preferences_matched_product_id_fkey FOREIGN KEY (matched_product_id) REFERENCES public.products(id);


--
-- Name: shopping_list_items shopping_list_items_shopping_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shopping_list_items
    ADD CONSTRAINT shopping_list_items_shopping_list_id_fkey FOREIGN KEY (shopping_list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;


--
-- Name: supplier_prices supplier_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_prices
    ADD CONSTRAINT supplier_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: supplier_prices supplier_prices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_prices
    ADD CONSTRAINT supplier_prices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

