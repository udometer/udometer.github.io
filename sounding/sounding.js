/*windyobj.store.getAllowed('overlay')
["wind", "gust", "rain", "rainAccu", 
	"snowAccu", "snowcover", "ptype", "thunder",
	"temp", "dewpoint", "rh", "deg0", "clouds", 
	"hclouds", "mclouds", "lclouds", "fog", 
	"cloudtop", "cbase", "visibility", "cape", 
	"waves", "swell1", "swell2", "swell3", "wwaves", 
	"sst", "sstanom", "currents", "cosc", "dustsm", 
	"so2sm", "ozone", "radar", "pressure"];*/

/*windyobj.store.get('availLevels')
levels = ["surface", "100m", "975h", "950h", 
"925h", "900h", "850h","800h", "700h", "600h",
"500h", "400h", "300h", "250h", "200h", "150h"];
*/

var levelToPressureMap = {
	"surface": NaN,
	"100m": NaN,
	"975h": 975,
	"950h": 950,
	"925h": 925,
	"900h": 900,
	"850h": 850,
	"800h": 800,
	"700h": 700,
	"600h": 600,
	"500h": 500,
	"400h": 400,
	"300h": 300,
	"250h": 250,
	"200h": 200,
	"150h": 150
}


/* Get wind dir (d), wind speed (s), RH (RH), temperature (Tc) at each pressure (p).
	Get cloud top (Ct), Cloud base (Cb) height -- but only ECMWF gives this data.
	
   - plot wind TeGramgraph
   - plot a vertical graph of Equivalent potential temperature (a.k.a Theta E, Te).
   - Mention/plot cloud top height. 
   Te =  (273.15 + Tc) * ( 1000 / p ) ^ 0.286 + (3 * (RH * (3.884266 * 10 ^ (( 7.5 * Tc ) / ( 237.7 + Tc )) ) /100 ));
   
   Windy switches product ("ecmwf/gfs") if current product does not have the info.
*/

var mapLevel = 0;
var levels = [];
var statusString = "";
var preambleString = "";
var dataRowString = "";
var curr_location = "";
var location_desc = "";
var cap = 0;
var pickerObserver = null;
var graphTabObserver = null;
var dataset = {};

var body_node = document.querySelector("body");
var TeGramDataTextArea = document.getElementById('TeGramDataTextArea');
var TeGramOuterDiv = document.getElementById('TeGramOuterDiv');
var TeGramOutputDiv = document.getElementById('TeGramOutputDiv');
var TeGramHideButton = document.getElementById('TeGramHideButton');
var TeGramPlotButton = document.getElementById('TeGramPlotButton');
var TeGramLatLonInput = document.getElementById('TeGramLatLonInput');
var TeGramGraphDiv = document.getElementById("TeGramGraphDiv");
var hodoGraphDiv = document.getElementById("hodoGraphDiv");
var TeGramGraphTab = document.getElementById("TeGramGraphTab");
var TeGramGraphTabButton = document.getElementById("TeGramGraphTabButton");
var TeGramTextTabButton = document.getElementById("TeGramTextTabButton");
var TeGramSpacerDiv = document.getElementById("TeGramSpacerDiv");
var pickerContent = null;

function resetDataset() {
	var d = dataset;
	dataset.product = 'ecmwf';
	d.ll = {};
	d.ll.lat = 13.04;
	d.ll.lon = 80.17;
	d.atHeight = {};
	d.surfacePressure = NaN;
	d.surfaceTemp = NaN;
	d.cBase = NaN;
	d.cTopm = NaN;
	d.cTophPa = NaN;
}

function getPickerText() {
	var big = pickerContent.querySelector('big');
	if (big) {
		return big.textContent;
	}
	return "";
}

function collectWind() {
	var h = levels[mapLevel];
	var atH = dataset.atHeight[h];
	var t = getPickerText();

	atH.angle = NaN;
	atH.speed = NaN;

	if (t) {
		var re = /[0-9]+/g;
		var m = re.exec(t);

		atH.angle = parseInt(m[0]);

		m = re.exec(t);
		atH.speed = parseInt(m[0]);
	}

	return atH.angle + "\t" + atH.speed;
}

function collectTemp() {
	var h = levels[mapLevel];
	var atH = dataset.atHeight[h];
	var t = getPickerText();
	atH.temp = NaN;
	if (t) {
		var re = /[-0-9]+/g;
		var m = re.exec(t);
		atH.temp = parseInt(m[0]);
	}
	if (h == 'surface') {
		dataset.surfaceTemp = atH.temp; 
	}
	return atH.temp;
}

function collectRH() {
	var h = levels[mapLevel];
	var atH = dataset.atHeight[h];
	var t = getPickerText();

	atH.RH = NaN;
	atH.Te = NaN;

	if (t) {
		var re = /[0-9]+/g;
		var m = re.exec(t);
		atH.RH = parseInt(m[0]);

		if (atH.pressure > 0) {
			var Tc = atH.temp;
			var RH = atH.RH;
			var Mb = atH.pressure;
			var Te = (273.15 + Tc) * Math.pow((1000 / Mb), 0.286) +
				(3 * (RH * (3.884266 * Math.pow(10, ((7.5 * Tc) / (237.7 + Tc)))) / 100));
			atH.Te = Math.round(Te, 0);
		}
	}
	return atH.RH + "\t" + atH.Te;
}

function collectPressure() {
	var h = levels[mapLevel];
	var t = getPickerText();

	dataset.surfacePressure = NaN;

	if (t) {
		var re = /[0-9]+/g;
		var m = re.exec(t);
		dataset.surfacePressure = parseInt(m[0]);
	}
	return dataset.surfacePressure;
}

//reference: https://www.mide.com/pages/air-pressure-at-altitude-calculator
function pessureTempToAltitude(sp, st, altm) {
	var M = 0.0289644;
	var g = 9.80665;
	var R = 8.31432;	
	
	 var b = sp;
	 var k = st + 273.15;
	 var j = altm;  
    if (j < 11000) {
        var e = -0.0065;
        var i = 0;
        return b * Math.pow(k / (k + (e * (j - i))), (g * M) / (R * e))
    } else {
        if (j <= 20000) {
            var e = -0.0065;
            var i = 0;
            var f = 11000;
            var a = b * Math.pow(k / (k + (e * (f - i))), (g * M) / (R * e));
            var c = k + (11000 * (-0.0065));
            var d = 0;
            return a * Math.exp(((-g) * M * (j - f)) / (R * c))
        }
    }
    return NaN
}

function collectCloudTop() {
	var t = getPickerText();

	dataset.cTopm = NaN;

	if (t) {
		var re = /[0-9]+/g;
		var m = re.exec(t);
		dataset.cTopm = parseInt(m[0]);
	}
	dataset.cTophPa = pessureTempToAltitude(dataset.surfacePressure, dataset.surfaceTemp, dataset.cTopm);
	return dataset.cTopm + " m (" + dataset.cTophPa + " hPa)" ;
}

function collectCloudBase() {
	var t = getPickerText();

	dataset.cBase = NaN;

	if (t) {
		var re = /[0-9]+/g;
		var m = re.exec(t);
		dataset.cBase = parseInt(m[0]);
	}
	return dataset.cBase + " m";
}

function processPickerChanged() {
	var currentDataString = "";
	var overlay = windyobj.store.get('overlay');
	if (mapLevel >= levels.length - cap && (overlay != 'cbase' && overlay != 'cloudtop')) {
		return;
	}

	var h = levels[mapLevel];

	switch (overlay) {
		case 'pressure':
			currentDataString = collectPressure();
			preambleString = preambleString + '\n"surface pressure"\t' + currentDataString;
			dataRowString = dataRowString + "\nheight\tpress\tangle\tspeed\ttemp\tRH\tthetaE";
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			windyobj.store.set('overlay', 'wind');
			return;
		case 'wind':
			dataset.atHeight[h] = {};
			if (h == 'surface') {
				dataset.atHeight[h].pressure = dataset.surfacePressure;
			} else {
				dataset.atHeight[h].pressure = levelToPressureMap[h];
			}
			currentDataString = collectWind();
			dataRowString = dataRowString + "\n" + h + "\t" + dataset.atHeight[h].pressure + "\t" + currentDataString;
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			windyobj.store.set('overlay', 'temp');
			return;
		case 'temp':
			currentDataString = collectTemp();
			dataRowString = dataRowString + "\t" + currentDataString;
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			windyobj.store.set('overlay', 'rh');
			return;
		case 'rh':
			currentDataString = collectRH();
			dataRowString = dataRowString + "\t" + currentDataString;
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			break;
		case 'cbase':
			currentDataString = collectCloudBase();
			preambleString = preambleString + '\n"cloud base"\t' + currentDataString;
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			failsafeChangeOverlay('cloudtop');
			return;
		case 'cloudtop':
			currentDataString = collectCloudTop();
			statusString = "Plotting data. Please wait.\n";
			preambleString = preambleString + '\n"cloud top"\t' + currentDataString;
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			unregisterPickerMutationObserver();

			windyobj.store.set('product', dataset.product);
			windyobj.store.set('level', levels[0]);
			windyobj.store.set('overlay', 'wind');
			draw_graph();
			statusString = "All done!\n";
			TeGramDataTextArea.innerText = statusString + preambleString + dataRowString;
			body_node.style.pointerEvents = 'auto';
			body_node.style.cursor = 'auto';
			return;
	}


	mapLevel++;
	if (mapLevel < levels.length - cap) {
		/*new altitude reached. Change the overlay first, 
		  and then change the level (altitude)
		  */
		unregisterPickerMutationObserver();
		windyobj.store.set('overlay', 'wind');
		setTimeout(function() {
			registerPickerMutationObserver();
			windyobj.store.set('level', levels[mapLevel]);
		}, 100);
	} else {
		failsafeChangeOverlay('cbase');
	}
}

function failsafeChangeOverlay(overlay){
	unregisterPickerMutationObserver();
	windyobj.broadcast.once('redrawFinished', params => {
		setTimeout(function(){
			processPickerChanged();
		}, 100);
	});
	windyobj.store.set('overlay', overlay);
}

function unregisterPickerMutationObserver() {
	if (pickerObserver) {
		pickerObserver.disconnect();
		pickerObserver = null;
	}
}

function registerPickerMutationObserver() {

	var config = {
		attributes: false,
		childList: true,
		subtree: true
	};
	// Callback function to execute when mutations are observed
	var callback = function(mutationsList) {
		var nodes_added = false;
		for (var mutation of mutationsList) {
			if (mutation.type == 'childList') {
				//console.log("mutation list length: " + mutation.addedNodes.length);
				if (mutation.addedNodes.length) {
					nodes_added = true;
				}
			}
		}
		if (nodes_added === true) {
			processPickerChanged();
		}
	};
	// Create an observer instance linked to the callback function
	pickerObserver = new MutationObserver(callback);
	// Start observing the target node for configured mutations
	pickerObserver.observe(pickerContent, config);
}

function draw_graph() {

	var speed = [],
		angle = [],
		height = [],
		pressure = [];
	
	var fastestWind = 0;
	var slowestWind = 200;
	Te = [];

	for (i in dataset.atHeight) {
		height.push(i);
		if (dataset.atHeight[i].speed > fastestWind ) {
			fastestWind = dataset.atHeight[i].speed;
		}
		
		if (dataset.atHeight[i].speed < slowestWind ) {
			slowestWind = dataset.atHeight[i].speed;
		}
				
		speed.push(dataset.atHeight[i].speed);
		angle.push(dataset.atHeight[i].angle);
		if (isNaN(dataset.atHeight[i].Te) ||
			isNaN(dataset.atHeight[i].pressure)) {
			continue;
		}
		Te.push(dataset.atHeight[i].Te);
		pressure.push(dataset.atHeight[i].pressure);
	}

	var trace1 = {
		type: "scatterpolar",
		mode: "lines+markers",
		r: speed,
		theta: angle,
		text: height,
		hoverinfo: "text+r+theta",
		//color: color,
		line: {
			color: "#ff66ab",
			shape: "spline",
			simplify: true
		},
		marker: {
			color: "#8090c7",
			size: 8
		},
		subplot: 'hodo'
	};

	var trace2 = {
		type: "scatter",
		mode: "lines+markers",
		x: Te,
		y: pressure,
		text: Te,
		hoverinfo: "text+x+y",
		line: {
			color: "#ff66ab",
			shape: "spline",
			simplify: false
		},
		marker: {
			color: "#8090c7",
			size: 8
		}
	};
	
	var ct = "Cloud tops ~" + dataset.cTopm + " m";
	var trace3 = {
		type: "scatter",
		mode: "lines+text",
		x: [Math.min(...Te), Math.max(...Te)],
		y: [dataset.cTophPa, dataset.cTophPa],
		text: [ct, " "],
		textposition: "top-right",
		hoverinfo: "text+x+y",
		line: {
			color: "#0000cc",
			shape: "spline",
			simplify: false
		},
		marker: {
			color: "#8090c7",
			size: 8
		}
	};
	
	var date = new Date(dataset.timeStamp);

	var layout1 = {
		autosize: true,
		showlegend: false,
		title: "Hodograph", // <br>" + curr_location + "<br> " + dataset.product + " " + date.toLocaleString(),
		polar: {
			radialaxis: {
				range: [0, fastestWind],
				tickfont: {
					//  size: 10
				}
			},
			angularaxis: {
				tickfont: {
					//size: 10
				},
				rotation: -90,
				direction: "clockwise"
			}
		},
		margin: {
			l: 60,
			r: 80,
			t: 50,
			b: 30
		},
	};
	
	
	var layout2 = {
		autosize: true,
		showlegend: false,
		title: curr_location + "<br> " + dataset.product + " " + date.toLocaleString(),
		yaxis: {
			range: [pressure[0]+100, 10],
			autorange: false,
			title: "pressure (hPa)"
		},
		xaxis: {
			title: "Equivalent Potential Temperature (K)",
		    scaleanchor: "y",
			scaleratio: 20
		},
		margin: {
			l: 60,
			r: 80,
			t: 50,
			b: 30
		},
	};
	
	config = {
	   displayModeBar: false,
		staticChart: false
	};	
	
	Plotly.react('hodoGraphDiv', [trace1], layout1, config);
	Plotly.react('TeGramGraphDiv', [trace2, trace3], layout2, config);
	TeGramGraphTabButton.click();
}

/* http://www.jacklmoore.com/notes/rounding-in-javascript/ */
function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function setLocus(ll) {
	console.log("setting location");
	dataset.timeStamp = windyobj.store.get('timestamp');
	ll.lat = round(ll.lat, 4);
	ll.lon = round(ll.lon, 4);
	dataset.ll = ll;
	TeGramLatLonInput.value = ll.lat + "," + ll.lon;
	curr_location = ll.lat + "," + ll.lon;
	console.log("location: " + curr_location);
}

function registerTeGramGraphTabMutationObserver() {
	var config = {
		attributes: true,
		//attributeFilter: ['style'],
		childList: false,
		subtree: false
	};
	// Callback function to execute when mutations are observed
	var callback = function(mutationsList) {
		var redraw = false;
		for (var mutation of mutationsList) {
			if (mutation.target.style.display != 'none') {
				redraw = true;
				break;
			}
		}
		if (redraw === true) {
			redrawPlots();
		}
	};
	// Create an observer instance linked to the callback function
	graphTabObserver = new MutationObserver(callback);
	// Start observing the target node for configured mutations
	graphTabObserver.observe(TeGramGraphTab, config);
}

function redrawPlots() {
	if (TeGramGraphDiv.children &&
		TeGramGraphDiv.children.length > 0) {
		Plotly.Plots.resize(TeGramGraphDiv);
		//Plotly.relayout(TeGramGraphDiv, {});
	}
	
	if (hodoGraphDiv.children &&
		hodoGraphDiv.children.length > 0) {
		Plotly.Plots.resize(hodoGraphDiv);
		//Plotly.relayout(hodoGraphDiv, {});
	}
}


function TeGramShowOutput() {
	TeGramOuterDiv.style.width = "100%";
	TeGramOuterDiv.style.height = "100%";
	TeGramOuterDiv.style.bottom = 0;
	TeGramOuterDiv.style.padding = "0";
	TeGramOutputDiv.style.display = "flex";
	TeGramSpacerDiv.style.display = "block";
}

function TeGramHideOutput() {
	TeGramOuterDiv.style.width = "auto";
	TeGramOuterDiv.style.height = "auto";
	TeGramOuterDiv.style.bottom = "30%";
	TeGramOuterDiv.style.padding = "0.3em";
	TeGramOutputDiv.style.display = "none";
	TeGramSpacerDiv.style.display = "none";
}


function TeGramOpenTab(e, tab) {
    // Declare all variables
    var i, tabcontent, tablinks;

	 //overkill for just two tabs
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tab).style.display = "block";
    e.currentTarget.className += " active";
}

TeGramGraphTabButton.onclick = function(e){
	TeGramOpenTab(e, "TeGramGraphTab");
};

TeGramTextTabButton.onclick = function(e){
	TeGramOpenTab(e, "TeGramTextTab");
};

TeGramHideButton.onclick = function(e) {
	TeGramHideButton.style.display = "none";
	TeGramShowButton.style.display = "inline";
	TeGramHideOutput();
};

TeGramShowButton.onclick = function(e) {
	TeGramShowButton.style.display = "none";
	TeGramHideButton.style.display = "inline";
	TeGramShowOutput();
};

TeGramPlotButton.onclick = function(e) {
	body_node.style.pointerEvents = 'none';
	body_node.style.cursor = 'auto';

	TeGramShowButton.click();
	TeGramTextTabButton.click();

	Plotly.purge(TeGramGraphDiv);

	var l = TeGramLatLonInput.value.split(',');
	l[0] = parseFloat(l[0]);
	l[1] = parseFloat(l[1]);


	statusString = "Getting data. Please wait.\n";
	TeGramDataTextArea.innerText = statusString;

	resetDataset();
	dataset.product = windyobj.store.get('product');
	setLocus({
		lat: l[0],
		lon: l[1]
	});
	
	setCookie('latLon', l[0] + ',' + l[1]);
	setCookie('product', dataset.product);

	var date = new Date(dataset.timeStamp);

	location_desc = '' + curr_location + " " + windyobj.store.get('product') + " " + date.toLocaleString()
		//+ " fetched " + doverfl.toLocaleString() 
		+ '';
	dataRowString = "";
	preambleString = location_desc;
	mapLevel = 0;
	unregisterPickerMutationObserver();
	windyobj.broadcast.fire('rqstClose', 'picker');
	windyobj.map.setView([l[0], l[1]]);
	windyobj.store.set('overlay', 'pressure');
	windyobj.broadcast.fire('rqstOpen', 'picker', {
		lat: l[0],
		lon: l[1],
		height: 5
	});
	setTimeout(function() {
		pickerContent = document.querySelector('.picker-content');
		levels = windyobj.store.get('availLevels');
		registerPickerMutationObserver();
		processPickerChanged();
	}, 2000);
};

/* 
https://www.w3schools.com/js/js_cookies.asp 
*/
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/*
function checkCookie() {
    var user = getCookie("username");
    if (user != "") {
        alert("Welcome again " + user);
    } else {
        user = prompt("Please enter your name:", "");
        if (user != "" && user != null) {
            setCookie("username", user, 365);
        }
    }
}*/

function run(){		
	var ll = getCookie('latLon');
	var product = getCookie('product');
	
	resetDataset();

	if (ll){
		ll = ll.split(",");
		dataset.ll.lat = parseFloat(ll[0]);
		dataset.ll.lon = parseFloat(ll[1]);
	}
	
	if (product){
		dataset.product = product;
	}

	TeGramLatLonInput.value = dataset.ll.lat + "," + dataset.ll.lon;
	windyobj.map.setView([dataset.ll.lat, dataset.ll.lon]);
	
	windyobj.store.set('product', dataset.product);
	windyobj.store.set('overlay', 'pressure');
	windyobj.store.set('numDirection', true);
	windyobj.store.set('hourFormat', '24h');
	windyobj.store.set('latlon', true);
	windyobj.store.set('particlesAnim', "off");
	windyobj.overlays.wind.setMetric('kt');
	windyobj.overlays.cloudtop.setMetric('m');
	windyobj.overlays.cbase.setMetric('m');
	windyobj.overlays.temp.setMetric('°C');	
	
	window.onresize = redrawPlots;
	registerTeGramGraphTabMutationObserver();
	
	windyobj.picker.on('pickerOpened', ll => {
		setLocus(ll);
	});
	
	windyobj.picker.on('pickerMoved', (ll, result) => {
		setLocus(ll);
	});
	
	windyobj.broadcast.fire('rqstOpen', 'picker', latLon);
}



const options = {
	key: '3qfSZokjcK2ljSdBUw4ov99kSe4w4LDo',
	lat: 11.28,
	lon: 76.95,
	zoom: 8,
}

windyobj = {}

windyInit(options, windyAPI => {
	windyobj = windyAPI;
	
	// Wait since wather is rendered
	windyobj.broadcast.once('redrawFinished', () => {
		run();
	});
})