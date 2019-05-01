# tip-app
Third-generation TIP web application
The initial commit consists of the files for v-0.1 of this app.

Dependencies on external libraries:
  1. jQuery version 2.2.4
  2. jQueryUI verson 1.2.1
  3. Google Maps API version 3
  4. Google Maps V3 Utility Library - maplabel.js
  5. SlickGrid version 2.4.1
  6. jQuery.event.drag version 2.3.0
  7. jQuery.event.drop version 2.3.0
  8. underscore.js version 1.9.1
  9. download.js version 4.2
  10. turf.js
  11. es6string.js
  12. popper.js version 1.14.6

Note on updating the spatial data for this app:

The two sets spatial data (points and lines) for this app are to be updated as follows:
1. Use the ArcGIS 'Delete Rows' tool to delete all rows from the table tip_admin.tip_spatial
2. Use the ArGIS 'Append' tool to append rows from a feature class containing the new data to tip_admin.tip_spatial
3. (non-action) The database View public.tip_spatial_4app will rematerialize itself, based on the freshly loaded data
4. Repeat steps (1) through (3) for the table tip_admin.tip_spatial_project_line
