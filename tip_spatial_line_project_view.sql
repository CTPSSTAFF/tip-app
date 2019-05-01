-- create view: public.tip_spatial_line_project_4app
--
-- This SQL script creates a view named tip_spatial_line_project_4app in the PUBLIC schema of the tip database
-- of the table named tip_spatila_line_project TIP_ADMIN schema of the tip database. 

DROP VIEW public.tip_spatial_line_project_4app;

CREATE OR REPLACE VIEW public.tip_spatial_line_project_4app AS
 SELECT tip_spatial_line_project.objectid,
    tip_spatial_line_project.ctps_id,
    tip_spatial_line_project.project_number,
    tip_spatial_line_project.tip_id,
    tip_spatial_line_project.projis,
    tip_spatial_line_project.project_name,
    tip_spatial_line_project.project_category,
    tip_spatial_line_project.air_quality_status,
    tip_spatial_line_project.is_add_capacity,
    tip_spatial_line_project.funding_status,
    tip_spatial_line_project.estimated_cost,
    tip_spatial_line_project.is_universe_projects,
    tip_spatial_line_project.is_target,
    tip_spatial_line_project.is_fdr,
    tip_spatial_line_project.fdr_year,
    tip_spatial_line_project.is_proposed,
    tip_spatial_line_project.proj_desc_short,
    st_force2d(tip_spatial_line_project.shape) AS shape
   FROM tip_admin.tip_spatial_line_project
  WHERE (tip_spatial_line_project.ctps_id IN ( SELECT tip_projects.ctps_id
           FROM tip_projects));

ALTER TABLE public.tip_spatial_line_project_4app
    OWNER TO tip_admin;

GRANT ALL ON TABLE public.tip_spatial_line_project_4app TO tip_admin;
GRANT ALL ON TABLE public.tip_spatial_line_project_4app TO tip_dba;
GRANT ALL ON TABLE public.tip_spatial_line_project_4app TO postgres;
GRANT SELECT ON TABLE public.tip_spatial_line_project_4app TO PUBLIC;
GRANT ALL ON TABLE public.tip_spatial_line_project_4app TO tip_editor;