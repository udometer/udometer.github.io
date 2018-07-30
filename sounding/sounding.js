/*SkewT stuff borrowed from: */
/**
 * SkewT v1.1.0
 * 2016 David Félix - dfelix@live.com.pt
 */
/* Dependency:
 * d3.v4.min.js from https://d3js.org/
 * 
 */
var resizeSkewT = null;
var SkewT = function(div) {
	var wrapper = d3.select(div);
	var width = parseInt(wrapper.style('width'), 10);
	var height = width; //tofix
	var margin = {
		top: 30,
		right: 40,
		bottom: 20,
		left: 35
	}; //container margins
	
	//properties used in calculations
	var deg2rad = (Math.PI / 180);
	var tan = Math.tan(55 * deg2rad); /*isotherms are titled at 55 degrees*/
	var basep = 1050; /*hPa*/
	var topp = 100; /*hPa*/
	var plines = [1000, 850, 700, 500, 300, 200, 100]; /*hPa*/
	var pticks = [950, 900, 800, 750, 650, 600, 550, 450, 400, 350, 250, 150]; /*hPa*/
	var barbsize = 25;

	// functions for Scales and axes. Note the inverted domain for the y-scale: bigger is up!
	//var r = d3.scaleLinear().range([0, 300]).domain([0, 150]);
	//var y2 = d3.scaleLinear();
	var bisectTemp = d3.bisector(function(d) {
		return d.press;
	}).left; // bisector function for tooltips
	var w, h, x, y, xAxis, yAxis, yAxis2;
	var data = [];
	//aux
	var unit = "kt"; // or kmh
	//containers
	var svg = wrapper.append("svg").attr("id", "svg"); //main svg
	var container = svg.append("g").attr("id", "container"); //container 
	var soundingbg = container.append("g").attr("id", "soundingbg").attr("class", "soundingbg"); //background
	var soundinggroup = container.append("g").attr("class", "sounding"); // put sounding lines in this group
	var barbgroup = container.append("g").attr("class", "windbarb"); // put barbs in this group	
	//local functions	
	function setVariables() {
		width = parseInt(wrapper.style('width'), 10) - 10; // tofix: using -10 to prevent x overflow
		height = parseInt(wrapper.style('height'), 10) - 10;
		if (width < height){
			height = width;
		}
		else {
			width = height;
		}
		w = width - margin.left - margin.right;
		h = width - margin.top - margin.bottom;
		x = d3.scaleLinear().range([0, w]).domain([-45, 50]);
		y = d3.scaleLog().range([0, h]).domain([topp, basep]);
		xAxis = d3.axisBottom(x).tickSize(0, 0).ticks(10); //.orient("bottom");
		yAxis = d3.axisLeft(y).tickSize(0, 0).tickValues(plines).tickFormat(d3.format(".0d")); //.orient("left");
		yAxis2 = d3.axisLeft(y).tickSize(5, 0).tickValues(pticks); //.orient("right");
	}

	function convert(msvalue, unit) {
		switch (unit) {
			case "kt":
				return msvalue * 1.943844492;
				break;
			case "kmh":
				return msvalue * 3.6;
				break;
			default:
				return msvalue;
		}
	}
	//assigns d3 events
	d3.select(window).on('resize', resize);

	function resize() {
		soundingbg.selectAll("*").remove();
		setVariables();
		svg.attr("width", w + margin.right + margin.left).attr("height", h + margin.top + margin.bottom);
		container.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		drawBackground();
		makeBarbTemplates();
		plot(data);
	}
	resizeSkewT = resize;
	
	var drawBackground = function() {
		// Add clipping path
		soundingbg.append("clipPath").attr("id", "clipper").append("rect")
			.attr("x", 0).attr("y", 0).attr("width", w).attr("height", h);
		// Skewed temperature lines
		soundingbg.selectAll("templine").data(d3.range(-100, 45, 10)).enter().append("line").attr("x1", function(d) {
			return x(d) - 0.5 + (y(basep) - y(100)) / tan;
		}).attr("x2", function(d) {
			return x(d) - 0.5;
		}).attr("y1", 0).attr("y2", h).attr("class", function(d) {
			if (d == 0) {
				return "tempzero";
			} else {
				return "gridline"
			}
		}).attr("clip-path", "url(#clipper)");
		//.attr("transform", "translate(0," + h + ") skewX(-30)");
		// Logarithmic pressure lines
		soundingbg.selectAll("pressureline").data(plines).enter().append("line").attr("x1", 0).attr("x2", w).attr("y1", function(d) {
			return y(d);
		}).attr("y2", function(d) {
			return y(d);
		}).attr("class", "gridline");
		// create array to plot dry adiabats
		var pp = d3.range(topp, basep + 1, 10);
		var dryad = d3.range(-30, 240, 20);
		var all = [];
		for (var i = 0; i < dryad.length; i++) {
			var z = [];
			for (var j = 0; j < pp.length; j++) {
				z.push(dryad[i]);
			}
			all.push(z);
		}
		var dryline = d3.line().curve(d3.curveLinear).x(function(d, i) {
			return x((273.15 + d) / Math.pow((1000 / pp[i]), 0.286) - 273.15) + (y(basep) - y(pp[i])) / tan;
		}).y(function(d, i) {
			return y(pp[i])
		});
		// Draw dry adiabats
		soundingbg.selectAll("dryadiabatline").data(all).enter().append("path").attr("class", "gridline").attr("clip-path", "url(#clipper)").attr("d", dryline);
		// Line along right edge of plot
		soundingbg.append("line").attr("x1", w - 0.5).attr("x2", w - 0.5).attr("y1", 0).attr("y2", h).attr("class", "gridline");
		// Add axes
		soundingbg.append("g").attr("class", "x axis").attr("transform", "translate(0," + (h - 0.5) + ")").call(xAxis);
		soundingbg.append("g").attr("class", "y axis").attr("transform", "translate(-0.5,0)").call(yAxis);
		soundingbg.append("g").attr("class", "y axis ticks").attr("transform", "translate(-0.5,0)").call(yAxis2);
		soundingbg.append("g").append("text").attr('id', 'skewtTitle').text("Skew-T Log-P")
			.attr("x", w/2).attr("y", -5);
	}
	var makeBarbTemplates = function() {
		var speeds = d3.range(5, 105, 5);
		var barbdef = container.append('defs')
		speeds.forEach(function(d) {
			var thisbarb = barbdef.append('g').attr('id', 'barb' + d);
			var flags = Math.floor(d / 50);
			var pennants = Math.floor((d - flags * 50) / 10);
			var halfpennants = Math.floor((d - flags * 50 - pennants * 10) / 5);
			var px = barbsize;
			// Draw wind barb stems
			thisbarb.append("line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", barbsize);
			// Draw wind barb flags and pennants for each stem
			for (var i = 0; i < flags; i++) {
				thisbarb.append("polyline").attr("points", "0," + px + " -10," + (px) + " 0," + (px - 4)).attr("class", "flag");
				px -= 7;
			}
			// Draw pennants on each barb
			for (i = 0; i < pennants; i++) {
				thisbarb.append("line").attr("x1", 0).attr("x2", -10).attr("y1", px).attr("y2", px + 4)
				px -= 3;
			}
			// Draw half-pennants on each barb
			for (i = 0; i < halfpennants; i++) {
				thisbarb.append("line").attr("x1", 0).attr("x2", -5).attr("y1", px).attr("y2", px + 2)
				px -= 3;
			}
		});
	}
	var drawToolTips = function(soundinglines) {
		var lines = soundinglines.reverse();
		// Draw tooltips
		var tmpcfocus = soundinggroup.append("g").attr("class", "focus tmpc").style("display", "none");
		tmpcfocus.append("circle").attr("r", 4);
		tmpcfocus.append("text").attr("x", 9).attr("dy", ".35em");
		var dwpcfocus = soundinggroup.append("g").attr("class", "focus dwpc").style("display", "none");
		dwpcfocus.append("circle").attr("r", 4);
		dwpcfocus.append("text").attr("x", -9).attr("text-anchor", "end").attr("dy", ".35em");
		var hghtfocus = soundinggroup.append("g").attr("class", "focus").style("display", "none");
		hghtfocus.append("text").attr("x", 0).attr("text-anchor", "start").attr("dy", ".35em");
		var wspdfocus = soundinggroup.append("g").attr("class", "focus windspeed").style("display", "none");
		wspdfocus.append("text").attr("x", 50).attr("text-anchor", "end").attr("dy", ".35em");
		container.append("rect").attr("class", "overlay").attr("width", w).attr("height", h).on("mouseover", function() {
			tmpcfocus.style("display", null);
			dwpcfocus.style("display", null);
			hghtfocus.style("display", null);
			wspdfocus.style("display", null);
		}).on("mouseout", function() {
			tmpcfocus.style("display", "none");
			dwpcfocus.style("display", "none");
			hghtfocus.style("display", "none");
			wspdfocus.style("display", "none");
		}).on("mousemove", function() {
			var y0 = y.invert(d3.mouse(this)[1]); // get y value of mouse pointer in pressure space
			var i = bisectTemp(lines, y0, 1, lines.length - 1);
			var d0 = lines[i - 1];
			var d1 = lines[i];
			var d = y0 - d0.press > d1.press - y0 ? d1 : d0;
			tmpcfocus.attr("transform", "translate(" + (x(d.temp) + (y(basep) - y(d.press)) / tan) + "," + y(d.press) + ")");
			dwpcfocus.attr("transform", "translate(" + (x(d.dwpt) + (y(basep) - y(d.press)) / tan) + "," + y(d.press) + ")");
			hghtfocus.attr("transform", "translate(0," + y(d.press) + ")");
			tmpcfocus.select("text").text(Math.round(d.temp) + "°C");
			dwpcfocus.select("text").text(Math.round(d.dwpt) + "°C");
			hghtfocus.select("text").text("-- " + Math.round(d.hght) + " m"); //hgt or hghtagl ???
			wspdfocus.attr("transform", "translate(" + (w - 65) + "," + y(d.press) + ")");
			wspdfocus.select("text").text(Math.round(convert(d.wspd, unit) * 10) / 10 + " " + unit);
		});
	}
	var plot = function(s) {
		data = s;
		soundinggroup.selectAll("path").remove(); //clear previous paths from skew
		barbgroup.selectAll("use").remove(); //clear previous paths from barbs
		if (data.length == 0) return;
		//skew-t stuff
		var soundingline = data.filter(function(d) {
			return (d.temp > -1000 && d.dwpt > -1000);
		});
		var soundinglines = [];
		soundinglines.push(soundingline);
		var templine = d3.line().curve(d3.curveLinear).x(function(d, i) {
			return x(d.temp) + (y(basep) - y(d.press)) / tan;
		}).y(function(d, i) {
			return y(d.press);
		});
		var tempLines = soundinggroup.selectAll("templines").data(soundinglines).enter().append("path").attr("class", function(d, i) {
			return (i < 10) ? "temp skline" : "temp mean"
		}).attr("clip-path", "url(#clipper)").attr("d", templine);
		var tempdewline = d3.line().curve(d3.curveLinear).x(function(d, i) {
			return x(d.dwpt) + (y(basep) - y(d.press)) / tan;
		}).y(function(d, i) {
			return y(d.press);
		});
		var tempDewlines = soundinggroup.selectAll("tempdewlines").data(soundinglines).enter().append("path").attr("class", function(d, i) {
			return (i < 10) ? "dwpt skline" : "dwpt mean"
		}).attr("clip-path", "url(#clipper)").attr("d", tempdewline);
		//barbs stuff
		var barbs = soundingline.filter(function(d) {
			return (d.wdir >= 0 && d.wspd >= 0 && d.press >= topp);
		});
		var allbarbs = barbgroup.selectAll("barbs").data(barbs).enter().append("use").attr("xlink:href", function(d) {
				return "#barb" + Math.round(convert(d.wspd, "kt") / 5) * 5;
			}) // 0,5,10,15,... always in kt
			.attr("transform", function(d, i) {
				return "translate(" + w + "," + y(d.press) + ") rotate(" + (d.wdir + 180) + ")";
			});
		//mouse over
		drawToolTips(soundinglines[0]);
	}
	var clear = function(s) {
			soundinggroup.selectAll("path").remove(); //clear previous paths from skew
			barbgroup.selectAll("use").remove(); //clear previous paths  from barbs
			//must clear tooltips!
			container.append("rect").attr("class", "overlay").attr("width", w).attr("height", h).on("mouseover", function() {
				return false;
			}).on("mouseout", function() {
				return false;
			}).on("mousemove", function() {
				return false;
			});
		}
		//assings functions as public methods
	this.drawBackground = drawBackground;
	this.plot = plot;
	this.clear = clear;
	//init 
	setVariables();
	resize();
};
/*-----------------------------------------------*/
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
		
	   - plot wind soundinggraph
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
var plotlyTitleObserver = null;
var dataset = {};
var oldDataset = {};
var body_node = document.querySelector("body");
var soundingDataTextArea = document.getElementById('soundingDataTextArea');
var soundingOuterDiv = document.getElementById('soundingOuterDiv');
var soundingOutputDiv = document.getElementById('soundingOutputDiv');
var soundingHideButton = document.getElementById('soundingHideButton');
var soundingPlotButton = document.getElementById('soundingPlotButton');
var soundingLatLonInput = document.getElementById('soundingLatLonInput');
var soundingGraphDiv = document.getElementById("soundingGraphDiv");
var hodoGraphDiv = document.getElementById("hodoGraphDiv");
var soundingGraphTab = document.getElementById("soundingGraphTab");
var soundingGraphTabButton = document.getElementById("soundingGraphTabButton");
var soundingTextTabButton = document.getElementById("soundingTextTabButton");
var soundingSpacerDiv = document.getElementById("soundingSpacerDiv");
var soundingGraphPreamble = document.getElementById("soundingGraphPreamble");
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
			var Te = (273.15 + Tc) * Math.pow((1000 / Mb), 0.286) + (3 * (RH * (3.884266 * Math.pow(10, ((7.5 * Tc) / (237.7 + Tc)))) / 100));
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
function pessureTempToAltitudeMts(surfacePressure, surfaceTemp, pressure) {
	var M = 0.0289644;
	var g = 9.80665;
	var R = 8.31432;
	a = surfacePressure;
	k = surfaceTemp + 273.15;
	i = pressure;
	if ((a / i) < (101325 / 22632.1)) {
		var d = -0.0065;
		var e = 0;
		var j = Math.pow((i / a), (R * d) / (g * M));
		return e + ((k * ((1 / j) - 1)) / d);
	} else {
		if ((a / i) < (101325 / 5474.89)) {
			var e = 11000;
			var b = k - 71.5;
			var f = (R * b * (Math.log(i / a))) / ((-g) * M);
			var l = 101325;
			var c = 22632.1;
			var h = ((R * b * (Math.log(l / c))) / ((-g) * M)) + e;
			return h + f;
		}
	}
	return NaN;
}

function pessureTempToAltitudeHpa(sp, st, altm) {
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
	dataset.cTophPa = pessureTempToAltitudeHpa(dataset.surfacePressure, dataset.surfaceTemp, dataset.cTopm);
	return dataset.cTopm + " m (" + dataset.cTophPa + " hPa)";
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

var ECMWF_available = false;
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
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
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
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			windyobj.store.set('overlay', 'temp');
			return;
		case 'temp':
			currentDataString = collectTemp();
			dataRowString = dataRowString + "\t" + currentDataString;
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			windyobj.store.set('overlay', 'rh');
			return;
		case 'rh':
			currentDataString = collectRH();
			dataRowString = dataRowString + "\t" + currentDataString;
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			break;
		case 'cbase':
			currentDataString = collectCloudBase();
			preambleString = preambleString + '\n"cloud base"\t' + currentDataString;
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			failsafeChangeOverlay('cloudtop');
			return;
		case 'cloudtop':
			currentDataString = collectCloudTop();
			statusString = "Plotting data. Please wait.\n";
			preambleString = preambleString + '\n"cloud top"\t' + currentDataString;
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			unregisterPickerMutationObserver();
			windyobj.store.set('product', dataset.product);
			windyobj.store.set('level', levels[0]);
			windyobj.store.set('overlay', 'wind');
			setCookie('dataset', JSON.stringify(dataset));
			draw_graph(dataset);			
			statusString = "All done!\n";
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
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
		if (ECMWF_available){
			failsafeChangeOverlay('cbase');
		}
		else { /* to be deleted after ECMWF is available*/
			statusString = "Plotting data. Please wait.\n";
			/*preambleString = preambleString + '\n"cloud top"\t' + currentDataString;*/
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			unregisterPickerMutationObserver();
			windyobj.store.set('product', dataset.product);
			windyobj.store.set('level', levels[0]);
			windyobj.store.set('overlay', 'wind');
			setCookie('dataset', JSON.stringify(dataset));
			draw_graph(dataset);			
			statusString = "All done!\n";
			soundingDataTextArea.innerText = statusString + preambleString + dataRowString;
			body_node.style.pointerEvents = 'auto';
			body_node.style.cursor = 'auto';
		}
	}
}

function failsafeChangeOverlay(overlay) {
	unregisterPickerMutationObserver();
	windyobj.broadcast.once('redrawFinished', params => {
		setTimeout(function() {
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

function RH_temp_to_DP(Tc, RH) {
	var X = 1 - (0.01 * RH);
	var K = Tc - (14.55 + 0.114 * Tc) * X - Math.pow(((2.5 + 0.007 * Tc) * X), 3) - (15.9 + 0.117 * Tc) * Math.pow(X, 14);
	dewpoint = K;
	return dewpoint;
}

function isUnknown(x){
	return ((isNaN(x)) || (x == null));
}

function draw_graph(ds) {
	soundingGraphTabButton.click();
	
	var speed = [],
		angle = [],
		height = [],
		pressure = [],
		Te = [];

	var fastestWind = 0;
	var slowestWind = 200;
	var soundingData = [];
	for (i in ds.atHeight) {
		var d = ds.atHeight[i];
		height.push(i);
		if (d.speed > fastestWind) {
			fastestWind = d.speed;
		}
		if (d.speed < slowestWind) {
			slowestWind = d.speed;
		}
		speed.push(d.speed);
		angle.push(d.angle);
		if (isUnknown(d.Te) || isUnknown(d.pressure)) {
			continue;
		}
		Te.push(d.Te);
		pressure.push(d.pressure);
		soundingData.push({
			"press": d.pressure, // pressure in whole millibars
			"hght": pessureTempToAltitudeMts(ds.surfacePressure * 100, ds.surfaceTemp, d.pressure * 100),
			/*this is inaccurate*/ // height in meters (m)
			"temp": d.temp, // temperature in degrees Celsius
			"dwpt": RH_temp_to_DP(d.temp, d.RH), // dew point temperature in degree Celsius
			"wdir": d.angle, // wind direction in degrees
			"wspd": d.speed * 0.514444444, // wind speed in meters per second (m/s)
		});
	}


	var date = new Date(ds.timeStamp);	
	
	soundingGraphPreamble.innerHTML = curr_location + "<br> " 
				+ dataset.product + " " + date.toLocaleString();	
	
	var sounding = new SkewT('#soundingGraphDiv');
	sounding.plot(soundingData);
	
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
			size: 4
		},
		subplot: 'hodo'
	};
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
			size: 4
		}
	};
	
	var ct = "Cloud tops ~" + ds.cTopm + " m";
	var trace3 = {
		type: "scatter",
		mode: "lines+text",
		x: [Math.min(...Te), Math.max(...Te)],
		y: [ds.cTophPa, ds.cTophPa],
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
			size: 4
		}
	};
	 
	var layout2 = {
		autosize: true,
		showlegend: false,
		title: "theta-E plot",
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
	
	var config = {
		displayModeBar: false,
		staticChart: false
	};

	Plotly.react('hodoGraphDiv', [trace1], layout1, config).then(registerPlotlyTitleMutationObserver);
	Plotly.react('TeGramGraphDiv', [trace2, trace3], layout2, config).then(registerPlotlyTitleMutationObserver);
	
}
/* http://www.jacklmoore.com/notes/rounding-in-javascript/ */
function round(value, decimals) {
	return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function setLocus(ll) {
	console.log("setting location");
	dataset.timeStamp = windyobj.store.get('timestamp');
	ll.lat = round(ll.lat, 4);
	ll.lon = round(ll.lon, 4);
	dataset.ll = ll;
	soundingLatLonInput.value = ll.lat + "," + ll.lon;
	curr_location = ll.lat + "," + ll.lon;
	console.log("location: " + curr_location);
}

function registersoundingGraphTabMutationObserver() {
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
	graphTabObserver.observe(soundingGraphTab, config);
}

function redrawPlots() {
	if (soundingGraphDiv.children && 
		soundingGraphDiv.children.length > 0) {
		resizeSkewT();
	}
	if (hodoGraphDiv.children && 
		hodoGraphDiv.children.length > 0) {
		Plotly.Plots.resize(hodoGraphDiv).then(fix_plotly_title_size);
	}
		
	if (TeGramGraphDiv.children &&
		TeGramGraphDiv.children.length > 0) {
		Plotly.Plots.resize(TeGramGraphDiv).then(fix_plotly_title_size);
	}
}

function soundingShowOutput() {
	soundingOuterDiv.style.width = "100%";
	soundingOuterDiv.style.height = "100%";
	soundingOuterDiv.style.bottom = 0;
	soundingOuterDiv.style.padding = "0";
	soundingOutputDiv.style.display = "flex";
	soundingSpacerDiv.style.display = "block";
}

function soundingHideOutput() {
	soundingOuterDiv.style.width = "auto";
	soundingOuterDiv.style.height = "auto";
	soundingOuterDiv.style.bottom = "30%";
	soundingOuterDiv.style.padding = "0.3em";
	soundingOutputDiv.style.display = "none";
	soundingSpacerDiv.style.display = "none";
}

function soundingOpenTab(e, tab) {
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
soundingGraphTabButton.onclick = function(e) {
	soundingOpenTab(e, "soundingGraphTab");
};
soundingTextTabButton.onclick = function(e) {
	soundingOpenTab(e, "soundingTextTab");
};
soundingHideButton.onclick = function(e) {
	soundingHideButton.style.display = "none";
	soundingShowButton.style.display = "inline";
	soundingHideOutput();
};
soundingShowButton.onclick = function(e) {
	soundingShowButton.style.display = "none";
	soundingHideButton.style.display = "inline";
	soundingShowOutput();
};
soundingPlotButton.onclick = function(e) {
	body_node.style.pointerEvents = 'none';
	body_node.style.cursor = 'auto';
	soundingShowButton.click();
	soundingTextTabButton.click();
	var l = soundingLatLonInput.value.split(',');
	l[0] = parseFloat(l[0]);
	l[1] = parseFloat(l[1]);
	statusString = "Getting data. Please wait.\n";
	soundingDataTextArea.innerText = statusString;
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

function registerPlotlyTitleMutationObserver(){	
	fix_plotly_title_size();

	if (plotlyTitleObserver){
		return;
	}
	
	var config = {
		attributes: true,
		attributeFilter: ['style'],
		childList: false,
		subtree: false
	};
	// Callback function to execute when mutations are observed
	var callback = function(mutationsList) {
		var redraw = false;
		for (var mutation of mutationsList) {
			if (mutation.target.style.fontSize != "12pt") {
				redraw = true;
				break;
			}
		}
		if (redraw === true) {
			fix_plotly_title_size(mutation.target);
		}
	};
	// Create an observer instance linked to the callback function
	plotlyTitleObserver = new MutationObserver(callback);
	// Start observing the target node for configured mutations
		document.querySelectorAll('.gtitle').forEach(function(e){
		plotlyTitleObserver.observe(e, config);
	});
	
}

function fix_plotly_title_size(e){
	if (!e){
		document.querySelectorAll('.gtitle').forEach(function(e){
			if (e.style.fontSize != "12pt") {
				e.style.fontSize = "12pt";
			}
		});
	}
	else if (e.style.fontSize != "12pt") {
		e.style.fontSize = "12pt";
	}
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
function run() {
	var ll = getCookie('latLon');
	var product = getCookie('product');
	resetDataset();
	if (ll) {
		ll = ll.split(",");
		dataset.ll.lat = parseFloat(ll[0]);
		dataset.ll.lon = parseFloat(ll[1]);
	}
	if (product) {
		dataset.product = product;
	}
	soundingLatLonInput.value = dataset.ll.lat + "," + dataset.ll.lon;
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
	windyobj.overlays.temp.setMetric("°C");
	window.onresize = redrawPlots;
	registersoundingGraphTabMutationObserver();
	windyobj.picker.on('pickerOpened', ll => {
		setLocus(ll);
	});
	windyobj.picker.on('pickerMoved', (ll, result) => {
		setLocus(ll);
	});

	datasetCookie = getCookie('dataset');
	if (datasetCookie){
		oldDataset = JSON.parse(datasetCookie);
		draw_graph(oldDataset);
	}
	windyobj.broadcast.fire('rqstOpen', 'picker', dataset.ll);

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
		try {
			run();
		}
		catch(err){
			console.log("Udometer: sounding tool failed to initialize");
		}
	});
})