-- create view: public.tip_spatial_line_project_4app
--
-- This SQL script creates a view named tip_spatial_line_project_4app in the PUBLIC schema of the tip database
-- of the table named tip_spatial_line_project table in the TIP_ADMIN schema of the tip database. 

DROP VIEW public.tip_spatial_4app;

CREATE OR REPLACE VIEW public.tip_spatial_4app AS
 SELECT tip_spatial.objectid,
    tip_spatial.latitude,
    tip_spatial.longitude,
    tip_spatial.project_town_id,
    tip_spatial.shape
   FROM tip_admin.tip_spatial
  WHERE (tip_spatial.project_town_id / 1000 IN ( SELECT tip_projects.ctps_id
           FROM tip_projects));

ALTER TABLE public.tip_spatial_4app
    OWNER TO tip_admin;

GRANT ALL ON TABLE public.tip_spatial_4app TO tip_admin;
GRANT ALL ON TABLE public.tip_spatial_4app TO tip_dba;
GRANT ALL ON TABLE public.tip_spatial_4app TO postgres;
GRANT SELECT ON TABLE public.tip_spatial_4app TO PUBLIC;
GRANT ALL ON TABLE public.tip_spatial_4app TO tip_editor;
