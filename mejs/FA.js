// Finite Automaton object
function FiniteAutomaton() {
	this._nElements = 1;
	this._states = [];
	this._start = new State();
	this._end = this._start;
	
	// create the final states array and add the first, only, state
	this._finalStates = [];
	this._finalStates.push(0);
	
	this._states.push(this._start);
	
	this._alphabet = new RegExp("[a-zA-Z0-9-_]");
}
FiniteAutomaton.prototype = {
	constructor: FiniteAutomaton,
	
	// get the number of elements in the FA
	numElements: function(){
		return this._nElements;
	},
	
	// get the list of states
	getStates: function(){
		return this._states;
	},
	
	// get the list of final states
	getFinalStates: function(){
		return this._finalStates;
	},
	
	buildFromRegex: function(regex){
		for(var i = 0; i < regex.length; i++){
			// if the input it a character in the alphabet
			if(this._alphabet.test(regex[i])){
				// add a new state transition from the end state
				var newState = new State();
				this._end.addTransition(regex[i], this._states.length);
				this._end = newState;
				this._states.push(newState);
				this._nElements++;
				// how to change this in the general case? Maybe pass in states instead of number references
				this._finalStates[0] = this._states.length-1;
			}
		}
	},
}

// state (node) object
function State() {
	this._transitions = [];
}
State.prototype = {
	constructor: State,
	
	getTransitions: function(){
		return this._transitions;
	},
	
	addTransition: function(character, target){
		this._transitions.push([character, target]);
	},
}