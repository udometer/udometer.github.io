var wind_level = 0;
var levels = [];
var height_speed_angle = "";
var curr_location = "";
var location_desc = "";
var latLon = {
	lat: 13.04,
	lon: 80.17
};
var speed = [];
var angle = [];
var height = [];
//var color = [];
var cap = 0;
var observer = null;
var product = "gfs";
var body_node = document.querySelector("body");
var hodoWindTextArea = document.getElementById('hodoWindTextArea');
var hodoOuterDiv = document.getElementById('hodoOuterDiv');
var hodoOutputDiv = document.getElementById('hodoOutputDiv');
var hodoHideButton = document.getElementById('hodoHideButton');
var hodoPlotButton = document.getElementById('hodoPlotButton');
var hodoLatLonInput = document.getElementById('hodoLatLonInput');
var hodoGraphDiv = document.getElementById("hodoGraphDiv");

/*levels = ["surface", "100m", 
"975h",
"950h", 
"925h", "900h", "850h","800h", "700h", "600h",
"500h", "400h", "300h", "250h", "200h", "150h"]; //windyobj.store.get('availLevels');
*/

function collect_wind() {
	if (wind_level >= levels.length) {
		return;
	}
	height_speed_angle = height_speed_angle + levels[wind_level];
	var e = picker_content.querySelector('big');
	if (e) {
		var re = /[0-9]+/g;
		var m = re.exec(e.textContent);
		height_speed_angle = height_speed_angle + "\t" + m[0];
		angle.push(parseInt(m[0]));
		m = re.exec(e.textContent);
		height_speed_angle = height_speed_angle + "\t" + m[0];
		speed.push(parseInt(m[0]));
		height.push(levels[wind_level]);
		//color.push("#" + (5 + 5 * (wind_level+1)) + "0000");
	}
	height_speed_angle = height_speed_angle + "\n";
	hodoWindTextArea.innerText = height_speed_angle;
}

function level_up() {
	if (wind_level >= levels.length - cap) {
		return;
	}
	collect_wind();
	wind_level++;
	if (wind_level < levels.length - cap) {
		windyobj.store.set('level', levels[wind_level]);
	} else {
		observer.disconnect();
		windyobj.store.set('level', levels[0]);
		draw_graph();
		body_node.style.pointerEvents = 'auto';
		body_node.style.cursor = 'auto';
	}
}

function register_mutation_observer() {
	var targetNode = picker_content;
	// Options for the observer (which mutations to observe)
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
			level_up();
		}
	};
	// Create an observer instance linked to the callback function
	observer = new MutationObserver(callback);
	// Start observing the target node for configured mutations
	observer.observe(targetNode, config);
}

function draw_graph() {
	var data = [{
		type: "scatterpolar",
		mode: "lines+markers",
		r: speed,
		theta: angle,
		text: height,
		hoverinfo: "all",
		//color: color,
		line: {
			color: "#ff66ab",
			shape: "spline",
			simplify: true
		},
		marker: {
			color: "#8090c7",
			size: 8
		}
	}];
	var layout = {
		autosize: true,
		showlegend: false,
		title: location_desc,
		margin: {
			l: 20,
			r: 20,
			t: 50,
			b: 20
		},
		polar: {
			domain: {
				x: [0, 1],
				y: [0, 1]
			},
			radialaxis: {
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
		}
	};
	Plotly.react('hodoGraphDiv', data, layout);
	//Plotly.newPlot('hodoGraphDiv', data, layout);
}

/* http://www.jacklmoore.com/notes/rounding-in-javascript/ */
function round(value, decimals) {
	return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function set_locus(ll) {
	console.log("setting location");
	timeStamp = windyobj.store.get('timestamp');
	ll.lat = round(ll.lat, 4);
	ll.lon = round(ll.lon, 4);
	latLon = ll;
	document.getElementById('hodoLatLonInput').value = ll.lat + "," + ll.lon;
	curr_location = ll.lat + "," + ll.lon;
	console.log("location: " + curr_location);
}



/* 
https://www.w3schools.com/js/js_cookies.asp 
*/
function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	var expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
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


function initFromCookies() {
	var ll = getCookie('latLon');
	var p = getCookie('product');

	if (ll) {
		ll = ll.split(",");
		latLon.lat = parseFloat(ll[0]);
		latLon.lon = parseFloat(ll[1]);
	}
	if (p) {
		product = p;
	}
}


function hodoShowOutput() {
	hodoOuterDiv.style.width = "100%";
	hodoOuterDiv.style.height = "100%";
	hodoOuterDiv.style.top = 0;
	hodoOutputDiv.style.display = "flex";
}

function hodoHideOutput() {
	hodoOuterDiv.style.width = "auto";
	hodoOuterDiv.style.height = "auto";
	hodoOuterDiv.style.top = "50%";
	hodoOutputDiv.style.display = "none";
}

hodoHideButton.onclick = function(e) {
	hodoHideOutput();
};

hodoPlotButton.onclick = function(e) {
	body_node.style.pointerEvents = 'none';
	body_node.style.cursor = 'auto';

	hodoShowOutput();

	Plotly.purge(hodoGraphDiv);

	var l = hodoLatLonInput.value.split(',');
	l[0] = parseFloat(l[0]);
	l[1] = parseFloat(l[1]);

	hodoWindTextArea.innerText = "Getting data. Please wait...";

	speed = [];
	angle = [];
	height = [];
	color = [];

	set_locus({
		lat: l[0],
		lon: l[1]
	});

	product = windyobj.store.get('product');
	setCookie('latLon', l[0] + ',' + l[1]);
	setCookie('product', product);

	wind_level = 0;

	var date = new Date(timeStamp);

	location_desc = '"Hodograph\n' + curr_location + " " + product + " for " + date.toLocaleString()
		//+ " fetched " + d.toLocaleString() 
		+ '"';
	height_speed_angle = location_desc + "\nheight\tangle\tspeed\n";
	wind_level = 0;
	if (observer) {
		observer.disconnect();
	}
	windyobj.broadcast.fire('rqstClose', 'picker');
	windyobj.map.setView([l[0], l[1]]);
	windyobj.broadcast.fire('rqstOpen', 'picker', {
		lat: l[0],
		lon: l[1],
		height: 5
	});
	setTimeout(function() {
		picker_content = document.querySelector('.picker-content');
		levels = windyobj.store.get('availLevels');
		register_mutation_observer();
		level_up();
	}, 2000);
};

function do_hodo() {
	initFromCookies();
	
	document.getElementById('hodoLatLonInput').value = latLon.lat + "," + latLon.lon;
	windyobj.store.set('overlay', 'wind');
	windyobj.store.set('numDirection', true);
	windyobj.store.set('hourFormat', '24h');
	windyobj.store.set('latlon', true);
	windyobj.store.set('particlesAnim', "off");
	windyobj.store.set('product', product);
	windyobj.overlays.wind.setMetric('kt');
	windyobj.map.setView([latLon.lat, latLon.lon]); // 7);
	
	window.onresize = function() {
		if (hodoGraphDiv.children &&
			hodoGraphDiv.children.length > 0) {
			Plotly.Plots.resize(hodoGraphDiv);
		}
	};
		
	windyobj.picker.on('pickerOpened', ll => {
		set_locus(ll);
	});
	
	windyobj.picker.on('pickerMoved', (ll, result) => {
		set_locus(ll);
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
		do_hodo();
	});
})