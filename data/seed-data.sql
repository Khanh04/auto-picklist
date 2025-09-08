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

COPY public.matching_preferences (id, original_item, matched_product_id, frequency, last_used, created_at) FROM stdin;
18	CND PLEXIGEL Bonder, Builder, Protector Top Coat, Shaper 0.5 fl oz [Pick Any][Soft Blush]	70	1	2025-08-29 12:43:28.131308	2025-08-29 12:43:28.131308
38	OPI Crystal Nail File 5 and half inches long NIB 2025	370	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
44	CND - Shellac Combo - Ruby Ritz & Ice Vapor Great Colors For Holiday 2023	81	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
47	CND Shellac UV Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Aqua-intance]	81	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
48	CND Shellac UV Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Silhouette]	81	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
59	Nail Tek 2 Ridge Filler Intensive Therapy II For Soft, Peeling Nails 0.5oz	355	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
60	Nail Tek 2 Strengthener Intensive Therapy II For Soft, Peeling Nails 3pcs deal	355	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
19	DND DC DUO Matching Gel & Lacquer 0.5 floz/15mL #271 - Beautiful Disaster	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
20	DND DC Gel Polish UV/LED #077 - Strawberry Latte (GEL ONLY)	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
21	DND DIVA Gel Polish UV/LED 0.5fl oz/1.5 ml (PART 1 #1-250)[#007 - Stargirl (GEL ONLY)]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
22	DND DUO DIVA GEL & LACQUER #239 - Chestnut Wonders	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
23	DND DUO Matching Gel & Lacquer #535 - Rose City	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
24	DND DUO Matching Gel & Lacquer #705 - Silver Dreamer	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
25	DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#604 - Cool Gray]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
26	DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#615 - Honey Beige]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
27	DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#633 - Garnet Red]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
28	DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#654 - Pumpkin Spice]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
29	DND DUO Matching Gel & Lacquer *Pick Any* (PART 2 #601-799)[#753 - Scarlett Dreams]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
30	DND Diva Nail Lacquer DV227 - R U Jelly? (LACQUER ONLY)	520	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
31	DND Duo Gel & Lacquer Clear Pink # 441 - Brand new	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
32	DND Duo Gel & Lacquer Twinkle Little Star #443	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
33	DND Duo Matching Soak-Off Gel & Nail Polish - #865 - Pearly Pink	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
78	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Love Fizz]	81	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
79	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Ruby Ritz]	81	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
142	Kupa ManiPro KP60 Replacement Cord Nail Drill Motor Cord Only K-60 with end cap	299	1	2025-09-02 23:06:44.864616	2025-09-02 23:06:44.864616
34	DND Duo Matching Soak-Off Gel & Nail Polish - #879 - Sunset Suede	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
35	DND Gel Polish UV/LED #429 - Boston University Red (GEL ONLY)	120	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
36	DND Gel Polish UV/LED #807 - Cotton Candy (GEL ONLY)	120	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
37	INM Out The Door #1 Super Fast Drying Top Coat 16oz 2025	442	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
39	OPI GelColor Intelli-Gel Polish 0.5fl.oz/15mL GCH22 Funny Bunny	381	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
40	OPI Nail Polish 0.5 fl oz - NLC89 Chocolate Moose	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
41	OPI Nail Polish 0.5 fl oz - NLF81 Living on the Boula-vard	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
42	OPI Nail Polish 0.5 fl oz - NLP40 Como se Llama?	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
43	OPI Nail Polish 0.5 fl oz - NLW58 Yank My Doodle	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
45	CND Shellac LED/UV Base Coat + Top Coat 0.25 oz - DUO Brand New in Box	83	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
46	CND Shellac Soak Off Gel Polish Negligee- 7.3mL (.25 fl oz) Rare Color	81	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
49	CND Shellac UV/LED Gel Polish Duraforce Top + Base 0.25oz Combo 2023 NIB	83	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
50	CND Vinylux Weekly Top Coat 0.5 oz/15 mL Nail Lacquer Polish Brand New Formula	94	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
51	DND DC Gel Polish UV/LED #2443 -  Sheer Sugar (Gel Only)	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
52	DND DC Gel Polish UV/LED #2452 -  Giving Classy (Gel Only)	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
53	DND DC Sheer 2024 Edition#1 NEW Collection *Pick Any*[2461 - Milky Pink]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
54	DND DUO DIVA GEL & LACQUER #253 - Gothic Grape	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
55	DND Daisy Soak Off Gel Polish Duo full size .5oz (Part 1: #401-599)[478 - Spiced Berry]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
56	DND Duo Matching Soak-Off Gel & Nail Polish - #870 - Tea Time	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
57	DND Duo Matching Soak-Off Gel & Nail Polish - #878 - Picnic For 2	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
58	GELIXIR - Soak Off UV/LED Gel - Foil Gel (Transfer Foil Gel) 15ml 0.5oz	184	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
61	Nail Tek Nail Recovery Kit Restores Damaged Nails Brand New Kit	352	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
62	OPI GelColor - GC F13 - Louvre Me Louvre Me Not Rare Color 0.5 oz	383	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
63	OPI Nail Polish 0.5 fl oz - NLF16 Tickle My France-y	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
64	OPI Nail Polish 0.5 fl oz - NLSH3 Chiffon-d of You	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
65	OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPA68 - Kiss Me I'm Brazilian]	372	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
135	DND Gel Polish UV/LED #811 - Guava (GEL ONLY)	120	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
66	OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPH012 - Emmy, Have You Seen Oscar]	372	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
67	OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPH02 - Chick Flick Cherry]	372	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
68	OPI Powder Perfection Dip Powder 43g / 1.5 oz All Colors Updated - Pick Any.[DPH70 - Aloha from OPI]	372	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
69	OPI Spring 2024 YOUR WAY Infinite Shine 0.5 fl oz/15mL NEW 9 Colors *Pick Any*[ISL139 - Get in Lime]	394	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
70	APRES GEL X - EXTEND GEL/PRIMER/BOND/TOP COAT/MATTE TOP - SELECT ITEM [Non Acid Primer]	17	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
71	CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [064]	40	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
72	CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [065]	40	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
73	CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [108]	40	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
74	CARAMIA Gel Polsih & Nail Lacquer Matching Duo 0.5oz (#01- #200) - Pick Any [129]	40	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
75	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Blue Eyeshadow]	81	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
76	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Garnet Glamour]	81	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
77	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Hollywood]	81	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
80	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Terracotta Dreams]	81	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
81	CND Shellac UV/LED Gel Polish 0.25 oz - Fulline Part 1 *Pick Any*[Tropix]	81	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
82	DND - Gel Polish & Matching Nail Lacquer - 601 BALLET PINK 0.5 oz/ 15 mL	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
83	DND 2023 Super Glitter Soak Off Gel-Polish Duo .5oz LED/UV #893 - 929- Pick Any[897 - Knotty or Nice]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
84	DND DC DUO Matching Gel & Lacquer 0.5 floz/15mL #005 - Neon Pink	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
85	DND DC DUO Matching Gel & Lacquer 0.5 floz/15mL #008 - NY Islanders	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
86	DND DC Gel Polish UV/LED #2439 -  Milky White (Gel Only)	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
87	DND DC Gel Polish UV/LED 883 Candy Kisses (GEL ONLY)	120	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
88	DND DC Mermaid Glitter Gel 0.5 oz LED/UV DND Gel Polish - Pick Any.[250 - Darkindigo]	114	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
89	DND DC Mermaid Glitter Gel 0.5 oz LED/UV DND Gel Polish - Pick Any.[DC No Cleanse Top]	114	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
90	DND DC Platinum Glitter Gel Polish #214 - Paparazzi	114	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
91	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[004 - Pink Lemonade]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
92	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[007 - Canadian Maple]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
93	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[015 - Pink Daisy]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
94	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[052 - Walnut Brown]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
95	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[059 - Sheer Pink]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
96	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[061 - Wineberry]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
97	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[063 - Shocking Orange]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
98	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[146 - Icy Pink]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
99	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[254 - Forest Green]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
100	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[279 - Coral Bells]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
101	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New - Pick Any Color[319 - Coffee Bean]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
102	DND DC Soak Off Gel Polish Duo #001 - #319 .6oz LED/UV New colors - Pick Any[156 - Wild Rose]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
103	DND DC Soak Off Gel Polish Duo #2439 - Milky White	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
104	DND DC Soak Off Gel Polish Duo #320 - #2543 LED/UV New - Pick Any Color[2448 - Have Mercy]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
105	DND DC Super Platinum Gel Only 2023 Collection 0.6 oz - Pick Any[938 - Copper Fireside]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
106	DND DUO DIVA COLLECTION MATCHING GEL & LACQUER #1-250 *PART 1 - Pick Any*[246 - Blue Lagoon]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
107	DND DUO Matching Gel & Lacquer #447 - Black Licorice	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
108	DND DUO Matching Gel & Lacquer #456 - Cherry Berry	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
109	DND DUO Matching Gel & Lacquer #774 - Gypsy Light	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
110	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[405 - Lush Lilac Star]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
111	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[407 - Black Diamond Star]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
112	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[421 - Rose Petal]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
113	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[445 - Melting Violet]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
114	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[446 - Woodlake]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
115	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[447 - Black Licorice]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
116	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[607 - Hazelnut]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
117	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[633 - Garnet Red]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
118	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #401- #645 (Part 1) - Pick Any.[637 - Lucky Red]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
119	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[663 - Lavender Pop]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
120	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[683 - Cinder Shoes]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
121	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[751 - Cherry Mocha]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
122	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[757 - Chili Pepper]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
123	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[776 - Ice Ice Baby]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
124	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[856 - Ivory Cream]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
125	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[861 - Tie The Knot]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
126	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[862 - Pearly Ice]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
127	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[864 - Nude Escape]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
128	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[867 - Perfect Nude]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
129	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[876 - Flower Girl]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
130	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[895 - Disco Daydream]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
131	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[899 - Berry Jazz]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
132	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[922 - Berrylicious]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
133	DND Daisy Soak Off Gel-Polish Duo .5oz LED/UV #646- #899 (Part 2) - Pick Any.[928 - Bronzed Era]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
134	DND Gel Polish Duo Sheer Collection #856 - 892 New Collection 2024 - Pick Any[#885 - Rebel Rose]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
136	DND Gel Polish UV/LED 0.5fl oz/1.5 ml *Pick Any* (PART 1 #401-599) (Gel only)[#447 - Black Licorice]	120	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
137	DND New Colors 2020 Soak Off Gel-Polish Duo .5oz LED/UV #711 - 782 - Pick Any..[751 - Cherry Mocha]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
138	DND New Colors 2020 Soak Off Gel-Polish Duo .5oz LED/UV #711 - 782 - Pick Any..[756 - Bonfire]	118	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
139	FUNG-OFF� Special Nail Conditioner For Nail Fungus Treatment 0.5 Oz	150	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
140	Gelish Soak-Off Gel Polish 0.5 fl oz/15mL 1110910 - HOLIDAY PARTY BLUES	164	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
141	Kiara Sky Gel Polish 15 ml/0.5 fl oz - #401 - #650 Most Current update![629 GIVE ME SPACE]	279	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
143	LECHAT PERFECT MATCH METALLUX COLLECTION CHROME GEL + LAC DUO[S05 - Hypnotic]	315	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
144	LECHAT PERFECT MATCH METALLUX GEL+LAC DUO 2018 COLLECTION UPDATED *PICK ANY*[MLMS10 - Phoenix Rise]	315	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
145	OPI "What's Your Mani-tude" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F025 - Slip Dressed Up]	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
146	OPI "What's Your Mani-tude" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F026 - Band Tease]	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
147	OPI "What's Your Mani-tude" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F029 - Cargo All Out]	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
148	OPI "What's Your Mani-tude" Nail Lacquer Fall 2025 Collection 12pcs No Display	397	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
149	OPI Bond 007 Skyfall THE LIVING DAYLIGHTS Multi Hex Glitter Nail Polish D15 NEW!	396	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
150	OPI Matching GelColor & Nail Polish Lacquer Duo - **Pick Any**[GCE41 - Barefoot in Barcelona]	381	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
151	OPI Matching GelColor & Nail Polish Lacquer Duo - **Pick Any**[GCI64 - Aurora Berry-alis]	381	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
152	Orly Nail Lacquers 0.6oz All Colors (Update to Spring 2025) - PART 1 *Pick Any *[2000213 - Stop the Clock]	427	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
153	Orly Nail Lacquers 0.6oz All Colors (Update to Spring 2025) - PART 1 *Pick Any *[20467 - La Vida Loca]	427	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
154	Seche Base Ridge Filling Base Coat Nail Polish .5 oz	475	2	2025-09-02 23:20:12.616285	2025-09-02 23:06:44.864616
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, description, normalized_description, created_at, updated_at) FROM stdin;
520	DC/ Diva Lacquer	dc/ diva lacquer	2025-09-02 22:24:52.315326	2025-09-02 22:24:52.315326
404	Opi Nail Envy Start To Finish 15ml / 0.5 fl oz #NTT70	opi nail envy start to finish 15ml / 0.5 fl oz #ntt70	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
405	OPI Nail File Pro Sampler Pack 6 pcs #FI600	opi nail file pro sampler pack 6 pcs #fi600	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
406	OPI Nail Treatment Nail Cuticle Oil 8.6 mL - 0.29 Fl. Oz AS200	opi nail treatment nail cuticle oil 8.6 ml - 0.29 fl. oz as200	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
407	OPI Nail Treatment Cuticle Oil 0.5 oz	opi nail treatment cuticle oil 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
408	OPI N.A.S Cleansing Solution 2 oz	opi n.a.s cleansing solution 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
409	OPI Pro Sample Pack 6 pcs	opi pro sample pack 6 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
410	OPI Pro Spa Cuticle Oil togo	opi pro spa cuticle oil togo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
411	opi remover 32 oz	opi remover 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
412	OPI White file edge 240	opi white file edge 240	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
413	ORLY Base Coat One Night Stand 0.6 oz	orly base coat one night stand 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
414	Orly Bonder Base coat 0.6 oz	orly bonder base coat 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
415	Orly Bonder base coat 8 oz	orly bonder base coat 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
416	ORLY Breathable	orly breathable	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
417	ORLY Breathable Nail Treatment Calcium Boost .6 fl oz#2460002	orly breathable nail treatment calcium boost .6 fl oz#2460002	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
418	ORLY Breathable Nail Treatment Protein Boost .6 fl oz#2460001	orly breathable nail treatment protein boost .6 fl oz#2460001	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
419	Orly Builder 0.6 oz Clear	orly builder 0.6 oz clear	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
420	Orly Builder 1.2 oz/ 36 mL	orly builder 1.2 oz/ 36 ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
421	Orly Cutique Cuticle Remover 0.5 oz	orly cutique cuticle remover 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
422	Orly Flash Dry Drops 0.6 oz	orly flash dry drops 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
423	Orly Gel Bodyguard 0.6 oz	orly gel bodyguard 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
424	ORLY GEL POLISH 0.3 OZ	orly gel polish 0.3 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
425	Orly Gel polish 0.6 oz	orly gel polish 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
426	Orly in a snap top coat 0.6 oz #24320	orly in a snap top coat 0.6 oz #24320	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
427	ORLY Lacquer 0.5 OZ	orly lacquer 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
428	Orly Manicure Keeper Duo Kit 18mL for Lasting Manicures at Home	orly manicure keeper duo kit 18ml for lasting manicures at home	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
429	Orly Nail Lacquer glosser Top Coat 0.6 oz #24210	orly nail lacquer glosser top coat 0.6 oz #24210	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
430	Orly Nail Lacquer Matte top coat 0.6 oz #24250	orly nail lacquer matte top coat 0.6 oz #24250	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
431	ORLY Nail Lacquer Nail Amor 0.6 OZ #24440	orly nail lacquer nail amor 0.6 oz #24440	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
432	Orly Nail Lacquer Nailtrition 0.6 oz #24160	orly nail lacquer nailtrition 0.6 oz #24160	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
433	Orly Nail Lacquer No Bite 0.6 oz	orly nail lacquer no bite 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
434	Orly Nail Lacquer Top sec'n dry 0.6 oz #24310	orly nail lacquer top sec'n dry 0.6 oz #24310	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
435	Orly Nail Polish Thinner 2 oz #23135	orly nail polish thinner 2 oz #23135	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
436	Orly Nail Treatment Fungus MD	orly nail treatment fungus md	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
437	Orly polishield 3 in 1 top coat 0.6 oz #24270	orly polishield 3 in 1 top coat 0.6 oz #24270	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
438	Orly Primer 0.6 oz	orly primer 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
439	Orly primer 1.2 oz	orly primer 1.2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
440	Orly Pro Fx gel 0.6 oz	orly pro fx gel 0.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
441	Orly Shining Armor High Shine Top Coat 0.6 fl. oz #2410001	orly shining armor high shine top coat 0.6 fl. oz #2410001	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
442	Out the door Top Coat 16 oz	out the door top coat 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
443	Paon Seven-Eight Permanent Hair Color	paon seven-eight permanent hair color	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
444	Petal kolinsky acrylic nail brush black angle size 08	petal kolinsky acrylic nail brush black angle size 08	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
445	Petal kolinsky acrylic nail brush black angle size 12	petal kolinsky acrylic nail brush black angle size 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
446	Petal kolinsky acrylic nail brush black angle size 14	petal kolinsky acrylic nail brush black angle size 14	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
447	Petal kolinsky acrylic nail brush black angle size 16	petal kolinsky acrylic nail brush black angle size 16	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
448	Petal kolinsky acrylic nail brush black angle size 18	petal kolinsky acrylic nail brush black angle size 18	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
449	Petal kolinsky acrylic nail brush black angle size 20	petal kolinsky acrylic nail brush black angle size 20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
450	Poshe Super Fast Drying Top Coat 16 oz	poshe super fast drying top coat 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
451	Prolinc Be Natural Callus eliminator 1 oz	prolinc be natural callus eliminator 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
452	Prolinc Be Natural Callus eliminator 4 oz	prolinc be natural callus eliminator 4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
453	Pro Shaker Duo	pro shaker duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
454	Pro Tool Nail Machine 2 Way Nail Drill #275	pro tool nail machine 2 way nail drill #275	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
455	Pro-Tool Foot Control	pro-tool foot control	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
456	Pro-Tool Super Flex Shaft - Slim 1/8 in	pro-tool super flex shaft - slim 1/8 in	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
457	Pro-Tool Super Flex Shaft -Regular 1/8 in	pro-tool super flex shaft -regular 1/8 in	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
458	Pumice pad Disposable 400 pcs	pumice pad disposable 400 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
459	Pyramid Cat Eye Gel	pyramid cat eye gel	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
460	Pyramid Gel duo	pyramid gel duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
461	Pyramid Dip powder	pyramid dip powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
462	Red Nail Essential Dip Liquid #1 Bond 0.5 oz	red nail essential dip liquid #1 bond 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
463	Red Nail Essential Dip Liquid #2 Base Coat 0.5 oz	red nail essential dip liquid #2 base coat 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
464	Red Nail Essential Dip Liquid #3 Activator 0.5 oz	red nail essential dip liquid #3 activator 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
465	Red Nail Essential Dip Liquid #4 Top Coat 0.5 oz	red nail essential dip liquid #4 top coat 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
466	Red Nail essential Dip Liquid Kit 8 oz	red nail essential dip liquid kit 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
467	Retail Mini Callus Pumice Pack 40 pc #3899	retail mini callus pumice pack 40 pc #3899	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
468	Sanding Band 400 pcs	sanding band 400 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
469	Salon Callus Away Callus Remover 8 oz	salon callus away callus remover 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
470	Salon Nail Liquid Bubble Gum NL 6000 8 oz	salon nail liquid bubble gum nl 6000 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
471	Salon Pure Acetone nail remover 16 oz	salon pure acetone nail remover 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
472	Satin Smooth Paraffin Wax Warmer Spa Thermostat Control #814103	satin smooth paraffin wax warmer spa thermostat control #814103	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
473	Seche Clear Base Coat .5 fl oz #83117	seche clear base coat .5 fl oz #83117	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
474	Seche Restore Thinner Professional Kit (2 oz Restore & Dropper) 83053	seche restore thinner professional kit (2 oz restore & dropper) 83053	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
475	Seche Vite Dry Fast Top Coat Professional 0.5 oz #83100	seche vite dry fast top coat professional 0.5 oz #83100	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
476	Seche Vite Dry Top 4 oz + 0.5 oz	seche vite dry top 4 oz + 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
477	Seche Vite Top 16 oz	seche vite top 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
478	Seche Vive Instant Gel Effect Top 4 oz	seche vive instant gel effect top 4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
479	Shamrock Latex Gloves powder free (Case 10 box)	shamrock latex gloves powder free (case 10 box)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
480	SNS Dip liquid 0.5 oz	sns dip liquid 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
481	SNS Dip liquid refill 2 oz	sns dip liquid refill 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
482	Spectrum Beauty Lab Fungus treatment	spectrum beauty lab fungus treatment	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
483	ST Carbide	st carbide	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
484	Startool Carbide Nail Bit All in 1 3/32 3X Coarse	startool carbide nail bit all in 1 3/32 3x coarse	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
485	Startool Nail Carbide bit Special Shark 4X Coarse	startool nail carbide bit special shark 4x coarse	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
486	Suavecito firme clay pomade 4 oz K-P254	suavecito firme clay pomade 4 oz k-p254	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
487	Suavecito Matte Pomade 4 oz #P129NN	suavecito matte pomade 4 oz #p129nn	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
488	Suavecito Pomade Firme (Strong) Hold Pomade 4 oz K-P002	suavecito pomade firme (strong) hold pomade 4 oz k-p002	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
489	Suavecito Pomade Original Hold Pomade 4 oz K-P001	suavecito pomade original hold pomade 4 oz k-p001	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
490	Sumika Dazzling Gel	sumika dazzling gel	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
491	Sumika Pastel candy gel	sumika pastel candy gel	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
492	Sumika Twinkle Gel 24 Color B5g1	sumika twinkle gel 24 color b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
493	Tip Box Plastic Soft P.P Container	tip box plastic soft p.p container	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
494	USN Coffin Nail Tip Box 550 Tips	usn coffin nail tip box 550 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
495	USN Long Straight Crystal Clear Box 540 Tips	usn long straight crystal clear box 540 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
496	USN Nail Tip Stiletto Clear Box 540 Tips	usn nail tip stiletto clear box 540 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
497	USN Round French Box 575 Tips	usn round french box 575 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
498	USN Stiletto Clear Bag 50 pcs	usn stiletto clear bag 50 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
499	USN Stiletto Crystal Clear Box 540 Tips	usn stiletto crystal clear box 540 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
500	USN Stiletto Nail Tip Bag 50 pcs	usn stiletto nail tip bag 50 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
501	USN Stiletto Nail Tip Box 550 Tips	usn stiletto nail tip box 550 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
502	USN Straight Clear Box 540 Tips	usn straight clear box 540 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
503	USN Straight Coffin Natural Bag 50 pcs	usn straight coffin natural bag 50 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
504	USN Straight Coffin Natural Box 540 Tips	usn straight coffin natural box 540 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
505	USN Straight Natural Nail Tip Box 540 Tips	usn straight natural nail tip box 540 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
506	USN Straight Tip Natural Bag 50 pcs	usn straight tip natural bag 50 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
507	Vitamin Dip Liquid	vitamin dip liquid	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
508	Voesh Gloves/ Sock Argan box 100	voesh gloves/ sock argan box 100	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
509	Voesh Pedi In a Box 4 step box 50 pcs	voesh pedi in a box 4 step box 50 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
510	Voesh Shower Filter	voesh shower filter	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
511	Wave Gel Duo	wave gel duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
512	Wecheer Nail Drill Cordless rechargeable #WE-243	wecheer nail drill cordless rechargeable #we-243	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
513	Wecheer nail drill super manicure #WE-242	wecheer nail drill super manicure #we-242	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
514	Wonder Gel Base Coat UV/LED Cured 0.5 oz	wonder gel base coat uv/led cured 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
515	Wonder gel Top Coat no-wipe UV/LED Cured 0.5 oz	wonder gel top coat no-wipe uv/led cured 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
516	Young Nails Powder 85 gr	young nails powder 85 gr	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
517	Young Nails Protein Bond 0.25 oz	young nails protein bond 0.25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
518	Young Nails Liquid 6 oz	young nails liquid 6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
519	Young Nails Liquid 32 oz	young nails liquid 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
1	#1 Eyelash Glue	#1 eyelash glue	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
2	777 ft red wood french nail brush Dotting Tool size 8	777 ft red wood french nail brush dotting tool size 8	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
3	777 ft red wood french nail brush Dotting Tool size 10	777 ft red wood french nail brush dotting tool size 10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
4	777 ft red wood french nail brush Dotting Tool size 12	777 ft red wood french nail brush dotting tool size 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
5	7 Star Dip liquid 0.5	7 star dip liquid 0.5	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
6	Accel 2 Way Professional Rotary Tool 30000 rpm #F-275FR	accel 2 way professional rotary tool 30000 rpm #f-275fr	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
7	Accel Super Flexible Shaft 3/32 #F-275SF	accel super flexible shaft 3/32 #f-275sf	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
8	Andrea Strip Lash Twin Pack Lashes Black 33 #61793	andrea strip lash twin pack lashes black 33 #61793	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
9	Aora Chrome Bond Kit 4 oz refill	aora chrome bond kit 4 oz refill	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
10	Aora Chrome Bond 0.47 oz	aora chrome bond 0.47 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
11	Apre Gel Color	apre gel color	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
12	Apres Gel extend gold 0.5 oz/ builder gel	apres gel extend gold 0.5 oz/ builder gel	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
13	Apres Gel extend No Wipe 0.5 oz	apres gel extend no wipe 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
14	Apres Gel extend gold 1 oz	apres gel extend gold 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
15	Apres Gel extend No wipe 1 oz	apres gel extend no wipe 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
16	Apres Gel Ionic/ Jar	apres gel ionic/ jar	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
17	Apres Primer/bond/prep	apres primer/bond/prep	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
18	Apres Tip box	apres tip box	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
19	Apres Tip Refill bag	apres tip refill bag	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
20	Ardell Deluxe Pack 105 Black #66694	ardell deluxe pack 105 black #66694	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
21	Ardell Gray Magic Color Additive Cover gray 1.0 oz #780590	ardell gray magic color additive cover gray 1.0 oz #780590	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
22	Ardell Individual Naturals 6 Pack Knot Free Medium 60078	ardell individual naturals 6 pack knot free medium 60078	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
23	Ardell Individual Naturals 6 Pack Knot Free Short 60079	ardell individual naturals 6 pack knot free short 60079	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
24	Ardell Individual Naturals 6 pack Knot Free Combo	ardell individual naturals 6 pack knot free combo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
25	Ardell Natural 105 Black #65002	ardell natural 105 black #65002	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
26	B tool one way rotary tool #3699	b tool one way rotary tool #3699	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
27	Barbicide Disinfect salon tools 16 oz Pints #51610	barbicide disinfect salon tools 16 oz pints #51610	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
28	Bare Luxury Pedi 4 In1 Pack Pomelo & Hibiscus Case 48 pack #3623002	bare luxury pedi 4 in1 pack pomelo & hibiscus case 48 pack #3623002	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
29	Bare Soak Lotion Massage Ointment 3.4 fl oz 100 mL	bare soak lotion massage ointment 3.4 fl oz 100 ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
30	Ben Thanh Nipper D555	ben thanh nipper d555	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
31	Bio Seaweed Stronger Base Coat 0.5 OZ / new look	bio seaweed stronger base coat 0.5 oz / new look	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
32	Bio Seaweed Top Coat No-Wipe 0.5 oz	bio seaweed top coat no-wipe 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
33	Bio Seaweed Unity Gel -b5g1	bio seaweed unity gel -b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
34	Blue Cross Cuticle Remover Lanolin Enriched 32OZ	blue cross cuticle remover lanolin enriched 32oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
35	BST Dau khuynh diep pk 12	bst dau khuynh diep pk 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
36	Btool Rotary Tool Machine	btool rotary tool machine	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
37	BUFFER PINK SET 10	buffer pink set 10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
38	BZ NP Student Powder 2oz	bz np student powder 2oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
39	Callas Eyelash Adhesive Latex Free 0.17 fl. oz. / 5 ml	callas eyelash adhesive latex free 0.17 fl. oz. / 5 ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
40	CARAMIA Duo	caramia duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
41	Caramia Soak-off gel Top & Base Duo	caramia soak-off gel top & base duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
42	Chaun Legend Gel Polish 80 color	chaun legend gel polish 80 color	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
43	Chaun Legend Gel No Wipe Top	chaun legend gel no wipe top	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
44	China Glaze Lacquer	china glaze lacquer	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
45	Chisel Acrylic & Dipping Powder 2 oz	chisel acrylic & dipping powder 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
46	Chisel Acrylic & Dipping Powder Refill 12 oz	chisel acrylic & dipping powder refill 12 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
47	Chisel Duo Cloud	chisel duo cloud	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
48	Chisel Primer 0.5 oz	chisel primer 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
49	Chisel Super Dipping Base 0.5 oz New Bottle	chisel super dipping base 0.5 oz new bottle	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
50	Clubman Citrus Citrus Musk Cologne 12.5 oz #401900	clubman citrus citrus musk cologne 12.5 oz #401900	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
51	Clean Easy Wax warmer	clean easy wax warmer	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
52	Clean Easy Sensitive Microwave 8 oz	clean easy sensitive microwave 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
53	Clubman Country Club Shampoo 16 OZ #277200	clubman country club shampoo 16 oz #277200	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
54	Clubman Eau de Portugal Hair Tonic 12.5 oz #271300	clubman eau de portugal hair tonic 12.5 oz #271300	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
55	ClubMan Island Bay Rum 12 oz #402100	clubman island bay rum 12 oz #402100	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
56	Clubman Lilac Vegetal After Shave Lotion 12 oz #259100	clubman lilac vegetal after shave lotion 12 oz #259100	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
57	Clubman Lime Sec Cologne 12.5 fl oz #401800	clubman lime sec cologne 12.5 fl oz #401800	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
58	Clubman Molding Paste 1.7oz #66296	clubman molding paste 1.7oz #66296	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
59	Clubman Pinaud After Shave Lotion 12.5 oz #403200	clubman pinaud after shave lotion 12.5 oz #403200	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
60	Clubman Pinaud Hair Tonic 12.5 oz #276700	clubman pinaud hair tonic 12.5 oz #276700	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
61	Clubman Pinaud Lilac Vegetal After-Shave Lotion 12.5 oz #271000	clubman pinaud lilac vegetal after-shave lotion 12.5 oz #271000	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
62	CnC top 0.5 oz	cnc top 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
63	CnC top refill 8 oz	cnc top refill 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
64	cnd Air Dry 2.3 oz	cnd air dry 2.3 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
65	CND Cuticle Away 6 oz	cnd cuticle away 6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
66	CND Lamp	cnd lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
67	cnd lotion 31 oz	cnd lotion 31 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
68	CND Lotion 33 oz	cnd lotion 33 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
69	CND lotion 8.3 oz	cnd lotion 8.3 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
70	CND Luxe top (disc)	cnd luxe top (disc)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
71	CND Nail Fresh 1 oz	cnd nail fresh 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
72	CND Nail Primer 0.5 oz	cnd nail primer 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
73	CND powder 3.7 oz	cnd powder 3.7 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
74	CND powder 32 oz	cnd powder 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
75	CND RADICAL SOLAR 4 OZ	cnd radical solar 4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
76	CND Retention 8 oz	cnd retention 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
77	CND retention 16 oz	cnd retention 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
78	CND Retention 32 oz	cnd retention 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
79	CND RETENTION GALLON	cnd retention gallon	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
80	CND Ridge Fx Nail Surface enhancer 0.5 OZ	cnd ridge fx nail surface enhancer 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
81	cnd shellac 0.25 OZ	cnd shellac 0.25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
82	cnd shellac red box	cnd shellac red box	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
83	CND SHELLAC TOP/ base 0.25	cnd shellac top/ base 0.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
84	CND Shellac Top 0.5 oz	cnd shellac top 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
85	CND SKINCARE FEET 15 OZ	cnd skincare feet 15 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
86	CND Solar Oil mini pack 40	cnd solar oil mini pack 40	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
87	CND Solar oil 2.3 oz (old)	cnd solar oil 2.3 oz (old)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
88	CND Solar oil 2.3 oz new	cnd solar oil 2.3 oz new	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
89	CND Solar Speed Spray 32 oz	cnd solar speed spray 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
90	CND Solar Speed Spray 4 oz	cnd solar speed spray 4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
91	CND Stickey base 0.5 oz	cnd stickey base 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
92	CND Super Shiny Top 0.33 pk 6	cnd super shiny top 0.33 pk 6	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
93	cnd vinylux color 0.5 oz	cnd vinylux color 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
94	CND Vinylux top 0.5 oz	cnd vinylux top 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
95	Codi Lotion 25 oz	codi lotion 25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
96	Cre8tion gel 0.5 oz	cre8tion gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
97	Cre8tion Cordless lamp	cre8tion cordless lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
98	Cr8tion Special effect gel	cr8tion special effect gel	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
99	CREATIVE PLAY TOP LACQUER	creative play top lacquer	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
100	Credo Corn Cutter	credo corn cutter	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
101	CUCCIO BUTTER MILK 26 OZ	cuccio butter milk 26 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
102	Dixon buffer 3 way Purple White grit 60/100 8 pcs D14	dixon buffer 3 way purple white grit 60/100 8 pcs d14	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
103	DM Soak off Jelly Gel 48 color B5g1	dm soak off jelly gel 48 color b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
104	DND Art	dnd art	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
105	DND Dap Dip Powder 2 oz	dnd dap dip powder 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
106	DND DC Cat Eye 9D	dnd dc cat eye 9d	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
107	Dnd Dc Dip Liquid Step 1 Bonder 0.5oz / 15ml	dnd dc dip liquid step 1 bonder 0.5oz / 15ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
108	Dnd Dc Dip Liquid Step 2 Base Coat 0.5oz / 15ml	dnd dc dip liquid step 2 base coat 0.5oz / 15ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
109	Dnd Dc Dip Liquid Step 3 Activator 0.5oz / 15ml	dnd dc dip liquid step 3 activator 0.5oz / 15ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
110	Dnd Dc Dip Liquid Step 4 Top Gel 0.5oz / 15ml	dnd dc dip liquid step 4 top gel 0.5oz / 15ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
111	Dnd Dc Dip Liquid Step 5 Brush Saver 0.5oz / 15ml	dnd dc dip liquid step 5 brush saver 0.5oz / 15ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
112	DND DC Foil Gel Base 0.5 oz #400	dnd dc foil gel base 0.5 oz #400	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
113	DND DC Gel Polish duo	dnd dc gel polish duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
114	DND DC Mermaid/ Platinum/ Mood	dnd dc mermaid/ platinum/ mood	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
115	DND DC Soak off Matte Top Coat 0.5 oz #200	dnd dc soak off matte top coat 0.5 oz #200	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
116	DND Diva 9D cat eye	dnd diva 9d cat eye	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
117	DND Drill Machine	dnd drill machine	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
118	DND DUO GEL POLISH	dnd duo gel polish	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
119	DND Gel E Tip Glue 0.5 oz	dnd gel e tip glue 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
120	DND Gel only	dnd gel only	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
121	DND Glove case 1000	dnd glove case 1000	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
122	DND Refill + 12 x 0.5 oz	dnd refill + 12 x 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
123	DND Refill 16 oz + 8 x 0.5 oz	dnd refill 16 oz + 8 x 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
124	DND Soft Gel Tip Primer	dnd soft gel tip primer	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
125	DUO Adhesive Eyelash Glue Clear #568034	duo adhesive eyelash glue clear #568034	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
126	Duo Quick Set Striplash Adhesive	duo quick set striplash adhesive	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
127	Eagle Brand Green Medicated Roll on (Dầu Lăn Xanh) box 12	eagle brand green medicated roll on (dầu lăn xanh) box 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
128	Eagle Brand Medicated Oil 24 mL (dầu xanh) box 12	eagle brand medicated oil 24 ml (dầu xanh) box 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
129	Eagle Brand Medicated Oil 24 mL (dầu trang)  ea	eagle brand medicated oil 24 ml (dầu trang) ea	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
130	Electric Foot File Callus Remover Rechargeable Machine #FCR02	electric foot file callus remover rechargeable machine #fcr02	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
131	Entity Nu Bond Non-Acid Nail Primer 0.5 oz #5101153	entity nu bond non-acid nail primer 0.5 oz #5101153	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
132	Entity Soak-off Gel No Wipe Top Coat 0.5oz	entity soak-off gel no wipe top coat 0.5oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
133	Entity Success Sculpting Liquid 16 oz	entity success sculpting liquid 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
134	Essie Gel Couture Effect Top Coat Golden Era 0.46 Oz #1254	essie gel couture effect top coat golden era 0.46 oz #1254	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
135	Essie Gel Couture Effect Top Coat Silk Illusion 0.46 Oz #1255	essie gel couture effect top coat silk illusion 0.46 oz #1255	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
136	Essie Gel Couture Effect Top Coat Spectrum Glow 0.46 Oz #1256	essie gel couture effect top coat spectrum glow 0.46 oz #1256	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
137	Essie Gel Couture- b5g1	essie gel couture- b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
138	Essie Gel Polish 0.46 oz	essie gel polish 0.46 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
139	ESSIE Lacquer - b5g1	essie lacquer - b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
140	Ex acrylic nail brush kolinsky Black handle size 10	ex acrylic nail brush kolinsky black handle size 10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
141	Ex acrylic nail brush kolinsky size 06	ex acrylic nail brush kolinsky size 06	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
142	Ex acrylic nail brush kolinsky size 08	ex acrylic nail brush kolinsky size 08	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
143	Ex acrylic nail brush kolinsky size 10	ex acrylic nail brush kolinsky size 10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
144	Ex acrylic nail brush kolinsky size 12	ex acrylic nail brush kolinsky size 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
145	Ex acrylic nail brush kolinsky size 14	ex acrylic nail brush kolinsky size 14	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
146	Ex acrylic nail brush kolinsky size 20	ex acrylic nail brush kolinsky size 20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
147	Fanta Sea Eyebrow Hair Removal Waxing Wax Strips 100 SmFSC619	fanta sea eyebrow hair removal waxing wax strips 100 smfsc619	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
148	Fiori Shine Buffer 30 pcs Sheet #10624	fiori shine buffer 30 pcs sheet #10624	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
149	Foot File Callus Remover Rechargeable Machine FCR03	foot file callus remover rechargeable machine fcr03	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
150	Fung off fungus treatment	fung off fungus treatment	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
151	Fusion Shine (DIVIDE 5) Pack 12 pcs #SW-113	fusion shine (divide 5) pack 12 pcs #sw-113	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
152	Fusion Shine 2 Way Pack 12 pcs #MB-618 (12 pc)	fusion shine 2 way pack 12 pcs #mb-618 (12 pc)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
153	Fusion Shine 50 pcs Sheet	fusion shine 50 pcs sheet	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
154	Gel II 7D lamp	gel ii 7d lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
155	Gel II Top 0.5 oz	gel ii top 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
156	Gelish Blooming Gel 0.5 oz	gelish blooming gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
157	Gelish Brush on Structure gel 0.5 oz	gelish brush on structure gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
158	Gelish Brush On Foundation Flex 0.5 oz	gelish brush on foundation flex 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
159	Gelish Cream Gel 6pc Palette Act Natural #1121807	gelish cream gel 6pc palette act natural #1121807	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
160	Gelish Dip Activator 0.5 oz	gelish dip activator 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
161	Gelish Dip base 0.5 oz	gelish dip base 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
162	Gelish Dip Powder 0.8 oz	gelish dip powder 0.8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
163	Gelish French Dip Container #1620001	gelish french dip container #1620001	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
164	Gelish Gel 0.5 oz	gelish gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
165	Gelish Gel + lacquer duo	gelish gel + lacquer duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
166	Gelish Go File e-file drill	gelish go file e-file drill	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
167	Gelish Hard Gel 1.6 OZ	gelish hard gel 1.6 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
168	Gelish Lamp 18G	gelish lamp 18g	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
169	Gelish Lamp 18G unplugged	gelish lamp 18g unplugged	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
170	Gelish MINI Complete Basix Gel Nail #1221755	gelish mini complete basix gel nail #1221755	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
171	Gelish Nail Surface Cleanse 32 Oz	gelish nail surface cleanse 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
172	Gelish Polygel Slip Solution 4 OZ #1713004	gelish polygel slip solution 4 oz #1713004	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
173	Gelish Polygel spatula tool	gelish polygel spatula tool	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
174	Gelish Pro kit Salon #01789	gelish pro kit salon #01789	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
175	Gelish Soak Off Gel 6 pc Let's Roll collection for Summer 2025 #1130100	gelish soak off gel 6 pc let's roll collection for summer 2025 #1130100	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
176	Gelish Soft Gel Lamp Touch	gelish soft gel lamp touch	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
177	Gelish Soft gel mini lamp	gelish soft gel mini lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
178	Gelish Soft Gel Tip Adhesive 15 mL-0.5 Fl. Oz Tube #1148022	gelish soft gel tip adhesive 15 ml-0.5 fl. oz tube #1148022	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
179	Gelish Soft Gel Tip Primer 15ml /0.5 oz Bottle #1148009	gelish soft gel tip primer 15ml /0.5 oz bottle #1148009	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
180	Gelish Xpress Dip 1.5oz 43gr NEW	gelish xpress dip 1.5oz 43gr new	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
181	Gelixir Base Coat 0.5 oz	gelixir base coat 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
182	Gelixir Base Coat Gel Refill 8 oz	gelixir base coat gel refill 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
183	Gelixir Duo - 180	gelixir duo - 180	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
184	Gelixir Foil Gel 0.5 oz	gelixir foil gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
185	Gelixir Gel Only 180	gelixir gel only 180	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
186	Gelixir Gel Polish Snow White 8 oz	gelixir gel polish snow white 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
187	Gelixir Gel Top	gelixir gel top	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
188	Gelixir line art gel - B5G1	gelixir line art gel - b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
189	Gelixir No Wipe top coat 0.5 oz	gelixir no wipe top coat 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
190	Gelixir Rhinestone Glue Gel No-wipe UV/LED Clear Gel 0.36 oz	gelixir rhinestone glue gel no-wipe uv/led clear gel 0.36 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
191	Gelixir Rhinestone Glue Gel No-wipe UV/LED Clear Gel 1 oz	gelixir rhinestone glue gel no-wipe uv/led clear gel 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
192	Gelixir Soak Off Gel Matte Top Coat .5 oz / 15 mL	gelixir soak off gel matte top coat .5 oz / 15 ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
193	Gelixir Soak Off Gel Top Coat No-wipe .5 oz / 15 mL	gelixir soak off gel top coat no-wipe .5 oz / 15 ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
194	Gena Healthy Hoof Lacquer Top coat 0.5 oz #02081	gena healthy hoof lacquer top coat 0.5 oz #02081	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
195	Gena Healthy Hoof Lacquer Top coat 4oz #02082	gena healthy hoof lacquer top coat 4oz #02082	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
196	Gigi GiGi Digital Paraffin Warmer with Steel Bowl #0953	gigi gigi digital paraffin warmer with steel bowl #0953	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
197	Gigi Wax Brazilian Bikini Wax Microwave 8 oz #0912	gigi wax brazilian bikini wax microwave 8 oz #0912	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
198	Gigi Wax Brazilian Bikini Wax Microwave Kit #0911	gigi wax brazilian bikini wax microwave kit #0911	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
199	Gigi Wax Can Creme Wax For Sensitive Skin 14 oz #0260	gigi wax can creme wax for sensitive skin 14 oz #0260	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
200	GiGi Wax Can Milk Chocolate Creme Wax 14 oz #0251	gigi wax can milk chocolate creme wax 14 oz #0251	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
201	Gigi Wax Can Purpose Hard Wax - 14 oz #0332	gigi wax can purpose hard wax - 14 oz #0332	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
202	GIGI WAX PURPOSE MICROWAVE 8 OZ	gigi wax purpose microwave 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
203	Gigi Wax Creme Wax Microwave 8 OZ #0360	gigi wax creme wax microwave 8 oz #0360	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
204	Gigi Wax Hemp Microwave 7.6 OZ 0918	gigi wax hemp microwave 7.6 oz 0918	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
205	Gigi Wax Strip Free Honee Microwave Formula 8 oz #0322	gigi wax strip free honee microwave formula 8 oz #0322	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
206	Gigi Wax Warmer for 8 oz And 14 oz #0225	gigi wax warmer for 8 oz and 14 oz #0225	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
207	Glam & Glits  Acrylic (Cream) 1 oz	glam & glits acrylic (cream) 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
208	Glam Glits gel thinner	glam glits gel thinner	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
209	Glam & Glits Glow In The Dark Acrylic (Cream) 1 oz Spectra - GL2007	glam & glits glow in the dark acrylic (cream) 1 oz spectra - gl2007	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
210	Glam & Glits Glow In The Dark Acrylic (Cream) 1 oz Why So Sirius? - GL2015	glam & glits glow in the dark acrylic (cream) 1 oz why so sirius? - gl2015	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
211	GREAT GLOVE Latex Powder-Free Case 10 Box	great glove latex powder-free case 10 box	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
212	Hang Cat Eye Fashion 36 colors	hang cat eye fashion 36 colors	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
213	HANG Easy Dap Hybrid Gel 2 oz	hang easy dap hybrid gel 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
214	Hang Gel Metal Liner Gel Art Gel Silver 2 uv led 0.4 fl oz	hang gel metal liner gel art gel silver 2 uv led 0.4 fl oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
215	Hang Gelx Extend Gel Press on	hang gelx extend gel press on	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
216	Hang Gel X Flex Gel Premium Almond Short Box 12 Size 704 tips	hang gel x flex gel premium almond short box 12 size 704 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
217	Hang Gel x Rhinestone Glue No- Wipe 15ml /0.5 oz Bottle w/ thin brush	hang gel x rhinestone glue no- wipe 15ml /0.5 oz bottle w/ thin brush	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
218	Hang Gel x Tip Press On Extend Gel 15ml /0.5 oz Bottle	hang gel x tip press on extend gel 15ml /0.5 oz bottle	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
219	Hang Gel x Tip Press On Extend Gel Refill 16 oz/ 500mL	hang gel x tip press on extend gel refill 16 oz/ 500ml	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
220	Hang Gel x Tips Almond Medium 900 ct / 12 Size Natural	hang gel x tips almond medium 900 ct / 12 size natural	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
221	Hang Gel x Tips Coffin Long 600 ct / 12 Size 50945	hang gel x tips coffin long 600 ct / 12 size 50945	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
222	Hang Gel x Tips Coffin Long XL 360 ct / 12 Size	hang gel x tips coffin long xl 360 ct / 12 size	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
223	Hang Gel x Tips Coffin Medium 600ct / 12 Size 51355	hang gel x tips coffin medium 600ct / 12 size 51355	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
224	Hang Gel x Tips Coffin Short 900 ct / 12 Size	hang gel x tips coffin short 900 ct / 12 size	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
225	Hang Gel x Tips Square Long 504 ct / 10 Size	hang gel x tips square long 504 ct / 10 size	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
226	Hang Gel x Tips Square Medium 900 ct / 12 Size #23 Natural	hang gel x tips square medium 900 ct / 12 size #23 natural	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
227	Hang Gel x Tips Square Short 900 ct / 12 Size	hang gel x tips square short 900 ct / 12 size	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
228	Hang Gel x Tips Stiletto Long 600 ct / 12 Size Natural	hang gel x tips stiletto long 600 ct / 12 size natural	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
229	Hang New Chrome Powder	hang new chrome powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
230	Hang Toe tip Toe tip	hang toe tip toe tip	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
231	Harmony Gelish Gel Brush Striper Mini #01380	harmony gelish gel brush striper mini #01380	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
232	Harmony Gelish Gel Brush Square Size 6 #01383	harmony gelish gel brush square size 6 #01383	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
233	Harmony Gelish ProHesion Acrylic Nail Sculpting Liquid 32 oz #01109	harmony gelish prohesion acrylic nail sculpting liquid 32 oz #01109	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
234	Harmony Gelish ProHesion Acrylic Nail Sculpting Liquid 8 oz #01107	harmony gelish prohesion acrylic nail sculpting liquid 8 oz #01107	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
235	Harmony Gelish Soft Gel Tips Medium Coffin 550 ct #1168098	harmony gelish soft gel tips medium coffin 550 ct #1168098	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
236	Harmony Gelish Soft Gel Tips Short Round 160 ct #1270024	harmony gelish soft gel tips short round 160 ct #1270024	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
237	Harmony Gelish Xpress Dip Powder French Color Clear As Day 105G (3.7 Oz) #1661997	harmony gelish xpress dip powder french color clear as day 105g (3.7 oz) #1661997	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
238	Harmony ProHesion Nail Powder Studio Cover Warm Pink 3.7 oz	harmony prohesion nail powder studio cover warm pink 3.7 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
239	HDPE Roll Clear Plastic Bag 11x19 Case 4 Roll	hdpe roll clear plastic bag 11x19 case 4 roll	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
240	I fan white Nail Salon Table Fan nail Dry	i fan white nail salon table fan nail dry	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
241	Ibd 5 Second Brush On Nail Glue Each #54006	ibd 5 second brush on nail glue each #54006	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
242	Ibd 5 Second Brush On Nail Glue pk 12 #54006	ibd 5 second brush on nail glue pk 12 #54006	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
243	IBD 5 Second Nail Filler Powder Each #56001	ibd 5 second nail filler powder each #56001	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
244	IBD Builder gel 0.5 oz	ibd builder gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
245	IBD Builder Gel 2 oz	ibd builder gel 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
246	IBD Builder Gel 8 oz	ibd builder gel 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
247	ibd Building Gel 0.5 oz	ibd building gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
248	IBD Dehydrate PH Balance 0 .5 oz #60112	ibd dehydrate ph balance 0 .5 oz #60112	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
249	IBD Intense Seal LED/UV 0.5 oz #60505	ibd intense seal led/uv 0.5 oz #60505	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
250	IBD Just Gel -b5g1	ibd just gel -b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
251	IBD Just Gel Base Coat 0.5 oz #56503	ibd just gel base coat 0.5 oz #56503	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
252	IBD Just Gel DUO b5g1	ibd just gel duo b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
253	IBD Just Gel Mattify Top Coat 0.5 oz	ibd just gel mattify top coat 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
254	IBD Just Gel Top Coat 0.5 oz #56502	ibd just gel top coat 0.5 oz #56502	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
255	IBD Just Gel Top Coat No Cleanse 14mL/0.5 oz 0.5 oz	ibd just gel top coat no cleanse 14ml/0.5 oz 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
256	Ibd Power-bond Gel Bond .5oz/15ml #56501	ibd power-bond gel bond .5oz/15ml #56501	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
257	IBD soft gel clear solid gel tip adhesive	ibd soft gel clear solid gel tip adhesive	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
258	Igel Dip powder 2 oz	igel dip powder 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
259	Igel Duo gel & polish	igel duo gel & polish	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
260	IGEL LAMP 2.0	igel lamp 2.0	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
261	Igel Lamp 3.0	igel lamp 3.0	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
262	Igel Lamp 3.0 XXL	igel lamp 3.0 xxl	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
263	Igel Lamp Hybrid Lite	igel lamp hybrid lite	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
264	Igel No cleanse top refill 8 oz + 12 x 0.5 oz bottle	igel no cleanse top refill 8 oz + 12 x 0.5 oz bottle	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
265	Igel Trio dip, gel, polish	igel trio dip, gel, polish	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
266	Ivanca Chrome Powder	ivanca chrome powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
267	Jessica Top Gel	jessica top gel	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
268	Jessica Geleration Top & Base	jessica geleration top & base	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
269	Kat Beauty Dip powder 2 oz	kat beauty dip powder 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
270	Kiara Sky Acrylic Nail Brush Kolinsky size 10	kiara sky acrylic nail brush kolinsky size 10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
271	Kiara Sky Acrylic Nail Brush Kolinsky size 12	kiara sky acrylic nail brush kolinsky size 12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
272	KIARA SKY DIP POWDER 1 OZ	kiara sky dip powder 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
273	KIARA SKY DIP POWDER 10 OZ	kiara sky dip powder 10 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
274	Kiara Sky Dip Glow powder	kiara sky dip glow powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
275	Kiara Sky Dip Liquid 0.5 oz	kiara sky dip liquid 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
276	Kiara Sky Dip liquid 2 oz	kiara sky dip liquid 2 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
277	Kiara Sky Drill White	kiara sky drill white	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
278	Kiara Sky Dust Collector	kiara sky dust collector	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
279	Kiara Sky gel 0.5 oz	kiara sky gel 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
280	Kiara Sky Gel Thinner 3.4 oz	kiara sky gel thinner 3.4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
281	Kiara sky In One Dip 2 oz -b5g1	kiara sky in one dip 2 oz -b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
282	Kiara Sky Ema Liquid Monomer 16 oz	kiara sky ema liquid monomer 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
283	Kiara Sky Ema Liquid Monomer 32 oz	kiara sky ema liquid monomer 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
284	Kiara Sky In One Dip EMA Liquid Monomer Gallon KSM128	kiara sky in one dip ema liquid monomer gallon ksm128	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
285	Kiara Sky Lamp	kiara sky lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
286	Kiara Sky Nail Polish 0.5 oz	kiara sky nail polish 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
287	Kiki Wonder Top Coat No Wipe	kiki wonder top coat no wipe	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
288	ks color blend	ks color blend	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
289	KUPA CONTROL BOX	kupa control box	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
290	Kupa EnrichRx Clear 0.5 oz	kupa enrichrx clear 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
291	Kupa Handpiece kp55	kupa handpiece kp55	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
292	Kupa Lamp glo	kupa lamp glo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
293	Kupa Manipro complete set	kupa manipro complete set	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
294	Kupa Manipro Hana	kupa manipro hana	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
295	Kupa Next Passport + KP	kupa next passport + kp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
296	Kupa No Wipe Top/ Base Gel 8 oz + 3 x 0.5 oz bottle	kupa no wipe top/ base gel 8 oz + 3 x 0.5 oz bottle	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
297	Kupa No wipe top/ base/ matte 0.5 oz	kupa no wipe top/ base/ matte 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
298	Kupa Plus + Handpiece	kupa plus + handpiece	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
299	Kupa Replacement Motor Cord For kupa passport k-55	kupa replacement motor cord for kupa passport k-55	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
300	Kupa Replacement Motor Cord For kupa passport k-55A 536K32-11 / 520K41	kupa replacement motor cord for kupa passport k-55a 536k32-11 / 520k41	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
301	La Palm 7D lamp	la palm 7d lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
302	Lamour AGUILA French Bag	lamour aguila french bag	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
303	Lamour AGUILA NATURAL Bag	lamour aguila natural bag	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
304	Lamour Crystal Clear Bag	lamour crystal clear bag	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
305	Lamour EDEN NATURAL Bag	lamour eden natural bag	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
306	Lamour NATURAL Bag 50 tips	lamour natural bag 50 tips	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
307	Lamour PEARL TIP Bag	lamour pearl tip bag	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
308	Lavish Nail Polish (White/ Black)	lavish nail polish (white/ black)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
309	Layrite Cement Hair Clay Hold MITF 4.25 oz	layrite cement hair clay hold mitf 4.25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
310	Layrite Narural Matte Cream 4.25 oz	layrite narural matte cream 4.25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
311	Layrite Supershine Cream 4.25 oz	layrite supershine cream 4.25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
312	Lechat Gelos gel thinner 1 oz	lechat gelos gel thinner 1 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
313	Lechat Perfect Match -b5g1	lechat perfect match -b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
314	Lechat Perfect Match Dip Powder	lechat perfect match dip powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
315	Lechat Perfect Match Spectra	lechat perfect match spectra	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
316	Lechat Perfect Match 3 in 1 Dip Acrylic	lechat perfect match 3 in 1 dip acrylic	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
317	lechat Perfect Match Bond Plus 0.5 oz #PMBP1	lechat perfect match bond plus 0.5 oz #pmbp1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
318	Lechat Perfect Match Mood Dip Powder	lechat perfect match mood dip powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
319	Lechat Perfect Match Mood Duo	lechat perfect match mood duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
320	Lechat Mood Nail Polish	lechat mood nail polish	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
321	Longevity essential oil Dầu vàng Pain & Joint Box 6 pcs	longevity essential oil dầu vàng pain & joint box 6 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
322	Manicure Assorted Color Brush	manicure assorted color brush	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
323	Medicool Pro 35K drill	medicool pro 35k drill	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
324	Medicool Sanding Band 100 pcs	medicool sanding band 100 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
325	Medicool Sanding Band 10000 pcs	medicool sanding band 10000 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
326	Mia Secret ema liquid 4 oz	mia secret ema liquid 4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
327	Mia Secret ema liquid 8 oz	mia secret ema liquid 8 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
328	Mia Secret ema liquid 16 oz	mia secret ema liquid 16 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
329	Mia Secret EMA Liquid 32 oz	mia secret ema liquid 32 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
330	Monika Cuticle Nipper	monika cuticle nipper	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
331	Monika Nail File Zebra Grit 180/180 Pack 50 pcs USA F527	monika nail file zebra grit 180/180 pack 50 pcs usa f527	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
332	Morgan Taylor Lacquer B5G1	morgan taylor lacquer b5g1	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
333	Morgan Taylor Nail Lacquer New Collection	morgan taylor nail lacquer new collection	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
334	Mr. Pumice box 24 pcs	mr. pumice box 24 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
335	MT React Base Coat No-light Extended Wear Pro Kit 4oz	mt react base coat no-light extended wear pro kit 4oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
336	Nail File Mini 100/100 Zebra 50 pc/Pack #F505	nail file mini 100/100 zebra 50 pc/pack #f505	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
337	Nail File Regular 7" 100/100 White White 50 pc #F508	nail file regular 7" 100/100 white white 50 pc #f508	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
338	Nail File Regular 7" 80/100 Zebra 50 pc #F510	nail file regular 7" 80/100 zebra 50 pc #f510	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
339	Nail File Regular 7" 80/80 Zebra 50 pc #F509	nail file regular 7" 80/80 zebra 50 pc #f509	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
340	Niail File Monika 180/180 #F527	niail file monika 180/180 #f527	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
341	Nail Harmony Gelish Dip Liquid Step 4 Top Coat 0.5oz / 15ml #1640004	nail harmony gelish dip liquid step 4 top coat 0.5oz / 15ml #1640004	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
342	NAIL LACQUER THINNER 4OZ #	nail lacquer thinner 4oz #	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
343	Nail Mac Super Flex Shaft 3/32 #NM288	nail mac super flex shaft 3/32 #nm288	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
344	NAIL TEK 10 SPEED	nail tek 10 speed	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
345	Nail Tek Hydrate For Weak Severely Damaged Nails 0.5 Oz #37828	nail tek hydrate for weak severely damaged nails 0.5 oz #37828	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
346	Nail Tek Nail Nutritionist - Keratin Enriched Nail Treatment Oil 0.5 oz #55861	nail tek nail nutritionist - keratin enriched nail treatment oil 0.5 oz #55861	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
347	Nail Tek Nail Nutritionist Bamboo & Biotin 0.5 oz #65963	nail tek nail nutritionist bamboo & biotin 0.5 oz #65963	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
348	Nail Tek Nail Nutritionist Bamboo & Biotin 0.5 oz 37832	nail tek nail nutritionist bamboo & biotin 0.5 oz 37832	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
349	Nail Tek Nail Recovery Kit - For Hard, Brittle Nails - Intensive Therapy 3, Foundation 3, Renew	nail tek nail recovery kit - for hard, brittle nails - intensive therapy 3, foundation 3, renew	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
350	Nail Tek Nail Recovery Kit - For Weak, Damaged Nails - Intensive Therapy 4, Foundation 4, Renew	nail tek nail recovery kit - for weak, damaged nails - intensive therapy 4, foundation 4, renew	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
351	Nail Tek RENEW Cuticle Oil 0.5 oz #37829	nail tek renew cuticle oil 0.5 oz #37829	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
352	Nail Tek Restore Damaged Nails Kit - Intensive Therapy 2 + Foundation 2, Renew 55840	nail tek restore damaged nails kit - intensive therapy 2 + foundation 2, renew 55840	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
353	Nail Tek Ridge Filler 1 For Normal Healthy Nail 0.5 Oz #37812	nail tek ridge filler 1 for normal healthy nail 0.5 oz #37812	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
354	Nail Tek Ridge Filler 4 For Weak Severely Damaged Nails 0.5 Oz #37826	nail tek ridge filler 4 for weak severely damaged nails 0.5 oz #37826	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
355	Nail Tek Strengthen 2 For Soft Peeling Nails 0.5 OZ #37816	nail tek strengthen 2 for soft peeling nails 0.5 oz #37816	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
356	Nailtiques 0.5 oz	nailtiques 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
357	Nghia Clipper B901, 902	nghia clipper b901, 902	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
358	Nghia Cuticle Nipper D555	nghia cuticle nipper d555	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
359	Nghia Cuticle Nipper Stainless Steel D 03 Jaw 16	nghia cuticle nipper stainless steel d 03 jaw 16	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
360	Nitro magic Ombre 0.5 oz	nitro magic ombre 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
361	Nolift Nail Primer 0.75 oz	nolift nail primer 0.75 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
362	Not Polish Gel Duo	not polish gel duo	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
363	Not Polish Luxe Pro Lamp	not polish luxe pro lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
364	Not Polish Dip Powder	not polish dip powder	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
365	Olaplex No. 0 5.2 oz Spray	olaplex no. 0 5.2 oz spray	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
366	Ombre Brush round	ombre brush round	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
367	OPI Brilliant Top Coat (Disc)	opi brilliant top coat (disc)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
368	OPI Plumping Top Coat (Disc)	opi plumping top coat (disc)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
369	OPI Brush Cleaner	opi brush cleaner	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
370	OPI Crystal File	opi crystal file	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
371	OPI Dip liquid essentials base/top/activator	opi dip liquid essentials base/top/activator	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
372	OPI dip powder 1,5 oz	opi dip powder 1,5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
373	OPI dip powder 4 oz	opi dip powder 4 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
374	OPI Disposable Grit Strips - 120 grit 20 pcs	opi disposable grit strips - 120 grit 20 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
375	OPI Disposable Grit Strips - 80 grit 20 pcs	opi disposable grit strips - 80 grit 20 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
376	OPI Drip Dry Nail Lacquer Refill 27 ml / 1 oz AL711	opi drip dry nail lacquer refill 27 ml / 1 oz al711	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
377	OPI Gel Base Stay Classic	opi gel base stay classic	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
378	OPI Gel Base Stay Strong 0.5 oz	opi gel base stay strong 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
379	OPI Gel top old (original)	opi gel top old (original)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
380	OPI Gel Top Stay Shiny	opi gel top stay shiny	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
381	OPI GelColor (intelligel) 0.5 oz	opi gelcolor (intelligel) 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
382	OPI Gel color (white cap) 0.5 oz	opi gel color (white cap) 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
383	OPI Gelcolor Old (Black bottle) 0.5 oz	opi gelcolor old (black bottle) 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
384	OPI Gelevate 4 in 1 Builder Gel in a Bottle Blank Canvas #BIB006	opi gelevate 4 in 1 builder gel in a bottle blank canvas #bib006	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
385	OPI GELevate Soft Gel Extensions Box 640 pcs Almond Tip #FCT004	opi gelevate soft gel extensions box 640 pcs almond tip #fct004	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
386	OPI GELevate Soft Gel Lightning Flash Cure Gel Lamp #GL905	opi gelevate soft gel lightning flash cure gel lamp #gl905	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
387	OPI Gelevate Tip Box 640 pcs	opi gelevate tip box 640 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
388	OPI Gel Intelligel Super Gloss top/ nowipe	opi gel intelligel super gloss top/ nowipe	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
389	OPI Gel Intelligel Super Base Coat	opi gel intelligel super base coat	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
390	OPI Gel Mini 0.25 oz	opi gel mini 0.25 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
391	OPI Gel New Collection Kit 6 pcs	opi gel new collection kit 6 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
392	OPI Gel Plump Effect Top Coat 0.5 oz	opi gel plump effect top coat 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
393	OPI Hello Kitty pack 5 pcs mini	opi hello kitty pack 5 pcs mini	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
394	OPI Infinite Shine 0.5 oz	opi infinite shine 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
395	OPI Infinite shine Top/ Base 0.5 oz	opi infinite shine top/ base 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
396	OPI Lacquer 0.5 oz	opi lacquer 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
397	OPI Lacquer New Collection kit 12 pcs	opi lacquer new collection kit 12 pcs	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
398	OPI Star Light Lamp	opi star light lamp	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
399	Opi Nail Envy Natural Nail Strengthener 15ml / 0.5 fl oz #NTT60 no box	opi nail envy natural nail strengthener 15ml / 0.5 fl oz #ntt60 no box	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
400	OPI Nail Envy + Oil 0.5 oz	opi nail envy + oil 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
401	OPI Nail Envy Triflex Original/ Color 0.5 oz	opi nail envy triflex original/ color 0.5 oz	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
402	Opi Nail Envy Powerful Pink 15ml / 0.5 fl oz #NT229	opi nail envy powerful pink 15ml / 0.5 fl oz #nt229	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
403	OPI Nail Envy Soft & Thin (old)	opi nail envy soft & thin (old)	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
\.


--
-- Data for Name: shopping_list_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shopping_list_items (id, shopping_list_id, item_index, updated_at, purchased_quantity) FROM stdin;
\.


--
-- Data for Name: shopping_lists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shopping_lists (id, share_id, title, picklist_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: supplier_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier_prices (id, product_id, supplier_id, price, created_at, updated_at) FROM stdin;
693	520	18	0.50	2025-09-02 22:24:52.321397	2025-09-02 22:24:52.321397
389	296	14	29.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
390	297	11	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
391	298	11	295.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
392	299	2	13.42	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
393	300	2	13.42	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
394	301	3	220.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
395	302	2	0.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
396	303	2	0.55	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
397	304	2	0.77	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
398	305	2	0.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
399	306	2	0.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
400	307	2	0.66	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
401	308	3	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
402	308	5	1.60	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
403	309	2	14.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
404	310	2	12.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
405	311	2	12.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
406	312	2	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
407	313	2	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
408	313	3	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
409	313	6	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
410	314	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
411	315	2	7.54	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
412	315	6	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
413	316	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
414	317	2	2.60	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
415	318	2	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
416	319	2	6.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
417	320	6	2.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
418	321	2	29.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
419	322	2	0.20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
420	323	3	240.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
421	323	5	235.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
422	323	11	240.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
423	323	14	235.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
424	324	3	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
425	325	11	245.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
426	326	11	7.59	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
427	327	11	11.96	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
428	328	2	22.76	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
429	329	11	35.94	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
430	329	14	35.94	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
431	330	2	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
432	331	2	9.19	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
433	332	2	1.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
434	332	9	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
435	333	2	2.16	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
436	334	6	11.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
437	335	2	8.48	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
438	336	2	1.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
439	337	2	4.46	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
440	338	2	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
441	338	3	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
442	339	2	6.04	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
443	340	2	9.19	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
444	341	2	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
445	342	2	1.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
446	343	2	35.56	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
447	344	9	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
448	345	2	4.38	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
449	345	9	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
450	346	2	3.31	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
451	347	2	3.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
452	348	2	3.31	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
453	349	2	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
454	350	2	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
455	351	2	2.63	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
456	352	2	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
457	352	9	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
458	353	2	3.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
459	354	2	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
460	354	9	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
461	355	2	3.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
462	355	3	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
463	356	4	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
464	356	16	9.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
465	357	3	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
466	358	3	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
467	359	2	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
468	359	3	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
469	359	6	8.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
470	360	14	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
471	361	11	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
472	362	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
473	363	5	118.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
474	364	3	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
475	365	2	16.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
476	366	15	1.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
477	367	10	5.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
478	368	10	5.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
479	369	3	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
480	370	7	6.95	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
481	371	11	4.97	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
482	371	14	5.04	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
483	372	1	12.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
484	372	3	12.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
485	372	4	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
486	372	6	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
487	372	7	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
488	372	9	13.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
489	372	10	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
490	372	11	10.47	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
491	373	1	30.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
492	374	10	11.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
493	375	10	11.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
494	376	2	9.03	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
495	377	17	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
496	378	14	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
497	379	1	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
498	380	5	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
499	381	1	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
500	381	2	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
501	381	3	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
502	381	4	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
503	381	6	12.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
504	381	7	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
505	381	9	11.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
506	381	10	10.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
507	381	11	8.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
508	381	12	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
509	381	13	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
510	381	17	8.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
511	382	17	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
512	383	1	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
513	383	6	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
514	384	2	16.24	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
515	385	2	19.49	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
516	386	2	60.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
517	387	2	19.49	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
518	388	11	5.40	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
519	389	17	8.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
520	390	11	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
521	391	11	55.56	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
522	392	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
523	393	10	6.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
524	394	1	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
525	394	3	4.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
526	394	7	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
527	394	9	5.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
528	394	10	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
529	395	11	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
530	396	1	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
531	396	2	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
532	396	3	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
533	396	4	3.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
534	396	6	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
535	396	7	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
536	396	9	4.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
537	396	10	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
538	396	11	3.12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
539	396	12	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
540	396	13	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
541	396	15	3.12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
542	396	17	3.32	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
543	397	11	46.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
544	398	1	99.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
545	398	11	103.48	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
546	399	2	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
547	400	10	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
548	401	11	5.84	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
549	401	17	5.51	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
550	402	2	6.67	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
551	403	10	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
552	404	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
553	405	2	6.90	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
554	406	2	3.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
555	406	10	3.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
556	407	2	5.79	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
557	408	2	5.20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
558	409	2	6.90	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
559	410	10	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
560	411	7	12.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
561	412	10	0.90	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
562	413	2	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
563	414	11	3.12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
564	415	11	10.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
565	416	2	3.47	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
566	417	2	3.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
567	418	2	3.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
568	419	11	11.22	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
569	420	11	18.35	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
570	421	2	4.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
571	422	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
572	423	10	14.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
573	424	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
574	424	9	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
575	424	10	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
576	425	3	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
577	426	2	4.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
578	427	1	2.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
579	427	2	3.32	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
580	427	9	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
581	427	10	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
582	428	2	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
583	429	2	4.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
584	430	2	4.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
585	431	2	4.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
586	432	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
587	433	2	4.11	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
588	434	2	4.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
589	435	2	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
590	435	9	3.15	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
591	436	2	6.28	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
592	437	2	4.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
593	438	10	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
594	439	6	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
595	439	11	9.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
596	440	2	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
597	441	2	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
598	442	1	14.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
599	442	3	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
600	443	2	5.18	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
601	443	8	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
602	444	2	15.23	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
603	445	2	18.42	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
604	446	2	23.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
605	447	2	27.37	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
606	448	2	31.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
607	449	2	33.60	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
608	450	2	16.86	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
609	451	2	1.96	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
610	452	2	3.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
611	453	3	125.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
612	454	1	30.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
613	454	2	25.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
614	454	6	32.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
615	455	2	11.03	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
616	455	4	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
617	456	2	38.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
618	456	3	33.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
619	456	12	35.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
620	457	2	38.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
621	458	3	20.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
622	459	3	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
623	460	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
624	461	3	8.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
625	462	1	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
626	462	2	2.36	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
627	463	1	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
628	463	2	2.36	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
629	464	1	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
630	464	2	2.36	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
631	465	1	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
632	465	2	2.34	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
633	466	14	25.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
634	467	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
635	468	1	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
636	469	2	4.20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
637	470	2	4.20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
638	471	2	3.68	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
639	472	2	35.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
640	473	2	2.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
641	474	2	4.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
642	475	2	2.92	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
643	476	6	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
644	476	11	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
645	477	1	30.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
646	478	11	10.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
647	479	2	31.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
648	480	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
649	481	3	14.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
650	482	2	2.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
651	483	1	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
652	483	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
653	484	2	7.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
654	485	2	6.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
655	486	2	8.40	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
656	487	2	7.88	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
657	488	2	7.88	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
658	489	2	7.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
659	490	2	6.83	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
660	491	2	6.83	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
661	492	2	7.88	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
662	492	10	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
663	493	2	1.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
664	494	2	3.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
665	495	2	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
666	496	2	4.74	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
667	497	2	4.46	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
668	498	2	0.28	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
669	499	2	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
670	500	2	0.22	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
671	501	2	3.95	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
672	502	2	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
673	503	2	0.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
674	504	2	4.16	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
675	505	2	4.16	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
676	506	2	0.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
677	507	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
678	508	11	145.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
679	509	11	78.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
680	509	14	78.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
681	510	11	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
682	511	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
683	512	2	23.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
684	513	2	24.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
685	514	2	3.41	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
686	515	2	3.41	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
687	516	6	14.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
688	516	7	15.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
689	516	13	15.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
690	517	11	6.57	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
691	518	11	13.17	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
692	519	11	34.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
1	1	1	23.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
2	2	2	3.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
3	3	2	3.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
4	4	2	3.95	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
5	5	3	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
6	6	2	22.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
7	6	4	25.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
8	7	2	29.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
9	7	3	33.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
10	7	4	32.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
11	8	2	2.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
12	9	5	14.38	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
13	10	5	4.30	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
14	11	6	10.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
15	12	1	16.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
16	12	6	16.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
17	13	6	18.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
18	14	1	26.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
19	15	6	31.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
20	16	6	14.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
21	17	6	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
22	18	3	21.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
23	18	6	21.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
24	19	6	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
25	20	2	4.39	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
26	21	2	5.69	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
27	21	6	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
28	22	2	8.77	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
29	23	2	8.77	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
30	24	2	8.28	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
31	25	2	1.62	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
32	26	2	20.53	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
33	27	2	3.57	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
34	28	2	50.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
35	29	2	1.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
36	30	3	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
37	31	2	6.83	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
38	32	2	6.83	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
39	33	2	7.88	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
40	33	7	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
41	34	2	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
42	34	8	56.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
43	35	2	55.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
44	36	2	20.53	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
45	37	9	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
46	38	2	2.63	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
47	39	2	3.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
48	40	1	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
49	40	2	3.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
50	40	3	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
51	40	6	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
52	41	2	4.44	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
53	42	2	8.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
54	42	6	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
55	43	2	6.67	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
56	44	2	1.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
57	44	6	1.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
58	44	10	2.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
59	45	2	8.17	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
60	46	2	38.08	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
61	47	2	4.44	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
62	48	5	5.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
63	49	2	3.98	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
64	50	2	5.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
65	51	6	50.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
66	52	2	4.20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
67	53	2	4.67	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
68	54	2	5.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
69	55	2	5.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
70	56	2	5.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
71	57	2	5.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
72	58	2	2.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
73	59	2	5.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
74	60	2	3.73	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
75	61	2	5.62	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
76	62	3	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
77	63	1	24.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
78	64	9	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
79	65	11	3.19	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
80	66	1	95.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
81	66	11	94.12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
82	67	4	12.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
83	67	9	12.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
84	68	9	13.65	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
85	69	6	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
86	69	9	3.85	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
87	70	11	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
88	71	9	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
89	72	3	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
90	72	11	7.31	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
91	73	6	18.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
92	73	11	16.09	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
93	74	6	75.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
94	75	9	16.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
95	76	11	19.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
96	77	11	30.13	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
97	78	11	42.69	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
98	79	1	118.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
99	80	2	3.76	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
100	81	3	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
101	81	6	9.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
102	81	9	9.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
103	81	10	9.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
104	81	12	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
105	82	9	7.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
106	83	9	8.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
107	83	11	8.26	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
108	84	11	13.02	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
109	85	9	21.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
110	86	6	30.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
111	87	3	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
112	87	9	10.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
113	88	9	12.60	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
114	89	9	34.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
115	90	9	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
116	91	9	4.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
117	92	6	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
118	93	6	1.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
119	93	7	1.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
120	93	9	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
121	94	6	3.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
122	95	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
123	95	6	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
124	96	1	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
125	96	3	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
126	97	5	105.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
127	98	3	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
128	98	9	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
129	99	9	2.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
130	100	6	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
131	101	9	20.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
132	102	2	1.84	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
133	103	2	2.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
134	104	4	2.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
135	105	1	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
136	105	2	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
137	105	3	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
138	105	4	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
139	105	5	3.53	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
140	105	13	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
141	106	1	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
142	107	2	2.59	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
143	108	2	2.63	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
144	109	2	2.63	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
145	110	2	2.63	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
146	111	2	2.54	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
147	112	2	3.90	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
148	113	6	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
149	114	4	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
150	114	5	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
151	115	2	3.96	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
152	116	1	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
153	116	4	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
154	117	4	105.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
155	118	1	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
156	118	2	4.60	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
157	118	3	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
158	118	4	3.20	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
159	118	5	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
160	118	6	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
161	118	7	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
162	119	5	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
163	120	1	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
164	121	4	33.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
165	122	5	40.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
166	123	4	42.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
167	124	2	2.42	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
168	125	2	2.94	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
169	126	2	3.53	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
170	127	14	17.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
171	128	14	40.83	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
172	129	2	3.94	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
173	130	2	43.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
174	131	2	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
175	132	2	3.15	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
176	133	2	29.98	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
177	134	2	4.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
178	135	2	4.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
179	136	2	4.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
180	137	2	4.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
181	137	3	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
182	137	7	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
183	137	9	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
184	137	10	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
185	138	10	10.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
186	139	2	3.15	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
187	139	9	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
188	139	10	3.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
189	140	2	14.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
190	141	2	3.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
191	142	2	12.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
192	143	2	14.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
193	144	2	17.37	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
194	145	2	10.28	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
195	146	2	30.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
196	147	2	1.30	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
197	148	2	3.58	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
198	149	2	35.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
199	150	6	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
200	151	2	6.95	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
201	152	2	6.95	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
202	153	2	5.79	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
203	154	4	240.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
204	155	6	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
205	156	1	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
206	157	2	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
207	157	11	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
208	158	2	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
209	158	11	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
210	159	2	7.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
211	160	14	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
212	161	11	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
213	161	14	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
214	162	1	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
215	162	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
216	162	6	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
217	163	2	4.39	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
218	164	1	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
219	164	2	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
220	164	3	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
221	164	6	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
222	164	7	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
223	164	9	8.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
224	164	12	9.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
225	164	13	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
226	164	15	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
227	165	12	11.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
228	166	5	180.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
229	166	14	175.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
230	167	2	16.30	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
231	167	9	23.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
232	169	11	165.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
233	170	2	18.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
234	171	2	11.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
235	172	2	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
236	173	2	12.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
237	174	7	150.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
238	175	2	43.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
239	176	1	50.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
240	176	3	50.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
241	177	1	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
242	178	2	6.86	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
243	179	2	2.62	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
244	180	2	5.87	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
245	181	14	2.52	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
246	182	2	23.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
247	183	1	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
248	183	2	3.89	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
249	183	3	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
250	183	6	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
251	184	2	2.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
252	185	2	2.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
253	186	2	23.33	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
254	187	1	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
255	188	2	2.22	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
256	189	14	2.52	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
257	190	2	2.22	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
258	191	2	3.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
259	192	2	2.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
260	193	2	2.70	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
261	194	2	1.53	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
262	195	2	4.47	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
263	196	2	96.80	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
264	197	2	6.05	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
265	198	2	8.92	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
266	199	2	7.88	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
267	200	2	7.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
268	201	2	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
269	202	2	5.13	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
270	202	6	8.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
271	203	2	6.04	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
272	204	2	6.04	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
273	205	2	6.05	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
274	206	2	17.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
275	207	2	3.68	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
276	207	3	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
277	207	9	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
278	208	3	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
279	209	2	6.30	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
280	210	2	6.30	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
281	211	2	33.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
282	212	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
283	213	2	7.78	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
284	214	2	4.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
285	215	2	6.84	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
286	216	2	13.68	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
287	217	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
288	217	3	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
289	218	2	6.32	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
290	219	2	90.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
291	220	2	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
292	221	2	9.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
293	222	2	8.40	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
294	223	2	9.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
295	224	2	9.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
296	225	2	10.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
297	225	3	14.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
298	226	2	9.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
299	227	2	9.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
300	228	2	9.45	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
301	229	2	7.22	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
302	229	3	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
303	230	2	1.67	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
304	231	2	6.79	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
305	232	2	8.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
306	233	2	24.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
307	234	2	15.72	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
308	235	2	15.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
309	236	2	5.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
310	237	2	16.79	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
311	238	2	10.61	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
312	239	2	15.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
313	240	2	12.08	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
314	241	2	1.42	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
315	242	2	17.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
316	243	2	1.21	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
317	244	14	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
318	245	11	11.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
319	245	14	11.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
320	246	14	24.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
321	247	2	6.05	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
322	247	6	6.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
323	248	2	3.12	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
324	249	2	4.95	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
325	250	2	3.15	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
326	250	3	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
327	250	6	4.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
328	250	7	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
329	251	2	4.28	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
330	252	2	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
331	252	12	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
332	253	2	3.71	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
333	254	2	4.28	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
334	255	2	4.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
335	256	2	3.25	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
336	257	2	10.07	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
337	258	1	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
338	258	3	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
339	259	5	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
340	259	14	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
341	260	4	130.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
342	261	3	130.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
343	262	3	140.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
344	263	1	65.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
345	264	5	40.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
346	265	3	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
347	266	1	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
348	267	1	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
349	268	10	22.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
350	269	3	5.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
351	270	2	23.10	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
352	271	11	25.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
353	272	6	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
354	272	9	8.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
355	273	11	44.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
356	274	2	7.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
357	275	11	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
358	276	3	13.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
359	277	11	235.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
360	278	11	180.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
361	279	7	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
362	279	9	6.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
363	279	13	5.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
364	280	11	7.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
365	281	2	9.98	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
366	281	9	11.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
367	282	11	15.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
368	283	11	26.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
369	284	2	95.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
370	284	11	90.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
371	285	1	130.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
372	285	11	140.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
373	286	9	2.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
374	287	2	3.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
375	288	9	11.50	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
376	289	9	93.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
377	290	14	5.75	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
378	291	5	180.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
379	291	14	180.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
380	292	1	150.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
381	293	3	270.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
382	293	5	260.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
383	293	11	265.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
384	293	14	260.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
385	294	3	290.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
386	294	11	265.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
387	295	11	275.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
388	296	11	29.00	2025-08-24 14:35:44.730356	2025-08-24 14:35:44.730356
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, name, created_at) FROM stdin;
1	USA	2025-08-24 14:35:44.730356
2	BEAUTY ZONE	2025-08-24 14:35:44.730356
3	GEL NAILS	2025-08-24 14:35:44.730356
4	CALI 	2025-08-24 14:35:44.730356
5	NAILCOST	2025-08-24 14:35:44.730356
6	KASHI	2025-08-24 14:35:44.730356
7	KAREN	2025-08-24 14:35:44.730356
8	Phuong Oanh	2025-08-24 14:35:44.730356
9	BOLSA	2025-08-24 14:35:44.730356
10	IMPERIAL	2025-08-24 14:35:44.730356
11	SKYLINE	2025-08-24 14:35:44.730356
12	cali 2	2025-08-24 14:35:44.730356
13	WHALE	2025-08-24 14:35:44.730356
14	B.PAGE	2025-08-24 14:35:44.730356
15	TSUPPLIES	2025-08-24 14:35:44.730356
16	Nailtiques	2025-08-24 14:35:44.730356
17	NICHE	2025-08-24 14:35:44.730356
18	Home	2025-09-02 22:24:32.772117
\.


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

