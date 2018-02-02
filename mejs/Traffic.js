/**
 * A traffic simulator.
 *
 */

// Constants
var WIDTH = 800, HEIGHT = 600;
var DEF_CAR_SPEED = 0.01;
var INTX_SIZE = 20;
var CAR_SIZE = 5;

// Game elements
var canvas, ctx, keystate, modeButtons;

// Set of all intersections
var intersections = {};
// Set of all cars
var cars = {};

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
	this._roads = new Set();
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
		// Add id to this connection set
		this._roads.add(id);
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
		
		this._roads.delete(id);
		if(bidirectional){
			intersections[id].disconnect(this._id, false);
		}
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
		// TODO Sets are not good for picking a random item from
		// We can only either iterate the set or convert to an array on the spot.
		roadArr = Array.from(this._roads);
		return roadArr[Math.floor(Math.random()*roadArr.length)];
	},
	
	// draw this intersection
	draw: function(ctx){
		ctx.save();
		ctx.fillRect(this._posx - INTX_SIZE/2, this._posy - INTX_SIZE/2, INTX_SIZE, INTX_SIZE);
		// Draw roads
		this._roads.forEach(function(road){
			ctx.beginPath();
			ctx.moveTo(this._posx, this._posy);
			ctx.lineTo(intersections[road]._posx, intersections[road]._posy);
			ctx.stroke();
		}, this);
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
		return this._roads.has(Number(id));
	},
	
	// remove this intersection
	remove: function(){
		// Remove all connections
		this._roads.forEach(function(road){
			this.disconnect(road);
		}, this);
		
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
	
	this._speed = DEF_CAR_SPEED;
	
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
		this._progress += this._speed;
		
		if(this._progress >= 1){
			this._start = this._dest;
			this._dest = intersections[this._dest].getRandomConnection();
			this._progress = 0;
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

	canvas.addEventListener("mousedown", click);
	
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
a.connect(e._id);
b.connect(a._id);
c.connect(a._id);
c.connect(d._id);
c.connect(b._id);
d.connect(b._id);
e.connect(d._id);
console.log(intersections);

new Car(newCarId(), a._id, b._id);
new Car(newCarId(), c._id, d._id);
new Car(newCarId(), e._id, d._id);