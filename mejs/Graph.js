/* TODO general features
 * Don't need to recalculate all Y values on a pan action
 * crosshairs at cursor
 *
 * TODO known bugs
 * When graphs go to infinity (tanx) things get weird when you zoom out
 *  This seems to be a tough thing to fix, even Google's grapher does this sometimes
 *
 */

// The Graph.js script handles the drawing of the graphs

//TODO these will be full screen (or at least most of the screen, not defined)
var WIDTH = 800, HEIGHT = 600;

// Graphics elements
var canvas, ctx;
var crosshairs_canvas, crosshairs_ctx;
var panning = false;
var panCoords = {x: -1, y: -1};
var MAX_DRAWABLE = 1073741823;

var FONT_SIZE = 10;

var DEVMODE = false;

// Consider as "pixels per unit"
var scale = 20.0;
var offsetX = WIDTH/2;
var offsetY = HEIGHT/2;

// Tracked elements
var graphElement, equationElement;

// Graph elements
var yvals;

function main() {
	init();
}

function init() {

	crosshairs_canvas = document.createElement("canvas");
	crosshairs_canvas.setAttribute("id", "crosshairs");
	crosshairs_canvas.width = WIDTH;
	crosshairs_canvas.height = HEIGHT;
	crosshairs_ctx = crosshairs_canvas.getContext("2d");
	document.getElementById("graphWrapper").appendChild(crosshairs_canvas);
	
	canvas = document.createElement("canvas");
	canvas.setAttribute("id", "graph");
	canvas.setAttribute("class", "grabbable");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	ctx = canvas.getContext("2d");
	document.getElementById("graphWrapper").appendChild(canvas);

	// Store some of the document's elements for later access
	graphElement = document.getElementById("graph");
	crosshairsElement = document.getElementById("crosshairs");
	equationElement = document.getElementById("formulaBox");
	coordsElement = document.getElementById("mouseCoords");
	devmodeElement = document.getElementById("devmodeCheck");

	ctx.font = FONT_SIZE+"px Arial";
	
	document.getElementById("drawButton").addEventListener("click", drawEquations);
	
	devmodeElement.addEventListener("click", function devmodeToggle(evt){
		console.log("Logging toggled");
		DEVMODE = devmodeElement.checked;
	});
	
	graphElement.addEventListener("mousedown", mouseDown);
	graphElement.addEventListener("mouseup", mouseUp);
	graphElement.addEventListener("mouseenter", mouseEnter);
	graphElement.addEventListener("mousemove", mouseMove);
	graphElement.addEventListener("mouseleave", mouseLeave);
	graphElement.addEventListener("wheel", zoomGraph);
	
	equationElement.addEventListener("keydown", function keyDown(evt){
		if(evt.code == "Enter"){
			drawEquations();
		}
	});

	clearAndDrawAxis();
}

// Mouse handling functions for the graph
function mouseDown(evt){
	panCoords.x = evt.clientX;
	panCoords.y = evt.clientY;
	panning = true;
}

function mouseUp(evt){
	panCoords.x = -1;
	panCoords.y = -1;
	panning = false;
}

function mouseEnter(evt){
	
	updateMouseCoords(evt);
}

function mouseMove(evt){
	if(panning){
		var deltax = evt.clientX - panCoords.x;
		var deltay = evt.clientY - panCoords.y;
		
		offsetX += deltax;
		offsetY += deltay;
		
		panCoords.x = evt.clientX;
		panCoords.y = evt.clientY;
		
		drawEquations();
	}
	
	updateMouseCoords(evt);
}

function mouseLeave(evt){
	panCoords.x = -1;
	panCoords.y = -1;
	panning = false;
	
	resetMouseCoords();
}
// End mouse functions

function drawEquations(){
	equationInput = equationElement.value.trim();
	if(equationInput != ""){
		if(DEVMODE) console.log("-----------------------------------------");
		var equationInput;
		
		try{
			var date = new Date();
			var startMillis = date.getTime();

			var equations = equationInput.split(",");
			
			// Draw the axis
			clearAndDrawAxis();
			
			// Draw each equation
			for(var i = 0; i < equations.length; i++){
				// Trim the leading and trailing whitespace
				// This is for tidy logging, as Postfix already removes whitespace.
				equations[i] = equations[i].trim();
				
				// Draw the equation. This includes processing.
				if(DEVMODE) console.log("Now processing and drawing " + equations[i]);
				draw(equations[i]);
			}
			
			date = new Date();
			if(DEVMODE) console.log("Processing and drawing all equations took " + (date.getTime() - startMillis) + "ms")
		}catch(err){
			if(DEVMODE) console.log("Caught on input: " + equationInput);
			throw err;
		}
		
		if(DEVMODE) console.log("-----------------------------------------");
	}else{
		// Empty equation, but still redraw the axis
		clearAndDrawAxis();
	}
}

function draw(eq) {
	ctx.save();
	var equation;

	try{
		equation = eq;
		// Get a Y value for each pixel
		yvals = evaluateYValuesList(equation, -offsetX/scale, 1/scale, (canvas.width-offsetX)/scale, DEVMODE);
		if(DEVMODE) console.log("[" + equation + "]: " + yvals.length + " Y values were calculated.");				

		// Keep track of the delay for just drawing
		var date = new Date();
		var startMillis = date.getTime();

		// Log how many Y values are drawn
		var yValsDrawn = 0;

		ctx.beginPath();
		
		var previousDrawY = null;
		var drawY = null;
		var nextDrawY = null;
		var startedDrawing = false;
		for(var x = 0; x < yvals.length; x++){
			previousDrawY = drawY;
			drawY = nextDrawY;
			nextDrawY = -yvals[x]*scale+offsetY;
			
			// TODO handle a condition where nextDrawY == Infinity
			// The draws are fixed by maxing them at 2^30-1 but get some weird lines with 1/x for example
			if(drawY != null && ((previousDrawY > 0 && previousDrawY < canvas.height) || (drawY > 0 && drawY < canvas.height))){
				if(drawY > canvas.height){
					ctx.lineTo(x, Math.min(drawY, MAX_DRAWABLE));
				}else if(drawY < 0){
					ctx.lineTo(x, Math.max(drawY, -MAX_DRAWABLE));
				}else{
					ctx.lineTo(x, drawY);
				}
				yValsDrawn++;
			} else if (drawY != null && (nextDrawY > 0 && nextDrawY < canvas.height)){
				if(drawY > canvas.height){
					ctx.moveTo(x, Math.min(drawY, MAX_DRAWABLE));
				}else if(drawY < 0){
					ctx.moveTo(x, Math.max(drawY, -MAX_DRAWABLE));
				}else{
					ctx.moveTo(x, drawY);
				}
			}
		}
		
		ctx.stroke();

		date = new Date();
		if(DEVMODE) console.log("[" + equation + "]: " + yValsDrawn + " Y values were drawn.");
		if(DEVMODE) console.log("[" + equation + "]: " + "Drawing post-processed data to screen took " + (date.getTime()-startMillis) + "ms");
	}catch(err){
		// TODO tell the user it's a bad formula
		console.log("Caught on equation: " + equation);
		throw err;
	}finally{
		ctx.restore();
	}
}

// TODO this function is very messy
// 	Clean up the logic and write better comments.
function clearAndDrawAxis(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var deltaX = parseFloat(((canvas.width/scale)/20).toPrecision(1));
	var maxX = ((canvas.width-offsetX)/(deltaX*scale))*10;
	var minX = -((offsetX)/(deltaX*scale))*10;
	var deltaY = parseFloat(((canvas.height/scale)/20).toPrecision(1));
	var maxY = ((canvas.height-offsetY)/(deltaY*scale))*10;
	var minY = -((offsetY)/(deltaY*scale))*10;
	
	// Decides whether the axes should be stopped at the edges, and whether to swap
	// which sides the numbers are on.
	var largestYCoordWidth = ctx.measureText(Math.max(Math.abs(maxX*deltaX),Math.abs(minX*deltaX)).toFixed(2)).width +8;
	var largestXCoordHeight = FONT_SIZE +3;
	var swapXNums = false, swapYNums = false;
	var drawYAxis = Math.min(Math.max(0, offsetX), canvas.width);
	if(drawYAxis + largestYCoordWidth > canvas.width){
		swapYNums = true;
	}
	var drawXAxis = Math.min(Math.max(0, offsetY), canvas.height);
	if(drawXAxis + largestXCoordHeight > canvas.height){
		swapXNums = true;
	}

	ctx.save();
	// Draw axis
	ctx.beginPath();
	ctx.moveTo(drawYAxis, 0);
	ctx.lineTo(drawYAxis, canvas.height);
	ctx.moveTo(0, drawXAxis);
	ctx.lineTo(canvas.width, drawXAxis);
	ctx.stroke();
	
	// Draw lines and numbers
	ctx.beginPath();
	// Draw a circle at the origin
	ctx.arc(offsetX,offsetY,5,0,2*Math.PI);
	// Place numbers on x and y axes
	// Start from 0 and work outward until the edge
	ctx.textAlign = "center";
	for(var x = 0; x < maxX || -x > minX; x+= 1){
		if(x != 0){
			var drawXPos = x*deltaX*scale+offsetX;
			var drawXPosNegative = x*(-deltaX)*scale+offsetX;
			ctx.moveTo(drawXPos, drawXAxis-5);
			ctx.lineTo(drawXPos, drawXAxis+5);
			if(swapXNums){
				ctx.fillText((x*deltaX).toFixed(2), drawXPos, drawXAxis-8);
			}else{
				ctx.fillText((x*deltaX).toFixed(2), drawXPos, drawXAxis+FONT_SIZE+3);
			}

			ctx.moveTo(drawXPosNegative, drawXAxis-5);
			ctx.lineTo(drawXPosNegative, drawXAxis+5);
			if(swapXNums){
				ctx.fillText((x*(-deltaX)).toFixed(2), drawXPosNegative, drawXAxis-8);
			}else{
				ctx.fillText((x*(-deltaX)).toFixed(2), drawXPosNegative, drawXAxis+FONT_SIZE+3);
			}
		}
	}
	if(swapYNums){
		ctx.textAlign = "right";
	}else{
		ctx.textAlign = "left";
	}
	for(var y = 0; y < maxY || -y > minY; y+= 1){
		if(y != 0){
			var drawYPos = y*(-deltaY)*scale+offsetY;
			var drawYPosNegative = y*deltaY*scale+offsetY;
			ctx.moveTo(drawYAxis-5, drawYPos);
			ctx.lineTo(drawYAxis+5, drawYPos);
			if(swapYNums){
				ctx.fillText((y*deltaY).toFixed(2), drawYAxis-8, drawYPos);
			}else{
				ctx.fillText((y*deltaY).toFixed(2), drawYAxis+8, drawYPos);
			}

			ctx.moveTo(drawYAxis-5, drawYPosNegative);
			ctx.lineTo(drawYAxis+5, drawYPosNegative);
			if(swapYNums){
				ctx.fillText((y*(-deltaY)).toFixed(2), drawYAxis-8, drawYPosNegative);
			}else{
				ctx.fillText((y*(-deltaY)).toFixed(2), drawYAxis+8, drawYPosNegative);
			}
		}
	}
	ctx.stroke();
	
	ctx.restore();
}

function zoomGraph(evt){
	if(evt.deltaY < 0){
		// Zoom in
		scale*=1.1;
	}else{
		// Zoom out
		scale/=1.1;
	}

	// TODO probably shouldn't redraw (and recalculate) everything
	if(equationElement.value == ""){
		// No equation input, just draw the axis
		clearAndDrawAxis();
	}else{
		drawEquations();
	}

	updateMouseCoords(evt);
}

function updateMouseCoords(evt){
	// Get the mouse position relative to the canvas
	var rect = canvas.getBoundingClientRect();
	var mouseX = evt.clientX - rect.left;
	
	// Draw crosshairs if a y value exists
	crosshairs_ctx.clearRect(0, 0, crosshairs_canvas.width, crosshairs_canvas.height);
	if(yvals != null && mouseX < yvals.length){
		var crosshairsX = mouseX;
		var crosshairsY = -yvals[mouseX]*scale+offsetY;
		// Only if the value is on the screen
		if(crosshairsY > 0 && crosshairsY < crosshairs_canvas.height){
			crosshairs_ctx.save();
			crosshairs_ctx.strokeStyle = "lightgray";
			crosshairs_ctx.beginPath();
			
			crosshairs_ctx.moveTo(0, crosshairsY);
			crosshairs_ctx.lineTo(crosshairs_canvas.width, crosshairsY);
			crosshairs_ctx.moveTo(crosshairsX, 0);
			crosshairs_ctx.lineTo(crosshairsX, crosshairs_canvas.height);
			
			crosshairs_ctx.stroke();
			crosshairs_ctx.restore();
			
			coordsElement.innerHTML = (((crosshairsX-offsetX)/scale).toFixed(2) + "," + (-(crosshairsY-offsetY)/scale).toFixed(2));
		}else{
			coordsElement.innerHTML = "-,-";
		}
	}else{
		coordsElement.innerHTML = "-,-";
	}
}

function resetMouseCoords(){
	coordsElement.innerHTML = "-,-";
	crosshairs_ctx.clearRect(0, 0, crosshairs_canvas.width, crosshairs_canvas.height);
}
