// TIP web application - project search page
// Author:  B. Krepp
// Date:    Dec 2018 - Jan 2019
//
// Stuff pertaining to retrieval of data from TIP database, and the data itself:
//
var wfsServerRoot = location.protocol + '//' + location.hostname + ':8080/geoserver/wfs';
var projectsURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_projects_view&outputformat=json'; 
var proj_townURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_project_town_view&outputformat=json';
var city_town_lutURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_city_town_lookup&outputformat=json';
var proj_catURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_lut_proj_cat&outputformat=json';
var tip_spatialURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=cert_act:tip_spatial_4app&outputformat=json';

// The following are pretty much invariant: load these as static, previously-generated GeoJSON files
var mpo_boundaryURL = 'data/ctps_boston_region_mpo_97_land_arc.geojson';
var mapc_subregionsURL = 'data/ctps_mapc_subregions_97_land_arc.geojson';

// Global "database" of JSON returned from WFS requests
var DATA = {};
// Stuff pertaining to the Google Map:
//
// Google Maps map object
var map = {};
// Array of all Google Maps markers currently on the map
var aMarkers = [];
// infoWindow 'popup' for markers for point features
var infoWindow = null;  
// Color codes for drawaing boundaries of MPO and MAPC subregions
var subregionBoundaryColor = 'brown';
var mpoBoundaryColor = '#00a674'; // "Medium Spring Green"

// Stuff pertaining to the Slick Grid:
//
// Slick Grid 'grid' object and grid options
var grid = null;
var gridOptions = { enableColumnReorder : false, autoHeight: true, forceFitColumns: true };
// Stuff for grid columns
// N.B. The width values reflect the jQueryUI font size being throttled-back to 80% of its default size in tipApp.css
var gridColumns = [ { id : 'tip_id_col',    name : 'TIP ID',       field : 'tip_id', width : 60, sortable: true, toolTip: 'Click column header to sort this column.',
                      headerCssClass : 'tip_id_column_header',
                      formatter : function(row, cell, value, columnDef, dataContext) {
                                      return '<a href=tipDetail.html?tip_id=' + value + ' target="_blank">' + value + '</a>';
                                  } 
                    },
                    { id : 'proj_name_col',       name : 'Project Name',              field : 'proj_name',       width : 740, sortable : false }, 
                    { id : 'proj_cat_col',        name : 'Category',                  field : 'proj_cat',        width : 150, sortable : true, toolTip: 'Click column header to sort this column.' },
                    { id : 'town_col',            name : 'Municipality',              field : 'towns',           width : 150, sortable : true, toolTip: 'Click column header to sort this column.' },
                    { id : 'subregion_col',       name : 'Subregion',                 field : 'subregions',      width : 150, sortable : true, toolTip: 'Click column header to sort this column.' },
                    { id : 'cur_cost_est_col',    name : 'Current Cost Estimate',     field : 'cur_cost_est',    width : 160, sortable : true, toolTip: 'Click column header to sort this column.',
                      cssClass : 'moneyColumn',   formatter : tipCommon.moneyFormatter },                         
                    { id : 'first_year_prog',     name : 'First Year Programmed',     field : 'first_year_prog', width:  160,  sortable : true, toolTip: 'Click column header to sort this column.',
                      cssClass : 'dateColumn' }
                 ];
// Slick Grid 'dataView' object
var dataView = null;    

// Stuff for accessible grid
var accColDesc = [  { header : 'TIP ID',                  dataIndex : 'tip_id',   },
                    { header : 'Project Name',            dataIndex : 'proj_name' },
                    { header : 'Category',                dataIndex : 'proj_cat' },
                    { header : 'Municipality',            dataIndex : 'towns' },
                    { header : 'Subregion',               dataIndex : 'subregions' },  
                    { header : 'Current Cost Estimate',   dataIndex : 'cur_cost_est',   cls : 'moneyColumn', renderer : tipCommon.moneyFormatter },
                    { header : 'First Year Programmed',   dataIndex : 'first_year_prog' } ];
var accGridOptions = { div_id    : 'project_list_contents_accessible',
                       table_id  : 'project_list_accessible',
                       caption   : 'Table of TIP Projects',
                       colDesc   : accColDesc,
                       col1th    : true,
                       summary   : 'Selected TIP Projects' };

$(document).ready(function() {
    // Initialize the Google Map
    //
    var regionCenterLat = 42.345111165; 
    var regionCenterLng = -71.124736685;
    var initialZoomLev = 10;
    var mapOptions = {
        center: new google.maps.LatLng(regionCenterLat, regionCenterLng),
        zoom: initialZoomLev,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControlOptions: {'style': google.maps.MapTypeControlStyle.DROPDOWN_MENU},
        panControl: false,
        streetViewControl: false,
        zoomControlOptions: {'style': 'SMALL'},
        scaleControl: true,
        overviewMapControl: false
    };   
    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    google.maps.event.addListener(map, "bounds_changed", function boundsChangedHandler(e) { } );
    // Un petit hacque to get the map's "bounds_changed" event to fire.
    // Believe it or not: When a Google Maps map object is created, its bounding
    // box is undefined (!!). Thus calling map.getBounds() on a newly created map
    // will raise an error. We are compelled to force a "bounds_changed" event to fire.
    // Larry and Sergey: How did you let this one get through the cracks, guys? C'mon!
    map.setCenter(new google.maps.LatLng(regionCenterLat + 0.000000001, regionCenterLng  + 0.000000001));    
    
    // Initialize the machinery for the Slick Grid
    //
    dataView = new Slick.Data.DataView();
    grid = new Slick.Grid('#project_list_contents', dataView, gridColumns, gridOptions);
    dataView.onRowCountChanged.subscribe(function(e, args) {
        grid.updateRowCount();
        grid.render();
    });
    dataView.onRowsChanged.subscribe(function(e, args) {
        grid.invalidateRows(args.rows);
        grid.render();
    });
    // Right now, we only support numeric sorting... more TBD
    grid.onSort.subscribe(function(e, args) {
        function NumericSorter(a, b) {
            var x = a[sortcol], y = b[sortcol];
            return sortdir * (x == y ? 0 : (x > y ? 1 : -1));
        }
        var sortdir = args.sortAsc ? 1 : -1;
        var sortcol = args.sortCol.field;
        dataView.sort(NumericSorter, sortdir);
        args.grid.invalidateAllRows();
        args.grid.render();
    });   

    // Machinery to load data and populate the local "database" (i.e,, "DATA" object):
    // 
    // Note that we cannot populate the combo boxes of 'project categories' and 'TIP IDs' 
    // until the data for these has been loaded.
    // Once all the combo boxes have been populated, we arm the on-click event handlder 
    // for the 'Search' button, and away we go!
    var getJson = function(url) {
        return $.get(url, null, 'json');
    };
    $.when(getJson(projectsURL),   
           getJson(proj_townURL),  
           getJson(city_town_lutURL),  
           getJson(proj_catURL),
           getJson(tip_spatialURL),
           getJson(mpo_boundaryURL),
           getJson(mapc_subregionsURL)
    ).done(function(projects, 
                    proj_town, 
                    city_town_lut,  
                    proj_cat, 
                    tip_spatial,
                    mpo_boundary,
                    mapc_subregions) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more WFS requests failed. Exiting application.");
            return;         
        }
        
        // Draw MAPC subregions on Google Map - note: this FC consists of MULTIPLE features
        var i, lineFeature;
        mapc_subregions_obj = JSON.parse(mapc_subregions[0]);
        for (i = 0; i < mapc_subregions_obj.features.length; i++) {
            lineFeature = mapc_subregions_obj.features[i];
            drawPolylineFeature(lineFeature, map, { strokeColor : subregionBoundaryColor, strokeOpacity : 1.0, strokeWeight: 1.5 });
        }
        // Draw MPO boundary on Google Map - this FC consists of a single feature
        mpo_boundary_obj = JSON.parse(mpo_boundary[0]);
        var lineFeature = mpo_boundary_obj.features[0];
        drawPolylineFeature(lineFeature, map, { strokeColor : mpoBoundaryColor, strokeOpacity : 0.7, strokeWeight: 8 });

        // Sort the array of TIP projects in ascending order on TIP_ID.
        // Note that TIP_ID if of type 'string'  and it sometimes includes non-numeric characters. Ugh!
        // Perform the sort as prep for populating <select> box of projects by TIP_ID, below.
        // NOTE: If we ever need to sort on the numeric value of TIP_ID, the followin statement accomplishes this:
        //     DATA.projects = projects[0].features.sort(function(a,b) { return (+a.properties['tip_id'] - (+b.properties['tip_id'] });
        DATA.projects = projects[0].features.sort(function(a,b) { return a.properties['tip_id'] < b.properties['tip_id'] ? -1 : 1; });
        
        DATA.proj_town = proj_town[0].features;
        DATA.city_town_lut = city_town_lut[0].features;
        DATA.tip_spatial = tip_spatial[0].features;
        
        // JOIN the records in the tip_projects table to the corresponding record in the tip_project_town table on 'ctps_id',
        // and grab the town_name from the city_town_lookup table, while we're at it.
        DATA.projects_JOIN = [];
        var i, j, pt_list, town_id, tmp, tmp_obj, tmp_props;
        for (i = 0; i < DATA.projects.length; i++) {
            pt_list = _.filter(DATA.proj_town, function(pt_rec) { return pt_rec.properties['ctps_id'] === DATA.projects[i].properties['ctps_id'] });
            for (j = 0; j < pt_list.length; j ++) {
                tmp_obj = {}; 
                tmp_obj.type = DATA.projects[i].type;
                tmp_obj.id = DATA.projects[i].id;                
                tmp_obj.geometry = DATA.projects[i].geometry;
                town_id =  pt_list[j].properties['town_id'];
                tmp = _.find(DATA.city_town_lut, function(lut_rec) { return lut_rec['id'] === 'tip_city_town_lookup.' + town_id });
                tmp_props = Object.assign({ town_id: pt_list[j].properties['town_id'], 
                                            town: tmp.properties['town_name'],
                                            project_town_id : pt_list[j].properties['project_town_id'] 
                                          },
                                          DATA.projects[i].properties);
                tmp_obj.properties = tmp_props;
                DATA.projects_JOIN.push(tmp_obj);
            } // for j
        } // for i     
        
        // Populate the <select> box for TIP_ID   
/*        
        var oSelect, oOption;
        oSelect = document.getElementById("select_tip_id");
        oOption = document.createElement("OPTION");
        oOption.text = "All";
        oOption.value = 0;
        oSelect.options.add(oOption); 
        for (i = 0; i < DATA.projects.length; i++) {
            oOption = document.createElement("OPTION");
            oOption.value = DATA.projects[i].properties['tip_id'];
            oOption.text = DATA.projects[i].properties['tip_id'];
            oSelect.options.add(oOption);            
        }
*/
  
        // Populate the <select> box for town
        oSelect = document.getElementById("select_town");
        oOption = document.createElement("OPTION");
        oOption.text = "All";
        oOption.value = 0;       
        oSelect.options.add(oOption);
        // Get list of towns that actually have one or more projects in the database
        var tid_list = _.map(DATA.proj_town, function(pt) { return pt.properties.town_id; } );
        tid_list = _.uniq(tid_list);
        tid_list.sort(function(a,b) { return +a - +b; });
        tid_list.forEach(function(town_id) {
            var tmp = _.find(DATA.city_town_lut, function(rec) { return rec.id == 'tip_city_town_lookup.' + town_id; });
            oOption = document.createElement("OPTION");
            oOption.value = town_id;
            oOption.text =  tmp.properties['town_name'];
            oSelect.options.add(oOption);
        });
         
        
        // Populate the <select> box for project category
        // Read the LUT of project categories in order to do so
        var aCategories = proj_cat[0].features;;
        oSelect = document.getElementById("select_proj_category");
        oOption = document.createElement("OPTION");
        oOption.text = "All";
        oOption.value = 0;
        oSelect.options.add(oOption); 
        for (i = 0; i < aCategories.length; i++) {				
            oOption = document.createElement("OPTION");
            oOption.value = aCategories[i].properties['proj_cat'];
            oOption.text =  aCategories[i].properties['proj_cat'];
            oSelect.options.add(oOption); 
        }
        
        // Populate the <select> box for 'first year programmed'
        // First have to create list of unique 'first year programmed's and sort it
        var aTmp =[];
        for (i = 0; i < DATA.projects.length; i++) {
            if (DATA.projects[i].properties['first_year_prog'] != null) {
                aTmp.push(DATA.projects[i].properties['first_year_prog']);
            }
        }
        aTmp = _.uniq(aTmp);
        aTmp = aTmp.sort();
        oSelect = document.getElementById("select_first_yr_prog");
        oOption = document.createElement("OPTION");
        oOption.text = "Any";
        oOption.value = 0;
        oSelect.options.add(oOption); 
        for (i = 0; i < aTmp.length; i++) {				
            oOption = document.createElement("OPTION");
            oOption.value = aTmp[i];
            oOption.text =  aTmp[i];
            oSelect.options.add(oOption); 
        }   

        // Hide the 'Download' button until there's some data to download
        $('#download_button').hide();
  
        // Arm on-click event handler for the 'Search' button
        $('#search_button').click(queryProjects);  
        // And, per customer request query for all projects on app startup
        $('#search_button').trigger('click');
    }); // handler for 'when loading of data is done' event
});	// $(document).ready event handler


function queryProjects(e) {
    // N.B. In functional programming, a 'predicate' is a boolean-valued function
    var predicate; 
    
    // Figure out which search crieteria have been specified
    // If more than one search criterion was selected, search on the logical AND of these
    var town_id = +($('#select_town option:selected').val());      // Convert string containing text of number to number
    var town = $('#select_town option:selected').html();           // Get text of town name
    var subregion = $('#select_subregion option:selected').html(); // Get text of subregion name
    var category = $('#select_proj_category option:selected').val();
    var proj_status = $('#select_proj_status option:selected').val();
    var first_year = +$('#select_first_yr_prog option:selected').val();
    var ltrp_projects = $('#lrtp_project').prop('checked');
    var mpo_funded = $('#mpo_funded').prop('checked');
    var ctps_study = $('#ctps_study').prop('checked');
     // var tip_id = $('#select_tip_id option:selected').val();   
    
    // var results = DATA.projects_JOIN;  
    var results = DATA.projects;
    
    // 1. Did the search specify a town?
    if (town !== 'All') {
        // Find all the records in the projects table whose 'towns' field CONTAINS the specified town
       predicate = function(proj_rec) { return proj_rec.properties['towns'].contains(town) === true; };
       results = _.filter(results, predicate);
    }    
    // 2. Did the search specify a subregion?
    if (subregion != 'All') {
        // Find all the records in the projects table whose 'subregions' field CONTAINS the specified subregion
       predicate = function(proj_rec) { 
                        // It would appear that for some records, the 'subregions' property can be missing ... :-(
                        return (proj_rec.properties['subregions'] != null) && (proj_rec.properties['subregions'].contains(subregion) === true); };
       results = _.filter(results, predicate);        
    }   
    // 3. Did the search specity a project type?
    if (category !== '0') {
        predicate = function(proj_rec) { return proj_rec.properties['proj_cat'] === category; };
        results = _.filter(results, predicate);
    }    
    // 4. Did the search specify a project status?
    if (proj_status != 'All') {
        // *** TBD
    }
    // 5. Did the search specify a 'first year programmed'?
    if (first_year !== 0) {
        predicate = function(proj_rec) { return proj_rec.properties['first_year_prog'] === first_year; };
        results = _.filter(results, predicate);
    }  
    // 6. Was the search for LRTP projects?
    if (lrtp_project == true) {
        predicate = function(proj_rec) { return proj_rec.properties['lrtp_project'] === true; };
        results = _.filter(results, predicate);               
    }
    // 7. Was the search for MPO-funded projects?
    if (mpo_funded == true) {
        predicate = function(proj_rec) { return proj_rec.properties['mpo_project'] === true; };
        results = _.filter(results, predicate);
    }  
    // 8. Was the search for projects involving a CTPS study?
     if (ctps_study == true) {
        predicate = function(proj_rec) { return (proj_rec.properties['mpo_ctps_study'] != null && proj_rec.properties['mpo_ctps_study'] != '') ; };
        results = _.filter(results, predicate);
    }   
/*     
    // 9. Did the search specify a TIP ID
    // No longer supported...
    if (tip_id !== '0') {
        // Since there *should* be only one such record, we *should* be able to use _.find,
        // but I'm using _.filter "just in case" the data is funky, which it's been known to be.
        predicate = function(proj_rec) { return proj_rec.properties['tip_id'] === tip_id; };
        results = _.filter(results, predicate);
    }
*/
    // *** TBD sort results in order of ascending town (NOT town_id!) ...
    displayProjects(results);
} // queryProjects()


// Generate a Google Maps "marker" pin symbol with the specified color.
// Source: https://stackoverflow.com/questions/7095574/google-maps-api-3-custom-marker-color-for-default-dot-marker/7686977#7686977
function pinSymbol(color) {
    return {
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#000',
        strokeWeight: 2,
        scale: 1,
   };
} // pinSybol()   


function displayProjects(aProjects) {
    var i, j, tempstr, subregionstr, sRawUrl, sUrl, tip_id, ctps_id, 
        project_town_rec, project_town_id, tip_spatial_rec, 
        marker, pos, googleBounds, googleBoundsInit;
    var aData = [];
    
    // Remove any markers currently on the map
    aMarkers.forEach(function(marker) { marker.setMap(null); });
    if (infoWindow !== null) { infoWindow.close(); }
    
    googleBounds = new google.maps.LatLngBounds();
    googleBoundsInit = new google.maps.LatLngBounds(); // For testing if bounds have changed - See below
    for (i = 0; i < aProjects.length; i++) {
        // Accumulate data for table as we go along
        tip_id = aProjects[i].properties['tip_id'];
        // sRawUrl is the URL to go into the table, which will be formatted by a Slick Grid 'formatter' function
        sRawUrl = 'href="tipDetail.html?tip_id=' + tip_id;
        // sUrl is the URL to go into the InfoWindow popup on the Google Map
        sUrl = '<a href="tipDetail.html?tip_id=' + tip_id +'"';
        sUrl += ' target=_blank>' + aProjects[i].properties['tip_id'] + '</a>';
        subregionstr = tipCommon.cleanupFunkyString(aProjects[i].properties['subregions']);
        aData[i] = { 'id'             : 'id' + i,   // A unique id for each row is required by Slick Grid
                     'tip_id'         : tip_id,
                     'proj_name'      : aProjects[i].properties['proj_name'],
                     'proj_cat'       : aProjects[i].properties['proj_cat'],
                     'towns'          : aProjects[i].properties['towns'],
                     'subregions'     : subregionstr,
                     'cur_cost_est'   : aProjects[i].properties['cur_cost_est'],
                     'first_year_prog': aProjects[i].properties['first_year_prog']
                   };
        // If the project has a geographic representation, generate a Google Maps marker 
        if (aProjects[i].properties['has_geo'] === -1) {
            // *** Please read the following comment carefully:
            //
            // As of 01/30/2019 the tip_projects_view table (theoretically) encapsulates nearly all key information 
            // about projects other than their evaluation criteria scoring, funding/amendments, and proponents.
            // It now contains fields that collect all municipalities and subregions (as text strings) in which
            // the project is situated. The purpose of this is to no longer present a iisting of projects that
            // is the cross-product of 'project' and 'town'. Heretofore the uniqe identifer of each element in
            // this cross-product is/was the 'project_town_id', the primary purpose of which was to serve as
            // an index into the 'tip_spatial' table which associates a point location with each such ID.
            // Heretofore, the 'aProjects' array passed to this function was tje result of filtering the JOIN
            // of the tip_projects and tip_project_town_table. It is now merely the result of filtering the
            // tip projects table. The result of this is that a 'project_town_id' is no longer available 'at hand'
            // as an attribute of each entry in 'aProjects'. Thus we have to obtain a 'project_town_id' manually.
            // Since there may be more than one of these for any given project, when this is the case, the one
            // we grab here is simply the first one found by searching tip_project_town on the project's tip_id.
            // If you think you understood the above comment, you probably didn't. Please read it again.
            // -- BK 01/30/2019
            //
            ctps_id = aProjects[i].properties['ctps_id'];
            project_town_rec = _.find(DATA.proj_town, function(rec) { return rec.properties['ctps_id'] === ctps_id; });
            project_town_id = project_town_rec.properties['project_town_id'];
            tip_spatial_rec = _.find(DATA.tip_spatial, function(rec) { return rec.properties['project_town_id'] === project_town_id; });
            if (tip_spatial_rec === undefined) {
                // Defensive programming: This shouldn't happen, but just in case it does...
                var tmpStr = 'Cannot create marker for project tip_id = '  + tip_id + ', ' + ctps_id + ' ' + ctps_id + '.\n';
                tmpStr += '"is_geo" attribute is -1, but no record found in tip_spatial table.';
                // alert(tmpStr);
                console.log(tmpStr);
            } else {
                pos = { lat : tip_spatial_rec.properties['latitude'], lng : tip_spatial_rec.properties['longitude'] };
                marker = new google.maps.Marker({ position: pos,
                                                  map: map,
                                                  title: 'Project ' + aProjects[i].properties['tip_id'],
                                                  icon: pinSymbol(tipCommon.projCategoryToColor(aProjects[i]))
                                                });
                // Squirrel away various pieces of useful info about the project as a property of the marker object
                var ctpsProps = {};
                ctpsProps.projectDetailUrl = sUrl;
                ctpsProps.projectName = aProjects[i].properties['proj_name'];
                ctpsProps.town = aProjects[i].properties['towns'];
                marker.ctpsProps = ctpsProps;  
                aMarkers.push(marker);
                // Set up on-click event handler for the marker
                google.maps.event.addListener(marker, 'click', function(e) { 
                    var clickLocation = e.latLng; 
                    var content = this.ctpsProps.projectName + '<br/>' + this.ctpsProps.town + '<br/>' + this.ctpsProps.projectDetailUrl;
                    if (!infoWindow) {
                        infoWindow = new google.maps.InfoWindow();
                    }
                    infoWindow.setContent(content);     
                    infoWindow.setPosition(clickLocation);
                    infoWindow.open(map);
                });
                googleBounds.extend({ lat : tip_spatial_rec.properties['latitude'], lng : tip_spatial_rec.properties['longitude'] });          
            } // inner if: tip_spatial_rec is/isn't undefined
        } else {
            console.log('Project with TIP ID = ' + tip_id + ' has no record in tip_spatial table.');
        } // outer if: projct 'has_geo' 
    } // for over aProjects array
    
    // Clear out the items currently in the dataView, load it with the new data, and render it in the grid
    // 
    var i, tmp, len = dataView.getLength();
    dataView.beginUpdate();
    for (i = 0; i < len; i++) {
        tmp = dataView.getItem(i);
        dataView.deleteItem(tmp.id);
    }
    dataView.endUpdate();
    dataView.setItems(aData);
    
    // If the extent has been changed, adjust the map display accordingly
    if (!googleBounds.equals(googleBoundsInit)) {
        map.fitBounds(googleBounds);
    }
    
    // Render the data in aData in an accessible grid
    $('#project_list_contents_accessible').accessibleGrid(accColDesc, accGridOptions, aData);         
   
    // Lastly, if the search returned no results, inform the user
    if (aData.length === 0) {
        alert('The search found no projects.');
    } else {
        $('#download_button').show();
    }
    
    // Arm event handler for data download
    $('#download_button').click(function donwloadData(e) {
        // Create string of data to be downloaded
        var newstring = '';
         // First: header line
         newstring = 'TIP ID,Project Name,Category,Municipality,Current Cost Estimate,First Year Programmed';
         newstring += '\n';
        // Then: data lines
        for (i = 0; i < aData.length; i++) {
           newstring += aData[i].tip_id + ',';
           newstring += '"' + aData[i].proj_name + '"' + ','; // N.B. This field may contain commas!
           newstring += aData[i].proj_cat + ',';
           newstring += aData[i].town + ',';
           newstring += aData[i].cur_cost_est + ',';
           newstring += aData[i].first_year_prog;
           newstring += '\n';           
        }
        sessionStorage.setItem("sent", newstring); 
        download(newstring, "tip_project_list.csv", "text/csv");
    }); // on-click event handler for 'Download' button 
} // displayProjects() 

// *** Temp home of utility function
function drawPolylineFeature(lineFeature, gMap, style) {
    var gmPolyline = {}, aFeatCoords = [], point = {}, aAllPoints = [];
    var i, j;
    if (lineFeature.geometry.type === 'MultiLineString') {
        // console.log('Rendering MultiLintString feature.');
        aFeatCoords = lineFeature.geometry.coordinates;
        for (i = 0; i < aFeatCoords.length; i++) {
            aAllPoints = [];
            // Render each LineString in the MultiLineString individually
            for (j = 0; j < aFeatCoords[i].length; j++) {
                aCoord = aFeatCoords[i][j];
                point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
                aAllPoints.push(point);
            } // for j in aFeatCoords[i]
            gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                    map             : gMap,
                                                    strokeColor     : style.strokeColor,
                                                    strokeOpacity   : style.strokeOpacity,
                                                    strokeWeight    : style.strokeWeight });
        } // for i in aFeatureCoords.length
    } else if (lineFeature.geometry.type === 'LineString') {
        // console.log('Rendering LineString feature.');
        aFeatCoords = lineFeature.geometry.coordinates;
        for (i = 0; i < aFeatCoords.length; i++ ) {
            aCoord = aFeatCoords[i];
            point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
            aAllPoints.push(point);
        } // for i in aFeatureCoords.length
        gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                map             : gMap,
                                                strokeColor     : style.strokeColor,
                                                strokeOpacity   : style.strokeOpacity,
                                                strokeWeight    : style.strokeWeight });
    } else {
        console.log('Feature has unrecognized geometry type: ' + lineFeature.geometry.type);
        return;
    }
} //drawPolylineFeature()