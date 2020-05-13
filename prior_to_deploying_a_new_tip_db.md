# Things that must be done prior to deploying a new version of the TIP database

In ArcCatalog:
1. Copy mpodata.cert_act.tip_spatial to tip.public.tip_spatial, 
using the __tip_admin__ SDE database connection
2. Copy mpodata.cert_act.tip_spatial_line_project to tip.public.tip_spatial_line_project
using the __tip_admin__ SDE database connection

After having done that, in pgAdmin:
1. Run the SQL script in this repo named __tip_spatial_4app_view.sql__
2. Run the SQL script in this repo named __tip_spatial_line_project_view.sql__

These scripts will create PostgreSQL views named __tip_spatial_4app__, and
__tip_spatial_line_project_4app

-- B.Krepp 13 May 2020




