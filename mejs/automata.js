/**
 * Graph drawing for drawing state transition diagrams in finite automata
 *
 */
 
//TODO these will be full screen (or at least most of the screen, not defined)
var WIDTH = 800, HEIGHT = 600;
var ELE_OFFSET = 100, ELE_RAD = 30, ELE_DIST = 100;

// Graphics elements
var canvas, ctx;

var FONT_SIZE = 10;

// Tracked elements
var regexElement;

var FA;

function main(){
	init();
}

// Initialize the screen
function init() {
	canvas = document.createElement("canvas");
	canvas.setAttribute("id", "canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	ctx = canvas.getContext("2d");
	document.getElementById("diagramWrapper").appendChild(canvas);
	
	regexElement = document.getElementById("regex");
	
	ctx.font = FONT_SIZE+"px Arial";
	
	document.getElementById("drawButton").addEventListener("click", drawDiagram);
}

function readRegex(){
	
	FA = new FiniteAutomaton();
	FA.buildFromRegex(regexElement.value);
}

function drawDiagram(){
	
	readRegex();
	
	var nElements = FA.numElements();
	var states = FA.getStates();
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	ctx.save();
	
	ctx.textAlign = "center";
	
	// draw elements
	for(var i = 0; i < nElements; i++){
		ctx.beginPath();
		var x = ELE_OFFSET+ELE_DIST*i;
		var y = ELE_OFFSET;
		
		ctx.arc(x, y, ELE_RAD, 0, 2*Math.PI);
		ctx.stroke();
		
		ctx.beginPath();
		// draw inner circle if it's a final state
		if(FA.getFinalStates().indexOf(i) > -1){
			ctx.arc(x, y, ELE_RAD-5, 0, 2*Math.PI);
		}
		ctx.stroke();
		
		ctx.fillText("q" + i, x, y);
		
	}
	
	// draw connections
	for(var i = 0; i < states.length; i++){
		
		paths = states[i].getTransitions();
		
		for(var p = 0; p < paths.length; p++){
			ctx.beginPath();
			
			if(Math.abs(i-paths[p][1]) <= 1){ // if states are side by side
				var xS, xE, xT, y;
				
				if(i < paths[p][1]){
					// right arrow
					xS = ELE_OFFSET + ELE_DIST*i + ELE_RAD;
					xE = ELE_OFFSET + ELE_DIST*(i+1) - ELE_RAD;
					xT = (xS+xE)/2;
					y = ELE_OFFSET;
					
					ctx.moveTo(xS, y);
					ctx.lineTo(xE, y);
					
					// draw right arrow
					ctx.moveTo(xT+2, y);
					ctx.lineTo(xT-3, y - 5);
					ctx.moveTo(xT+2, y);
					ctx.lineTo(xT-3, y + 5);
				}else{
					// left arrow
					xS = ELE_OFFSET + ELE_DIST*i + ELE_RAD;
					xE = ELE_OFFSET + ELE_DIST*i+1 - ELE_RAD;
					xT = (xS+xE)/2;
					y = ELE_OFFSET;
					
					ctx.moveTo(xS, y);
					ctx.lineTo(xE, y);
					
					// draw left arrow
					ctx.moveTo(xT-2, y + offsetY);
					ctx.lineTo(xT+3, y + offsetY - 5);
					ctx.moveTo(xT-2, y + offsetY);
					ctx.lineTo(xT+3, y + offsetY + 5);
				}
				
				// draw character
				ctx.fillText(paths[p][0], xT, y-7);
				
			}else{ // if states are distant and need an arch arrow
				// x is the middle of the 2 pos's
				var x = (ELE_OFFSET+ELE_DIST*i + ELE_OFFSET+ELE_DIST*paths[p][1])/2;
				var y, offsetY;
				
				if(i > paths[p][1]){
					y = ELE_OFFSET + ELE_RAD;
					offsetY = ELE_RAD;

					ctx.ellipse(x, y, ELE_DIST*(Math.abs(paths[p][1]-i))/2, ELE_RAD, 0, 0, Math.PI);
					ctx.fillText(paths[p][0], x, y+offsetY+2+FONT_SIZE);
				}else{
					y = ELE_OFFSET - ELE_RAD;
					offsetY = - ELE_RAD;
					
					ctx.ellipse(x, y, ELE_DIST*(Math.abs(paths[p][1]-i))/2, ELE_RAD, 0, Math.PI, Math.PI*2);
					ctx.fillText(paths[p][0], x, y+offsetY-7);
				}
				
				// draw arrows
				if(i < paths[p][1]) { // draw right arrow
					ctx.moveTo(x+2, y + offsetY);
					ctx.lineTo(x-3, y + offsetY - 5);
					ctx.moveTo(x+2, y + offsetY);
					ctx.lineTo(x-3, y + offsetY + 5);
				}else{ // draw left arrow
					ctx.moveTo(x-2, y + offsetY);
					ctx.lineTo(x+3, y + offsetY - 5);
					ctx.moveTo(x-2, y + offsetY);
					ctx.lineTo(x+3, y + offsetY + 5);
				}
			}
			
			ctx.stroke();
		}
	}
	
	console.log("did a thing");
	
	ctx.restore();
}