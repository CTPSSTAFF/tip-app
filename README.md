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

Instructions on updating the two sets of spatial data (points and lines) for this app will be documented here in detail in future.
The rough outlines of this process is (for each set of spatial data):

1. Delete the previous set of data from the tip_admin schema of the tip_database
2. Copy the new data from the cert_act schema of the mpodata database to the tip_admin schema of the tip database
3. Re-create the SQL 'view' of the data by running the relevant SQL commands (in tip_spatial_4app_view.sql or tip_spatial_line_project_view.sql)

The previously proposed method of using the ArcGIS 'Delete Features' (or 'Truncate') and 'Append' tools was found not to work.


