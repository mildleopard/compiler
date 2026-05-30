// ==========================================
// Code Optimizer
// Optimizes Three-Address Code (TAC)
// ==========================================

function optimizeIC(icResult) {

    let original = icResult.instructions;
    let instructions = JSON.parse(JSON.stringify(original));
    let applied = [];

    // ==========================================
    // Pass 1: Constant Folding
    // ==========================================

    for (let i = 0; i < instructions.length; i++) {

        let inst = instructions[i];

        if (
            ["+", "-", "*", "/", "%"].includes(inst.op) &&
            inst.arg1 !== null &&
            inst.arg2 !== null
        ) {

            let a = parseFloat(inst.arg1);
            let b = parseFloat(inst.arg2);

            if (!isNaN(a) && !isNaN(b)) {

                let result = null;

                switch (inst.op) {
                    case "+": result = a + b; break;
                    case "-": result = a - b; break;
                    case "*": result = a * b; break;
                    case "/": result = (b !== 0) ? a / b : null; break;
                    case "%": result = (b !== 0) ? a % b : null; break;
                }

                if (result !== null) {

                    applied.push(
                        "Constant folding: " +
                        inst.result + " = " +
                        inst.arg1 + " " + inst.op + " " + inst.arg2 +
                        " -> " + result
                    );

                    instructions[i] = {
                        op: "=",
                        arg1: String(result),
                        arg2: null,
                        result: inst.result
                    };
                }
            }
        }
    }

    // ==========================================
    // Pass 2: Constant Propagation
    // ==========================================

    let constants = {};

    for (let i = 0; i < instructions.length; i++) {

        let inst = instructions[i];

        if (
            inst.op === "=" &&
            inst.arg2 === null &&
            inst.arg1 !== null &&
            inst.result !== null &&
            inst.result.match(/^t\d+$/)
        ) {

            let val = inst.arg1;

            if (
                !isNaN(parseFloat(val)) ||
                val === "true" ||
                val === "false" ||
                val === "null"
            ) {
                constants[inst.result] = val;
            }
        }
    }

    for (let i = 0; i < instructions.length; i++) {

        let inst = instructions[i];
        let changed = false;

        if (
            inst.arg1 &&
            constants[inst.arg1] &&
            inst.op !== "="
        ) {
            inst.arg1 = constants[inst.arg1];
            changed = true;
        }

        if (inst.arg2 && constants[inst.arg2]) {
            inst.arg2 = constants[inst.arg2];
            changed = true;
        }

        if (changed) {

            applied.push(
                "Constant propagation at instruction " + (i + 1)
            );
        }
    }

    // ==========================================
    // Pass 3: Second Folding Pass
    // ==========================================

    for (let i = 0; i < instructions.length; i++) {

        let inst = instructions[i];

        if (
            ["+", "-", "*", "/", "%"].includes(inst.op) &&
            inst.arg1 !== null &&
            inst.arg2 !== null
        ) {

            let a = parseFloat(inst.arg1);
            let b = parseFloat(inst.arg2);

            if (!isNaN(a) && !isNaN(b)) {

                let result = null;

                switch (inst.op) {
                    case "+": result = a + b; break;
                    case "-": result = a - b; break;
                    case "*": result = a * b; break;
                    case "/": result = (b !== 0) ? a / b : null; break;
                    case "%": result = (b !== 0) ? a % b : null; break;
                }

                if (result !== null) {

                    applied.push(
                        "Constant folding (pass 2): " +
                        inst.result + " = " +
                        inst.arg1 + " " + inst.op + " " + inst.arg2 +
                        " -> " + result
                    );

                    instructions[i] = {
                        op: "=",
                        arg1: String(result),
                        arg2: null,
                        result: inst.result
                    };
                }
            }
        }
    }

    // ==========================================
    // Pass 4: Dead Code Elimination
    // ==========================================

    let usedTemps = new Set();

    for (let i = 0; i < instructions.length; i++) {

        let inst = instructions[i];

        if (inst.arg1 && inst.arg1.match(/^t\d+$/)) {
            usedTemps.add(inst.arg1);
        }

        if (inst.arg2 && inst.arg2.match(/^t\d+$/)) {
            usedTemps.add(inst.arg2);
        }

        if (
            inst.op === "ifFalse" &&
            inst.arg1 &&
            inst.arg1.match(/^t\d+$/)
        ) {
            usedTemps.add(inst.arg1);
        }
    }

    let beforeCount = instructions.length;

    instructions = instructions.filter(inst => {

        if (
            inst.op === "=" &&
            inst.result &&
            inst.result.match(/^t\d+$/) &&
            !usedTemps.has(inst.result)
        ) {

            applied.push(
                "Dead code eliminated: " +
                inst.result + " = " + inst.arg1
            );

            return false;
        }

        return true;
    });

    // ==========================================
    // Result
    // ==========================================

    return {

        success: true,

        originalCount: original.length,

        optimizedCount: instructions.length,

        eliminated: original.length - instructions.length,

        instructions: instructions,

        optimizations: applied,

        message: applied.length > 0
            ? applied.length + " Optimization(s) Applied"
            : "No Optimizations Needed"
    };
}

module.exports = optimizeIC;
