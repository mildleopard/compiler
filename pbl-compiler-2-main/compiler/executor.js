// ==========================================
// AST Interpreter / Executor
// ==========================================

// signal class for control flow (return, break, continue)
class Signal {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

function executeAST(syntaxResult) {

    if (!syntaxResult.success) {
        return {
            success: false,
            output: null,
            consoleOutput: [],
            error: "Cannot execute — syntax analysis failed.",
            message: "Execution aborted"
        };
    }

    try {

        const logs = [];

        // ==========================================
        // Environment (scope stack)
        // ==========================================

        const envStack = [];

        function createScope() {
            envStack.push(new Map());
        }

        function destroyScope() {
            envStack.pop();
        }

        function setVariable(name, value) {
            envStack[envStack.length - 1].set(name, value);
        }

        function getVariable(name) {
            for (let i = envStack.length - 1; i >= 0; i--) {
                if (envStack[i].has(name)) {
                    return envStack[i].get(name);
                }
            }
            return undefined;
        }

        function updateVariable(name, value) {
            for (let i = envStack.length - 1; i >= 0; i--) {
                if (envStack[i].has(name)) {
                    envStack[i].set(name, value);
                    return;
                }
            }
            // if not found anywhere, set in current scope
            setVariable(name, value);
        }

        // ==========================================
        // Expression Evaluator
        // ==========================================

        function evaluateExpression(node) {
            if (!node) return undefined;

            switch (node.type) {

                case 'NumberLiteral':
                    return node.value;

                case 'StringLiteral':
                    return node.value;

                case 'BooleanLiteral':
                    return node.value;

                case 'NullLiteral':
                    return null;

                case 'Identifier':
                    return getVariable(node.name);

                case 'BinaryExpression': {
                    const left = evaluateExpression(node.left);
                    const right = evaluateExpression(node.right);
                    return applyBinaryOp(node.operator, left, right);
                }

                case 'UnaryExpression': {
                    const operand = evaluateExpression(node.operand);
                    if (node.operator === '!') return !operand;
                    if (node.operator === '-') return -operand;
                    return operand;
                }

                case 'ArrayExpression':
                    return node.elements.map(el => evaluateExpression(el));

                case 'CallExpression': {
                    const func = getVariable(node.callee);
                    if (!func || func.type !== 'function') {
                        throw new Error(`'${node.callee}' is not a function`);
                    }
                    const args = node.args.map(a => evaluateExpression(a));
                    createScope();
                    func.params.forEach((p, i) => {
                        setVariable(p, args[i] !== undefined ? args[i] : undefined);
                    });
                    let returnVal = undefined;
                    try {
                        for (const stmt of func.body) {
                            executeStatement(stmt);
                        }
                    } catch (sig) {
                        if (sig instanceof Signal && sig.type === 'return') {
                            returnVal = sig.value;
                        } else {
                            throw sig;
                        }
                    }
                    destroyScope();
                    return returnVal;
                }

                case 'MemberCallExpression':
                    return handleMemberCall(node);

                case 'MemberAccess': {
                    const obj = evaluateExpression(node.object);
                    if (node.property === 'length') {
                        if (typeof obj === 'string' || Array.isArray(obj)) {
                            return obj.length;
                        }
                    }
                    if (obj !== null && obj !== undefined) {
                        return obj[node.property];
                    }
                    return undefined;
                }

                case 'ArrayAccess': {
                    const arr = evaluateExpression(node.object);
                    const idx = evaluateExpression(node.index);
                    if (arr !== null && arr !== undefined) {
                        return arr[idx];
                    }
                    return undefined;
                }

                default:
                    throw new Error(`Unknown expression type: ${node.type}`);
            }
        }

        // ==========================================
        // Binary operator helper
        // ==========================================

        function applyBinaryOp(op, left, right) {
            switch (op) {
                case '+':
                    if (typeof left === 'string' || typeof right === 'string') {
                        return String(left) + String(right);
                    }
                    return left + right;
                case '-':  return left - right;
                case '*':  return left * right;
                case '/':  return left / right;
                case '%':  return left % right;
                case '==': return left == right;
                case '!=': return left != right;
                case '===': return left === right;
                case '!==': return left !== right;
                case '<':  return left < right;
                case '>':  return left > right;
                case '<=': return left <= right;
                case '>=': return left >= right;
                case '&&': return left && right;
                case '||': return left || right;
                default:
                    throw new Error(`Unknown operator: ${op}`);
            }
        }

        // ==========================================
        // Member call handler (console, Math, arrays)
        // ==========================================

        function handleMemberCall(node) {
            const args = node.args.map(a => evaluateExpression(a));

            // console.log
            if (node.object === 'console' && node.method === 'log') {
                logs.push(args);
                return undefined;
            }

            // Math methods
            if (node.object === 'Math') {
                switch (node.method) {
                    case 'floor':  return Math.floor(args[0]);
                    case 'ceil':   return Math.ceil(args[0]);
                    case 'round':  return Math.round(args[0]);
                    case 'abs':    return Math.abs(args[0]);
                    case 'max':    return Math.max(...args);
                    case 'min':    return Math.min(...args);
                    case 'random': return Math.random();
                    case 'sqrt':   return Math.sqrt(args[0]);
                    case 'pow':    return Math.pow(args[0], args[1]);
                    default:
                        throw new Error(`Math.${node.method} is not supported`);
                }
            }

            // array/string methods on variables
            const obj = getVariable(node.object);
            if (obj === undefined || obj === null) {
                throw new Error(`Cannot call method on ${node.object} (undefined/null)`);
            }

            if (Array.isArray(obj)) {
                switch (node.method) {
                    case 'push':
                        obj.push(...args);
                        return obj.length;
                    case 'pop':
                        return obj.pop();
                    case 'indexOf':
                        return obj.indexOf(args[0]);
                    case 'join':
                        return obj.join(args[0] !== undefined ? args[0] : ',');
                    case 'reverse':
                        obj.reverse();
                        return obj;
                    case 'slice':
                        return obj.slice(args[0], args[1]);
                    case 'length':
                        return obj.length;
                    default:
                        throw new Error(`Array method '${node.method}' not supported`);
                }
            }

            if (typeof obj === 'string') {
                switch (node.method) {
                    case 'indexOf':
                        return obj.indexOf(args[0]);
                    case 'slice':
                        return obj.slice(args[0], args[1]);
                    case 'split':
                        return obj.split(args[0]);
                    case 'toUpperCase':
                        return obj.toUpperCase();
                    case 'toLowerCase':
                        return obj.toLowerCase();
                    case 'trim':
                        return obj.trim();
                    default:
                        throw new Error(`String method '${node.method}' not supported`);
                }
            }

            throw new Error(`Cannot call '${node.method}' on '${node.object}'`);
        }

        // ==========================================
        // Statement Executor
        // ==========================================

        function executeStatement(node) {
            if (!node) return;

            switch (node.type) {

                case 'VariableDeclaration': {
                    const val = node.init ? evaluateExpression(node.init) : undefined;
                    setVariable(node.name, val);
                    break;
                }

                case 'Assignment': {
                    const current = getVariable(node.name);
                    let newVal;
                    switch (node.operator) {
                        case '=':
                            newVal = evaluateExpression(node.value);
                            break;
                        case '+=':
                            newVal = current + evaluateExpression(node.value);
                            break;
                        case '-=':
                            newVal = current - evaluateExpression(node.value);
                            break;
                        case '*=':
                            newVal = current * evaluateExpression(node.value);
                            break;
                        case '/=':
                            newVal = current / evaluateExpression(node.value);
                            break;
                        case '++':
                            newVal = current + 1;
                            break;
                        case '--':
                            newVal = current - 1;
                            break;
                        default:
                            throw new Error(`Unknown assignment operator: ${node.operator}`);
                    }
                    updateVariable(node.name, newVal);
                    break;
                }

                case 'IfStatement': {
                    const cond = evaluateExpression(node.condition);
                    createScope();
                    if (cond) {
                        for (const s of node.body) executeStatement(s);
                    } else if (node.elseBody) {
                        for (const s of node.elseBody) executeStatement(s);
                    }
                    destroyScope();
                    break;
                }

                case 'WhileStatement': {
                    createScope();
                    while (evaluateExpression(node.condition)) {
                        try {
                            for (const s of node.body) executeStatement(s);
                        } catch (sig) {
                            if (sig instanceof Signal && sig.type === 'break') break;
                            if (sig instanceof Signal && sig.type === 'continue') continue;
                            throw sig;
                        }
                    }
                    destroyScope();
                    break;
                }

                case 'ForStatement': {
                    createScope();
                    if (node.init) executeStatement(node.init);
                    while (node.condition ? evaluateExpression(node.condition) : true) {
                        try {
                            for (const s of node.body) executeStatement(s);
                        } catch (sig) {
                            if (sig instanceof Signal && sig.type === 'break') break;
                            if (sig instanceof Signal && sig.type === 'continue') {
                                if (node.update) executeStatement(node.update);
                                continue;
                            }
                            throw sig;
                        }
                        if (node.update) executeStatement(node.update);
                    }
                    destroyScope();
                    break;
                }

                case 'FunctionDeclaration': {
                    setVariable(node.name, {
                        type: 'function',
                        params: node.params,
                        body: node.body
                    });
                    break;
                }

                case 'ReturnStatement': {
                    const retVal = node.value ? evaluateExpression(node.value) : undefined;
                    throw new Signal('return', retVal);
                }

                case 'BreakStatement':
                    throw new Signal('break');

                case 'ContinueStatement':
                    throw new Signal('continue');

                case 'ExpressionStatement':
                    evaluateExpression(node.expression);
                    break;

                default:
                    throw new Error(`Unknown statement type: ${node.type}`);
            }
        }

        // ==========================================
        // Main execution
        // ==========================================

        createScope(); // global scope

        for (const stmt of syntaxResult.ast) {
            executeStatement(stmt);
        }

        // collect output from global scope (skip functions)
        const output = {};
        const globalScope = envStack[0];

        globalScope.forEach((value, key) => {
            if (value && typeof value === 'object' && value.type === 'function') {
                return;
            }
            output[key] = value;
        });

        return {
            success: true,
            output,
            consoleOutput: logs,
            error: null,
            message: "Execution Completed Successfully"
        };

    } catch (error) {

        return {
            success: false,
            output: null,
            consoleOutput: [],
            error: error.message || String(error),
            message: "Runtime error during execution"
        };
    }
}

module.exports = executeAST;