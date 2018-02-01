// Constants
var WIDTH = 800, HEIGHT = 600;

// Game elements
var canvas, ctx, keystate;

// Set of all intersections
var intersections = {};

// Intersection object
function Intersection(id, posx, posy){
	// Add this intersection to the master set
	intersections[id] = this;
	this._id = id;
	
	// Absolute position
	this._posx = posx;
	this._posy = posy;
	
	// Set of IDs of connected roads
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
	}
}

// Helper function to get the next available intersection id
var nextid = 0;
function newIntersectionId(){
	return nextid++;
}

// Create a couple of intersections for now
var a = new Intersection(newIntersectionId(), 100, 100);
var b = new Intersection(newIntersectionId(), 200, 200);
b.connect(a._id);
console.log(intersections);

function main(){
	init();
	
}