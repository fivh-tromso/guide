
// Safari touch compatibility
document.addEventListener(
  'touchstart',
  function () {},
  { passive: false }
);

var map;
var places = {};
var layers = {};
var tableContent = "";
var nav = false;

// from https://github.com/Leaflet/Leaflet.markercluster/issues/904
L.MarkerClusterGroup.include({
    zoomToShowLayer: function(layer, callback) {
	
	var map = this._map;

	if (typeof callback !== 'function') {
	    callback = function() {};
	}

	var showMarker = function() {
    	    //if ((layer._icon || layer.__parent._icon) && !this._inZoomAnimation) {
	    if ((map.hasLayer(layer) || map.hasLayer(layer.__parent)) && !this._inZoomAnimation) {
		map.off('moveend', showMarker, this);
		this.off('animationend', showMarker, this);

		//if (layer._icon) {
		if (map.hasLayer(layer)) {
		    callback();
		} else if (map.hasLayer(layer.__parent)) {
		    this.once('spiderfied', callback, this);
		    layer.__parent.spiderfy();
		}
	    }
	};

	if (map.hasLayer(layer) && map.getBounds().contains(layer.getLatLng())) {
	    //Layer is visible ond on screen, immediate return
	    callback();
	} else if (layer.__parent._zoom < Math.round(map._zoom)) {
	    //Layer should be visible at this zoom level. It must not be on screen so just pan over to it
	    map.on('moveend', showMarker, this);
	    map.panTo(layer.getLatLng());
	} else {
	    map.on('moveend', showMarker, this);
	    this.on('animationend', showMarker, this);
	    layer.__parent.zoomToBounds();
	}
    }
});

function init() {
    map = L.map('map').setView([69.65, 18.94], 13); 
    L.tileLayer(
	'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
	{
	    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, ' +
		'&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
		'&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, ' +
		'made by <a href="mailto:pierrebeauguitte@pm.me">Pierre Beauguitte</a>, edited by FIVH Tromsø',
	    maxZoom: 20,
	    minZoom: 11,
	}).addTo(map);
    map.setMaxBounds(L.latLngBounds(L.latLng(69.8000, 18.5000),
				    L.latLng(69.6000, 19.2000)));
    loadPlaces();
}

function makeClusterIcon(type) {
    return function (cluster) {
	return L.divIcon({
	    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
	    className: 'marker-cluster marker-cluster-' + type,
	    iconSize: L.point(40, 40)
	});
    }
}

function draw() {
    for (k in places) {
	layers[k] = L.markerClusterGroup({
	    iconCreateFunction: makeClusterIcon(k),
	    polygonOptions: { color: 'var(--' + k + ')' }
	});
	layers[k].addLayer(L.layerGroup(places[k].map(x => x.marker)));
	layers[k].addTo(map);
    }
}

function show(cat) {
    if (map.hasLayer(layers[cat])) {
        map.removeLayer(layers[cat]);
	document.getElementById("vis_" + cat).innerHTML = "visibility_off";
    } else {
        map.addLayer(layers[cat]);
	document.getElementById("vis_" + cat).innerHTML = "visibility";
    }
}

function toggleView(cb) {
    var sub = document.getElementById(cb);
    if (sub.style.display == 'none')
	sub.style.display = '';
    else
	sub.style.display = 'none';
}

function pop(cat, index) {
    layers[cat].zoomToShowLayer(places[cat][index].marker, () => {
	places[cat][index].marker.openPopup();
    });
    if (nav)
	toggleNav();
}

function hideRows(cat) {
    var rows = document.getElementsByClassName(cat);
    if (places[cat].view === true) {
	for (row of rows)
	    row.style.display = 'none';
	document.getElementById("fold_" + cat).innerHTML = "expand_more";
    }
    else {
	for (row of rows)
	    row.style.display = '';
	document.getElementById("fold_" + cat).innerHTML = "expand_less";
    }
    places[cat].view = !places[cat].view; 
}

var translations = {
    'food': {
	'text': 'Food',
	'icon': 'restaurant'
    },
    'bike': {
	'text': 'Travel and experiences',
	'icon': 'pedal_bike'
    },
    'clothes': {
	'text': 'Clothes & 2nd Hand',
	'icon': 'checkroom'
    },
    'tools': {
	'text': 'Repairs and tools',
	'icon': 'handyman'
    },
    'sports': {
	'text': 'Sharing economy',
	'icon': 'diversity_1'
    },
    'events': {
	'text': 'Events',
	'icon': 'campaign'
    }
}

function createTable() {
    for (cat in places) {
	tableContent += "<tr class='cat_row' " +
	    "style='background-color:var(--" + cat + ")'>\n" +
	    "<td class='placename' style='width: 100%;'><i class='material-icons' style='padding-right:15px;'>" + translations[cat]['icon'] + "</i>" + translations[cat]['text'] + "</td>" +
	    "<td><i class='material-icons'><a class='tbl_ctl' id='vis_" + cat + "' onClick=show('" + cat + "');>visibility</a> " +
	    "<a class='tbl_ctl' id='fold_" + cat +"' onClick=hideRows('" + cat + "');>expand_more</a></i></td>\n" + 
	    "\n</tr>\n"
	var cnt = 0;
	places[cat].view = false;
	for (place of places[cat]) {
	 	let infoText = place['prop']['info'] ? place['prop']['info'] : "No extra info";
		infoText = infoText.replace(/"/g, '&quot;'); // escape quotes for HTML
		
		tableContent += "<tr class='place " + cat + "' " +
		    "onClick=pop('" + cat + "'," + cnt + "); style='display: none'>\n" +
		    "<td class='placename'>" + place['prop']['name'] + "</td>\n" + 
		    "<td align='right'>" +
		        (place['prop']['info']
		          ? " <span class='info-icon' title='" + infoText + "'>ℹ️💡</span>"
		          : ""
		        ) +
				(place['prop']['website']
		          ? "<a href='" + place['prop']['website'] + "' target='_blank'>➜</a>"
		          : ""
		        ) +
		        
		    "</td>\n</tr>\n";
		cnt++;
	}
    }
    document.getElementById("tableview").innerHTML = tableContent;
}

function makeIcon(cat) {
    return L.divIcon({
	className: 'custom-div-icon',
	html: "<div style='background-color:var(--" + cat + ");' class='marker-pin'>" +
	    "</div><i class='material-icons'>" + translations[cat]['icon'] + "</i>",
	iconSize: [22, 38],
	iconAnchor: [11, 38],
	popupAnchor: [0, -19]
    });
}


function loadPlaces() {
    fetch('../data.csv')
        .then(response => response.text())
        .then(csvText => {
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            });

            // Clear previous places
            places = {};

            parsed.data.forEach(row => {
                // Parse geometry: "longitude,latitude"
                let lon = null, lat = null;
                if (row.geometry && row.geometry.includes(',')) {
                    const coords = row.geometry.split(',').map(Number);
                    lon = coords[0];
                    lat = coords[1];
                }
                if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return; // skip invalid

                const cat = row.category;
                const prop = {
                    name: row.name_en,
                    category: cat,
                    website: row.website,
                    address: row.address,
                    city: row.city,
					info: row.info
                };

				let infoText = prop.info ? prop.info.replace(/"/g, '&quot;') : "No extra info";

				const marker = L.marker([lat, lon], { icon: makeIcon(cat) });
				marker.bindPopup(
				    '<b>' + prop.name + '</b>' +
				    '<p style="padding:0;margin:0;">' +
				        (prop.address ? prop.address + '<br/>' : '') +
				        (prop.city ? prop.city : '') +
				    '</p>' +
				    (prop.website
				        ? '<a target="_blank" href="' + prop.website + '">' + prop.website + '</a>'
				        : ''
				    ) +
				    (prop.info
				        ? ' <span class="info-icon" title="' + infoText + '">info💡</span>'
				        : ''
				    )
				);

                if (!(cat in places)) places[cat] = [];
                places[cat].push({
                    'prop': prop,
                    'marker': marker
                });
            });

            createTable();
            draw();
        });
}

function toggleNav() {
    if (nav) {
	document.getElementById("tablecont").style.width = "";
	document.getElementById("showMenu").style.right = "0px";
	document.getElementById("fold_menu").innerHTML = "navigate_before";
    } else {
	document.getElementById("tablecont").style.width = "var(--tabwidth)";
	document.getElementById("tablecont").style.left = "screen.width - var(--tabwidth)";
	document.getElementById("showMenu").style.right = "var(--tabwidth)";
	document.getElementById("fold_menu").innerHTML = "navigate_next";
    }
    nav = !nav;
}
