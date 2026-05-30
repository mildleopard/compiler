function syntaxAnalyzer(tokens) {

    const errors = [];
    const ast = [];

    let current = 0;

    // ==========================================
    // Utility Functions
    // ==========================================

    function peek() {
        return tokens[current];
    }

    function previous() {
        return tokens[current - 1];
    }

    function advance() {
        if (current < tokens.length) {
            current++;
        }
        return previous();
    }

    function isAtEnd() {
        return current >= tokens.length;
    }

    function checkValue(value) {
        if (isAtEnd()) return false;
        return peek().value === value;
    }

    function checkType(type) {
        if (isAtEnd()) return false;
        return peek().type === type;
    }

    function matchValue(...values) {

        for (const value of values) {

            if (checkValue(value)) {
                advance();
                return true;
            }
        }

        return false;
    }

    function consume(value, message) {

        if (checkValue(value)) {
            return advance();
        }

        errors.push({
            line: peek()?.line || 0,
            error: message
        });

        return null;
    }

    // helper to look ahead without advancing
    function peekNext() {
        return tokens[current + 1] || null;
    }

    function peekAt(offset) {
        return tokens[current + offset] || null;
    }

    // ==========================================
    // Bracket Validation
    // ==========================================

    function validateBrackets() {

        const stack = [];

        const pairs = {
            "(": ")",
            "{": "}",
            "[": "]"
        };

        for (const token of tokens) {

            if (pairs[token.value]) {

                stack.push(token.value);
            }

            else if (
                token.value === ")" ||
                token.value === "}" ||
                token.value === "]"
            ) {

                const last = stack.pop();

                if (
                    !last ||
                    pairs[last] !== token.value
                ) {

                    errors.push({
                        line: token.line,
                        error: `Unexpected '${token.value}'`
                    });
                }
            }
        }

        if (stack.length > 0) {

            errors.push({
                line: 0,
                error: "Unclosed brackets detected"
            });
        }
    }

    // ==========================================
    // Expression Parser — Recursive Descent
    // ==========================================

    // Level 1 (lowest): ||
    function parseExpression() {
        return parseOr();
    }

    function parseOr() {
        let left = parseAnd();

        while (!isAtEnd() && checkValue("||")) {
            const op = advance().value;
            const right = parseAnd();
            left = { type: 'BinaryExpression', operator: op, left, right };
        }

        return left;
    }

    // Level 2: &&
    function parseAnd() {
        let left = parseEquality();

        while (!isAtEnd() && checkValue("&&")) {
            const op = advance().value;
            const right = parseEquality();
            left = { type: 'BinaryExpression', operator: op, left, right };
        }

        return left;
    }

    // Level 3: ==, !=, ===, !==
    function parseEquality() {
        let left = parseComparison();

        while (
            !isAtEnd() &&
            (checkValue("==") || checkValue("!=") || checkValue("===") || checkValue("!=="))
        ) {
            const op = advance().value;
            const right = parseComparison();
            left = { type: 'BinaryExpression', operator: op, left, right };
        }

        return left;
    }

    // Level 4: <, >, <=, >=
    function parseComparison() {
        let left = parseAddition();

        while (
            !isAtEnd() &&
            (checkValue("<") || checkValue(">") || checkValue("<=") || checkValue(">="))
        ) {
            const op = advance().value;
            const right = parseAddition();
            left = { type: 'BinaryExpression', operator: op, left, right };
        }

        return left;
    }

    // Level 5: +, -
    function parseAddition() {
        let left = parseMultiplication();

        while (
            !isAtEnd() &&
            (checkValue("+") || checkValue("-"))
        ) {
            const op = advance().value;
            const right = parseMultiplication();
            left = { type: 'BinaryExpression', operator: op, left, right };
        }

        return left;
    }

    // Level 6: *, /, %
    function parseMultiplication() {
        let left = parseUnary();

        while (
            !isAtEnd() &&
            (checkValue("*") || checkValue("/") || checkValue("%"))
        ) {
            const op = advance().value;
            const right = parseUnary();
            left = { type: 'BinaryExpression', operator: op, left, right };
        }

        return left;
    }

    // Level 7: unary prefix !, -
    function parseUnary() {

        if (!isAtEnd() && (checkValue("!") || checkValue("-"))) {
            const op = advance().value;
            const operand = parseUnary();
            return { type: 'UnaryExpression', operator: op, operand };
        }

        return parsePostfix();
    }

    // Level 8: primary + postfix (member access, array access, calls)
    function parsePostfix() {
        let expr = parsePrimary();

        // chain postfix operators: .prop, [index], (args)
        while (!isAtEnd()) {

            if (checkValue(".")) {
                advance(); // consume '.'

                if (!checkType("IDENTIFIER")) {
                    errors.push({
                        line: peek()?.line || 0,
                        error: "Expected property name after '.'"
                    });
                    break;
                }

                const prop = advance().value;

                // check if it's a method call: obj.method(args)
                if (!isAtEnd() && checkValue("(")) {
                    advance(); // consume '('
                    const args = parseArgList();
                    consume(")", "Expected ')' after arguments");

                    // MemberCallExpression needs object as string
                    const objName = (expr.type === 'Identifier') ? expr.name : null;

                    if (objName) {
                        expr = {
                            type: 'MemberCallExpression',
                            object: objName,
                            method: prop,
                            args
                        };
                    } else {
                        // fallback: wrap as member access then call
                        expr = {
                            type: 'MemberCallExpression',
                            object: stringifyExpr(expr),
                            method: prop,
                            args
                        };
                    }
                } else {
                    // plain member access
                    expr = { type: 'MemberAccess', object: expr, property: prop };
                }

            } else if (checkValue("[")) {
                advance(); // consume '['
                const index = parseExpression();
                consume("]", "Expected ']' after index");
                expr = { type: 'ArrayAccess', object: expr, index };

            } else if (checkValue("(") && expr.type === 'Identifier') {
                // function call on identifier
                advance(); // consume '('
                const args = parseArgList();
                consume(")", "Expected ')' after arguments");
                expr = { type: 'CallExpression', callee: expr.name, args };

            } else {
                break;
            }
        }

        return expr;
    }

    // helper to get a string representation of an expression for object names
    function stringifyExpr(expr) {
        if (expr.type === 'Identifier') return expr.name;
        if (expr.type === 'MemberAccess') return stringifyExpr(expr.object) + '.' + expr.property;
        return '<expr>';
    }

    // parse comma-separated argument list
    function parseArgList() {
        const args = [];

        if (!isAtEnd() && !checkValue(")")) {
            args.push(parseExpression());

            while (!isAtEnd() && checkValue(",")) {
                advance(); // consume ','
                args.push(parseExpression());
            }
        }

        return args;
    }

    // primary expressions
    function parsePrimary() {

        if (isAtEnd()) {
            errors.push({
                line: previous()?.line || 0,
                error: "Unexpected end of input"
            });
            return { type: 'NullLiteral' };
        }

        const token = peek();

        // number literal
        if (token.type === 'NUMBER') {
            advance();
            return { type: 'NumberLiteral', value: Number(token.value) };
        }

        // string literal
        if (token.type === 'STRING') {
            advance();
            return { type: 'StringLiteral', value: token.value };
        }

        // boolean literals
        if (token.value === 'true' || token.value === 'false') {
            advance();
            return { type: 'BooleanLiteral', value: token.value === 'true' };
        }

        // null literal
        if (token.value === 'null') {
            advance();
            return { type: 'NullLiteral' };
        }

        // grouped expression: ( expr )
        if (token.value === '(') {
            advance(); // consume '('
            const expr = parseExpression();
            consume(")", "Expected ')' after grouped expression");
            return expr;
        }

        // array literal: [ expr, expr, ... ]
        if (token.value === '[') {
            advance(); // consume '['
            const elements = [];

            if (!isAtEnd() && !checkValue(']')) {
                elements.push(parseExpression());

                while (!isAtEnd() && checkValue(',')) {
                    advance(); // consume ','
                    elements.push(parseExpression());
                }
            }

            consume("]", "Expected ']' after array literal");
            return { type: 'ArrayExpression', elements };
        }

        // identifier (calls and member access handled by parsePostfix)
        if (token.type === 'IDENTIFIER') {
            advance();
            return { type: 'Identifier', name: token.value };
        }

        // unknown token — skip it
        errors.push({
            line: token.line,
            error: `Unexpected token '${token.value}'`
        });
        advance();
        return { type: 'NullLiteral' };
    }

    // ==========================================
    // Variable Declaration
    // ==========================================

    function parseVariableDeclaration() {

        const keyword = advance(); // let/var/const

        if (!checkType("IDENTIFIER")) {

            errors.push({
                line: keyword.line,
                error: "Expected variable name"
            });

            return null;
        }

        const name = advance().value;

        // declaration without init: let x;
        if (checkValue(";")) {
            advance(); // consume ';'
            return {
                type: 'VariableDeclaration',
                keyword: keyword.value,
                name,
                init: null
            };
        }

        if (!matchValue("=")) {

            errors.push({
                line: peek()?.line || 0,
                error: "Expected '=' or ';' after variable name"
            });

            return null;
        }

        const init = parseExpression();

        consume(";", "Missing semicolon after declaration");

        return {
            type: 'VariableDeclaration',
            keyword: keyword.value,
            name,
            init
        };
    }

    // special version for for-loop init (doesn't consume the ';')
    function parseVariableDeclarationNoSemicolon() {

        const keyword = advance();

        if (!checkType("IDENTIFIER")) {
            errors.push({
                line: keyword.line,
                error: "Expected variable name"
            });
            return null;
        }

        const name = advance().value;

        if (!matchValue("=")) {
            return {
                type: 'VariableDeclaration',
                keyword: keyword.value,
                name,
                init: null
            };
        }

        const init = parseExpression();

        return {
            type: 'VariableDeclaration',
            keyword: keyword.value,
            name,
            init
        };
    }

    // ==========================================
    // Assignment
    // ==========================================

    function parseAssignment() {

        const name = advance().value; // identifier

        const assignOps = ['=', '+=', '-=', '*=', '/='];
        let operator = null;

        for (const op of assignOps) {
            if (checkValue(op)) {
                operator = op;
                advance();
                break;
            }
        }

        if (!operator) {
            errors.push({
                line: peek()?.line || 0,
                error: "Expected assignment operator"
            });
            return null;
        }

        const value = parseExpression();

        consume(";", "Missing semicolon after assignment");

        return {
            type: 'Assignment',
            name,
            operator,
            value
        };
    }

    // assignment without consuming the trailing ';'
    function parseAssignmentNoSemicolon() {

        const name = advance().value;

        // check for ++ / --
        if (!isAtEnd() && (checkValue("++") || checkValue("--"))) {
            const operator = advance().value;
            return {
                type: 'Assignment',
                name,
                operator,
                value: null
            };
        }

        const assignOps = ['=', '+=', '-=', '*=', '/='];
        let operator = null;

        for (const op of assignOps) {
            if (checkValue(op)) {
                operator = op;
                advance();
                break;
            }
        }

        if (!operator) {
            errors.push({
                line: peek()?.line || 0,
                error: "Expected assignment operator"
            });
            return null;
        }

        const value = parseExpression();

        return {
            type: 'Assignment',
            name,
            operator,
            value
        };
    }

    // ==========================================
    // If / Else If / Else Statement
    // ==========================================

    function parseIfStatement() {

        advance(); // consume 'if'

        consume("(", "Expected '(' after 'if'");

        const condition = parseExpression();

        consume(")", "Expected ')' after condition");

        consume("{", "Expected '{'");

        const body = [];

        while (!isAtEnd() && !checkValue("}")) {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
        }

        consume("}", "Expected '}'");

        // check for else / else if
        let elseBody = null;

        if (!isAtEnd() && checkValue("else")) {
            advance(); // consume 'else'

            if (!isAtEnd() && checkValue("if")) {
                // else if => nested IfStatement in elseBody
                elseBody = [parseIfStatement()];
            } else {
                // plain else block
                consume("{", "Expected '{' after 'else'");

                elseBody = [];

                while (!isAtEnd() && !checkValue("}")) {
                    const stmt = parseStatement();
                    if (stmt) elseBody.push(stmt);
                }

                consume("}", "Expected '}'");
            }
        }

        return {
            type: 'IfStatement',
            condition,
            body,
            elseBody
        };
    }

    // ==========================================
    // While Statement
    // ==========================================

    function parseWhileStatement() {

        advance(); // consume 'while'

        consume("(", "Expected '(' after 'while'");

        const condition = parseExpression();

        consume(")", "Expected ')' after condition");

        consume("{", "Expected '{'");

        const body = [];

        while (!isAtEnd() && !checkValue("}")) {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
        }

        consume("}", "Expected '}'");

        return {
            type: 'WhileStatement',
            condition,
            body
        };
    }

    // ==========================================
    // For Statement
    // ==========================================

    function parseForStatement() {

        advance(); // consume 'for'

        consume("(", "Expected '(' after 'for'");

        // --- init ---
        let init = null;

        if (checkValue("let") || checkValue("var") || checkValue("const")) {
            init = parseVariableDeclarationNoSemicolon();
        } else if (checkType("IDENTIFIER") && peekNext() && (
            peekNext().value === '=' || peekNext().value === '+=' ||
            peekNext().value === '-=' || peekNext().value === '*=' ||
            peekNext().value === '/='
        )) {
            init = parseAssignmentNoSemicolon();
        }

        consume(";", "Expected ';' after for-loop init");

        // --- condition ---
        let condition = null;

        if (!checkValue(";")) {
            condition = parseExpression();
        }

        consume(";", "Expected ';' after for-loop condition");

        // --- update ---
        let update = null;

        if (!checkValue(")")) {
            if (checkType("IDENTIFIER")) {
                update = parseAssignmentNoSemicolon();
            } else {
                // just parse as expression and wrap
                const expr = parseExpression();
                update = { type: 'ExpressionStatement', expression: expr };
            }
        }

        consume(")", "Expected ')' after for-loop clauses");

        consume("{", "Expected '{'");

        const body = [];

        while (!isAtEnd() && !checkValue("}")) {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
        }

        consume("}", "Expected '}'");

        return {
            type: 'ForStatement',
            init,
            condition,
            update,
            body
        };
    }

    // ==========================================
    // Function Declaration
    // ==========================================

    function parseFunctionDeclaration() {

        advance(); // consume 'function'

        if (!checkType("IDENTIFIER")) {
            errors.push({
                line: peek()?.line || 0,
                error: "Expected function name"
            });
            return null;
        }

        const name = advance().value;

        consume("(", "Expected '(' after function name");

        // parse parameter list
        const params = [];

        if (!isAtEnd() && !checkValue(")")) {

            if (checkType("IDENTIFIER")) {
                params.push(advance().value);
            }

            while (!isAtEnd() && checkValue(",")) {
                advance(); // consume ','

                if (checkType("IDENTIFIER")) {
                    params.push(advance().value);
                }
            }
        }

        consume(")", "Expected ')' after parameters");

        consume("{", "Expected '{' before function body");

        const body = [];

        while (!isAtEnd() && !checkValue("}")) {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
        }

        consume("}", "Expected '}' after function body");

        return {
            type: 'FunctionDeclaration',
            name,
            params,
            body
        };
    }

    // ==========================================
    // Return / Break / Continue
    // ==========================================

    function parseReturnStatement() {

        advance(); // consume 'return'

        let value = null;

        // if next token isn't ';', parse the return value
        if (!isAtEnd() && !checkValue(";")) {
            value = parseExpression();
        }

        consume(";", "Missing semicolon after return");

        return {
            type: 'ReturnStatement',
            value
        };
    }

    function parseBreakStatement() {
        advance(); // consume 'break'
        consume(";", "Missing semicolon after break");
        return { type: 'BreakStatement' };
    }

    function parseContinueStatement() {
        advance(); // consume 'continue'
        consume(";", "Missing semicolon after continue");
        return { type: 'ContinueStatement' };
    }

    // ==========================================
    // Statement Dispatcher
    // ==========================================

    function parseStatement() {

        // variable declarations
        if (checkValue("let") || checkValue("var") || checkValue("const")) {
            return parseVariableDeclaration();
        }

        // control flow
        if (checkValue("if")) return parseIfStatement();
        if (checkValue("while")) return parseWhileStatement();
        if (checkValue("for")) return parseForStatement();

        // function declaration
        if (checkValue("function")) return parseFunctionDeclaration();

        // return / break / continue
        if (checkValue("return")) return parseReturnStatement();
        if (checkValue("break")) return parseBreakStatement();
        if (checkValue("continue")) return parseContinueStatement();

        // identifier-led statements
        if (checkType("IDENTIFIER")) {

            const next = peekNext();

            // ++ / -- postfix
            if (next && (next.value === "++" || next.value === "--")) {
                const name = advance().value;
                const operator = advance().value;
                consume(";", "Missing semicolon after " + operator);
                return {
                    type: 'Assignment',
                    name,
                    operator,
                    value: null
                };
            }

            // assignment: = += -= *= /=
            if (next && (
                next.value === '=' || next.value === '+=' ||
                next.value === '-=' || next.value === '*=' ||
                next.value === '/='
            )) {
                return parseAssignment();
            }

            // function call: identifier(
            if (next && next.value === '(') {
                const expr = parseExpression();
                consume(";", "Missing semicolon after expression");
                return { type: 'ExpressionStatement', expression: expr };
            }

            // method call or member access: identifier.
            if (next && next.value === '.') {
                const expr = parseExpression();
                consume(";", "Missing semicolon after expression");
                return { type: 'ExpressionStatement', expression: expr };
            }

            // fallback: try parsing as expression statement
            const expr = parseExpression();
            consume(";", "Missing semicolon after expression");
            return { type: 'ExpressionStatement', expression: expr };
        }

        // skip unknown tokens
        advance();
        return null;
    }

    // ==========================================
    // Start Parsing
    // ==========================================

    validateBrackets();

    while (!isAtEnd()) {

        const statement = parseStatement();

        if (statement) {
            ast.push(statement);
        }
    }

    // ==========================================
    // Final Result
    // ==========================================

    return {

        success:
            errors.length === 0,

        totalTokens:
            tokens.length,

        totalStatements:
            ast.length,

        ast,

        errors,

        message:
            errors.length === 0
                ? "Syntax Analysis Completed Successfully"
                : "Syntax Errors Detected"
    };
}

module.exports = syntaxAnalyzer;