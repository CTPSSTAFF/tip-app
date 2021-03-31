# tip-app
Third-generation TIP web application
The initial commit consists of the files for v-0.1 of this app.

## Introduction

Work on this app was begun in the late fall of 2018 with the understanding that it would ba functionally limited
reworking of CTPS's second-generration TIP web app. The basic idea was to bring up something that met most user's
needs very quickly and at low cost, and leave the re-specification / re-design / re-implementation of something
more grandiose for the next federal fiscal year. Another, equally important, driving factor was the decision to
limit the number of projects in the backing database. Previously this database had been populated with both 
'real' projects (projects under serious consideration for funding) and 'vaporware' projects that were little 
more than suggestions. The latter class of project vastly bloated the database. 

With the decision to limit the contents of the backing database to 'real' projects and those under serious consideration, 
the size of the database shrunk by about an order of magnitude to only around 200-300 projects. In view of this, 
and in view of the goal of simplicity of implementation of this version of the app, the design decision was made to load
all relevant tables from the database in memory _once_ at start-up, and query them there rather than use AJAX for
round-trips to query the database on the server whenever prompted to do so by user action.

By February of 2019, the number of features being requested by the project team for THIS version of the app 
began to ballon. Although it was becoming clear that some of the fundamental design choices were being stretched
to the breeaking point because of major 'functionality creep' , at this point it was no longer possible to consider
re-architeching the app (e.g., moving some logic to the server, using a more functionally rich mapping platform, etc.),
because of budget and schedule constrtaints. With a bit of luck, this might be possible in some future year.

## External Dependencies

Dependencies on external libraries:
  1. [jQuery](https://jquery.com/) version 2.2.4
  2. [jQueryUI](https://jqueryui.com/) verson 1.2.1
  3. [Google Maps API version 3](https://developers.google.com/maps/documentation/javascript/overview)
  4. [Google Maps V3 Utility Library](https://github.com/googlemaps/v3-utility-library) - maplabel.js
  5. [SlickGrid](https://slickgrid.net/Index.html) version 2.4.1 - Note that this is __not__ the original SlickGrid implementation by Michael Lieberman, who stopped supporting it in 2014, but rather a fork of it that is currently being maintained.
  6. [jQuery.event.drag](https://github.com/threedubmedia/jquery.threedubmedia) version 2.3.0 (required by SlickGrid)
  7. [jQuery.event.drop](https://github.com/threedubmedia/jquery.threedubmedia) version 2.3.0 (required by SlickGrid)
  8. [underscore.js](https://underscorejs.org/) version 1.9.1
  9. [download.js](http://danml.com/download.html) version 4.2
  10. [turf.js](https://turfjs.org/)
  11. [es6string.js](//https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/startsWith)
  12. [popper.js](https://popper.js.org/) version 1.14.6 (required by SlickGrid)
 
In addition, the JavaScript polyfill polfill_for_object_assign.js is required to work-around the lack of support
for Object.assign in some _recent_ (non-legacy) versions of Internet Explorer.

## Updating Spatial Data

Instructions on updating the two sets of spatial data (points and lines) for this app will be documented here in detail in future.
The rough outlines of this process is (for each set of spatial data):

1. Delete the previous set of data from the tip_admin schema of the tip_database
2. Copy the new data from the cert_act schema of the mpodata database to the tip_admin schema of the tip database
3. Re-create the SQL 'view' of the data by running the relevant SQL commands (in tip_spatial_4app_view.sql or tip_spatial_line_project_view.sql)

The previously proposed method of using the ArcGIS 'Delete Features' (or 'Truncate') and 'Append' tools was found not to work.
