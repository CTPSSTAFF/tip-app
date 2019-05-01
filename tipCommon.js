// tipCommon.js - Library of common functions used in the (main) 'tipApp.js' and 'tipDetail.js' files.
// ===> N.B. This library *requires* that the underscore.js library be loaded *before* it is loaded!
//
// Author: B. Krepp
// Date: January, 2019
(function() {
    // Internals of the library (if any) go here
    //
	// *** Public API of the library begins here. ***
	return tipCommon = {
		version : "1.0",
        // projCategoryToColor: Given a tip_projects record, return the color in which to symbolize the project based on the project's 'category'
        projCategoryToColor :    function(project) {
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
                                }, // projCategoryToColor()
        // sgMoneyFormatter: SlickGrid formatting function to format data value of type "money" with two decimal places and commas as needed
        //                   the value returned is prefixed by a '$'.
        sgMoneyFormatter  :   function(row, cell, value, columnDef, dataContext) { 
                                  var retval, parts, temp;
                                  if (value != null) {
                                      // Latest (4/30/2019) request is to not show cents when displaying money values, even if they're present.
                                      /* 
                                      parts = (value + '').split('.');
                                      if (parts.length === 1) {
                                          // No decimal point ==> No digits to right of decimal point
                                          retval = '$' + (+parts[0]).toLocaleString() + '.00';
                                      } else if (parts[1].length === 1) {
                                          // Here: unabashed assumtption that parts.length === 2
                                          // Case 1: One digit to the right of decimal point ==> provide final '0'
                                          retval = '$' + (+parts[0]).toLocaleString() + '.' + parts[1] + '0';
                                      } else {
                                          // Case 2 (Unabashed assumption): two digits to right of decimal point
                                          retval = '$' + (+parts[0]).toLocaleString() + '.' + parts[1];
                                      }
                                      */
                                    temp = value.toFixed(0);
                                    retval = '$' + (+temp).toLocaleString();
                                  } else {
                                      retval = '';
                                  }
                                  return retval;
                            }, // sgMoneyFormatter()
        // moneyFormatter - 'Guts' of above sgMoneyFormatter function, w/o signature required by SlickGrid
        moneyFormatter: function(value) {
                                  var retval, parts, temp;
                                  if (value != null) {
                                      // Latest (4/30/2019) request is to not show cents when displaying money values, even if they're present.
                                      /*
                                      parts = (value + '').split('.');
                                      if (parts.length === 1) {
                                          // No decimal point ==> No digits to right of decimal point
                                          retval = '$' + (+parts[0]).toLocaleString() + '.00';
                                      } else if (parts[1].length === 1) {
                                          // Here: unabashed assumtption that parts.length === 2
                                          // Case 1: One digit to the right of decimal point ==> provide final '0'
                                          retval = '$' + (+parts[0]).toLocaleString() + '.' + parts[1] + '0';
                                      } else {
                                          // Case 2 (Unabashed assumption): two digits to right of decimal point
                                          retval = '$' + (+parts[0]).toLocaleString() + '.' + parts[1];
                                      }
                                      */
                                    temp = value.toFixed(0);
                                    retval = '$' + (+temp).toLocaleString();
                                  } else {
                                      retval = '';
                                  }
                                  return retval;            
                        },
        // cleanupFunkyString: Takes a string containing a comma-separated substrings - some of which may be duplicates
        //                     and each of which may contain leading and/or trailing blanks, and returns a single string
        //                     containing the unique substrings, comma-delimited.
        //                     In pracitical terms, this function is used to 'clean up' the 'towns' and 'subregions'
        //                     fields of the tip_projects table view.
        //                     N.B. This function requires that the underscore.js library has been loaded *before* this file.
        cleanupFunkyString: function(funkyString) {
                                var i, j, tmp1, tmp2, tmp3, retval;
                                if (funkyString != null) {
                                    tmp1 = funkyString.split(',');
                                    for (i = 0; i < tmp1.length; i++) {
                                        tmp1[i] = tmp1[i].replace(/ /g,'');
                                    }
                                    // Uniq-ify 
                                    tmp2 = _.uniq(tmp1);
                                    tmp3 = '';
                                    // Restore intervening commas, as/if needed
                                    for (j = 0; j < tmp2.length; j++) { 
                                        tmp3 += tmp2[j];
                                        if (j < tmp2.length - 1) {                                           
                                            tmp3 +=  ', '; 
                                        } 
                                    }
                                    retval = tmp3;
                                } else {
                                    retval = '';
                                }
                                return retval;
                            } // cleanupFunkyString()
	};
})();