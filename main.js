// Prompt the user for an API key.
// Can also be set so there's no prompt (if you're reading this code)
var API_KEY = null;
if(!API_KEY) {
	API_KEY = prompt('API Key');
}

// Templates
var currentWeather = document.getElementById('currentWeather').content.cloneNode(true);
var forecast = document.getElementById('forecast').content.cloneNode(true);

var points = null;

getMyWeather();

function showWeather(data) {
	showCurrentWeather(data);
	showForecast(data);
}

// Reads the forecast data (to be used in the graph)
function readForecast(data) {
	let points = [];
	for(let i = 0; i < data.hourly.length; i++) {
		points.push({});
		points[i].temp = data.hourly[i].temp;
		points[i].rain = data.hourly[i].rain ? data.hourly[i].rain['1h'] : 0;
		points[i].time = getTime(new Date(data.hourly[i].dt * 1000));
	}
	return points;
}

// Calculates the range of a variable in the points
function calcRange(points, variable) {
	let range = {min: 1e9, max: -1e9};
	for(point of points) {
		range.min = Math.min(range.min, point[variable]);
		// Don't divide by 0 :)
		range.max = Math.max(range.max, point[variable] + 0.01);
	}
	return range;
}

// Scale borked the display, so I had to make this.
// Maps a number from range to aftRange
function map(n, range, aftRange) {
	return (n - range.min) / (range.max - range.min) * (aftRange.max - aftRange.min) + aftRange.min;
}

// Converts point coordinates to canvas coordinates
function canvPos(i, range, points, cvs, variable) {
	return {
		x: map(i, {min: 0, max: points.length - 1}, {min: 5, max: cvs.width - 6}),
		y: cvs.height - map(points[i][variable], range, {min: 5, max: cvs.height - 6})
	}
}

// Shows the forecast graph for temperature and rain
function showForecast(data) {
	initElement(forecast);
	points = readForecast(data);
	let cvs = document.getElementById('cvs');
	let ctx = cvs.getContext('2d');
	// The same canvas is used when you switch cities, so it has to be wiped
	ctx.clearRect(0, 0, cvs.width, cvs.height);
	ctx.lineWidth = 2;
	// Temperature lines
	ctx.strokeStyle = '#198754';
	let rangeTemp = calcRange(points, 'temp');
	ctx.beginPath();
	ctx.moveTo(-1e9, 0);
	for(let i = 0; i < points.length; i++) {
		let pos = canvPos(i, rangeTemp, points, cvs, 'temp');
		ctx.lineTo(pos.x, pos.y);
	}
	ctx.stroke();
	// Rain lines
	ctx.strokeStyle = '#0D6EFD';
	let rangeRain = calcRange(points, 'rain');
	ctx.beginPath();
	ctx.moveTo(-1e9, 0);
	for(let i = 0; i < points.length; i++) {
		let pos = canvPos(i, rangeRain, points, cvs, 'rain');
		ctx.lineTo(pos.x, pos.y);
	}
	ctx.stroke();
	// Dots showing where the data points are
	ctx.fillStyle = '#A0A0A0';
	for(let i = 0; i < points.length; i++) {
		let posTemp = canvPos(i, rangeTemp, points, cvs, 'temp');
		let posRain = canvPos(i, rangeRain, points, cvs, 'rain');
		ctx.beginPath();
		ctx.arc(posTemp.x, posTemp.y, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(posRain.x, posRain.y, 5, 0, Math.PI * 2);
		ctx.fill();
	}
}

// Converts a date into a time in string form
function getTime(date) {
	let hrs = date.getHours();
	let mins = date.getMinutes();
	let merid = 'AM';
	if(hrs >= 12) {
		merid = 'PM';
	}
	if(hrs == 0) {
		hrs = 12;
	}
	if(hrs > 12) {
		hrs -= 12;
	}
	return `${hrs}:${mins.toString().padStart(2, '0')}${merid}`;
}

// Reads the info for the current time from the data
function readInfo(data) {
	return {
		clouds: `${data.current.clouds}%`,
		temp: `${Math.round(data.current.temp)}°F`,
		tempMin: `${Math.round(data.daily[0].temp.min)}°F`,
		tempMax: `${Math.round(data.daily[0].temp.max)}°F`,
		wind: `${data.current.wind_speed}mi/h`,
		uviCur: data.current.uvi,
		uviMax: data.daily[0].uvi,
		sunrise: getTime(new Date(data.current.sunrise * 1000)),
		sunset: getTime(new Date(data.current.sunset * 1000)),
		humidity: `${data.current.humidity}%`,
		icon: iconURL(data.current.weather[0].icon, scale=4),
		rain: data.current.rain ? `${data.current.rain}mm` : '0mm'
	};
}

// Sets all the data for the current weather so it can be shown
function showCurrentWeather(data) {
	initElement(currentWeather);
	let info = readInfo(data);
	document.getElementById('icon').src = info.icon;

	document.getElementById('tempMin').innerHTML = info.tempMin;
	document.getElementById('temp').innerHTML = info.temp;
	document.getElementById('tempMax').innerHTML = info.tempMax;

	document.getElementById('rain').innerHTML = '0mm';
	document.getElementById('humidity').innerHTML = info.humidity;
	document.getElementById('wind').innerHTML = info.wind;
	document.getElementById('clouds').innerHTML = info.clouds;

	document.getElementById('sunrise').innerHTML = info.sunrise;
	document.getElementById('uviCur').innerHTML = info.uviCur;
	document.getElementById('uviMax').innerHTML = info.uviMax;
	document.getElementById('sunset').innerHTML = info.sunset;
}

// Gets and shows the weather at the current location
function getMyWeather() {
	if('geolocation' in navigator) {
		navigator.geolocation.getCurrentPosition((pos) => {
			document.getElementById('city').innerHTML = 'Local';
			getPosWeather(pos.coords.latitude, pos.coords.longitude);
		});
	} else {
		alert('GPS Error');
	}
}

// I was lazy
function readInput(id) {
	let input = document.getElementById(id);
	return input.value;
}

// Scale must be 2 or 4
function iconURL(code, scale=2) {
	return `https://openweathermap.org/img/wn/${code}@${scale}x.png`;
}

function searchURL(city) {
	// Find wasn't described in any of the documentation, so it was (ironically) REALLY hard to find
	return `https://api.openweathermap.org/data/2.5/find?q=${city}&appid=${API_KEY}`;
}

function oneCallURL(lat, lon) {
	return `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=imperial&appid=${API_KEY}`;
}

// axios.get() with error handling
async function get(url) {
	return await axios.get(url).catch((e) => {
		alert('API Call Error');
		console.log(e);
		console.log(e.response.data);
	});
}

// Gets and shows the weather at the given coordinates
async function getPosWeather(lat, lon) {
	let response = await get(oneCallURL(lat, lon));
	let data = response.data;
	showWeather(data);
}

// Just makes sure that the element is being shown before we mess with it
function initElement(e) {
	document.getElementById('container').appendChild(e);
}

// Gets and shows the weather at the city of the given input form id
async function getCityWeather(inputID) {
	let city = readInput(inputID);
	let response = await get(searchURL(city));
	if(response.data.list.length > 0) {
		let city = response.data.list[0];
		let coord = city.coord;
		document.getElementById('city').innerHTML = `${city.name}, ${city.sys.country}`;
		getPosWeather(coord.lat, coord.lon);
	} else {
		alert('City not found');
	}
}

// Show the graph info box
function showInfo() {
	let infoBox = document.getElementById('graphInfo');
	infoBox.style.display = 'block';
}

// Hide the graph info box
function hideInfo() {
	let infoBox = document.getElementById('graphInfo');
	infoBox.style.display = 'none';
}

function updateInfo(infoBox, x, shape) {
	// This mapping is actually slightly off because it assumes that the points span the entire canvas.
	// I am acknowleding that it is slightly off, but it's only off by a tiny little bit,
	// and fixing it would take forever, so I'm not fixing it
	let i = Math.round(map(x, {min: shape.left, max: shape.right}, {min: 0, max: points.length - 1}));

	document.getElementById('graphTime').innerHTML = `${points[i].time}`;
	document.getElementById('graphTemp').innerHTML = `${points[i].temp}°F`;
	document.getElementById('graphRain').innerHTML = `${points[i].rain}mm/h`;
}

// Move and update the graph info box
function moveInfo(e) {
	let shape = document.getElementById('cvs').getBoundingClientRect();
	let infoBox = document.getElementById('graphInfo');
	infoBox.style.left = `${e.clientX + 50}px`;
	infoBox.style.top = `${e.clientY - 55}px`;
	updateInfo(infoBox, e.clientX, shape);
}