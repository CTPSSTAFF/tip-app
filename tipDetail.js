// TIP web application - project detail page
// Author:  Ben Krepp
// Date:    Dec 2018 - Jan-Apr 2019
//
// Data sources:
//     GeoServer workspace: tip_viewer
//     GeoServer store:     tip
//     Layers and Tables:   
//          tip_viewer:tip_evaluation_criteria          - TIP project evaluation criteria table
//          tip_viewer:tip_bridge_data                  - bridge data table
//          tip_viewer:tip_bridge_component_view        - bridge component table (suppors multiple 'components' per bridge)
//          tip_viewer:tip_project_town_view            - project/town cross-product table
//          tip_viewer:tip_project_proponent_view       - table of TIP project proponents
//          tip_viewer:tip_funding_current_sum_view     - summary table of currrent funding for TIP projects
//          tip_viewer:tip_funding_proposed_sum_view    - summary table for proposed funding for TIP projects
//          tip_viewer:tip_project_amendment_view       - table of TIP ammentments (currently unused)
//          tip_viewer:tip_contacts                     - table of TIP contacts
//          tip_viewer:tip_project_town_list_view       - 'flattened' project/town cross-product table, one record per project
//          tip_viewer:tip_project_proponent_list_view  - 'flattened' project/proponent cross-product table, one record per project    
//          tip_viewer:tip_spatial_line_project_4app    - spatial table of line geometries, 1 per project    
//
// Dependencies on external libraries:
//     1. jQuery version 2.2.4
//     2. jQueryUI verson 1.2.1
//     3. Google Maps API version 3
//     4. underscore.js version 1.9.1
//     5. download.js version 4.2
//     6. turf.js
//     7. es6string.js
//
// General Comments
// ================
// Please see header comments in tipApp.js
//

$(document).ready(function() {
    // Stuff pertaining to retrieval of data from TIP database, and the data itself:
    //
    // Note that the following must be VIEWS in the underlying PostgreSQL database:
    //     tip_projects, bridge_component, project_town, project_proponent, funding, amendment, project_town_list, project_proponent_list
    //  
    // var wfsServerRoot = location.protocol + '//' + location.hostname + ':8080/geoserver/wfs';
    var wfsServerRoot = location.protocol + '//' + location.hostname + '/maploc/wfs';
    var projectsURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_projects_view&outputformat=json';
    var eval_criteriaURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_evaluation_criteria&outputformat=json';
    var bridge_componentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_bridge_component_view&outputformat=json';
    var bridge_dataURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_bridge_data&outputformat=json';
    var proj_townURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_project_town_view&outputformat=json';
    var proj_proponentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_project_proponent_view&outputformat=json';
    var funding_currentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_funding_current_sum_view&outputformat=json';
    var funding_proposedURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_funding_proposed_sum_view&outputformat=json';
    var amendmentURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_project_amendment_view&outputformat=json';
    var city_town_lutURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_city_town_lookup&outputformat=json';
    var contactsURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_contacts&outputformat=json';   
    // var proj_catURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_lut_proj_cat&outputformat=json';
        // The following maps the ctps_id of a project to a string containing the names(s) of the towns in which the project is located
    var project_town_listURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_project_town_list_view&outputformat=json';
        // The following maps the ctps_id of a project to a string containing the name(s) of the project's proponents
    var project_proponent_listURL = wfsServerRoot + '/?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_project_proponent_list_view&outputformat=json';
    
     // Global "database" of JSON returned from WFS requests
    var DATA = {};    
 
    // Enable jQueryUI tabs
    $('#tabs_div').tabs({ heightStyle : 'content' });
    
    // Stuff pertaining to the Google Map:
    //
    // Google Maps map object
    var map = {};    
    // Initialize the Google Map
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

    // START of petite hacque to set scale bar units to miles/imperial instead of km/metric:
    // See: https://stackoverflow.com/questions/18067797/how-do-i-change-the-scale-displayed-in-google-maps-api-v3-to-imperial-miles-un
    // and: https://issuetracker.google.com/issues/35825255
    var intervalTimer = window.setInterval(function() {
        var elements = document.getElementById("map").getElementsByClassName("gm-style-cc");
        for (var i in elements) {
            // look for 'km' or 'm' in innerText via regex https://regexr.com/3hiqa
            if ((/\d\s?(km|(m\b))/g).test(elements[i].innerText)) {
                // The following call effects the change of scale bar units
                elements[i].click();
                window.clearInterval(intervalTimer);
            }
        }
    }, 500);
    window.setTimeout(function() { window.clearInterval(intervalTimer) }, 20000 );
    // END of peitie hacque to set scale bar units to miles/imperial instead of km/metric   
 
    // Utility function to return the value of the parameter named 'sParam' from the window's URL
    function getURLParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        var i;
        for (i = 0; i < sURLVariables.length; i++ ) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam) {
                return sParameterName[1];
            }
        }
        // If we get here, parameter not found
        return('');
    } // gtetURLParameter()    
    
    // Machinery to load data and populate the local "database" (i.e,, "DATA" object):
    // 
    var getJson = function(url) {
        var tmp = $.get(url, null, 'json');
        return tmp;
    };
    var getCsv = function(url) {
        var tmp = $.get(url, null, 'csv');
        return tmp;
    };
    $.when(getJson(projectsURL), 
           getJson(eval_criteriaURL), 
           getJson(bridge_componentURL),
           getJson(bridge_dataURL), 
           getJson(proj_townURL), 
           getJson(proj_proponentURL),
           getJson(funding_currentURL), 
           getJson(funding_proposedURL),
           getJson(amendmentURL), 
           getJson(city_town_lutURL), 
           getJson(contactsURL),
           getJson(project_town_listURL),
           getJson(project_proponent_listURL)
    ).done(function(projects, 
                    eval_criteria, 
                    bridge_component, 
                    bridge_data, 
                    proj_town, 
                    proj_proponent, 
                    funding_current, 
                    funding_proposed,
                    amendment, 
                    city_town_lut,
                    contacts,  
                    project_town_list, 
                    project_proponent_list) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more WFS requests failed. Exiting application.");
            return;         
        }
        DATA.projects = projects[0].features.sort(function(a,b) { return (+a.properties.tip_id) - (+b.properties.tip_id) });
        DATA.eval_criteria = eval_criteria[0].features;
        DATA.bridge_component = bridge_component[0].features;
        DATA.bridge_data = bridge_data[0].features;
        DATA.proj_town = proj_town[0].features;
        DATA.proj_proponent = proj_proponent[0].features;
  
        DATA.funding_current = funding_current[0].features;
        DATA.funding_proposed = funding_proposed[0].features;
        
        DATA.amendment = amendment[0].features;
        DATA.city_town_lut = city_town_lut[0].features;
        DATA.contacts = contacts[0].features;
        DATA.project_town_list = project_town_list[0].features;       
        DATA.project_proponent_list = project_proponent_list[0].features;        
       
        var tip_id = getURLParameter('tip_id');
        var p = _.find(DATA.projects, function(project) { return project.properties['tip_id'] === tip_id; });
        if (p == null || p.length === 0) {
            alert('failed to find project with TIP ID ' + tip_id + ' in projects JSON.');
            return;
        }
        displayTabularData(p);        
        
        // If project has geographic feature, display on map
        if (p.properties['has_geo'] === -1) {
            var sQuery = 'cql_filter=tip_id=' + tip_id;
            var sUrl = wfsServerRoot + '?service=wfs&version=1.1.0&request=getfeature&typename=tip_viewer:tip_spatial_line_project_4app&srsName=EPSG:4326&outputformat=json&' + sQuery;
            $.ajax({ url		:   sUrl,
                     type		:   'GET',
                     dataType	:   'json',
                     success	:   function (data, textStatus, jqXHR) {
                                        var gmPolyline = {}; lineFeature = {}, aFeatCoords = [], point = {}, aAllPoints = [], bbox = [], googleBounds = {};
                                        var i, j, colour;
                                        if (data.features.length === 0) {
                                            alert('Warning: No line geometry found for project with TIP_ID = ' + tip_id + '.');
                                            return;
                                        }
                                        lineFeature = data.features[0];
                                        colour = tipCommon.projCategoryToColor(p);
                                        if (lineFeature.geometry.type === 'MultiLineString') {
                                            // console.log('Rendering MultiLintString feature with TIP ID  ' + lineFeature.properties['tip_id']);
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
                                                                                        map             : map,
                                                                                        strokeColor     : colour,
                                                                                        strokeOpacity   : 0.7,
                                                                                        strokeWeight    : 6 });
                                            } // for i in aFeatureCoords.length
                                        } else if (lineFeature.geometry.type === 'LineString') {
                                            // console.log('Rendering LineString feature with TIP ID  ' + lineFeature.properties['tip_id']);
                                            aFeatCoords = lineFeature.geometry.coordinates;
                                            for (i = 0; i < aFeatCoords.length; i++ ) {
                                                aCoord = aFeatCoords[i];
                                                point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
                                                aAllPoints.push(point);
                                                gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                                                        map             : map,
                                                                                        strokeColor     : colour,
                                                                                        strokeOpacity   : 0.7,
                                                                                        strokeWeight    : 6 });
                                            } // for i in aFeatureCoords.length
                                        } else {
                                            console.log('Project with TIP ID ' + tip_id + ': has unrecognized geometry type: ' + lineFeature.geometry.type);
                                            return;
                                        }
                                        bbox = turf.bbox(lineFeature);
                                        // Return value of turf.bbox() has the form: [minX, minY, maxX, maxY]
                                        // Morph this into a form Google Maps can digest
                                        googleBounds = new google.maps.LatLngBounds();
                                        googleBounds.extend({ lat : bbox[1], lng : bbox[0] });
                                        googleBounds.extend({ lat : bbox[3], lng : bbox[2] });
                                        map.fitBounds(googleBounds);
                                    }, // success handler
                     error		: 	function (qXHR, textStatus, errorThrown ) {
                                        alert('WFS request for data from tip_viewer:tip_spatial_line_project_4app failed.\n' + 'Status: ' + textStatus + '\n' + 'Error:  ' + errorThrown);
                                    } // error handler
            }); // $.ajax call - WFS request
        } // if (p.properties['has_geo'] === -1)     
    }); // handler for 'when loading of data is done' event
    
    // Display tabular data for the project whose tip_project table view record has been passed as parameter 'p'
    function displayTabularData(p) {
        var tmp, i, j;
        $('#project_detail_header').html('TIP Project ' + p.properties['tip_id'] + ' : ' + p.properties['proj_name']);
        $('.proj_data').empty(); 
        
        // Overview tab
        $('#tip_id').html(p.properties['tip_id']);
        $('#proj_name').html(p.properties['proj_name']);
        $('#proj_desc').html(p.properties['proj_desc']);
        $('#proj_cat').html(p.properties['proj_cat']);
        // Municipality OR Municipalities - summary line
        // We can now grab this info directly from the tip_projects table 'view'
        $('#muni_or_munis').html(tipCommon.cleanupFunkyString(p.properties['towns']));
       
/******
        var ctps_id, munis, town_id, town_rec, town_name, munis_rec, munis_str;
        ctps_id = p.properties['ctps_id'];
        munis = _.filter(DATA.proj_town, function(proj) { return proj.properties['ctps_id'] === ctps_id; });
        if (munis.length === 1) {
            town_id = munis[0].properties['town_id'];
            town_rec = _.find(DATA.city_town_lut, function(lut_rec) { return lut_rec['id'] === 'tip_city_town_lookup.' + town_id });
            town_name = town_rec.properties['town_name'];
            $('#muni_or_munis').html(town_name);
        } else {
            $('#municipality_header').html('Municipalities');
             munis_rec = _.find(DATA.project_town_list, function(pt_list_rec) { return pt_list_rec.properties['ctps_id'] === ctps_id });
            if (munis_rec != null && munis_rec.length != 0) {
                munis_str = munis_rec.properties['towns'];
            } else {
                munis_str = '';
            }
            $('#muni_or_munis').html(munis_str);
        }
*****/

        // Subregion OR Subregions - summary line
        // Again, this information is now collected in the tip_projects table 'view'
        // But we have to cleanup potential 'dupes' (hence the call to cleanupFunkyString)... 
        // AND 'translate' subregion abbreviations to their full-length form
        tmp = tipCommon.cleanupFunkyString(p.properties['subregions']);
        for (i = 0; i < tmp.length; i++) {
            tmp[i] = tmp[i].replace('ICC', 'Inner Core Committee');
            tmp[i] = tmp[i].replace('MAGIC', 'Minuteman Advisory Group on Interlocal Coordination');
            tmp[i] = tmp[i].replace('METROWEST', 'Metrowest Regional Collaborative');
            tmp[i] = tmp[i].replace('NSPC', 'North Suburban Planning Council');
            tmp[i] = tmp[i].replace('NSTF', 'North Shore Task Force');
            tmp[i] = tmp[i].replace('SSC', 'South Shore Coalition');
            tmp[i] = tmp[i].replace('SWAP', 'Southwest Area Plannning Committee');
            tmp[i] = tmp[i].replace('TRIC', 'Three Rivers Interlocal Council');
        }
        $('#subregion_or_subregions').html(tmp);
        
        // Proponent OR Proponents - summary line
        // We can now grab this info directly from the tip_projects table 'view'
        $('#proponent_or_proponents').html(tipCommon.cleanupFunkyString(p.properties['proponents']));
        
/*****
        // Note: Project 'proponents' are listed in the city_town_lookup table.
        //       'Proponents' include cities/towns AND a few other entitles, e.g., MassDOT, 
        //       the MBTA, etc., each of which is given a 'town_id' (yeech!) as a unique identifier.
        var props, prop, props_rec, prop_name, props_str;
        props = _.filter(DATA.proj_proponent, function(proj) { return proj.properties['ctps_id'] === ctps_id; });
        if (props.length === 1) {
            town_id = props[0].properties['town_id'];
            prop_rec = _.find(DATA.city_town_lut, function(lut_rec) { return lut_rec['id'] === 'tip_city_town_lookup.' + town_id });
            prop_name = prop_rec.properties['town_name'];
            $('#proponent_or_proponents').html(prop_name);
        } else {
            $('#proponent_header').html('Proponents');
             props_rec = _.find(DATA.project_town_list, function(pt_list_rec) { return pt_list_rec.properties['ctps_id'] === ctps_id });
            if (props_rec != null && props_rec.length != 0) {
                props_str = props_rec.properties['proponents'];
            } else {
                props_str = '';
            }
            $('#proponent_or_proponents').html(props_str);
        }   
*****/        

        $('#stip_prog').html(p.properties['stip_proj']);
        
        // NOTE: The data in the 'projects' table for the following fields may be NULL:
        //       - project length
        //       - existing lane-miles
        //       - lane-miles added or improved
        //       - total lane-miles
        //       - sidewalk miles
        //       - sidewalk miles improved
        //       - on-road bike facility miles
        //       - off-road bike facility miles
        //       If any such data item is null, render it as 0.
        //
        // Project length
        tmp = (p.properties['proj_len'] != null) ? p.properties['proj_len'].toLocaleString() : 0;
        $('#proj_len').html(tmp + ' miles');
        
        // ******************************************************************************** 
        //
        // WARNING: Grotesque Hack!!!
        // There is exactly one project in the database for which the term lane-miles doesn't apply, because it is a rail project.
        // (The project in question has TIP_ID 1570, the Green Line Extension project.
        // There is no field in the database indicating whether a project is a rail project to interrogate.
        // So, we are compelled to perform this test AND change the "captions" of three items in the "Overview" tab, based on the project ID.
        // Please note that this is not a sustainable approach in general, and should be replaced with the addition of a field in the
        // tip_projects table indicating whether a project is a 'road project, 'rail project', or whatever.
        //
        // ******************************************************************************** 
        if (p.properties['tip_id'] == '1570') {
            // Project is the Green Line Extension: change captions using the term 'lane-miles' to 'track-miles.'
            //
            // Existing 'track-miles'
            // First: fiddle with caption
            $('#exist_lane_mi_caption').html('Existing track-miles');
            // Second: get value, and fiddle with units used to report it
            tmp = (p.properties['exist_lane_mi'] != null) ? p.properties['exist_lane_mi'].toLocaleString() : 0;
            $('#exist_lane_mi').html(tmp + ' track-miles');
            //
            // 'Track-miles' added or improved
            // First: fiddle with caption
            $('#lane_mi_added_improved_caption').html('Track-miles added or improved');
            tmp = (p.properties['lane_mi_added_improved'] != null) ? p.properties['lane_mi_added_improved'].toLocaleString() : 0;
            // Second: get value, and fiddle with units used to report it
            $('#lane_mi_added_improved').html(tmp + ' track-miles');
            //
            // Total 'track-miles'
            $('#tot_lane_mi_caption').html('Total track-miles');
             // Second: get value, and fiddle with units used to report it
            tmp = (p.properties['tot_lane_mi'] != null) ? p.properties['tot_lane_mi'].toLocaleString() : 0;
            $('#tot_lane_mi').html(tmp + ' track-miles');            
        } else {    
            // Existing lane-miles
            tmp = (p.properties['exist_lane_mi'] != null) ? p.properties['exist_lane_mi'].toLocaleString() : 0;
            $('#exist_lane_mi').html(tmp + ' lane-miles');
            // Lane-miles added or improved
            tmp = (p.properties['lane_mi_added_improved'] != null) ? p.properties['lane_mi_added_improved'].toLocaleString() : 0;
            $('#lane_mi_added_improved').html(tmp + ' lane-miles');
            // Total lane-miles
            tmp = (p.properties['tot_lane_mi'] != null) ? p.properties['tot_lane_mi'].toLocaleString() : 0;
            $('#tot_lane_mi').html(tmp + ' lane-miles');
        }
        
        
        
        // Sidewalk miles
        tmp = (p.properties['sidewalk_mi'] != null) ? p.properties['sidewalk_mi'].toLocaleString() : 0;
        $('#sidewalk_mi').html(tmp + ' miles');
        // Sidewalk miles improved
        tmp = (p.properties['sidewalk_mi_improved'] != null) ? p.properties['sidewalk_mi_improved'].toLocaleString() : 0;
        $('#sidewalk_mi_improved').html(tmp + ' miles');        
        // On-road bike facility miles 
        tmp = (p.properties['on_road_bike_fac_mi'] != null) ? p.properties['on_road_bike_fac_mi'].toLocaleString() : 0;
        $('#on_road_bike_fac_mi').html(tmp + ' miles');       
        // Off-road bike facility miles
        tmp = (p.properties['off_road_bike_fac_mi'] != null) ? p.properties['off_road_bike_fac_mi'].toLocaleString() : 0;
        $('#off_road_bike_fac_mi').html(tmp + ' miles');
        
        $('#fdr_on_file').html(p.properties['fdr_on_file'] === -1 ? 'Yes' : 'No');
        $('#prc_approved').html(p.properties['prc_approved'] === -1 ? 'Yes' : 'No');
        $('#prc_year').html(p.properties['prc_year']); 
        $('#design_stat').html(p.properties['design_stat']); 
        // Remove 'Z' if it appears in a date - this appears to be a 'feature' of a JSON dump of a date/time field
        tmp = (p.properties['design_stat_date'] != null) ? p.properties['design_stat_date'].replace('Z','') : '';
        $('#design_stat_date').html(tmp);  
        $('#adds_capacity').html(p.properties['adds_capacity'] === -1 ? 'Yes' : 'No');
        $('#lrtp_project').html(p.properties['lrtp_project'] === -1 ? 'Yes' : 'No');
        $('#cur_cost_est').html(p.properties['cur_cost_est']); 
        // Remove 'Z' - see comment above
        tmp = (p.properties['proj_update_date'] != null) ? p.properties['proj_update_date'].replace('Z','') : '';
        $('#proj_update_date').html(tmp);  
        $('#funding_stat').html(p.properties['funding_stat']);
        $('#mpo_invest_prog').html(p.properties['mpo_invest_prog']);
        $('#lrtp_identified_need').html(p.properties['lrtp_identified_need']);
        $('#amt_programmed').html(tipCommon.moneyFormatter(p.properties['amt_programmed']));
        $('#mun_priority').html(p.properties['mun_priority'] === -1 ? 'Yes' : 'No');
        //
        // Detailed info on proponent(s) and contact(s) for each proponent - at end of Summary tab
        //
        var ctps_id, proponents, prop_town_id, city_town_rec, proponent_name, contacts, contact, nameStr, infoStr, htmlString;
        ctps_id = p.properties['ctps_id'];
        proponents = _.filter(DATA.proj_proponent, function(prop) { return prop.properties['ctps_id'] == ctps_id; });
        for (i = 0; i < proponents.length; i++) {
            // Non-municipalities can be project proponents, but they, too, have a (pseudo) 'town_id'
            prop_town_id = proponents[i].properties['town_id'];
            city_town_rec = _.find(DATA.city_town_lut, function(city_town_lut_rec) { return city_town_lut_rec.id == 'tip_city_town_lookup.' + prop_town_id; });
            proponent_name = city_town_rec.properties['town_name'];
            contacts = _.filter(DATA.contacts, function(contact_rec) { return contact_rec.id == 'tip_contacts.' + prop_town_id });
            htmlStr = '';           
            // Note that contacts.length may === 0, e.g., if project proponent is MassDOT, there is no 'proponent contact' (One wonders why.)
            if (contacts.length !=0) {
                for (j = 0; j < contacts.length; j++) {
                    nameStr = '';
                    infoStr = '';
                    contact = contacts[j];
                    nameStr += contact.properties['contact_first_name'] + ' ' + contact.properties['contact_last_name'] + '<br/>';
                    nameStr += contact.properties['contact_position'] + '<br/>';
                    nameStr += contact.properties['contact_organization'];
                    infoStr += contact.properties['contact_address1'] + '<br/>';
                    infoStr += (contact.properties['contact_address2'] != null) ? contact.properties['contact_address2'] + '<br/>' : '';
                    infoStr += contact.properties['contact_address_city'] + ', ';
                    infoStr += contact.properties['contact_address_state'] + ' '; // Wouldn't this aways be 'MA'???
                    infoStr += contact.properties['contact_address_zip'] + '<br/>';
                    infoStr += contact.properties['contact_telephone'] + '<br/>';
                    infoStr += contact.properties['contact_email'];
                    htmlStr += '<tr>' + '<td>' + proponent_name + '</td>' + '<td>' + nameStr + '</td>' + '<td>' + infoStr + '</td>' + '</tr>';
                }
            } else {
                    htmlStr = '<tr>' + '<td>' + proponent_name + '</td><td></td><td></td>' + '</tr>';
            }
            $('#proponents_table > tbody').html(htmlStr);
        }
        
        // Prep for retreiving project evaluation criteria
        //
        var queryString = 'tip_evaluation_criteria.' + ctps_id;
        var predicate = function(ec_record) { return ec_record.id === queryString };
        // N.B. The relation between the tip_projects table and the tip_evaluation_criteria table is 1-to-1.
        var ec = _.find(DATA.eval_criteria,predicate);
        
        // Evaluation criteria - safety
        tmp = (ec.properties['num_fatal_crashes'] != null) ? ec.properties['num_fatal_crashes'].toLocaleString() : '';
        $('#num_fatal_crashes').html(tmp);
        tmp = (ec.properties['num_injury_crashes'] != null) ? ec.properties['num_injury_crashes'].toLocaleString() : '';
        $('#num_injury_crashes').html(tmp);
        tmp = (ec.properties['num_property_crashes'] != null) ? ec.properties['num_property_crashes'].toLocaleString() : '';
        $('#num_property_crashes').html(tmp);
        tmp = (ec.properties['num_bicycle_crashes'] != null) ? ec.properties['num_bicycle_crashes'].toLocaleString() : '';
        $('#num_bicycle_crashes').html(tmp);
        tmp = (ec.properties['num_ped_crashes'] != null) ? ec.properties['num_ped_crashes'].toLocaleString() : '';
        $('#num_ped_crashes').html(tmp);
        tmp = (ec.properties['num_total_crashes'] != null) ? ec.properties['num_total_crashes'].toLocaleString() : '';
        $('#num_total_crashes').html(tmp);
        tmp = (ec.properties['epdo'] != null) ? ec.properties['epdo'].toLocaleString() : '';
        $('#epdo').html(tmp);
        $('#crash_severity_val_scor').html(ec.properties['crash_severity_val_scor']);
        $('#hsip_cluster').html(ec.properties['hsip_cluster']  === -1 ? 'Yes' : 'No');
        $('#truck_crashes').html(ec.properties['truck_crashes']);
        // Clean up '_' in date ranges, e.g., '2014_16'
        tmp = (ec.properties['crash_years'] != null) ? ec.properties['crash_years'].replace('_','-') : '';
        $('#crash_years').html(tmp);
        $('#crash_rate').html(ec.properties['crash_rate']);
        $('#intersec_type').html(ec.properties['intersec_type']);
        $('#urb_fed_func_class').html(ec.properties['urb_fed_func_class']);
        $('#crash_score_corr').html(ec.properties['crash_score_corr']);
        tmp = (ec.properties['total_adt'] != null) ? ec.properties['total_adt'].toLocaleString() : '';
        $('#total_adt').html(tmp);
        tmp = (ec.properties['truck_adt'] != null) ? ec.properties['truck_adt'].toLocaleString() : '';
        $('#truck_adt').html(tmp);
        $('#exist_ped_facilities').html(ec.properties['exist_ped_facilities']);
        $('#exist_ped_safety_issues').html(ec.properties['exist_ped_safety_issues']);
        $('#exist_ped_use').html(ec.properties['exist_ped_use']);
        $('#exist_ped_use_desc').html(ec.properties['exist_ped_use_desc']);
        $('#desired_ped_use').html(ec.properties['desired_ped_use']);
        $('#desired_ped_use_desc').html(ec.properties['desired_ped_use_desc']);
        $('#prop_ped_countermeas').html(ec.properties['prop_ped_countermea']);
        $('#ped_countermeas_eval').html(ec.properties['ped_countermeas_eval']);
        $('#ped_countermeas_score').html(ec.properties['ped_countermeas_score']);
        $('#ped_hsip').html(ec.properties['ped_hsip'] === -1 ? 'Yes' : 'No');
        $('#ped_hsip_bonus_score').html(ec.properties['ped_hsip_bonus_score']);
        $('#ex_bike_facilities').html(ec.properties['ex_bike_facilities']);
        $('#ex_bike_facilities_desc').html(ec.properties['ex_bike_facilities_desc']);
        $('#ex_bike_safety_issues').html(ec.properties['ex_bike_safety_issues']);
        $('#ex_bike_use').html(ec.properties['ex_bike_use']);
        $('#ex_bike_use_desc').html(ec.properties['ex_bike_use_desc']);
        $('#desired_bike_use').html(ec.properties['desired_bike_use']);
        $('#desired_bike_use_desc').html(ec.properties['desired_bike_use_desc']);
        // NOTE: This is NOT parallel with the 'pedestrian' world - there is no field in tip_project_evaluation called 'prop_bike_countermeasures'.
        //       The 'proposed bike countermeasures' ARE the proposed bike facilities ('prop_bike_facilities' field).
        // Why this is the case is beyond me, but that's the situation. 
        // -- BK 03/19/2019
        $('#prop_bike_countermeas').html(ec.properties['prop_bike_facilities']);
        $('#prop_bike_bike_fac_desc').html(ec.properties['prop_bike_bike_fac_desc']);
        $('#bike_countermeas_eval').html(ec.properties['bike_countermeas_eval']);
        $('#bike_countermeas_score').html(ec.properties['bike_countermeas_score']);
        $('#bike_hsip').html(ec.properties['bike_hsip'] === -1 ? 'Yes' : 'No');
        $('#bike_hsip_bonus_score').html(ec.properties['bike_hsip_bonus_score']);
        tmp = (ec.properties['max_cluster_epdo'] != null) ? ec.properties['max_cluster_epdo'].toLocaleString() : '';
        $('#max_cluster_epdo').html(ec.properties['max_cluster_epdo']);
        $('#truck_rdwy_deficiency').html(ec.properties['truck_rdwy_deficiency']);
        $('#prop_truck_countermeas').html(ec.properties['prop_truck_countermeas']);
        $('#truck_countermeas_eval').html(ec.properties['truck_countermeas_eval']);
        $('#imprv_trk_safety_score').html(ec.properties['imprv_trk_safety_score']);
        $('#trk_safety_bonus_scor').html(ec.properties['trk_safety_bonus_scor']);
        $('#at_grade_rr_xing').html(ec.properties['at_grade_rr_xing'] === -1 ? 'Yes' : 'No');
        $('#rr_xing_improv').html(ec.properties['rr_xing_improv']);
        $('#rr_xing_improv_desc').html(ec.properties['rr_xing_improv_desc']);
        $('#rr_xing_improv_score').html(ec.properties['rr_xing_improv_score']);
        $('#overall_safety_score').html(ec.properties['overall_safety_score']);
     
        // Evaluation criteria - system preservation
        $('#brdg_imprv_in_proj').html(ec.properties['brdg_imprv_in_proj']  === -1 ? 'Yes' : 'No');
        $('#imprv_substd_brdg_scor').html(ec.properties['imprv_substd_brdg_scor']);
        $('#iri_value').html(ec.properties['iri_value']);
        $('#iri_rating').html(ec.properties['iri_rating']);
        $('#iri_year').html(ec.properties['iri_year']);
        $('#exist_pavement_cond_desc').html(ec.properties['exist_pavement_cond_desc']);
        $('#imprv_substd_pvmt_scor').html(ec.properties['imprv_substd_pvmt_scor']);
        tmp = (ec.properties['total_signals_proj_area'] != null) ? ec.properties['total_signals_proj_area'].toLocaleString() : '';
        $('#total_signals_proj_area').html(tmp);
        tmp = (ec.properties['signals_to_be_improved'] != null) ? ec.properties['signals_to_be_improved'].toLocaleString() : '';
        $('#signals_to_be_improved').html(tmp);
        $('#signal_desc').html(ec.properties['signal_desc']);
        $('#planned_signal_improv').html(ec.properties['planned_signal_improv']);
        $('#imprv_substd_sig_scor').html(ec.properties['imprv_substd_sig_scor']);
        $('#in_hurricane_evac_zn').html(ec.properties['in_hurricane_evac_zn']  === -1 ? 'Yes' : 'No');
        $('#imprv_evac_rte').html(ec.properties['imprv_evac_rte']  === -1 ? 'Yes' : 'No');
        $('#imprv_evac_rte_score').html(ec.properties['imprv_evac_rte_score']);
        $('#in_flood_zone').html(ec.properties['in_flood_zone']  === -1 ? 'Yes' : 'No');
        $('#flood_probs_desc').html(ec.properties['flood_probs_desc']);
        $('#addr_flooding_score').html(ec.properties['addr_flooding_score']);
        $('#near_emerg_support_fac').html(ec.properties['near_emerg_support_fac']  === -1 ? 'Yes' : 'No');
        $('#emerg_suppt_fac_names').html(ec.properties['emerg_suppt_fac_names']);
        $('#imprv_emerg_supp_acc').html(ec.properties['imprv_emerg_supp_acc']  === -1 ? 'Yes' : 'No');
        $('#imprv_emerg_supp_desc').html(ec.properties['imprv_emerg_supp_desc']);
        $('#imprv_emerg_supp_score').html(ec.properties['imprv_emerg_supp_desc']);
        $('#trnst_asset_to_good_repair').html(ec.properties['trnst_asset_to_good_repair']  === -1 ? 'Yes' : 'No');
        $('#trnst_asset_imprv_desc').html(ec.properties['trnst_asset_imprv_desc']);
        $('#addr_asset_mgt_plan').html(ec.properties['addr_asset_mgt_plan']  === -1 ? 'Yes' : 'No');
        $('#imprv_transit_asset_scor').html(ec.properties['imprv_transit_asset_scor']);
        $('#ex_sidewalk_cond_rat').html(ec.properties['ex_sidewalk_cond_rat']);
        $('#ex_sidewalk_cond_char').html(ec.properties['ex_sidewalk_cond_char']);
        $('#prop_sidewalk_imprv').html(ec.properties['prop_sidewalk_imprv']);
        $('#imprv_substd_sdwlk_scor').html(ec.properties['imprv_substd_sdwlk_scor']);
        $('#to_seismic_design_std').html(ec.properties['to_seismic_design_std']  === -1 ? 'Yes' : 'No');
        $('#seismic_std_issues').html(ec.properties['seismic_std_issues']);
        $('#addr_crit_infrastruc').html(ec.properties['addr_crit_infrastruc']  === -1 ? 'Yes' : 'No');
        $('#addr_crit_infras_steps').html(ec.properties['addr_crit_infras_steps']);
        $('#implem_haz_clim_plan').html(ec.properties['implem_haz_clim_plan']  === -1 ? 'Yes' : 'No');
        $('#haz_clim_plan_desc').html(ec.properties['haz_clim_plan_desc']);
        $('#imprv_resp_xtrm_cnd_scor').html(ec.properties['imprv_resp_xtrm_cnd_scor']);
        $('#protects_frt_net_elem').html(ec.properties['protects_frt_net_elem']  === -1 ? 'Yes' : 'No');
        $('#overall_sys_pres_score').html(ec.properties['overall_sys_pres_score']);
        //
        // Bridge data (if any) is a sub-component of 'System Preservation'
        var bridge, bdept, bridge_rating, aashto_rating, year_built, year_rebuilt, htmlString;
        var bridge_components = _.filter(DATA.bridge_component, function(bcrec) { return bcrec.properties['ctps_id'] == ctps_id;});
        if (bridge_components.length === 0) {
            $('#lloyd_bridges_div').hide();
        } else {
            htmlString = '';
            for (i = 0; i < bridge_components.length; i++) {
                // Find relevant record in 'tip_bridge_data' table
                bdept = bridge_components[i].properties['bdept'];
                bridge = _.find(DATA.bridge_data, function(bdrec) { return bdrec['id'] == 'tip_bridge_data.' + bdept; });
                bridge_rating = (bridge.properties['bridge_rating'] != null) ? bridge.properties['bridge_rating'] : '';
                aashto_rating = (bridge.properties['aashto_rating'] != null) ? bridge.properties['aashto_rating'] : '';
                year_built =    (bridge.properties['year_built'] != null) ? bridge.properties['year_built'] : '';
                year_rebuilt =  (bridge.properties['year_rebuilt'] != null) ? bridge.properties['year_rebuilt'] : '';
                // Generate the HTML to be injected into the <table><tbody> in the lloyd_bridges_div
                htmlString += '<tr>';
                htmlString += '<td>' + bdept + '</td>';
                htmlString += '<td>' + bridge_rating + '</td>';
                htmlString += '<td>' + aashto_rating + '</td>';
                htmlString += '<td>' + year_built + '</td>';
                htmlString += '<td>' + year_rebuilt + '</td>';
                htmlString += '</tr>';
            } 
            $('#bridges_table > tbody').html(htmlString);
            $('#lloyd_bridges_div').show();
        }

        // Evaluation criteria - capacity management
        $('#mbta_bus_rtes').html(ec.properties['mbta_bus_rtes']);
        $('#other_transit_rtes').html(ec.properties['other_transit_rtes']);
        tmp = (ec.properties['daily_transit_runs'] != null) ? ec.properties['daily_transit_runs'].toLocaleString() : '';
        $('#daily_transit_runs').html(tmp);
        tmp = (ec.properties['nobld_signal_dealy'] != null) ? ec.properties['nobld_signal_dealy'].toLocaleString() : '';
        $('#nobld_signal_dealy').html(tmp);
        tmp = (ec.properties['bld_signal_dealy'] != null) ? ec.properties['bld_signal_dealy'].toLocaleString() : '';
        $('#bld_signal_dealy').html(tmp);
        tmp = (ec.properties['chg_signal_dealy'] != null) ? ec.properties['chg_signal_dealy'].toLocaleString() : '';
        $('#chg_signal_dealy').html(tmp);
        tmp = (ec.properties['chg_transit_veh_delay'] != null) ? ec.properties['chg_transit_veh_delay'].toLocaleString() + ' hours' : '';
        $('#chg_transit_veh_delay').html(tmp);
        $('#transit_delay_base_scor').html(ec.properties['transit_delay_base_scor']);
        $('#imprv_key_bus_rtes').html(ec.properties['imprv_key_bus_rtes']  === -1 ? 'Yes' : 'No');
        $('#transt_delay_bonus_scor').html(ec.properties['transt_delay_bonus_scor']);
        $('#adds_new_sidewalks').html(ec.properties['adds_new_sidewalks']  === -1 ? 'Yes' : 'No');
        $('#imprv_ada_access').html(ec.properties['imprv_ada_access']  === -1 ? 'Yes' : 'No');
        $('#id_ped_net_gap').html(ec.properties['id_ped_net_gap']  === -1 ? 'Yes' : 'No');
        $('#ped_net_gap_descr').html(ec.properties['ped_net_gap_descr']);
        $('#imprv_ped_net_score').html(ec.properties['imprv_ped_net_score']);
        $('#id_bike_net_gap').html(ec.properties['id_bike_net_gap']  === -1 ? 'Yes' : 'No');
        $('#bike_net_gap_descr').html(ec.properties['bike_net_gap_descr']);
        $('#imprv_bike_net_score').html(ec.properties['imprv_bike_net_score']);
        $('#trnst_conn_imprv_desc').html(ec.properties['trnst_conn_imprv_desc']);
        $('#trnst_conn_imprv_assmt').html(ec.properties['trnst_conn_imprv_assmt']);
        $('#intrmodl_fac_use_assmt').html(ec.properties['intrmodl_fac_use_assmt']);
        $('#intrmodl_fac_use_data').html(ec.properties['intrmodl_fac_use_data']);
        $('#imprv_intrmodl_conn_scor').html(ec.properties['imprv_intrmodl_conn_scor']);
        $('#trk_rdwy_cond_desc').html(ec.properties['trk_rdwy_cond_desc']);
        $('#trk_deficiencies_desc').html(ec.properties['trk_deficiencies_desc']);
        $('#trk_mvmt_improv_asssmt').html(ec.properties['trk_mvmt_improv_asssmt']);
        $('#bottleneck_loc').html(ec.properties['bottleneck_loc']  === -1 ? 'Yes' : 'No');
        $('#improv_trk_mvmt_scor').html(ec.properties['improv_trk_mvmt_scor']);
        $('#veh_delay_chg').html(ec.properties['veh_delay_chg'] + ' seconds');
        $('#reduc_veh_cong_scor').html(ec.properties['reduc_veh_cong_scor']);
        $('#overall_cp_mgmt_score').html(ec.properties['overall_cp_mgmt_score']);

        // Evaluation criteria - clean air / clean communities
        $('#in_green_community').html(ec.properties['in_green_community']  === -1 ? 'Yes' : 'No');
        $('#green_community_scor').html(ec.properties['green_community_scor']);
        $('#co2_tons_reduced').html(ec.properties['co2_tons_reduced'] + ' tons');
        $('#reduces_co2_score').html(ec.properties['reduces_co2_score']);
        $('#emissions_change').html(ec.properties['emissions_change'] + ' tons');
        $('#reduc_emissions_scor').html(ec.properties['reduc_emissions_scor']);
        $('#strmwtr_best_pract').html(ec.properties['strmwtr_best_pract']  === -1 ? 'Yes' : 'No');
        $('#strmwtr_best_pract_desc').html(ec.properties['strmwtr_best_pract_desc']);
        $('#cult_res_os_improv').html(ec.properties['cult_res_os_improv']  === -1 ? 'Yes' : 'No');
        $('#cult_res_os_improv_desc').html(ec.properties['cult_res_os_improv_desc']);
        $('#wetlands_res_improv').html(ec.properties['wetlands_res_improv']  === -1 ? 'Yes' : 'No');
        $('#wetlands_res_improv_desc').html(ec.properties['wetlands_res_improv_desc']);
        $('#wildlife_area_imprv').html(ec.properties['wildlife_area_imprv']  === -1 ? 'Yes' : 'No');
        $('#wildlife_area_imprv_desc').html(ec.properties['wildlife_area_imprv_desc']);
        $('#addr_env_impct_score').html(ec.properties['addr_env_impct_score']);
        $('#overall_cln_air_score').html(ec.properties['overall_cln_air_score']);

        // Evaluation criieria - transportation equity
        // NOTE: There are cases in which we have to 'decorate' the raw value returned from the database:
        //      - minority population concentration
        //      - low-income household concentration
        //      - LEP population concentration
        //      - elderly population concentration
        //      - ZVHH household concentration
        //      - disabled population concentration
        //
        $('#min_pop_pct').html(ec.properties['min_pop_pct'] + '%');
        tmp = (ec.properties['min_pop_count'] != null) ? ec.properties['min_pop_count'].toLocaleString() + ' people' : '';
        $('#min_pop_count').html(tmp);
        //
        // Minority population concentration
        tmp = ec.properties['min_pop_concent'];
        tmp += (tmp === 'high') ? ' (> 2,000 people)' : ' (< or = 2,000 people)'; 
        $('#min_pop_concent').html(tmp);
        $('#min_pop_score').html(ec.properties['min_pop_score']);
        $('#low_inc_hh_pct').html(ec.properties['low_inc_hh_pct'] + '%');
        tmp = (ec.properties['low_inc_hh_count'] != null) ? ec.properties['low_inc_hh_count'].toLocaleString() + ' households' : '';
        $('#low_inc_hh_count').html(tmp);
        //
        // Low-income household concentration
        tmp = ec.properties['low_inc_hh_concent'];
        tmp += (tmp === 'high') ? ' (> 2,000 households)' : ' (< or = 2,000 households)'; 
        $('#low_inc_hh_concent').html(tmp);
        $('#low_inc_hh_score').html(ec.properties['low_inc_hh_score']);
        $('#lep_pop_pct').html(ec.properties['lep_pop_pct'] + '%');
        tmp = (ec.properties['lep_pop_count'] != null) ? ec.properties['lep_pop_count'].toLocaleString() + ' people' : '';
        $('#lep_pop_count').html(tmp);
        //
        // LEP population concentration
        tmp = ec.properties['lep_pop_concent'];
        tmp += (tmp === 'high') ? ' (> 1,000 people)' : ' (< or = 1,000 people)'; 
        $('#lep_pop_concent').html(tmp);  
        $('#lep_pop_score').html(ec.properties['lep_pop_score']);
        $('#elderly_pop_pct').html(ec.properties['elderly_pop_pct'] + '%');
        tmp = (ec.properties['elderly_pop_count'] != null) ? ec.properties['elderly_pop_count'].toLocaleString() + ' people' : '';
        $('#elderly_pop_count').html(ec.properties['elderly_pop_count'] + ' people');
        //
        // Elderly population concentration
        tmp = ec.properties['elderly_pop_concent'];
        tmp += (tmp === 'high') ? ' (> 2,000 people)' : ' (< or = 2,000 people)'; 
        $('#elderly_pop_concent').html(tmp);
        $('#elderly_pop_score').html(ec.properties['elderly_pop_score']);
        $('#zero_veh_hh_pct').html(ec.properties['zero_veh_hh_pct'] + '%');
        tmp = (ec.properties['zero_veh_hh_count'] != null) ? ec.properties['zero_veh_hh_count'].toLocaleString() + ' households' : '';
        $('#zero_veh_hh_count').html(ec.properties['zero_veh_hh_count'] + ' households');
        //
        // ZVH household concentration        
        tmp = ec.properties['zero_veh_hh_concent'];
        tmp += (tmp === 'high') ? ' (> 1,000 households)' : ' (< or = 1,000 households)'; 
        $('#zero_veh_hh_concent').html(tmp);
        $('#zero_veh_hh_score').html(ec.properties['zero_veh_hh_score']);
        $('#disabled_pop_pct').html(ec.properties['disabled_pop_pct'] + '%');
        tmp = (ec.properties['disabled_pop_count'] != null) ? ec.properties['disabled_pop_count'].toLocaleString() + ' people' : '';
        $('#disabled_pop_count').html(tmp);
        // 
        // Disabled population concentration
        tmp = ec.properties['disabled_pop_concent'];
        tmp += (tmp === 'high') ? ' (> 1,000 people)' : ' (< or = 1,000 people)';
        $('#disabled_pop_concent').html(tmp);
        $('#disabled_pop_score').html(ec.properties['disabled_pop_score']);
        $('#creates_ttl6_ej_burden').html(ec.properties['creates_ttl6_ej_burden']  === -1 ? 'Yes' : 'No');
        $('#creates_burden_score').html(ec.properties['creates_burden_score']);
        $('#overall_equity_score').html(ec.properties['overall_equity_score']);
        
        // Evaluation critieria - economic vitality
        $('#near_targ_dev_site').html(ec.properties['near_targ_dev_site']  === -1 ? 'Yes' : 'No');
        $('#targ_dev_site_name').html(ec.properties['targ_dev_site_name']);
        $('#targ_dev_site_acc_imprv').html(ec.properties['targ_dev_site_acc_imprv']);
        $('#td_transit_access_chg').html(ec.properties['td_transit_access_chg'] );
        $('#td_bike_access_chg').html(ec.properties['td_bike_access_chg']  === -1 ? 'Yes' : 'No');
        $('#td_ped_access_chg').html(ec.properties['td_ped_access_chg']  === -1 ? 'Yes' : 'No');
        $('#td_road_access_chg').html(ec.properties['td_road_access_chg']  === -1 ? 'Yes' : 'No');
        $('#serves_targ_dev_score').html(ec.properties['serves_targ_dev_score']);
        $('#conc_dev_area').html(ec.properties['conc_dev_area']  === -1 ? 'Yes' : 'No');
        $('#conc_dev_proj_overlap').html(ec.properties['conc_dev_proj_overlap']);
        $('#smart_growth_zoning').html(ec.properties['smart_growth_zoning']  === -1 ? 'Yes' : 'No');
        $('#has_commerc_dist_org').html(ec.properties['has_commerc_dist_org']  === -1 ? 'Yes' : 'No');
        $('#commerc_dist_org_name').html(ec.properties['commerc_dist_org_name']);
        $('#consist_metro_fut_scor').html(ec.properties['consist_metro_fut_scor']);
        $('#improv_acc_hi_econ_act').html(ec.properties['improv_acc_hi_econ_act']  === -1 ? 'Yes' : 'No');
        $('#improv_act_ctr_transit_acc').html(ec.properties['improv_act_ctr_transit_acc']  === -1 ? 'Yes' : 'No');
        $('#improv_act_ctr_ped_acc').html(ec.properties['improv_act_ctr_ped_acc']  === -1 ? 'Yes' : 'No');
        $('#improv_act_ctr_bike_acc').html(ec.properties['improv_act_ctr_bike_acc']  === -1 ? 'Yes' : 'No');
        $('#improv_act_ctr_truck_acc').html(ec.properties['improv_act_ctr_truck_acc']  === -1 ? 'Yes' : 'No');
        $('#improv_act_ctr_truck_acc').html(ec.properties['improv_act_ctr_truck_acc']);
        $('#non_tip_invest_type').html(ec.properties['non_tip_invest_type']);
        $('#non_tip_invest_pct').html(ec.properties['non_tip_invest_pct']);
        $('#lev_othr_invest_score').html(ec.properties['lev_othr_invest_score']);
        $('#overall_econ_vital_score').html(ec.properties['overall_econ_vital_score']);
        
        $('#overall_eval_score').html(ec.properties['overall_eval_score']);
        
        // Funding information
        // -1 is used as indicator of TRUE in DB records, per MS Access (Yeech) standards
        var has_cur_funding = p.properties['in_tip_current'] == -1;
        var has_prop_funding = p.properties['in_tip_proposed'] == -1;
        
        var cur_funding =  _.filter(DATA.funding_current, function(rec) { return rec.properties['ctps_id'] == p.properties['ctps_id']; });
        var prop_funding = _.filter(DATA.funding_proposed, function(rec) { return rec.properties['ctps_id'] == p.properties['ctps_id']; });
        // The results of the 2 _.filter operations above will contain 3 records:
        // record 0 - for Federal funds
        // record 1 - for Non-Federal funds
        // record 2 - total
        var fed_ix = 0; nonfed_ix = 1, total_ix = 2;
        var headerLine, fedLine, nonFedLine, totalLine, htmlStr;
        
        // Current funding
        if (has_cur_funding == true && cur_funding.length > 0) {
            headerLine = '<thead><tr><td></td>' +
                                     '<td class="columnHeader">FY 2019</td>' +
                                     '<td class="columnHeader">FY 2020</td>' +
                                     '<td class="columnHeader">FY 2021</td>' +
                                     '<td class="columnHeader">FY 2022</td>' +
                                     '<td class="columnHeader">FY 2023</td>' +
                                '</tr>' +
                          '</thead>';
            fedLine = '<tr><td>Federal Funds</td>' +
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[fed_ix].properties['fy2019']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[fed_ix].properties['fy2020']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[fed_ix].properties['fy2021']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[fed_ix].properties['fy2022']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[fed_ix].properties['fy2023']) + '</td>' + 
                       '</tr>';
            nonFedLine = '<tr><td>Non-federal Funds</td>' +
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[nonfed_ix].properties['fy2019']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[nonfed_ix].properties['fy2020']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[nonfed_ix].properties['fy2021']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[nonfed_ix].properties['fy2022']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[nonfed_ix].properties['fy2023']) + '</td>' + 
                       '</tr>';
            totalLine = '<tr><td>Total Funds</td>' +
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[total_ix].properties['fy2019']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[total_ix].properties['fy2020']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[total_ix].properties['fy2021']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[total_ix].properties['fy2022']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(cur_funding[total_ix].properties['fy2023']) + '</td>' + 
                       '</tr>';
            htmlStr = headerLine + '<tbody>' + fedLine + nonFedLine + totalLine + '</tbody>';           
            $('#current_funding_table').html(htmlStr);
            $('#current_funding').show();
        } else {
            $('#current_funding').hide();
        }
        
        // Proposed funding
        if (has_prop_funding == true && prop_funding.length > 0) {
            headerLine = '<thead><tr><td></td><td class="columnHeader">FY 2019</td>' +
                                             '<td class="columnHeader">FY 2020</td>' +
                                             '<td class="columnHeader">FY 2021</td>' +
                                             '<td class="columnHeader">FY 2022</td>' +
                                             '<td class="columnHeader">FY 2023</td>' +
                                '</tr>' +
                          '</thead>';
            fedLine = '<tr><td>Federal Funds</td>' +
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[fed_ix].properties['fy2019']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[fed_ix].properties['fy2020']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[fed_ix].properties['fy2021']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[fed_ix].properties['fy2022']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[fed_ix].properties['fy2023']) + '</td>' + 
                       '</tr>';
            nonFedLine = '<tr><td>Non-federal Funds</td>' +
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[nonfed_ix].properties['fy2019']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[nonfed_ix].properties['fy2020']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[nonfed_ix].properties['fy2021']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[nonfed_ix].properties['fy2022']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[nonfed_ix].properties['fy2023']) + '</td>' + 
                       '</tr>';
            totalLine = '<tr><td>Federal Funds</td>' +
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[total_ix].properties['fy2019']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[total_ix].properties['fy2020']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[total_ix].properties['fy2021']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[total_ix].properties['fy2022']) + '</td>' + 
                           '<td class="moneyColumn">' + tipCommon.moneyFormatter(prop_funding[total_ix].properties['fy2023']) + '</td>' + 
                       '</tr>';
            htmlStr = headerLine + '<tbody>' + fedLine + nonFedLine + totalLine + '</tbody>';             
            $('#proposed_funding').show();
        } else {
            $('#proposed_funding').hide();
        }       
        
    } // displayTabularData()
});	 // $(document).ready event handler