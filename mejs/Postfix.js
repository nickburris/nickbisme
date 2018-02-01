/* TODO general features
 * Turn yvals into an array
 * 	Much better for drawing sticky crosshair
 *
 */

var LAST_PARSED_EQUATION = "";

function Token(t, num){
	if (t.isOperand){
		this.val = num;
	}
	this.type = t;
}

Token.prototype = {
	constructor: Token,
	
	// higherPrecedenceThan returns true if this Token is higher precedence than other
	higherPrecedenceThan: function(other){
		return this.type.prec > other.type.prec;
	},
	
	equalPrecedenceTo: function(other){
		return this.type.prec == other.type.prec && this.type.prec != undefined;
	},
	
	lowerPrecedenceThan: function(other){
		return this.type.prec < other.type.prec;
	},
	
	// isFunction returns whether this token is a function
	isFunction: function(){
		return this.type.isFunction == true;
	},
	
	// Returns whether the token is an operator
	isOperator: function(){
		return this.type.isOperator == true;
	},
	
	isOperand: function(){
		return this.type.isOperand == true;
	},
	
	isLeftAssociative: function(){
		return this.type.associativity === 0;
	},
	
	isRightAssociative: function(){
		return this.type.associativity === 1;
	},
	
	requiredOperands: function(){
		if(this.type.reqOps == undefined){
			throw new Error("Internal: Operation does not have indicated number of operands");
		}else{
			return this.type.reqOps;
		}
	},
}

// Static token function evaluation
function evaluateByToken(operator, ops){
	switch(operator.type){
		case Token.TYPE.ADD:
			return ops[1] + ops[0];
		case Token.TYPE.SUB:
			return ops[1] - ops[0];
		case Token.TYPE.MULT:
			return ops[1] * ops[0];
		case Token.TYPE.DIV:
			return ops[1] / ops[0];
		case Token.TYPE.EXPONENT:
			return Math.pow(ops[1], ops[0]);
		case Token.TYPE.SIN:
			return Math.sin(ops[0]);
		case Token.TYPE.COS:
			return Math.cos(ops[0]);
		case Token.TYPE.TAN:
			return Math.tan(ops[0]);
		case Token.TYPE.LOG:
			return Math.log10(ops[0]);
		case Token.TYPE.LN:
			return Math.log(ops[0]);
		default:
			// No known operation found to evaluate
			throw new Error("Internal: Did not know how to evaluate an operator");
	}
	
}

// Static token TYPE enum
Token.TYPE = {
	NUMBER: {isOperand: true},
	VARIABLE: {isOperand: true},
	PI: {isOperand: true, constValue: Math.PI},
	ADD: {prec: 0, isOperator: true, associativity: 0, reqOps: 2},
	SUB: {prec: 0, isOperator: true, associativity: 0, reqOps: 2},
	SIN: {prec: 1, isFunction: true, reqOps: 1},
	COS: {prec: 1, isFunction: true, reqOps: 1},
	TAN: {prec: 1, isFunction: true, reqOps: 1},
	LOG: {prec: 1, isFunction: true, reqOps: 1},
	LN: {prec: 1, isFunction: true, reqOps: 1},
	DIV: {prec: 2, isOperator: true, associativity: 0, reqOps: 2},
	MULT: {prec: 2, isOperator: true, associativity: 0, reqOps: 2},
	EXPONENT: {prec: 3, isOperator: true, associativity: 1, reqOps: 2},
	BRACE_LEFT: {prec: 10},
	BRACE_RIGHT: {prec: 10}
};

// Initialize and fill the token type map
var typeMap = new Map();
typeMap.set("*", Token.TYPE.MULT);
typeMap.set("/", Token.TYPE.DIV);
typeMap.set("-", Token.TYPE.SUB);
typeMap.set("+", Token.TYPE.ADD);
typeMap.set("^", Token.TYPE.EXPONENT);
typeMap.set("(", Token.TYPE.BRACE_LEFT);
typeMap.set(")", Token.TYPE.BRACE_RIGHT);
typeMap.set("x", Token.TYPE.VARIABLE);
typeMap.set("sin", Token.TYPE.SIN);
typeMap.set("cos", Token.TYPE.COS);
typeMap.set("tan", Token.TYPE.TAN);
typeMap.set("log", Token.TYPE.LOG);
typeMap.set("ln", Token.TYPE.LN);
typeMap.set("pi", Token.TYPE.PI);

function evaluateYValuesList(equation, startX, delta, maxX, devmode = false){
	var yvals;
	
	try {
		if(equation != ""){
			var date = new Date();
			var startMillis = date.getTime();
			yvals = new Array(Math.round((maxX-startX)/delta));
			
			var postfixEq = stringToPostfix(equation);

			// TODO this seems to be the slow part
			for(var i = 0, d = startX; d < maxX; d += delta, i++){
				yvals[i] = evaluate(postfixEq, d);
			}

			if(i != yvals.length){
				throw new Error("Internal: Not calculating proper amount of values.");
			}
			date = new Date();
			if(devmode) console.log("[" + equation + "]: " + "Successfully calculated Y values in " + (date.getTime()-startMillis) + "ms");
		}
	} catch(e) {
		throw e;
	}
	
	return yvals;
}

// For testing, returns a string of y values
function yValsList(equation, startX, delta, n){	
	var vals = "";
	
	curNode = yvals.getFrontNode();
	while(curNode != null){
		vals = vals + curNode.data + ", ";
		curNode = curNode.next;
	}
	
	return vals;
}

// For testing, evaluates a single value for an input equation
function evaluationTest(equation, x){
	postfixEq = stringToPostfix(equation);
	return evaluate(postfixEq, x);
}

// Evaluate the already postfix'd equation after inserting the x value
function evaluate(postfix, x){
	try {
		// Set the value of all instances of x in the equation
		curNode = postfix.getFrontNode();
		while(curNode != null){
			if(curNode.data.type == Token.TYPE.VARIABLE){
				curNode.data.val = x;
			}
			curNode = curNode.next;
		}
		return evaluatePostfix(postfix);
	} catch(e) {
		throw new Error(e.message + " | Parsed equation was: " + LAST_PARSED_EQUATION);
	}
}

function evaluatePostfix(postfix){
	var stack = new DoublyLinkedList();
	
	var curNode = postfix.getFrontNode();
	while(curNode != null){
		curToken = curNode.data;
		
		if(curToken.isOperand()){
			stack.pushStack(curToken.val);
		}else{
			// The token is an operator or function
			try {
				var reqOps = curToken.requiredOperands();
				if(stack.size() < reqOps){
					throw new Error("Bad equation, not enough function operands!");
				}else{
					var opsArray = new Array(reqOps);
					for(var i = 0; i < reqOps; i++){
						opsArray[i] = stack.popStack();
					}
					stack.pushStack(evaluateByToken(curToken, opsArray));
				}
			} catch(e) {
				throw e;
			}
		}
		curNode = curNode.next;
	}
	
	if(stack.size() != 1){
		throw new Error("Bad equation, too many operands!");
	}
	
	return stack.popStack();
}

// string --> infix
function stringToInfix(equationStr){
	var infix = new DoublyLinkedList();
	
	equationStr = equationStr.toLowerCase();
	
	// Add parentheses around the whole equation
	equationStr = "(" + equationStr + ")";
	
	// Add parentheses around x variables
	equationStr = equationStr.replace(/x/g, "(x)");

	// Remove whitespace from the formula
	equationStr = equationStr.replace(/\s+/g, '');
	
	// Make negations great again
	equationStr = equationStr.replace(/\(\-/g, "((-1)*");

	// Add implied multiplication between a number and a function
	equationStr = equationStr.replace(/([0-9])([a-z])/g, "$1*$2");
	
	// Add implied (parentheses) multiplication
	equationStr = equationStr.replace(/\)\(/g, ")*(").replace(/([0-9])\(/g, "$1*(").replace(/\)([a-z])/g, ")*$1");
	
	LAST_PARSED_EQUATION = equationStr;
	
	for(var i = 0; i < equationStr.length; i++){
		// num will contain the value of a number if one is encountered
		var num = 0.0;
		
		// Try matching to a token, then try processing a number if it's not a found token
		// Only process a '-' as a token if it is meant as subtraction, not negation
		// A '-' is only subtraction when it is preceded by a number or ')'
		var nextTokenType = undefined;
		var prevch;
		if(i > 0){
			prevch = equationStr.charAt(i-1);
		}
		var ch = equationStr.charAt(i);
		if(ch != '-' || (i > 0 && ch == '-' && ((prevch >= '0' && prevch <= '9') || prevch == ')'))){
			// First try to match a function
			var curChar = ch;
			var endIndex = i;
			while(curChar >= 'a' && curChar <= 'z' && endIndex < equationStr.length){
				endIndex++;
				if(endIndex < equationStr.length){
					curChar = equationStr.charAt(endIndex);
				}
			}
			if(endIndex != i){
				nextTokenType = typeMap.get(equationStr.substring(i, endIndex));
				
				if(nextTokenType == undefined){
					throw new Error("Could not find function: " + equationStr.substring(i, endIndex));
				}else{
					// Set the num in the case of a constant (ex. pi)
					num = nextTokenType.constValue;
				}
				
				// Update index
				i = endIndex-1;
			}
			
			if(nextTokenType == undefined){
				nextTokenType = typeMap.get(equationStr.charAt(i));
			}
		}
		
		if(nextTokenType == undefined){
			var negateNum = false;
			
			var nStart = i;
			
			if(equationStr.charAt(i) == '-'){
				negateNum = true;
				nStart++;
			}
			
			var nEnd = nStart;
			
			var cur = equationStr.charAt(nEnd);
			var decimalEncountered = false;
			
			while((cur >= '0' && cur <= '9') || (cur == '.')){
				if(cur == '.'){
					// Throw an error if we've already seen a decimal
					if(decimalEncountered){
						throw new Error("Bad formula, too many decimals in the number at index " + nStart);
					}else{
						decimalEncountered = true;
					}
				}
				
				nEnd++;
				
				// Consider a number at the end of the formula string
				if(nEnd >= equationStr.length){
					break;
				}
				
				cur = equationStr.charAt(nEnd);
			}
			
			// If the start and end indices are still the same, no number was found
			// We therefore can't identify the token
			if(nStart == nEnd){
				throw new Error("Unknown token at index " + nStart + " in " + equationStr);
			}
			
			try{
				num = parseFloat(equationStr.substring(nStart, nEnd));
			}catch(err){
				throw new Error("Number could not be parsed: " + err.message);
			}
			
			// Successfully parsed number
			nextTokenType = Token.TYPE.NUMBER;
			
			// Set the index to the end of the number parsed
			i = nEnd-1;
			
			if(negateNum){
				num = -num;
			}
		}
		
		infix.add(new Token(nextTokenType, num));
	}
	
	return infix;
}

// infix --> postfix
function infixToPostfix(infix){
	var postfix = new DoublyLinkedList();
	
	stack = new DoublyLinkedList();
	
	var curNode = infix.getFrontNode();
	while(curNode != null){
		curToken = curNode.data;
		
		if(curToken.isOperand()){
			postfix.add(curToken);
		}else if(curToken.isFunction()){
			stack.pushStack(curToken);
		}else if(curToken.isOperator()){
			while(!stack.empty()){
				if(stack.peek().isOperator()){
					if((curToken.isLeftAssociative() && !curToken.higherPrecedenceThan(stack.peek()))
					   || (curToken.isRightAssociative() && curToken.lowerPrecedenceThan(stack.peek()))){
						postfix.add(stack.popStack());   
					}else{
						break;
					}
				}else{
					break;
				}
			}
			stack.pushStack(curToken);
		}else if(curToken.type == Token.TYPE.BRACE_LEFT){
			stack.pushStack(curToken);
		}else if(curToken.type == Token.TYPE.BRACE_RIGHT){
			try{
				while(stack.peek().type != Token.TYPE.BRACE_LEFT){
					postfix.add(stack.popStack())
				}
				stack.popStack(); // Pop the left brace
				
				if(!stack.empty()){
					if(stack.peek().isFunction()){
						postfix.add(stack.popStack());
					}
				}
			}catch(err){
				throw new Error("Mismatched parentheses");
			}
		}
		curNode = curNode.next;
	}
	
	// End of infix, pop all of the stack, throw error if any left braces remain
	while(!stack.empty()){
		var popped = stack.popStack();
		if(popped.type == Token.TYPE.BRACE_LEFT){
			throw new Error("Mismatched parentheses");
		}
		postfix.add(popped);
	}
	
	return postfix;
}

// infix string --> postfix
function stringToPostfix(equation){
	try {
		return infixToPostfix(stringToInfix(equation));
	}catch(err){
		throw err;
	}
}

