const express = require("express");
const path = require("path");

const lexicalAnalyzer = require("./compiler/lexical");
const syntaxAnalyzer = require("./compiler/syntax");
const semanticAnalyzer = require("./compiler/semantic");
const generateIC = require("./compiler/icg");
const optimizeIC = require("./compiler/optimizer");
const executeAST = require("./compiler/executor");

const app = express();

const PORT = process.env.PORT || 8000;

// ======================================================
// Middleware
// ======================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve Frontend
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// Health Check Route
// ======================================================

app.get("/health", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Compiler Server Running Successfully"
    });

});

// ======================================================
// Main Compiler Route
// ======================================================

app.post("/compile", (req, res) => {

    try {

        const { code } = req.body;

        // ----------------------------------------------
        // Input Validation
        // ----------------------------------------------

        if (!code) {

            return res.status(400).json({

                success: false,

                phase: "Input Validation",

                error: "No source code provided."
            });
        }

        if (typeof code !== "string") {

            return res.status(400).json({

                success: false,

                phase: "Input Validation",

                error: "Source code must be a string."
            });
        }

        // ----------------------------------------------
        // Lexical Analysis
        // ----------------------------------------------

        const lexicalResult =
            lexicalAnalyzer(code);

        // Detect lexical errors

        const lexicalErrors =
            lexicalResult.tokens.filter(
                token =>
                    token.type ===
                    "LEXICAL_ERROR"
            );

        if (lexicalErrors.length > 0) {

            return res.status(400).json({

                success: false,

                phase: "Lexical Analysis",

                lexicalAnalysis:
                    lexicalResult,

                errors: lexicalErrors
            });
        }

        // ----------------------------------------------
        // Syntax Analysis
        // ----------------------------------------------

        const syntaxResult =
            syntaxAnalyzer(
                lexicalResult.tokens
            );

        if (!syntaxResult.success) {

            return res.status(400).json({

                success: false,

                phase: "Syntax Analysis",

                lexicalAnalysis:
                    lexicalResult,

                syntaxAnalysis:
                    syntaxResult,

                errors:
                    syntaxResult.errors
            });
        }

        // ----------------------------------------------
        // Semantic Analysis
        // ----------------------------------------------

        const semanticResult =
            semanticAnalyzer(syntaxResult.ast);

        if (!semanticResult.success) {

            return res.status(400).json({

                success: false,

                phase: "Semantic Analysis",

                lexicalAnalysis:
                    lexicalResult,

                syntaxAnalysis:
                    syntaxResult,

                semanticAnalysis:
                    semanticResult,

                errors:
                    semanticResult.errors
            });
        }

        // ----------------------------------------------
        // Intermediate Code Generation
        // ----------------------------------------------

        const icgResult =
            generateIC(syntaxResult.ast);

        // ----------------------------------------------
        // Code Optimization
        // ----------------------------------------------

        const optimizationResult =
            optimizeIC(icgResult);

        // ----------------------------------------------
        // Execution Phase
        // ----------------------------------------------

        const executionResult =
            executeAST(syntaxResult);

        if (!executionResult.success) {

            return res.status(400).json({

                success: false,

                phase: "Execution",

                lexicalAnalysis:
                    lexicalResult,

                syntaxAnalysis:
                    syntaxResult,

                semanticAnalysis:
                    semanticResult,

                intermediateCode:
                    icgResult,

                optimization:
                    optimizationResult,

                execution:
                    executionResult
            });
        }

        // ----------------------------------------------
        // Final Success Response
        // ----------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Compilation Successful",

            sourceCode: code,

            lexicalAnalysis:
                lexicalResult,

            syntaxAnalysis:
                syntaxResult,

            semanticAnalysis:
                semanticResult,

            intermediateCode:
                icgResult,

            optimization:
                optimizationResult,

            execution:
                executionResult
        });

    } catch (error) {

        console.error(
            "Compiler Error:",
            error
        );

        return res.status(500).json({

            success: false,

            phase: "Server",

            error: error.message
        });
    }
});

// ======================================================
// 404 Route
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Route Not Found"
    });
});

// ======================================================
// Global Error Handler
// ======================================================

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({

        success: false,

        phase: "Server",

        error: "Internal Server Error"
    });
});

// ======================================================
// Start Server
// ======================================================

app.listen(PORT, () => {

    console.log("\n==================================");
    console.log(" Mini Compiler Started");
    console.log("==================================");
    console.log(` Server : http://localhost:${PORT}`);
    console.log(` Health : http://localhost:${PORT}/health`);
    console.log("==================================\n");
});