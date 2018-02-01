/**
 * A traffic simulator.
 *
 */

// Constants
var WIDTH = 800, HEIGHT = 600;
var DEF_CAR_SPEED = 0.01;

// Game elements
var canvas, ctx, keystate;

// Set of all intersections
var intersections = {};
// Set of all cars
var cars = {};

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
		// Currently do not need ctx.save() and restore() as we do not modify ctx
		ctx.fillRect(this._posx - 10, this._posy - 10, 20, 20);
		// Draw roads
		this._roads.forEach(function(road){
			ctx.beginPath();
			ctx.moveTo(this._posx, this._posy);
			ctx.lineTo(intersections[road]._posx, intersections[road]._posy);
			ctx.stroke();
		}, this);
	}
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
		
		ctx.save();
		ctx.beginPath();
		ctx.arc(posx, posy, 5, 0, 2*Math.PI);
		ctx.fillStyle = "#cc0000"
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
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
}

// Frame step
function step(){
	update();
	draw();
	window.requestAnimationFrame(step);
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