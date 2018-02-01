//var WIDTH = document.body.clientWidth, HEIGHT = document.body.clientHeight;
var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

// Canvas variables
var canvas, ctx;
var FONT_SIZE = 14;
var drawNeeded = true;
var instructionsElement;

// Mouse global variables
var mouseIsPressed = false;
var mouseX, mouseY;

var BALL_SIZE = 20;
var DRAW_DELAY = 20;
var lastDrawn = 0;
var DECAY = 0.995

// The Ball object
function Ball(posX, posY, velX, velY){
	// Random color between #000000 and #FFFFFF
	this.color = "#"+Math.floor(Math.random()*16777216).toString(16);
	this.size = BALL_SIZE;
	this.centerX = mouseX-BALL_SIZE/2;
	this.centerY = mouseY-BALL_SIZE/2;
	this.velx = velX;
	this.vely = velY;
}
Ball.prototype = {
	constructor: Ball,
	
	// check whether this ball touches the other ball
	touching: function(other){
		return Math.pow((this.centerX-other.centerX),2) + Math.pow((this.centerY-other.centerY),2) < Math.pow((this.size+other.size),2);
	}
}

// Physics variables
var GRAVITY = -1.0;

// List of balls on the screen
var balls;

function main(){
	init();

	window.requestAnimationFrame(step);
}

function step(){
	drawNeeded = false;
	if(lastDrawn > 0) lastDrawn --;
	update();
	if(drawNeeded){
		draw();
	}
	window.requestAnimationFrame(step);
}

function init(){
	canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	ctx = canvas.getContext("2d");
	document.getElementById("display").appendChild(canvas);

	ctx.font = FONT_SIZE+"px Arial";

	canvas.addEventListener("mousedown", mouseDown);
	canvas.addEventListener("mouseup", mouseUp);
	canvas.addEventListener("mouseenter", mouseEnter);
	canvas.addEventListener("mousemove", mouseMove);
	canvas.addEventListener("mouseleave", mouseLeave);

	instructionsElement = document.getElementById("instrWrap");
	console.log(instructionsElement);
	
	balls = new DoublyLinkedList();
}

var downX, downY;

var timeDown;

// Mouse handling functions
function mouseDown(evt){
	// remove instructions on first click
	if(instructionsElement != null){
		console.log("Removed instructions");
		instructionsElement.innerHTML = ""; //instructionsElement.parent.removeChild(instructionsElement);
		instructionsElement = null;
	}
	
	mouseIsPressed = true;
	downX = evt.clientX;
	mouseX = evt.clientX;
	downY = evt.clientY;
	mouseY = evt.clientY;
	timeDown = new Date();
}

// mouse Up, place ball
function mouseUp(evt){
	mouseIsPressed = false;
	mouseX = evt.clientX;
	mouseY = evt.clientY;
	
	var t = new Date();
	
	if((mouseX == downX && mouseY == downY) || t.getTime()-timeDown.getTime() <= 0){
		console.log("Adding ball without flick at " + mouseX + "," + mouseY);
		console.log("Time is " + t.getTime() + ", timeDown was " + timeDown.getTime());
		balls.add(new Ball(mouseX, mouseY, 0, 0));
	}else{
		// TODO currently this is the average speed of entire mouse movement
		var velX = (mouseX-downX)/(t.getTime()-timeDown.getTime())*10;
		var velY = (mouseY-downY)/(t.getTime()-timeDown.getTime())*10; // amplify throw force
		
		balls.add(new Ball(mouseX, mouseY, velX, velY));
		console.log("Adding a ball at " + mouseX + "," + mouseY + " at speed(" + velX + "," + velY + ").");
	}
}

function mouseEnter(evt){
	mouseX = evt.clientX;
	mouseY = evt.clientY;
}

function mouseMove(evt){
	// update mouse if there's an update in position and it's been a significant amount of time
	mouseX = evt.clientX;
	mouseY = evt.clientY;
}

function mouseLeave(evt){
	mouseIsPressed = false;
}
// End mouse functions

// Do the physics
function update(){

	// Iterate through balls and do physics
	var curNode = balls.getFrontNode();
	while(curNode != null){
		var ball = curNode.data;
		ball.vely -= GRAVITY;
		ball.centerY += ball.vely;
		ball.centerX += ball.velx;
		
		// collisions Y
		if(ball.centerY >= canvas.height-ball.size){ // collision with floor
			ball.centerY = canvas.height-ball.size;
			ball.vely = -(ball.vely);
		}else if(ball.centerY <= ball.size){ //collision with ceiling
			ball.centerY = ball.size;
			ball.vely = -(ball.vely);
		}
		
		// collisions X
		if(ball.centerX <= ball.size){ //collision with left wall
			ball.centerX = ball.size;
			ball.velx = -(ball.velx);
		}else if(ball.centerX >= canvas.width-ball.size){ //collision with right wall
			ball.centerX = canvas.width-ball.size;
			ball.velx = -(ball.velx);
		}
		
		// decay speed
		ball.velx *= DECAY;
		ball.vely *= DECAY;
		
		// Check for and do elastic collision with all other balls
		var otherNode = balls.getFrontNode();
		var newVels;
		while(otherNode != null){
			// skip checking against self
			if(otherNode == curNode){
				otherNode = otherNode.next;
				continue;
			}
			var other = otherNode.data;
			if(ball.touching(other)){
				newVels = collide(ball, other);
				console.log("Ball velocity (" + ball.velx + "," + ball.vely + ") -> (" + newVels[0] + "," + newVels[1] + ")");
				ball.velx = newVels[0];
				ball.vely = newVels[1];
				
				newVels = collide(other, ball);
				other.velx = newVels[0];
				other.vely = newVels[1];
			}
			otherNode = otherNode.next;
		}
		
		curNode = curNode.next;
	}

	// TODO this should only be set to true when we change something
	// Although, we pretty much always change something (unless there's nothing to draw anyway), so possibly remove this.
	drawNeeded = true;
}

// collide ball 1 with ball 2 and return the new velocities for ball 1
function collide(b1, b2){
	var newVelX, newVelY;
	
	// movement angles
	var theta1 = Math.atan(b1.velx/b1.vely);
	var theta2 = Math.atan(b2.velx/b2.vely);
	// contact angle
	var phi = Math.atan((b1.centerX-b2.centerX)/(b1.centerY-b2.centerY));
	
	b1Vel = Math.sqrt(b1.velx*b1.velx + b1.vely*b1.vely);
	b2Vel = Math.sqrt(b2.velx*b2.velx + b2.vely*b2.vely);
	
	// TODO calculating some things twice
	newVelX = ((b1.size-b2.size)*b1Vel*Math.cos(theta1-phi)+2*b2.size*b2Vel*Math.cos(theta2-phi)*Math.cos(phi))/(b1.size+b2.size);
	newVelX += b1Vel*Math.sin(theta1-phi)*Math.cos(phi + Math.PI/2);
	
	newVelY = ((b1.size-b2.size)*b1Vel*Math.cos(theta1-phi)+2*b2.size*b2Vel*Math.cos(theta2-phi)*Math.sin(phi))/(b1.size+b2.size);
	newVelY += b1Vel*Math.sin(theta1-phi)*Math.sin(phi + Math.PI/2);
	
	return [newVelX, newVelY];
}

// Clear and draw everything
function draw(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	// Draw all balls
	var curNode = balls.getFrontNode();
	while(curNode != null){
		var ball = curNode.data;
		ctx.beginPath();
		ctx.arc(ball.centerX, ball.centerY, ball.size/2, 0, 2 * Math.PI);
		ctx.fillStyle = ball.color;
		ctx.fill();
		ctx.stroke();
		curNode = curNode.next;
	}
	ctx.restore();
}