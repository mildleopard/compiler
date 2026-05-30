// ======================================================
// Compile Code
// ======================================================

async function compileCode() {

    const codeEditor =
        document.getElementById("code");

    const resultBox =
        document.getElementById("result");

    const code =
        codeEditor.value.trim();

    // ----------------------------------------
    // Empty Input Check
    // ----------------------------------------

    if (!code) {

        resultBox.innerHTML =
            "! Please enter some source code.";

        return;
    }

    // ----------------------------------------
    // Loading State
    // ----------------------------------------

    resultBox.innerHTML =
        "Running Lexical analysis...\n";

    try {

        const response =
            await fetch("/compile", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    code
                })
            });

        const data =
            await response.json();

        // ----------------------------------------
        // Error Handling
        // ----------------------------------------

        if (!data.success) {

            let errorOutput = "";

            errorOutput +=
                "COMPILATION FAILD\n\n";

            errorOutput +=
                `PHASE : ${data.phase}\n\n`;

            if (data.errors) {

                errorOutput +=
                    "ERRORS:\n";

                data.errors.forEach(
                    (error, index) => {

                        errorOutput +=
                            `${index + 1}. `;

                        if (
                            typeof error ===
                            "object"
                        ) {

                            errorOutput +=
                                `${error.error}\n`;
                        }

                        else {

                            errorOutput +=
                                `${error}\n`;
                        }
                    }
                );
            }

            resultBox.textContent =
                errorOutput;

            return;
        }

        // ----------------------------------------
        // Success Output
        // ----------------------------------------

        let output = "";

        output +=
            "COMPILATION SUCCESFULL\n";

        output +=
            "========================================\n\n";

        // ----------------------------------------
        // Phase 1: Lexical Analysis
        // ----------------------------------------

        output +=
            "PHASE 1: LEXICAL ANALYSIS\n";

        output +=
            "----------------------------------------\n";

        output +=
            `Total Tokens : ${data.lexicalAnalysis.totalTokens}\n\n`;

        if (
            data.lexicalAnalysis.tokens &&
            data.lexicalAnalysis.tokens.length
        ) {

            data.lexicalAnalysis.tokens.forEach(
                token => {

                    output +=
                        `  [${token.type}] -> ${token.value}\n`;
                }
            );
        }

        // ----------------------------------------
        // Phase 2: Syntax Analysis
        // ----------------------------------------

        output +=
            "\n\nPHASE 2: SYNTAX ANALYSIS\n";

        output +=
            "----------------------------------------\n";

        output +=
            `Status     : ${data.syntaxAnalysis.message}\n`;

        output +=
            `Statements : ${data.syntaxAnalysis.totalStatements}\n`;

        output +=
            `Tokens     : ${data.syntaxAnalysis.totalTokens}\n`;

        // ----------------------------------------
        // AST
        // ----------------------------------------

        output +=
            "\n\nABSTRACT SYNTAX TREE (AST)\n";

        output +=
            "----------------------------------------\n";

        output +=
            JSON.stringify(
                data.syntaxAnalysis.ast,
                null,
                2
            );

        // ----------------------------------------
        // Phase 3: Semantic Analysis
        // ----------------------------------------

        output +=
            "\n\n\nPHASE 3: SEMANTIC ANALYSIS\n";

        output +=
            "----------------------------------------\n";

        if (data.semanticAnalysis) {

            if (
                data.semanticAnalysis.warnings &&
                data.semanticAnalysis.warnings.length > 0
            ) {

                output += "Warnings:\n";

                data.semanticAnalysis.warnings.forEach(
                    w => {
                        output += `  ! ${w.message}\n`;
                    }
                );

            } else {
                output += "No warnings.\n";
            }

            if (data.semanticAnalysis.symbolTable) {

                output += "\nSymbol Table:\n";

                let table =
                    data.semanticAnalysis.symbolTable;

                for (let name in table) {

                    let entry = table[name];

                    output +=
                        `  ${name} : ${entry.type}`;

                    if (entry.keyword) {
                        output += ` (${entry.keyword})`;
                    }

                    output +=
                        ` [scope: ${entry.scope}]\n`;
                }
            }
        }

        // ----------------------------------------
        // Phase 4: Intermediate Code Generation
        // ----------------------------------------

        output +=
            "\n\nPHASE 4: INTERMEDEATE CODE (TAC)\n";

        output +=
            "----------------------------------------\n";

        if (data.intermediateCode) {

            output +=
                `Total Instructions : ${data.intermediateCode.totalInstructions}\n\n`;

            data.intermediateCode.instructions.forEach(
                (inst, idx) => {

                    let line = `  ${idx + 1}. `;

                    if (inst.op === "label") {

                        line += `${inst.result}:`;

                    } else if (inst.op === "goto") {

                        line += `goto ${inst.result}`;

                    } else if (inst.op === "ifFalse") {

                        line +=
                            `if !${inst.arg1} goto ${inst.result}`;

                    } else if (inst.op === "param") {

                        line += `param ${inst.arg1}`;

                    } else if (inst.op === "call") {

                        if (inst.result) {
                            line +=
                                `${inst.result} = call ${inst.arg1}, ${inst.arg2}`;
                        } else {
                            line +=
                                `call ${inst.arg1}, ${inst.arg2}`;
                        }

                    } else if (inst.op === "return") {

                        line += inst.arg1
                            ? `return ${inst.arg1}`
                            : "return";

                    } else if (inst.op === "func") {

                        line +=
                            `function ${inst.arg1}(${inst.arg2 || ""})`;

                    } else if (inst.op === "endFunc") {

                        line +=
                            `end ${inst.arg1}`;

                    } else if (inst.op === "=") {

                        line +=
                            `${inst.result} = ${inst.arg1}`;

                    } else if (inst.arg2 !== null) {

                        line +=
                            `${inst.result} = ${inst.arg1} ${inst.op} ${inst.arg2}`;

                    } else {

                        line +=
                            `${inst.result} = ${inst.op} ${inst.arg1}`;
                    }

                    output += line + "\n";
                }
            );
        }

        // ----------------------------------------
        // Phase 5: Optimization
        // ----------------------------------------

        output +=
            "\n\nPHASE 5: CODE OPTIMIZATION\n";

        output +=
            "----------------------------------------\n";

        if (data.optimization) {

            output +=
                `Original     : ${data.optimization.originalCount} instructions\n`;

            output +=
                `Optimized    : ${data.optimization.optimizedCount} instructions\n`;

            output +=
                `Eliminated   : ${data.optimization.eliminated} instructions\n`;

            output +=
                `Status       : ${data.optimization.message}\n`;

            if (
                data.optimization.optimizations &&
                data.optimization.optimizations.length > 0
            ) {

                output += "\nApplied Optimizations:\n";

                data.optimization.optimizations.forEach(
                    (opt, i) => {

                        output +=
                            `  ${i + 1}. ${opt}\n`;
                    }
                );
            }
        }

        // ----------------------------------------
        // Phase 6: Execution
        // ----------------------------------------

        output +=
            "\n\nPHASE 6: EXECUTION RESULT\n";

        output +=
            "----------------------------------------\n";

        if (
            data.execution.consoleOutput &&
            data.execution.consoleOutput.length > 0
        ) {

            output += "Console Output:\n";

            data.execution.consoleOutput.forEach(
                args => {

                    output +=
                        "  > " + args.join(" ") + "\n";
                }
            );

            output += "\n";
        }

        output += "Variables:\n";

        output +=
            JSON.stringify(
                data.execution.output,
                null,
                2
            );

        output +=
            "\n\n========================================\n";

        output +=
            "All 6 Phases Completed Successfully";

        resultBox.textContent =
            output;

    } catch (error) {

        resultBox.textContent =
            "SERVER ERORR\n\n" +
            error.message;

        console.error(error);
    }
}

// ======================================================
// Clear Output
// ======================================================

function clearOutput() {

    document.getElementById("code").value = "";

    document.getElementById("result").textContent =
        "Waiting for compilation...";
}

// ======================================================
// Load Example Program
// ======================================================

function loadExample() {

    document.getElementById("code").value =

`let a = 10;
let b = 20;
let c = a + b;

if(a < b){
    a = a + 50;
}`;
}

// ======================================================
// Keyboard Shortcut
// Ctrl + Enter
// ======================================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            compileCode();
        }
    }
);

// ======================================================
// Welcome Message
// ======================================================

window.onload = () => {

    console.log(
        "Mini Compiler Simulator Loaded"
    );
};