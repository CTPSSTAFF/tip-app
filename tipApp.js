var wfsServerRoot = location.protocol + '//' + location.hostname + ':8080/geoserver/wfs';
// Global "database" of JSON returned from WFS requests
var DATA = {};
// Global Google Maps map object
var map = {};
// All Google Maps markers currently on the map
var aMarkers = [];
// infoWindow 'popup' for markers for point features
var infoWindow = null;
// Stuff for Slick Grid:
// Global grid object, grid options, column definitions, and dataView object
var grid = null;
var gridOptions = { enableColumnReorder : false };
var moneyFormatter =  function(row, cell, value, columnDef, dataContext) { 
                          var retval, tmp;
                          if (value != null) {
                              tmp = value.toLocaleString();
                              retval = (tmp.indexOf('.') === -1) ? tmp + '.00' : tmp;
                          } else {
                              retval = '';
                          }
                          return retval;
                      } // moneyFormatter()
// N.B. The width values reflect the jQueryUI font size being throttled-back to 80% of its default size
var gridColumns = [ // { id : 'foobar_col',    name : 'FOOBAR',       field : 'foobar', width : 100, sortable : true },
                    { id : 'tip_id_col',    name : 'TIP ID',       field : 'tip_id', width : 80, sortable: true,
                      formatter : function(row, cell, value, columnDef, dataContext) {
                                      return '<a href=tipDetail.html?tip_id=' + dataContext['tip_id'] + ' target=_blank">' + dataContext['tip_id'] + '</a>';
                                  } 
                    },
                    { id : 'proj_name_col',       name : 'Project Name',              field : 'proj_name',      width : 650, sortable : false }, 
                    { id : 'proj_cat_col',        name : 'Category',                  field : 'proj_cat',       width : 150, sortable : true },
                    { id : 'town_col',            name : 'Municipality',              field : 'town',           width : 150, sortable : true },
                    { id : 'cur_cost_est_col',    name : 'Current Cost Estimate ($)', field : 'cur_cost_est',   width : 170, sortable : true, 
                      cssClass : 'moneyColumn',   formatter : moneyFormatter }, 
                    { id : 'amt_programmed_col',  name : 'Amount Programmed ($)',     field : 'amt_programmed', width : 170, sortable : true, 
                      cssClass : 'moneyColumn',   formatter: moneyFormatter  } 
                 ];
var dataView = null;

$(document).ready(function() {
    var projectsURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_projects_view&outputformat=json';
    var eval_criteriaURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_evaluation_criteria&outputformat=json';
    var bridge_componentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_bridge_component_view&outputformat=json';
    var bridge_dataURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_bridge_dataw&outputformat=json';
    var proj_townURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_project_town_view&outputformat=json';
    var proj_proponentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_project_proponent_view&outputformat=json';
    var fundingURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_funding_view&outputformat=json';
    var amendmentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_project_amendment_view&outputformat=json';
    var city_town_lutURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_city_town_lookup&outputformat=json';
    var contactsURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_contacts&outputformat=json';
    var proj_catURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_tabular:tip_lut_proj_cat&outputformat=json';
    var tip_spatialURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=cert_act:tip_spatial_4app&outputformat=json';
    
    var getJson = function(url) {
        return $.get(url, null, 'json');
    };

    // Load data    
    $.when(getJson(projectsURL),   
           getJson(proj_townURL),  
           getJson(city_town_lutURL),  
           getJson(proj_catURL),
           getJson(tip_spatialURL)
    ).done(function(projects, proj_town, city_town_lut,  proj_cat, tip_spatial) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more WFS requests failed. Exiting application.");
            return;         
        }
        
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
         
        var oSelect, oOption;
        // Populate the <select> box for TIP_ID
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
        
        // Set up the machinery for the Slick Grid
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
       
        initApp(DATA); // No need to pass DATA as parm, but doing so anyway
    });
});	// $(document).ready event handler

function initApp(data) {
	var regionCenterLat = 42.345111165; 
	var regionCenterLng = -71.124736685;
    var zoomLev = 10;
	var lat = regionCenterLat;
	var lng = regionCenterLng;
    
	var mapOptions = {
		center: new google.maps.LatLng(lat, lng),
		zoom: zoomLev,
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
    // box is undefined (!!). Thus calling map.getBounds on a newly created map
    // will raise an error. We are compelled to force a "bounds_changed" event to fire.
    // Larry and Sergey: How did you let this one get through the cracks, guys? C'mon!
    map.setCenter(new google.maps.LatLng(lat + 0.000000001, lng + 0.000000001));
    
    $('#searchButton').click(function queryProjects(e) {
        // For the benefit of the unwashed: in functional programming, a 'predicate' is a boolean-valued function
        var predicate; 
        
        // Figure out which search parameters have been specified
        // If more than one search criterion was selected, search on the logical AND of these
        var town_id = +($('#select_town option:selected').val());   // Convert string to number
        var category = $('#select_proj_category option:selected').val();
        var tip_id = $('#select_tip_id option:selected').val();

        var results = DATA.projects_JOIN;   
        
        // 1. Did the search specify a town?
        if (town_id !== 0) {
            // Find all the records in the projects_JOIN table with the specified town_id
            predicate = function(proj_join_rec) { return proj_join_rec.properties['town_id'] === town_id; };
            var results = _.filter(results, predicate);
        }

        // 2. Did the search specity a project type?
        if (category !== '0') {
            predicate = function(proj_join_rec) { return proj_join_rec.properties['proj_cat'] === category; };
            results = _.filter(results, predicate);
            // Sort results in order of ascending town_id
            results.sort(function(a,b) { return a.properties['town_id'] - b.properties['town_id']; });
        } 
        
        // 3. Did the search specify a TIP ID?
        if (tip_id !== '0') {
            // Since there *should* be only one such record, we *should* be able to use _.find,
            // but I'm using _.filter "just in case" the data is funky, which it's been known to be.
            predicate = function(proj_join_rec) { return proj_join_rec.properties['tip_id'] === tip_id; };
            results = _.filter(results, predicate);
        }
        displayProjects(results);
    }); // queryProjects: on-click event handler for "Search" button
} // initApp()

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

// Given a tip_projects record, return the color in which to symbolize the project based on the project's 'category'
function projCategoryToColor(project) {
    var pcat = project.properties['proj_cat'];
    var retval;
    switch(pcat) {
    case 'Arterial and Intersection':
        retval = '#e661ac';
        break;
    case 'Bicycle and Pedestrian':
        retval = '#fd7567';
        break;
    case 'Bridge':
        retval = '#6991fd';
        break;
    case 'Major Highway':
        retval = '#ff9900';
        break;
    case 'Transit': 
        retval = '#00e64d';
        break;
    default:
        retval = '#050505';
        break;
    }
    return retval;
} // projTypeToColor

// TEMP, during dev
function generateRandomInteger(min, max) {
  return Math.floor(min + Math.random()*(max + 1 - min))
}

function displayProjects(aProjects) {
    var i, sRawUrl, sUrl, aData = [], tip_id, ctps_id, project_town_id, tip_spatial_rec, marker, googleBounds, pos;
    
    // Remove any markers currently on the map
    aMarkers.forEach(function(marker) { marker.setMap(null); });
    if (infoWindow !== null) { infoWindow.close(); }
    
    var googleBounds = new google.maps.LatLngBounds();
    var googleBoundsInit = new google.maps.LatLngBounds(); // For testing if bounds have changed - See below
    for (i = 0; i < aProjects.length; i++) {
        // Accumulate data for table as we go along
        tip_id = aProjects[i].properties['tip_id'];
        // sRawUrl is the URL to go into the table, which will be formatted by a Slick Grid 'formatter' function
        sRawUrl = 'href="tipDetail.html?tip_id=' + tip_id;
        // sUrl is the URL to go into the InfoWindow popup on the Google Map
        sUrl = '<a href="tipDetail.html?tip_id=' + tip_id +'"';
        sUrl += ' target=_blank>' + aProjects[i].properties['tip_id'] + '</a>';
        aData[i] = { 'id'             : 'id' + i,
                     // 'foobar'         : generateRandomInteger(0,100),
                     'tip_id'         : tip_id,
                     'proj_name'      : aProjects[i].properties['proj_name'],
                     'proj_cat'       : aProjects[i].properties['proj_cat'],
                     'town'           : aProjects[i].properties['town'],
                     'cur_cost_est'   : aProjects[i].properties['cur_cost_est'],
                     'amt_programmed' : aProjects[i].properties['amt_programmed']
                   };
        // If the project has a geographic representation, generate a Google Maps marker 
        if (aProjects[i].properties['has_geo'] === -1) {
            project_town_id = aProjects[i].properties['project_town_id'];
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
                                                  icon: pinSymbol(projCategoryToColor(aProjects[i]))
                                                });
                // Squirrel away various pieces of useful info about the project as a property of the marker object
                var ctpsProps = {};
                ctpsProps.projectDetailUrl = sUrl;
                ctpsProps.projectName = aProjects[i].properties['proj_name'];
                ctpsProps.town = aProjects[i].properties['town'];
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
        }// outer if: projct 'has_geo' 
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
} // displayProjects()