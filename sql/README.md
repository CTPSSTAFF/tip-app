# sql

This directory contains SQL scripts used in conjunction with development of the TIP database and application
that are __not__ found in the directory  
__//lilliput/groups/Certification_Activities/10103 Transportation_Improvement_Program/TIP Database/app/postgres_sql_scripts__.

Note that some scripts in that directory create database _views_ that are used by the application, and thus are critical to the app, _per se_:
* 987_cr_view_tip_funding_proposed_sum_view.sql
* 988_cr_view_tip_funding_current_sum_view.sql
* 989_cr_view_tip_funding_proposed_view.sql
* 990_cr_view_tip_funding_current_view.sql
* 991_cr_view_tip_project_subregion_list_view.sql
* 992_cr_view_tip_project_town_list_view.sql
* 993_cr_view_tip_project_proponent_list_view.sql
* 994_cr_view_tip_funding_view.sql
* 995_cr_view_tip_project_amendment_view.sql
* 996_cr_view_tip_bridge_component_view.sql
* 997_cr_view_tip_project_proponent_view.sql
* 998_cr_view_tip_project_town_view.sql
* 999_cr_view_tip_projects_view.sql