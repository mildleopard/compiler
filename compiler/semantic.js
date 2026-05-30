// ==========================================
// Semantic Analyzer
// ==========================================

const BUILTINS = new Set([
    'console', 'Math', 'parseInt', 'parseFloat',
    'String', 'Number', 'Array', 'Object',
    'JSON', 'undefined', 'true', 'false'
]);

function semanticAnalyzer(ast) {

    const warnings = [];
    const errors = [];
    const symbolTable = {};

    // scope stack — each scope is a Set of declared names
    const scopes = [new Set()];

    // ==========================================
    // Scope helpers
    // ==========================================

    function pushScope() {
        scopes.push(new Set());
    }

    function popScope() {
        scopes.pop();
    }

    function declareVariable(name, kind, keyword) {

        const currentScope = scopes[scopes.length - 1];

        if (currentScope.has(name)) {
            errors.push({
                line: 0,
                message: `Duplicate declaration of '${name}' in the same scope`
            });
            return;
        }

        currentScope.add(name);

        // flatten into symbol table for display
        symbolTable[name] = {
            type: kind,
            keyword: keyword || null,
            scope: scopes.length - 1
        };
    }

    function isDeclared(name) {
        if (BUILTINS.has(name)) return true;
        for (let i = scopes.length - 1; i >= 0; i--) {
            if (scopes[i].has(name)) return true;
        }
        return false;
    }

    // ==========================================
    // Expression checker
    // ==========================================

    function checkExpression(node) {
        if (!node) return;

        switch (node.type) {

            case 'NumberLiteral':
            case 'StringLiteral':
            case 'BooleanLiteral':
            case 'NullLiteral':
                break;

            case 'Identifier':
                if (!isDeclared(node.name)) {
                    warnings.push({
                        line: 0,
                        message: `Variable '${node.name}' used but not declared`
                    });
                }
                break;

            case 'BinaryExpression':
                checkExpression(node.left);
                checkExpression(node.right);
                break;

            case 'UnaryExpression':
                checkExpression(node.operand);
                break;

            case 'ArrayExpression':
                node.elements.forEach(el => checkExpression(el));
                break;

            case 'CallExpression':
                if (!isDeclared(node.callee)) {
                    warnings.push({
                        line: 0,
                        message: `Function '${node.callee}' called but not declared`
                    });
                }
                node.args.forEach(arg => checkExpression(arg));
                break;

            case 'MemberCallExpression':
                if (!isDeclared(node.object)) {
                    warnings.push({
                        line: 0,
                        message: `Object '${node.object}' used but not declared`
                    });
                }
                node.args.forEach(arg => checkExpression(arg));
                break;

            case 'MemberAccess':
                checkExpression(node.object);
                break;

            case 'ArrayAccess':
                checkExpression(node.object);
                checkExpression(node.index);
                break;

            default:
                break;
        }
    }

    // ==========================================
    // Statement checker
    // ==========================================

    function checkStatement(node) {
        if (!node) return;

        switch (node.type) {

            case 'VariableDeclaration':
                if (node.init) checkExpression(node.init);
                declareVariable(node.name, 'variable', node.keyword);
                break;

            case 'Assignment':
                if (!isDeclared(node.name)) {
                    warnings.push({
                        line: 0,
                        message: `Assigning to undeclared variable '${node.name}'`
                    });
                }
                if (node.value) checkExpression(node.value);
                break;

            case 'IfStatement':
                checkExpression(node.condition);
                pushScope();
                node.body.forEach(s => checkStatement(s));
                popScope();
                if (node.elseBody) {
                    pushScope();
                    node.elseBody.forEach(s => checkStatement(s));
                    popScope();
                }
                break;

            case 'WhileStatement':
                checkExpression(node.condition);
                pushScope();
                node.body.forEach(s => checkStatement(s));
                popScope();
                break;

            case 'ForStatement':
                pushScope();
                if (node.init) checkStatement(node.init);
                if (node.condition) checkExpression(node.condition);
                if (node.update) checkStatement(node.update);
                node.body.forEach(s => checkStatement(s));
                popScope();
                break;

            case 'FunctionDeclaration':
                declareVariable(node.name, 'function', null);
                pushScope();
                node.params.forEach(p => {
                    declareVariable(p, 'variable', 'param');
                });
                node.body.forEach(s => checkStatement(s));
                popScope();
                break;

            case 'ReturnStatement':
                if (node.value) checkExpression(node.value);
                break;

            case 'BreakStatement':
            case 'ContinueStatement':
                break;

            case 'ExpressionStatement':
                checkExpression(node.expression);
                break;

            default:
                break;
        }
    }

    // ==========================================
    // Run analysis
    // ==========================================

    if (Array.isArray(ast)) {
        ast.forEach(stmt => checkStatement(stmt));
    }

    return {
        success: errors.length === 0,
        warnings,
        errors,
        symbolTable
    };
}

module.exports = semanticAnalyzer;
