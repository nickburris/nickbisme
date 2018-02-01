//Constants
var WIDTH = 810, HEIGHT = 600;
var BLOCKSIZE = 15;
var Space = 32, LeftArrow = 37, UpArrow = 38, RightArrow = 39, DownArrow = 40;

//Game state
var PLAY = 1, GAMEOVER = 2;
var state;

//Game elements
var canvas, ctx, keystate;
var map; //a 2D array of map tiles
var mapWidth = WIDTH / BLOCKSIZE, mapHeight = HEIGHT / BLOCKSIZE;
var ticks; // used to slow snake movement
var snakeList; //Linked list for snake body
var foodCount;
var toUpdate; //Linked list of tiles to update

//Snake object
var snake = {
	_length: 1,
	_grow: 3,
	_nextDirection: 0, //should be modified externally
	_direction: 0, //0: left, 1: up, 2: right, 3: down
	_x: mapWidth/2, _y: mapHeight/2,
	//Move function
	move: function() {
		//Update if there's a new direction to move in
		this._direction = this._nextDirection;
	
		//make old map pos a body piece
		map[this._x][this._y] = 2;
		toUpdate.add([this._x, this._y]);
	
		//move
		if(this._direction == 0){
			this._x = Math.max(0, this._x-1);
		}else if(this._direction == 1){
			this._y = Math.max(0, this._y-1);
		}else if(this._direction == 2){
			this._x = Math.min(mapWidth-1, this._x+1);
		}else if(this._direction == 3){
			this._y = Math.min(mapHeight-1, this._y+1);
		}
		
		if(map[this._x][this._y] == 2){ //collision
			gameOver();
		}else{ //safe
			//first check food
			if(map[this._x][this._y] == 3){
				foodCount--;
				this._grow += 3;
			}
			
			map[this._x][this._y] = 1; //new map pos a head piece
			toUpdate.add([this._x, this._y]);
			snakeList.add([this._x, this._y]);
			if(this._grow > 0){
				this._grow--;
				this._length++;
			}else{
				//remove snake's tail piece from map and list
				var tail = snakeList.item(0);
				map[tail[0]][tail[1]] = 0;
				snakeList.remove(0);
				toUpdate.add([tail[0], tail[1]]);
			}
		}
	},
	
	init: function() {
		this._length = 1;
		this._grow = 3;
		this._nextDirection = 0;
		this._direction = 0;
		this._x = mapWidth/2;
		this._y = mapHeight/2;
	}
};

function main() {
	canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	ctx = canvas.getContext("2d");
	document.body.appendChild(canvas);
	
	ctx.font = "30px Arial";
	
	keystate = {};
	//Keyboard event listeners
	document.addEventListener("keydown", function(evt) {
		keystate[evt.keyCode] = true;
		evt.preventDefault(); //prevent arrow keys from default actions
	});
	document.addEventListener("keyup", function(evt){
		delete keystate[evt.keyCode];
		evt.preventDefault();
	});
	
	init();
	
	var loop = function(){
		update();
		draw();
		
		window.requestAnimationFrame(loop, canvas);
	};
	window.requestAnimationFrame(loop, canvas);
}

function init() {
	
	state = PLAY;
	
	ctx.clearRect(0, 0, canvas.width, canvas.height); //Clear the screen
	
	//Initialize variables
	ticks = 0;
	foodCount = 0;
	
	//Initialize snake
	snake.init();

	//Initialize linked lists
	snakeList = new DoublyLinkedList();
	snakeList.add([snake._x, snake._y]);
	toUpdate = new DoublyLinkedList();

	//Create 2D map array
	map = new Array(mapWidth);
	for(var i = 0; i < map.length; i++){
		map[i] = new Array(mapHeight);
	}
	
	//Initialize map
	for(var i = 0; i < map.length; i++){
		for(var j = 0; j < map[i].length; j++){
			map[i][j] = 0;
		}
	}
	
	//Draw blank map
	ctx.save();
	ctx.fillStyle = "rgb(240, 240, 240)"; //grey
	for(var i = 0; i < map.length; i++){
		for(var j = 0; j < map[i].length; j++){
			ctx.fillRect(i*BLOCKSIZE, j*BLOCKSIZE, BLOCKSIZE, BLOCKSIZE);
		}
	}
	ctx.restore();
	
	//Add a food to start
	var foodx = Math.floor(Math.random()*mapWidth), foody = Math.floor(Math.random()*mapHeight);
	map[foodx][foody] = 3;
	toUpdate.add([foodx, foody]);
	foodCount++;
}

function update() {
	if(state == PLAY){
		if(keystate[LeftArrow] && snake._direction != 2){ //left
			snake._nextDirection = 0;
		}else if(keystate[UpArrow] && snake._direction != 3){ //up
			snake._nextDirection = 1;
		}else if(keystate[RightArrow] && snake._direction != 0){ //right
			snake._nextDirection = 2;
		}else if(keystate[DownArrow] && snake._direction != 1){ //down
			snake._nextDirection = 3;
		}
	
		ticks++;
		
		//move snake every 8 frames
		if(ticks%8 == 0){
			snake.move();
		}
		
		//add food if none is present, or every 1000 frames (up to 3)
		if(foodCount == 0 || (ticks%1000 == 0 && foodCount < 3)){
			var foodx = Math.floor(Math.random()*mapWidth), foody = Math.floor(Math.random()*mapHeight);
			while(map[foodx][foody] != 0){ //loop until empty space found
				foodx = Math.floor(Math.random()*mapWidth);
				foody = Math.floor(Math.random()*mapHeight);
			}
			map[foodx][foody] = 3;
			toUpdate.add([foodx, foody]);
			foodCount++;
		}
	}else if(state == GAMEOVER){
		if(keystate[Space]){
			init();
		}
	}
}

function draw() {
	if(state == PLAY){
		ctx.save();
		
		while(toUpdate.size() > 0){
			var block = toUpdate.remove(0);
			var x = block[0], y = block[1];
			
			if(map[x][y] == 0){ //empty block
				ctx.fillStyle = "rgb(240, 240, 240)"; //grey
			}else if(map[x][y] == 1){ //snake head
				ctx.fillStyle = "rgb(100, 255, 225)"; //darker blue
			}else if(map[x][y] == 2){ //snake piece
				ctx.fillStyle = "rgb(100, 200, 225)"; //cute blue
			}else if(map[x][y] == 3){ //food
				ctx.fillStyle = "rgb(255, 100, 255)"; //pink
			}
			
			/*
			 * roundRect() is pretty but laggy
			 */
			//roundRect(ctx, i*BLOCKSIZE, j*BLOCKSIZE, BLOCKSIZE, BLOCKSIZE, 4, true, true);
			ctx.fillRect(x*BLOCKSIZE, y*BLOCKSIZE, BLOCKSIZE, BLOCKSIZE);
		}
		
		ctx.restore();
	}
}

function gameOver(){
	var bestScore = recordScore(snake._length);

	state = GAMEOVER;
	ctx.save();
	ctx.strokeStyle = "";
	ctx.fillStyle = "rgba(200, 200, 200, 0.50)";
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	ctx.fillStyle = "rgb(170, 170, 200)";
	ctx.textAlign = "center";
	ctx.shadowBlur = 1;
	ctx.shadowColor = "rgb(100, 100, 100)";
	ctx.fillText("Score: " + snake._length, WIDTH/2, HEIGHT/3);
	ctx.fillText("High score: " + bestScore, WIDTH/2, HEIGHT/3 + 40);
	ctx.font = "20px Arial";
	ctx.fillText("Space to continue", WIDTH/2, HEIGHT/3 + 80);
	ctx.restore();
}

//Records this score if it is a new high score, and returns the high score
function recordScore(score){
	if(getCookie("highscore") == ""){ //cookie does not exist
		setCookie("highscore", score, 1000);
		return score;
	}else{ //cookie exists
		var highScore = parseInt(getCookie("highscore"));
		if(highScore > score){ //did not beat previous score
			return highScore;
		}else{ //new high score
			setCookie("highscore", score, 1000); //record new high score 
			return score;
		}
	}
}
