/**
 * A traffic simulator.
 *
 */

// Constants
var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
var DEF_CAR_MAX_SPEED = 3.0;
var DEF_CAR_ACCEL = 0.01;
var INTX_SIZE = 20;
var CAR_SIZE = 5;

// Game elements
var canvas, ctx, keystate, modeButtons;

// Set of all intersections
var intersections = {};
// Set of all cars
var cars = {};
// Set of speed limits
var speedLimits = {};

function setSpeedLimit(start, end, speed){
	speedLimits[start + " " + end] = speed;
}

function getSpeedLimit(start, end){
	return speedLimits[start + " " + end];
}

// Square distance function
function sqdist(x1, y1, x2, y2){
	return Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
}

// Intersection object
function Intersection(id, posx, posy){
	// Add this intersection to the master set
	intersections[id] = this;
	this._id = id;
	
	// Absolute position
	this._posx = posx;
	this._posy = posy;
	
	// Set of IDs of connected intersections
	this._roads = {};
}
Intersection.prototype = {
	constructor: Intersection,
	
	// Connect this intersection to another intersection.
	// Bidirectional could be set to false to have a one-way road, but
	// it is also used to call the other intersection's connect function
	connect: function(id, bidirectional = true){
		// Sometimes connect receives an instance of an intersection
		if(id instanceof Intersection){
			id = id._id;
		}
		
		// Sometimes a string gets passed
		id = Number(id);
		
		// Check for a logical error
		if(this._id == id){
			console.log("[WARNING] Connecting intersection ", id, " to self.");
		}
		
		// Add new road id with distance
		this._roads[id] = this.distTo(id);
		
		// Set speed limit to default for now, can take parameter in the future
		setSpeedLimit(this._id, id, DEF_CAR_MAX_SPEED);
		
		if(bidirectional){
			intersections[id].connect(this._id, false);
		}
	},
	
	// disconnect this intersection from another intersection
	disconnect: function(id, bidirectional = true){
		// Sometimes disconnect receives an instance of an intersection
		if(id instanceof Intersection){
			id = id._id;
		}
		
		// Sometimes a string gets passed
		id = Number(id);

		// Remove cars on this connection
		for(var car in cars){
			if(cars[car]._start == this._id && cars[car]._dest == id){
				cars[car].remove();
			}
		}
		
		delete this._roads[id];
		if(bidirectional){
			intersections[id].disconnect(this._id, false);
		}
	},
	
	distTo: function(id){
		// Return precomputed value
		if(this.hasRoadTo(id)){
			return this._roads[id];
		}
		console.log("no precomp distance");
		return Math.hypot(this._posx - intersections[id]._posx, this._posy - intersections[id]._posy);
	},
	
	toggleRoad: function(id){
		if(this.hasRoadTo(id)){
			this.disconnect(id);
		}else{
			this.connect(id);
		}
	},
	
	// getRandomConnection returns a random one of this intersection's connections,
	// for a car to go to.
	// Perhaps add a parameter for the intersection that the car just came from
	getRandomConnection: function(){
		ids = Object.keys(this._roads);
		return ids[Math.floor(Math.random()*ids.length)];
	},
	
	// draw this intersection
	draw: function(ctx){
		ctx.save();
		ctx.fillRect(this._posx - INTX_SIZE/2, this._posy - INTX_SIZE/2, INTX_SIZE, INTX_SIZE);
		// Draw roads
		for(var road in this._roads){
			ctx.beginPath();
			ctx.moveTo(this._posx, this._posy);
			ctx.lineTo(intersections[road]._posx, intersections[road]._posy);
			ctx.stroke();
		}
		ctx.restore();
	},
	
	// Draw a highlight around the intersection
	drawHighlight: function(ctx){
		ctx.save();
		ctx.beginPath();
		ctx.strokeStyle = "#fff800";
		ctx.lineWidth = 4;
		ctx.rect(this._posx - INTX_SIZE/2, this._posy - INTX_SIZE/2, INTX_SIZE, INTX_SIZE);
		ctx.stroke();
		ctx.restore();
	},
	
	// Return true if there is a road connection to id
	hasRoadTo: function(id){
		return this._roads.hasOwnProperty(Number(id));
	},
	
	// remove this intersection
	remove: function(){
		// Remove all connections
		for(var road in this._roads){
			this.disconnect(road);
		}
		
		// Remove from master set
		delete intersections[this._id];
	},
}

// Helper functions to get the next available intersection or car id
var nextintxid = 0;
function newIntersectionId(){
	return nextintxid++;
}

var nextcarid = 0;
function newCarId(){
	return nextcarid++;
}

// Car class
function Car(id, start, dest){
	cars[id] = this;
	this._id = id;
	
	this._speed = 0;
	this._maxSpeed = getSpeedLimit(start, dest);
	this._accel = DEF_CAR_ACCEL;
	
	//IDs of start and destination intersections
	this._start = start;
	this._dest = dest;
	this._progress = 0.0;
	
	// Position variables
	// These are not updated to move a car (cars are just drawn based on their progress to a destination),
	// but these are saved each time they are calculated for drawing, so that they can be used for detection.
	this._posx = 0;
	this._posy = 0;
}
Car.prototype = {
	constructor: Car,
	
	// Update function updates the state of the car.
	// In the future this could accept a delta time variable to move normally
	update: function(){
		// Accelerate
		if(this._speed < this._maxSpeed){
			this._speed += this._accel;
		}
		
		// Cap speed
		this._speed = Math.min(this._speed, this._maxSpeed);
		
		// Move
		this._progress += this._speed/(intersections[this._start].distTo(this._dest));
		
		if(this._progress >= 1){
			this._start = this._dest;
			this._dest = intersections[this._dest].getRandomConnection();
			this._progress = 0;
			
			this._maxSpeed = getSpeedLimit(this._start, this._dest);
			
			// for now, going through an intersection halves speed.
			this._speed /= 2;
		}
	},
	
	// draw this car
	draw: function(ctx){
		var posx = intersections[this._dest]._posx * this._progress
				 + intersections[this._start]._posx * (1-this._progress);
		var posy = intersections[this._dest]._posy * this._progress
				 + intersections[this._start]._posy * (1-this._progress);
		this._posx = posx;
		this._posy = posy;
		
		ctx.save();
		ctx.beginPath();
		ctx.arc(posx, posy, CAR_SIZE, 0, 2*Math.PI);
		ctx.fillStyle = "#cc0000"
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	},
	
	// remove this car
	remove: function(){
		delete cars[this._id];
	},
}

// Game states
var RUN = 0, ADD_INTERSECTION = 1, REM_INTERSECTION = 2, ADD_CAR = 3, REM_CAR = 4, TOGGLE_ROAD = 5;
var mode;

// Button ID to mode ID mapping
var buttonIdToMode = {
	"bAddIntersection" : ADD_INTERSECTION,
	"bRemIntersection" : REM_INTERSECTION,
	"bAddCar" : ADD_CAR,
	"bRemCar" : REM_CAR,
	"bToggleRoad" : TOGGLE_ROAD
}

// Game entry point
function main(){
	init();
	window.requestAnimationFrame(step);
}

// Window initialization
function init(){
	canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	ctx = canvas.getContext("2d");
	document.getElementById("display").appendChild(canvas);
	document.addEventListener("keyup", keyUp);

	canvas.addEventListener("click", click);
	
	mode = RUN;
	
	// Add button listeners
	modeButtons = document.querySelectorAll(".bmode");
	modeButtons.forEach(function(b){
		b.onclick = function(){
			toggleMode(buttonIdToMode[b.id])
		}
	});
}

// A toggle mode function to enable/disable buttons and enter/leave RUN mode
function toggleMode(m){
	if(mode == m){
		// Return to RUN mode (changeMode function enables all buttons)
		changeMode(RUN);
	}else{
		// Disable all buttons except this new mode's button
		modeButtons.forEach(function(b){
			if(buttonIdToMode[b.id] != m){
				b.disabled = true;
			}
		});
		changeMode(m);
	}
}

function changeMode(newMode){
	mode = newMode;
	
	// Initialize mode variables
	if(mode == RUN){
		console.log("[DEBUG] Entering RUN mode with intersections and cars:");
		console.log(intersections);
		console.log(cars);
		modeButtons.forEach(function(b){
			b.disabled = false;
		});
		window.requestAnimationFrame(step);
	}else if(mode == ADD_INTERSECTION){
		newIntersection = null;
	}else if(mode == ADD_CAR){
		newCarStart = -1;
		newCarEnd = -1;
	}else if(mode == TOGGLE_ROAD){
		roadFromIntersection = -1;
	}
}

function keyUp(evt){
	if(evt.keyCode == 73){ // i
		toggleMode(ADD_INTERSECTION);
	}else if(evt.keyCode == 67){ // c
		toggleMode(ADD_CAR);
	}else if(evt.keyCode == 79){ // o
		toggleMode(REM_INTERSECTION);
	}else if(evt.keyCode == 86){ // v
		toggleMode(REM_CAR);
	}else if(evt.keyCode == 82){ // r
		toggleMode(TOGGLE_ROAD);
	}
}

// Intersection object used when adding a new intersection
var newIntersection = null;
// Start and end IDs used when adding a new car
var newCarStart = -1, newCarEnd = -1;
// Intersection ID used when toggling a road
var roadFromIntersection = -1;
function click(evt){
	var mousex = evt.offsetX;
	var mousey = evt.offsetY;
	if(mode == ADD_INTERSECTION){
		if(newIntersection == null){
			// First click, add new intersection here and draw it (remember draw loop is paused)
			newIntersection = new Intersection(newIntersectionId(), mousex, mousey);
			newIntersection.draw(ctx);
		}else{
			// Not first click, detect if clicking on another intersection to link to
			var found = false;
			for(var i in intersections){
				if(i != newIntersection._id){
					var intx = intersections[i];
					if(sqdist(intx._posx, intx._posy, mousex, mousey) < INTX_SIZE*INTX_SIZE){
						newIntersection.connect(i);
						newIntersection.draw(ctx);
						found = true;
					}
				}
			}
			// Did not click on another intersection
			if(!found){
				newIntersection = null;
				changeMode(RUN);
			}
		}
	}
	
	else if(mode == REM_INTERSECTION){
		for(var i in intersections){
			var intx = intersections[i];
			if(sqdist(intx._posx, intx._posy, mousex, mousey) < INTX_SIZE*INTX_SIZE){
				intx.remove();
				break;
			}
		}
		changeMode(RUN);
	}
	
	else if(mode == ADD_CAR){
		var clicked = -1;
		for(var i in intersections){
			var intx = intersections[i];
			if(sqdist(intx._posx, intx._posy, mousex, mousey) < INTX_SIZE*INTX_SIZE){
				clicked = i;
			}
		}
		
		if(clicked == -1){
			// Reset variables and exit add car mode, nothing clicked
			newCarStart = -1;
			newCarEnd = -1;
			changeMode(RUN);
		}else{
			if(newCarStart == -1){
				newCarStart = clicked;
				
				// Highlight the new car start intersection
				intersections[newCarStart].drawHighlight(ctx);
			}else if(newCarEnd == -1){
				newCarEnd = clicked;
				
				if(intersections[newCarStart].hasRoadTo(newCarEnd)){
					// Add the new car and reset variables and exit add car mode
					new Car(newCarId(), newCarStart, newCarEnd);
				}else if(newCarStart == newCarEnd){
					// Clicked the same intersection, go to random destination
					new Car(newCarId(), newCarStart, intersections[newCarStart].getRandomConnection());
				}
				newCarStart = -1;
				newCarEnd = -1;
				changeMode(RUN);
			}else{
				console.log("[WARNING] Logical error in add car mode click handler");
			}
		}
	}
	
	else if(mode == REM_CAR){
		for(var c in cars){
			var car = cars[c];
			if(sqdist(car._posx, car._posy, mousex, mousey) < CAR_SIZE*CAR_SIZE){
				car.remove();
				break;
			}
		}
		changeMode(RUN);
	}
	
	else if(mode == TOGGLE_ROAD){
		var foundClicked = -1;
		for(var i in intersections){
			var intx = intersections[i];
			if(sqdist(intx._posx, intx._posy, mousex, mousey) < INTX_SIZE*INTX_SIZE){
				foundClicked = i;
			}
		}
		
		if(foundClicked == -1){
			// Clicked nothing, leave mode
			changeMode(RUN);
		}else{
			if(roadFromIntersection == -1){
				// First click is on foundClicked
				roadFromIntersection = foundClicked;
				
				// Highlight the start intersection
				intersections[roadFromIntersection].drawHighlight(ctx);
			}else{
				// Toggle road between roadFromIntersection and foundClicked
				intersections[roadFromIntersection].toggleRoad(foundClicked);
				changeMode(RUN);
			}
		}
	}
}

// Frame step
function step(){
	if(mode == RUN){
		update();
		draw();
		window.requestAnimationFrame(step);
	}
}

// Update all entities
function update(){
	for(var car in cars){
		cars[car].update();
	}
}

// Redraw screen
function draw(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	// Draw intersections
	for(var intx in intersections){
		intersections[intx].draw(ctx);
	}
	
	// Draw cars
	for(var car in cars){
		cars[car].draw(ctx);
	}
	ctx.restore();
}

// Create a couple of intersections and cars for demo
var a = new Intersection(newIntersectionId(), 100, 100);
var b = new Intersection(newIntersectionId(), 200, 200);
var c = new Intersection(newIntersectionId(), 300, 100);
var d = new Intersection(newIntersectionId(), 275, 225);
var e = new Intersection(newIntersectionId(), 150, 300);
var f = new Intersection(newIntersectionId(), 1000, 200);
a.connect(e);
b.connect(a);
c.connect(a);
c.connect(d);
c.connect(b);
d.connect(b);
e.connect(d);
f.connect(c);
f.connect(d);
console.log(intersections);

for(var i = 0; i < 10; i++){
	new Car(newCarId(), b._id, b.getRandomConnection());
}
console.log(cars);