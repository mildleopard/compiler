// ==========================================
// Intermediate Code Generator
// Converts AST into Three-Address Code (TAC)
// ==========================================

function generateIC(ast) {

    const instructions = [];

    let tempCount = 0;
    let labelCount = 0;

    function newTemp() {
        return "t" + (tempCount++);
    }

    function newLabel() {
        return "L" + (labelCount++);
    }

    // ==========================================
    // Generate Code for Expressions
    // ==========================================

    function generateExpr(node) {

        if (!node) return "undefined";

        if (node.type === "NumberLiteral") {

            let t = newTemp();

            instructions.push({
                op: "=",
                arg1: String(node.value),
                arg2: null,
                result: t
            });

            return t;
        }

        if (node.type === "StringLiteral") {

            let t = newTemp();

            instructions.push({
                op: "=",
                arg1: '"' + node.value + '"',
                arg2: null,
                result: t
            });

            return t;
        }

        if (node.type === "BooleanLiteral") {

            let t = newTemp();

            instructions.push({
                op: "=",
                arg1: String(node.value),
                arg2: null,
                result: t
            });

            return t;
        }

        if (node.type === "NullLiteral") {

            let t = newTemp();

            instructions.push({
                op: "=",
                arg1: "null",
                arg2: null,
                result: t
            });

            return t;
        }

        if (node.type === "Identifier") {
            return node.name;
        }

        if (node.type === "BinaryExpression") {

            let left = generateExpr(node.left);
            let right = generateExpr(node.right);
            let t = newTemp();

            instructions.push({
                op: node.operator,
                arg1: left,
                arg2: right,
                result: t
            });

            return t;
        }

        if (node.type === "UnaryExpression") {

            let operand = generateExpr(node.operand);
            let t = newTemp();

            instructions.push({
                op: "unary_" + node.operator,
                arg1: operand,
                arg2: null,
                result: t
            });

            return t;
        }

        if (node.type === "ArrayExpression") {

            let elements = node.elements.map(
                e => generateExpr(e)
            );

            let t = newTemp();

            instructions.push({
                op: "array",
                arg1: elements.join(", "),
                arg2: String(elements.length),
                result: t
            });

            return t;
        }

        if (node.type === "CallExpression") {

            let args = node.args.map(
                a => generateExpr(a)
            );

            args.forEach(a => {
                instructions.push({
                    op: "param",
                    arg1: a,
                    arg2: null,
                    result: null
                });
            });

            let t = newTemp();

            instructions.push({
                op: "call",
                arg1: node.callee,
                arg2: String(args.length),
                result: t
            });

            return t;
        }

        if (node.type === "MemberCallExpression") {

            let args = node.args.map(
                a => generateExpr(a)
            );

            args.forEach(a => {
                instructions.push({
                    op: "param",
                    arg1: a,
                    arg2: null,
                    result: null
                });
            });

            let t = newTemp();

            instructions.push({
                op: "call",
                arg1: node.object + "." + node.method,
                arg2: String(args.length),
                result: t
            });

            return t;
        }

        if (node.type === "ArrayAccess") {

            let obj = generateExpr(node.object);
            let idx = generateExpr(node.index);
            let t = newTemp();

            instructions.push({
                op: "[]",
                arg1: obj,
                arg2: idx,
                result: t
            });

            return t;
        }

        if (node.type === "MemberAccess") {

            let obj = generateExpr(node.object);
            let t = newTemp();

            instructions.push({
                op: ".",
                arg1: obj,
                arg2: node.property,
                result: t
            });

            return t;
        }

        let t = newTemp();

        instructions.push({
            op: "=",
            arg1: "unknown",
            arg2: null,
            result: t
        });

        return t;
    }

    // ==========================================
    // Generate Code for Statements
    // ==========================================

    function generateStmt(node) {

        if (!node) return;

        // ------------------------------------------
        // Variable Declaration
        // ------------------------------------------

        if (node.type === "VariableDeclaration") {

            if (node.init) {

                let val = generateExpr(node.init);

                instructions.push({
                    op: "=",
                    arg1: val,
                    arg2: null,
                    result: node.name
                });

            } else {

                instructions.push({
                    op: "=",
                    arg1: "undefined",
                    arg2: null,
                    result: node.name
                });
            }
        }

        // ------------------------------------------
        // Assignment
        // ------------------------------------------

        else if (node.type === "Assignment") {

            if (node.operator === "++" || node.operator === "--") {

                let op = node.operator === "++" ? "+" : "-";
                let t = newTemp();

                instructions.push({
                    op: op,
                    arg1: node.name,
                    arg2: "1",
                    result: t
                });

                instructions.push({
                    op: "=",
                    arg1: t,
                    arg2: null,
                    result: node.name
                });

            } else if (node.operator !== "=") {

                let op = node.operator[0];
                let val = generateExpr(node.value);
                let t = newTemp();

                instructions.push({
                    op: op,
                    arg1: node.name,
                    arg2: val,
                    result: t
                });

                instructions.push({
                    op: "=",
                    arg1: t,
                    arg2: null,
                    result: node.name
                });

            } else {

                let val = generateExpr(node.value);

                instructions.push({
                    op: "=",
                    arg1: val,
                    arg2: null,
                    result: node.name
                });
            }
        }

        // ------------------------------------------
        // If Statement
        // ------------------------------------------

        else if (node.type === "IfStatement") {

            let cond = generateExpr(node.condition);
            let elseLabel = newLabel();
            let endLabel = newLabel();

            if (node.elseBody && node.elseBody.length > 0) {

                instructions.push({
                    op: "ifFalse",
                    arg1: cond,
                    arg2: null,
                    result: elseLabel
                });

                node.body.forEach(s => generateStmt(s));

                instructions.push({
                    op: "goto",
                    arg1: null,
                    arg2: null,
                    result: endLabel
                });

                instructions.push({
                    op: "label",
                    arg1: null,
                    arg2: null,
                    result: elseLabel
                });

                node.elseBody.forEach(s => generateStmt(s));

                instructions.push({
                    op: "label",
                    arg1: null,
                    arg2: null,
                    result: endLabel
                });

            } else {

                instructions.push({
                    op: "ifFalse",
                    arg1: cond,
                    arg2: null,
                    result: elseLabel
                });

                node.body.forEach(s => generateStmt(s));

                instructions.push({
                    op: "label",
                    arg1: null,
                    arg2: null,
                    result: elseLabel
                });
            }
        }

        // ------------------------------------------
        // While Statement
        // ------------------------------------------

        else if (node.type === "WhileStatement") {

            let startLabel = newLabel();
            let endLabel = newLabel();

            instructions.push({
                op: "label",
                arg1: null,
                arg2: null,
                result: startLabel
            });

            let cond = generateExpr(node.condition);

            instructions.push({
                op: "ifFalse",
                arg1: cond,
                arg2: null,
                result: endLabel
            });

            node.body.forEach(s => generateStmt(s));

            instructions.push({
                op: "goto",
                arg1: null,
                arg2: null,
                result: startLabel
            });

            instructions.push({
                op: "label",
                arg1: null,
                arg2: null,
                result: endLabel
            });
        }

        // ------------------------------------------
        // For Statement
        // ------------------------------------------

        else if (node.type === "ForStatement") {

            if (node.init) generateStmt(node.init);

            let startLabel = newLabel();
            let endLabel = newLabel();

            instructions.push({
                op: "label",
                arg1: null,
                arg2: null,
                result: startLabel
            });

            if (node.condition) {

                let cond = generateExpr(node.condition);

                instructions.push({
                    op: "ifFalse",
                    arg1: cond,
                    arg2: null,
                    result: endLabel
                });
            }

            node.body.forEach(s => generateStmt(s));

            if (node.update) generateStmt(node.update);

            instructions.push({
                op: "goto",
                arg1: null,
                arg2: null,
                result: startLabel
            });

            instructions.push({
                op: "label",
                arg1: null,
                arg2: null,
                result: endLabel
            });
        }

        // ------------------------------------------
        // Function Declaration
        // ------------------------------------------

        else if (node.type === "FunctionDeclaration") {

            let endLabel = newLabel();

            instructions.push({
                op: "goto",
                arg1: null,
                arg2: null,
                result: endLabel
            });

            instructions.push({
                op: "func",
                arg1: node.name,
                arg2: node.params.join(", "),
                result: null
            });

            node.body.forEach(s => generateStmt(s));

            instructions.push({
                op: "endFunc",
                arg1: node.name,
                arg2: null,
                result: null
            });

            instructions.push({
                op: "label",
                arg1: null,
                arg2: null,
                result: endLabel
            });
        }

        // ------------------------------------------
        // Return
        // ------------------------------------------

        else if (node.type === "ReturnStatement") {

            if (node.value) {

                let val = generateExpr(node.value);

                instructions.push({
                    op: "return",
                    arg1: val,
                    arg2: null,
                    result: null
                });

            } else {

                instructions.push({
                    op: "return",
                    arg1: null,
                    arg2: null,
                    result: null
                });
            }
        }

        // ------------------------------------------
        // Break / Continue
        // ------------------------------------------

        else if (node.type === "BreakStatement") {

            instructions.push({
                op: "break",
                arg1: null,
                arg2: null,
                result: null
            });
        }

        else if (node.type === "ContinueStatement") {

            instructions.push({
                op: "continue",
                arg1: null,
                arg2: null,
                result: null
            });
        }

        // ------------------------------------------
        // Expression Statement
        // ------------------------------------------

        else if (node.type === "ExpressionStatement") {

            generateExpr(node.expression);
        }
    }

    // ==========================================
    // Generate Code for Entire Program
    // ==========================================

    for (let i = 0; i < ast.length; i++) {
        generateStmt(ast[i]);
    }

    return {
        success: true,
        totalInstructions: instructions.length,
        instructions: instructions,
        message: "Intermediate Code Generated Successfully"
    };
}

module.exports = generateIC;
